import common from './modules.js';

const SPREADSHEET_ID = '1DYU3NZmGLrj0G2ruQOyLxhOqLgBkSQ_mQ4-KPlYG-yE';
const RANGE = '工作表8!A2:C5'

const sheetData = await common.accessGoogleSheets(SPREADSHEET_ID, RANGE)
console.log(sheetData)