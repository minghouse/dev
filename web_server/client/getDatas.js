(async ()=> {
    const CLIENT_EMAIL = 'curl-460@focal-time-390307.iam.gserviceaccount.com';
  const PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCa3tSRTX1rTzmy\nOCgpvobDRQYiKpEFQ34G5Cee+h94aiivHTnMuFfyg02h/IRL8Ij6ed7c81Xras6d\nQgvfTaeU77WGsEUI9ay8og2N9/SpAfboEEcMCB2a5YWCeMLhgssPTpDkEfWeodZx\n8NvO/WPVSCp8cO06RH4hoBSbBmiC7GtKQzP0VYxZcsouAm1TlVe35d0NMuawhVhB\nORuecvsxJjAVpxBFaXAh+v77s2jedS9TSWnx7Z1MRbx/HG0nPt6XVRJI4hm2IoT2\nOy86oxrv1624ZfkUoULHtqWrardik963jMntRotyJ/1yA+jaQrLTTRjv73ynuqCJ\nPQXSctLnAgMBAAECggEAQ5JW9+DyCIikOVzkNTaCkR+EKhMdfEjy62nP2b7zTTQw\ndRtQ1UBXayIcFMHbLVERSwwyj4ACbHmJFbcz++XjaQnfz5kIPf0HNbSVKmzWDIml\nY6J6hUbjN+rOAlvTV9ab551VfZVScDjXmpZHKbyIOw5GL06MSyCIUf6JDwzQO9Li\nWcR76VOZO3iY22X3T32IRsHclU6HEP46s7/wsOUM/9MfLn6GYMtma9DomPfusXAg\n5ocY3bIbHj2o93oIFZlAQsdm15eBRGmFe0koVfAwMuD2sKO4RqG9awuS7LDyaf3k\n4hnuk/i4X4FMubwx7WyT3IGP2uMSprGpDvk/QUGGvQKBgQDVw5e2wmRRN+C1nyeK\nRWNjskBbIgJX5npTV0pQpA+q8UP2au601Wv22LM47UYCBlrGAPLniEAYI1DqryxN\nynxG/tzuFDec42OamQ+65dbI6+sO/oIlK+Vy5cBavIRDmzwcL/bLau88yUtM3ck0\nhO+u6Z7wgzvr0uM/jbmdJz3mQwKBgQC5eFaFa36/NM1+D97Z5IafJIlskJmeoqzQ\n/zLlqvKl9cM7D/32LcOVTnYIjLgmxTSZhsPvhIFKaKcd2xojJxXTzFg8taLv67iu\nSuZ+nyDXne7RO3WxCPDrX8MS/UwjCwueILGBIqoinUxK/drVDNVqECxlz0thy68w\nBeZ4HwkAjQKBgFGCubEowtPteLQIsi0ZdGKpr7yQZVBbRD3PRTkmtgq64O1vrQIr\nd3Wy//QvFcjj320tI3KCE96gaNR0Y3JuSaFQwbHO573dPzfOMZ9U0OfgfctD5SCD\ncoSzcvumctDMuskMyRCcAAmvwBTZZUWvgy2xS7fucsTjr1+mjSaNth69AoGAOlIc\n4tdqg7WW6I0VBm9V5bUXgYv2wmtk7FNTLeUTaBxfx7K/qSm61rhVZVrajVZ1s9Es\ny6RfA4blBf5fua4QrwkStgRnuAnniOcEk8x2B1ciQajw2Tp2h40VSmNcDajrfk3J\ng1HjLf9IfkxVA6mFclSjoWAN1DK4Y+F3F06rBgECgYEAuSrROg0NnNuMr0y/PD++\nnKeYFr1/lMjYd+m3fFMk1Ocs1ri7egH+cBIkBltXdDWRfwUxzQbY+mmu04v/L/Cp\nNVC0z8CtoMsMeDlrh5TzMQAzlBb7ZBioNLT3BxI97D8Xu34wfxvGjzmnuQbb1JMT\nFm/svYOCvaTg7WMkRpLM/Sw=\n-----END PRIVATE KEY-----\n";
          
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
  
  // 訪問 Google Sheets API
  async function accessGoogleSheets(SPREADSHEET_ID, RANGE) {
      try {
          const accessToken = await getAccessToken();
          // console.log('Access Token:', accessToken);
  
          const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}`, {
              method: 'GET',
              headers: { Authorization: `Bearer ${accessToken}` },
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
  
  const SPREADSHEET_ID = '1DYU3NZmGLrj0G2ruQOyLxhOqLgBkSQ_mQ4-KPlYG-yE';
  const RANGE = '工作表8!A2:C5'
  
  const sheetData = await accessGoogleSheets(SPREADSHEET_ID, RANGE)
  console.log(sheetData)
  
  })()