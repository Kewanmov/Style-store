var API_URL = window.API_BASE;

(function () {
    var token = localStorage.getItem('access_token');
    var user = localStorage.getItem('user');
    if (token && user) {
        try {
            var userData = JSON.parse(user);
            if (userData.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        } catch (e) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
        }
    }
})();

document.addEventListener('DOMContentLoaded', function () {
    initBurger();
    initTabs();
    initLoginForm();
    initRegisterForm();
    initPasswordStrength();
    initPasswordConfirm();
    checkTabParam();
});

function checkTabParam() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'register') {
        showTab('register');
    }
}

function initBurger() {
    var btn = document.getElementById('burger-btn');
    var menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
        menu.classList.toggle('open');
        btn.classList.toggle('burger-active');
    });
    document.addEventListener('click', function (e) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove('open');
            btn.classList.remove('burger-active');
        }
    });
}

function initTabs() {
    var tabLogin = document.getElementById('tab-login');
    var tabReg = document.getElementById('tab-register');
    if (tabLogin) tabLogin.addEventListener('click', function () { showTab('login'); });
    if (tabReg) tabReg.addEventListener('click', function () { showTab('register'); });
}

function showTab(tab) {
    var loginForm = document.getElementById('login-form');
    var regForm = document.getElementById('register-form');
    var tabLogin = document.getElementById('tab-login');
    var tabReg = document.getElementById('tab-register');
    var footerLogin = document.getElementById('auth-footer-login');
    var footerReg = document.getElementById('auth-footer-register');

    hideMessages();

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.classList.add('active');
        tabReg.classList.remove('active');
        if (footerLogin) footerLogin.classList.remove('hidden');
        if (footerReg) footerReg.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabLogin.classList.remove('active');
        tabReg.classList.add('active');
        if (footerLogin) footerLogin.classList.add('hidden');
        if (footerReg) footerReg.classList.remove('hidden');
    }
}

function showError(text) {
    var el = document.getElementById('error-msg');
    var textEl = document.getElementById('error-text');
    if (textEl) textEl.textContent = text;
    el.classList.add('show');
    el.style.display = 'flex';
    var successEl = document.getElementById('success-msg');
    successEl.classList.remove('show');
    successEl.style.display = 'none';
}

function showSuccess(text) {
    var el = document.getElementById('success-msg');
    var textEl = document.getElementById('success-text');
    if (textEl) textEl.textContent = text;
    el.classList.add('show');
    el.style.display = 'flex';
    var errorEl = document.getElementById('error-msg');
    errorEl.classList.remove('show');
    errorEl.style.display = 'none';
}

function hideMessages() {
    var errorEl = document.getElementById('error-msg');
    var successEl = document.getElementById('success-msg');
    errorEl.classList.remove('show');
    errorEl.style.display = 'none';
    successEl.classList.remove('show');
    successEl.style.display = 'none';
}

function clearLoginPassword() {
    var passwordInput = document.getElementById('login-password');
    if (passwordInput) {
        passwordInput.value = '';
        if (passwordInput.type === 'text') {
            passwordInput.type = 'password';
            var btn = passwordInput.parentElement.querySelector('.toggle-password');
            if (btn) {
                btn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            }
        }
    }
}

function clearRegisterPasswords() {
    var passwordInput = document.getElementById('reg-password');
    var confirmInput = document.getElementById('reg-password-confirm');

    if (passwordInput) {
        passwordInput.value = '';
        if (passwordInput.type === 'text') {
            passwordInput.type = 'password';
            var btn = passwordInput.parentElement.querySelector('.toggle-password');
            if (btn) {
                btn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            }
        }
        var strengthContainer = document.getElementById('password-strength');
        if (strengthContainer) strengthContainer.classList.remove('visible');
    }

    if (confirmInput) {
        confirmInput.value = '';
        confirmInput.classList.remove('input-error', 'input-ok');
        if (confirmInput.type === 'text') {
            confirmInput.type = 'password';
            var btn = confirmInput.parentElement.querySelector('.toggle-password');
            if (btn) {
                btn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            }
        }
        var hint = document.getElementById('password-match-hint');
        if (hint) {
            hint.textContent = '';
            hint.className = 'password-match-hint';
        }
    }
}

