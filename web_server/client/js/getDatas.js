import common from './modules.js';

dayjs.extend(dayjs_plugin_utc)
dayjs.extend(dayjs_plugin_timezone)

/**
 * @example
 * const res = await fetch('/google/getDatas')
 * const data = await res.json()
 * console.log(data)
 */
const getDatas = async () => { 
    // 配置參數
 
    const SPREADSHEET_ID = '1DYU3NZmGLrj0G2ruQOyLxhOqLgBkSQ_mQ4-KPlYG-yE';
    // const RANGE = 'AI整理-中國時報!A2:F5';
    // const RANGE = req.query.range

    // const sheetData = await common.accessGoogleSheets(SPREADSHEET_ID, RANGE)

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
        "AI整理-經濟日報",
        // "AI整理-中國時報",
        "AI整理-yahoo財經",
        // "AI整理-工商時報",
        "AI整理-時報新聞",
        "AI整理-IEK",
    ]
    const sheetData_promise = []
    for (const v of sheetData_name) {
        const ai_start = ai_sn[v] - 1500 < 2 ? 2 : ai_sn[v] - 1500
        sheetData_promise.push(common.accessGoogleSheets(SPREADSHEET_ID, `${v}!A${ai_start}:I${ai_sn[v]}`, accessToken))
    }
    const sheetData = await Promise.all(sheetData_promise)
    const values = sheetData.reduce((acc, cur) => acc.concat(cur.values), [])
    values.sort(function (a, b) {
        return a[0] < b[0] ? 1 : -1
    })

    const now = dayjs();
    //指定台北時區
    const date_start = dayjs(now).tz('Asia/Taipei').add(-24 * 14, 'hours').format('YYYY-MM-DD HH:mm');
    const date_end = dayjs(now).tz('Asia/Taipei').add(0, 'hours').format('YYYY-MM-DD HH:mm');

    const datas = []
    for (const v of values) {
        if (!(v[0] >= date_start && v[0] <= date_end)) {
            continue
        }
        const news = v[2].replace(/\n\n新聞出處：/, '\n新聞出處：').split("\n\n")
        for (const v2 of news) {
            const v3 = v2.split("\n")
            const check = v3.filter(v4 => /^[0-9]+\./.test(v4)).length

            if (/：$/.test(v3[0]) && /^新聞出處/.test(v3[v3.length - 1]) && check == v3.length - 2 && v3.length > 2) {
                datas.push([v[0], v[1], v2, v[4], v[5], v[6], v[7], v[8]])
            }
        }
    }

    const result = datas
    
    return result
}

export default getDatas