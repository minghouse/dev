import common from './modules.js';

dayjs.extend(dayjs_plugin_utc)
dayjs.extend(dayjs_plugin_timezone)

/**
 * @example
 * const res = await fetch('/google/getDatas')
 * const data = await res.json()
 * console.log(data)
 */
const getDatas2 = async (search_date) => { 
    // 配置參數
 
    const SPREADSHEET_ID = '1DYU3NZmGLrj0G2ruQOyLxhOqLgBkSQ_mQ4-KPlYG-yE';
    // const RANGE = 'AI整理-中國時報!A2:F5';
    // const RANGE = req.query.range

    // const sheetData = await common.accessGoogleSheets(SPREADSHEET_ID, RANGE)

    const accessToken = await common.getAccessToken();
    // console.log('Access Token:', accessToken);

    const now = dayjs();
    const date_now = (()=>{
        if (search_date) {
            return search_date.replace(/-/g,'')
        }

        let r = dayjs(now).tz('Asia/Taipei').format('YYYYMMDD')
        while (1) {
            if (dayjs(r).day() !== 0 && dayjs(r).day() !== 6){
                break
            }
            r = dayjs(r).add(-1, 'day').format('YYYYMMDD')
        }
        return r
    })()
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
        "工商時報",
        "時報新聞",
        "AI整理-經濟日報",
        // "AI整理-中國時報",
        "AI整理-yahoo財經",
        "AI整理-工商時報",
        "AI整理-時報新聞",
        "AI每周整理",
        "每日成交值排名"
    ]
    const sheetData_promise = []
    for (const v of sheetData_name) {
        const ai_start = (()=>{
            if (v == 'AI每周整理') {
                return ai_sn[v] - 20 < 2 ? 2 : ai_sn[v] - 20
            } else if ([ "AI整理-經濟日報", "AI整理-yahoo財經", "AI整理-工商時報", "AI整理-時報新聞" ].includes(v)) {
                return ai_sn[v] - 1000 < 2 ? 2 : ai_sn[v] - 1000
            } else if (v == '每日成交值排名') {
                return 2
            }
            return 2
        })()
        const ai_end = (()=>{
            if (v == 'AI每周整理') {
                return 20
            } else if ([ "AI整理-經濟日報", "AI整理-yahoo財經", "AI整理-工商時報", "AI整理-時報新聞" ].includes(v)) {
                return ai_sn[v]
            } else if (v == '每日成交值排名') {
                return 140
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
    const turnover_data_all = [] //每日成交值排名
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
        } else if ([ "AI整理-經濟日報", "AI整理-yahoo財經", "AI整理-工商時報", "AI整理-時報新聞" ].includes(sheetData_name[k])) {
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
        } else if (sheetData_name[k] == '每日成交值排名') {
            turnover_data_all.push(...sheetData[k].values)
        }

        values[sheetData_name[k]] = sheetData[k].values
    }
    
    //排序values2_datas_split
    values2_datas_split.sort(function (a, b) {
        return a[0] < b[0] ? 1 : -1
    })

    //----------------------------------------------------
    let error_msg = ''
    const result = await (async ()=>{
        //如果輸入的日期和yahoo一樣就用yahoo的資料
        if (dayjs(date_now).day() !== 0 && dayjs(date_now).day() !== 6 && date_now == now.format('YYYYMMDD')) {
            //取得當日的成交金額排序前20
            const yahoo_turnover = await (async () => {
                // const response = await fetch(`https://dev-cpzu.onrender.com/google/rank_turnover`);
                const response = await fetch(`https://newsdev.duckdns.org/google/rank_turnover`);
                const result = await response.json() || {}
                return result
            })()
            
            //yahoo成交值格式轉為證交所的格式
            yahoo_turnover.data = yahoo_turnover.data.map(v=> {
                // 計算漲跌價差和漲跌(+/-)
                const previousClose = parseFloat(v.previousClose);
                const currentClose = parseFloat(v.price);
                const priceChange = currentClose - previousClose;
                const priceChangeSign = priceChange > 0 ? '+' : (priceChange < 0 ? '-' : '');
                
                return [
                    v.symbol.split('.')[0],                 // 證券代號
                    v.name,                                 // 證券名稱
                    v.volume,                     // 成交股數
                    null,                                   // 成交筆數 (無對應值，用 null)
                    (Number(v.turnoverK)*1000).toString(),                  // 成交金額 (單位是千，不需要轉換)
                    null,                                   // 開盤價 (對應不到，用 null)
                    v.regularMarketDayHigh,     // 最高價
                    v.regularMarketDayLow,      // 最低價
                    v.price,                    // 收盤價
                    priceChangeSign,                        // 漲跌(+/-)
                    Math.abs(priceChange.toFixed(2))                  // 漲跌價差
                ];
            })
            if (yahoo_turnover.time.replace(/-/g, '') != date_now) {
                return []
            }
            return yahoo_turnover.data
        }

        const result = turnover_data_all.find(v => v[0] == dayjs(date_now).format('YYYY-MM-DD')) || []
        return JSON.parse(result[1] || '[]')
    })()

    result.map(a=>{
        //前日收盤價
        const c = Number(a[8].replace(/,/g,'')) - (a[9]?(/\+/.test(a[9])?a[10]:0-a[10]):0)
        // 提取当前收盘价和最后揭示的买价或卖价（假设为前一日收盘价），计算漲跌價差（c1）
        const c1 = Number(a[8].replace(/,/g,'')) - c
        // 计算漲幅百分比（c2）
        const c2 = ((c1 / Number(c)) * 100).toFixed(2)
        a[16] = Number(c2) || 0
        return a
    })

    result.sort(function (a, b) {
        return Number(a[4].replace(/,/g,'')) < Number(b[4].replace(/,/g,'')) ? 1 : -1
    })
    const result_20_name = result.map(v=>v[1]) //股票名稱
    
    //計算連續幾日在排行榜中並且上漲的統計
    let result_20_name_list = result.map(v=>v[1])
    let date_now2 = date_now
    while (1) {
        //找到前一天的turnover_data_all中有result_20_name_list的股票，然後把對應的result中的股票[17]+1
        date_now2 = dayjs(date_now2).add(-1, 'day').format('YYYYMMDD')
        const result2 = (()=>{
            const result = turnover_data_all.find(v => v[0] == dayjs(date_now2).format('YYYY-MM-DD'))
            if (!result) {
                return 'AAA'
            }
            return JSON.parse(result[1] || '[]')
        })();
        if (result2 == 'AAA') {
            break
        }
        if (result2.length == 0) {
            continue
        }
        const result3 = result2.filter(v=>result_20_name_list.includes(v[1]) && /\+/.test(v[9]))
        if (result3.length == 0) {
            break
        }
        for (const v of result3) {
            const index = result.findIndex(v2=> v2[1] == v[1])
            result[index][17] = (result[index][17]||0) + 1
        }
        result_20_name_list = result3.map(v=>v[1])
    }

    //找到14天以來首次出現在成交值的股票 & 累積出現的次數 & 最低收盤價
    const turnover_data_all_2_14day = dayjs(date_now).add(-14, 'day').format('YYYY-MM-DD')
    const turnover_data_all_stock = {}
    for (const v of turnover_data_all) {
        if (v[0] < dayjs(date_now).format('YYYY-MM-DD') && v[0] > turnover_data_all_2_14day) {
            for (const v2 of JSON.parse(v[1] || '[]')) {
                const v3 = turnover_data_all_stock[v2[1]] || {}
                turnover_data_all_stock[v2[1]] = {
                    name: v2[1],
                    timer: (v3.timer || 0) + 1,
                    lowest_close_price: (v3.lowest_close_price || 999999) > Number(v2[8].replace(/,/g, '')) ? Number(v2[8].replace(/,/g, '')) : v3.lowest_close_price
                }
            }
        }
    }
    const turnover_data_stock = result_20_name.map(v => {
        if (v in turnover_data_all_stock) {
            return turnover_data_all_stock[v]
        }
    }).filter(v => v)

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

    if (result.length == 0) {
        search_date = dayjs(date_now).add(-1, 'day').format('YYYY-MM-DD')
        getDatas2(search_date)
        return
    }

    const out = {
        error_msg: error_msg,
        now: dayjs().tz('Asia/Taipei').add(-1, 'day').format('YYYY-MM-DD HH:mm'),
        now_week: dayjs().tz('Asia/Taipei').add(-14, 'day').format('YYYY-MM-DD HH:mm'),
        search_date: dayjs(date_now).format('YYYY-MM-DD'),
        // news: news
        news: result,
        news_1: values_news,
        news_2: values2_datas_split,
        turnover_data_stock: turnover_data_stock
    }

    return out
}

export default getDatas2