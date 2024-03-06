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
    const v2 = something.find((v)=>{
        if(!/交易日/.test(v[1])){
        if(date==v[0].replace(/-/g,"")){
            return true
        }
            return false  
        }
    })
    if(v2){
        return false
    }
        return true