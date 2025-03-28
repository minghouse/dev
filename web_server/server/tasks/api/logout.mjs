/**
 * 登出
 */
const logout = async (req, res) => {

    // console.log(req.session.is_login)

    req.session.is_login = null
    
    res.status(200).json({
        code: 200,
        message: 'Logout successful'
    });

}

export default logout