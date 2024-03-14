
const tpex_stock = async(date) =>{
    //從這邊下手轉換date,把輸入的20240313轉成103/03/13
    const date2 = formatDate(date) 
    console.log(date2)
    const response = await fetch(`https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?l=zh-tw&d=${encodeURIComponent(date2)}&se=EW`);
    const data = await response.json();
    return data
}
const formatDate = (date) => {
    const year = date.substring(0, 4);
    const month = date.substring(4, 6);
    const day = date.substring(6, 8);

    // 將年份轉換為兩位數
    const shortYear = String(Number(year) - 1911);

    return `${shortYear}/${month}/${day}`;
}


 const date = '20240313'
 
 const tpex = await tpex_stock(date)

 console.log("股票代號  名稱  股價   漲跌   成交金額  漲跌型態  漲跌停 ")
 
 for (const v of tpex.aaData){
    
 
  const symbol = ()=>{
      if(v[3]>0){
     return "+"
     } else if (v[3] < 0) {
     return '-';
     } else {
     return '';
     }
   }
   const symbol2 = ()=>{
    if(v[3]>=1){
   return "+"
   } else if (v[3] < 1) {
   return '-';
   } else {
   return '';
   }
 }
  console.log(`${v[0]} ${v[1]} ${v[2]} ${v[3]} ${v[8]} ${symbol()} `)
 }
 