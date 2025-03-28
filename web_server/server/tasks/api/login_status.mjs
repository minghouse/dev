/**
 * 使用者是否登入 
 */
const login_status = async (req, res) => {

    res.status(200).json({
        code: 200,
        data: {
            is_login: req.session.is_login ? true : false,
        }
    });

}

export default login_status