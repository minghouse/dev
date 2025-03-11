import { chromium } from 'playwright';

const browser = async (req, res) => {
    const url = req.query.url
    const auth = req.query.auth
    if (auth != process.env.BROWSER_AUTH) {
        res.end('auth error')
        return
    }
        
    // 启动浏览器
    // const browser = await chromium.launch({ headless: false });
    const browser = await chromium.launch();

    // 创建一个新的浏览器上下文并设置 User-Agent
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    // 在这个上下文中创建一个新的页面
    const page = await context.newPage();

    // 訪問目標網站
    await page.goto(url);

    //取得body的內容
    // const html = await page.content()
    const body = await page.innerText('body')
    // console.log(body)

    // 關閉瀏覽器
    await browser.close();

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(body)

}

export default browser