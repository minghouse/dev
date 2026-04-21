import sheet_search from './sheet_search.js';
import stock_list from './stock_list.js';
import { settings } from "./modules/settings.js";

dayjs.extend(dayjs_plugin_utc)
dayjs.extend(dayjs_plugin_timezone)

// 差異查詢快取：第一次查全部，之後只查新增的部分
const _cache = {
    ai_sn: {},        // 各 AI/15分K 表單的上次 ai_sn 值
    sheetValues: {},  // 各表單快取的完整資料列
    newsLastRow: {}   // 新聞表單上次取得的最後列號
}

/**
 * @example
 * const res = await fetch('/google/getDatas')
 * const data = await res.json()
 * console.log(data)
 */
const getDatas3 = async (search_date) => { 
    // 配置參數

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
    const ai_sn_data = await sheet_search('AI整理-索引!A1:B20')

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
        "15分K",
        "每日收盤價"
    ]
    const AI_SHEETS = ["AI整理-經濟日報", "AI整理-yahoo財經", "AI整理-工商時報", "AI整理-時報新聞"]
    const sheetData_promise = []
    for (const v of sheetData_name) {
        if (AI_SHEETS.includes(v)) {
            const prevSn = Number(_cache.ai_sn[v] || 0)
            const currSn = Number(ai_sn[v])
            if (!_cache.sheetValues[v]) {
                // 第一次：取最近 1000 列
                const start = currSn - 1000 < 2 ? 2 : currSn - 1000
                sheetData_promise.push(sheet_search(`${v}!A${start}:F${currSn}`))
            } else if (currSn > prevSn) {
                // 差異查詢：只取新增的列
                sheetData_promise.push(sheet_search(`${v}!A${prevSn + 1}:F${currSn}`))
            } else {
                // 無新資料
                sheetData_promise.push(Promise.resolve({ values: [] }))
            }
        } else if (v == '15分K') {
            // 15分K：每次都抓後 500 筆，不使用快取
            const currSn = Number(ai_sn[v])
            const start = currSn - 500 < 2 ? 2 : currSn - 500
            sheetData_promise.push(sheet_search(`${v}!A${start}:E${currSn}`))
        } else if (v == '每日收盤價') {
            sheetData_promise.push(sheet_search(`${v}!A2:J16`, 'STOCK'))
        } else {
            // 一般新聞表單
            if (_cache.sheetValues[v]) {
                sheetData_promise.push(sheet_search(`${v}!A2:F100`))
            } else {
                sheetData_promise.push(sheet_search(`${v}!A2:F2000`))
            }
        }
    }
    const sheetData_new = await Promise.all(sheetData_promise)

    // 合併新資料到快取，並組成 sheetData（維持原有處理邏輯）
    const sheetData = []
    for (let k = 0; k < sheetData_name.length; k++) {
        const v = sheetData_name[k]
        const newValues = (sheetData_new[k] && sheetData_new[k].values) || []

        if (v == '每日收盤價') {
            _cache.sheetValues[v] = newValues
        } else if (v == '15分K') {
            // 15分K 不快取，直接使用抓來的資料
        } else if (AI_SHEETS.includes(v)) {
            // AI 分析：合併並去除 14 天前的資料
            const existing = _cache.sheetValues[v] || []
            _cache.sheetValues[v] = existing.concat(newValues).filter(r => r[0] >= date_start)
            _cache.ai_sn[v] = ai_sn[v]
        } else {
            // 新聞表單：合併、去重、去除 14 天前的資料
            const existing = _cache.sheetValues[v] || []
            const pruned = existing.filter(r => r[1] >= date_start)
            const seen = new Set(pruned.map(r => r[3]))
            const deduped_new = newValues.filter(r => !seen.has(r[3]))
            _cache.sheetValues[v] = pruned.concat(deduped_new)
        }

        // 15分K 直接用 newValues，其餘用快取
        sheetData.push({ values: v == '15分K' ? newValues : _cache.sheetValues[v] })
    }

    //資料歸類
    const values = {} //經濟日報, 中國時報, yahoo財經, 工商時報, 時報新聞
    const values2_datas_split = [] //AI整理-經濟日報, AI整理-中國時報, AI整理-yahoo財經, AI整理-工商時報, AI整理-時報新聞
    const turnover_data_all = [] //每日漲幅排名
    const close_data_all = [] //每日收盤價
    const k15_data_all = [] //15分K
    for (const k in sheetData) {
        if ([ "AI整理-經濟日報", "AI整理-中國時報", "AI整理-yahoo財經", "AI整理-工商時報", "AI整理-時報新聞" ].includes(sheetData_name[k])) {
            const values2_datas = sheetData[k]
            for (const v of values2_datas.values) {
                if (v[0] < date_start) {
                    continue
                }
                const news = (v[2]||'').replace(/\n\n新聞出處：/,'\n新聞出處：').split("\n\n")
                for (const v2 of news) {
                    const v3 = v2.split("\n")
                    const check = v3.filter(v4=>/^[0-9]+\./.test(v4)).length
                    if (/：$/.test(v3[0]) && /^新聞出處/.test(v3[v3.length - 1]) && check == v3.length - 2 && v3.length > 2) {
                        values2_datas_split.push([v[0], v[1], v2, v[5]])
                    }
                }
            }
        } else if (sheetData_name[k] == '每日收盤價') {
            // console.log(sheetData[k].values)
            for (const v of sheetData[k].values) {
                //證券代號
                const stock = JSON.parse(v[1])
                //證券名稱
                const name = stock.map(v2=>stock_list.find(v3=>v3[0]==v2)?stock_list.find(v3=>v3[0]==v2)[1]:v2)
                //成交股數
                const volume = JSON.parse(v[2])
                //成交金額
                const turnover = JSON.parse(v[3])
                //開盤價
                const open = JSON.parse(v[4])
                //最高價
                const high = JSON.parse(v[5])
                //最低價
                const low = JSON.parse(v[6])
                //收盤價
                const close = JSON.parse(v[7])
                //漲跌(+/-)
                const change_sign = JSON.parse(v[8])
                //漲跌價差
                const change_value = JSON.parse(v[9])

                const stock_data = []
                for (let i=0; i<stock.length; i++) {
                    stock_data.push([
                        stock[i], //證券代號
                        name[i], //股票名稱
                        volume[i], //成交股數
                        null, //成交筆數 (無對應值，用 null)
                        turnover[i], //成交金額
                        open[i], //開盤價
                        high[i], //最高價
                        low[i], //最低價
                        close[i], //收盤價
                        change_sign[i], //漲跌(+/-)
                        change_value[i], //漲跌價差
                    ])
                }

                close_data_all.push([v[0], stock_data])
            }
            //排序close_data_all計算turnover_data_all
            for (const v of close_data_all) {
                const date = v[0]
                const stock_data = v[1]
                //找到漲幅最高的前100
                turnover_data_all.push([date, stock_data.filter(v=>!isNaN(Number(v[8].replace(/,/g, '')))).sort(function (a, b) {
                    //計算漲跌幅百分比
                    const a_previous_close = Number(a[8].replace(/,/g,'')) - (a[9] ? (/\+/.test(a[9]) ? a[10] : 0-a[10]) : 0);
                    const b_previous_close = Number(b[8].replace(/,/g,'')) - (b[9] ? (/\+/.test(b[9]) ? b[10] : 0-b[10]) : 0);
                    const a_percent = Number((((Number(a[8].replace(/,/g,'')) - a_previous_close) / a_previous_close) * 100).toFixed(2));
                    const b_percent = Number((((Number(b[8].replace(/,/g,'')) - b_previous_close) / b_previous_close) * 100).toFixed(2));
                    return a_percent < b_percent ? 1 : -1
                }).slice(0, 100)])
            }
        } else if (sheetData_name[k] == '15分K') {
            const values2_datas = sheetData[k]
            //日期	股票代號	是否為紅色	成交量是否>5000
            for (const v of values2_datas.values) {
                //日期相同才加入
                if (v[0] == dayjs(date_now).format('YYYY-MM-DD')) {
                    k15_data_all.push(v)
                }
            }
        }

        values[sheetData_name[k]] = sheetData[k].values
    }
    // console.log(k15_data_all)
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
                // const response = await fetch(`https://dev-cpzu.onrender.com/google/rank_changeup`);
                // const response = await fetch(`https://newsdev.duckdns.org/google/rank_changeup`);
                const url = `${settings.api_domain}/fetch?url=${encodeURIComponent('https://tw.stock.yahoo.com/rank/change-up')}`
                const response = await fetch(url);
                
                const html = await response.text();
                const idx = html.indexOf('root.App.main = ');
                if (idx === -1) {
                    console.error(`[Yahoo] 找不到 root.App.main，URL: ${url}`);
                    return { symbols: [], rankTime: null };
                }
                const raw = html.substring(idx + 'root.App.main = '.length);
                const part1 = raw.split('"main-0-StockRanking":')[1];
                if (!part1) {
                    console.error(`[Yahoo] 找不到 StockRanking 資料，URL: ${url}`);
                    return { symbols: [], rankTime: null };
                }
                const part2 = part1.split('"UserStore"')[0];
                const part3 = part2.split('"BankStore"')[0];
                const part4 = part3.split('"PortfolioUIStore"')[0];
                const part5 = part4.split('"FundStore"')[0];
                const cleaned = part5.replace(/\},\s*$/, '');
                
                const data = JSON.parse(cleaned);
                return {
                    data: data?.list || [],
                    time: (data?.listMeta?.rankTime||'').split('T')[0]
                }
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
            turnover_data_all.unshift([dayjs(date_now).format('YYYY-MM-DD'), yahoo_turnover.data])
            return yahoo_turnover.data
        }
        const result = turnover_data_all.find(v => v[0] == dayjs(date_now).format('YYYY-MM-DD')) || []
        return result[1]
    })()

    result.map(a=>{
        //前日收盤價
        const c = Number(a[8].replace(/,/g,'')) - (a[9]?(/\+/.test(a[9])?a[10]:0-a[10]):0)
        // 提取当前收盘价和最后揭示的买价或卖价（假设为前一日收盘价），计算漲跌價差（c1）
        const c1 = Number(a[8].replace(/,/g,'')) - c
        // 计算漲幅百分比（c2）
        const c2 = ((c1 / Number(c)) * 100).toFixed(2)
        a[16] = Number(c2) || 0
        // return c2 <= 10 && c2 >= -10
        return a
    })

    result.sort(function (a, b) {
    //   const c1 = Number(a[8].replace(/,/g,'')) - /\+/.test(a[9])?a[10]:0-a[10]
    //   const c2 = Number(b[8].replace(/,/g,'')) - /\+/.test(b[9])?b[10]:0-b[10]
    //   return (Number(a[8].replace(/,/g,''))/c1*100).toFixed(2) >= (Number(b[8].replace(/,/g,''))/c2*100).toFixed(2) ? 1 : -1
        return a[16] < b[16] ? 1 : -1
    })
    const result_20_name = result.map(v=>v[1]) //股票名稱
    
    //計算連續幾日在排行榜中並且上漲的統計
    let now2 = 0
    while (1) {
        //找到前一天的turnover_data_all中有result_20_name_list的股票，然後把對應的result中的股票[17]+1
        now2++
        if (!turnover_data_all[now2]) {
            break
        }
        const result3 = turnover_data_all[now2][1]
        for (const v of result3) {
            const index = result.findIndex(v2=> v2[0] == v[0])
            if (index == -1) {
                continue
            }
            result[index][17] = (result[index][17]||0) + 1
        }
    }

    //找到14天以來首次出現在成交值的股票 & 累積出現的次數 & 最低收盤價
    const turnover_data_all_2_14day = dayjs(date_now).add(-14, 'day').format('YYYY-MM-DD')
    const turnover_data_all_stock = {}
    for (const v of turnover_data_all) {
        if (v[0] < dayjs(date_now).format('YYYY-MM-DD') && v[0] > turnover_data_all_2_14day) {
            for (const v2 of v[1]) {
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

    //找到前一天的result，計算成交量是否出現量增K
    let date_now3 = date_now
    let result_yesterday = []
    let result_yesterday_index = -1
    while (result_yesterday_index < 10) {
        result_yesterday_index++
        date_now3 = dayjs(date_now3).add(-1, 'day').format('YYYYMMDD')
        result_yesterday = (()=>{
            const result = close_data_all.find(v => v[0] == dayjs(date_now3).format('YYYY-MM-DD'))
            if (!result) {
                return 'AAA'
            }
            return result[1]
        })();
        if (result_yesterday == 'AAA') {
            continue
        }
        if (result_yesterday.length > 0) {
            break
        }
    }
    console.log(date_now3)
    if (result_yesterday == 'AAA') {
        result_yesterday = []
    }
    for (const v of result) {
        const v2 = result_yesterday.find(v3=>v3[0] == v[0])
        if (v2) {
            //前日收盤價
            const c = Number(v2[8].replace(/,/g,'')) - (v2[9]?(/\+/.test(v2[9])?v2[10]:0-v2[10]):0)
            // 提取当前收盘价和最后揭示的买价或卖价（假设为前一日收盘价），计算漲跌價差（c1）
            const c1 = Number(v2[8].replace(/,/g,'')) - c
            // 计算漲幅百分比（c2）
            const c2 = ((c1 / Number(c)) * 100).toFixed(2)
            v2[16] = Number(c2) || 0

            //今天的成交量 > 昨天的成交量 就是量增K
            if (Number(v[2].replace(/,/g,'')) > Number(v2[2].replace(/,/g,''))) {
                v[18] = true
            } else {
                v[18] = false
            }

            //昨天是否漲8%以上
            if (v2[16] >= 8) {
                v[19] = true
            } else {
                v[19] = false
            }

            //昨日成交金額
            v[20] = v2[4] || null
            
        } else {
            v[18] = false
            v[19] = false
            v[20] = null
        }
    }
    
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
        getDatas3(search_date)
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
        turnover_data_stock: turnover_data_stock,
        k15_data_all: k15_data_all
    }

    return out
}

export default getDatas3