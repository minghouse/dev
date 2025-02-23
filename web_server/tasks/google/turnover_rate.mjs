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
        const response = await fetch(`https://www.moneydj.com/Z/ZG/ZG.djhtm?a=BD`);
        const r1 = await response.text() || ''
        const result = r1.match(/<tr>[\s\S]*?<\/tr>/g)
        // console.log(result)
        //刪除第一筆
        const data = result.slice(1).map(v => {
            v=v.replace(/&nbsp;/g,'')
            // console.log(v)
            const v2 = v.match(/<td class="(t3t1|t3t1_rev)">[\s\S]*?<\/td>/g) || []
            const v3 = v.match(/<td class="(t3n1|t3r1|t3g1|t3n1_rev|t3r1_rev|t3g1_rev)">[\s\S]*?<\/td>/g) || []
            return {
              symbol: (v2[0].match(/GenLink2stk\('([^']+)'/) || [])[1].replace(/(AS|AP)/,''), // 證券代號
              name: (v2[0].match(/GenLink2stk\(\s*'[^']+'\s*,\s*'([^']+)'\s*\)/) || [])[1], // 證券名稱
              price: (v3[0].match(/>([^<]+)</) || [])[1], // 收盤價
              priceChange: (v3[1].match(/>([^<]+)</) || [])[1], // 漲跌價差
              priceChangePercent: (v3[2].match(/>([^<]+)</) || [])[1], // 漲跌幅
              volume: (v3[3].match(/>([^<]+)</) || [])[1], // 成交量
              turnoverK: (v3[4].match(/>([^<]+)</) || [])[1], // 週轉率
  
            }
          })
          // <div class="t11">日期：02/19</div> 
          const time = r1.match(/<div class="t11">([^<]+)<\/div>/) || [])[1] || ''
          return {
            data: data,
            time: (time.match(/([0-9\/]+)/) || [])[1] || ''
          }
    })()

    const yahoo_turnover2 = await (async () => {
        const response = await fetch(`https://www.moneydj.com/z/zg/zg_BD_0_0.djhtm`);
        // <tr>
        //名次	股票名稱	收盤價	漲跌	漲跌幅	成交量	週轉率
        //   <td class="t3n0" id="oAddCheckbox">1</td>
        //   <td class="t3t1">&nbsp;
        //   <SCRIPT LANGUAGE=javascript>
        //   <!--
        //     GenLink2stk('AS6558','興能高');
        //   //-->
        //   </SCRIPT>

        //   </td>
        //   <td class="t3n1">&nbsp;62.60</td>
        //   <td class="t3r1">+&nbsp;0.20</td>
        //   <td class="t3r1">&nbsp;+0.32%</td>
        //   <td class="t3n1">&nbsp;58,626</td>
        //   <td class="t3n1">&nbsp;67.81%</td>
        //   </tr>
        const r1 = await response.text() || ''
        const result = r1.match(/<tr>[\s\S]*?<\/tr>/g)
        // console.log(result)
        //刪除第一筆
        const data = result.slice(1).map(v => {
          v=v.replace(/&nbsp;/g,'')
          // console.log(v)
          const v2 = v.match(/<td class="(t3t1|t3t1_rev)">[\s\S]*?<\/td>/g) || []
          const v3 = v.match(/<td class="(t3n1|t3r1|t3g1|t3n1_rev|t3r1_rev|t3g1_rev)">[\s\S]*?<\/td>/g) || []
          return {
            symbol: (v2[0].match(/GenLink2stk\('([^']+)'/) || [])[1].replace(/(AS|AP)/,''), // 證券代號
            name: (v2[0].match(/GenLink2stk\(\s*'[^']+'\s*,\s*'([^']+)'\s*\)/) || [])[1], // 證券名稱
            price: (v3[0].match(/>([^<]+)</) || [])[1], // 收盤價
            priceChange: (v3[1].match(/>([^<]+)</) || [])[1], // 漲跌價差
            priceChangePercent: (v3[2].match(/>([^<]+)</) || [])[1], // 漲跌幅
            volume: (v3[3].match(/>([^<]+)</) || [])[1], // 成交量
            turnoverK: (v3[4].match(/>([^<]+)</) || [])[1], // 週轉率

          }
        })
        // <div class="t11">日期：02/19</div>
        const time = r1.match(/<div class="t11">日期：([^<]+)<\/div>/)
        return {
          data: data,
          time: time ? time[1] : ''
        }
    })()

    //合併兩個周轉率的數據然後使用sort排序週轉率欄位的數字，由大到小
    const yahoo_turnover3 = {}
    yahoo_turnover3.time = yahoo_turnover.time
    yahoo_turnover3.data = yahoo_turnover.data.concat(yahoo_turnover2.data).sort(function (a, b) {
        return Number(a.turnoverK.replace('%', '')) <= Number(b.turnoverK.replace('%', '')) ? 1 : -1
    })

    // console.log(yahoo_turnover3.time)
    
    //yahoo成交值格式轉為證交所的格式
    yahoo_turnover3.data = yahoo_turnover3.data.map(v=> {
        // 目的是return出來的格式是證交所的格式，這是參考代碼:
        // 計算漲跌價差和漲跌(+/-)
        // const previousClose = parseFloat(v.previousClose);
        // const currentClose = parseFloat(v.price);
        // const priceChange = currentClose - previousClose;
        // const priceChangeSign = priceChange > 0 ? '+' : (priceChange < 0 ? '-' : '');
        // return [
        //     v.symbol.split('.')[0],                 // 證券代號
        //     v.name,                                 // 證券名稱
        //     v.volume,                     // 成交股數
        //     null,                                   // 成交筆數 (無對應值，用 null)
        //     (Number(v.turnoverK)*1000).toString(),                  // 成交金額 (單位是千，不需要轉換)
        //     null,                                   // 開盤價 (對應不到，用 null)
        //     v.regularMarketDayHigh,     // 最高價
        //     v.regularMarketDayLow,      // 最低價
        //     v.price,                    // 收盤價
        //     priceChangeSign,                        // 漲跌(+/-)
        //     Math.abs(priceChange.toFixed(2))                  // 漲跌價差
        // ];
        return [
            v.symbol, // 證券代號
            v.name, // 證券名稱
            null, // 成交股數
            null, // 成交筆數 (無對應值，用 null)
            (Number(v.volume.replace(/,/g, '')) * 1000).toString(), // 成交量
            null, // 開盤價 (對應不到，用 null)
            null, // 最高價
            null, // 最低價
            v.price, // 收盤價
            /\+/.test(v.priceChange) ? '+' : (/\-/.test(v.priceChange) ? '-' : ''), // 漲跌(+/-)
            v.priceChangePercent.replace(/(\+%)/g,''), // 漲跌幅
            v.turnoverK //週轉率
        ]
    })
    // console.log(yahoo_turnover)
    // if (yahoo_turnover.time.replace(/-/g, '') != date_now) {
    //   return []
    // }

    //允許跨域請求
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(yahoo_turnover3)
}

export default getDatas