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
 
    const SPREADSHEET_ID = '1e0nsE-Xy2xuMRWR13egciuyPoYDNFM-XSTlwUcvH0CM';
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
        "經濟日報",
        "yahoo財經",
        "工商時報",
        "時報新聞",
        "AI整理-經濟日報",
        // "AI整理-中國時報",
        "AI整理-yahoo財經",
        // "AI整理-工商時報",
        "AI整理-時報新聞",
        "AI整理-工商時報",
    ]
    const sheetData_promise = []
    for (const v of sheetData_name) {
        if (v.startsWith('AI整理')) {
            const ai_start = ai_sn[v] - 1500 < 2 ? 2 : ai_sn[v] - 1500
            sheetData_promise.push(common.accessGoogleSheets(SPREADSHEET_ID, `${v}!A${ai_start}:J${ai_sn[v]}`, accessToken))
        } else {
            const ai_start = 2 
            const ai_end = 1500
            sheetData_promise.push(common.accessGoogleSheets(SPREADSHEET_ID, `${v}!A${ai_start}:F${ai_end}`, accessToken))
        }
    }
    const sheetData = await Promise.all(sheetData_promise)
    const sheetData_1 = []
    const sheetData_2 = []
    for (const k in sheetData) {
        //ifsheetData_name[k]開頭不是AI整理就執行
        if (sheetData_name[k].startsWith('AI整理')) {
            // sheetData_2.concat(sheetData[k].values)
            for (const v of sheetData[k].values) {
                sheetData_2.push(v)
            }
            continue
        }
        // sheetData_1.concat(sheetData[k].values)
        for (const v of sheetData[k].values) {
            if (!v[1]) {
                continue
            }
            //if v[3]出現在sheetData_1的[3]就跳過
            const check = sheetData_1.find(v2 => v2[3] == v[3])
            if (check) {
                continue
            }

            v[0] = sheetData_name[k]
            sheetData_1.push(v)
        }
    }
    
    sheetData_1.sort(function (a, b) {
        return a[1] < b[1] ? 1 : -1
    })
    // console.log(sheetData_1)
    // sheetData_2.sort(function (a, b) {
    //     return a[0] < b[0] ? 1 : -1
    // })

    const now = dayjs();
    //指定台北時區
    const date_start = dayjs(now).tz('Asia/Taipei').add(-24 * 14, 'hours').format('YYYY-MM-DD HH:mm');
    const date_end = dayjs(now).tz('Asia/Taipei').add(0, 'hours').format('YYYY-MM-DD HH:mm');

    const all_datas = []
    for (const v of sheetData_1) {
        if (!v[1]) {
            continue
        }
        if (!(v[1] >= date_start && v[1] <= date_end)) {
            continue
        }
        
        //用[0]&[3]找到sheetData_2裡面的[1]&[4]對應資料
        const v_ai = sheetData_2.find(v3 => v3[1] == v[0] && v3[4] == v[3])
        const ai_datas = []
        let ai_recommend = ''
        if (v_ai) {
            const news = (v_ai[2]||'').replace(/\n\n新聞出處：/, '\n新聞出處：').split("\n\n")
            for (const v2 of news) {
                const v3 = v2.split("\n")
                const check = v3.filter(v4 => /^[0-9]+\./.test(v4)).length
                //新聞分析內容
                if (/：$/.test(v3[0]) && /^新聞出處/.test(v3[v3.length - 1]) && check == v3.length - 2 && v3.length > 2) {
                    ai_datas.push(v2)
                }
                ai_recommend = v_ai[5] || ''
            }
        }
        //category	time	url	title	content AI_datas AI_recommend
        all_datas.push([v[0], v[1], v[2], v[3], v[5], ai_datas, ai_recommend])
    }

    const result = all_datas
    
    return result
}

export default getDatas