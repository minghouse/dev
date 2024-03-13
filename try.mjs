
const tpex_stock = async(date) =>{
    const response = await fetch(`https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?date=${date}&type=24&response=json`);
    const data = await response.json();
    return data
}
 const date = "103/03/12"
 const tpex = await tpex_stock(date)

 console.log("股票代號  名稱  股價   漲跌   成交金額")
 
 for (const v of tpex.aaData){
 
 console.log(`${v[0]} ${v[1]} ${v[2]} ${v[3]} ${v[8]}`)
 }