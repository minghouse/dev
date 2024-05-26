import common from './modules.js';

dayjs.extend(dayjs_plugin_utc)
dayjs.extend(dayjs_plugin_timezone)

/**
 * @example
 * const res = await fetch('/google/getDatas')
 * const data = await res.json()
 * console.log(data)
 */
const getDatas6 = async (search_date) => {
    // 配置參數

    const SPREADSHEET_ID = '1DYU3NZmGLrj0G2ruQOyLxhOqLgBkSQ_mQ4-KPlYG-yE';
    // const RANGE = 'AI整理-中國時報!A2:F5';
    // const RANGE = req.query.range

    // const sheetData = await common.accessGoogleSheets(SPREADSHEET_ID, RANGE)

    const now = dayjs();
    const date_start = dayjs(now).tz('Asia/Taipei').add(-24 * 14, 'hours').format('YYYY-MM-DD HH:mm');
    const date_end = dayjs(now).tz('Asia/Taipei').add(0, 'hours').format('YYYY-MM-DD HH:mm');

    const accessToken = await common.getAccessToken();
    // console.log('Access Token:', accessToken);

    //AI整理-索引
    const ai_sn_data = await common.accessGoogleSheets(SPREADSHEET_ID, 'AI整理-索引!A1:B20', accessToken)

    //上面註解的getDatas方法是appscript，這裡改成nodejs
    const ai_sn = {}
    for (const v of ai_sn_data.values) {
        if (v[0]) {
            ai_sn[v[0]] = v[1]
        }
    }

    const sheetData_name = [
        "AI每周整理"
    ]
    const sheetData_promise = []
    for (const v of sheetData_name) {
        const ai_start = (() => {
            if (v == 'AI每周整理') {
                return ai_sn[v] - 100 < 2 ? 2 : ai_sn[v] - 100
            }
            return 2
        })()
        const ai_end = (() => {
            if (v == 'AI每周整理') {
                return ai_sn[v]
            }
            return 4000
        })()

        sheetData_promise.push(common.accessGoogleSheets(SPREADSHEET_ID, `${v}!A${ai_start}:F${ai_end}`, accessToken))
    }
    const sheetData = await Promise.all(sheetData_promise)

    const values = sheetData[0].values
    values.sort(function (a, b) {
        return a[0] < b[0] ? 1 : -1
    })
    
    const datas = []
    for (const v of values) {
        if (!(v[0] >= date_start && v[0] <= date_end)) {
            continue
        }
        const news = JSON.parse(v[1])
        for (const v2 of news) {
            const content = `${v2[1]}（${v2[0]}）：\n${v2[2]}`
            datas.push([v[0], '', content])
        }
    }

    return datas
}

export default getDatas6