function initLoginForm() {
    var form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideMessages();

        var emailInput = document.getElementById('login-email');
        var email = emailInput.value.trim();
        var password = document.getElementById('login-password').value;
        var btn = document.getElementById('login-btn');
        var btnText = btn.querySelector('.btn-text');
        var btnLoader = btn.querySelector('.btn-loader');

        if (!email || !password) {
            showError('Заполните все поля');
            if (!email) emailInput.focus();
            else clearLoginPassword();
            return;
        }

        if (password.length < 6) {
            showError('Пароль должен быть не менее 6 символов');
            clearLoginPassword();
            return;
        }

        btn.disabled = true;
        if (btnText) btnText.textContent = 'Входим...';
        if (btnLoader) btnLoader.classList.remove('hidden');

        try {
            var loginRes = await fetch(API_URL + '/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            });

            var loginData = await loginRes.json();

            if (!loginRes.ok) {
                throw new Error(loginData.detail || 'Неверный логин или пароль');
            }

            localStorage.setItem('access_token', loginData.access_token);

            var userRes = await fetch(API_URL + '/users/me', {
                headers: { 'Authorization': 'Bearer ' + loginData.access_token }
            });

            if (!userRes.ok) throw new Error('Не удалось получить данные пользователя');

            var userData = await userRes.json();
            localStorage.setItem('user', JSON.stringify(userData));

            showSuccess('Добро пожаловать, ' + (userData.name || 'пользователь') + '!');

            setTimeout(function () {
                if (userData.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1000);

        } catch (err) {
            showError(err.message || 'Ошибка подключения к серверу');
            clearLoginPassword();
            document.getElementById('login-email').focus();
            btn.disabled = false;
            if (btnText) btnText.textContent = 'Войти';
            if (btnLoader) btnLoader.classList.add('hidden');
        }
    });
}

function initRegisterForm() {
    var form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideMessages();

        var nameInput = document.getElementById('reg-name');
        var emailInput = document.getElementById('reg-email');
        var name = nameInput.value.trim();
        var email = emailInput.value.trim();
        var phone = document.getElementById('reg-phone').value.trim();
        var password = document.getElementById('reg-password').value;
        var passwordConfirm = document.getElementById('reg-password-confirm').value;
        var btn = document.getElementById('reg-btn');
        var btnText = btn.querySelector('.btn-text');
        var btnLoader = btn.querySelector('.btn-loader');

        if (!name || !email || !password || !passwordConfirm) {
            showError('Заполните все обязательные поля');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            showError('Имя пользователя — только латиница, цифры и _');
            nameInput.focus();
            return;
        }

        if (name.length < 3) {
            showError('Имя пользователя — минимум 3 символа');
            nameInput.focus();
            return;
        }

        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('Введите корректный email адрес');
            emailInput.focus();
            return;
        }

        if (password.length < 6) {
            showError('Пароль должен быть не менее 6 символов');
            clearRegisterPasswords();
            return;
        }

        if (password !== passwordConfirm) {
            showError('Пароли не совпадают');
            document.getElementById('reg-password-confirm').classList.add('input-error');
            clearRegisterPasswords();
            return;
        }

        btn.disabled = true;
        if (btnText) btnText.textContent = 'Создаём аккаунт...';
        if (btnLoader) btnLoader.classList.remove('hidden');

        try {
            var regRes = await fetch(API_URL + '/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    phone: phone,
                    password: password
                })
            });

            var regData = await regRes.json();

            if (!regRes.ok) {
                throw new Error(regData.detail || 'Ошибка регистрации');
            }

            if (regData.access_token) {
                localStorage.setItem('access_token', regData.access_token);

                var userRes = await fetch(API_URL + '/users/me', {
                    headers: { 'Authorization': 'Bearer ' + regData.access_token }
                });

                if (userRes.ok) {
                    var userData = await userRes.json();
                    localStorage.setItem('user', JSON.stringify(userData));
                }

                showSuccess('Аккаунт создан! Добро пожаловать!');
                setTimeout(function () { window.location.href = 'index.html'; }, 1200);
            } else {
                showSuccess('Регистрация успешна! Войдите в аккаунт.');
                setTimeout(function () {
                    showTab('login');
                    var loginEmail = document.getElementById('login-email');
                    if (loginEmail) loginEmail.value = email;
                }, 1500);
                btn.disabled = false;
                if (btnText) btnText.textContent = 'Зарегистрироваться';
                if (btnLoader) btnLoader.classList.add('hidden');
            }

        } catch (err) {
            showError(err.message || 'Ошибка подключения к серверу');
            clearRegisterPasswords();
            btn.disabled = false;
            if (btnText) btnText.textContent = 'Зарегистрироваться';
            if (btnLoader) btnLoader.classList.add('hidden');
        }
    });
}

function initPasswordStrength() {
    var input = document.getElementById('reg-password');
    if (!input) return;

    input.addEventListener('input', function () {
        var val = input.value;
        var container = document.getElementById('password-strength');
        var fill = document.getElementById('strength-fill');
        var text = document.getElementById('strength-text');

        if (!container || !fill || !text) return;

        if (val.length === 0) {
            container.classList.remove('visible');
            return;
        }

        container.classList.add('visible');

        var score = 0;
        if (val.length >= 6) score++;
        if (val.length >= 10) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        fill.className = 'strength-fill';
        text.className = 'strength-text';

        if (score <= 2) {
            fill.classList.add('weak');
            text.classList.add('weak');
            text.textContent = 'Слабый';
        } else if (score <= 3) {
            fill.classList.add('medium');
            text.classList.add('medium');
            text.textContent = 'Средний';
        } else {
            fill.classList.add('strong');
            text.classList.add('strong');
            text.textContent = 'Надёжный';
        }

        checkPasswordMatch();
    });
}

function initPasswordConfirm() {
    var confirmInput = document.getElementById('reg-password-confirm');
    if (!confirmInput) return;
    confirmInput.addEventListener('input', checkPasswordMatch);
}

function checkPasswordMatch() {
    var password = document.getElementById('reg-password');
    var confirm = document.getElementById('reg-password-confirm');
    var hint = document.getElementById('password-match-hint');

    if (!password || !confirm || !hint) return;

    if (confirm.value.length === 0) {
        hint.textContent = '';
        hint.className = 'password-match-hint';
        confirm.classList.remove('input-error', 'input-ok');
        return;
    }

    if (password.value === confirm.value) {
        hint.textContent = '✓ Пароли совпадают';
        hint.className = 'password-match-hint match';
        confirm.classList.remove('input-error');
        confirm.classList.add('input-ok');
    } else {
        hint.textContent = '✗ Пароли не совпадают';
        hint.className = 'password-match-hint no-match';
        confirm.classList.remove('input-ok');
        confirm.classList.add('input-error');
    }
}

function togglePassword(inputId, btnEl) {
    var input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        btnEl.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
        input.type = 'password';
        btnEl.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
}