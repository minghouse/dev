import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // 獲取檔案的完整路徑
const __dirname = path.dirname(__filename);       // 獲取檔案所在的目錄

/**
 * 登出
 */
const logout = async (req, res) => {

    // console.log(req.session.is_login)

    req.session.is_login = null
    
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).json({
        code: 200,
        message: 'Logout successful'
    });

}

export default logout