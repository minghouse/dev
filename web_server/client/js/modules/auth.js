// auth.js
import { getCookie, setCookie } from "./cookieHelper.js";
// settings.js
import { settings } from "./settings.js";

const api_domain = settings.api_domain;
const CLIENT_ID = "209706996464-ojc2aahdsu7ek2df0494avch7gjqbhnh.apps.googleusercontent.com";
let GOOGLE = {}

// 檢查是否已登入
async function checkLogin() {
    //fetch api_domain + "/api/login_status"
    const result = await fetch(`${api_domain}/api/login_status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    })
    const data = await result.json();
    if (data.code === 200) {
        const is_login = data.data.is_login;
        if (is_login) {
            for (const key in data.data.GOOGLE) {
                GOOGLE[key] = data.data.GOOGLE[key];
            }
            return true
        }
        showGoogleLogin();
        return false
    }
}

// 顯示 Google 登入按鈕 (Modal 方式)
function showGoogleLogin() {
    const modal = document.createElement("div");
    modal.innerHTML = `
        <div id="modal_login" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 999;">
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h3>請登入</h3>
                <div id="g_id_onload"
                    data-client_id="${CLIENT_ID}"
                    data-callback="handleCredentialResponse">
                </div>
                <div class="d-flex justify-content-center g_id_signin" data-type="standard" ></div>
                <!--error-->
                <div id="error" class="d-flex justify-content-center" style="color: red; display: none;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    // <script src="https://accounts.google.com/gsi/client" async defer></script>
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
}

// Google 回調函數 (在 window 註冊)
window.handleCredentialResponse = (response) => {
    // console.log("Google JWT Token: ", response.credential);

    // 傳送 Token 到後端驗證
    fetch(`${api_domain}/api/google_login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: response.credential })
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            document.getElementById("modal_login").remove(); // 移除 Modal
            // console.log("登入成功！用戶資料：", data.user);
            // setCookie("login_token", data.token, 7); // 存入 cookie
            location.reload(); // 重新載入頁面
            return
        } else if (data.code === 201) {
            const errorDiv = document.getElementById("error");
            errorDiv.innerText = "使用者無權限進行操作！";
            errorDiv.style.display = "block";
            return
        }
        // 顯示錯誤訊息
        const errorDiv = document.getElementById("error");
        errorDiv.innerText = "登入失敗！請稍後再試。";
        errorDiv.style.display = "block";
        // console.log("登入失敗！", data.error);
    })
    .catch(error => console.error("錯誤:", error));
};

export { checkLogin, GOOGLE };
