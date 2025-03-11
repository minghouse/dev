import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import google_sheet_search from './tasks/google/sheet_search.mjs';
import google_sheet_insert from './tasks/google/sheet_insert.mjs';
import getDatas from './tasks/google/getDatas.mjs';
import getDatas2 from './tasks/google/getDatas2.mjs';
import rank_turnover from './tasks/google/rank_turnover.mjs';
import rank_changeup from './tasks/google/rank_changeup.mjs';
import turnover_rate from './tasks/google/turnover_rate.mjs';
import azure_mysql from './tasks/azure_mysql.mjs';
import gcp_mysql from './tasks/gcp_mysql.mjs';
import afterTrading from './tasks/afterTrading.mjs';
//瀏覽器解析body的套件
import browser from './tasks/browser.mjs';

import bodyParser from 'body-parser';
import compression from 'compression'; // Import the compression module

const __filename = fileURLToPath(import.meta.url); // 獲取檔案的完整路徑
const __dirname = path.dirname(__filename);       // 獲取檔案所在的目錄
const sslOptions = {
    key: fs.readFileSync(`${__dirname}/privatekey.pem`),
    cert: fs.readFileSync(`${__dirname}/certificate.pem`),
    passphrase: "54321633",
    //allowHTTP1: true
};

/**
 * http server
 */
const app = express();
app.use(cors())
app.use(bodyParser.json());
app.use(compression()); // Use compression middleware for gzip compression

//client開頭的路由就顯示client裡面對應路由的檔案資料
// app.use('/client', express.static(path.join(__dirname, 'client')));

app.get('/', (req, res) => {
    res.send('Hello World')
});

app.get('/google/sheet_search', (req, res) => {
    google_sheet_search(req, res)
});
app.post('/google/sheet_insert', (req, res) => {
    google_sheet_insert(req, res)
});
app.get('/google/sheet_insert', (req, res) => {
    google_sheet_insert(req, res)
});
app.get('/google/getDatas', (req, res) => {
    getDatas(req, res)
});
app.get('/google/getDatas2', (req, res) => {
    getDatas2(req, res)
});
app.get('/google/rank_turnover', (req, res) => {
    rank_turnover(req, res)
});
app.get('/google/rank_changeup', (req, res) => {
    rank_changeup(req, res)
});
app.get('/google/turnover_rate', (req, res) => {
    turnover_rate(req, res)
});
app.post('/azure_mysql/select', (req, res) => {
    azure_mysql.select(req, res)
});
app.post('/azure_mysql/insert', (req, res) => {
    azure_mysql.insert(req, res)
});
app.post('/gcp_mysql/select', (req, res) => {
    console.log(`/gcp_mysql/select, IP: ${req.ip}`)
    gcp_mysql.select(req, res)
});
app.post('/gcp_mysql/insert', (req, res) => {
    //印出訪問的IP
    console.log(`/gcp_mysql/insert, IP: ${req.ip}`)
    gcp_mysql.insert(req, res)
});
app.get('/afterTrading', (req, res) => {
    afterTrading(req, res)
});
app.get('/browser', (req, res) => {
    browser(req, res)
});


const port = process.env.PORT || 3000;

if (port == '8080') {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`)
    });
} else {
    // 啟動 HTTPS 伺服器
    https.createServer(sslOptions, app).listen(port, () => {
        console.log(`Server is running on port ${port}`)
    });
}