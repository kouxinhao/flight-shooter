const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = 480;
const H = 720;
canvas.width = W;
canvas.height = H;

// 排版字体定义
const FONT_BOLD = '"Microsoft YaHei", "PingFang SC", Arial, sans-serif';
const FONT_NUM = '"Courier New", Consolas, monospace';

// ===== HSL 转 RGB 辅助函数 =====
function hslToRgb(h, s, l) {
    var r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        var hue2rgb = function(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// ===== 画布自适应缩放 =====
function resizeCanvas() {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const ratio = W / H;
    let cw, ch;
    if (maxW / maxH > ratio) {
        ch = maxH;
        cw = ch * ratio;
    } else {
        cw = maxW;
        ch = cw / ratio;
    }
    canvas.style.width = Math.floor(cw) + 'px';
    canvas.style.height = Math.floor(ch) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ===== 用户登录系统（必须在 init 前声明，避免 TDZ） =====
let currentUser = null;
let loggedIn = false;
let loginTransitionGuard = false; // 登录后防幽灵点击

function restoreLoginState() {
    var user = typeof getUser === 'function' ? getUser() : null;
    var token = typeof getToken === 'function' ? getToken() : null;
    if (user && token) {
        // 校验 JWT token 是否过期
        try {
            var payload = token.split('.')[1];
            if (payload) {
                var decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
                var parsed = JSON.parse(decoded);
                if (parsed.exp && parsed.exp < Date.now() / 1000) {
                    // token 已过期
                    if (typeof clearToken === 'function') clearToken();
                    if (typeof clearUser === 'function') clearUser();
                    if (typeof AuthUI !== 'undefined') {
                        if (AuthUI.updateUserInfo) AuthUI.updateUserInfo(null);
                        if (AuthUI.show) AuthUI.show();
                    }
                    alert('登录已过期，请重新登录');
                    return;
                }
            }
        } catch (e) {
            // JWT 解析失败，视为无效 token，清除登录状态
            if (typeof clearToken === 'function') clearToken();
            if (typeof clearUser === 'function') clearUser();
            if (typeof AuthUI !== 'undefined') {
                if (AuthUI.updateUserInfo) AuthUI.updateUserInfo(null);
                if (AuthUI.show) AuthUI.show();
            }
            return;
        }
        currentUser = user;
        loggedIn = true;
        if (typeof AuthUI !== 'undefined' && AuthUI.updateUserInfo) {
            AuthUI.updateUserInfo(user);
        }
    }
}

// ===== 初始化登录系统 =====
if (typeof AuthUI !== 'undefined' && AuthUI.init) {
    AuthUI.init();
    restoreLoginState();
}

// ===== 触摸设备检测 =====
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ===== 浏览器检测 =====
function getBrowserInfo() {
    const ua = navigator.userAgent;
    if (/MicroMessenger/i.test(ua)) return { name: '微信内置浏览器', strict: false, hint: '点击屏幕即可开启音效' };
    if (/MQQBrowser|QQ\//i.test(ua) && !/MicroMessenger/i.test(ua)) return { name: 'QQ内置浏览器', strict: false, hint: '点击屏幕即可开启音效' };
    if (/UCBrowser|UBrowser/i.test(ua)) return { name: 'UC浏览器', strict: false, hint: '点击屏幕即可开启音效' };
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua) && !/CriOS/i.test(ua)) return { name: 'Safari', strict: true, hint: '请点击屏幕任意位置以开启音效' };
    if (/Firefox/i.test(ua) && !/Seamonkey/i.test(ua)) return { name: 'Firefox', strict: false, hint: '点击屏幕即可开启音效' };
    if (/Edg/i.test(ua)) return { name: 'Edge', strict: true, hint: '请点击屏幕以激活音效' };
    if (/Chrome/i.test(ua) || /CriOS/i.test(ua)) return { name: 'Chrome', strict: true, hint: '请点击屏幕激活音效' };
    return { name: '浏览器', strict: true, hint: '点击屏幕开启音效' };
}
const browserInfo = getBrowserInfo();

// ===== WakeLock 支持 (Task 7) =====
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { wakeLock = null; });
        }
    } catch (e) {
        // WakeLock not supported
    }
}
function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}

// ===== 音效管理器 (Web Audio API) =====
class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.masterGain = null;
        this.bgmGain = null;
        this.bgmVolume = 0.25;
        this._bgmTimer = null;
        this._menuBgmTimer = null;
        this.menuBgmGain = null;
        this._initialized = false;
        this._pendingMenuBGM = false;
    }

    init() {
        if (this._initialized) return;
        this._initialized = true;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            // AudioContext 状态变化时自动处理（如从 suspended→running 时启动待播放的 BGM）
            this.ctx.onstatechange = () => {
                if (this.ctx.state === 'running' && this._pendingMenuBGM) {
                    this._pendingMenuBGM = false;
                    this._menuBgmTimer = null;
                    this._scheduleMenuBGMLoop();
                }
            };
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1;
            this.masterGain.connect(this.ctx.destination);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = 0.25;
            this.bgmGain.connect(this.masterGain);
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // 安全尝试 resume（仅在用户事件处理中调用，不放在高频循环中避免性能警告）
    tryResume() {
        if (!this.ctx) return false;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx.state === 'running';
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 1;
        }
        if (this.muted) {
            this.stopAllBGM();
        }
        return this.muted;
    }

    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = value;
        }
        if (value === 0) {
            this.muted = true;
        } else {
            this.muted = false;
        }
    }

    playShoot() {
        if (!this.ctx || this.muted) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    playExplosion() {
        if (!this.ctx || this.muted) return;
        this.resume();
        const now = this.ctx.currentTime;
        const bufLen = Math.floor(this.ctx.sampleRate * 0.2);
        const buffer = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.18, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        noise.connect(ng);
        ng.connect(this.masterGain);
        noise.start(now);

        const osc = this.ctx.createOscillator();
        const og = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        og.gain.setValueAtTime(0.12, now);
        og.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(og);
        og.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    playPlayerDeath() {
        if (!this.ctx || this.muted) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.4);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.45);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(55, now);
        osc2.frequency.exponentialRampToValueAtTime(15, now + 0.5);
        gain2.gain.setValueAtTime(0.18, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(now);
        osc2.stop(now + 0.55);
    }

    playUpgrade() {
        if (!this.ctx || this.muted) return;
        this.resume();
        const now = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t = now + i * 0.08;
            g.gain.setValueAtTime(0.12, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.connect(g);
            g.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.15);
        });
    }

    startBGM() {
        if (!this.ctx || this.muted || this._bgmTimer) return;
        this._scheduleBGMLoop();
    }

    _scheduleBGMLoop() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const beat = 0.35;
        const pattern = [55, 65, 55, 73, 55, 65, 55, 82];

        for (let i = 0; i < pattern.length; i++) {
            const t = now + i * beat;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = pattern[i];
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.1, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.5);
            osc.connect(g);
            g.connect(this.bgmGain);
            osc.start(t);
            osc.stop(t + beat * 0.55);
        }

        const loopMs = pattern.length * beat * 1000;
        this._bgmTimer = setTimeout(() => this._scheduleBGMLoop(), loopMs);
    }

    stopBGM() {
        if (this._bgmTimer) {
            clearTimeout(this._bgmTimer);
            this._bgmTimer = null;
        }
    }

    setBgmVolume(vol) {
        this.bgmVolume = vol;
        if (this.bgmGain) {
            this.bgmGain.gain.value = vol;
        }
    }

    // ===== 激昂菜单 BGM（Web Audio 程序化合成，135BPM 强力和弦） =====
    startMenuBGM() {
        if (!this.ctx || this.muted || this._menuBgmTimer) return;
        // AudioContext 未激活时延迟调度，等 onstatechange 事件触发后自动启动
        if (this.ctx.state === 'suspended') {
            this._pendingMenuBGM = true;
            return;
        }
        this._pendingMenuBGM = false;
        this._scheduleMenuBGMLoop();
    }

    _scheduleMenuBGMLoop() {
        if (!this.ctx || this.muted) return;

        if (!this.menuBgmGain) {
            this.menuBgmGain = this.ctx.createGain();
            this.menuBgmGain.gain.value = 0.40;
            this.menuBgmGain.connect(this.masterGain);
        }

        const now = this.ctx.currentTime;
        const bpm = 160;
        const beat = 60 / bpm;
        const totalBeats = 16;
        const loopDuration = totalBeats * beat;

        // E 小调英雄主题（燃系）
        // 贝斯 line：高低八度跳跃，增强冲击力
        const bassNotes = [
            82, 82, 98, 98, 110, 110, 123, 123,    // 小节 1-2: E E G G A A B B
            165, 165, 196, 196, 110, 110, 123, 123   // 小节 3-4: E3 E3 G3 G3 A A B B
        ];

        // 主旋律（triangle）—— 昂扬上升的英雄主题
        const leadMelody = [
            330, 392, 494, 587, 659, 587, 494, 392,
            440, 523, 659, 784, 880, 784, 659, 523
        ];

        // 第五音层（sawtooth，制造力量感）
        const fifthRoots = [
            82, 0, 98, 0, 110, 0, 123, 0,
            165, 0, 196, 0, 110, 0, 123, 0
        ];

        for (let i = 0; i < totalBeats; i++) {
            const t = now + i * beat;

            // --- 贝斯（square，低音冲击） ---
            const bass = this.ctx.createOscillator();
            const bg = this.ctx.createGain();
            bass.type = 'square';
            bass.frequency.value = bassNotes[i];
            bg.gain.setValueAtTime(0, t);
            bg.gain.linearRampToValueAtTime(0.16, t + 0.015);
            bg.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.35);
            bass.connect(bg);
            bg.connect(this.menuBgmGain);
            bass.start(t);
            bass.stop(t + beat * 0.4);

            // --- 力量弦乐（sawtooth，偶数拍五度音程） ---
            if (i % 2 === 0 && fifthRoots[i] > 0) {
                const chord = this.ctx.createOscillator();
                const cg = this.ctx.createGain();
                chord.type = 'sawtooth';
                chord.frequency.value = fifthRoots[i] * 1.5;  // 纯五度
                cg.gain.setValueAtTime(0, t);
                cg.gain.linearRampToValueAtTime(0.06, t + 0.02);
                cg.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.25);
                chord.connect(cg);
                cg.connect(this.menuBgmGain);
                chord.start(t);
                chord.stop(t + beat * 0.3);
            }

            // --- 主旋律（triangle，英雄主题） ---
            const lead = this.ctx.createOscillator();
            const lg = this.ctx.createGain();
            lead.type = 'triangle';
            lead.frequency.value = leadMelody[i];
            lg.gain.setValueAtTime(0, t);
            lg.gain.linearRampToValueAtTime(0.08, t + 0.02);
            lg.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.45);
            lead.connect(lg);
            lg.connect(this.menuBgmGain);
            lead.start(t);
            lead.stop(t + beat * 0.5);

            // --- 高八度泛音（sine，每 4 拍强调，制造空灵感） ---
            if (i % 4 === 0) {
                const harm = this.ctx.createOscillator();
                const hg = this.ctx.createGain();
                harm.type = 'sine';
                harm.frequency.value = leadMelody[i] * 2;
                hg.gain.setValueAtTime(0, t);
                hg.gain.linearRampToValueAtTime(0.035, t + 0.025);
                hg.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.5);
                harm.connect(hg);
                hg.connect(this.menuBgmGain);
                harm.start(t);
                harm.stop(t + beat * 0.55);
            }

            // --- 上升滑音（每 8 拍，制造蓄力感） ---
            if (i === 0 || i === 8) {
                const sweep = this.ctx.createOscillator();
                const sg = this.ctx.createGain();
                sweep.type = 'sine';
                sweep.frequency.setValueAtTime(200, t);
                sweep.frequency.exponentialRampToValueAtTime(800, t + beat * 0.5);
                sg.gain.setValueAtTime(0, t);
                sg.gain.linearRampToValueAtTime(0.04, t + 0.03);
                sg.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.55);
                sweep.connect(sg);
                sg.connect(this.menuBgmGain);
                sweep.start(t);
                sweep.stop(t + beat * 0.6);
            }

            // --- 打击乐（三层：Kick / Snare / Hi-hat） ---
            const bufLen = Math.floor(this.ctx.sampleRate * (beat * 0.1));
            const buffer = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let j = 0; j < bufLen; j++) {
                data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / bufLen, 3);
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const ng = this.ctx.createGain();

            if (i % 4 === 0) {
                // 强拍 Kick（重击）
                ng.gain.setValueAtTime(0.25, t);
                ng.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.15);
            } else if (i % 4 === 2) {
                // 中拍 Snare（军鼓）
                ng.gain.setValueAtTime(0.14, t);
                ng.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.08);
            } else {
                // 弱拍 Hi-hat（密集反拍）
                ng.gain.setValueAtTime(0.05, t);
                ng.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.04);
            }
            noise.connect(ng);
            ng.connect(this.menuBgmGain);
            noise.start(t);
        }

        this._menuBgmTimer = setTimeout(() => this._scheduleMenuBGMLoop(), loopDuration * 1000);
    }

    stopMenuBGM() {
        if (this._menuBgmTimer) {
            clearTimeout(this._menuBgmTimer);
            this._menuBgmTimer = null;
        }
    }

    stopAllBGM() {
        this.stopBGM();
        this.stopMenuBGM();
    }
}

const audio = new AudioManager();
audio.init(); // 提前创建 AudioContext（suspended 状态），BGM 调度会在 resume 后播放

// ===== 游戏状态 (四态: menu / playing / paused / over) =====
let gameState = 'menu';
let score = 0;
let frameCount = 0;

// ===== 难度系统 =====
let difficultyLevel = 1;
let playingFrameCount = 0;
let enemySpawnInterval = 40;

// ===== 关卡系统 (Task 1) =====
let currentStage = 1;
let stageBossSpawned = false;
let stageTransitionTimer = 0;
const STAGE_DURATION = 5400; // 90秒 @ 60fps

// ===== 连击系统 (Task 2) =====
let comboCount = 0;
let lastKillTime = 0;
let scoreMultiplier = 1;
const COMBO_WINDOW = 90; // 1.5秒 @ 60fps
var scorePulseAlpha = 0; // 分数闪光脉冲
var lastComboMilestone = 0; // 记录上次触发的连击里程碑

// ===== 敌机类型枚举 =====
const ENEMY_TYPES = {
    SMALL:  { w:18, h:18, hp:1, speed:3,       canShoot:false, color:'#ff8800', score:5 },
    NORMAL: { w:28, h:30, hp:1, speedRange:[1,2.5], canShoot:0.35, color:'#ff7744', score:10 },
    HEAVY:  { w:36, h:38, hp:3, speed:0.8,     canShoot:true,  color:'#ff9933', score:20 },
    BOSS:   { w:60, h:50, hp:10, speed:0.5,    canShoot:true,  color:'#ff3355', score:100 },
    KAMIKAZE: { w: 16, h: 16, hp: 1, speed: 4.5, canShoot: false, color: '#ff2222', score: 8 },
    STEALTH:  { w: 24, h: 26, hp: 1, speedRange: [1.5, 3], canShoot: 0.3, color: '#88eeff', score: 15 },
    SPLITTER: { w: 26, h: 28, hp: 2, speed: 2, canShoot: false, color: '#55ff99', score: 12 }
};

// ===== Boss 计时 =====
let lastBossSpawnFrame = 0;
let bossCooldown = 0;

// ===== 最高分记录 =====
function loadHighScore() {
    return parseInt(localStorage.getItem('flightShooterHighScore')) || 0;
}
function saveHighScore(s) {
    const current = loadHighScore();
    if (s > current) {
        localStorage.setItem('flightShooterHighScore', s);
    }
}

