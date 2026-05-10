import { chromium } from 'playwright';
import sharp from 'sharp';
import OpenAI from 'openai';
import { mkdir, writeFile, readdir, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CAPTURE_DIR = path.resolve(__dirname, '..', '..', '..', 'yt_monitor');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// 簡單指紋比對狀態（分別保存黃色區與整張圖的指紋陣列）
let lastFingerprintYellow = [];
let lastFingerprintFull = [];
const FINGERPRINT_SIZE = 16; // 縮小尺寸 (16x16)
const THRESHOLDS = [/*0.85,*/ 0.92/*, 0.96*/];
let CURRENT_THRESHOLD = 0.988; // 決定是否視為重複的門檻，可做 A/B

// 可配置的顏色與區段閾值（如需微調可在此修改）
const TOP_BAND_RATIO = 0.18; // 頂部紅色判定區域高度 (畫面比例)
const WHITE_BAND_RATIO = 0.68; // 頂部下方白底檢測區域高度
const TOP_RED_RATIO_THRESHOLD = 0.12; // 頂部需要被視為紅色的最低比例
const WHITE_BELOW_RATIO_THRESHOLD = 0.4; // 判定下方為白底的比例門檻

// 紅色像素判定參數
const RED_R_MIN = 150;
const RED_G_MAX = 110;
const RED_B_MAX = 110;
const RED_DIFF_G = 40;
const RED_DIFF_B = 40;
const RED_SAT_MIN = 40;

// 白色像素判定參數
const WHITE_RGB_MIN = 220;
const WHITE_MAX_DIFF = 30;
// 黃色與藍字判定參數
const YELLOW_RATIO_THRESHOLD = 0.4; // 底部黃底比例門檻（原先為 0.12）
const BLUE_B_MIN = 150;
const BLUE_R_MAX = 120;
const BLUE_G_MAX = 120;
const BLUE_DIFF = 40;
const BLUE_SAT_MIN = 35;
const BLUE_IN_YELLOW_RATIO_THRESHOLD = 0.08; // 黃底內藍字比例門檻（可調）

// 文字重複檢查設定
const TEXT_DUPLICATE_THRESHOLD = 0.80; // 相似度 >= 0.8 視為重複
const MAX_STORED_TEXTS = 200;
let lastDetectedTexts = [];
// 送給 AI 前的放大比例（1 = 原大小，1.5 = 放大 1.5 倍）
const CAPTURE_SCALE = 1.5;

function stringSimilarityBigram(a, b) {
  if (!a || !b) return 0;
  a = a.trim().toLowerCase();
  b = b.trim().toLowerCase();
  if (a === b) return 1;
  const toBigrams = (s) => {
    const arr = [];
    for (let i = 0; i < s.length - 1; i++) arr.push(s.slice(i, i + 2));
    return arr;
  };
  const A = toBigrams(a);
  const B = toBigrams(b);
  if (A.length === 0 || B.length === 0) return 0;
  const freq = Object.create(null);
  for (const g of A) freq[g] = (freq[g] || 0) + 1;
  let intersection = 0;
  for (const g of B) {
    if (freq[g]) {
      intersection += 1;
      freq[g] -= 1;
    }
  }
  return (2.0 * intersection) / (A.length + B.length);
}

// 從 buffer 針對黃色區塊位置計算簡單指紋
async function computeYellowRegionFingerprint(imageBuffer) {
  const img = sharp(imageBuffer);
  const meta = await img.metadata();
  const { width, height } = meta;

  // 以 detectNewsPattern 的比例為基準：黃色區預期在底部 70% 以後
  const top = Math.max(0, Math.floor(height * 0.70));
  const extractHeight = Math.max(1, height - top);

  const { data } = await img
    .extract({ left: 0, top, width, height: extractHeight })
    .resize(FINGERPRINT_SIZE, FINGERPRINT_SIZE, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = data;
  const avg = pixels.reduce((s, v) => s + v, 0) / pixels.length;
  const bits = Array.from(pixels).map(p => (p >= avg ? '1' : '0')).join('');
  return bits;
}

function computeHammingSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let same = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) same += 1;
  }
  return same / a.length;
}

