/**
 * 日期函數教學
 */

//1. 初始化
const birthday = ()=>{
    const date = new Date()
    date.setHours(date.getHours() + 8)
    const year = date.getFullYear()
    const month = date.getMonth() //滑鼠放到padStart上面看看 any表示無法顯示說明通常表示沒有這個方法
    //只有字串，才有padStart()可以使用，date.getXXX()都是返回數字，所以會有一個轉換字串的方法
    const month2 = month+1
    const month3 = String(month2).padStart(2, "0")
    const ddate = date.getDate()
    const ddate2 = String(ddate).padStart(2, "0") //這個key命名的很棒欸
    const hour = date.getHours()
    const hour2 = String(hour).padStart(2, "0")
    const minute = date.getMinutes()
    const minute2 = String(minute).padStart(2, "0")
    const second = date.getSeconds()
    const second2 = String(second).padStart(2, "0")
    //需要提示嗎yes 提示給了
    return `${year}-${month3}-${ddate2}  ${hour2}:${minute2}:${second2}`
}
console.log(birthday()) //console.log要把value印出來，而我們預期birthday()應該返回 年-月-日 時:分:秒

const weekFriday = ()=>{
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
    out.formattedDate_1 = formattedDate

    const secondfriday = new Date(formattedDate) //這個原本formattedDate是找的到的，如果要formattedDate_1，這個釋放在out裡面了
    secondfriday.setDate(secondfriday.getDate() - 7) //滑鼠放getDate上面，目前找不到這個方法
    out.formattedDate_2 = secondfriday.toISOString().split('T')[0];
    
    return out
}
    console.log(weekFriday().formattedDate_1);
    console.log(weekFriday().formattedDate_2); //妳可以拆兩行寫的 不用擠在console.log裡面XD

    const weekFriday_data = weekFriday()
    console.log(weekFriday_data.formattedDate_1)
    console.log(weekFriday_data.formattedDate_2)