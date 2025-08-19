import { chromium } from 'playwright';

async function main() {
    try {
        const [, , url, selector = 'body', auth, BROWSER_AUTH] = process.argv;

        if (auth !== BROWSER_AUTH) {
            console.error('auth error');
            process.exit(1);
        }

        const browserInstance = await chromium.launch({
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                // '--single-process',
                '--disable-gpu',
                '--js-flags=--max-old-space-size=256',
            ],
        });

        const context = await browserInstance.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            viewport: {
                width: 1280,
                height: 800
            },
            extraHTTPHeaders: {
                'Accept-Encoding': 'gzip, deflate, br',
                Referer: url,
                DNT: '1',
            },
        });

        const page = await context.newPage();

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('External timeout')), 35000)
        );

        await Promise.race([
            page.goto(url, {
                timeout: 30000,
                waitUntil: 'domcontentloaded',
            }),
            timeoutPromise,
        ]);

        const body = await page.evaluate((selector) => {
            try {
                const element = document.querySelector(selector);
                // if (element) return element.innerText;
                if (element) return element.innerHTML
                const body = document.querySelector('body');
                return body ? body.innerHTML : '';
            } catch {
                return '[EVALUATE ERROR]';
            }
        }, selector);

        await browserInstance.close();

        // 輸出結果到 stdout
        console.log(body);
        process.exit(0);
    } catch (err) {
        console.error('[ERROR]', err.message || err);
        process.exit(1);
    }
}

main();