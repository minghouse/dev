const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

// 將私鑰轉換為 CryptoKey 格式
async function getCryptoKey(privateKey) {
    const pemKey = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\n/g, '');
    const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));

    return await crypto.subtle.importKey(
        'pkcs8',
        binaryKey.buffer,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256'
        },
        true,
        ['sign']
    );
}

// Base64URL 編碼
function base64urlEncode(str) {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// 創建 JWT
async function createJWT() {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const header = {
        alg: 'RS256',
        typ: 'JWT'
    };

    const payload = {
        iss: CLIENT_EMAIL,
        scope: SCOPES,
        aud: 'https://oauth2.googleapis.com/token',
        exp: exp,
        iat: iat
    };

    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const key = await getCryptoKey(PRIVATE_KEY);
    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        key,
        new TextEncoder().encode(unsignedToken)
    );

    const encodedSignature = base64urlEncode(String.fromCharCode.apply(null, new Uint8Array(signature)));

    return `${unsignedToken}.${encodedSignature}`;
}

// 獲取訪問令牌
async function getAccessToken() {
    const jwt = await createJWT();
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        })
    });

    const data = await response.json();
    return data.access_token;
}

export default getAccessToken