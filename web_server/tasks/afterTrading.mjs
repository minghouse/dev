
import dayjs from 'dayjs';


const get_after_trading = async (date_now) => {
    let result
    try {
        const date_now_twse = date_now.replace(/-/g, '')
        const response = await fetch(`https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=${date_now_twse}&type=ALLBUT0999`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const j = await response.json();
        if (!j.data9) {
            return []
        }

        result = j.data9
        //櫃買收盤價
        const date_now2 = encodeURIComponent(`${date_now_twse.substring(0, 4)-1911}/${date_now_twse.substring(4, 6)}/${date_now_twse.substring(6, 8)}`)
        var options = {
            'muteHttpExceptions': true,
            'timeout': 60 * 1000, // 设置超时时间为60秒
        };
        // const response2 = UrlFetchApp.fetch(`https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?l=zh-tw&d=${date_now2}&se=EW`, options);
        // const j1 = JSON.parse(response2.getContentText())
        const response2 = await fetch(`https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?l=zh-tw&d=${date_now2}&se=EW`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const j1 = await response2.json();
        
        if (!j1.tables[0].data || j1.tables[0].data.length == 0) {
            return []
        }
        const j2 = (j1.tables[0].data || []).map(v=> {
            const changeSign = v[3] > 0 ? '+' : v[3] < 0 ? '-' : '';
            const absoluteChange = Math.abs(parseFloat(v[3]));

            return [
                v[0], // 證券代號
                v[1], // 證券名稱
                v[7], // 成交股數
                v[9], // 成交筆數
                v[8], // 成交金額
                v[4], // 開盤價
                v[5], // 最高價
                v[6], // 最低價
                v[2], // 收盤價
                changeSign, // 漲跌(+/-)
                absoluteChange, // 漲跌價差
                v[10], // 最後揭示買價
                v[11], // 最後揭示買量
                v[12], // 最後揭示賣價
                v[13], // 最後揭示賣量
                "" // 本益比 (not present in the provided data)
            ]
        })

        const result_20 = result.concat(j2).map(v => {
            return [
                v[0], v[1], v[8], v[2]
            ]
        })
        return result_20

    } catch (err) {
        console.error(err)
        return []
    }

}

const afterTrading = async (req, res) => {
    
    const params = {
        date: req.query.date
    }
    res.setHeader('Access-Control-Allow-Origin', '*')

    const result = await get_after_trading(params.date)
    res.json(result)    
}

export default afterTrading