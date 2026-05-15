var API = window.API_BASE;
var resetToken = new URLSearchParams(window.location.search).get('token');

document.addEventListener('DOMContentLoaded', function () {
    if (resetToken) {
        document.getElementById('forgot-block').classList.add('hidden');
        document.getElementById('reset-block').classList.remove('hidden');
    }

    document.getElementById('forgot-btn').addEventListener('click', sendForgot);
    document.getElementById('forgot-email').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') sendForgot();
    });

    document.getElementById('reset-btn').addEventListener('click', doReset);
});

async function sendForgot() {
    var email = document.getElementById('forgot-email').value.trim();
    var errEl = document.getElementById('forgot-error');
    errEl.classList.add('hidden');

    if (!email || !email.includes('@')) {
        errEl.textContent = 'Введите корректный email';
        errEl.classList.remove('hidden');
        return;
    }

    var btn = document.getElementById('forgot-btn');
    btn.disabled = true;
    btn.textContent = 'Отправка...';

    try {
        var res = await fetch(API + '/users/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        var data = await res.json();

        document.getElementById('forgot-block').classList.add('hidden');
        document.getElementById('forgot-sent').classList.remove('hidden');

        if (data.reset_link) {
            var devBlock = document.getElementById('dev-link-block');
            devBlock.innerHTML = '<strong>Dev-режим:</strong> <a href="' + data.reset_link + '">' + data.reset_link + '</a>';
            devBlock.classList.remove('hidden');
        }
    } catch (e) {
        errEl.textContent = 'Ошибка сети';
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Отправить ссылку';
    }
}

async function doReset() {
    var pass  = document.getElementById('reset-pass').value;
    var pass2 = document.getElementById('reset-pass2').value;
    var errEl = document.getElementById('reset-error');
    errEl.classList.add('hidden');

    if (pass.length < 6) {
        errEl.textContent = 'Пароль минимум 6 символов';
        errEl.classList.remove('hidden');
        return;
    }
    if (pass !== pass2) {
        errEl.textContent = 'Пароли не совпадают';
        errEl.classList.remove('hidden');
        return;
    }

    var btn = document.getElementById('reset-btn');
    btn.disabled = true;
    btn.textContent = 'Сохранение...';

    try {
        var res = await fetch(API + '/users/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: resetToken, password: pass })
        });
        var data = await res.json();

        if (!res.ok) {
            errEl.textContent = data.detail || 'Ошибка';
            errEl.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Сохранить пароль';
            return;
        }

        document.getElementById('reset-block').classList.add('hidden');
        document.getElementById('reset-done').classList.remove('hidden');
    } catch (e) {
        errEl.textContent = 'Ошибка сети';
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Сохранить пароль';
    }
}