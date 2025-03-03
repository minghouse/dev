import common from './modules.js';

dayjs.extend(dayjs_plugin_utc)
dayjs.extend(dayjs_plugin_timezone)

let something = []

/**
 * 指定日期如果沒有開市，就往前一天找，直到找到為止
 * @example
 * const res = await work_date('2024-01-01')
 * console.log(res)
 * //Returns: '2023-12-29'
 */
const work_date = async (date) => {
    if (something.length == 0) {
        const open = await fetch(`https://www.twse.com.tw/rwd/zh/holidaySchedule/holidaySchedule?response=json`)
        const data = await open.json();
        something = data.data
    }

    //將上面有日期的資料轉換為只有日期的陣列 EX: [ '20240101', '20240102', ... ]
    const trueorfalse = [];
    for (const v of something){
        if (/交易日/.test(v[1])){
            continue
        }
        trueorfalse.push(v[0])
    }
    //從trueorfalse裡面找date在第幾個位置
    const indexOfdate = trueorfalse.indexOf(date)
    //if date is not in trueorfalse and date is not sunday or saturday
    if (indexOfdate < 0 && dayjs(date).day() !== 0 && dayjs(date).day() !== 6) {
        return date
    }
    
    return await work_date(dayjs(date).add(-1, 'day').format('YYYY-MM-DD'))
}

/**
 * @example
 * const res = await fetch('/google/getDatas')
 * const data = await res.json()
 * console.log(data)
 */