// ===== 设置偏好 (Task 5) =====
function loadSettings() {
    try {
        const saved = localStorage.getItem('flightShooterSettings');
        if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return { volume: 100, screenShakeEnabled: true };
}

function saveSettings(settings) {
    localStorage.setItem('flightShooterSettings', JSON.stringify(settings));
}

let settings = loadSettings();

function onLoginSuccess(token, user) {
    if (typeof setToken === 'function') setToken(token);
    if (typeof setUser === 'function') setUser(user);
    currentUser = user;
    loggedIn = true;
    // 设置防幽灵点击保护（500ms内忽略canvas点击）
    loginTransitionGuard = true;
    setTimeout(function () { loginTransitionGuard = false; }, 500);
    if (typeof AuthUI !== 'undefined' && AuthUI.updateUserInfo) {
        AuthUI.updateUserInfo(user);
    }
    if (typeof AuthUI !== 'undefined' && AuthUI.hide) {
        AuthUI.hide();
    }
    // 登录后拉取服务端数据
    if (typeof fetchUserData === 'function') {
        fetchUserData().then(function (res) {
            if (res.success && res.data) {
                if (res.data.highScore > 0) {
                    saveHighScore(res.data.highScore);
                }
                if (res.data.settings && Object.keys(res.data.settings).length > 0) {
                    saveSettings(res.data.settings);
                    settings = loadSettings();
                    audio.setVolume(settings.volume / 100);
                }
            }
        }).catch(function () {});
    }
}

function onLogout() {
    if (typeof logout === 'function') logout();
    currentUser = null;
    loggedIn = false;
    if (typeof AuthUI !== 'undefined' && AuthUI.updateUserInfo) {
        AuthUI.updateUserInfo(null);
    }
    resetGameState();
    goToMenu();
}

function syncSettingsToServer() {
    if (loggedIn && typeof saveUserData === 'function') {
        saveUserData({ settings: settings }).catch(function () {});
    }
}

// ===== 新手引导 (Task 5) =====
let tutorialOpen = false;
function hasSeenTutorial() {
    return localStorage.getItem('flightShooterTutorial') === 'true';
}
function markTutorialSeen() {
    localStorage.setItem('flightShooterTutorial', 'true');
}

// ===== 屏幕震动 (Task 4) =====
let screenShake = 0;
const screenShakeIntensity = 4;
// Game Over 渐入控制
var gameOverFadeIn = 0;

// ===== 背景色调循环 =====
var bgHue = 220; // 起始蓝色色调

// ===== 游戏内星云（比菜单更淡，增加游戏氛围） =====
const gameNebula = [
    { x: 0.20, y: 0.15, r: 100, color: [30, 20, 80], speedX: 0.001, speedY: 0.0005 },
    { x: 0.80, y: 0.85, r: 120, color: [60, 10, 40], speedX: -0.0008, speedY: -0.0005 },
    { x: 0.50, y: 0.40, r: 80,  color: [10, 40, 60], speedX: 0.0005, speedY: -0.0008 },
    { x: 0.10, y: 0.70, r: 90,  color: [40, 10, 50], speedX: -0.0006, speedY: 0.0007 },
];

// ===== 玩家拖尾轨迹 =====
var playerTrail = [];
const PLAYER_TRAIL_MAX = 16;

// ===== 命中冻结帧 =====
var hitFreezeTimer = 0;
const HIT_FREEZE_MS = 4; // 约4帧的物理暂停

// ===== 游戏统计 (Task 3) =====
const stats = {
    enemiesKilled: 0,
    killedByType: {},
    survivalFrames: 0,
    powerupsCollected: 0,
    maxWeaponLevel: 1
};

// ===== 键盘输入 =====
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if (e.key === 'm' || e.key === 'M') {
        audio.toggleMute();
        return;
    }

    // 暂停键处理 (playing / paused)
    if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') &&
        (gameState === 'playing' || gameState === 'paused')) {
        e.preventDefault();
        if (gameState === 'playing') {
            gameState = 'paused';
        } else {
            gameState = 'playing';
        }
        return;
    }

    // 大招键 (E)
    if ((e.key === 'e' || e.key === 'E') && gameState === 'playing' && player.energy >= player.maxEnergy) {
        activateUltimate();
        return;
    }

    if (gameState === 'menu') {
        // 教程打开时，按任意键关闭教程
        if (tutorialOpen) {
            tutorialOpen = false;
            markTutorialSeen();
            return;
        }
        // 设置面板打开时，只响应 Esc 和 S 关闭
        if (settingsOpen) {
            if (e.key === 'Escape' || e.key === 's' || e.key === 'S') {
                settingsOpen = false;
            }
            return;
        }
        // 登录面板打开时，阻止键盘事件启动游戏
        var authOverlay = document.getElementById('authOverlay');
        if (authOverlay && authOverlay.style.display === 'flex') {
            return;
        }
        if (e.key === 's' || e.key === 'S') {
            settingsOpen = true;
            return;
        }
        // 未登录时，按任意键不能启动游戏
        if (!loggedIn) return;
        // 登录过渡期防幽灵点击
        if (loginTransitionGuard) return;
        audio.init();
        audio.resume();
        audio.startBGM();
        startGame();
        return;
    }

    if (gameState === 'over') {
        if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
            goToMenu();
        }
        return;
    }

    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

canvas.addEventListener('click', (e) => {
    // 先检查喇叭静音按钮和齿轮按钮（所有状态）
    const btnRadius = 14;
    const topRightY = 22;
    const muteCenterX = W - 22;
    const gearCenterX = W - 70;
    const rect0 = canvas.getBoundingClientRect();
    const scaleX0 = W / rect0.width;
    const scaleY0 = H / rect0.height;
    const cx0 = (e.clientX - rect0.left) * scaleX0;
    const cy0 = (e.clientY - rect0.top) * scaleY0;
    // 喇叭按钮
    if (cx0 >= muteCenterX - btnRadius && cx0 <= muteCenterX + btnRadius && cy0 >= topRightY - btnRadius && cy0 <= topRightY + btnRadius) {
        audio.toggleMute();
        return;
    }
    // 齿轮按钮
    if (cx0 >= gearCenterX - btnRadius && cx0 <= gearCenterX + btnRadius && cy0 >= topRightY - btnRadius && cy0 <= topRightY + btnRadius) {
        settingsOpen = !settingsOpen;
        return;
    }

    // 处理暂停按钮点击（触屏模式在 touchstart 处理）
    if (!isTouchDevice && gameState === 'playing') {
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        // 暂停按钮区域 (右上角，排除喇叭区域)
        if (cx >= W - 42 && cx <= W - 10 && cy >= 10 && cy <= 50) {
            gameState = 'paused';
            releaseWakeLock();
            return;
        }
    }

    audio.init();
    audio.resume();
    // 全屏请求
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
    if (gameState === 'menu') {
        // 教程打开时，点击关闭教程
        if (tutorialOpen) {
            tutorialOpen = false;
            markTutorialSeen();
            return;
        }
        if (settingsOpen) {
            // 点击设置面板中的元素由 draw 层处理交互，这里不做关闭
            return;
        }
        // 检查登录按钮（未登录时）
        if (!loggedIn) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = W / rect.width;
            const scaleY = H / rect.height;
            const cx = (e.clientX - rect.left) * scaleX;
            const cy = (e.clientY - rect.top) * scaleY;
            if (cx >= W / 2 - 75 && cx <= W / 2 + 75 && cy >= H * 0.86 && cy <= H * 0.86 + 36) {
                if (typeof AuthUI !== 'undefined' && AuthUI.show) {
                    AuthUI.show();
                }
                return;
            }
            // 未登录时，点击其他任何地方都不启动游戏
            return;
        }
        // 登录过渡期防幽灵点击
        if (loginTransitionGuard) return;
        audio.startBGM();
        startGame();
    } else if (gameState === 'over') {
        // 检查"再来一局"按钮区域
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        if (cx >= W / 2 - 80 && cx <= W / 2 + 80 && cy >= H / 2 + 200 && cy <= H / 2 + 230) {
            startGame();
        } else {
            goToMenu();
        }
    } else if (gameState === 'paused') {
        gameState = 'playing';
        requestWakeLock();
    }
});

// ===== 触屏控制 =====
let isTouching = false;
let touchId = null;
let touchStartX = 0;
let touchStartY = 0;
let touchPlayerStartX = 0;
let touchPlayerStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (touchId !== null) return;
    audio.init();
    audio.resume();

    // 全屏请求
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    }

    const touch = e.changedTouches[0];
    touchId = touch.identifier;

    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const canvasX = (touch.clientX - rect.left) * scaleX;
    const canvasY = (touch.clientY - rect.top) * scaleY;
    touchStartX = canvasX;
    touchStartY = canvasY;
    touchPlayerStartX = player.x;
    touchPlayerStartY = player.y;

    isTouching = true;

    // 右上角控制组统一定位
    const btnRadius = 14;
    const topRightY = 22;
    const muteCenterX = W - 22;
    const gearCenterX = W - 70;

    if (gameState === 'playing') {
        // 检查喇叭静音按钮
        if (canvasX >= muteCenterX - btnRadius && canvasX <= muteCenterX + btnRadius && canvasY >= topRightY - btnRadius && canvasY <= topRightY + btnRadius) {
            audio.toggleMute();
            return;
        }
        // 检查暂停按钮（右上角齿轮右侧到喇叭左侧之间）
        if (canvasX >= gearCenterX + btnRadius + 2 && canvasX <= muteCenterX - btnRadius - 2 && canvasY >= 10 && canvasY <= 50) {
            gameState = 'paused';
            releaseWakeLock();
            return;
        }
        // 检查大招按钮（右下角）
        if (canvasX >= W - 55 && canvasX <= W - 10 && canvasY >= H - 55 && canvasY <= H - 10) {
            if (player.energy >= player.maxEnergy) {
                activateUltimate();
                return;
            }
        }
    }

    if (gameState === 'menu') {
        // 检查喇叭静音按钮
        if (canvasX >= muteCenterX - btnRadius && canvasX <= muteCenterX + btnRadius && canvasY >= topRightY - btnRadius && canvasY <= topRightY + btnRadius) {
            audio.toggleMute();
            return;
        }
        // 检查齿轮设置按钮
        if (canvasX >= gearCenterX - btnRadius && canvasX <= gearCenterX + btnRadius && canvasY >= topRightY - btnRadius && canvasY <= topRightY + btnRadius) {
            settingsOpen = !settingsOpen;
            return;
        }
        // 教程打开时，触摸关闭教程
        if (tutorialOpen) {
            tutorialOpen = false;
            markTutorialSeen();
            return;
        }
        if (settingsOpen) {
            return;
        }
        // 检查登录按钮（未登录时）
        if (!loggedIn) {
            if (canvasX >= W / 2 - 75 && canvasX <= W / 2 + 75 && canvasY >= H * 0.86 && canvasY <= H * 0.86 + 36) {
                if (typeof AuthUI !== 'undefined' && AuthUI.show) {
                    AuthUI.show();
                }
                return;
            }
            // 未登录时，点击其他任何地方都不启动游戏
            return;
        }
        // 登录过渡期防幽灵点击
        if (loginTransitionGuard) return;
        audio.startBGM();
        startGame();
    } else if (gameState === 'over') {
        // 检查"再来一局"按钮区域
        if (canvasX >= W / 2 - 80 && canvasX <= W / 2 + 80 && canvasY >= H / 2 + 200 && canvasY <= H / 2 + 230) {
            startGame();
        } else {
            goToMenu();
        }
    } else if (gameState === 'paused') {
        gameState = 'playing';
        requestWakeLock();
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isTouching || gameState !== 'playing') return;

    let touch = null;
    for (const t of e.changedTouches) {
        if (t.identifier === touchId) {
            touch = t;
            break;
        }
    }
    if (!touch) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const currentX = (touch.clientX - rect.left) * scaleX;
    const currentY = (touch.clientY - rect.top) * scaleY;

    player.x = touchPlayerStartX + (currentX - touchStartX);
    player.y = touchPlayerStartY + (currentY - touchStartY);

    if (player.x < 20) player.x = 20;
    if (player.x > W - 20) player.x = W - 20;
    if (player.y < 20) player.y = 20;
    if (player.y > H - 20) player.y = H - 20;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (t.identifier === touchId) {
            isTouching = false;
            touchId = null;
            break;
        }
    }
}, { passive: false });

canvas.addEventListener('touchcancel', () => {
    isTouching = false;
    touchId = null;
});

// ===== Canvas 鼠标事件用于设置面板交互 =====
let mouseX = -1, mouseY = -1;
let isDraggingVolume = false;

canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'menu' || !settingsOpen) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    // 检查音量滑块点击
    const sliderX = 120;
    const sliderY = 270;
    const sliderW = 240;
    const sliderH = 20;
    if (cx >= sliderX && cx <= sliderX + sliderW && cy >= sliderY - 10 && cy <= sliderY + sliderH + 10) {
        isDraggingVolume = true;
        const vol = Math.max(0, Math.min(100, ((cx - sliderX) / sliderW) * 100));
        settings.volume = Math.round(vol);
        audio.setVolume(settings.volume / 100);
        saveSettings(settings);
        syncSettingsToServer();
    }

    // 检查震动开关
    const shakeBtnX = 300;
    const shakeBtnY = 320;
    const shakeBtnW = 60;
    const shakeBtnH = 30;
    if (cx >= shakeBtnX && cx <= shakeBtnX + shakeBtnW && cy >= shakeBtnY && cy <= shakeBtnY + shakeBtnH) {
        settings.screenShakeEnabled = !settings.screenShakeEnabled;
        saveSettings(settings);
        syncSettingsToServer();
    }

    // 检查关闭按钮
    const closeBtnX = 190;
    const closeBtnY = 520;
    const closeBtnW = 100;
    const closeBtnH = 40;
    if (cx >= closeBtnX && cx <= closeBtnX + closeBtnW && cy >= closeBtnY && cy <= closeBtnY + closeBtnH) {
        settingsOpen = false;
    }
});

canvas.addEventListener('mousemove', (e) => {
    // 鼠标移动可以触发 AudioContext resume（某些浏览器允许）
    audio.tryResume();

    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;

    if (!isDraggingVolume) return;
    const cx = mouseX;

    const sliderX = 120;
    const sliderW = 240;
    const vol = Math.max(0, Math.min(100, ((cx - sliderX) / sliderW) * 100));
    settings.volume = Math.round(vol);
    audio.setVolume(settings.volume / 100);
    saveSettings(settings);
    syncSettingsToServer();
});

document.addEventListener('mouseup', () => {
    isDraggingVolume = false;
});

// ===== 触屏事件用于设置面板交互 =====
canvas.addEventListener('touchstart', (e) => {
    if (gameState !== 'menu' || !settingsOpen) return;
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const cx = (touch.clientX - rect.left) * scaleX;
    const cy = (touch.clientY - rect.top) * scaleY;

    // 音量滑块
    const sliderX = 120;
    const sliderY = 270;
    const sliderW = 240;
    const sliderH = 20;
    if (cx >= sliderX && cx <= sliderX + sliderW && cy >= sliderY - 10 && cy <= sliderY + sliderH + 10) {
        isDraggingVolume = true;
        const vol = Math.max(0, Math.min(100, ((cx - sliderX) / sliderW) * 100));
        settings.volume = Math.round(vol);
        audio.setVolume(settings.volume / 100);
        saveSettings(settings);
        syncSettingsToServer();
    }

    // 震动开关
    const shakeBtnX = 300;
    const shakeBtnY = 320;
    const shakeBtnW = 60;
    const shakeBtnH = 30;
    if (cx >= shakeBtnX && cx <= shakeBtnX + shakeBtnW && cy >= shakeBtnY && cy <= shakeBtnY + shakeBtnH) {
        settings.screenShakeEnabled = !settings.screenShakeEnabled;
        saveSettings(settings);
        syncSettingsToServer();
    }

    // 关闭按钮
    const closeBtnX = 190;
    const closeBtnY = 520;
    const closeBtnW = 100;
    const closeBtnH = 40;
    if (cx >= closeBtnX && cx <= closeBtnX + closeBtnW && cy >= closeBtnY && cy <= closeBtnY + closeBtnH) {
        settingsOpen = false;
    }
}, { passive: false });

