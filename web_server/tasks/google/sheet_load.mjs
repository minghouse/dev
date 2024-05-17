import getAccessToken from './modules.mjs';

const sheet_load = async (req, res) => { 
    // 配置參數
 
    const SPREADSHEET_ID = '1DYU3NZmGLrj0G2ruQOyLxhOqLgBkSQ_mQ4-KPlYG-yE';
    // const RANGE = 'AI整理-中國時報!A2:F5';
    const RANGE = req.query.range

    // 訪問 Google Sheets API
    async function accessGoogleSheets() {
        try {
            const accessToken = await getAccessToken();
            // console.log('Access Token:', accessToken);

            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${accessToken}` },
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
    res.json(result)
}

export default sheet_load