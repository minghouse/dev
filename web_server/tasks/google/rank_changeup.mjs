import common from './modules.mjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * @example
 * const res = await fetch('/google/getDatas')
 * const data = await res.json()
 * console.log(data)
 */
const getDatas = async (req, res) => { 
    // 配置參數
 
    const yahoo_turnover = await (async () => {
        const response = await fetch(`https://tw.stock.yahoo.com/rank/change-up`);
        const result = (await response.text() || '').match(/"list":(.+),"listMeta":{"rankTime":"(.+)","rankTimeRange/)
        const data = JSON.parse(result[1] || '[]')
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