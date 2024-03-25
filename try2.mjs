
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
        //這裡要調整的原因是，參考了promise_2.mjs，處理完資料就return的方式返回，因為直接印出來會干擾結果判讀，導致不仔細看的話會以為正常
        // console.log(`訪問網址成功: ${v.url}`)
        // return `訪問網址成功: ${v.url}`
        return matches2
        //----------------.-----------------
    } else {
        // console.log("未找到新聞內容");
        return "未找到新聞內容"
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
        //我在猜我之前寫在這裡的p.catch()可能不能寫成兩行
        const p = (new Promise((resolve, reject) => {
            setTimeout(() => {
                reject('訪問網址無效')
            }, 1000);
        })).catch(error => {
            return error
        }) 

        //我原本是把這裡寫成兩行，這次再來寫一次，看看會不會有問題 
        //這樣就確定問題了，這裡不能寫p.catch()，必須像上面那樣，才能正確地讓Promise()捕獲到catch()錯誤
        // const p = new Promise((resolve, reject) => {
        //     setTimeout(() => {
        //         reject('訪問網址無效')
        //     }, 1000);
        // })
        // p.catch(error => {
        //     return error
        // }) 
        promises.push(p);
        continue
    }
    
    promises.push(content(v).catch(error => {
        console.error("Error in content() promise:", error);
        return error; // 或者其他适当的错误处理方式   
    }));
    
}

try {
    // 因為前面的content()使用了return返回資料，所以這邊可以const xxx來接
    //剛剛這裡寫r無法連結，因為後面是results.forEach()
    const results = await Promise.all(promises)
    const timestamp_end = new Date().getTime();
    console.log((timestamp_end - timestamp_start) / 1000);
    //看起來執行結果正確了，然後可以先印results出來看看長怎樣
    //console.log(results)
    //現在看起來results是正確的，第六筆正好顯示訪問網址無效，所以下面這個forEach()只要顯示出來第幾筆，顯示了什麼錯誤就好
    //results.forEach((result, index) => {
        // if (result === '訪問網址無效') {
        //     console.error(`第${Number(index)+1}筆有問題，返回的錯誤是:${result}`);
        // }
    //     //我選擇使用.test()來做這件事
     //    if (/無效/.test(result)) {
    //         //當符合這個if條件，我就印出來結果
         //    console.log(`第${Number(index)+1}筆有問題，返回的錯誤是:${result}`)
        // }
     //});
    //上面這個forEach等於下面這樣，通常使用下面這樣寫法比較容易維護，上面那個forEach()有雷
    for (let index in results) {
        const result = results[index]
        if (/無效/.test(result)) {
            //當符合這個if條件，我就印出來結果
            console.log(`第${Number(index)+1}筆有問題，返回的錯誤是:${result}`)
        } else {
            console.log(result)
        }
    }
} catch(error) {
    //SEE,這行完全沒有執行到了，然後問題就找到了，我們回到96行來驗證看看
    console.error("Error fetching news content:", error); 
}


//----------------------------
//顯示執行時間
//const timestamp_end = new Date().getTime();
//console.log((timestamp_end-timestamp_start)/1000);
//----------------------------