const getDatas8 = async (search_date, search_date2) => { 
    // 配置參數
    const SPREADSHEET_ID = '1DYU3NZmGLrj0G2ruQOyLxhOqLgBkSQ_mQ4-KPlYG-yE';
    // const RANGE = 'AI整理-中國時報!A2:F5';
    // const RANGE = req.query.range

    // const sheetData = await common.accessGoogleSheets(SPREADSHEET_ID, RANGE)

    const accessToken = await common.getAccessToken();
    // console.log('Access Token:', accessToken);

    const now = dayjs();
    const date_start = dayjs(now).tz('Asia/Taipei').add(-24 * 14, 'hours').format('YYYY-MM-DD HH:mm');

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
        // "中國時報",
        "yahoo財經",
        "IEK",
        "時報新聞",
        "AI整理-經濟日報",
        "AI整理-中國時報",
        "AI整理-yahoo財經",
        "AI整理-IEK",
        "AI整理-時報新聞",
        "AI每周整理"
    ]
    const sheetData_promise = []
    for (const v of sheetData_name) {
        const ai_start = (()=>{
            if (v == 'AI每周整理') {
                return ai_sn[v] - 20 < 2 ? 2 : ai_sn[v] - 20
            } else if ([ "AI整理-經濟日報", "AI整理-yahoo財經", "AI整理-IEK", "AI整理-時報新聞" ].includes(v)) {
                return ai_sn[v] - 1000 < 2 ? 2 : ai_sn[v] - 1000
            }
            return 2
        })()
        const ai_end = (()=>{
            if (v == 'AI每周整理') {
                return 20
            } else if ([ "AI整理-經濟日報", "AI整理-yahoo財經", "AI整理-IEK", "AI整理-時報新聞" ].includes(v)) {
                return ai_sn[v]
            }
            return 4000
        })()
        
        sheetData_promise.push(common.accessGoogleSheets(SPREADSHEET_ID, `${v}!A${ai_start}:F${ai_end}`, accessToken))
    }
    const sheetData = await Promise.all(sheetData_promise)

    //資料歸類
    const values = {} //經濟日報, 中國時報, yahoo財經, 工商時報, 時報新聞
    const getDatas6_datas = [] //AI每周整理
    const values2_datas_split = [] //AI整理-經濟日報, AI整理-中國時報, AI整理-yahoo財經, AI整理-工商時報, AI整理-時報新聞
    for (const k in sheetData) {
        if (sheetData_name[k] == 'AI每周整理') {
            const getDatas6 = sheetData[k]
            for (const v of getDatas6.values) {
                if (v[0] < date_start) {
                    continue
                }
                const news = JSON.parse(v[1])
                for (const v2 of news) {
                    const content = `${v2[1]}（${v2[0]}）：\n${v2[2]}\n`
                    getDatas6_datas.push([v[0], 'AI每周整理', content])
                }
            }
        } else if ([ "AI整理-經濟日報", "AI整理-yahoo財經", "AI整理-IEK", "AI整理-時報新聞" ].includes(sheetData_name[k])) {
            const values2_datas = sheetData[k]
            for (const v of values2_datas.values) {
                if (v[0] < date_start) {
                    continue
                }
                const news = v[2].replace(/\n\n新聞出處：/,'\n新聞出處：').split("\n\n")
                for (const v2 of news) {
                    const v3 = v2.split("\n")
                    const check = v3.filter(v4=>/^[0-9]+\./.test(v4)).length
                    if (/：$/.test(v3[0]) && /^新聞出處/.test(v3[v3.length - 1]) && check == v3.length - 2 && v3.length > 2) {
                        values2_datas_split.push([v[0], v[1], v2])
                    }
                }
            }
        }

        values[sheetData_name[k]] = sheetData[k].values
    }
    
    //排序values2_datas_split
    values2_datas_split.sort(function (a, b) {
        return a[0] < b[0] ? 1 : -1
    })

    //----------------------------------------------------
    let error_msg = ''
    // const result = await (async ()=>{
    //     //如果輸入的日期和yahoo一樣就用yahoo的資料
    //     if (dayjs(date_now).day() !== 0 && dayjs(date_now).day() !== 6 && date_now == now.format('YYYYMMDD')) {
    //         //取得當日的成交金額排序前20
    //         const yahoo_turnover = await (async () => {
    //             // const response = await fetch(`https://dev-cpzu.onrender.com/google/rank_changeup`);
    //             const response = await fetch(`https://node-dev.azurewebsites.net/google/rank_changeup`);
    //             const result = await response.json() || {}
    //             return result
    //         })()
            
    //         //yahoo成交值格式轉為證交所的格式
    //         yahoo_turnover.data = yahoo_turnover.data.map(v=> {
    //             // 計算漲跌價差和漲跌(+/-)
    //             const previousClose = parseFloat(v.previousClose);
    //             const currentClose = parseFloat(v.price);
    //             const priceChange = currentClose - previousClose;
    //             const priceChangeSign = priceChange > 0 ? '+' : (priceChange < 0 ? '-' : '');
                
    //             return [
    //                 v.symbol.split('.')[0],                 // 證券代號
    //                 v.name,                                 // 證券名稱
    //                 v.volume,                     // 成交股數
    //                 null,                                   // 成交筆數 (無對應值，用 null)
    //                 (Number(v.turnoverK)*1000).toString(),                  // 成交金額 (單位是千，不需要轉換)
    //                 null,                                   // 開盤價 (對應不到，用 null)
    //                 v.regularMarketDayHigh,     // 最高價
    //                 v.regularMarketDayLow,      // 最低價
    //                 v.price,                    // 收盤價
    //                 priceChangeSign,                        // 漲跌(+/-)
    //                 Math.abs(priceChange.toFixed(2))                  // 漲跌價差
    //             ];
    //         })
    //         if (yahoo_turnover.time.replace(/-/g, '') != date_now) {
    //             return []
    //         }
    //         return yahoo_turnover.data
    //     }
    //     const result = turnover_data_all.find(v => v[0] == dayjs(date_now).format('YYYY-MM-DD')) || []
    //     return JSON.parse(result[1] || '[]')
    // })()

    //fetch https://node-dev.azurewebsites.net/afterTrading search_date & search_date2
    const result = await (async ()=>{
        search_date = await work_date(search_date)
        search_date2 = await work_date(search_date2)
        const prev_search_date = await work_date(dayjs(search_date).add(-1, 'day').format('YYYY-MM-DD'))

        const r1 = fetch(`https://node-dev.azurewebsites.net/afterTrading?date=${search_date}`)
        const r2 = fetch(`https://node-dev.azurewebsites.net/afterTrading?date=${search_date2}`)
        const r3 = fetch(`https://node-dev.azurewebsites.net/afterTrading?date=${prev_search_date}`)
        const [response, response2, response3] = await Promise.all([r1, r2, r3])
        const left_data = await response.json() || []
        const right_data = await response2.json() || []
        const prev_data = await response3.json() || []

        //for rigght_data 然後找到left_data相同股票代號的資料，計算出漲跌幅，並且將資料放入right_data
        function get_change_rate(right_data, left_data){
            for(var i=0; i<right_data.length; i++){
                for(var j=0; j<left_data.length; j++){
                    if(right_data[i][0] == left_data[j][0]){
                        //計算漲跌幅
                        const percentage = (Number(right_data[i][2]) / Number(left_data[j][2]) - 1) * 100;
                        right_data[i].push(left_data[j][2]);
                        right_data[i].push(Math.round(percentage*100)/100);
                    }
                }
            }
            return right_data;
        }

        //search_date到search_date2的漲幅
        const new_right_data = get_change_rate(right_data, left_data)
        //由大到小排序?[4]
        new_right_data.sort(function(a,b){
            if (isNaN(a[4])) a[4] = 0
            if (isNaN(b[4])) b[4] = 0
            return b[4]-a[4];
        });

        //prev_search_date到search_date的漲幅
        const new_prev_data = get_change_rate(left_data, prev_data)
        //由大到小排序?[4]
        new_prev_data.sort(function(a,b){
            if (isNaN(a[4])) a[4] = 0
            if (isNaN(b[4])) b[4] = 0
            return b[4]-a[4];
        });

        //計算每一隻股票的名次變化
        for (const k in new_right_data) {
            const v = new_right_data[k]
            const prev = new_prev_data.findIndex(v2=>v2[0] == v[0])
            if (prev >= 0) {
                v.push(prev - Number(k))
            } else {
                v.push(null)
            }
        }

        //返回前200筆
        return new_right_data.slice(0, 200)
    })()

    const result_20_name = result.map(v=>v[1]) //股票名稱
    
    //過濾新聞
    let values_news = []
    for (const k in values) {
        const v = values[k].filter(v2=> {
            v2[6] = k
            return (new RegExp(`(${(result_20_name.length>0?result_20_name:['abcdexcjivo']).join('|')})`)).test(v2[5]) && v2[1] >= date_start
        })
        values_news = values_news.concat(v)
    }
    values_news.sort(function (a, b) {
        return a[1] < b[1] ? 1 : -1
    })

    // if (result.length == 0) {
    //     search_date = dayjs(search_date).add(-1, 'day').format('YYYY-MM-DD')
    //     getDatas8(search_date)
    //     return
    // }

    const out = {
        error_msg: error_msg,
        now: dayjs().tz('Asia/Taipei').add(-1, 'day').format('YYYY-MM-DD HH:mm'),
        now_week: dayjs().tz('Asia/Taipei').add(-14, 'day').format('YYYY-MM-DD HH:mm'),
        search_date: search_date,
        search_date2: search_date2,
        news: result,
        news_1: values_news,
        news_2: values2_datas_split
    }

    return out
}

export default getDatas8