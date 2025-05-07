import { chromium } from 'playwright';

const browser = async (req, res) => {
    const url = req.query.url
    const selector = req.query.selector || 'body'
    const auth = req.query.auth
    if (auth != process.env.BROWSER_AUTH) {
        res.end('auth error')
        return
    }
    console.log(url, selector)
        
    // 启动浏览器
    // const browser = await chromium.launch({ headless: false });
    const browser = await chromium.launch({
        // headless: false, // 先开启可视化模式调试
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
            '--disable-gpu',
            '--js-flags=--max-old-space-size=256', // 限制 JS VM 記憶體
        ]
    });

    // 创建一个新的浏览器上下文并设置 User-Agent
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        extraHTTPHeaders: {
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': url,
            'DNT': '1',
        }
    });

    // 在这个上下文中创建一个新的页面
    const page = await context.newPage();


    // 訪問目標網站
    // const response = await page.goto(url, {
    //     timeout: 30000, // 60秒
    //     // waitUntil: 'networkidle'
    //     waitUntil: 'domcontentloaded'
    // });
        
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('External timeout')), 35000)
    );

    const response = await Promise.race([
        page.goto(url, {
        timeout: 30000,
        waitUntil: 'domcontentloaded'
        }),
        timeoutPromise
    ]);
    // await page.goto(url, { waitUntil: 'networkidle' });  // 確保所有請求完
    
    // 等待元素出現，最多等 10 秒（10000 毫秒）
    // await page.waitForSelector(selector, { state: 'attached', timeout: 10000 });

    //取得body的內容
    // const html = await page.content()
    // const body = await page.innerText('body')
    // const body = await response.text();  // 若報錯再解 gzip
    // const element = await page.$(selector);  // 使用選擇器來獲取元素
    // const body = await element.innerText();    // 取得元素的文字內容
    // console.log(body)
    
    // 直接獲取內容，不做額外的等待
    const body = await page.evaluate(async (selector) => {
        try {
            const element = document.querySelector(selector);
            if (element) return element.innerText;
            const body = document.querySelector('body');
            return body ? body.innerText : '';
        } catch (err) {
            return '[EVALUATE ERROR]';
        }
    }, selector);
    console.log(body)

    // 關閉瀏覽器
    await browser.close();

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(body)

}

export default browser