// ===== API 客户端 — 封装后端 API 调用 =====
const API_BASE = 'http://localhost:3001';

// ---- Token 管理 ----
const STORAGE_KEY_TOKEN = 'flightShooterToken';
const STORAGE_KEY_USER = 'flightShooterUser';

let authChangeCallbacks = [];

function setToken(token) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
}

function getToken() {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
}

function clearToken() {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
}

// ---- 用户信息管理 ----
function setUser(user) {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

function getUser() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_USER);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function clearUser() {
    localStorage.removeItem(STORAGE_KEY_USER);
}

function isLoggedIn() {
    return !!getToken();
}

// ---- HTTP 请求封装 ----
async function apiPost(path, data, auth) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
        const token = getToken();
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
    }
    const res = await fetch(API_BASE + path, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });
    if (res.status === 401) {
        clearToken();
        clearUser();
        AuthUI.updateUserInfo(null);
        AuthUI.show();
        alert('登录已过期，请重新登录');
        return { success: false, error: '登录已过期' };
    }
    return res.json();
}

async function apiGet(path, auth) {
    const headers = {};
    if (auth) {
        const token = getToken();
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
    }
    const res = await fetch(API_BASE + path, { headers: headers });
    if (res.status === 401) {
        clearToken();
        clearUser();
        AuthUI.updateUserInfo(null);
        AuthUI.show();
        alert('登录已过期，请重新登录');
        return { success: false, error: '登录已过期' };
    }
    return res.json();
}

// ---- 认证 API ----
async function sendCode(email) {
    return apiPost('/api/auth/send-code', { email: email });
}

async function verifyCode(email, code) {
    return apiPost('/api/auth/verify-code', { email: email, code: code });
}

async function wechatLogin(code) {
    return apiPost('/api/auth/wechat', { code: code });
}

async function qqLogin(code) {
    return apiPost('/api/auth/qq', { code: code });
}

// ---- 用户数据 API ----
async function fetchUserData() {
    return apiGet('/api/user/data', true);
}

async function saveUserData(data) {
    return apiPost('/api/user/data', data, true);
}

// ---- 登出 ----
function logout() {
    clearToken();
    clearUser();
    authChangeCallbacks.forEach(function (cb) { cb(false); });
}

// ---- 登录状态变化回调 ----
function onAuthChange(callback) {
    authChangeCallbacks.push(callback);
    callback(isLoggedIn());
}

// ---- 对外暴露全局函数和 apiClient 对象 ----
const apiClient = {
    setToken: setToken,
    getToken: getToken,
    clearToken: clearToken,
    setUser: setUser,
    getUser: getUser,
    clearUser: clearUser,
    isLoggedIn: isLoggedIn,
    apiPost: apiPost,
    apiGet: apiGet,
    sendCode: sendCode,
    verifyCode: verifyCode,
    wechatLogin: wechatLogin,
    qqLogin: qqLogin,
    fetchUserData: fetchUserData,
    saveUserData: saveUserData,
    logout: logout,
    onAuthChange: onAuthChange
};