// ===== 星空背景 =====
class Star {
    constructor() { this.reset(true); }
    reset(init) {
        this.x = Math.random() * W;
        this.y = init ? Math.random() * H : -2;
        this.twinkleSpeed = Math.random() * 0.03 + 0.01;
        this.twinklePhase = Math.random() * Math.PI * 2;
        // 层：0=远层(小/慢), 1=中层(中), 2=近层(大/快)
        this.layer = Math.floor(Math.random() * 3);
        if (this.layer === 0) {
            this.size = Math.random() * 1.2 + 0.3;
            this.speed = this.size * 0.15 + 0.05;
            this.baseAlpha = Math.random() * 0.4 + 0.2;
        } else if (this.layer === 1) {
            this.size = Math.random() * 1.5 + 0.8;
            this.speed = this.size * 0.25 + 0.15;
            this.baseAlpha = Math.random() * 0.5 + 0.4;
        } else {
            this.size = Math.random() * 2 + 1.5;
            this.speed = this.size * 0.3 + 0.3;
            this.baseAlpha = Math.random() * 0.6 + 0.4;
        }
        this.alpha = this.baseAlpha;
        const colorRand = Math.random();
        if (colorRand < 0.15) this.color = { r: 200, g: 220, b: 255 }; // 淡蓝
        else if (colorRand < 0.3) this.color = { r: 255, g: 240, b: 200 }; // 淡黄
        else this.color = { r: 255, g: 255, b: 255 }; // 白色
        if (this.size > 1.8) this.color = { r: 255, g: 220, b: 180 }; // 亮星偏暖
    }
    update() {
        this.y += this.speed;
        this.twinklePhase += this.twinkleSpeed;
        this.alpha = this.baseAlpha + Math.sin(this.twinklePhase) * 0.3;
        if (this.alpha < 0) this.alpha = 0;
        if (this.alpha > 1) this.alpha = 1;
        if (this.y > H) this.reset(false);
    }
    draw() {
        ctx.fillStyle = `rgba(${this.color.r},${this.color.g},${this.color.b},${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        // 中/近层星星加光晕
        if (this.layer >= 1 && this.alpha > 0.4) {
            ctx.fillStyle = `rgba(${this.color.r},${this.color.g},${this.color.b},${this.alpha * 0.12})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (this.layer === 2 ? 3 : 2), 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

const stars = [];
for (let i = 0; i < 250; i++) {
    stars.push(new Star());
}

// ===== 粒子系统 =====
class Particle {
    constructor(x, y, vx, vy, color, life, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = size || 3;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life--;
        return this.life > 0;
    }
    draw() {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha * 0.8;
        // 外发光
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha * 1.8, 0, Math.PI * 2);
        ctx.fill();
        // 核心亮点
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

let particles = [];

function spawnExplosion(x, y, color, count) {
    // 粒子上限控制
    if (particles.length > 200) return;
    count = Math.floor(count * 1.2);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1.5;
        const life = Math.floor(Math.random() * 12 + 10);
        const size = Math.random() * 4 + 1;
        particles.push(new Particle(
            x + (Math.random() - 0.5) * 10,
            y + (Math.random() - 0.5) * 10,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            color, life, size
        ));
    }
}

function spawnBulletTrail(x, y) {
    // 粒子上限控制
    if (particles.length > 200) return;
    for (let i = 0; i < 3; i++) {
        particles.push(new Particle(
            x + (Math.random() - 0.5) * 4,
            y + (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 0.3,
            Math.random() * 1 + 0.5,
            '#ffcc00',
            10,
            Math.random() * 2 + 1
        ));
    }
}

// ===== 命中闪光粒子 =====
function spawnHitSpark(x, y, color) {
    if (particles.length > 250) return;
    for (var i = 0; i < 6; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = Math.random() * 3 + 1;
        var life = Math.floor(Math.random() * 8 + 5);
        var size = Math.random() * 3 + 1;
        particles.push(new Particle(
            x + (Math.random() - 0.5) * 4,
            y + (Math.random() - 0.5) * 4,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            color, life, size
        ));
    }
    // 白色核心闪光
    for (var i = 0; i < 3; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = Math.random() * 2 + 0.5;
        particles.push(new Particle(
            x + (Math.random() - 0.5) * 2,
            y + (Math.random() - 0.5) * 2,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            '#ffffff', 6, 2.5
        ));
    }
}

// ===== 得分飘字 =====
var floatTexts = [];
function addFloatText(x, y, text, color) {
    floatTexts.push({
        x: x,
        y: y,
        text: text,
        color: color || '#ffdd44',
        life: 45,
        maxLife: 45,
        vy: -2
    });
}

// ===== 玩家入场缩放 =====
var playerSpawnScale = 1;

// ===== 玩家 =====
const player = {
    x: W / 2,
    y: H - 80,
    w: 30,
    h: 36,
    speed: 5,
    bulletCooldown: 0,
    bulletDelay: 10,
    originalBulletDelay: 10,
    hp: 5,
    maxHp: 5,
    invincible: false,
    invincibleTimer: 0,
    shield: false,
    spreadActive: false,
    spreadTimer: 0,
    powerActive: false,
    powerTimer: 0,
    // Task 2: 武器升级系统
    weaponLevel: 1,
    energy: 0,
    maxEnergy: 100
};

// ===== 大招系统 (Task 3) =====
let ultimateFlashTimer = 0;

// ===== 武器升级提示 =====
let upgradeNotification = 0; // 剩余显示帧数

function drawPlayer() {
    const px = player.x;
    const py = player.y;

    ctx.save();

    // 入场缩放动画
    if (playerSpawnScale < 1) {
        ctx.translate(px, py);
        ctx.scale(playerSpawnScale, playerSpawnScale);
        ctx.translate(-px, -py);
    }

    // 无敌帧闪烁
    if (player.invincible) {
        const blink = Math.sin(frameCount * 0.3);
        if (blink <= 0) {
            ctx.globalAlpha = 0.25;
        }
    }

    // 玩家引擎拖尾轨迹
    for (var ti = 0; ti < playerTrail.length; ti++) {
        var tp = playerTrail[ti];
        var trailAlpha = (1 - ti / playerTrail.length) * 0.15;
        var trailSize = 2 + (1 - ti / playerTrail.length) * 4;
        ctx.fillStyle = 'rgba(68, 136, 255, ' + trailAlpha + ')';
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, trailSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // 护盾视觉效果（动态六边形旋转）
    if (player.shield) {
        var shieldPulse = Math.sin(frameCount * 0.08) * 0.15 + 0.85;
        ctx.strokeStyle = 'rgba(68, 68, 255, ' + (0.5 * shieldPulse) + ')';
        ctx.lineWidth = 2.5;
        // 六边形护盾
        var sides = 6;
        ctx.beginPath();
        for (var si = 0; si <= sides; si++) {
            var a = (si / sides) * Math.PI * 2 + frameCount * 0.02;
            var sx = px + Math.cos(a) * 28;
            var sy = py + Math.sin(a) * 28;
            if (si === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.stroke();
        // 外层旋转光晕
        ctx.strokeStyle = 'rgba(100, 100, 255, ' + (0.15 * shieldPulse) + ')';
        ctx.lineWidth = 1;
        sides = 6;
        ctx.beginPath();
        for (var si = 0; si <= sides; si++) {
            var a = (si / sides) * Math.PI * 2 - frameCount * 0.015;
            var sx = px + Math.cos(a) * 34;
            var sy = py + Math.sin(a) * 34;
            if (si === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.stroke();
    }

    // 机翼尖光晕
    var wingGlowPulse = Math.sin(frameCount * 0.06) * 0.3 + 0.7;
    var wingGrad = ctx.createRadialGradient(px - 15, py + 18, 1, px - 15, py + 18, 8);
    wingGrad.addColorStop(0, 'rgba(100, 180, 255, ' + (0.4 * wingGlowPulse) + ')');
    wingGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.arc(px - 15, py + 18, 8, 0, Math.PI * 2);
    ctx.fill();
    var wingGrad2 = ctx.createRadialGradient(px + 15, py + 18, 1, px + 15, py + 18, 8);
    wingGrad2.addColorStop(0, 'rgba(100, 180, 255, ' + (0.4 * wingGlowPulse) + ')');
    wingGrad2.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = wingGrad2;
    ctx.beginPath();
    ctx.arc(px + 15, py + 18, 8, 0, Math.PI * 2);
    ctx.fill();

    // 发光效果
    const glow = ctx.createRadialGradient(px, py + 10, 5, px, py + 10, 40);
    glow.addColorStop(0, 'rgba(0, 100, 255, 0.2)');
    glow.addColorStop(1, 'rgba(0, 100, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py + 10, 40, 0, Math.PI * 2);
    ctx.fill();

    // 动态引擎粒子（增强版）
    var engineParticleCount = 5 + Math.floor(Math.sin(frameCount * 0.15) * 3);
    for (var epi = 0; epi < engineParticleCount; epi++) {
        var epx = px + (Math.random() - 0.5) * 14;
        var epy = py + 16 + Math.random() * 12;
        var epSize = 1.5 + Math.random() * 4;
        var epColors = ['rgba(100, 180, 255, ', 'rgba(150, 220, 255, ', 'rgba(50, 100, 255, '];
        var epColor = epColors[Math.floor(Math.random() * epColors.length)];
        ctx.fillStyle = epColor + (0.15 + Math.random() * 0.4) + ')';
        ctx.beginPath();
        ctx.arc(epx, epy, epSize, 0, Math.PI * 2);
        ctx.fill();
    }
    // 额外尾焰粒子（底部拖尾）
    for (var epi2 = 0; epi2 < 4; epi2++) {
        var epx2 = px + (Math.random() - 0.5) * 8;
        var epy2 = py + 22 + Math.random() * 15;
        ctx.fillStyle = 'rgba(200, 230, 255, ' + (0.05 + Math.random() * 0.1) + ')';
        ctx.beginPath();
        ctx.arc(epx2, epy2, 1 + Math.random() * 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // 机身 - 蓝色三角形箭头
    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    ctx.moveTo(px, py - 18);
    ctx.lineTo(px + 15, py + 18);
    ctx.lineTo(px + 5, py + 10);
    ctx.lineTo(px, py + 14);
    ctx.lineTo(px - 5, py + 10);
    ctx.lineTo(px - 15, py + 18);
    ctx.closePath();
    ctx.fill();

    // 边缘高光
    ctx.strokeStyle = '#88bbff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py - 18);
    ctx.lineTo(px + 15, py + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px, py - 18);
    ctx.lineTo(px - 15, py + 18);
    ctx.stroke();

    // 驾驶舱光点
    ctx.fillStyle = '#aaccff';
    ctx.beginPath();
    ctx.arc(px, py - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // 机身中心高光线
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py - 12);
    ctx.lineTo(px, py + 8);
    ctx.stroke();

    ctx.restore();
}

function updatePlayer() {
    if (gameState !== 'playing') return;

    // 无敌倒计时
    if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) {
            player.invincible = false;
        }
    }

    // 散射倒计时
    if (player.spreadActive) {
        player.spreadTimer--;
        if (player.spreadTimer <= 0) {
            player.spreadActive = false;
        }
    }

    // 火力强化倒计时
    if (player.powerActive) {
        player.powerTimer--;
        if (player.powerTimer <= 0) {
            player.powerActive = false;
            player.bulletDelay = player.originalBulletDelay;
        }
    }

    let dx = 0, dy = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx = -1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx = 1;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy = -1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy = 1;

    if (dx && dy) {
        dx *= 0.707;
        dy *= 0.707;
    }

    player.x += dx * player.speed;
    player.y += dy * player.speed;

    if (player.x < 20) player.x = 20;
    if (player.x > W - 20) player.x = W - 20;
    if (player.y < 20) player.y = 20;
    if (player.y > H - 20) player.y = H - 20;

    if (player.bulletCooldown > 0) player.bulletCooldown--;
    const shouldShoot = keys[' '] || keys['Spacebar'] || isTouching;
    if (shouldShoot && player.bulletCooldown === 0) {
        shoot();
        player.bulletCooldown = player.bulletDelay;
    }

    // 更新玩家拖尾
    playerTrail.unshift({ x: player.x, y: player.y });
    if (playerTrail.length > PLAYER_TRAIL_MAX) playerTrail.pop();

    // 入场缩放动画
    if (playerSpawnScale < 1) {
        playerSpawnScale += (1 - playerSpawnScale) * 0.12;
        if (playerSpawnScale > 0.98) playerSpawnScale = 1;
    }
}

// ===== 子弹 =====
let bullets = [];

function shoot() {
    const lv = player.weaponLevel;

    // 如果散射激活，覆盖武器等级逻辑
    if (player.spreadActive) {
        const spreadAngle = 15 * Math.PI / 180;
        for (let i = -1; i <= 1; i++) {
            const angle = i * spreadAngle;
            bullets.push({
                x: player.x,
                y: player.y - 20,
                w: 4,
                h: 12,
                vx: Math.sin(angle) * 8,
                vy: Math.cos(angle) * 8,
                damage: 1
            });
        }
        audio.playShoot();
        return;
    }

    switch (lv) {
        case 1:
            // Lv1: 单发, w=4, damage=1
            bullets.push({
                x: player.x, y: player.y - 20,
                w: 4, h: 12, speed: 8, damage: 1
            });
            break;
        case 2:
            // Lv2: 单发, w=6, damage=2
            bullets.push({
                x: player.x, y: player.y - 20,
                w: 6, h: 14, speed: 8, damage: 2
            });
            break;
        case 3:
            // Lv3: 双发并行（间隔10px）, damage=2
            bullets.push({
                x: player.x - 5, y: player.y - 20,
                w: 6, h: 14, speed: 8, damage: 2
            });
            bullets.push({
                x: player.x + 5, y: player.y - 20,
                w: 6, h: 14, speed: 8, damage: 2
            });
            break;
        case 4:
            // Lv4: 双发, w=8, damage=3, 射速提升
            bullets.push({
                x: player.x - 5, y: player.y - 20,
                w: 8, h: 16, speed: 9, damage: 3
            });
            bullets.push({
                x: player.x + 5, y: player.y - 20,
                w: 8, h: 16, speed: 9, damage: 3
            });
            break;
        case 5:
            // Lv5: 三发并行, w=8, damage=3, 射速最大
            bullets.push({
                x: player.x, y: player.y - 20,
                w: 8, h: 16, speed: 10, damage: 3
            });
            bullets.push({
                x: player.x - 10, y: player.y - 18,
                w: 8, h: 16, speed: 10, damage: 3
            });
            bullets.push({
                x: player.x + 10, y: player.y - 18,
                w: 8, h: 16, speed: 10, damage: 3
            });
            break;
    }
    audio.playShoot();
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (b.vy !== undefined) {
            b.x += b.vx || 0;
            b.y -= b.vy;
        } else {
            b.y -= b.speed;
        }
        spawnBulletTrail(b.x, b.y);
        if (b.y + b.h < 0 || b.x < -20 || b.x > W + 20) {
            bullets.splice(i, 1);
        }
    }
}

function drawBullets() {
    for (const b of bullets) {
        // 子弹拖尾
        ctx.fillStyle = 'rgba(255, 200, 50, 0.15)';
        ctx.beginPath();
        ctx.arc(b.x, b.y + b.h * 0.8, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 200, 50, 0.3)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        ctx.fill();

        const grad = ctx.createLinearGradient(b.x, b.y - b.h / 2, b.x, b.y + b.h / 2);
        grad.addColorStop(0, '#ffff80');
        grad.addColorStop(0.5, '#ffcc00');
        grad.addColorStop(1, '#ff8800');
        ctx.fillStyle = grad;
        ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    }
}

// ===== 敌人 =====
let enemies = [];
let enemyBullets = [];
let bossLasers = [];

class Enemy {
    constructor(type) {
        const config = ENEMY_TYPES[type] || ENEMY_TYPES.NORMAL;
        this.type = type;
        this.w = config.w;
        this.h = config.h;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.x = Math.random() * (W - 40) + 20;
        this.y = -this.h;
        this.color = config.color;
        this.scoreValue = config.score;
        this.targetX = player.x;
        this.targetY = player.y;
        this.isKamikaze = (type === 'KAMIKAZE');

        // 入场缩放动画
        this.spawnScale = 0;
        this.spawnMaxScale = 1;

        if (config.speedRange) {
            this.speed = config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]);
        } else {
            this.speed = config.speed;
        }
        this.speed *= (1 + (difficultyLevel - 1) * 0.2);

        if (typeof config.canShoot === 'number') {
            const shootProb = config.canShoot + (difficultyLevel - 1) * 0.05;
            this.canShoot = Math.random() < Math.min(shootProb, 0.8);
        } else {
            this.canShoot = config.canShoot;
        }

        this.shootTimer = Math.floor(Math.random() * 40) + 50;
        this.shakeX = 0;
    }
}

function chooseEnemyType() {
    const rand = Math.random();
    if (difficultyLevel <= 2) {
        if (rand < 0.2) return 'SMALL';
        if (rand < 0.5) return 'NORMAL';
        if (rand < 0.7) return 'HEAVY';
        if (rand < 0.8) return 'KAMIKAZE';
        if (rand < 0.9) return 'STEALTH';
        return 'SPLITTER';
    } else if (difficultyLevel <= 4) {
        if (rand < 0.2) return 'SMALL';
        if (rand < 0.4) return 'NORMAL';
        if (rand < 0.55) return 'HEAVY';
        if (rand < 0.7) return 'KAMIKAZE';
        if (rand < 0.85) return 'STEALTH';
        return 'SPLITTER';
    } else {
        if (rand < 0.2) return 'SMALL';
        if (rand < 0.4) return 'NORMAL';
        if (rand < 0.55) return 'HEAVY';
        if (rand < 0.7) return 'KAMIKAZE';
        if (rand < 0.8) return 'STEALTH';
        return 'SPLITTER';
    }
}

function spawnEnemy(type) {
    enemies.push(new Enemy(type || chooseEnemyType()));
}

function updateEnemies() {
    enemySpawnInterval = Math.max(20, 40 - (difficultyLevel - 1) * 3);

    // 关卡 Boss 生成
    if (playingFrameCount > 0 && playingFrameCount % STAGE_DURATION === 0 && !stageBossSpawned && gameState === 'playing') {
        const boss = new Enemy('BOSS');
        boss.type = 'STAGE_BOSS';
        boss.w = 70;
        boss.h = 60;
        boss.hp = 10 + currentStage * 5;
        boss.maxHp = boss.hp;
        boss.speed = 0.4;
        boss.canShoot = true;
        boss.color = '#ff4488';
        boss.scoreValue = 200 + currentStage * 50;
        enemies.push(boss);
        stageBossSpawned = true;
        stageTransitionTimer = 120;
        // 清除普通敌机（保留 Boss）
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (enemies[i].type !== 'STAGE_BOSS' && enemies[i].type !== 'BOSS') {
                enemies.splice(i, 1);
            }
        }
    }

    if (frameCount - lastBossSpawnFrame >= 1800 && gameState === 'playing') {
        spawnEnemy('BOSS');
        lastBossSpawnFrame = frameCount;
        bossCooldown = 180;
    }

    if (stageBossSpawned) {
        // 关卡 Boss 存在时不生成普通敌机
    } else if (bossCooldown > 0) {
        bossCooldown--;
    } else {
        enemySpawnTimer++;
        if (enemySpawnTimer >= enemySpawnInterval) {
            enemySpawnTimer = 0;
            if (gameState === 'playing') spawnEnemy();
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.y += e.speed;
        e.shakeX = Math.sin(e.y * 0.05) * 2;

        // 入场缩放动画（快速弹性弹出）
        if (e.spawnScale < e.spawnMaxScale) {
            e.spawnScale += (e.spawnMaxScale - e.spawnScale) * 0.25;
            if (e.spawnScale > e.spawnMaxScale * 0.95) e.spawnScale = e.spawnMaxScale;
        }

        // 自爆机：追踪玩家
        if (e.type === 'KAMIKAZE') {
            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                const speed = e.speed * (1 + (difficultyLevel - 1) * 0.15);
                e.x += (dx / dist) * speed;
                e.y += (dy / dist) * speed;
            }
            // 接触玩家爆炸
            if (rectCollide({ x: e.x, y: e.y, w: e.w, h: e.h }, { x: player.x, y: player.y, w: player.w, h: player.h })) {
                spawnExplosion(e.x, e.y, '#ff4400', 15);
                spawnExplosion(e.x, e.y, '#ffaa00', 10);
                damagePlayer();
                enemies.splice(i, 1);
                continue;
            }
        }

        // 隐形机：Z字形移动
        if (e.type === 'STEALTH') {
            e.x += Math.sin(e.y * 0.04) * 1.5;
            if (e.x < 20) e.x = 20;
            if (e.x > W - 20) e.x = W - 20;
        }

        if (e.canShoot && gameState === 'playing') {
            e.shootTimer--;
            if (e.shootTimer <= 0) {
                if (e.type === 'STAGE_BOSS') {
                    const isEnraged = e.hp < e.maxHp / 2;
                    // 20% 概率生成旋转激光
                    if (Math.random() < 0.2) {
                        bossLasers.push({
                            x: e.x,
                            y: e.y + e.h / 2,
                            angle: Math.atan2(player.y - e.y, player.x - e.x),
                            length: 300,
                            active: true,
                            timer: 30
                        });
                    } else {
                        const numBullets = isEnraged ? 6 : 3;
                        const spreadAngle = isEnraged ? Math.PI / 3 : Math.PI / 6;
                        const bSpeed = isEnraged ? 3 : 2.5;
                        for (let bi = 0; bi < numBullets; bi++) {
                            const angleOffset = isEnraged ? (Math.random() - 0.5) * 0.3 : 0;
                            const angle = (numBullets === 1) ? 0 : -spreadAngle / 2 + (spreadAngle / (numBullets - 1)) * bi + angleOffset;
                            enemyBullets.push({
                                x: e.x,
                                y: e.y + e.h / 2,
                                w: isEnraged ? 6 : 5,
                                h: isEnraged ? 10 : 8,
                                vx: Math.sin(angle) * bSpeed,
                                vy: Math.cos(angle) * bSpeed
                            });
                        }
                    }
                    e.shootTimer = Math.floor(Math.random() * (isEnraged ? 15 : 30)) + (isEnraged ? 15 : 30);
                } else if (e.type === 'BOSS') {
                    const isEnraged = e.hp < e.maxHp / 2;
                    const numBullets = isEnraged ? 6 : (3 + Math.floor(Math.random() * 3));
                    const spreadAngle = isEnraged ? Math.PI / 3 : Math.PI / 4;
                    const bSpeed = isEnraged ? 3 : 2.5;
                    for (let bi = 0; bi < numBullets; bi++) {
                        const angleOffset = isEnraged ? (Math.random() - 0.5) * 0.3 : 0;
                        const angle = (numBullets === 1) ? 0 : -spreadAngle / 2 + (spreadAngle / (numBullets - 1)) * bi + angleOffset;
                        enemyBullets.push({
                            x: e.x,
                            y: e.y + e.h / 2,
                            w: isEnraged ? 6 : 5,
                            h: isEnraged ? 10 : 8,
                            vx: Math.sin(angle) * bSpeed,
                            vy: Math.cos(angle) * bSpeed
                        });
                    }
                    e.shootTimer = Math.floor(Math.random() * (isEnraged ? 20 : 40)) + (isEnraged ? 20 : 40);
                } else {
                    enemyBullets.push({
                        x: e.x,
                        y: e.y + e.h / 2,
                        w: 5,
                        h: 8,
                        speed: 3
                    });
                    e.shootTimer = Math.floor(Math.random() * 60) + 50;
                }
            }
        }

        if (e.y > H + 50) {
            enemies.splice(i, 1);
        }
    }
}

function drawEnemies() {
    for (const e of enemies) {
        const ex = e.x + e.shakeX;
        const ey = e.y;

        ctx.save();

        // 入场缩放
        if (e.spawnScale < 1) {
            ctx.translate(ex, ey);
            ctx.scale(e.spawnScale, e.spawnScale);
            ctx.translate(-ex, -ey);
        }

        // 所有敌人共用：径向光晕背景
        const glow = ctx.createRadialGradient(ex, ey, 2, ex, ey, e.w * 1.0);
        glow.addColorStop(0, e.color + '44');
        glow.addColorStop(1, e.color + '00');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ex, ey, e.w, 0, Math.PI * 2);
        ctx.fill();

        // ===== 按类型绘制 =====
        if (e.type === 'SMALL') {
            // --- 小型侦察无人机：圆盘+天线 ---
            // 机身圆形
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(ex, ey, e.w * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            // 天线
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(ex, ey - e.w * 0.35);
            ctx.lineTo(ex, ey - e.w * 0.55);
            ctx.stroke();
            // 天线顶端小球
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ex, ey - e.w * 0.55, 1.5, 0, Math.PI * 2);
            ctx.fill();
            // 发光核心
            ctx.fillStyle = 'rgba(255,255,200,0.3)';
            ctx.beginPath();
            ctx.arc(ex, ey, e.w * 0.15, 0, Math.PI * 2);
            ctx.fill();

        } else if (e.type === 'NORMAL') {
            // --- 标准战机：箭头+双引擎 ---
            const s = e.w * 0.35;
            const hh = e.h * 0.38;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.moveTo(ex, ey - hh);
            ctx.lineTo(ex + s * 1.1, ey + hh * 0.5);
            ctx.lineTo(ex + s * 0.5, ey + hh * 0.2);
            ctx.lineTo(ex, ey + hh * 0.5);
            ctx.lineTo(ex - s * 0.5, ey + hh * 0.2);
            ctx.lineTo(ex - s * 1.1, ey + hh * 0.5);
            ctx.closePath();
            ctx.fill();
            // 双引擎
            ctx.fillStyle = 'rgba(100,180,255,0.4)';
            ctx.beginPath();
            ctx.arc(ex - s * 0.3, ey + hh * 0.5, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex + s * 0.3, ey + hh * 0.5, 3, 0, Math.PI * 2);
            ctx.fill();
            // 边缘高光
            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ex, ey - hh);
            ctx.lineTo(ex + s * 1.1, ey + hh * 0.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ex, ey - hh);
            ctx.lineTo(ex - s * 1.1, ey + hh * 0.5);
            ctx.stroke();

        } else if (e.type === 'HEAVY') {
            // --- 重型装甲：六边形+装甲线 ---
            const r = Math.max(e.w, e.h) * 0.45;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            for (let hi = 0; hi < 6; hi++) {
                const a = hi / 6 * Math.PI * 2 - Math.PI / 6;
                const px = ex + Math.cos(a) * r;
                const py = ey + Math.sin(a) * r * 0.85;
                if (hi === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            // 装甲描边
            ctx.strokeStyle = 'rgba(200,200,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            // 内部装甲交叉线
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ex - r * 0.5, ey - r * 0.4);
            ctx.lineTo(ex + r * 0.5, ey - r * 0.4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ex - r * 0.4, ey - r * 0.2);
            ctx.lineTo(ex + r * 0.4, ey - r * 0.2);
            ctx.stroke();
            // 核心
            ctx.fillStyle = 'rgba(255,200,100,0.3)';
            ctx.beginPath();
            ctx.arc(ex, ey, r * 0.2, 0, Math.PI * 2);
            ctx.fill();

        } else if (e.type === 'KAMIKAZE') {
            // --- 自爆机：炸弹造型 ---
            const r = e.w * 0.4;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(ex, ey + r * 0.1, r, 0, Math.PI * 2);
            ctx.fill();
            // 引信
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ex, ey - r * 0.7);
            ctx.quadraticCurveTo(ex + 4, ey - r * 0.9, ex + 6, ey - r * 0.75);
            ctx.stroke();
            // 引信火花
            const sparkPulse = Math.sin(frameCount * 0.15) * 0.3 + 0.7;
            ctx.fillStyle = 'rgba(255,200,50,' + sparkPulse + ')';
            ctx.beginPath();
            ctx.arc(ex + 6, ey - r * 0.75, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,200,' + (sparkPulse * 0.4) + ')';
            ctx.beginPath();
            ctx.arc(ex + 6, ey - r * 0.75, 5, 0, Math.PI * 2);
            ctx.fill();
            // 骷髅标记
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☠', ex, ey);

        } else if (e.type === 'STEALTH') {
            // --- 隐形机：幽灵新月 ---
            const stealthAlpha = 0.35 + Math.sin(e.y * 0.08) * 0.15;
            ctx.globalAlpha = stealthAlpha;
            ctx.shadowColor = e.color;
            ctx.shadowBlur = 8 + Math.sin(e.y * 0.05) * 4;
            // 新月形（使用反向绕圈形成空心）
            const sr = e.w * 0.45;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(ex, ey, sr, 0, Math.PI * 2);               // 外圈顺时针
            ctx.arc(ex + sr * 0.35, ey - sr * 0.1, sr * 0.65, 0, Math.PI * 2, true); // 内圈逆时针形成缺口
            ctx.fill('evenodd');
            // 边缘光晕
            ctx.shadowBlur = 0;
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(ex, ey, sr + 2, 0, Math.PI * 2);
            ctx.stroke();

        } else if (e.type === 'SPLITTER') {
            // --- 分裂机：三角水晶 ---
            const sr2 = e.w * 0.5;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.moveTo(ex, ey - sr2);
            ctx.lineTo(ex + sr2 * 0.8, ey + sr2 * 0.5);
            ctx.lineTo(ex, ey + sr2 * 0.3);
            ctx.lineTo(ex - sr2 * 0.8, ey + sr2 * 0.5);
            ctx.closePath();
            ctx.fill();
            // 内部斜线（水晶纹理）
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ex, ey - sr2);
            ctx.lineTo(ex, ey + sr2 * 0.3);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ex - sr2 * 0.3, ey - sr2 * 0.2);
            ctx.lineTo(ex + sr2 * 0.3, ey + sr2 * 0.1);
            ctx.stroke();
            // 晶体核心光
            const crystalPulse = Math.sin(frameCount * 0.06) * 0.3 + 0.7;
            ctx.fillStyle = 'rgba(100,255,180,' + (0.2 * crystalPulse) + ')';
            ctx.beginPath();
            ctx.arc(ex, ey, sr2 * 0.2, 0, Math.PI * 2);
            ctx.fill();

        } else if (e.type === 'SPLIT') {
            // --- 分裂子机：小菱形 ---
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.moveTo(ex, ey - e.h / 2);
            ctx.lineTo(ex + e.w / 2, ey);
            ctx.lineTo(ex, ey + e.h / 2);
            ctx.lineTo(ex - e.w / 2, ey);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();

        } else if (e.type === 'BOSS' || e.type === 'STAGE_BOSS') {
            // ===== BOSS：暗黑战舰 — 霸气 + 邪恶 =====
            const isStage = e.type === 'STAGE_BOSS';
            const scale = isStage ? 1.15 : 1.0;
            const bw = e.w * scale;
            const bh = e.h * scale;
            const bx = ex;
            const by = ey;

            // ---- 1. 黑暗能量光环 ----
            const bossAuraPulse = Math.sin(frameCount * 0.03) * 0.15 + 0.85;
            const auraColor = isStage ? 'rgba(200,30,100,' : 'rgba(200,30,30,';
            // 外层大光环
            let auraGrad = ctx.createRadialGradient(bx, by, 5, bx, by, bw * 1.4);
            auraGrad.addColorStop(0, auraColor + (0.15 * bossAuraPulse) + ')');
            auraGrad.addColorStop(1, auraColor + '0)');
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(bx, by, bw * 1.4, 0, Math.PI * 2);
            ctx.fill();

            // ---- 2. 主体：宽体邪恶暗色战舰 ----
            // 主舰体 - 深色宽体
            const bodyColor = isStage ? '#441122' : '#331122';
            const hlColor = isStage ? '#ff3377' : '#ff3333';
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            // 倒三角宽体
            ctx.moveTo(bx, by - bh * 0.5);       // 顶部
            ctx.lineTo(bx + bw * 0.5, by + bh * 0.2); // 右翼
            ctx.lineTo(bx + bw * 0.35, by + bh * 0.5); // 右下
            ctx.lineTo(bx - bw * 0.35, by + bh * 0.5); // 左下
            ctx.lineTo(bx - bw * 0.5, by + bh * 0.2); // 左翼
            ctx.closePath();
            ctx.fill();
            // 外围描边
            ctx.strokeStyle = hlColor;
            ctx.lineWidth = isStage ? 2.5 : 2;
            ctx.shadowColor = hlColor;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(bx, by - bh * 0.5);
            ctx.lineTo(bx + bw * 0.5, by + bh * 0.2);
            ctx.lineTo(bx + bw * 0.35, by + bh * 0.5);
            ctx.lineTo(bx - bw * 0.35, by + bh * 0.5);
            ctx.lineTo(bx - bw * 0.5, by + bh * 0.2);
            ctx.closePath();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // ---- 3. 顶部恶魔角/皇冠 ----
            ctx.fillStyle = isStage ? '#ff3377' : '#ff4444';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 10;
            // 左侧角
            ctx.beginPath();
            ctx.moveTo(bx - bw * 0.2, by - bh * 0.45);
            ctx.lineTo(bx - bw * 0.35, by - bh * 0.75);
            ctx.lineTo(bx - bw * 0.1, by - bh * 0.45);
            ctx.closePath();
            ctx.fill();
            // 右侧角
            ctx.beginPath();
            ctx.moveTo(bx + bw * 0.2, by - bh * 0.45);
            ctx.lineTo(bx + bw * 0.35, by - bh * 0.75);
            ctx.lineTo(bx + bw * 0.1, by - bh * 0.45);
            ctx.closePath();
            ctx.fill();
            // 中间尖刺
            ctx.beginPath();
            ctx.moveTo(bx, by - bh * 0.5);
            ctx.lineTo(bx, by - bh * 0.85);
            ctx.lineTo(bx + bw * 0.08, by - bh * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // ---- 4. 邪恶之眼（核心） ----
            const eyePulse = Math.sin(frameCount * 0.06) * 0.2 + 0.8;
            // 眼白（红色）
            ctx.fillStyle = isStage ? '#ff2255' : '#ff2222';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 20 + 10 * eyePulse;
            ctx.beginPath();
            ctx.ellipse(bx, by - bh * 0.1, bw * 0.12, bh * 0.08, 0, 0, Math.PI * 2);
            ctx.fill();
            // 瞳孔（黑色竖线）
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000000';
            ctx.fillRect(bx - 2, by - bh * 0.14, 4, bh * 0.08);
            // 瞳孔高光
            ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * eyePulse) + ')';
            ctx.beginPath();
            ctx.arc(bx - bw * 0.03, by - bh * 0.11, 2, 0, Math.PI * 2);
            ctx.fill();

            // ---- 5. 翼尖能量光点 ----
            const wingPulse = Math.sin(frameCount * 0.05 + 1) * 0.3 + 0.7;
            ctx.shadowBlur = 0;
            ctx.fillStyle = hlColor;
            ctx.beginPath();
            ctx.arc(bx + bw * 0.5, by + bh * 0.2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(bx - bw * 0.5, by + bh * 0.2, 3, 0, Math.PI * 2);
            ctx.fill();
            // 翼尖光晕
            ctx.fillStyle = 'rgba(255,50,50,' + (0.15 * wingPulse) + ')';
            ctx.beginPath();
            ctx.arc(bx + bw * 0.5, by + bh * 0.2, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(bx - bw * 0.5, by + bh * 0.2, 8, 0, Math.PI * 2);
            ctx.fill();

            // ---- 6. 能量脉动纹 ----
            ctx.strokeStyle = 'rgba(255,50,50,' + (0.15 * bossAuraPulse) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx - bw * 0.3, by + bh * 0.1);
            ctx.lineTo(bx + bw * 0.3, by + bh * 0.1);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,50,50,' + (0.1 * bossAuraPulse) + ')';
            ctx.beginPath();
            ctx.moveTo(bx - bw * 0.25, by + bh * 0.25);
            ctx.lineTo(bx + bw * 0.25, by + bh * 0.25);
            ctx.stroke();

            // ---- 7. 血条 ----
            const barW2 = e.w * 0.8;
            const barH2 = 4;
            const barX2 = bx - barW2 / 2;
            const barY2 = by - e.h / 2 - 12;
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            ctx.roundRect(barX2, barY2, barW2, barH2, 2);
            ctx.fill();
            ctx.fillStyle = isStage ? '#ff4488' : '#ffdd44';
            ctx.shadowColor = isStage ? '#ff4488' : '#ffdd44';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.roundRect(barX2, barY2, barW2 * (e.hp / e.maxHp), barH2, 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
}

// ===== 敌人子弹 =====
let enemySpawnTimer = 0;

function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        if (b.vy !== undefined) {
            b.x += b.vx || 0;
            b.y += b.vy;
        } else {
            b.y += b.speed;
        }
        if (b.y > H + 10 || b.x < -20 || b.x > W + 20) {
            enemyBullets.splice(i, 1);
        }
    }
}

function drawEnemyBullets() {
    for (const b of enemyBullets) {
        // 敌方子弹拖尾光晕
        ctx.fillStyle = 'rgba(255, 0, 0, 0.12)';
        ctx.beginPath();
        ctx.arc(b.x, b.y + b.h * 0.8, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
        ctx.fill();

        const grad = ctx.createLinearGradient(b.x, b.y - b.h / 2, b.x, b.y + b.h / 2);
        grad.addColorStop(0, '#ff4444');
        grad.addColorStop(0.5, '#ff0000');
        grad.addColorStop(1, '#aa0000');
        ctx.fillStyle = grad;
        ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    }
}

// ===== Boss 激光绘制 =====
function drawBossLasers() {
    for (let i = bossLasers.length - 1; i >= 0; i--) {
        const l = bossLasers[i];
        l.timer--;
        l.angle += 0.05; // 旋转
        if (l.timer <= 0) {
            bossLasers.splice(i, 1);
            continue;
        }

        const endX = l.x + Math.cos(l.angle) * l.length;
        const endY = l.y + Math.sin(l.angle) * l.length;

        // 外发光
        ctx.save();
        ctx.shadowColor = '#ff0044';
        ctx.shadowBlur = 25;
        ctx.strokeStyle = 'rgba(255, 0, 68, 0.6)';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();

        // 核心光束
        const grad = ctx.createLinearGradient(l.x, l.y, endX, endY);
        grad.addColorStop(0, 'rgba(255, 200, 200, 0.9)');
        grad.addColorStop(0.3, 'rgba(255, 50, 50, 0.8)');
        grad.addColorStop(0.7, 'rgba(200, 0, 50, 0.6)');
        grad.addColorStop(1, 'rgba(100, 0, 50, 0.3)');
        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
    }
}

// ===== 道具系统 =====
let powerups = [];

function spawnPowerup(x, y, type) {
    const configs = {
        spread: { color: '#44cc44', label: 'S' },
        heal:   { color: '#cc4444', label: '+' },
        shield: { color: '#4488ff', label: 'O' },
        power:  { color: '#ccaa44', label: '*' }
    };
    const cfg = configs[type];
    if (!cfg) return;
    powerups.push({
        x: x, y: y, w: 20, h: 20,
        type: type,
        color: cfg.color,
        label: cfg.label,
        speed: 2
    });
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.y += p.speed;
        if (p.y > H + 20) {
            powerups.splice(i, 1);
        }
    }
}

function drawPowerups() {
    for (const p of powerups) {
        ctx.save();
        ctx.fillStyle = p.color + '44';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.fill();

        // 道具旋转光环
        var ringAngle = frameCount * 0.04 + p.x;
        ctx.strokeStyle = p.color + '66';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, ringAngle, ringAngle + Math.PI * 1.5);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.label, p.x, p.y + 0.5);
        ctx.restore();
    }
}

