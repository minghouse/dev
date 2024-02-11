/**
 * EPS & 殖利率
 * @returns 
 */
const stock = () => {
    const out = {}
    
    /**
     * EPS
     * @param {number} a 股本
     * @param {number} b 稅後淨利
     */
    out.EPS = (a, b)=>{
        const c = Math.round( b /(a/10)*100 ) /100
        return c
    }
    
    /**
     * 殖利率
     * @param {number} c 現金股利
     * @param {number} d 每股股價
     */
    out.Yield = (c,d)=>{
        const e = Math.round( c /d*100 ) /100
        return e
    }
    
    return out
    /**
     * 半導體類股收盤價資料
     * @param {date} 日期
     * @returns 
     */
    const afterTrading = async (date) => {
        const response = await fetch(`https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${date}&type=24&response=json`);
        const data = await response.json();
        return data
    }
    (async ()=>{
        try {
            const afterTrading_data = await stock(). afterTrading('20240205')
            console.log(afterTrading_data)
        } catch (error) {
        console.log(error)
        }
    })()
}

//測試計算EPS
console.log(stock().EPS(76994000000,-16743870000))

//測試計算殖利率
console.log(stock().Yield(1,2))

console.log(stock().afterTrading_data)
stock().