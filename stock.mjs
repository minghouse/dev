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

    /**
     * 半導體類股收盤價資料
     * @param {date} 日期 
     * @returns 
     */
    out.afterTrading = async (date) => {
        const response = await fetch(`https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${date}&type=24&response=json`);
        const data = await response.json();
        return data
    }

    /**
     * 收盤價  
     * @param {date} 日期 
     * @returns 
     */
    out.price = async (date) => { 
   
        const afterTrading_data = await stock().afterTrading(date)
        console.log(afterTrading_data)
       
        
        console.log(afterTrading_data.tables[8].data)
        console.log("證券代號 證券名稱 收盤價")
        for (const v of afterTrading_data.tables[8].data){
           
            console.log(`${v[0]} ${v[1]} ${v[8]}`)
        }
        
        
    }

    return out
}
(async ()=>{
    try {
        // const afterTrading_data = await stock().afterTrading('20240205')
        // console.log(afterTrading_data)

        //收盤價
        console.log(await stock().price('20240205'))
        //目前這樣會印出1，所以回到46行先來做資料整理

        
        
        //測試計算EPS
        const eps = stock().EPS(1,2)
        console.log(eps)

        //測試計算殖利率
        console.log(stock().Yield(1,2))
    } catch (error) {
       console.log(error)
    }
})()