function applyPowerup(type) {
    // Task 3: 统计道具收集
    stats.powerupsCollected++;

    switch (type) {
        case 'spread':
            player.spreadActive = true;
            player.spreadTimer = 480;
            break;
        case 'heal':
            player.hp = Math.min(player.hp + 1, player.maxHp);
            break;
        case 'shield':
            player.shield = true;
            break;
        case 'power':
            player.powerActive = true;
            player.powerTimer = 360;
            player.bulletDelay = Math.floor(player.originalBulletDelay / 2);
            break;
    }
}

// ===== 武器升级逻辑 =====
function addEnergy(amount) {
    // 武器满级后，能量只用于大招，不再自动清零
    if (player.weaponLevel >= 5) {
        player.energy = Math.min(player.energy + amount, player.maxEnergy);
        return;
    }

    player.energy += amount;
    if (player.energy >= player.maxEnergy) {
        player.energy = 0;
        if (player.weaponLevel < 5) {
            player.weaponLevel++;
            // 更新最高武器等级统计
            if (player.weaponLevel > stats.maxWeaponLevel) {
                stats.maxWeaponLevel = player.weaponLevel;
            }
            // 升级提示
            upgradeNotification = 60;
            // 音效
            audio.playUpgrade();

            // 根据武器等级调整射速
            switch (player.weaponLevel) {
                case 4:
                    player.bulletDelay = 7;
                    break;
                case 5:
                    player.bulletDelay = 5;
                    break;
                default:
                    player.bulletDelay = player.originalBulletDelay;
                    break;
            }
        }
    }
}

