const yahoo_turnover = async() => {
    const response = await fetch(`https://tw.stock.yahoo.com/rank/turnover`);
    const result = (await response.text() || '').match(/"list":(.+),"listMeta":{"rankTime":"(.+)","rankTimeRange/)
    const data = JSON.parse(result[1] || '[]')
    const time = (result[2]||'').split('T')[0]
    return {
      data: data,
      time: time
    }
  }
  await yahoo_turnover()


  