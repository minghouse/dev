const yahoo_turnover = async() => {
    const response = await fetch(`https://tw.stock.yahoo.com/rank/turnover`);
    const result = await response.text()
    const result1 = result|| ''
    const result2 = result1.match(/"list":(.+),"listMeta":{"rankTime":"(.+)","rankTimeRange/)
    const data = JSON.parse(result2[1] || '[]')
    const time = (result2[2]||'').split('T')[0] 
    return {
      data: data,
      time: time
    }
    
  }
  const r = await yahoo_turnover()
   
  console.log("股票代號  名稱  股價   漲跌   成交金額")
  for(const v of r.data){
     const million = v.turnoverK/100000
     console.log(`${v.symbol} ${v.symbolName} ${v.price} ${v.change} ${million}`)
  }
  // console.log(r) 
  

  