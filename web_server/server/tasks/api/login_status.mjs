/**
 * 使用者是否登入 
 */
const login_status = async (req, res) => {

    if (fs.existsSync(`${__dirname}/../../../../../../ssl/privkey1.pem`)) {
        res.setHeader('Access-Control-Allow-Origin', 'https://minghouse.github.io/')
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*')
    }
    res.status(200).json({
        code: 200,
        data: {
            is_login: req.session.is_login ? true : false,
        }
    });

}

export default login_status