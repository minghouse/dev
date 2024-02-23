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
        const trueorfalse = [];
        for (const v of something){
            // if (!/交易日/.test(v[1])){
            //     trueorfalse.push(v[0].replace(/-/g,""))   
            // }

            if (/交易日/.test(v[1])){
                continue
            }
            trueorfalse.push(v[0].replace(/-/g,""))   
            
            
        }
        //從trueorfalse裡面找date在第幾個位置
        const indexOfdate = trueorfalse.indexOf(date)
        if (indexOfdate<=0){
            return true
        }
        
        return false

        //如果indexOfOrange <0 return true, >0 return false

        return data
        
    }  

    //看看out.is_work怎麼弄得~
    out.weekFriday = ()=>{
    
        const out = {}
        // 獲取當前日期
        var today = new Date();
        today.setHours(today.getHours() + 8)
        // 計算到上週五的天數（星期天為0，星期一為1，以此類推）
        var daysUntilLastFriday = (today.getDay() + 2) % 7;
    
        // 計算上週五的日期
        var lastFriday = new Date(today);
        lastFriday.setDate(today.getDate() - daysUntilLastFriday);
    
        // 將日期格式化為 "年-月-日"
        var formattedDate = lastFriday.toISOString().split('T')[0];
        out.formattedDate_1 = formattedDate.replace(/-/g,"")
    
        const secondfriday = new Date(formattedDate) //這個原本formattedDate是找的到的，如果要formattedDate_1，這個釋放在out裡面了
        secondfriday.setDate(secondfriday.getDate() - 7) //滑鼠放getDate上面，目前找不到這個方法
        out.formattedDate_2 = secondfriday.toISOString().split('T')[0].replace(/-/g,"");
        
        return out

    }

    /**
     * 每週五的收盤要比上週五的高的股票
     * @param {string} firstFD_set 本周五
     * @param {string} secondFD_set 上週五
     */
    //使用者可自行填入日期在 firstFD_set 和 secondFD_set 
    out.thisvslast = async(firstFD_set, secondFD_set)=>{ 
       //取得兩個周五的日期 使用out.weekFriday
        const twoFD = out.weekFriday() //滑鼠放weekFriday上面，如果是promise輸出的 不是，才需要await
               
        //>>>>>>>取得第一個周五的收盤價
        const firstFDself = await out.afterTrading(firstFD_set)
        const firstFDself_1 = firstFDself.tables[8].data

        //>>>>>>>取得第二個周五的收盤價
        const secondFDself = await out.afterTrading(secondFD_set)
        const secondFDself_1 = secondFDself.tables[8].data
        // 取得第一個周五的資料 設為v
        for(const v of firstFDself_1){    
            //v[8] 取得第二個周五的資料 設為v2
            for(const v2 of secondFDself_1){   
                // 第一個周五相同於第二個周五的證券代號 而且第一個周五收盤價大於第二個周五收盤價
                if(v[0] == v2[0] && v[8]>v2[8]){
                    //印出我們要的數值
                    console.log(`${v[0]} ${v[1]} ${v[8]} ${v2[8]}`)  
                }     
            }   
                
        }  



         //取得第一個周五的收盤價 使用 out.afterTrading
        const firstFD = await out.afterTrading(twoFD.formattedDate_1) //滑鼠放afterTrading上面，input需要什麼?date，對，那date在哪? 輸入個twoFD.看看?
        const firstFD_1 = firstFD.tables[8].data

        //取得第二個周五的收盤價 使用 out.afterTrading。
        const secondFD = await out.afterTrading(twoFD.formattedDate_2) //恭喜創造連結了wow
        const secondFD_1 = secondFD.tables[8].data
        
        //方案1：取得符合第一個周五比第二個周五收盤價高的股票 將結果放到xxx1
        //const higherFD = [firstFD_1,secondFD_1]
        //for(const v of higherFD){
        //   if(v[0]>v[1]){
        //    console.log (`${v[0]} ${v[1]}`)
        //   }
        //  }
        console.log("證券代號 證券名稱 本週收盤價 上週收盤價")
       
        // 取得第一個周五的資料 設為v
        for(const v of firstFD_1){    
            //v[8] 取得第二個周五的資料 設為v2
            for(const v2 of secondFD_1){   
                // 第一個周五相同於第二個周五的證券代號 而且第一個周五收盤價大於第二個周五收盤價
                if(v[0] == v2[0] && v[8]>v2[8]){
                    //印出我們要的數值
                    console.log(`${v[0]} ${v[1]} ${v[8]} ${v2[8]}`)  
                }     
            }   
                
        }  
        
           
        

       //方案2：將兩個周5的收盤價按照股票代號合併為新的Array 並且將Array放到變數xxx1
        
       //方案2：取得符合第一個周五比第二個周五收盤價高的股票 將結果放到xxx2

       //方案2：返回xxx2
       
    }
    

    return out
}

   

(async ()=>{
    try {
        
        // const thisvslast_data = stock().thisvslast()
        // console.log((`${v[0]} ${v[1]}`))

        // 顯示 指定日的資料
        await stock().thisvslast()
        await stock().thisvslast("20240222","20240215")
        const weekFriday_data = stock().weekFriday()
        console.log(weekFriday_data.formattedDate_1)
        console.log(weekFriday_data.formattedDate_2)
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