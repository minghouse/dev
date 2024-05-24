const CLIENT_EMAIL = 'id-372@focal-time-390307.iam.gserviceaccount.com';
const PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQChX5ehmnPhqJoX\nWg/k+J0Dl060ZSPBxD0osWlnsjb+lrQJ0giADh4UVkg+EFkeiezBWdl4Bbwud5cm\ncufwmCViDrE5Ai7qJBQtSyyeRLALrZM/lTx9Ia5jBqnSyr0QngBHzaM3mw3MMSud\ntU7+hV4DiGVDUQXl24e063i6B/8YYPxlGxDxIjKe6AirKmV9xAcQYVuBKmEtx9Bt\nEIZ3QSxXWXWzcOrNnNGXqjfjPr0f3GHtCnDFf1vv9O3GI7nL650rOfSMW7ozE+RE\nrHVGD2YkrW7vjgJLJZnaufnfrQLihDeXgoI8UZOg8VT5rhrl37aCckpVz0riyQQE\nzhyVLic7AgMBAAECggEABpd2BSbe9ufBK5UFMzAokb37fAjplf+jE+dzS8YO0wVq\n4z/OExUAi4oet1JJoaK2pgs6g9mQH0HJTcvBx6UfWcsJ2C9LpUrF/Dem4ewiWMfF\nTQKWjvHyQp9CDpczc9tQXZ57vUi7Ho0fn/iI+oKOHYzTvhUwLXxzJaO8sbSj6eXz\nlAKFWGhcOcqaluZfliDvA3RN12Fc0iDgIyeNheJ2IiYWosAHahPTRoJ75xUOR7Sr\nbebnb8NQ4KIKRnyudc0gfx/SXewcKVLHLzfq/oUIZC6zvWXmrK4130g/sg60FCAS\ntojlxjKpIDErR3/f6IG09FM1xKwhW2+88S3OKSQkIQKBgQDjQJsyaWVks9yNgFMv\nyKy1fFxHzAj6i/zzlRpE6n9u92N2j/zrBBOqQhsSm59zfeGNKv51uXuw18TqzzNS\nJv4N+Ybx1kidbX7igtkgttIoNya4exSThwl8HXOyKOdrcfo5ER72KFa3065bJc4B\nYgS8iysiVj/ProllDWnKSgHxkQKBgQC1yYvidTar3AwdNghplg6yy9ZJMc/PTJ2a\nwsMHjnrH7m11WhbvnZ5x/R/8Gt8iKRvn7MLjK+HyDnDz5n603d3xeifrHYAGvE/R\ndvAYLO35Ps1j6s1jbRkZSxTXgucMgaRnRtUgGnDuFMOl5Y1XWdCzMnT0LanfRh9D\nEw2NlslmCwKBgQCaMBGc6Knk46w3TeQjPbMBCDnMdQF6jVS5KGdEbx67eZrArP1b\nr85v7J5Vx8UuJTDOCWfRFGJ6IEv5TVBy4wXpEW6f01Y9ijdXFJShf6mjo5ff/5J8\nbljfH1SKgvpRimnOInGxbrk3zKY2LbZSdeDk1EAV8hMlpDSQncMzf3dGIQKBgDKZ\nkShNvBQGQhD3c0wAisLV3iWticyH5O6o+6Rk0mRIR4t8shmsY+gSrw57ZFSb4Lqj\nunOFSXUY8/PP2sD5aMfIWsglA/fb/tOtKZNxHiRciMshFl5whaX2sixysWFXzK06\nmCRBd+GtQfAxfzArPd5DUy6Mb1ZIrHb9HK6mpBSVAoGAFC/Wl65zVJ1dS9Y8/M07\nEW5nncjwYH721G9f60xBQOuGLmJMCtv9cZIpRadAHmCPjPOUUAoxbYlsTbCVXvyc\nSBpPjz2GZqnxl2rNQLY2J2BSa6Vy6qq9MwRl2luyfY8qmNNwvvl9/GoDHAzLY9kF\nbLE/gbADPXCCTmVRCnuts/A=\n-----END PRIVATE KEY-----\n";

// const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

// 將私鑰轉換為 CryptoKey 格式
async function getCryptoKey(privateKey) {
    const pemKey = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\n/g, '')
        .replace(/\\n/g, '');
    const binaryKey = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));

    return await crypto.subtle.importKey(
        'pkcs8',
        binaryKey.buffer, {
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
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        })
    });

    const data = await response.json();
    return data.access_token;
}

// 訪問 Google Sheets API
async function accessGoogleSheets(SPREADSHEET_ID, RANGE) {
    try {
        const accessToken = await getAccessToken();
        // console.log('Access Token:', accessToken);

        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
        });

        const sheetData = await response.json();
        // console.log('Sheet Data:', sheetData);
        return sheetData
        // document.getElementById('content').innerText = JSON.stringify(sheetData, null, 2);
    } catch (error) {
        console.error('Error accessing Google Sheets API:', error);
        throw error
    }
}

const out = {
    getAccessToken,
    accessGoogleSheets
}

export default out