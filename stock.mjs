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
        // console.log(afterTrading_data)
       
        
        // console.log(afterTrading_data.tables[8].data)
        console.log("證券代號 證券名稱 收盤價")
        for (const v of afterTrading_data.tables[8].data){
           
            console.log(`${v[0]} ${v[1]} ${v[8]}`)
        }
        
        
    }
 
    out.order = async (date,count) => { 
   
        const afterTrading_data = await stock().afterTrading(date)
        // console.log(afterTrading_data)

        // const c=a.replace(/-/g, "")
        // console.log(c)
        // const d=a.replace(/[-:]/g, "")
        // console.log(d)
        
        //連結上述資料做排序
        const numbers = afterTrading_data.tables[8].data
        numbers.sort(function (a, b) {
            return b[2].replace(/,/g,"") - a[2].replace(/,/g,"");
        });
        // console.log(numbers);
          
        //連結上述資料取前10筆資料
        const ten = numbers.slice(0,count)
        // console.log(ten);
        
        console.log("證券代號 證券名稱 成交股數 收盤價")
        for (const v of ten){
            console.log(`${v[0]} ${v[1]} ${v[2]} ${v[8]}`)
        }

       
    }

    //這裡開始 董
    //註解記得哦~
    //
    /**
     * 收盤價>開盤價、收盤價=最高價
     */
    out.ml_red = async (date) => {
        const afterTrading_data = await stock().afterTrading(date)
        const compare = afterTrading_data.tables[8].data
        console.log("證券代號 證券名稱 成交股數 收盤價 開盤價 最高價 最低價")
        for(const v of compare ){
            //判斷符合條件即是我們想要的資料
            if (v[8]>v[5]&&v[8]==v[6]){   
                //會跑到這裡表示v是我們需要的資料，所以在這裡使用console.log，把需要的欄位的值印出來
                console.log(`${v[0]} ${v[1]} ${v[2]} ${v[8]} ${v[5]} ${v[6]} ${v[7]}`)
            }
        }
    
    }
    /**
     * 是不是有開盤
     */
    out.is_work = async (date) => {
        const open = await fetch(` https://www.twse.com.tw/rwd/zh/holidaySchedule/holidaySchedule?response=json`)
        const data = await open.json();

        //取出有日期的資料 
        //EX: [
        //       [ '2024-01-01', '中華民國開國紀念日', '依規定放假1日。' ],
        //       [ '2024-01-02', '國曆新年開始交易日', '國曆新年開始交易。' ],
        //    ]
        const something = data.data

        //將上面有日期的資料轉換為只有日期的陣列 EX: [ '20240101', '20240102', ... ]
        const trueorfalse = data.data.push(date);
        const indexOfdate = trueorfalse.indexOf(date);
        console.log("Fruits array:", fruits);
        console.log("Index of 'orange':", indexOfOrange)

        //如果indexOfOrange <0 return true, >0 return false

        return data
        
    }  

    return out
}
(async ()=>{
    try {
        // const afterTrading_data = await stock().afterTrading('20240205')
        // console.log(afterTrading_data)

        //收盤價
        // console.log(await stock().price('20240205'))
        //目前這樣會印出1，所以回到46行先來做資料整理
        // const ml_red = await stock().ml_red("20240205")

        // const order = await stock().order('20240205',20)
        // console.log(order)

        //20240215是否有開盤
        const is_work = await stock().is_work('20240215')
        console.log(is_work)

        //20240213是否有開盤
        const is_work_2 = await stock().is_work('20240213')
        console.log(is_work_2)
        
        //測試計算EPS
        const eps = stock().EPS(1,2)
        console.log(eps)

        //測試計算殖利率
        console.log(stock().Yield(1,2))
    } catch (error) {
       console.log(error)
    }
})()