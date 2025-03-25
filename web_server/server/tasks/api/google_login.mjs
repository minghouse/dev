import modules from '../google/modules.mjs';

const google_login = async (req, res) => {
    // const url = req.query.url
    // const selector = req.query.selector || 'body'
    const token = req.body.token
    
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
    }

    try {
        // 驗證 Google Auth Token
        const tokenInfo = await modules.verifyGoogleToken(token);

        // 驗證成功，返回使用者資訊
        res.status(200).json({
            message: 'Login successful',
            user: {
                id: tokenInfo.sub, // 使用者的唯一 ID
                email: tokenInfo.email,
                name: tokenInfo.name,
                picture: tokenInfo.picture,
            },
        });
    } catch (error) {
        // 驗證失敗，返回錯誤
        res.status(401).json({ error: 'Invalid token' });
    }

}

export default google_login