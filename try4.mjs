const iwplay = async() =>{
    const response = await fetch(`https://www.iwplay.com.tw/news/list_1.html`);
    const result = await response.text()
    // 正則表達式模式，用於匹配新聞內容
    const pattern = /<div class="latestnews-single">.*?<h3 class="latestnews-title">.*?<span class="newsdetails-badge newsdetails-(.*?)">.*?<a href="(.*?)" class="latestnews-titleurl" title="(.*?)" target="_self">.*?<\/a>.*?<\/h3>.*?<p class="ellipsis">(.*?)<\/p>.*?<span class="newstime">(.*?)<\/span>.*?<a href=".*?" class="morebtn latestnews-titleurl".*?>MORE<\/a>.*?<\/div>/gs;
    
    // 數組用於存儲抓取到的新聞
    const newsList = [];
    
    // 在 HTML 內容中查找所有新聞匹配項
    let match;
    while ((match = pattern.exec(result)) !== null) {
        var badge = match[1].trim();
        var url = `https://www.iwplay.com.tw/news/${match[2]}`;
        var title = match[3].trim();
        var summary = match[4].trim();
        newsList.push({ title: title, badge: badge, url: url, summary: summary });
        // const [, badge, url, title, summary, time] = match;
        // // 將抓取到的新聞信息存入數組中
        // newsList.push({
        //     badge,  // 標籤（如系統、新聞）
        //     url,    // 新聞鏈接
        //     title,  // 新聞標題
        //     summary: summary.trim(),  // 新聞摘要
        //     time    // 發佈時間
        // });
    }
    
    // 將抓取到的新聞打印到控制台上
    //console.log(newsList);
    return newsList
}
    
// 調用函數
const r = await iwplay()
//console.log(r)
const content = async(r) =>{
    const response = await fetch(r.url);
    const result = await response.text()
    const regex = /<p[^>]*>(.*?)<\/p>/g;
    let match;
    let textContent = '';

    while ((match = regex.exec(result)) !== null) {
        textContent += match[1].replace(/<\/?[^>]+(>|$)/g, "") + '\n'; // 去除 HTML 標籤
    }

    return textContent.trim();
}
content()