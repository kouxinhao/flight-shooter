// ===== 登录 UI 面板 =====
(function () {
    'use strict';

    var overlay = null;
    var modal = null;
    var isDragging = false;
    var dragOffsetX = 0;
    var dragOffsetY = 0;
    var countdownTimer = null;
    var countdownValue = 0;
    var userBadge = null;

    // ---- DOM 创建 ----
    function createStyles() {
        var style = document.createElement('style');
        style.textContent =
            '#authOverlay {' +
            '  position: fixed; top: 0; left: 0; width: 100%; height: 100%;' +
            '  background: rgba(0, 0, 0, 0.6);' +
            '  display: none;' +
            '  justify-content: center;' +
            '  align-items: center;' +
            '  z-index: 1000;' +
            '}' +
            '#authModal {' +
            '  position: absolute;' +
            '  background: #0f0f2a;' +
            '  border: 1px solid rgba(68, 136, 255, 0.4);' +
            '  border-radius: 12px;' +
            '  width: 380px;' +
            '  max-width: 90vw;' +
            '  color: #cccccc;' +
            '  font-family: Arial, sans-serif;' +
            '  box-shadow: 0 0 60px rgba(68, 136, 255, 0.25), 0 8px 32px rgba(0, 0, 0, 0.4);' +
            '  overflow: hidden;' +
            '  user-select: none;' +
            '}' +
            '#authHeader {' +
            '  display: flex;' +
            '  justify-content: space-between;' +
            '  align-items: center;' +
            '  padding: 14px 18px;' +
            '  background: rgba(68, 136, 255, 0.1);' +
            '  cursor: move;' +
            '  border-bottom: 1px solid rgba(68, 136, 255, 0.15);' +
'  backdrop-filter: blur(6px);' +
'  -webkit-backdrop-filter: blur(6px);' +
            '}' +
            '#authHeader h3 {' +
            '  margin: 0;' +
            '  color: #88aaff;' +
            '  font-size: 18px;' +
            '  font-weight: bold;' +
            '}' +
            '#authClose {' +
            '  background: none;' +
            '  border: none;' +
            '  color: #888888;' +
            '  font-size: 22px;' +
            '  cursor: pointer;' +
            '  padding: 0 4px;' +
            '  line-height: 1;' +
            '}' +
            '#authClose:hover {' +
            '  color: #ff6666;' +
'  transform: scale(1.1);' +
            '}' +
            '#authTabs {' +
            '  display: flex;' +
            '  border-bottom: 1px solid rgba(68, 136, 255, 0.15);' +
            '}' +
            '.authTab {' +
            '  flex: 1;' +
            '  padding: 10px 0;' +
            '  text-align: center;' +
            '  cursor: pointer;' +
            '  font-size: 14px;' +
            '  color: #888888;' +
            '  background: transparent;' +
            '  border: none;' +
            '  border-bottom: 2px solid transparent;' +
            '  transition: all 0.2s;' +
            '}' +
            '.authTab:hover {' +
            '  color: #aaccff;' +
            '}' +
            '.authTab.active {' +
            '  color: #88aaff;' +
            '  border-bottom-color: #4488ff;' +
            '}' +
            '#authContent {' +
            '  padding: 24px 20px;' +
            '}' +
            '.authTabContent {' +
            '  display: none;' +
            '}' +
            '.authTabContent.active {' +
            '  display: block;' +
            '}' +
            '#authContent input[type="text"],' +
            '#authContent input[type="tel"],' +
            '#authContent input[type="email"] {' +
            '  width: 100%;' +
            '  padding: 10px 12px;' +
            '  margin-bottom: 12px;' +
            '  background: rgba(255, 255, 255, 0.06);' +
            '  border: 1px solid rgba(255, 255, 255, 0.12);' +
            '  border-radius: 6px;' +
            '  color: #ffffff;' +
            '  font-size: 15px;' +
            '  outline: none;' +
            '  box-sizing: border-box;' +
            '}' +
            '#authContent input:focus {' +
            '  border-color: rgba(68, 136, 255, 0.8);' +
'  box-shadow: 0 0 12px rgba(68, 136, 255, 0.15);' +
            '}' +
            '#authContent input::placeholder {' +
            '  color: rgba(255, 255, 255, 0.3);' +
            '}' +
            '.authBtn {' +
            '  width: 100%;' +
            '  padding: 10px 0;' +
            '  background: rgba(68, 136, 255, 0.35);' +
            '  border: 1px solid rgba(68, 136, 255, 0.4);' +
            '  border-radius: 6px;' +
            '  color: #88aaff;' +
            '  font-size: 16px;' +
            '  font-weight: bold;' +
            '  cursor: pointer;' +
            '  transition: background 0.2s;' +
            '  text-align: center;' +
            '  margin-top: 4px;' +
            '}' +
            '.authBtn:hover {' +
            '  background: rgba(68, 136, 255, 0.55);' +
            '}' +
            '.authBtn:disabled {' +
            '  opacity: 0.5;' +
            '  cursor: not-allowed;' +
            '}' +
            '.authBtn.small {' +
            '  width: auto;' +
            '  padding: 8px 14px;' +
            '  font-size: 13px;' +
            '  margin: 0;' +
            '  flex-shrink: 0;' +
            '}' +
            '.authCodeRow {' +
            '  display: flex;' +
            '  gap: 8px;' +
            '  align-items: center;' +
            '  margin-bottom: 12px;' +
            '}' +
            '.authCodeRow input {' +
            '  flex: 1;' +
            '  margin-bottom: 0;' +
            '}' +
            '.authHint {' +
            '  color: rgba(255, 255, 255, 0.35);' +
            '  font-size: 12px;' +
            '  text-align: center;' +
            '  margin-top: 16px;' +
            '  line-height: 1.5;' +
            '}' +
            '.authError {' +
            '  color: #ff6666;' +
            '  font-size: 13px;' +
            '  text-align: center;' +
            '  margin-bottom: 8px;' +
            '  min-height: 18px;' +
            '}' +
            '.authSocialBtn {' +
            '  display: flex;' +
            '  align-items: center;' +
            '  justify-content: center;' +
            '  gap: 8px;' +
            '  width: 100%;' +
            '  padding: 12px 0;' +
            '  border-radius: 8px;' +
            '  border: 1px solid rgba(255, 255, 255, 0.12);' +
            '  background: rgba(255, 255, 255, 0.05);' +
            '  color: #cccccc;' +
            '  font-size: 16px;' +
            '  cursor: pointer;' +
            '  transition: background 0.2s;' +
            '  margin-bottom: 12px;' +
            '}' +
            '.authSocialBtn:hover {' +
            '  background: rgba(255, 255, 255, 0.1);' +
            '}' +
            '.authSocialBtn .icon {' +
            '  font-size: 22px;' +
            '}' +
            '#userBadge {' +
            '  position: fixed;' +
            '  top: 8px;' +
            '  right: 8px;' +
            '  background: rgba(15, 15, 42, 0.85);' +
            '  border: 1px solid rgba(68, 136, 255, 0.3);' +
            '  border-radius: 10px;' +
            '  padding: 6px 14px;' +
            '  color: #88aaff;' +
            '  font-size: 13px;' +
            '  font-family: Arial, sans-serif;' +
            '  z-index: 999;' +
'  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);' +
            '  display: none;' +
            '  align-items: center;' +
            '  gap: 6px;' +
            '  pointer-events: none;' +
            '}' +
            '#userBadge .logoutBtn {' +
            '  pointer-events: auto;' +
            '  background: none;' +
            '  border: none;' +
            '  color: #ff6666;' +
            '  cursor: pointer;' +
            '  font-size: 12px;' +
            '  padding: 2px 6px;' +
            '  margin-left: 4px;' +
            '  border-radius: 4px;' +
            '}' +
            '#userBadge .logoutBtn:hover {' +
            '  background: rgba(255, 102, 102, 0.15);' +
            '}';
        document.head.appendChild(style);
    }

    function createElements() {
        // 遮罩层
        overlay = document.createElement('div');
        overlay.id = 'authOverlay';

        // 模态框
        modal = document.createElement('div');
        modal.id = 'authModal';

        // 标题栏
        var header = document.createElement('div');
        header.id = 'authHeader';
        header.innerHTML = '<h3>用户登录</h3><button id="authClose">✕</button>';

        // Tab 栏
        var tabs = document.createElement('div');
        tabs.id = 'authTabs';
        tabs.innerHTML =
            '<button class="authTab active" data-tab="email">📧 邮箱登录</button>' +
            '<button class="authTab" data-tab="wechat">💬 微信登录</button>' +
            '<button class="authTab" data-tab="qq">🐧 QQ 登录</button>';

        // 内容区
        var content = document.createElement('div');
        content.id = 'authContent';

        // 错误提示
        var errorDiv = document.createElement('div');
        errorDiv.className = 'authError';
        errorDiv.id = 'authError';

        // ---- 邮箱登录 tab ----
        var emailContent = document.createElement('div');
        emailContent.className = 'authTabContent active';
        emailContent.id = 'authEmailContent';
        emailContent.innerHTML =
            '<input type="email" id="authEmail" placeholder="请输入邮箱地址" />' +
            '<div class="authCodeRow">' +
            '  <input type="text" id="authCode" placeholder="验证码（6位数字）" maxlength="6" />' +
            '  <button class="authBtn small" id="authSendCode">获取验证码</button>' +
            '</div>' +
            '<button class="authBtn" id="authEmailLogin">登录 / 注册</button>' +
            '<div class="authHint">提示：未登录也可直接开始游戏</div>';

        // ---- 微信登录 tab ----
        var wechatContent = document.createElement('div');
        wechatContent.className = 'authTabContent';
        wechatContent.id = 'authWechatContent';
        wechatContent.innerHTML =
            '<button class="authSocialBtn" id="authWechatBtn">' +
            '  <span class="icon">💬</span> 微信登录' +
            '</button>' +
            '<div class="authHint">微信登录需在微信开放平台注册应用</div>';

        // ---- QQ 登录 tab ----
        var qqContent = document.createElement('div');
        qqContent.className = 'authTabContent';
        qqContent.id = 'authQQContent';
        qqContent.innerHTML =
            '<button class="authSocialBtn" id="authQQBtn">' +
            '  <span class="icon">🐧</span> QQ 登录' +
            '</button>' +
            '<div class="authHint">QQ 登录需在 QQ 互联平台注册应用</div>';

        content.appendChild(errorDiv);
        content.appendChild(emailContent);
        content.appendChild(wechatContent);
        content.appendChild(qqContent);

        modal.appendChild(header);
        modal.appendChild(tabs);
        modal.appendChild(content);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 用户信息浮标
        userBadge = document.createElement('div');
        userBadge.id = 'userBadge';
        document.body.appendChild(userBadge);
    }

    // ---- 事件绑定 ----
    function bindEvents() {
        // 关闭按钮
        document.getElementById('authClose').addEventListener('click', function () {
            hide();
        });

        // 点击遮罩关闭
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                hide();
            }
        });

        // Tab 切换
        var tabButtons = document.querySelectorAll('.authTab');
        tabButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tab = this.getAttribute('data-tab');
                switchTab(tab);
            });
        });

        // 发送验证码
        document.getElementById('authSendCode').addEventListener('click', function () {
            var email = document.getElementById('authEmail').value.trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showError('请输入有效的邮箱地址');
                return;
            }
            doSendCode(email);
        });

        // 邮箱登录
        document.getElementById('authEmailLogin').addEventListener('click', function (e) {
            e.preventDefault();
            var email = document.getElementById('authEmail').value.trim();
            var code = document.getElementById('authCode').value.trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showError('请输入有效的邮箱地址');
                return;
            }
            if (!code || code.length !== 6) {
                showError('请输入6位验证码');
                return;
            }
            doEmailLogin(email, code);
        });

        // 回车键发送验证码
        document.getElementById('authEmail').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                document.getElementById('authSendCode').click();
            }
        });

        // 回车键触发登录
        document.getElementById('authCode').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                document.getElementById('authEmailLogin').click();
            }
        });

        // 微信登录
        document.getElementById('authWechatBtn').addEventListener('click', function (e) {
            e.preventDefault();
            doWechatLogin();
        });

        // QQ 登录
        document.getElementById('authQQBtn').addEventListener('click', function (e) {
            e.preventDefault();
            doQQLogin();
        });

        // 拖拽
        var header = document.getElementById('authHeader');
        header.addEventListener('mousedown', function (e) {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            var rect = modal.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            modal.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            var left = e.clientX - dragOffsetX;
            var top = e.clientY - dragOffsetY;
            // 限制在视口内
            var maxX = window.innerWidth - modal.offsetWidth;
            var maxY = window.innerHeight - modal.offsetHeight;
            if (left < 0) left = 0;
            if (top < 0) top = 0;
            if (left > maxX) left = maxX;
            if (top > maxY) top = maxY;
            modal.style.left = left + 'px';
            modal.style.top = top + 'px';
            modal.style.position = 'absolute';
            modal.style.margin = '0';
        });

        document.addEventListener('mouseup', function () {
            if (isDragging) {
                isDragging = false;
                modal.style.cursor = '';
            }
        });

        // 触屏拖拽
        header.addEventListener('touchstart', function (e) {
            if (e.target.tagName === 'BUTTON') return;
            var touch = e.changedTouches[0];
            isDragging = true;
            var rect = modal.getBoundingClientRect();
            dragOffsetX = touch.clientX - rect.left;
            dragOffsetY = touch.clientY - rect.top;
        }, { passive: true });

        document.addEventListener('touchmove', function (e) {
            if (!isDragging) return;
            var touch = e.changedTouches[0];
            var left = touch.clientX - dragOffsetX;
            var top = touch.clientY - dragOffsetY;
            var maxX = window.innerWidth - modal.offsetWidth;
            var maxY = window.innerHeight - modal.offsetHeight;
            if (left < 0) left = 0;
            if (top < 0) top = 0;
            if (left > maxX) left = maxX;
            if (top > maxY) top = maxY;
            modal.style.left = left + 'px';
            modal.style.top = top + 'px';
            modal.style.position = 'absolute';
            modal.style.margin = '0';
        }, { passive: true });

        document.addEventListener('touchend', function () {
            isDragging = false;
        }, { passive: true });
    }

    // ---- Tab 切换 ----
    function switchTab(tab) {
        document.querySelectorAll('.authTab').forEach(function (btn) {
            var isActive = btn.getAttribute('data-tab') === tab;
            btn.classList.toggle('active', isActive);
        });
        document.querySelectorAll('.authTabContent').forEach(function (el) {
            el.classList.remove('active');
        });
        // 特殊处理 email tab（首字母 e 小写）
        var targetId = tab === 'email' ? 'authEmailContent' : 'auth' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Content';
        var target = document.getElementById(targetId);
        if (target) target.classList.add('active');
        clearError();
    }

    // ---- 发送验证码 ----
    function doSendCode(email) {
        var btn = document.getElementById('authSendCode');
        btn.disabled = true;
        btn.textContent = '发送中...';

        sendCode(email).then(function (res) {
            if (res.success) {
                clearError();
                showError('验证码已发送，请查收邮件');
                startCountdown(60);
            } else {
                showError(res.error || '发送失败，请重试');
                btn.disabled = false;
                btn.textContent = '获取验证码';
            }
        }).catch(function () {
            showError('网络错误，请检查连接');
            btn.disabled = false;
            btn.textContent = '获取验证码';
        });
    }

    // ---- 倒计时 ----
    function startCountdown(seconds) {
        var btn = document.getElementById('authSendCode');
        countdownValue = seconds;
        btn.textContent = countdownValue + 's';
        countdownTimer = setInterval(function () {
            countdownValue--;
            if (countdownValue <= 0) {
                clearInterval(countdownTimer);
                countdownTimer = null;
                btn.disabled = false;
                btn.textContent = '获取验证码';
            } else {
                btn.textContent = countdownValue + 's';
            }
        }, 1000);
    }

    // ---- 邮箱登录 ----
    function doEmailLogin(email, code) {
        var loginBtn = document.getElementById('authEmailLogin');
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';

        verifyCode(email, code).then(function (res) {
            if (res.success && res.token && res.user) {
                clearError();
                if (typeof onLoginSuccess === 'function') {
                    onLoginSuccess(res.token, res.user);
                }
            } else {
                showError(res.error || '验证码错误');
                loginBtn.disabled = false;
                loginBtn.textContent = '登录 / 注册';
            }
        }).catch(function () {
            showError('网络错误，请检查连接');
            loginBtn.disabled = false;
            loginBtn.textContent = '登录 / 注册';
        });
    }

    // ---- 微信登录 ----
    function doWechatLogin() {
        var code = prompt('请输入微信授权码（模拟）：');
        if (!code) return;

        wechatLogin(code).then(function (res) {
            if (res.success && res.token && res.user) {
                clearError();
                if (typeof onLoginSuccess === 'function') {
                    onLoginSuccess(res.token, res.user);
                }
            } else {
                showError(res.error || '微信登录失败');
            }
        }).catch(function () {
            showError('网络错误，请检查连接');
        });
    }

    // ---- QQ 登录 ----
    function doQQLogin() {
        var code = prompt('请输入 QQ 授权码（模拟）：');
        if (!code) return;

        qqLogin(code).then(function (res) {
            if (res.success && res.token && res.user) {
                clearError();
                if (typeof onLoginSuccess === 'function') {
                    onLoginSuccess(res.token, res.user);
                }
            } else {
                showError(res.error || 'QQ 登录失败');
            }
        }).catch(function () {
            showError('网络错误，请检查连接');
        });
    }

    // ---- 错误提示 ----
    function showError(msg) {
        document.getElementById('authError').textContent = msg;
    }

    function clearError() {
        document.getElementById('authError').textContent = '';
    }

    // ---- 显示/隐藏 ----
    function show() {
        if (!overlay) return;
        // 如果已登录，不显示登录面板
        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            return;
        }
        overlay.style.display = 'flex';
        modal.style.position = '';
        modal.style.left = '';
        modal.style.top = '';
        modal.style.margin = '';
        clearError();
        // 重置倒计时
        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
        var sendBtn = document.getElementById('authSendCode');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = '获取验证码';
        }
        var loginBtn = document.getElementById('authEmailLogin');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = '登录 / 注册';
        }
    }

    function hide() {
        if (!overlay) return;
        overlay.style.display = 'none';
    }

    // ---- 更新用户信息 ----
    function updateUserInfo(user) {
        if (!userBadge) return;
        if (user && user.nickname) {
            userBadge.style.display = 'flex';
            userBadge.innerHTML =
                '<span>👤 ' + escapeHtml(user.nickname) + '</span>' +
                '<button class="logoutBtn" id="authLogoutBtn">退出</button>';
            // 绑定登出事件
            var logoutBtn = document.getElementById('authLogoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (typeof onLogout === 'function') {
                        onLogout();
                    }
                    updateUserInfo(null);
                });
            }
        } else {
            userBadge.style.display = 'none';
        }
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ---- 初始化 ----
    function init() {
        if (document.getElementById('authOverlay')) return; // 防止重复初始化
        createStyles();
        createElements();
        bindEvents();
        // 恢复已登录状态
        if (typeof getUser === 'function' && typeof isLoggedIn === 'function') {
            var user = getUser();
            if (user && isLoggedIn()) {
                updateUserInfo(user);
            }
        }
    }

    // ---- 对外暴露 ----
    window.AuthUI = {
        show: show,
        hide: hide,
        updateUserInfo: updateUserInfo,
        init: init
    };
})();