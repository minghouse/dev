import express from 'express';
import google_sheet_search from './tasks/google/sheet_search.mjs';
import google_sheet_insert from './tasks/google/sheet_insert.mjs';

import bodyParser from 'body-parser';

/**
 * http server
 */
const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello World')
});

app.get('/google/sheet_search', (req, res) => {
    google_sheet_search(req, res)
});
app.post('/google/sheet_insert', (req, res) => {
    google_sheet_insert(req, res)
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
});
