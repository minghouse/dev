import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // 獲取檔案的完整路徑
const __dirname = path.dirname(__filename);       // 獲取檔案所在的目錄

/**
 * 使用者是否登入 
 */
const login_status = async (req, res) => {

    if (fs.existsSync(`${__dirname}/../../../../../../ssl/privkey1.pem`)) {
        res.setHeader('Access-Control-Allow-Origin', 'https://minghouse.github.io/')
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*')
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(200).json({
        code: 200,
        data: {
            is_login: req.session.is_login ? true : false,
        }
    });

}

export default login_status