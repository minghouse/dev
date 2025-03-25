import pool from '../modules/mysql.mjs';

/**
 * @example
 * //select {*} from {*} {*}
 * const form_data = {
 *     select: '*',
 *     from: 'news',
 *     where: 'where id = 1'
 * }
 * const res = await fetch('/azure_mysql/select', {
 *     method: 'POST',
 *     headers: {
 *         'Content-Type': 'application/json'
 *     },
 *     body: JSON.stringify(form_data)
 * })
 * const data = await res.json()
 * console.log(data)
 */
const select = async (req, res) => { 
    // 配置參數
    //select {*} from {*} {*}
    const params = {
        select: req.body.select,
        from: req.body.from,
        where: req.body.where
    }

    res.setHeader('Access-Control-Allow-Origin', '*')

    //檢查參數
    const auth = req.body.auth
    if (auth != process.env.BROWSER_AUTH) {
        res.end('auth error')
        return
    }

    //檢查參數
    if (!params.select || !params.from) {
        res.status(400).send('select, from is required')
        return
    }
    //參數裡面如果有;就取代
    for (const key in params) {
        params[key] = params[key].replace(/;/g, '')
    }

    try {
        //連線資料庫
        const connection = await pool.getConnection();
        const [rows] = await connection.execute(`SELECT ${params.select} FROM ${params.from} ${params.where}`);
        // connection.end();
        connection.release();
        const result = rows
        //允許跨域請求
        res.end(result)
    } catch (e) {
        console.error(e)
        res.status(500).send('Internal Server Error')
    }
    
}

/**
 * @example
 * //insert into {*} values {*}
 * const form_data = {
 *     into: 'news (source, category, create_date, create_time, url, title, short_content, content)',
 *     values: '("中時新聞網", "財經", "2021-09-29", "12:00:00", "https://www.chinatimes.com/realtimenews/20210929000001-260410", "中時新聞網", "中時新聞網", "中時新聞網")'
 * }
 * const res = await fetch('/azure_mysql/insert', {
 *     method: 'POST',
 *     headers: {
 *         'Content-Type': 'application/json'
 *     },
 *     body: JSON.stringify(form_data)
 * })
 * const data = await res.json()
 * console.log(data)
 */
const insert = async (req, res) => { 
    // 配置參數
    //insert into {*} values {*}
    const params = {
        into: req.body.into,
        values: req.body.values
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    
    //檢查參數
    const auth = req.body.auth
    if (auth != process.env.BROWSER_AUTH) {
        res.end('auth error')
        return
    }
    if (!params.into || !params.values) {
        res.status(400).send('into, values is required')
        return
    }
    //參數裡面如果有;就取代
    for (const key in params) {
        params[key] = params[key].replace(/;/g, '')
    }

    try {
        //連線資料庫
        const connection = await mysql.createConnection(mysqlConfig);
        const [rows] = await connection.execute(`INSERT IGNORE INTO ${params.into} VALUES ${params.values}`);
        // connection.end();
        connection.release();

        const result = rows
        //允許跨域請求
        res.end(result)
    } catch (e) {
        console.error(e)
        res.status(500).send('Internal Server Error')
    }

}

export default {
    select,
    insert
}