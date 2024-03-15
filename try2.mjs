
const money_news = async() =>{
    const response = await fetch(`https://money.udn.com/rank/ajax_newest/1001/5590/`);
    const result = await response.text()
    var regex = /<h3[^>]*>(.*?)<\/h3>[\s\S]*?<time>(.*?)<\/time>[\s\S]*?<a\s+href="(.*?)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<p[^>]*>(.*?)<\/p>/gs;

// 用正则表达式进行匹配
    var matches = [];
    var match;
    while ((match = regex.exec(result)) !== null) {
        var title = match[1].trim();
        var time = match[2].trim();
        var url = match[3].trim();
        var description = match[4].trim();
        matches.push({ title: title, time: time, url: url, description: description });
    }
    
    //這行錯了，沒有dataArray這個變數
    //console.log(dataArray); // 輸出解析後的陣列
    //因為上面的while裡面在解析出資料後是把資料放在matchs裡面
    // console.log(matches)
    // return matches
}
//執行方法，然後才會跑這個方法裡面的程式
const r = await money_news()