// ===== 大招系统 (Task 3) =====
function activateUltimate() {
    if (player.energy < player.maxEnergy) return;

    player.energy = 0;
    ultimateFlashTimer = 20;

    // 对所有敌机造成 50 点伤害（足以秒杀任何敌机和普通 Boss）
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.hp -= 50;
        if (e.hp <= 0) {
            spawnExplosion(e.x, e.y, e.color, e.type === 'STAGE_BOSS' ? 40 : 25);
            spawnExplosion(e.x, e.y, '#ffffff', 15);
            // 得分飘字
            addFloatText(e.x, e.y - 10, '+' + e.scoreValue, '#ffdd44');
            score += e.scoreValue * (scoreMultiplier || 1);
            stats.enemiesKilled++;
            if (!stats.killedByType[e.type]) stats.killedByType[e.type] = 0;
            stats.killedByType[e.type]++;
            enemies.splice(i, 1);
        }
    }

    // 清除所有敌人子弹
    enemyBullets = [];

    // 音效
    audio.playUpgrade(); // 使用升级音效作为大招音效
}

// ===== 碰撞检测 =====
function rectCollide(a, b) {
    return a.x - a.w / 2 < b.x + b.w / 2 &&
           a.x + a.w / 2 > b.x - b.w / 2 &&
           a.y - a.h / 2 < b.y + b.h / 2 &&
           a.y + a.h / 2 > b.y - b.h / 2;
}

function checkCollisions() {
    // 玩家子弹 vs 敌人
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (rectCollide(
                { x: b.x, y: b.y, w: b.w, h: b.h },
                { x: e.x, y: e.y, w: e.w, h: e.h }
            )) {
                hit = true;
                // 使用子弹 damage 属性
                e.hp -= b.damage || 1;
                // 命中反馈：闪光粒子
                spawnHitSpark(b.x, b.y, e.color);
                if (e.hp <= 0) {
                    // 敌机被击毁 — 大爆炸效果
                    const isBoss = e.type === 'BOSS';
                    const isStageBoss = e.type === 'STAGE_BOSS';
                    var explodeCount = isStageBoss ? 60 : (isBoss ? 45 : 30);
                    spawnExplosion(e.x, e.y, e.color, explodeCount);
                    // 额外白色闪光核心
                    spawnExplosion(e.x, e.y, '#ffffff', Math.floor(explodeCount * 0.4));
                    // 屏幕震动（不移除冻结帧，避免卡顿同时保留打击感）
                    if (settings.screenShakeEnabled) {
                        screenShake = isStageBoss ? 15 : (isBoss ? 10 : 5);
                    }
                    // 轨道火花 — 额外随机彩色爆裂
                    if (Math.random() < 0.5) {
                        spawnExplosion(e.x + (Math.random() - 0.5) * 30, e.y + (Math.random() - 0.5) * 30,
                            ['#ff4466', '#ffaa00', '#66ffaa', '#ff66ff'][Math.floor(Math.random() * 4)], 15);
                    }

                    if (isStageBoss) {
                        spawnExplosion(e.x, e.y, '#ff4488', 35);
                        spawnExplosion(e.x, e.y, '#ffffff', 25);
                    } else if (isBoss) {
                        spawnExplosion(e.x, e.y, '#ff8800', 25);
                        spawnExplosion(e.x, e.y, '#ffffff', 20);
                    } else {
                        spawnExplosion(e.x, e.y, '#ffcc00', 12);
                        spawnExplosion(e.x, e.y, '#ff4400', 8);
                    }

                    // 自爆机被子弹击毁触发额外爆炸
                    if (e.type === 'KAMIKAZE') {
                        spawnExplosion(e.x, e.y, '#ff6600', 20);
                    }

                    // 得分飘字
                    addFloatText(e.x, e.y - 10, '+' + e.scoreValue, '#ffdd44');

                    audio.playExplosion();

                    // 连击系统 (Task 2)
                    if (frameCount - lastKillTime <= COMBO_WINDOW) {
                        comboCount++;
                        if (comboCount >= 50) scoreMultiplier = 10;
                        else if (comboCount >= 20) scoreMultiplier = 5;
                        else if (comboCount >= 10) scoreMultiplier = 3;
                        else if (comboCount >= 5) scoreMultiplier = 2;
                        else scoreMultiplier = 1;
                    } else {
                        comboCount = 1;
                        scoreMultiplier = 1;
                    }
                    lastKillTime = frameCount;

                    score += e.scoreValue * scoreMultiplier;

                    // 分数闪光脉冲
                    scorePulseAlpha = 0.2;

                    // 连击里程碑效果（屏幕震动+额外粒子）
                    var milestones = [5, 10, 20, 50];
                    for (var mi = 0; mi < milestones.length; mi++) {
                        if (comboCount >= milestones[mi] && lastComboMilestone < milestones[mi]) {
                            lastComboMilestone = milestones[mi];
                            if (settings.screenShakeEnabled) {
                                screenShake = 6;
                            }
                            // 连击里程碑时额外粒子爆裂
                            spawnExplosion(e.x, e.y, '#ffdd44', 20);
                            break;
                        }
                    }

                    // SPLITTER 分裂
                    if (e.type === 'SPLITTER') {
                        for (let si = -1; si <= 1; si += 2) {
                            enemies.push({
                                x: e.x + si * 15,
                                y: e.y,
                                w: 14,
                                h: 16,
                                hp: 1,
                                maxHp: 1,
                                speed: 2.5,
                                color: '#ff88bb',
                                scoreValue: 5,
                                type: 'SPLIT',
                                canShoot: false,
                                shootTimer: 999,
                                shakeX: 0,
                                isSplitterChild: true,
                                spawnScale: 0,
                                spawnMaxScale: 1
                            });
                        }
                    }

                    enemies.splice(j, 1);

                    // 关卡 Boss 被击败则进入下一关
                    if (isStageBoss) {
                        currentStage++;
                        stageBossSpawned = false;
                    }

                    // Task 2: 击落敌机积累能量
                    switch (e.type) {
                        case 'SMALL': addEnergy(5); break;
                        case 'NORMAL': addEnergy(10); break;
                        case 'HEAVY': addEnergy(20); break;
                        case 'BOSS': addEnergy(50); break;
                        case 'STAGE_BOSS': addEnergy(80); break;
                        case 'KAMIKAZE': addEnergy(8); break;
                        case 'STEALTH': addEnergy(15); break;
                        case 'SPLITTER': addEnergy(12); break;
                        case 'SPLIT': addEnergy(3); break;
                    }

                    // Task 3: 统计
                    stats.enemiesKilled++;
                    if (!stats.killedByType[e.type]) stats.killedByType[e.type] = 0;
                    stats.killedByType[e.type]++;

                    // 道具掉落
                    let dropChance = 0;
                    let dropType = null;
                    if (e.type === 'STAGE_BOSS') {
                        dropChance = 1;
                        dropType = Math.random() < 0.5 ? 'spread' : 'power';
                    } else if (e.type === 'BOSS') {
                        dropChance = 1;
                        dropType = Math.random() < 0.5 ? 'spread' : 'power';
                    } else if (e.type === 'HEAVY') {
                        dropChance = 0.3;
                        const types = ['heal', 'shield', 'power'];
                        dropType = types[Math.floor(Math.random() * types.length)];
                    } else if (e.type === 'NORMAL') {
                        dropChance = 0.15;
                        const types = ['heal', 'shield'];
                        dropType = types[Math.floor(Math.random() * types.length)];
                    } else if (e.type === 'SPLIT') {
                        dropChance = 0.05;
                        const types = ['heal', 'shield'];
                        dropType = types[Math.floor(Math.random() * types.length)];
                    }
                    if (dropType && Math.random() < dropChance) {
                        spawnPowerup(e.x, e.y, dropType);
                    }
                }
                break;
            }
        }
        if (hit) {
            bullets.splice(i, 1);
        }
    }

    // 敌人 vs 玩家
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        // 跳过自爆机（已在 updateEnemies 中处理）
        if (e.isKamikaze) continue;
        if (rectCollide(
            { x: player.x, y: player.y, w: player.w, h: player.h },
            { x: e.x, y: e.y, w: e.w, h: e.h }
        )) {
            spawnExplosion(e.x, e.y, '#ff8800', 15);
            enemies.splice(i, 1);

            damagePlayer();
            if (player.hp <= 0) return;
        }
    }

    // 敌人子弹 vs 玩家
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        if (rectCollide(
            { x: player.x, y: player.y, w: player.w, h: player.h },
            { x: b.x, y: b.y, w: b.w, h: b.h }
        )) {
            enemyBullets.splice(i, 1);
            damagePlayer();
            if (player.hp <= 0) return;
        }
    }

    // Boss 激光 vs 玩家
    for (let i = bossLasers.length - 1; i >= 0; i--) {
        const l = bossLasers[i];
        const endX = l.x + Math.cos(l.angle) * l.length;
        const endY = l.y + Math.sin(l.angle) * l.length;
        // 计算玩家到激光线段的距离
        const dx = endX - l.x;
        const dy = endY - l.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            const t = Math.max(0, Math.min(1, ((player.x - l.x) * dx + (player.y - l.y) * dy) / (len * len)));
            const closestX = l.x + t * dx;
            const closestY = l.y + t * dy;
            const dist = Math.sqrt((player.x - closestX) * (player.x - closestX) + (player.y - closestY) * (player.y - closestY));
            if (dist < 8) {
                damagePlayer();
                if (player.hp <= 0) return;
            }
        }
    }

    // 道具 vs 玩家
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (rectCollide(
            { x: player.x, y: player.y, w: player.w, h: player.h },
            { x: p.x, y: p.y, w: p.w, h: p.h }
        )) {
            applyPowerup(p.type);
            powerups.splice(i, 1);
        }
    }
}

// 玩家受伤处理
function damagePlayer() {
    if (player.invincible || player.shield) {
        if (player.shield) {
            player.shield = false;
        }
        return;
    }

    player.hp--;
    player.invincible = true;
    player.invincibleTimer = 90;

    // Task 4: 受伤震动
    if (settings.screenShakeEnabled) {
        screenShake = 10;
    }

    spawnExplosion(player.x, player.y, '#4488ff', 15);
    audio.playExplosion();

    if (player.hp <= 0) {
        gameOver();
    }
}

