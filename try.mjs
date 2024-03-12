const tpex_stock = async() =>{
    const response = await fetch(`https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?l=zh-tw&d=103/03/11&se=EW`);
    const data = await response.json();
    return data
}
 const tpex = await tpex_stock()
 console.log("股票代號  名稱  股價   漲跌   成交金額")
 for (const v of tpex.data){

 console.log(`${v[0]} ${v[1]} ${v[2]} ${v[3]} ${v[8]}`)
 }