async function isDuplicateYellowImage(imageBuffer) {
  try {
    const fp = await computeYellowRegionFingerprint(imageBuffer);
    // 與已存在的指紋陣列比較，取最大相似度
    if (lastFingerprintYellow && lastFingerprintYellow.length > 0) {
      let maxSim = 0;
      for (const existing of lastFingerprintYellow) {
        const sim = computeHammingSimilarity(fp, existing);
        if (sim > maxSim) maxSim = sim;
      }
      const checks = THRESHOLDS.map(t => `${t}:${(maxSim >= t)}`).join(', ');
      console.log(`🔍 黃底指紋最高相似度: ${maxSim.toFixed(3)} | 門檻比較: ${checks}`);
      if (maxSim >= CURRENT_THRESHOLD) {
        return true;
      }
    }

    // 非重複，加入指紋陣列供未來比對使用
    lastFingerprintYellow.push(fp);
    return false;
  } catch (err) {
    // 若指紋計算失敗，保守處理為非重複
    console.warn('指紋比對失敗，略過過濾:', err.message);
    return false;
  }
}

// 整張圖指紋（用於其他類型比對）
async function computeFullImageFingerprint(imageBuffer) {
  const img = sharp(imageBuffer);
  const { data } = await img
    .resize(FINGERPRINT_SIZE, FINGERPRINT_SIZE, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = data;
  const avg = pixels.reduce((s, v) => s + v, 0) / pixels.length;
  const bits = Array.from(pixels).map(p => (p >= avg ? '1' : '0')).join('');
  return bits;
}

async function isDuplicateFullImage(imageBuffer) {
  try {
    const fp = await computeFullImageFingerprint(imageBuffer);
    if (lastFingerprintFull && lastFingerprintFull.length > 0) {
      let maxSim = 0;
      for (const existing of lastFingerprintFull) {
        const sim = computeHammingSimilarity(fp, existing);
        if (sim > maxSim) maxSim = sim;
      }
      const checks = THRESHOLDS.map(t => `${t}:${(maxSim >= t)}`).join(', ');
      console.log(`🔍 全圖指紋最高相似度: ${maxSim.toFixed(3)} | 門檻比較: ${checks}`);
      if (maxSim >= CURRENT_THRESHOLD) {
        return true;
      }
    }

    // 非重複，加入指紋陣列供未來比對使用
    lastFingerprintFull.push(fp);
    return false;
  } catch (err) {
    console.warn('整張圖指紋比對失敗，略過過濾:', err.message);
    return false;
  }
}

async function addFingerprintIfNotSimilar(fp, arr) {
  if (!arr || arr.length === 0) {
    arr.push(fp);
    return true;
  }
  let maxSim = 0;
  for (const existing of arr) {
    const sim = computeHammingSimilarity(fp, existing);
    if (sim > maxSim) maxSim = sim;
  }
  if (maxSim < CURRENT_THRESHOLD) {
    arr.push(fp);
    return true;
  }
  return false;
}

// 讀取當日資料夾中的圖片並預先計算指紋，啟動時呼叫
async function loadTodayFingerprints() {
  try {
    const now = new Date();
    const dateDir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayDir = path.join(CAPTURE_DIR, dateDir);
    const entries = await readdir(todayDir).catch(() => []);
    if (!entries || entries.length === 0) {
      console.log('ℹ️ 當日沒有已儲存的截圖可讀取指紋');
      return;
    }

    let count = 0;
    for (const fname of entries) {
      if (!/\.(png|jpg|jpeg)$/i.test(fname)) continue;
      const fpath = path.join(todayDir, fname);
      try {
        const buf = await readFile(fpath);
        const yfp = await computeYellowRegionFingerprint(buf).catch(() => null);
        const ffp = await computeFullImageFingerprint(buf).catch(() => null);
        if (yfp) await addFingerprintIfNotSimilar(yfp, lastFingerprintYellow);
        if (ffp) await addFingerprintIfNotSimilar(ffp, lastFingerprintFull);
        count += 1;
      } catch (_) { /* ignore individual file errors */ }
    }
    // 讀取當日 data.json（若存在）並把 text_raw 載入到 lastDetectedTexts
    try {
      const dataJsonPath = path.join(todayDir, 'data.json');
      const txtBuf = await readFile(dataJsonPath, { encoding: 'utf8' }).catch(() => null);
      if (txtBuf) {
        const arr = JSON.parse(txtBuf);
        if (Array.isArray(arr)) {
          for (const it of arr) {
            if (it && it.text_raw) {
              lastDetectedTexts.push(String(it.text_raw));
            }
          }
          // 保留最新的上限
          if (lastDetectedTexts.length > MAX_STORED_TEXTS) {
            lastDetectedTexts = lastDetectedTexts.slice(-MAX_STORED_TEXTS);
          }
        }
      }
    } catch (_) { /* ignore */ }
    console.log(`ℹ️ 已讀取 ${count} 張當日截圖並載入指紋 (黃底:${lastFingerprintYellow.length}, 全圖:${lastFingerprintFull.length})`);
  } catch (err) {
    console.warn('讀取當日指紋時發生錯誤:', err.message);
  }
}

// 色塊偵測：底部黃底且上方黑底，或頭部紅底，任一命中就觸發 AI
async function detectNewsPattern(imageBuffer) {
  const { data, info } = await sharp(imageBuffer).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const topBandEnd = Math.max(1, Math.floor(height * TOP_BAND_RATIO));
  const bottomBandStart = Math.max(0, Math.floor(height * 0.684));
  const aboveBottomBlackStart = Math.max(0, Math.floor(height * 0.173));
  const aboveBottomBlackEnd = bottomBandStart;
  // 新增：檢查頭部紅底下方是否為白底（通常紅塊下方為白底的情形）
  const whiteBelowStart = topBandEnd;
  const whiteBelowEnd = Math.min(height, topBandEnd + Math.max(1, Math.floor(height * WHITE_BAND_RATIO)));

  let topRedCount = 0;
  let topTotal = 0;
  let bottomYellowCount = 0;
  let bottomTotal = 0;
  let bottomBlueCount = 0;
  let aboveBottomBlackCount = 0;
  let aboveBottomBlackTotal = 0;
  let whiteBelowCount = 0;
  let whiteBelowTotal = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max - min;

      const isYellowPixel =
        r >= 145 &&
        g >= 120 &&
        b <= 145 &&
        (r - b) >= 25 &&
        saturation >= 35;

      const isRedPixel =
        r >= RED_R_MIN &&
        g <= RED_G_MAX &&
        b <= RED_B_MAX &&
        (r - g) >= RED_DIFF_G &&
        (r - b) >= RED_DIFF_B &&
        saturation >= RED_SAT_MIN;

      const isWhitePixel =
        r >= WHITE_RGB_MIN &&
        g >= WHITE_RGB_MIN &&
        b >= WHITE_RGB_MIN &&
        (max - min) <= WHITE_MAX_DIFF;

      const isBluePixel =
        b >= BLUE_B_MIN &&
        r <= BLUE_R_MAX &&
        g <= BLUE_G_MAX &&
        (b - r) >= BLUE_DIFF &&
        (b - g) >= BLUE_DIFF &&
        saturation >= BLUE_SAT_MIN;

      if (y < topBandEnd) {
        topTotal += 1;
        if (isRedPixel) topRedCount += 1;
      }

      if (y >= bottomBandStart) {
        bottomTotal += 1;
        if (isYellowPixel) bottomYellowCount += 1;
        if (isBluePixel) bottomBlueCount += 1;
      }

      if (y >= whiteBelowStart && y < whiteBelowEnd) {
        whiteBelowTotal += 1;
        if (isWhitePixel) whiteBelowCount += 1;
      }
    }
  }

  const topRedRatio = topTotal > 0 ? topRedCount / topTotal : 0;
  const bottomYellowRatio = bottomTotal > 0 ? bottomYellowCount / bottomTotal : 0;
  const aboveBottomBlackRatio = aboveBottomBlackTotal > 0 ? aboveBottomBlackCount / aboveBottomBlackTotal : 0;
  const hasTopRed = topRedRatio >= TOP_RED_RATIO_THRESHOLD;
  const bottomBlueRatio = bottomTotal > 0 ? bottomBlueCount / bottomTotal : 0;
  const whiteBelowRatio = whiteBelowTotal > 0 ? whiteBelowCount / whiteBelowTotal : 0;
  // 黃底改為：底部黃色比例達標，且在該區域有足夠藍色文字比例
  // console.log(bottomYellowRatio, bottomBlueRatio, hasTopRed, whiteBelowRatio)
  const hasBottomYellow = bottomYellowRatio >= YELLOW_RATIO_THRESHOLD && bottomBlueRatio >= BLUE_IN_YELLOW_RATIO_THRESHOLD;
  // console.log(whiteBelowRatio)
  const hasTopRedBelowWhite = hasTopRed && whiteBelowRatio >= WHITE_BELOW_RATIO_THRESHOLD;

  return {
    shouldAnalyze: hasBottomYellow || hasTopRedBelowWhite,
    hasTopRed,
    hasTopRedBelowWhite,
    hasBottomYellow,
    topRedRatio,
    bottomYellowRatio,
    aboveBottomBlackRatio,
    whiteBelowRatio
    ,
    bottomBlueRatio
  };
}

