// const { chromium } = require('playwright');
import { chromium } from 'playwright';

(async () => {
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
  await page.goto('https://www.ctee.com.tw/api/category/twmarket/1');

//顯示page的html
   console.log(await page.content());
  // 等待頁面加載完成
  // await page.waitForSelector('.news-title');  // 假設新聞標題有這個 class 名稱
  
  // // 提取標題資料
  // const titles = await page.evaluate(() => {
  //   const elements = document.querySelectorAll('.news-title');
  //   return Array.from(elements).map(el => el.textContent.trim());
  // });

  // console.log(titles);

  // 關閉瀏覽器
  await browser.close();
})();
