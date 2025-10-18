import common from './modules.js';
import { GOOGLE } from "./modules/auth.js";

/**
 * @example
 * const res = await fetch('/google/getDatas')
 * const data = await res.json()
 * console.log(data)
 */
const sheet_search = async (range, type='NEWS') => { 
    // 配置參數
 
    const SPREADSHEET_ID = GOOGLE.SPREADSHEET_ID[type];
    if (!SPREADSHEET_ID) {
        throw new Error(`Invalid type: ${type}`);
    }
    // const RANGE = 'AI整理-中國時報!A2:F5';
    // const RANGE = req.query.range

    // const sheetData = await common.accessGoogleSheets(SPREADSHEET_ID, RANGE)

    const accessToken = await common.getAccessToken();
    // console.log('Access Token:', accessToken);

    //
    const sheetData = await common.accessGoogleSheets(SPREADSHEET_ID, range, accessToken)

    return sheetData
}

export default sheet_search