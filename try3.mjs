const moneylink_news = async() =>{
    let page_i = 0
    var matches2 = []
   
    while (1) {
        page_i++
        const response = await fetch(`https://ww2.money-link.com.tw/RealtimeNews/Index.aspx?NType=1002&PGNum=${page_i}`)
        const result = await response.text()
        const regex = /<div class="NewsTitle">\s*<a\s+href="([^"]+)"[^>]*>\s*<h3>(.*?)<\/h3>\s*<\/a>\s*<div class="NewsContent">(.*?)<\/div>\s*<div class="NewsDate">(.*?)<\/div>/gs;
        const matches = result.matchAll(regex);
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero indexed
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}${month}${day}`;
        
        for (const match of matches) {
            const link = match[1];
            const title = match[2];
            const description = match[3].trim();
            const newsDate = match[4].trim(); //這個newsDate會抓到的不單純只是日期，應該要抓到的是這樣的格式:  2024/03/23 16:40
            //<div class="NewsDate">時報新聞   2024/03/23   17:01</div>
            const matchDate = newsDate.match(/\d{4}\/\d{2}\/\d{2}/); //這行沒問題了
            if (matchDate && matchDate.length > 0) { //這我想不到會有抓不到日期的情況，只好假設可能發生?
                const newsDate = matchDate[0].replace(/\//g, ""); // 格式化新闻日期为 YYYYMMDD
                if (newsDate === formattedDate) { //formattedDate在哪裡定義???
                    //console.log("标题:", title);
                    //console.log("链接:", link);
                    //console.log("描述:", description);
                    //console.log("时间:", newsDate); 
                   //console.log();
                   matches2.push({ title: title, newsDate: newsDate, link : link, description: description });
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
    return matches2
}  

const r = await moneylink_news()
//console.log(r)
const ten = r.slice(0,10)
const content = async(v) =>{
    const response = await fetch(v.link);
    const result = await response.text()
    const contentRegex = /<div class="Content" id="NewsMainContent">(.*?)<\/div>/s;
    const contentMatch = result.match(contentRegex);
    let content2 = contentMatch ? contentMatch[1].trim() : "未找到内容";

    // 去除内容中的 HTML 标签
    content2 = content2.replace(/<[^>]*>/g, '');

    return content2;
};
const promises = [];
for (const news of ten) {
    promises.push(content(news).catch(error => {
        console.error("Error in content() promise:", error);
        return error; // 或者其他适当的错误处理方式   
    }));
    
}

