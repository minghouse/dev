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
            const link = `https://ww2.money-link.com.tw/RealtimeNews/${match[1]}`;
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
// console.log(r)
const ten = r.slice(0,10)
//console.log(ten)
const content = async(news) =>{
    const response = await fetch(news.link);
    const result = await response.text()
    const result2 = result.split('<div class="Content" id="NewsMainContent">')
    if (result2.length < 2) {
        // 如果分割后的数组长度小于2，则表示未找到对应的div，返回空字符串或者进行其他错误处理
        return '';
    }
    
    // 取第二部分（索引为1），即目标内容部分
    const targetPart = result2[1];
    
    // 使用split将目标内容部分分割，以获取紧跟在该div后面的部分（例如，可能存在</div>等内容）
    const contentParts = targetPart.split('<div class="tags">');
    
    // 取第一部分，即目标内容
    const content = contentParts[0];
    console.log(content)
    return content.trim(); // 可以选择去除首尾的空白字符
}
    //console.log(result)
    //const contentRegex = /<div class="Content" id="NewsMainContent">(.*?)<\/div id = "oneadIRDFPTag">/gs;
    //const contentRegex = /<div class="Content" id="NewsMainContent">((?:<div[^>]*>[\s\S]*?<\/div>)*[\s\S]*?)<\/div>/gs;
    //const contentMatch = result.match(contentRegex);
    //console.log(contentMatch[1])
    //let content;
    // if (contentMatch && contentMatch[1]) {
    //     content = contentMatch[1].trim();
    // } else {
    //     content = "未找到内容";
    // }

    // // 去除内容中的 HTML 标签
    // content = content.replace(/<[^>]*>/g, '');

    // return content;


const promises = [];
for (const news of ten) {
    promises.push(content(news).catch(error => {
        console.error("Error in content() promise:", error);
        return error; // 或者其他适当的错误处理方式   
    }));
    
}
try {
    
    const results = await Promise.all(promises)
     
    for (let index in results) {
        const result = results[index]
        if (/無效/.test(result)) {
            
           // console.log(`第${Number(index)+1}筆有問題，返回的錯誤是:${result}`)
        } else {
            //console.log(result)
        }
    }
} catch(error) {
   
   // console.error("Error fetching news content:", error); 
}