// ===== 游戏状态管理 =====
function resetGameState() {
    score = 0;
    frameCount = 0;
    playingFrameCount = 0;
    difficultyLevel = 1;
    enemySpawnInterval = 40;
    bullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    powerups = [];
    bossLasers = [];
    player.x = W / 2;
    player.y = H - 80;
    player.bulletCooldown = 0;
    player.bulletDelay = 10;
    player.hp = 5;
    player.maxHp = 5;
    player.invincible = false;
    player.invincibleTimer = 0;
    player.shield = false;
    player.spreadActive = false;
    player.spreadTimer = 0;
    player.powerActive = false;
    player.powerTimer = 0;
    // Task 2: 重置武器等级
    player.weaponLevel = 1;
    player.energy = 0;
    player.maxEnergy = 100;
    player.originalBulletDelay = 10;
    enemySpawnTimer = 0;
    lastBossSpawnFrame = 0;
    bossCooldown = 0;
    touchPlayerStartX = player.x;
    touchPlayerStartY = player.y;
    upgradeNotification = 0;
    screenShake = 0;
    // Task 1: 重置关卡状态
    currentStage = 1;
    stageBossSpawned = false;
    stageTransitionTimer = 0;
    // Task 2: 重置连击
    comboCount = 0;
    lastKillTime = 0;
    scoreMultiplier = 1;
    // Task 3: 重置大招
    ultimateFlashTimer = 0;
    // 重置统计
    stats.enemiesKilled = 0;
    stats.killedByType = {};
    stats.survivalFrames = 0;
    stats.powerupsCollected = 0;
    stats.maxWeaponLevel = 1;
}

function startGame() {
    resetGameState();
    gameState = 'playing';
    playerSpawnScale = 0; // 玩家入场缩放初始为0
    requestWakeLock();
}

function goToMenu() {
    gameState = 'menu';
    // 隐藏 DOM HUD 覆盖层
    var overlay = document.getElementById('hudOverlay');
    if (overlay) overlay.style.display = 'none';
    // 菜单界面继续播放 BGM（不显式停止）
}

// ===== DOM HUD 覆盖层 =====
function initHUDOverlay() {
    // DOM 元素已在 index.html 中定义，只需确保初始隐藏
    var overlay = document.getElementById('hudOverlay');
    if (overlay) overlay.style.display = 'none';
}

function updateHUDOverlay() {
    if (updateHUDOverlay._prevHp === undefined) updateHUDOverlay._prevHp = player.maxHp;
    if (updateHUDOverlay._prevWeaponLv === undefined) updateHUDOverlay._prevWeaponLv = player.weaponLevel;
    var hpRatio = Math.max(0, player.hp / player.maxHp);
    var enRatio = Math.max(0, player.energy / player.maxEnergy);

    var hpChanged = player.hp !== updateHUDOverlay._prevHp;
    var orbEls = document.querySelectorAll('.hp-orb');

    // HP 变化检测
    if (hpChanged) {
        var lostIndex = Math.max(0, player.hp);
        for (var oi = 0; oi < orbEls.length; oi++) {
            var orb = orbEls[oi];
            if (oi < player.hp) {
                orb.classList.remove('empty', 'hp-orb-empty-pulse');
                orb.classList.add('filled');
            } else {
                orb.classList.remove('filled', 'damage-burst');
                orb.classList.add('empty');
                if (player.hp < updateHUDOverlay._prevHp && oi === lostIndex) {
                    orb.classList.add('damage-burst');
                }
                var orbTimerKey = '_orbTimer_' + oi;
                if (updateHUDOverlay[orbTimerKey]) { clearTimeout(updateHUDOverlay[orbTimerKey]); }
                updateHUDOverlay[orbTimerKey] = setTimeout(function(idx) {
                    return function() {
                        var orbs = document.querySelectorAll('.hp-orb');
                        if (orbs[idx]) orbs[idx].classList.remove('damage-burst');
                    };
                }(oi), 300);
            }
        }
        // 数字闪白
        var numEl = document.getElementById('hudHpNumber');
        if (numEl) numEl.classList.add('hp-num-flash');
        setTimeout(function() {
            var ne = document.getElementById('hudHpNumber');
            if (ne) ne.classList.remove('hp-num-flash');
        }, 150);
    }
    updateHUDOverlay._prevHp = player.hp;

    // HP 数字
    var numEl2 = document.getElementById('hudHpNumber');
    if (numEl2) {
        numEl2.textContent = player.hp;
        if (hpRatio < 0.3) {
            numEl2.classList.add('hp-num-critical');
        } else {
            numEl2.classList.remove('hp-num-critical');
        }
    }

    // 低血量处理
    var hpModuleEl = document.getElementById('hudHpModule');
    var isLowHp = hpRatio < 0.3;
    if (hpModuleEl) {
        if (isLowHp) hpModuleEl.classList.add('hp-low');
        else hpModuleEl.classList.remove('hp-low');
    }
    // 宝珠低血量脉动
    for (var oi2 = 0; oi2 < orbEls.length; oi2++) {
        if (orbEls[oi2].classList.contains('filled')) {
            if (isLowHp) orbEls[oi2].classList.add('hp-orb-pulse');
            else orbEls[oi2].classList.remove('hp-orb-pulse');
        }
        if (orbEls[oi2].classList.contains('empty')) {
            if (isLowHp) orbEls[oi2].classList.add('hp-orb-empty-pulse');
            else orbEls[oi2].classList.remove('hp-orb-empty-pulse');
        }
    }

    // 护盾旋转光环
    var shieldRing = document.getElementById('hudShieldRing');
    if (shieldRing) {
        if (player.shield) shieldRing.classList.add('hp-shield-active');
        else shieldRing.classList.remove('hp-shield-active');
    }

    // === 得分 ===
    var el = document.getElementById('hudScore');
    if (el) el.textContent = score.toLocaleString();
    el = document.getElementById('hudCombo');
    if (el) {
        if (comboCount > 1) {
            el.style.display = 'block';
            el.textContent = '连击 ×' + comboCount;
        } else {
            el.style.display = 'none';
        }
    }

    // === 武器能源 ===
    el = document.getElementById('hudEnergyPct');
    if (el) el.textContent = Math.round(enRatio * 100) + '%';
    el = document.getElementById('hudEnergyFill');
    if (el) el.style.width = (enRatio * 100) + '%';
    // 满能量/低能量类
    var energyBar = document.getElementById('hudEnergyBarThick');
    if (energyBar) {
        if (enRatio >= 1.0) {
            energyBar.classList.add('full');
            energyBar.classList.remove('low');
        } else if (enRatio < 0.2) {
            energyBar.classList.add('low');
            energyBar.classList.remove('full');
        } else {
            energyBar.classList.remove('full', 'low');
        }
    }
    // 武器等级
    el = document.getElementById('hudWeaponLv');
    if (el) {
        el.textContent = 'Lv.' + player.weaponLevel;
        // 升级闪烁
        if (player.weaponLevel > updateHUDOverlay._prevWeaponLv) {
            el.classList.add('lv-upgrade');
            setTimeout(function() {
                var lvEl = document.getElementById('hudWeaponLv');
                if (lvEl) lvEl.classList.remove('lv-upgrade');
            }, 1300);
        }
    }
    updateHUDOverlay._prevWeaponLv = player.weaponLevel;

    el = document.getElementById('hudDifficulty');
    if (el) el.textContent = 'Lv.' + difficultyLevel;
    el = document.getElementById('hudStage');
    if (el) el.textContent = '第 ' + currentStage + ' 关';
}

function gameOver() {
    gameState = 'over';
    gameOverFadeIn = 0;
    audio.stopBGM();
    audio.playPlayerDeath();

    // 死亡粒子大爆发
    for (var dpi = 0; dpi < 8; dpi++) {
        var dx = player.x + (Math.random() - 0.5) * 20;
        var dy = player.y + (Math.random() - 0.5) * 20;
        spawnExplosion(dx, dy, '#4488ff', 20);
        spawnExplosion(dx, dy, '#ffffff', 12);
        spawnExplosion(dx, dy, '#88ddff', 10);
        spawnExplosion(dx, dy, '#ff4488', 8);
    }
    if (settings.screenShakeEnabled) {
        screenShake = 20;
    }

    saveHighScore(score);
    releaseWakeLock();
    // 后台静默同步数据到服务端（先检查 token 是否过期，避免 401 弹框）
    if (loggedIn && typeof saveUserData === 'function') {
        var _token = typeof getToken === 'function' ? getToken() : null;
        var _tokenValid = false;
        if (_token) {
            try {
                var _payload = _token.split('.')[1];
                if (_payload) {
                    var _decoded = atob(_payload.replace(/-/g, '+').replace(/_/g, '/'));
                    var _parsed = JSON.parse(_decoded);
                    if (_parsed.exp && _parsed.exp >= Date.now() / 1000) {
                        _tokenValid = true;
                    }
                }
            } catch (_e) {}
        }
        if (_tokenValid) {
            saveUserData({
                highScore: loadHighScore(),
                stats: JSON.parse(JSON.stringify(stats)),
                settings: settings
            }).catch(function () {});
        }
    }
}

// ===== 酷炫 HUD — 左侧面板 (生命值 / 得分 / 武器能源) =====
function drawLeftHUD() {
    updateHUDOverlay();
}

// ===== DOM HUD — 右侧信息 (难度等级 / 当前关卡) =====
function drawRightInfo() {
    // 由 updateHUDOverlay() 通过 drawLeftHUD() 处理
}

