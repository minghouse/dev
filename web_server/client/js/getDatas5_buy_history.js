import common from './modules.js';

dayjs.extend(dayjs_plugin_utc)
dayjs.extend(dayjs_plugin_timezone)

/**
 * @example
 * const res = await fetch('/google/getDatas5_buy_history')
 * const data = await res.json()
 * console.log(data)
 */
const getDatas5_buy_history = async (stock) => {
    // 配置參數

    const SPREADSHEET_ID = '1DYU3NZmGLrj0G2ruQOyLxhOqLgBkSQ_mQ4-KPlYG-yE';
    // const RANGE = 'AI整理-中國時報!A2:F5';
    // const RANGE = req.query.range

    // const sheetData = await common.accessGoogleSheets(SPREADSHEET_ID, RANGE)

    const accessToken = await common.getAccessToken();
    // console.log('Access Token:', accessToken);

    //AI整理-索引
    const aftertrading_data_result = await common.accessGoogleSheets(SPREADSHEET_ID, '每日收盤價!A2:B1000', accessToken)
    const aftertrading_data_all = aftertrading_data_result.values

    const aftertrading_data = []
    // const v = aftertrading_data_all.filter(v => v[1] != '[]' && v[0] == d)
    for (const v of aftertrading_data_all) {
        if (v[1] && v[1] != '[]') {
            //json.parse(v[1])
            const data = JSON.parse(v[1]) //[["0050","156.95"],["0051","78.60"],[
            //找到對應的股票
            const find_stock = data.find(v => v[0] == stock)
            if (find_stock) {
                aftertrading_data.push({
                    label: v[0],
                    data: find_stock[1]
                })
            }
        }
    }

    const out = {
        data: aftertrading_data
    }

    return out
}

export default getDatas5_buy_history