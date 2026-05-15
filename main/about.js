function getToken() { return localStorage.getItem('access_token'); }
function getUser()  { try { return JSON.parse(localStorage.getItem('user')); } catch(e) { return null; } }
function isLoggedIn() { return !!getToken(); }

document.addEventListener('DOMContentLoaded', function () {
    updateNavbar();
    updateCartCount();
    initBurgerMenu();
});

function updateNavbar() {
    var authLink       = document.getElementById('auth-link');
    var mobileAuthLink = document.getElementById('mobile-auth-link');

    if (isLoggedIn()) {
        var user = getUser();
        if (user) {
            var href = user.role === 'admin' ? 'admin.html' : 'profile.html';
            var text = user.name || user.email || 'Профиль';
            if (authLink)       { authLink.href = href;       authLink.textContent = text; }
            if (mobileAuthLink) { mobileAuthLink.href = href; mobileAuthLink.textContent = text; }
        } else {
            fetchAndSetUser(authLink, mobileAuthLink);
        }
    } else {
        if (authLink)       { authLink.href = 'login.html';       authLink.textContent = 'Войти'; }
        if (mobileAuthLink) { mobileAuthLink.href = 'login.html'; mobileAuthLink.textContent = 'Войти'; }
    }
}

async function fetchAndSetUser(authLink, mobileAuthLink) {
    try {
        var res = await fetch(API + '/users/me', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (res.ok) {
            var user = await res.json();
            localStorage.setItem('user', JSON.stringify(user));
            var href = user.role === 'admin' ? 'admin.html' : 'profile.html';
            var text = user.name || user.email || 'Профиль';
            if (authLink)       { authLink.href = href;       authLink.textContent = text; }
            if (mobileAuthLink) { mobileAuthLink.href = href; mobileAuthLink.textContent = text; }
        } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
        }
    } catch(e) {}
}

function updateCartCount() {
    var badge = document.getElementById('cart-count');
    if (!badge || !isLoggedIn()) return;
    fetch(API + '/cart/', { headers: { 'Authorization': 'Bearer ' + getToken() } })
        .then(function(r) { return r.ok ? r.json() : []; })
        .then(function(cart) {
            var total = cart.reduce(function(s, i) { return s + i.quantity; }, 0);
            if (total > 0) {
                badge.textContent = total > 99 ? '99+' : total;
                badge.classList.remove('hidden');
            }
        })
        .catch(function() {});
}

function initBurgerMenu() {
    var btn  = document.getElementById('burger-btn');
    var menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function() {
        var isOpen = menu.classList.toggle('open');
        btn.classList.toggle('burger-active');
        btn.setAttribute('aria-expanded', isOpen);
    });
    document.addEventListener('click', function(e) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove('open');
            btn.classList.remove('burger-active');
            btn.setAttribute('aria-expanded', 'false');
        }
    });
}