// ===== UI 绘制 =====
function drawUI() {
    // 显示 DOM HUD 覆盖层
    var overlay = document.getElementById('hudOverlay');
    if (overlay) overlay.style.display = 'block';

    // ===== DOM HUD — 左侧面板组 (HP / 分数 / 能量) =====
    drawLeftHUD();

    // ===== 酷炫 HUD — 右侧信息 (难度 / 关卡) =====
    drawRightInfo();

    // 右上角控制组（静音 + 设置）
    drawTopRightControls();

    // Task 1: 暂停按钮 (触屏模式)
    if (isTouchDevice) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(W - 30, 30, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⏸', W - 30, 31);
    }

    // Task 2: 武器升级提示
    if (upgradeNotification > 0) {
        const alpha = upgradeNotification > 50 ? 1 : upgradeNotification / 50;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffdd44';
        ctx.font = 'bold 24px ' + FONT_BOLD;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ffdd44';
        ctx.shadowBlur = 20;
        ctx.fillText('⚡ 武器升级！Lv.' + player.weaponLevel, W / 2, H / 2 - 80);
        ctx.restore();
    }

    // ===== 关卡过渡提示 (Task 1) =====
    if (stageTransitionTimer > 0) {
        ctx.save();
        const progress = stageTransitionTimer / 120;
        const scale = 1 + (1 - progress) * 0.3;
        const alpha = stageTransitionTimer > 30 ? 1 : stageTransitionTimer / 30;
        const flash = Math.sin(stageTransitionTimer * 0.2) * 0.15 + 0.85;
        ctx.globalAlpha = alpha * flash;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff4488';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ff4488';
        ctx.font = `bold ${Math.floor(52 * scale)}px ` + FONT_BOLD;
        ctx.fillText('第 ' + currentStage + ' 关', W / 2, H / 2 - 20);
        if (stageTransitionTimer <= 30) {
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.floor(24 * scale)}px ` + FONT_BOLD;
            ctx.fillText('准备战斗！', W / 2, H / 2 + 50);
        }
        // 光幕扫入效果
        var sweepX = (1 - progress) * W;
        var sweepGrad = ctx.createLinearGradient(sweepX - 40, 0, sweepX + 40, 0);
        sweepGrad.addColorStop(0, 'rgba(255, 68, 136, 0)');
        sweepGrad.addColorStop(0.5, 'rgba(255, 68, 136, ' + (0.3 * progress) + ')');
        sweepGrad.addColorStop(1, 'rgba(255, 68, 136, 0)');
        ctx.fillStyle = sweepGrad;
        ctx.fillRect(sweepX - 40, 0, 80, H);
        ctx.restore();
    }

    // ===== 连击显示 (Task 2) =====
    if (comboCount >= 5) {
        ctx.save();
        // Elastic 风格弹性缩放
        var comboAge = frameCount - lastKillTime;
        var elasticScale = 1;
        if (comboAge < 5) {
            // 每次连击更新时弹跳
            var t = comboAge / 5;
            elasticScale = 1 + 0.4 * Math.pow(2, -10 * t) * Math.sin((t * 3 - 0.5) * Math.PI);
        }
        var pulse = Math.sin(frameCount * 0.08) * 0.06 + 0.94;
        var comboScale = (1 + (1 - pulse) * 0.15) * elasticScale;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';

        let comboColor;
        if (scoreMultiplier >= 10) comboColor = '#ff4444';
        else if (scoreMultiplier >= 5) comboColor = '#ff8800';
        else if (scoreMultiplier >= 3) comboColor = '#44dd44';
        else comboColor = '#ffffff';

        // 连击数字 - 多阴影层叠效果
        ctx.shadowColor = comboColor;
        ctx.shadowBlur = 20;
        ctx.fillStyle = comboColor;
        ctx.font = 'bold ' + Math.floor(40 * comboScale) + 'px ' + FONT_BOLD;
        ctx.fillText(comboCount + ' COMBO', W - 15, 90);

        // 倍率 - 弹性放大
        ctx.shadowBlur = 15;
        ctx.fillStyle = scoreMultiplier >= 10 ? '#ffdd44' : comboColor;
        ctx.font = 'bold ' + Math.floor(28 * comboScale) + 'px ' + FONT_BOLD;
        ctx.fillText('×' + scoreMultiplier, W - 15, 134);

        ctx.restore();
    }

    // ===== 分数闪光脉冲 =====
    if (scorePulseAlpha > 0.01) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 200, 50, ' + (scorePulseAlpha * 0.15) + ')';
        ctx.fillRect(0, 0, W, H);
        scorePulseAlpha *= 0.92;
        ctx.restore();
    }

    // ===== 大招全屏闪光 (Task 3) =====
    if (ultimateFlashTimer > 0) {
        ctx.save();
        const flashAlpha = ultimateFlashTimer / 20;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.3})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    // ===== 触屏大招按钮 (Task 3) =====
    if (isTouchDevice) {
        const btnCX = W - 38;
        const btnCY = H - 38;
        const btnR = 26;
        const energyFull = player.energy >= player.maxEnergy;

        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = energyFull ? '#ffdd44' : 'rgba(100,100,100,0.5)';
        ctx.beginPath();
        ctx.arc(btnCX, btnCY, btnR, 0, Math.PI * 2);
        ctx.fill();

        if (energyFull) {
            const glowPulse = Math.sin(frameCount * 0.08) * 0.3 + 0.7;
            ctx.globalAlpha = glowPulse * 0.3;
            ctx.fillStyle = '#ffdd44';
            ctx.beginPath();
            ctx.arc(btnCX, btnCY, btnR + 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = energyFull ? '#441100' : '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(energyFull ? '!' : 'E', btnCX, btnCY + 1);
        ctx.restore();
    }
}

function drawTopRightControls() {
    const centerY = 22;
    const iconSize = 20;
    const btnRadius = 14;

    // Mute icon position (rightmost)
    const muteCenterX = W - 22;
    // Gear icon position (to the left of mute)
    const gearCenterX = muteCenterX - 48;

    // Pill background
    const pillPad = 6;
    const pillLeft = gearCenterX - btnRadius - pillPad;
    const pillTop = centerY - btnRadius - 2;
    const pillWidth = (muteCenterX + btnRadius + pillPad) - pillLeft;
    const pillHeight = (btnRadius + 2) * 2;

    ctx.save();

    // Pill shadow
    ctx.shadowColor = 'rgba(68, 136, 255, 0.2)';
    ctx.shadowBlur = 10;

    // Pill background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
    ctx.strokeStyle = 'rgba(68, 136, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pillLeft, pillTop, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Gear icon
    const gearHover = mouseX >= gearCenterX - btnRadius && mouseX <= gearCenterX + btnRadius &&
                      mouseY >= centerY - btnRadius && mouseY <= centerY + btnRadius;
    const gearPulse = Math.sin(frameCount * 0.04) * 0.1 + 0.9;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = iconSize + 'px Arial';
    ctx.fillStyle = settingsOpen ? '#88aaff' : (gearHover ? '#aaccff' : 'rgba(136, 170, 204, ' + gearPulse + ')');
    ctx.fillText('⚙', gearCenterX, centerY + 1);

    // Mute icon
    const muteHover = mouseX >= muteCenterX - btnRadius && mouseX <= muteCenterX + btnRadius &&
                      mouseY >= centerY - btnRadius && mouseY <= centerY + btnRadius;
    ctx.fillStyle = muteHover ? '#dddddd' : (audio.muted ? '#ff6666' : '#88cc88');
    ctx.fillText(audio.muted ? '🔇' : '🔊', muteCenterX, centerY + 1);

    ctx.restore();
}

// Task 5: 设置面板
let settingsOpen = false;

function drawSettingsPanel() {
    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 标题
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#4488ff';
    ctx.font = 'bold 36px ' + FONT_BOLD;
    ctx.fillText('⚙ 设置', W / 2, 100);
    ctx.shadowBlur = 0;

    // 分隔线
    ctx.strokeStyle = 'rgba(68, 136, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 80, 130);
    ctx.lineTo(W / 2 + 80, 130);
    ctx.stroke();

    // 音量滑块
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px ' + FONT_BOLD;
    ctx.textAlign = 'left';
    ctx.fillText('音量', 80, 260);

    const sliderX = 120;
    const sliderY = 270;
    const sliderW = 240;
    const sliderH = 10;

    // 轨道
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(sliderX, sliderY, sliderW, sliderH, 5);
    ctx.fill();

    // 填充
    const fillW2 = (settings.volume / 100) * sliderW;
    ctx.fillStyle = '#5599ff';
    ctx.beginPath();
    ctx.roundRect(sliderX, sliderY, fillW2, sliderH, 5);
    ctx.fill();

    // 滑块按钮
    const knobX = sliderX + fillW2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(knobX, sliderY + sliderH / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(knobX, sliderY + sliderH / 2, 10, 0, Math.PI * 2);
    ctx.stroke();

    // 音量数值
    ctx.fillStyle = '#aaaaff';
    ctx.font = '14px ' + FONT_BOLD;
    ctx.textAlign = 'right';
    ctx.fillText(settings.volume + '%', sliderX + sliderW + 40, sliderY + sliderH / 2 + 1);

    // 震动开关
    ctx.fillStyle = '#cccccc';
    ctx.font = '18px ' + FONT_BOLD;
    ctx.textAlign = 'left';
    ctx.fillText('震动:', 80, 338);

    const shakeBtnX = 140;
    const shakeBtnY = 320;
    const shakeBtnW = 70;
    const shakeBtnH = 32;
    ctx.fillStyle = settings.screenShakeEnabled ? '#44cc44' : '#666666';
    ctx.beginPath();
    ctx.roundRect(shakeBtnX, shakeBtnY, shakeBtnW, shakeBtnH, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px ' + FONT_BOLD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(settings.screenShakeEnabled ? '开' : '关', shakeBtnX + shakeBtnW / 2, shakeBtnY + shakeBtnH / 2);

    // 控制说明
    ctx.fillStyle = '#888888';
    ctx.font = '14px ' + FONT_BOLD;
    ctx.textAlign = 'center';
    const controlsY = 400;
    const controls = [
        '方向键 / WASD - 移动',
        '空格 - 射击',
        'P / Esc - 暂停',
        'M - 音效开关',
        'S - 打开设置（菜单界面）'
    ];
    controls.forEach((line, idx) => {
        ctx.fillStyle = idx === 0 ? '#aaaaaa' : '#777777';
        ctx.fillText(line, W / 2, controlsY + idx * 24);
    });

    // 关闭按钮
    const closeBtnX = W / 2 - 50;
    const closeBtnY = 520;
    const closeBtnW = 100;
    const closeBtnH = 40;
    ctx.fillStyle = 'rgba(68, 136, 255, 0.3)';
    ctx.beginPath();
    ctx.roundRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(68, 136, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH, 8);
    ctx.stroke();
    ctx.fillStyle = '#4488ff';
    ctx.font = 'bold 18px ' + FONT_BOLD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓ 关闭', W / 2, closeBtnY + closeBtnH / 2);

    // 底部提示
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('按 Esc 或 S 关闭设置', W / 2, 585);
}

// ===== 菜单界面星云特效数据 =====
const menuNebula = [
    { x: 0.15, y: 0.25, r: 140, color: [100, 50, 200], speedX: 0.002, speedY: 0.001 },
    { x: 0.85, y: 0.45, r: 160, color: [30, 80, 200], speedX: -0.001, speedY: 0.002 },
    { x: 0.50, y: 0.70, r: 120, color: [200, 40, 100], speedX: 0.001, speedY: -0.001 },
    { x: 0.30, y: 0.60, r: 100, color: [20, 160, 120], speedX: -0.002, speedY: 0.001 },
];

// ===== 菜单浮动光点 =====
const menuFloatingParticles = [];
for (var mfpi = 0; mfpi < 30; mfpi++) {
    menuFloatingParticles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 3 + 1,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2 - 0.1,
        alpha: Math.random() * 0.4 + 0.1,
        hue: Math.random() * 60 + 200, // 蓝紫色范围
        phase: Math.random() * Math.PI * 2
    });
}

// ===== 菜单界面 =====
function drawMenu() {
    // ---- 1. 暗角遮罩（径向渐变暗角，中心透明星空） ----
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.65);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.5, 'rgba(0,0,0,0.1)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // ---- 2. 星云雾气 ----
    for (const nb of menuNebula) {
        // 缓慢漂移
        const driftX = Math.sin(frameCount * nb.speedX) * 30;
        const driftY = Math.cos(frameCount * nb.speedY) * 20;
        const cx = nb.x * W + driftX;
        const cy = nb.y * H + driftY;
        const pulse = Math.sin(frameCount * 0.01 + nb.x) * 0.02 + 0.06;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nb.r);
        grad.addColorStop(0, `rgba(${nb.color[0]},${nb.color[1]},${nb.color[2]},${pulse})`);
        grad.addColorStop(0.5, `rgba(${nb.color[0]},${nb.color[1]},${nb.color[2]},${pulse * 0.5})`);
        grad.addColorStop(1, `rgba(${nb.color[0]},${nb.color[1]},${nb.color[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, nb.r, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---- 2.5 浮动光点 ----
    for (var mfp of menuFloatingParticles) {
        mfp.x += mfp.vx + Math.sin(frameCount * 0.005 + mfp.phase) * 0.1;
        mfp.y += mfp.vy;
        if (mfp.y < -10) { mfp.y = H + 10; mfp.x = Math.random() * W; }
        if (mfp.x < -10) mfp.x = W + 10;
        if (mfp.x > W + 10) mfp.x = -10;
        var fpAlpha = mfp.alpha * (0.6 + Math.sin(frameCount * 0.02 + mfp.phase) * 0.4);
        var fpColor = hslToRgb(mfp.hue / 360, 0.6, 0.6 + Math.sin(frameCount * 0.01 + mfp.phase) * 0.15);
        ctx.fillStyle = 'rgba(' + fpColor.r + ',' + fpColor.g + ',' + fpColor.b + ',' + fpAlpha + ')';
        ctx.beginPath();
        ctx.arc(mfp.x, mfp.y, mfp.r, 0, Math.PI * 2);
        ctx.fill();
        // 光晕
        ctx.fillStyle = 'rgba(' + fpColor.r + ',' + fpColor.g + ',' + fpColor.b + ',' + (fpAlpha * 0.2) + ')';
        ctx.beginPath();
        ctx.arc(mfp.x, mfp.y, mfp.r * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // ---- 3. 游戏标题（炫酷霓虹扫描效果） ----
    const titleY = H * 0.27;
    const titlePulse = Math.sin(frameCount * 0.025) * 0.2 + 0.8;

    // 外层大光晕
    const glowGrad = ctx.createRadialGradient(W / 2, titleY, 10, W / 2, titleY, 120);
    glowGrad.addColorStop(0, `rgba(68, 136, 255, ${0.25 * titlePulse})`);
    glowGrad.addColorStop(0.5, `rgba(68, 136, 255, ${0.08 * titlePulse})`);
    glowGrad.addColorStop(1, 'rgba(68, 136, 255, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(W / 2, titleY, 120, 0, Math.PI * 2);
    ctx.fill();

    // 大范围环境光晕
    var bigGlow = ctx.createRadialGradient(W / 2, titleY, 20, W / 2, titleY, 200);
    bigGlow.addColorStop(0, 'rgba(68, 136, 255, ' + (0.08 * titlePulse) + ')');
    bigGlow.addColorStop(1, 'rgba(68, 136, 255, 0)');
    ctx.fillStyle = bigGlow;
    ctx.beginPath();
    ctx.arc(W / 2, titleY, 200, 0, Math.PI * 2);
    ctx.fill();

    // 标题文字 - 主层
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 25 + titlePulse * 15;
    ctx.fillStyle = `rgba(190, 220, 255, ${0.95 + titlePulse * 0.05})`;
    ctx.font = 'bold 54px ' + FONT_BOLD;
    ctx.fillText('飞行射击游戏', W / 2, titleY);

    // 标题文字 - 发光高亮层
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.15 * titlePulse})`;
    ctx.font = 'bold 54px ' + FONT_BOLD;
    ctx.fillText('飞行射击游戏', W / 2 - 2, titleY - 1);

    // 扫描线划过效果
    const scanX = ((frameCount * 3) % (W + 100)) - 50;
    const scanGrad = ctx.createLinearGradient(scanX - 30, titleY - 30, scanX + 30, titleY + 30);
    scanGrad.addColorStop(0, 'rgba(180, 220, 255, 0)');
    scanGrad.addColorStop(0.5, `rgba(180, 220, 255, ${0.12 * titlePulse})`);
    scanGrad.addColorStop(1, 'rgba(180, 220, 255, 0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(scanX - 30, titleY - 35, 60, 70);

    // 标题底部装饰光带
    ctx.shadowBlur = 0;
    const bandPulse = Math.sin(frameCount * 0.03) * 0.3 + 0.7;
    const bandY = titleY + 38;
    for (let i = 0; i < 3; i++) {
        const bandAlpha = (1 - i * 0.25) * bandPulse * 0.4;
        ctx.strokeStyle = `rgba(68, 136, 255, ${bandAlpha})`;
        ctx.lineWidth = 2 - i * 0.5;
        ctx.beginPath();
        const bandW = 160 - i * 20;
        ctx.moveTo(W / 2 - bandW, bandY + i * 4);
        ctx.lineTo(W / 2 + bandW, bandY + i * 4);
        ctx.stroke();
    }

    // ---- 4. 玩家飞船悬浮展示 ----
    const shipX = W / 2;
    const shipY = H * 0.50;
    const floatOffset = Math.sin(frameCount * 0.04) * 6;
    const tiltAngle = Math.sin(frameCount * 0.02) * 0.05;

    ctx.save();
    ctx.translate(shipX, shipY + floatOffset);
    ctx.rotate(tiltAngle);

    // 飞船引擎光效（动态粒子）
    const engineGlow = ctx.createRadialGradient(0, 22, 2, 0, 30, 35);
    engineGlow.addColorStop(0, `rgba(100, 180, 255, ${0.3 + Math.sin(frameCount * 0.1) * 0.15})`);
    engineGlow.addColorStop(0.5, `rgba(50, 100, 255, ${0.15})`);
    engineGlow.addColorStop(1, 'rgba(50, 100, 255, 0)');
    ctx.fillStyle = engineGlow;
    ctx.beginPath();
    ctx.arc(0, 22, 35, 0, Math.PI * 2);
    ctx.fill();

    // 引擎火焰粒子（用圆弧模拟）
    const flameLen = 10 + Math.sin(frameCount * 0.15) * 5;
    const flameGrad = ctx.createRadialGradient(0, 20 + flameLen / 2, 2, 0, 20 + flameLen / 2, flameLen);
    flameGrad.addColorStop(0, 'rgba(100, 200, 255, 0.6)');
    flameGrad.addColorStop(0.4, 'rgba(50, 100, 255, 0.3)');
    flameGrad.addColorStop(1, 'rgba(50, 100, 255, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.ellipse(0, 20 + flameLen / 2, 8, flameLen / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 机身 - 带渐变
    const bodyGrad = ctx.createLinearGradient(0, -18, 0, 20);
    bodyGrad.addColorStop(0, '#6699ff');
    bodyGrad.addColorStop(0.5, '#4488ff');
    bodyGrad.addColorStop(1, '#2266cc');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(16, 20);
    ctx.lineTo(6, 12);
    ctx.lineTo(0, 16);
    ctx.lineTo(-6, 12);
    ctx.lineTo(-16, 20);
    ctx.closePath();
    ctx.fill();

    // 机身发光描边
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#88bbff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(16, 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-16, 20);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 驾驶舱发光点
    const cockpitPulse = Math.sin(frameCount * 0.08) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(180, 220, 255, ${cockpitPulse})`;
    ctx.beginPath();
    ctx.arc(0, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(-1, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 飞船外部光晕
    const auraGrad = ctx.createRadialGradient(shipX, shipY + floatOffset, 10, shipX, shipY + floatOffset, 55);
    auraGrad.addColorStop(0, `rgba(68, 136, 255, ${0.08 + Math.sin(frameCount * 0.03) * 0.04})`);
    auraGrad.addColorStop(1, 'rgba(68, 136, 255, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(shipX, shipY + floatOffset, 55, 0, Math.PI * 2);
    ctx.fill();

    // ---- 5. 最高分 ----
    const highScore = loadHighScore();
    if (highScore > 0) {
        ctx.save();
        ctx.shadowColor = '#ffdd44';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffdd44';
        ctx.font = 'bold 20px ' + FONT_BOLD;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const scorePulse = Math.sin(frameCount * 0.04) * 0.1 + 0.9;
        ctx.globalAlpha = scorePulse;
        ctx.fillText('🏆 最高分: ' + highScore, W / 2, titleY + 80);
        ctx.restore();
    }

    // ---- 6. 操作提示 ----
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#cccccc';
    ctx.font = '15px ' + FONT_BOLD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('方向键 / WASD 移动   空格射击', W / 2, H * 0.68);

    if (isTouchDevice) {
        ctx.fillStyle = '#88aaff';
        ctx.fillText('📱 触摸滑动控制战机 · 自动射击', W / 2, H * 0.72);
    }
    ctx.restore();

    // ---- 7. 开始游戏按钮（能量环动画） ----
    const ctaY = H * 0.78;
    const ringPulse = Math.sin(frameCount * 0.045) * 0.3 + 0.7;

    // 外层呼吸光环
    const ringGrad = ctx.createRadialGradient(W / 2, ctaY, 5, W / 2, ctaY, 40 + ringPulse * 20);
    ringGrad.addColorStop(0, `rgba(68, 136, 255, ${0.15 * ringPulse})`);
    ringGrad.addColorStop(0.6, `rgba(68, 136, 255, ${0.08 * ringPulse})`);
    ringGrad.addColorStop(1, 'rgba(68, 136, 255, 0)');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(W / 2, ctaY, 40 + ringPulse * 20, 0, Math.PI * 2);
    ctx.fill();

    // 能量环
    ctx.save();
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = `rgba(68, 136, 255, ${0.4 * ringPulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(W / 2, ctaY, 28 + ringPulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    // 第二层环
    ctx.strokeStyle = `rgba(100, 180, 255, ${0.2 * ringPulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(W / 2, ctaY, 34 + ringPulse * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // CTA 文字
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(255, 255, 255, ${ringPulse})`;
    ctx.font = '20px ' + FONT_BOLD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始游戏', W / 2, ctaY);
    ctx.restore();

    // ---- 8. 底部提示 ----
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '12px ' + FONT_BOLD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M 键切换音效', W / 2, H * 0.90);
    ctx.fillText('S 键打开设置', W / 2, H * 0.94);
    ctx.restore();

    // ---- 9. 右上角控制组（齿轮 + 喇叭） ----
    drawTopRightControls();

    // ---- AudioContext 未激活提示（浏览器感知） ----
    if (audio.ctx && audio.ctx.state === 'suspended') {
        ctx.save();
        var audioHintPulse = Math.sin(frameCount * 0.06) * 0.3 + 0.7;
        var strictAlpha = browserInfo.strict ? 1 : 0.8;
        ctx.shadowColor = '#ffaa44';
        ctx.shadowBlur = browserInfo.strict ? 20 : 15;
        ctx.fillStyle = 'rgba(255, 170, 68, ' + (strictAlpha * audioHintPulse) + ')';
        ctx.font = browserInfo.strict ? '18px Arial' : '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎵 ' + browserInfo.hint, W / 2, H - 40);
        ctx.restore();
    }

    // ---- 10. 登录按钮 / 用户信息 ----
    if (loggedIn && currentUser) {
        ctx.save();
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.fillStyle = '#88cc88';
        ctx.font = '13px ' + FONT_BOLD;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('👤 ' + (currentUser.nickname || ''), W - 48, 46);
        ctx.restore();
    } else {
        // 未登录：底部登录按钮
        var pulseBtn = Math.sin(frameCount * 0.05) * 0.2 + 0.8;
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(68, 136, 255, 0.2)';
        ctx.fillStyle = 'rgba(68, 136, 255, ' + (0.12 * pulseBtn) + ')';
        var btnX = W / 2 - 65;
        var btnY = H * 0.86;
        var btnW = 130;
        var btnH = 32;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        } else {
            ctx.rect(btnX, btnY, btnW, btnH);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(68, 136, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        } else {
            ctx.rect(btnX, btnY, btnW, btnH);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#88aaff';
        ctx.font = 'bold 14px ' + FONT_BOLD;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔑 登录', W / 2, btnY + btnH / 2);
        ctx.restore();
    }
}

function drawTutorial() {
    // 半透明黑色背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 标题
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#4488ff';
    ctx.font = 'bold 32px ' + FONT_BOLD;
    ctx.fillText('操作指南', W / 2, 80);
    ctx.shadowBlur = 0;

    // 分隔线
    ctx.strokeStyle = 'rgba(68, 136, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 80, 110);
    ctx.lineTo(W / 2 + 80, 110);
    ctx.stroke();

    // 操作说明条目
    ctx.textAlign = 'left';
    const items = [
        { icon: '⌨️', text: '方向键 / WASD — 移动战机', y: 160 },
        { icon: '🔫', text: '空格键 — 射击（触屏自动射击）', y: 200 },
        { icon: '⏸', text: 'P / Esc — 暂停游戏', y: 240 },
        { icon: '⚡', text: 'E 键 — 释放大招（能量满时）', y: 280 },
        { icon: '🔇', text: 'M 键 — 切换音效', y: 320 },
        { icon: '⚙', text: 'S 键 — 打开设置', y: 360 }
    ];

    // 触屏设备额外说明
    if (isTouchDevice) {
        items.push({ icon: '👆', text: '右下角 ! 按钮 — 释放大招（触屏）', y: 400 });
    }

    items.forEach(item => {
        ctx.fillStyle = '#ffdd44';
        ctx.font = '18px ' + FONT_BOLD;
        ctx.fillText(item.icon, 80, item.y);
        ctx.fillStyle = '#cccccc';
        ctx.fillText(item.text, 120, item.y);
    });

    // 道具说明
    ctx.textAlign = 'center';
    ctx.fillStyle = '#88aaff';
    ctx.font = 'bold 18px ' + FONT_BOLD;
    ctx.fillText('道具说明', W / 2, 460);

    const powerups_desc = [
        { color: '#44cc44', label: 'S', text: '散射 — 三方向射击' },
        { color: '#cc4444', label: '+', text: '恢复 — 回复 1 点生命' },
        { color: '#4488ff', label: 'O', text: '护盾 — 抵挡一次伤害' },
        { color: '#ccaa44', label: '*', text: '火力 — 提升射速' }
    ];

    powerups_desc.forEach((p, idx) => {
        const px = 80 + idx * 100;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, 500, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(p.label, px, 501);
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '12px Arial';
        ctx.fillText(p.text, px, 530);
    });

    // 关闭按钮
    const pulse = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(68, 136, 255, ${pulse})`;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('点击或按任意键关闭', W / 2, 590);
}

function drawGameOver() {
    // 渐入动画
    if (gameOverFadeIn < 60) gameOverFadeIn++;
    var fadeProgress = Math.min(1, gameOverFadeIn / 30);
    // 黑色遮罩渐入（加深至0.75）
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.75 * fadeProgress) + ')';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (fadeProgress >= 0.3) {
        // 内容渐入透明度
        var contentAlpha = Math.min(1, (fadeProgress - 0.3) / 0.5);
        // 标题弹性缩放
        var titleScale = 1;
        var titleAge = gameOverFadeIn - 18;
        if (titleAge < 15) {
            var tt = titleAge / 15;
            titleScale = 1 + 0.5 * Math.pow(2, -10 * tt) * Math.sin((tt * 3 - 0.5) * Math.PI);
        }

        ctx.globalAlpha = contentAlpha;

        // 标题 - 弹性弹入
        ctx.save();
        ctx.translate(W / 2, H / 2 - 120);
        ctx.scale(titleScale, titleScale);
        ctx.translate(-W / 2, -(H / 2 - 120));

        // 标题多层光晕
        var titlePulse = Math.sin(frameCount * 0.04) * 0.15 + 0.85;
        // 外层大光晕
        var titleGlow = ctx.createRadialGradient(W / 2, H / 2 - 120, 5, W / 2, H / 2 - 120, 100);
        titleGlow.addColorStop(0, 'rgba(255, 68, 68, ' + (0.2 * titlePulse) + ')');
        titleGlow.addColorStop(1, 'rgba(255, 68, 68, 0)');
        ctx.fillStyle = titleGlow;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2 - 120, 100, 0, Math.PI * 2);
        ctx.fill();

        // 主层
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 35 + titlePulse * 15;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 48px ' + FONT_BOLD;
        ctx.fillText('游戏结束', W / 2, H / 2 - 120);

        // 高亮层
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 200, 200, ' + (0.2 * titlePulse) + ')';
        ctx.font = 'bold 48px ' + FONT_BOLD;
        ctx.fillText('游戏结束', W / 2 - 2, H / 2 - 121);

        ctx.restore();

        // 当前分数（带光晕）
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px ' + FONT_BOLD;
        ctx.fillText('当前分数: ' + score, W / 2, H / 2 - 50);

        const highScore = loadHighScore();
        ctx.shadowColor = '#ffdd44';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffdd44';
        ctx.font = 'bold 22px ' + FONT_BOLD;
        ctx.fillText('最高分: ' + highScore, W / 2, H / 2 - 15);

        // Task 3: 统计面板
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '14px ' + FONT_BOLD;
        const statY = H / 2 + 30;
        ctx.fillText('─── 统计 ───', W / 2, statY);

        const sSmall = stats.killedByType['SMALL'] || 0;
        const sNormal = stats.killedByType['NORMAL'] || 0;
        const sHeavy = stats.killedByType['HEAVY'] || 0;
        const sBoss = stats.killedByType['BOSS'] || 0;
        const sKamikaze = stats.killedByType['KAMIKAZE'] || 0;
        const sStealth = stats.killedByType['STEALTH'] || 0;
        const sSplitter = stats.killedByType['SPLITTER'] || 0;
        const sStageBoss = stats.killedByType['STAGE_BOSS'] || 0;
        const sSplit = stats.killedByType['SPLIT'] || 0;
        const survivalSec = Math.floor(stats.survivalFrames / 60);

        ctx.fillStyle = '#cccccc';
        ctx.font = '14px ' + FONT_BOLD;
        const lines = [
            '击落敌机: ' + stats.enemiesKilled,
            '  小型:'+sSmall+' 标准:'+sNormal+' 重型:'+sHeavy,
            '  Boss:'+sBoss+' 关卡Boss:'+sStageBoss+' 自爆:'+sKamikaze,
            '  隐形:'+sStealth+' 分裂:'+sSplitter+' 子机:'+sSplit,
            '存活时间: ' + survivalSec + ' 秒',
            '收集道具: ' + stats.powerupsCollected,
            '最高武器: Lv.' + stats.maxWeaponLevel
        ];
        lines.forEach((line, idx) => {
            ctx.fillStyle = '#cccccc';
            ctx.fillText(line, W / 2, statY + 30 + idx * 22);
        });

        // 底部装饰线
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 100, H / 2 + 195);
        ctx.lineTo(W / 2 + 100, H / 2 + 195);
        ctx.stroke();

        // 返回菜单提示
        const pulse = Math.sin(frameCount * 0.05) * 0.3 + 0.7;
        ctx.fillStyle = 'rgba(170, 170, 170, ' + pulse + ')';
        ctx.font = '18px ' + FONT_BOLD;
        ctx.fillText('按空格或点击返回主菜单', W / 2, H / 2 + 170);

        // 再来一局按钮（圆角矩形+脉冲光晕）
        const restartBtnX = W / 2;
        const restartBtnY = H / 2 + 215;
        const btnW = 140;
        const btnH = 44;
        const pulse2 = Math.sin(frameCount * 0.05 + 1) * 0.2 + 0.8;
        // 按钮光晕
        var btnGlow = ctx.createRadialGradient(restartBtnX, restartBtnY, 10, restartBtnX, restartBtnY, 80);
        btnGlow.addColorStop(0, 'rgba(68, 200, 68, ' + (0.15 * pulse2) + ')');
        btnGlow.addColorStop(1, 'rgba(68, 200, 68, 0)');
        ctx.fillStyle = btnGlow;
        ctx.beginPath();
        ctx.arc(restartBtnX, restartBtnY, 80, 0, Math.PI * 2);
        ctx.fill();
        // 按钮背景
        ctx.fillStyle = 'rgba(68, 200, 68, ' + (0.2 * pulse2) + ')';
        ctx.beginPath();
        ctx.roundRect(restartBtnX - btnW / 2, restartBtnY - btnH / 2, btnW, btnH, 22);
        ctx.fill();
        ctx.strokeStyle = 'rgba(68, 200, 68, ' + (0.6 * pulse2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(restartBtnX - btnW / 2, restartBtnY - btnH / 2, btnW, btnH, 22);
        ctx.stroke();
        // 按钮文字
        ctx.fillStyle = '#44c844';
        ctx.font = 'bold 22px ' + FONT_BOLD;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔄 再来一局', restartBtnX, restartBtnY + 1);
        ctx.globalAlpha = 1;
    }
}

// 暂停遮罩
function drawPauseOverlay() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#4488ff';
    ctx.font = 'bold 48px ' + FONT_BOLD;
    ctx.fillText('已暂停', W / 2, H / 2);

    // 微光动画
    var pausePulse = Math.sin(frameCount * 0.04) * 0.1 + 0.9;
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.2 * pausePulse;
    ctx.fillStyle = '#88bbff';
    ctx.font = 'bold 48px ' + FONT_BOLD;
    ctx.fillText('已暂停', W / 2 + 2, H / 2 + 2);
    ctx.globalAlpha = 1;

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(170, 170, 170, 0.6)';
    ctx.font = '18px ' + FONT_BOLD;
    ctx.fillText('按 P / Esc 继续', W / 2, H / 2 + 55);

    if (isTouchDevice) {
        ctx.fillText('点击继续', W / 2, H / 2 + 85);
    }
}

// ===== 主循环 =====
function gameLoop() {
    frameCount++;

    // 背景色调缓慢循环
    bgHue = (bgHue + 0.05) % 360;

    // 清屏（使用动态色调背景）
    var bgColor = hslToRgb(bgHue / 360, 0.5, 0.06);
    ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
    ctx.fillRect(0, 0, W, H);

    // 游戏内星云（非菜单状态时才绘制）
    if (gameState !== 'menu') {
        for (const nb of gameNebula) {
            var nbDriftX = Math.sin(frameCount * nb.speedX * 3) * 20;
            var nbDriftY = Math.cos(frameCount * nb.speedY * 3) * 15;
            var nbCx = nb.x * W + nbDriftX;
            var nbCy = nb.y * H + nbDriftY;
            var nbPulse = Math.sin(frameCount * 0.008 + nb.x * 5) * 0.008 + 0.025;
            var nbGrad = ctx.createRadialGradient(nbCx, nbCy, 0, nbCx, nbCy, nb.r);
            nbGrad.addColorStop(0, 'rgba(' + nb.color[0] + ',' + nb.color[1] + ',' + nb.color[2] + ',' + nbPulse + ')');
            nbGrad.addColorStop(1, 'rgba(' + nb.color[0] + ',' + nb.color[1] + ',' + nb.color[2] + ',0)');
            ctx.fillStyle = nbGrad;
            ctx.beginPath();
            ctx.arc(nbCx, nbCy, nb.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 星星 (所有状态，包括暂停)
    for (const star of stars) {
        star.update();
        star.draw();
    }

    // 屏幕震动 (不受暂停影响)
    if (screenShake > 0 && settings.screenShakeEnabled) {
        const shakeX = (Math.random() - 0.5) * 2 * screenShakeIntensity;
        const shakeY = (Math.random() - 0.5) * 2 * screenShakeIntensity;
        ctx.save();
        ctx.translate(shakeX, shakeY);
    }

    // BGM 管理
    if (gameState === 'menu') {
        // 菜单 BGM（激昂）
        audio.startMenuBGM();
        // 停止游戏 BGM
        audio.stopBGM();
        if (audio.bgmGain && audio.bgmGain.gain.value !== 0.15) {
            audio.setBgmVolume(0.15);
        }
    } else if (gameState === 'playing' || gameState === 'paused') {
        // 停止菜单 BGM，切回游戏 BGM
        audio.stopMenuBGM();
        if (!audio._bgmTimer) {
            audio.startBGM();
        }
        if (audio.bgmGain && audio.bgmGain.gain.value !== 0.25) {
            audio.setBgmVolume(0.25);
        }
    }

    if (gameState === 'playing') {
        // 命中冻结帧：游戏中止更新但继续渲染
        if (hitFreezeTimer > 0) {
            hitFreezeTimer--;
        } else {
            playingFrameCount++;
            // 关卡内难度递增（每 900 帧 +1，最大到 5）
            difficultyLevel = Math.min(5, Math.floor((playingFrameCount % STAGE_DURATION) / 900) + 1);

            // Task 3: 统计存活帧数
            stats.survivalFrames++;

            // Boss 预警提示
            const framesUntilBoss = STAGE_DURATION - (playingFrameCount % STAGE_DURATION);
            if (framesUntilBoss > 0 && framesUntilBoss <= 180 && !stageBossSpawned) {
                // 最后 3 秒预警（180帧 = 3秒 @ 60fps）
                const warnAlpha = Math.sin(frameCount * 0.15) * 0.4 + 0.6;
                ctx.save();
                ctx.globalAlpha = warnAlpha;
                ctx.fillStyle = '#ff4444';
                ctx.font = 'bold 28px ' + FONT_BOLD;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 20;
                ctx.fillText('⚠ 警告！Boss 即将来袭！', W / 2, 80);
                ctx.restore();
            }

            updatePlayer();
            updateBullets();
            updateEnemies();
            updateEnemyBullets();
            updatePowerups();
            checkCollisions();

            // Task 2: 升级提示倒计时
            if (upgradeNotification > 0) upgradeNotification--;

            // 连击超时重置
            if (comboCount > 0 && frameCount - lastKillTime > COMBO_WINDOW) {
                comboCount = 0;
                scoreMultiplier = 1;
                lastComboMilestone = 0;
            }

            // 大招闪光倒计时
            if (ultimateFlashTimer > 0) ultimateFlashTimer--;

            // 关卡过渡提示倒计时
            if (stageTransitionTimer > 0) stageTransitionTimer--;
        }
    }

    if (gameState === 'paused') {
        // 暂停时仍然更新星空和粒子、震动
        if (upgradeNotification > 0) upgradeNotification--;
    }

    // 绘制游戏对象（菜单状态由 drawMenu 自行绘制飞船）
    if (gameState !== 'menu') {
        ctx.save();
        drawBullets();
        drawEnemyBullets();
        drawBossLasers();
        drawEnemies();
        drawPowerups();
        drawPlayer();
        ctx.restore();
    }

    // 粒子 (所有状态，包括暂停)
    for (let i = particles.length - 1; i >= 0; i--) {
        const alive = particles[i].update();
        if (!alive) {
            particles.splice(i, 1);
        } else {
            particles[i].draw();
        }
    }

    // 得分飘字更新与绘制
    for (var fti = floatTexts.length - 1; fti >= 0; fti--) {
        var ft = floatTexts[fti];
        ft.y += ft.vy;
        ft.life--;
        if (ft.life <= 0) {
            floatTexts.splice(fti, 1);
        } else {
            var ftAlpha = ft.life / ft.maxLife;
            ctx.save();
            ctx.globalAlpha = ftAlpha;
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 16px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    // 恢复屏幕震动 transform
    if (screenShake > 0 && settings.screenShakeEnabled) {
        ctx.restore();
        screenShake--;
    }

    // UI (不受震动影响)
    if (gameState === 'menu') {
        // 检测并显示教程
        if (!hasSeenTutorial() && !settingsOpen) {
            tutorialOpen = true;
        }
        drawMenu();
        if (settingsOpen) {
            drawSettingsPanel();
        }
        if (tutorialOpen) {
            drawTutorial();
        }
    } else if (gameState === 'playing') {
        drawUI();
    } else if (gameState === 'paused') {
        drawUI();
        drawPauseOverlay();
    } else if (gameState === 'over') {
        drawUI();
        drawGameOver();
    }

    requestAnimationFrame(gameLoop);
}

// ===== roundRect polyfill for older browsers =====
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (r > w / 2) r = w / 2;
        if (r > h / 2) r = h / 2;
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        return this;
    };
}

// ===== 启动游戏 =====
initHUDOverlay();
gameLoop();