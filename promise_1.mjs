
const my_fetch = (url) => {
    return new Promise((resolve, reject) => {
        const callback = () => {
            if (url == 'https://xxx/6') {
                const result = [url, '這網址不想給妳抓']
                reject(result)
                return
            }
            const result = [url, 'ok']
            resolve(result)
        }
        setTimeout(callback, 1000)
    })
}

const urls = [
    'https://xxx/1',
    'https://xxx/2',
    'https://xxx/3',
    'https://xxx/4',
    'https://xxx/5',
    // 'https://xxx/6',
    'https://xxx/7',
    'https://xxx/8',
    'https://xxx/9',
    'https://xxx/10'
]

const promises = [];    
for (const v of urls){
    const content_promise = my_fetch(v)
    promises.push(content_promise)
}

try {
    const result = await Promise.all(promises)
    console.log(result)
} catch(error) {
    console.error('==跑到catch了==')
    console.error(error)
}

