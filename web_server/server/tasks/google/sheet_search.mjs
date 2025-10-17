import common from './modules.mjs';

/**
 * @example
 * const res = await fetch('/google/sheet_search?range=工作表8!A2:C5')
 * const data = await res.json()
 * console.log(data)
 */
const sheet_search = async (req, res) => { 
    // 配置參數
 
    const SPREADSHEET_ID = '1e0nsE-Xy2xuMRWR13egciuyPoYDNFM-XSTlwUcvH0CM';
    // const RANGE = 'AI整理-中國時報!A2:F5';
    const RANGE = req.query.range

    const sheetData = await common.accessGoogleSheets(SPREADSHEET_ID, RANGE)
    const result = sheetData
    //允許跨域請求
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(result)
}

export default sheet_search