import common from './modules.mjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc)
dayjs.extend(timezone)
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    // 去除控制字元與多餘部分
    const cleaned = str.replace(/[^\x20-\x7E\u4E00-\u9FFF]/g, "").trim();
    // 嘗試補齊結尾
    let fixed = cleaned;
    if (!fixed.endsWith("}")) fixed += "}";
    try {
      return JSON.parse(fixed);
    } catch {
      // 再試加上 ]
      if (!fixed.endsWith("]}")) fixed = fixed.replace(/}$/, "]}");
      return JSON.parse(fixed);
    }
  }
}

/**
 * @example
 * const res = await fetch('/google/getDatas')
 * const data = await res.json()
 * console.log(data)
 */
const getDatas = async (req, res) => { 
    // 配置參數

    const yahoo_turnover = await (async () => {
        const response = await fetch(`https://tw.stock.yahoo.com/rank/turnover`);
        const result = (await response.text() || '').match(/"list":(.+),"listMeta":{"rankTime":"(.+)","rankTimeRange/)
        const data = JSON.parse((result[1] || '[]').split(',"listMeta":')[0])
        const time = (result[2]||'').split('T')[0]
        return {
            data: data,
            time: time
        }
    })()

    //允許跨域請求
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(yahoo_turnover)
}

export default getDatas