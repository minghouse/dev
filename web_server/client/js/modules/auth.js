// auth.js
import { getCookie, setCookie } from "./cookieHelper.js";
// settings.js
import { settings } from "./settings.js";

const api_domain = settings.api_domain;
const CLIENT_ID = "209706996464-ojc2aahdsu7ek2df0494avch7gjqbhnh.apps.googleusercontent.com";

// 檢查是否已登入
function checkLogin() {
    const loginToken = getCookie("login_token");
    if (!loginToken) {
        showGoogleLogin();
    }
}

// 顯示 Google 登入按鈕 (Modal 方式)
function showGoogleLogin() {
    const modal = document.createElement("div");
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 999;">
            <div style="background: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h3>請使用 Google 登入</h3>
                <div id="g_id_onload"
                    data-client_id="${CLIENT_ID}"
                    data-callback="handleCredentialResponse">
                </div>
                <div class="d-flex justify-content-center g_id_signin" data-type="standard" ></div>
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
    console.log("Google JWT Token: ", response.credential);

    // 傳送 Token 到後端驗證
    fetch(`${api_domain}/api/google_login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: response.credential })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            console.log("登入成功！用戶資料：", data.user);
            setCookie("login_token", data.token, 7); // 存入 cookie
            location.reload(); // 重新載入頁面
        } else {
            console.log("登入失敗！", data.error);
        }
    })
    .catch(error => console.error("錯誤:", error));
};

// 匯出函數，讓其他 JS 也可以使用
export { checkLogin };
