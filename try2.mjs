
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
    return matches
}
//執行方法，然後才會跑這個方法裡面的程式
const r = await money_news()
//console.log(r)
const ten = r.slice(0,10)
//console.log(ten)

//----------------------------
//顯示執行時間
const timestamp_start = new Date().getTime();
//----------------------------

//console.log(`${v.title}  ${v.time} ${v.url} ${v.description}`)
const content = async(v) =>{
    const response = await fetch(v.url);
    const result = await response.text()
    const contentRegex = /<section class="article-body__editor" id ="article_body">(.*?)<\/section>/s;
    const match = result.match(contentRegex)
    if (match && match[1]) {
        const newsContent = match[1].trim(); // 第一個捕獲組對應到內容
        // console.log(newsContent); // 或者您可以對 newsContent 進行進一步的處理
        //---------------------------------
        const contentRegex2 = /<p>\s*(.*?)\s*<\/p>/gs;
        const matches = [];
        let match2;
        while ((match2 = contentRegex2.exec(newsContent)) !== null) {
            const content2 = match2[1].trim();
            matches.push(content2);
        }
        //matches = ['第一句','第二句',...]
        //matches2 = '第一句\n第二句\n....'
        const matches2 = matches.join("\n")
        // console.log(matches2)
        console.log(`訪問網址成功: ${v.url}`)
        //----------------.-----------------
    } else {
        console.log("未找到新聞內容");
    }
}
// const promises = [];    
// for (const v of ten){
//     promises.push(content(v));
// }
// try {
//     await Promise.all(promises)
//     const timestamp_end = new Date().getTime();
//     console.log((timestamp_end - timestamp_start) / 1000);
// } catch(error) {
//     console.error("Error fetching news content:", error); 
// }

//Promise.all(promises)
    //.then(() => {
        // 所有新闻内容获取完成后执行时间计算
       // const timestamp_end = new Date().getTime();
       // console.log((timestamp_end - timestamp_start) / 1000);
    //})
    //.catch(error => {
       // console.error("Error fetching news content:", error);
   // });
//promise.all()

//中間會有錯誤的模擬
const promises = [];    
for (const v of ten){
    if (promises.length === 5) {
        const p = new Promise((resolve, reject) => {
            setTimeout(() => {
                reject('訪問網址無效')
            }, 1000);
        })
        p.catch(error => {
            return error
        }) 
        promises.push(p);
        continue
    }
    // 第二個錯誤是這裡，裡面是reject()返回錯誤，那Promise之後應該也要連結.catch(error => { ... }) 這樣的寫法
    //這寫法的目的是捕獲Promise的執行錯誤，然後通過{}裡面寫的return返回我們指定的資料內容
    promises.push(content(v).catch(error => {
        console.error("Error in content() promise:", error);
        return null; // 或者其他适当的错误处理方式   
    }));
    
}

try {
    await Promise.all(promises)
    const timestamp_end = new Date().getTime();
    console.log((timestamp_end - timestamp_start) / 1000);
    results.forEach((result, index) => {
        if (result === reject) {
            console.error(`Error in content() for element ${ten[index]}`);
        }
    });
} catch(error) {
    console.error("Error fetching news content:", error); 
}


//----------------------------
//顯示執行時間
//const timestamp_end = new Date().getTime();
//console.log((timestamp_end-timestamp_start)/1000);
//----------------------------