// 狀態管理
let isRunning = false;
let browserInstance = null;
let monitorLoopPromise = null;
const MAX_MONITOR_ERRORS = 5;
const MAX_STALLED_CYCLES = 3;
const KEEP_ALIVE_INTERVAL_CYCLES = 6;
const HUMAN_ACTIVITY_INTERVAL_MS = 45000;
const ACTION_COOLDOWN_MS = 10000;
// 固定視窗 1280x720 下，對齊你提供紅框的單一擷取區
const CAPTURE_AREA = { x: 465, y: 122, width: 360, height: 190 };
let lastSkipAdAt = 0;
let lastKeepWatchingAt = 0;

async function pinPageToTop(page) {
  try {
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0;
      }
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  } catch (_) { /* ignore */ }
}

async function saveCaptureImage(imageBuffer, options = {}) {
  const { prefix = 'yt_capture', subDir = '' } = options;
  const outputDir = subDir ? path.join(CAPTURE_DIR, subDir) : CAPTURE_DIR;
  const now = new Date();
  const dateDir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const datedOutputDir = path.join(outputDir, dateDir);

  await mkdir(datedOutputDir, { recursive: true });

  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}_${String(now.getMilliseconds()).padStart(3, '0')}`;
  const filePath = path.join(datedOutputDir, `${prefix}_${stamp}.png`);

  await writeFile(filePath, imageBuffer);
  return filePath;
}

// 嘗試關閉 YouTube 同意/cookie banner
async function dismissBanners(page) {
  try {
    // 同意條款按鈕（多語系嘗試）
    const selectors = [
      'button[aria-label="Accept all"]',
      'button[aria-label="全部接受"]',
      'tp-yt-paper-button#agree-button',
      '.yt-spec-button-shape-next--filled'
    ];
    for (const sel of selectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          await sleep(1000);
          break;
        }
      } catch (_) { /* ignore */ }
    }
  } catch (_) { /* ignore */ }
}

// 偵測到廣告時嘗試點擊「略過」
async function clickSkipAdIfPresent(page) {
  if (Date.now() - lastSkipAdAt < ACTION_COOLDOWN_MS) {
    return false;
  }

  const adShowing = await page.evaluate(() => {
    const player = document.querySelector('.html5-video-player');
    return !!(player?.classList.contains('ad-showing') || document.querySelector('.video-ads, .ytp-ad-player-overlay'));
  }).catch(() => false);

  if (!adShowing) {
    return false;
  }

  const skipSelectors = [
    'button.ytp-skip-ad-button',
    'button.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    'button[id^="skip-button"]',
    'button[aria-label*="略過"]',
    'button[aria-label*="Skip"]'
  ];

  for (const selector of skipSelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        const box = await button.boundingBox();
        if (!box) {
          continue;
        }
        await button.click({ delay: 50 }).catch(() => {});
        lastSkipAdAt = Date.now();
        // console.log(`⏭️ 已點擊略過廣告按鈕: ${selector}`);
        return true;
      }
    } catch (_) { /* ignore */ }
  }

  return false;
}

// 偵測到「繼續觀看」等彈窗時自動點擊，避免直播被暫停
async function clickKeepWatchingIfPresent(page) {
  if (Date.now() - lastKeepWatchingAt < ACTION_COOLDOWN_MS) {
    return false;
  }

  const watchSelectors = [
    'button[aria-label*="繼續觀看"]',
    'button[aria-label*="Continue watching"]',
    'button[aria-label*="仍要繼續"]'
  ];

  for (const selector of watchSelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        const box = await button.boundingBox();
        if (!box) {
          continue;
        }
        await button.click({ delay: 40 }).catch(() => {});
        lastKeepWatchingAt = Date.now();
        console.log(`▶️ 已處理繼續觀看提示: ${selector}`);
        return true;
      }
    } catch (_) { /* ignore */ }
  }

  try {
    const clickedByText = await page.evaluate(() => {
      const patterns = [/繼續觀看/i, /continue\s*watching/i, /still\s*watching/i, /是，仍要繼續/i];
      const popupRoots = Array.from(document.querySelectorAll('.ytp-popup-container, ytd-popup-container, tp-yt-paper-dialog, [role="dialog"]'));
      const buttons = popupRoots.flatMap((root) => Array.from(root.querySelectorAll('button, tp-yt-paper-button')));

      for (const button of buttons) {
        const text = (button.textContent || '').replace(/\s+/g, ' ').trim();
        if (text && patterns.some((p) => p.test(text))) {
          button.click();
          return text;
        }
      }
      return '';
    });

    if (clickedByText) {
      lastKeepWatchingAt = Date.now();
      console.log(`▶️ 已用文字匹配處理繼續觀看提示: ${clickedByText}`);
      return true;
    }
  } catch (_) { /* ignore */ }

  return false;
}

// 偵測到播放錯誤時嘗試點擊重試
async function clickRetryIfPresent(page) {
  const retrySelectors = [
    'button[aria-label*="重試"]',
    'button[aria-label*="Retry"]',
    '.ytp-error-content-wrap button',
    '.ytp-error button',
    '.ytp-offline-slate button'
  ];

  for (const selector of retrySelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        await button.click({ delay: 40 }).catch(() => {});
        console.warn(`🔁 已點擊播放重試按鈕: ${selector}`);
        return true;
      }
    } catch (_) { /* ignore */ }
  }

  return false;
}

// 定期做輕互動，降低被判定為閒置觀看導致中斷
async function keepAliveTick(page) {
  try {
    await page.mouse.move(20, 20);
    await sleep(50);
    await page.mouse.move(60, 30);
  } catch (_) { /* ignore */ }
}

// 模擬真人互動，避免被判定長時間無人值守
async function simulateHumanActivity(page) {
  try {
    const x = randomBetween(220, 1080);
    const y = randomBetween(180, 620);
    await page.mouse.move(x, y, { steps: randomBetween(8, 20) });
    await sleep(randomBetween(120, 380));

    if (Math.random() < 0.25) {
      await page.keyboard.press('ArrowUp').catch(() => {});
      await sleep(randomBetween(60, 160));
      await page.keyboard.press('ArrowDown').catch(() => {});
    }
  } catch (_) { /* ignore */ }
}

async function applyStealth(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'language', { get: () => 'zh-TW' });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-TW', 'zh', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Viewer' },
        { name: 'Chromium PDF Viewer' },
        { name: 'Microsoft Edge PDF Viewer' }
      ]
    });

    window.chrome = window.chrome || { runtime: {} };
  });
}

// 確保影片維持播放，若發生錯誤則嘗試恢復
async function ensurePlayback(page, ytUrl) {
  try {
    await clickSkipAdIfPresent(page);
    await clickKeepWatchingIfPresent(page);
    await clickRetryIfPresent(page);

    const state = await page.evaluate(() => {
      const video = document.querySelector('video');
      const player = document.querySelector('.html5-video-player');
      const errorVisible = !!document.querySelector('.ytp-error, .ytp-error-content-wrap');

      return {
        hasVideo: !!video,
        paused: video ? video.paused : true,
        ended: video ? video.ended : false,
        readyState: video ? video.readyState : 0,
        currentTime: video ? video.currentTime : 0,
        playerState: player?.getAttribute('class') || '',
        errorVisible
      };
    });

    if (!state.hasVideo || state.errorVisible || state.ended) {
      console.warn('⚠️ 偵測到播放器異常，先嘗試重試播放');
      const didRetry = await clickRetryIfPresent(page);
      if (didRetry) {
        await sleep(1200);
        return;
      }

      console.warn('⚠️ 無可用重試按鈕，重新載入直播頁');
      await page.goto(ytUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2500);
      await dismissBanners(page);
      await clickSkipAdIfPresent(page);
      await clickKeepWatchingIfPresent(page);
      return;
    }

    if (state.paused || state.readyState < 2) {
      console.warn('⚠️ 偵測到暫停或緩衝，嘗試恢復播放');

      await page.keyboard.press('k').catch(() => {});
      await sleep(500);

      const playButton = await page.$('.ytp-play-button');
      if (playButton) {
        await playButton.click().catch(() => {});
      }
      await sleep(700);

      const checkAgain = await page.evaluate(() => {
        const video = document.querySelector('video');
        return {
          hasVideo: !!video,
          paused: video ? video.paused : true,
          readyState: video ? video.readyState : 0,
          currentTime: video ? video.currentTime : 0
        };
      });

      if (!checkAgain.hasVideo || checkAgain.paused || checkAgain.readyState < 2) {
        console.warn('⚠️ 播放未恢復，重新載入直播頁');
        await page.goto(ytUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await sleep(2500);
        await dismissBanners(page);
        await clickSkipAdIfPresent(page);
        await clickKeepWatchingIfPresent(page);
      }
    }
  } catch (err) {
    console.warn('⚠️ 播放狀態檢查失敗，將於下輪重試:', err.message);
  }
}

async function monitorLoop() {
  const YT_URL = 'https://www.youtube.com/watch?v=1I2iq41Akmo';
  // const YT_URL = 'https://www.youtube.com/watch?v=oB2QY06L5Ew';
  let monitorErrorCount = 0;
  let lastCurrentTime = -1;
  let stalledCycles = 0;
  let loopCount = 0;
  let lastHumanActivityAt = 0;

  // 啟動時先讀取當日已存檔案的指紋，以便初次比對
  await loadTodayFingerprints();

  browserInstance = await chromium.launch({
    // headless: false,
    headless: true,
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browserInstance.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei'
  });
  const page = await context.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7' });
  await applyStealth(page);

  try {
    await page.goto(YT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1000);
    await pinPageToTop(page);

    // 非關鍵步驟改為背景執行，縮短啟動到第一輪偵測的等待時間
    dismissBanners(page).catch((err) => {
      console.warn('啟動背景任務 dismissBanners 失敗:', err.message);
    });
    clickSkipAdIfPresent(page).catch((err) => {
      console.warn('啟動背景任務 clickSkipAdIfPresent 失敗:', err.message);
    });
    clickKeepWatchingIfPresent(page).catch((err) => {
      console.warn('啟動背景任務 clickKeepWatchingIfPresent 失敗:', err.message);
    });
    console.log('⚡ 啟動優化：banner/廣告處理改為背景執行，偵測先啟動');
    console.log(`🎯 固定截圖區域: ${JSON.stringify(CAPTURE_AREA)}`);
    console.log('🟢 直播已開啟，立即開始偵測流程');
    console.log('🚀 AI 視覺監控模式啟動 (GPT-4o-mini) - 東森財經 YT 直播');

    while (isRunning) {
      try {
        loopCount += 1;
        // console.log(`🔁 偵測迴圈開始: 第 ${loopCount} 輪`);
        if (loopCount % KEEP_ALIVE_INTERVAL_CYCLES === 0) {
          await keepAliveTick(page);
        }

        if (Date.now() - lastHumanActivityAt >= HUMAN_ACTIVITY_INTERVAL_MS) {
          await simulateHumanActivity(page);
          await pinPageToTop(page);
          lastHumanActivityAt = Date.now();
          console.log('🧍 已執行真人互動保活');
        }

        // 不阻塞截圖流程：播放維護動作改為背景執行
        clickSkipAdIfPresent(page).catch(() => {});
        clickKeepWatchingIfPresent(page).catch(() => {});
        clickRetryIfPresent(page).catch(() => {});
        ensurePlayback(page, YT_URL).catch(() => {});

        const playbackState = await page.evaluate(() => {
          const video = document.querySelector('video');
          return {
            hasVideo: !!video,
            paused: video ? video.paused : true,
            readyState: video ? video.readyState : 0,
            currentTime: video ? video.currentTime : 0
          };
        });

        if (playbackState.hasVideo && !playbackState.paused && playbackState.readyState >= 2) {
          if (lastCurrentTime >= 0 && Math.abs(playbackState.currentTime - lastCurrentTime) < 0.2) {
            stalledCycles += 1;
          } else {
            stalledCycles = 0;
          }
          lastCurrentTime = playbackState.currentTime;

          if (stalledCycles >= MAX_STALLED_CYCLES) {
            console.warn(`⚠️ 偵測到直播畫面卡住 ${stalledCycles} 輪，重新載入直播頁`);
            page.goto(YT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
              .then(async () => {
                await dismissBanners(page).catch(() => {});
                await clickSkipAdIfPresent(page).catch(() => {});
                await clickKeepWatchingIfPresent(page).catch(() => {});
                console.log('🔄 卡住恢復背景任務完成');
              })
              .catch((err) => {
                console.warn('卡住恢復背景任務失敗:', err.message);
              });
            stalledCycles = 0;
            lastCurrentTime = -1;
          }
        } else {
          stalledCycles = 0;
          lastCurrentTime = -1;
        }

        // 1. 快速顏色檢測（先擷取但不馬上儲存）
        await pinPageToTop(page);
        const captureBuffer = await page.screenshot({ clip: CAPTURE_AREA });
        // 除錯：顯示截圖實際像素大小
        // try {
        //   const m = await sharp(captureBuffer).metadata();
        //   console.log(`📸 captureBuffer size: ${m.width}x${m.height}, channels=${m.channels}`);
        //   const dpr = await page.evaluate(() => window.devicePixelRatio).catch(() => 1);
        //   console.log(`🧭 page.devicePixelRatio = ${dpr}`);
        // } catch (_) { /* ignore */ }
        // console.log(`🔎 已擷取監控區截圖 clip=${JSON.stringify(CAPTURE_AREA)}`);
        const patternCheck = await detectNewsPattern(captureBuffer);

        if (patternCheck.shouldAnalyze) {
          const hitTypes = [];
          if (patternCheck.hasBottomYellow) hitTypes.push(`底部黃底 ${(patternCheck.bottomYellowRatio * 100).toFixed(1)}% + 黃底內藍字 ${(patternCheck.bottomBlueRatio * 100).toFixed(1)}%`);
          if (patternCheck.hasTopRedBelowWhite) {
            hitTypes.push(`頭部紅底 + 下方白底 ${(patternCheck.whiteBelowRatio * 100).toFixed(1)}%`);
          }
          console.log(`🎯 命中色塊條件 (${hitTypes.join(' / ')})，請求 AI 分析...`);

          // 如果是黃底情況，先做黃色區域的指紋比對，避免重複送同樣的畫面
          if (patternCheck.hasBottomYellow) {
            const isDup = await isDuplicateYellowImage(captureBuffer);
            if (isDup) {
              console.log('🔁 偵測到重複黃底圖片，略過分析');
              monitorErrorCount = 0;
              await sleep(randomBetween(3000, 4200));
              continue;
            }
          }
          // 若為頭部紅底（含下方白底情況），用整張圖指紋比對
          if (patternCheck.hasTopRedBelowWhite) {
            const isDupFull = await isDuplicateFullImage(captureBuffer);
            if (isDupFull) {
              console.log('🔁 偵測到重複整張圖片，略過分析');
              monitorErrorCount = 0;
              await sleep(randomBetween(3000, 4200));
              continue;
            }
          }

          // 儲存後確保指紋陣列也包含此圖的指紋（避免某些路徑沒加到陣列）
          try {
            const yfp = await computeYellowRegionFingerprint(captureBuffer).catch(() => null);
            const ffp = await computeFullImageFingerprint(captureBuffer).catch(() => null);
            if (yfp) await addFingerprintIfNotSimilar(yfp, lastFingerprintYellow);
            if (ffp) await addFingerprintIfNotSimilar(ffp, lastFingerprintFull);
          } catch (_) { /* ignore */ }

          const promptText = (patternCheck.hasTopRedBelowWhite)
            ? '你是 OCR 引擎。只做逐字轉錄，不可摘要、不可改寫、不可翻譯、不可修正錯字。請針對整張圖片輸出 JSON：{ "stock_name": "股票名稱", "stock_code": "股票代號", "scope": "full", "text_raw": "逐字原文" }。'
            : '你是 OCR 引擎。只做逐字轉錄，不可摘要、不可改寫、不可翻譯、不可修正錯字。請只針對圖片中的黃色區域做文字轉錄，輸出 JSON：{ "stock_name": "股票名稱", "stock_code": "股票代號", "scope": "yellow", "yellow_type": "最新消息|獨家消息|無法判斷", "text_raw": "逐字內容" }。';

          // 2. 使用同一張整塊區域圖（不再分 detection/ocr）
          // const base64Image = captureBuffer.toString('base64');
          // 若設定放大比例，先用 sharp 放大後再轉 base64 傳給 AI
          let ocrBuffer = captureBuffer;
          if (CAPTURE_SCALE && CAPTURE_SCALE !== 1) {
            try {
              const meta = await sharp(captureBuffer).metadata();
              const targetW = Math.max(1, Math.round(meta.width * CAPTURE_SCALE));
              const targetH = Math.max(1, Math.round(meta.height * CAPTURE_SCALE));
              ocrBuffer = await sharp(captureBuffer).resize(targetW, targetH).toBuffer();
              // console.log(`🔍 OCR 圖片已放大 ${CAPTURE_SCALE}x -> ${targetW}x${targetH}`);
            } catch (err) {
              console.warn('⚠️ OCR 放大失敗，使用原始截圖:', err.message);
              ocrBuffer = captureBuffer;
            }
          }
          const base64Image = ocrBuffer.toString('base64');

          // 3. 呼叫 gpt-5.4-mini
          const response = await openai.chat.completions.create({
            model: 'gpt-5.4',
            // temperature: 0,
            // top_p: 1,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: promptText
                  },
                  {
                    type: 'image_url',
                    image_url: { url: `data:image/png;base64,${base64Image}` }
                  }
                ]
              }
            ],
            response_format: { type: 'json_object' }
          });

          const result = JSON.parse(response.choices[0].message.content);
          result.text_raw = result.text_raw.replace('獨家消息', '').replace('最新消息', '').trim();

          // 文字重複檢查：與最近偵測到的文字比對，若相似度 >= TEXT_DUPLICATE_THRESHOLD 視為重複並略過
          try {
            const txt = (result.text_raw || '').trim();
            let isDupText = false;
            for (const prev of lastDetectedTexts) {
              if (stringSimilarityBigram(prev, txt) >= TEXT_DUPLICATE_THRESHOLD) {
                isDupText = true;
                break;
              }
            }
            if (isDupText) {
              console.log('🔁 AI 文字結果與先前相似 >= 80%，略過後續處理');
              // 不儲存、不送出，直接略過
              monitorErrorCount = 0;
              continue;
            }
            // 非重複，加入記錄（保留上限）
            if (txt) {
              lastDetectedTexts.push(txt);
              if (lastDetectedTexts.length > MAX_STORED_TEXTS) lastDetectedTexts.shift();
            }
          } catch (e) {
            console.warn('文字重複檢查失敗，略過此檢查:', e.message);
          }

          if (result) {
              
            // 通過過濾後，才儲存截圖（僅儲存符合條件的圖片）
            const savedFilePath = await saveCaptureImage(captureBuffer, { prefix: 'monitor_area' });
            console.log(`💾 已儲存待分析截圖: ${savedFilePath}`);

            // 同目錄下更新或建立 data.json，加入本次 result.text_raw 與檔名與時間
            try {
              const entry = {
                file: path.basename(savedFilePath),
                text_raw: result.text_raw || '',
                timestamp: (new Date()).toISOString()
              };
              const dir = path.dirname(savedFilePath);
              const dataFile = path.join(dir, 'data.json');
              let arr = [];
              const existing = await readFile(dataFile, { encoding: 'utf8' }).catch(() => null);
              if (existing) {
                try { arr = JSON.parse(existing); } catch (_) { arr = []; }
              }
              arr.push(entry);
              // 保留最多 MAX_STORED_TEXTS 條
              if (arr.length > MAX_STORED_TEXTS) arr = arr.slice(-MAX_STORED_TEXTS);
              await writeFile(dataFile, JSON.stringify(arr, null, 2), { encoding: 'utf8' });
            } catch (e) {
              console.warn('寫入 data.json 失敗:', e.message);
            }

            console.log('🤖 AI 分析結果：', result);
          }
        }

        monitorErrorCount = 0;
      } catch (err) {
        monitorErrorCount += 1;
        console.error('監控異常:', err.message);

        if (monitorErrorCount > MAX_MONITOR_ERRORS) {
          console.error(`監控異常超過 ${MAX_MONITOR_ERRORS} 次，停止監控`);
          isRunning = false;
          break;
        }
      }

      await sleep(randomBetween(5000, 6400));
    }
  } finally {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
    isRunning = false;
    console.log('🛑 YT 監控已停止');
  }
}

// --- 對外 API ---

export function start(req, res) {
  if (isRunning) {
    return res.status(200).json({ success: false, message: '監控已在執行中' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ success: false, message: '環境變數 OPENAI_API_KEY 未設定' });
  }

  isRunning = true;
  monitorLoopPromise = monitorLoop().catch(err => {
    console.error('monitorLoop 發生錯誤:', err.message);
    isRunning = false;
    browserInstance = null;
  });

  res.json({ success: true, message: '東森財經 YT 監控已啟動' });
}

export async function stop(req, res) {
  if (!isRunning) {
    return res.status(200).json({ success: false, message: '監控未在執行中' });
  }

  isRunning = false;

  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }

  res.json({ success: true, message: '東森財經 YT 監控已停止' });
}

export function getStatus(req, res) {
  res.json({ running: isRunning });
}

export default { start, stop, getStatus };
