import common from './modules.js';

dayjs.extend(dayjs_plugin_utc)
dayjs.extend(dayjs_plugin_timezone)

/**
 * @example
 * const res = await fetch('/google/getDatas5_buy')
 * const data = await res.json()
 * console.log(data)
 */
const getDatas5_buy = async (form_data) => {
    // 配置參數

    // const RANGE = 'AI整理-中國時報!A2:F5';
    // const RANGE = req.query.range

    // const sheetData = await common.accessGoogleSheets(SPREADSHEET_ID, RANGE)

    const accessToken = await common.getAccessToken();
    // console.log('Access Token:', accessToken);

    const now = dayjs();
    let date_now = dayjs(now).tz('Asia/Taipei').format('YYYY-MM-DD')

    const stock = form_data.buy_stock.split(',')
    const buy_number = form_data.buy_in_out == 'in' ? form_data.buy_number :  0 - form_data.buy_number
    const data = [
        form_data.buy_category, stock[0], stock[1], date_now, buy_number, form_data.buy_price, form_data.buy_note
    ]

    // const response = await fetch(`https://dev-cpzu.onrender.com/google/sheet_insert?range=${encodeURIComponent("自選股")}&datas=${encodeURIComponent(JSON.stringify([data]))}`, {
    const response = await fetch(`https://newsdev.duckdns.org/google/sheet_insert?range=${encodeURIComponent("自選股")}&datas=${encodeURIComponent(JSON.stringify([data]))}`, {
        method: 'GET',
        headers: {
            // 'Content-Type': 'application/json',
        },
        // body: JSON.stringify({
        //     range: '自選股',
        //     datas: [data],
        // }),
    });

    const out = {
    }

    return out
}

export default getDatas5_buy