import common from './modules.js';

dayjs.extend(dayjs_plugin_utc)
dayjs.extend(dayjs_plugin_timezone)

/**
 * @example
 * const res = await fetch('/google/getDatas')
 * const data = await res.json()
 * console.log(data)
 */
const getDatas5 = async (search_date) => { 
    // 配置參數
 
    const SPREADSHEET_ID = '1DYU3NZmGLrj0G2ruQOyLxhOqLgBkSQ_mQ4-KPlYG-yE';
    // const RANGE = 'AI整理-中國時報!A2:F5';
    // const RANGE = req.query.range

    // const sheetData = await common.accessGoogleSheets(SPREADSHEET_ID, RANGE)

    const accessToken = await common.getAccessToken();
    // console.log('Access Token:', accessToken);

    const now = dayjs();
    let date_now = (()=>{
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

    //----------------------------------------------------
    //AI整理-索引&自選股
    const [ai_sn_data, turnover_data, aftertrading_datas] = await Promise.all([
        common.accessGoogleSheets(SPREADSHEET_ID, 'AI整理-索引!A1:B20', accessToken),
        common.accessGoogleSheets(SPREADSHEET_ID, '自選股!A2:G1000', accessToken),
        // common.accessGoogleSheets(SPREADSHEET_ID, '每日收盤價!A2:B100', accessToken)
    ])
    
    //----------------------------------------------------
    //自選股整理
    const turnover_data_all = turnover_data.values
    // const aftertrading_data_all = aftertrading_datas.values
    
    //順便去除重複
    const result_20_name = turnover_data_all.map(v=>v[2]).filter((v, i, s)=>s.indexOf(v)===i) //股票名稱

    //----------------------------------------------------

    //上面註解的getDatas方法是appscript，這裡改成nodejs
    const ai_sn = {}
    for (const v of ai_sn_data.values) {
        if (v[0]) {
            ai_sn[v[0]] = v[1]
        }
    }

    let sheetData_name = []
    const sheetData = await (async ()=>{
        try {
            sheetData_name = [
                "news",
                "AI整理-經濟日報",
                "AI整理-中國時報",
                "AI整理-yahoo財經",
                "AI整理-工商時報",
                "AI整理-時報新聞",
                "AI每周整理",
                "每日收盤價",
            ]
            const sheetData_promise = []

            for (const v of sheetData_name) {
                const ai_start = (()=>{
                    if (v == 'AI每周整理') {
                        return ai_sn[v] - 20 < 2 ? 2 : ai_sn[v] - 20
                    } else if ([ "AI整理-經濟日報", "AI整理-中國時報", "AI整理-yahoo財經", "AI整理-工商時報", "AI整理-時報新聞" ].includes(v)) {
                        return ai_sn[v] - 1000 < 2 ? 2 : ai_sn[v] - 1000
                    } else if (v == '每日收盤價') {
                        return 2
                    }
                    return 2
                })()
                const ai_end = (()=>{
                    if (v == 'AI每周整理') {
                        return 20
                    } else if ([ "AI整理-經濟日報", "AI整理-中國時報", "AI整理-yahoo財經", "AI整理-工商時報", "AI整理-時報新聞" ].includes(v)) {
                        return ai_sn[v]
                    } else if (v == '每日收盤價') {
                        return 1000
                    }
                    return 4000
                })()
                
                if (v == 'news') {
                    sheetData_promise.push(new Promise(async (resolve, reject) => {
                        try {
                            const form_data = {
                                select: 'source, category, create_date, create_time, url, title, short_content, content',
                                from: 'news',
                                where: `where create_date > '${date_start.split(' ')[0]}' AND content REGEXP '(${result_20_name.join('|')})'`
                            }
                            const res = await fetch('http://127.0.0.1:3000/azure_mysql/select', {
                            // const res = await fetch('https://dev-cpzu.onrender.com/azure_mysql/select', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(form_data)
                            })
                            const data = await res.json()
                            resolve(data)
                        } catch (error) {
                            reject(error)
                        }
                    }))
                } else {
                    sheetData_promise.push(common.accessGoogleSheets(SPREADSHEET_ID, `${v}!A${ai_start}:G${ai_end}`, accessToken))
                }
            }
            return await Promise.all(sheetData_promise)
        } catch (e) {
            sheetData_name = [
                "經濟日報",
                "中國時報",
                "yahoo財經",
                "工商時報",
                "時報新聞",
                "AI整理-經濟日報",
                "AI整理-中國時報",
                "AI整理-yahoo財經",
                "AI整理-工商時報",
                "AI整理-時報新聞",
                "AI每周整理",
                "每日收盤價",
            ]
            const sheetData_promise = []
            for (const v of sheetData_name) {
                const ai_start = (()=>{
                    if (v == 'AI每周整理') {
                        return ai_sn[v] - 20 < 2 ? 2 : ai_sn[v] - 20
                    } else if ([ "AI整理-經濟日報", "AI整理-中國時報", "AI整理-yahoo財經", "AI整理-工商時報", "AI整理-時報新聞" ].includes(v)) {
                        return ai_sn[v] - 1000 < 2 ? 2 : ai_sn[v] - 1000
                    } else if (v == '每日收盤價') {
                        return 2
                    }
                    return 2
                })()
                const ai_end = (()=>{
                    if (v == 'AI每周整理') {
                        return 20
                    } else if ([ "AI整理-經濟日報", "AI整理-中國時報", "AI整理-yahoo財經", "AI整理-工商時報", "AI整理-時報新聞" ].includes(v)) {
                        return ai_sn[v]
                    } else if (v == '每日收盤價') {
                        return 1000
                    }
                    return 4000
                })()
                
                sheetData_promise.push(common.accessGoogleSheets(SPREADSHEET_ID, `${v}!A${ai_start}:G${ai_end}`, accessToken))
            }
            return await Promise.all(sheetData_promise)
        }
    })()

    //資料歸類
    const values = {} //經濟日報, 中國時報, yahoo財經, 工商時報, 時報新聞
    const getDatas5_datas = [] //AI每周整理
    const values2_datas_split = [] //AI整理-經濟日報, AI整理-中國時報, AI整理-yahoo財經, AI整理-工商時報, AI整理-時報新聞
    // const turnover_data_all = [] //每日漲幅排名
    const aftertrading_data_all = [] //每日收盤價
    for (const k in sheetData) {
        if (sheetData_name[k] == 'AI每周整理') {
            const getDatas5 = sheetData[k]
            for (const v of getDatas5.values) {
                if (v[0] < date_start) {
                    continue
                }
                const news = JSON.parse(v[1])
                for (const v2 of news) {
                    const content = `${v2[1]}（${v2[0]}）：\n${v2[2]}\n`
                    getDatas5_datas.push([v[0], 'AI每周整理', content])
                }
            }
        } else if ([ "AI整理-經濟日報", "AI整理-中國時報", "AI整理-yahoo財經", "AI整理-工商時報", "AI整理-時報新聞" ].includes(sheetData_name[k])) {
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
        } else if (sheetData_name[k] == '每日收盤價') {
            aftertrading_data_all.push(...sheetData[k].values)
        } else if (sheetData_name[k] == 'news') {
            const news = sheetData[k]
            for (const v of news) {
                if (!values[v.source]) {
                    values[v.source] = []
                }
                values[v.source].push([v.category, `${dayjs(v.create_date).format('YYYY-MM-DD')} ${v.create_time.replace(/:[0-9]$/, '')}`, v.url, v.title, v.short_content, v.content])
            }
        } else {
            values[sheetData_name[k]] = sheetData[k].values
        }
    }
    
    //排序values2_datas_split
    values2_datas_split.sort(function (a, b) {
        return a[0] < b[0] ? 1 : -1
    })

    //----------------------------------------------------
    //每日收盤價整理
    let aftertrading_data = []
    let a_i = 0
    while (1) {
      const d = dayjs(date_now).add(0 - a_i, 'day').format('YYYY-MM-DD')
      const v = aftertrading_data_all.find(v => v[1] != '[]' && v[0] == d)
      if (v) {
        date_now = d
        aftertrading_data = v
        break
      } else {
        aftertrading_data = [date_now, '[]']
        break
      }
      a_i++
    }
    aftertrading_data[1] = JSON.parse(aftertrading_data[1])

    let error_msg = ''
    const result = (()=>{
      // const result = turnover_data_all.find(v => v[0] == dayjs.dayjs(date_now).format('YYYY-MM-DD')) || []
      const result = turnover_data_all.filter(v=>v[0]!='').map(v => {
        // console.log(v[3],v[4],v[5])
        const aftertrading = aftertrading_data[1].find(v2 => v2[0] == v[1]) || []
        return [
          v[1],
          v[2],
          v[0],
          '',
          v[6]||'',
          v[3]||'',
          v[4]||'',
          v[5]||'',
          aftertrading[1] ? aftertrading[1]:'',
          '',
          '',
        ]
      })
      return result
    })()

    //迴圈result，將[6]是負數的股票到result中找到對應的股票，然後把對應的result中的股票[6]加上這個負數，如果還是<0，則繼續找對應的股票，直到[6]是正數，然後去掉這筆資料
    result.map(v=>{
        if (v[6] < 0) {
            let v2 = result.find(v2=>v2[2]==v[2] && v2[1]==v[1] && v2[6]>0)
            while (v2) {
                v2[6] = Number(v2[6]) + Number(v[6])
                if (v2[6] >= 0) {
                    v[6] = ''
                    break
                }
                v[6] = v2[6]
                v2[6] = ''
                v2 = result.find(v2=>v2[2]==v[2] && v2[1]==v[1] && v2[6]>0)
            }
        }
    })
    //排除[6]是''的股票
    const result2 = result.filter(v=>v[6]!='')

    //按照分類將相同的股票合併
    const result3 = []
    for (const v of result2) {
        const v2 = result3.find(v2=>v2[2]==v[2] && v2[1]==v[1])
        if (v2) {
            const v3 = Number(v2[6]) + Number(v[6])
            //股價要平均
            v2[7] = (((Number(v2[7]) * Number(v2[6])) + (Number(v[7]) * Number(v[6]))) / v3).toFixed(2)
            v2[6] = v3
            v2[4] += v2[4] ? `<br>${v[5]}: ${v[4]}` : `${v[5]}: ${v[4]}`
        } else {
            result3.push(v)
        }
    }

    //------------------------------------------------------------
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
        getDatas5(search_date)
        return
    }

    const out = {
        error_msg: error_msg,
        now: dayjs().tz('Asia/Taipei').add(-1, 'day').format('YYYY-MM-DD HH:mm'),
        now_week: dayjs().tz('Asia/Taipei').add(-14, 'day').format('YYYY-MM-DD HH:mm'),
        search_date: dayjs(date_now).format('YYYY-MM-DD'),
        // news: news
        news: result3,
        news_1: values_news,
        news_2: values2_datas_split,
        turnover_data_stock: []
    }

    return out
}

export default getDatas5