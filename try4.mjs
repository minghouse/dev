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
        const [, badge, url, title, summary, time] = match;
        // 將抓取到的新聞信息存入數組中
        newsList.push({
            badge,  // 標籤（如系統、新聞）
            url,    // 新聞鏈接
            title,  // 新聞標題
            summary: summary.trim(),  // 新聞摘要
            time    // 發佈時間
        });
    }
    
    // 將抓取到的新聞打印到控制台上
    //console.log(newsList);
}
    
// 調用函數
const r = await iwplay();
const content = async(news) =>{
    const response = await fetch(r.url);
    const result = await response.text()
    
}