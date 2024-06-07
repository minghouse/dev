import express from 'express';
import cors from 'cors';
import google_sheet_search from './tasks/google/sheet_search.mjs';
import google_sheet_insert from './tasks/google/sheet_insert.mjs';
import getDatas from './tasks/google/getDatas.mjs';
import getDatas2 from './tasks/google/getDatas2.mjs';
import rank_turnover from './tasks/google/rank_turnover.mjs';
import rank_changeup from './tasks/google/rank_changeup.mjs';
import azure_mysql from './tasks/azure_mysql.mjs';

import bodyParser from 'body-parser';
import compression from 'compression'; // Import the compression module

/**
 * http server
 */
const app = express();
app.use(cors())
app.use(bodyParser.json());
app.use(compression()); // Use compression middleware for gzip compression

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
app.post('/azure_mysql/select', (req, res) => {
    azure_mysql.select(req, res)
});
app.post('/azure_mysql/insert', (req, res) => {
    azure_mysql.insert(req, res)
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
});
