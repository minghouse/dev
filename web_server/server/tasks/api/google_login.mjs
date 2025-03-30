
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

import modules from '../google/modules.mjs';
import pool from '../../modules/mysql.mjs';

dayjs.extend(utc)
dayjs.extend(timezone)

const google_login = async (req, res) => {
    // const url = req.query.url
    // const selector = req.query.selector || 'body'
    const token = req.body.token
    const now = dayjs().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')
    const now_date = dayjs(now).tz('Asia/Taipei').format('YYYY-MM-DD')
    const now_time = dayjs(now).tz('Asia/Taipei').format('HH:mm:ss')
    
    if (fs.existsSync(`${__dirname}/../../../../../../ssl/privkey1.pem`)) {
        res.setHeader('Access-Control-Allow-Origin', 'https://minghouse.github.io/')
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*')
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
    }

    try {
        // 驗證 Google Auth Token
        const tokenInfo = await modules.verifyGoogleToken(token);
        const user = {
            id: tokenInfo.sub, // 使用者的唯一 ID
            email: tokenInfo.email,
            name: tokenInfo.name,
            picture: tokenInfo.picture,
        }

        // 檢查使用者是否已存在於資料庫中
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM user WHERE id = ?', [user.id]);

        if (rows.length === 0) {
            // 使用者不存在，插入新使用者資料
            const insertQuery = 'INSERT INTO user (id, platforms, email, name, picture, created_date, created_time, last_login_date, last_login_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            await connection.execute(insertQuery, [user.id, 'google', user.email, user.name, user.picture, now_date, now_time, now_date, now_time]);
        } else {
            // 使用者已存在，更新最後登入時間
            const updateQuery = 'UPDATE user SET last_login_date = ?, last_login_time = ? WHERE id = ?';
            await connection.execute(updateQuery, [now_date, now_time, user.id]);
        }

        // 讀取使用者資料
        const [userRows] = await connection.execute('SELECT * FROM user WHERE id = ?', [user.id]);
        const userData = userRows[0];
        // console.log(userData)

        // 關閉資料庫連線
        connection.release();

        // 檢查使用者等級
        if (userData.level === '0') {
            res.status(200).json({ 
                code: 201
            });
            return;
        }
        
        // session標註已登入
        req.session.is_login = true;
        
        // 驗證成功，返回使用者資訊
        res.status(200).json({
            code: 200,
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Error during Google login:', error);
        // 驗證失敗，返回錯誤
        res.status(401).json({ error: 'Invalid token' });
    }

}

export default google_login