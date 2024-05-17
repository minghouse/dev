import express from 'express';
import google_sheet_load from './tasks/google/sheet_load.mjs';


/**
 * http server
 */
const app = express();

app.get('/', (req, res) => {
    res.send('Hello World')
});

app.get('/google/sheet_load', (req, res) => {
    google_sheet_load(req, res)
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
});
