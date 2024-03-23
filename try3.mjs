const moneylink_news = async() =>{
    let page_i = 0
    while (1) {
        page_i++
        const response = await fetch(`https://ww2.money-link.com.tw/RealtimeNews/Index.aspx?NType=1002&PGNum=${page_i}`)
        const result = await response.text()
        const regex = /<div class="NewsTitle">\s*<a\s+href="([^"]+)"[^>]*>\s*<h3>(.*?)<\/h3>\s*<\/a>\s*<div class="NewsContent">(.*?)<\/div>\s*<div class="NewsDate">([\d/]+)\s*(?:\d{2}:\d{2})?<\/div>/gs;
        //<div class="NewsTitle">\s*<a\s+href="([^"]+)"[^>]*>\s*<h3>(.*?)<\/h3>\s*<\/a>\s*<div class="NewsContent">(.*?)<\/div>\s*<div class="NewsDate">(.*?)<\/div>/gs;
        const matches = result.matchAll(regex);
        for (const match of matches) {
            const link = match[1];
            const title = match[2];
            const description = match[3].trim();
            const newsDate = match[4].trim(); //這個newsDate會抓到的不單純只是日期，應該要抓到的是這樣的格式:  2024/03/23 16:40
            const matchDate = newsDate.match(/\d{4}\/\d{2}\/\d{2}/); //這行沒問題了
            if (matchDate && matchDate.length > 0) { //這我想不到會有抓不到日期的情況，只好假設可能發生?
                const newsDate = matchDate[0].replace(/\//g, ""); // 格式化新闻日期为 YYYYMMDD
                if (newsDate === formattedDate) { //formattedDate在哪裡定義???
                    console.log("标题:", title);
                    console.log("链接:", link);
                    console.log("描述:", description);
                    console.log("时间:", newsDate); 
                    console.log();
                } else {
                    // 如果新闻日期不是当天日期，则结束循环
                    break;
                }
            }
        }
        // 如果没有更多新闻，则结束循环
        if (!result.includes("<a href=\"?NType=1002&PGNum=" + (page_i + 1))) {
            break;
        }
    } 
}  
await moneylink_news()