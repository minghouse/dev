import mysql from 'mysql2/promise';

const ca = `-----BEGIN CERTIFICATE-----
MIICsjCCAZoCCQDe1QK5Efu90jANBgkqhkiG9w0BAQsFADAbMQswCQYDVQQGEwJB
VTEMMAoGA1UECAwDVklDMB4XDTE5MDkyOTEzMDI1OFoXDTI5MDgwNzEzMDI1OFow
GzELMAkGA1UEBhMCQVUxDDAKBgNVBAgMA1ZJQzCCASIwDQYJKoZIhvcNAQEBBQAD
ggEPADCCAQoCggEBAMKchojHs540/esAhMmvt5qJWpelWKG2gsKkKTeBc50sD2XR
66Yh7+d61bDYE44xjk0t4BK/6l5lYLNtX9q8Xxx7lmSkWVb96f0pVxV+3gvdPTH2
1qpRDS5lXm+o0WfG5sF/yaQJRn+UQPo/vsAtglfLm1QDn+Gwbq7ur+P877WYEZ/o
K1lDwsFBqBjHu9LkywVquSajtDP4jhFRLFIR3tgTAQ1D4BxaKHFetierfrFXCwUV
osnXoOArqHHE6UyUKWNUPAWFOeNEMELMU6lQnEkg0SoMBgIvjifGhT7BCa8+vP71
UO85nFMsADbTvJ6ziyasKnXnwbppB3RnEj1JkX0CAwEAATANBgkqhkiG9w0BAQsF
AAOCAQEAqCH1UN4wN6rMQw2DtdFb0XBKGb6TpHj+rGpsNimmAxYMhLb/09ua3Y33
OfRudl0Q5ZPZ0KQSQU/WoETyei44OLaSqfTPww6L53Mbf+qyla4e602b9/nWNe8n
y0n9nL2s3u6rhCvFXxZiu813blw1GPd7/B5mfu+QEA/UhkiASMA5msr7fNIMzke9
5rUYjMBzvSuy/vYbiTrXmKpAu5h4Z14qO8EDZy6gMzi0VhsUwur3I/ApOMt18BKx
rOagdnBFQ9XAde7wmkO7ODr3cj1yA7GmIMTWGwCaJh5F/RlsfCdT2jlWPXQ2T8Fn
PYufwpqtHrvN2qw7bU7SiV5UuX1I3A==
-----END CERTIFICATE-----
`

//資料庫連線資訊
const mysqlConfig = {
    host: 'mdev.mysql.database.azure.com',
    user: process.env.AZURE_MYSQL_USER,
    password: process.env.AZURE_MYSQL_PASSWORD,
    database: 'dev',
    ssl: {
        ca: ca,
        rejectUnauthorized: false
    }
};

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
        const connection = await mysql.createConnection(mysqlConfig);
        const [rows] = await connection.execute(`SELECT ${params.select} FROM ${params.from} ${params.where}`);
        connection.end();

        const result = rows
        //允許跨域請求
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.json(result)
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

    //檢查參數
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
        connection.end();

        const result = rows
        //允許跨域請求
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.json(result)
    } catch (e) {
        console.error(e)
        res.status(500).send('Internal Server Error')
    }

}

export default {
    select,
    insert
}