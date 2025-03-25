import common from './modules.mjs';
/**
 * @example
 * const res = await fetch('/google/sheet_insert', {
 *    method: 'POST',
 *    headers: {
 *        'Content-Type': 'application/json',
 *    },
 *    body: JSON.stringify({
 *        range: '工作表8',
 *        datas: [
 *            ['0', '0', '0'],
 *            ['6', '7', '8'],
 *        ],
 *    }),
 * })
 * const data = await res.json()
 * console.log(data)
 */
const sheet_insert = async (req, res) => { 
    // 配置參數
 
    const SPREADSHEET_ID = '1DYU3NZmGLrj0G2ruQOyLxhOqLgBkSQ_mQ4-KPlYG-yE';
    // const RANGE = 'AI整理-中國時報!A2:F5';
    const RANGE = req.body.range || req.query.range 
    const datas = req.body.datas || JSON.parse(req.query.datas)

    // 訪問 Google Sheets API
    async function accessGoogleSheets() {
        try {
            const accessToken = await common.getAccessToken();
            // console.log('Access Token:', accessToken);

            //寫入 google sheet, valueInputOption: RAW (原始資料) or USER_ENTERED (使用者輸入)
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}:append?valueInputOption=RAW`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({
                    // range: RANGE,
                    majorDimension: 'ROWS',
                    values: datas
                })
            });

            const sheetData = await response.json();
            // console.log('Sheet Data:', sheetData);
            return sheetData
            // document.getElementById('content').innerText = JSON.stringify(sheetData, null, 2);
        } catch (error) {
            console.error('Error accessing Google Sheets API:', error);
        }
    }

    const sheetData = await accessGoogleSheets()
    const result = sheetData
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(result)
}

export default sheet_insert