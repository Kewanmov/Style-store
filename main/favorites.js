var API = window.API_BASE;

document.addEventListener('DOMContentLoaded', function () {
    initBurger();
    updateNavbar();
    updateCartCount();
    loadFavorites();

    var clearBtn = document.getElementById('clear-fav-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearFavorites);
});

function getToken() { return localStorage.getItem('access_token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch (e) { return null; } }
function isLoggedIn() { return !!getToken(); }

function updateNavbar() {
    var authLink = document.getElementById('auth-link');
    var mobileAuthLink = document.getElementById('mobile-auth-link');
    if (!isLoggedIn()) return;
    var user = getUser();
    if (!user) return;
    var href = user.role === 'admin' ? 'admin.html' : 'profile.html';
    var text = user.name || user.email || 'Профиль';
    if (authLink) { authLink.href = href; authLink.textContent = text; }
    if (mobileAuthLink) { mobileAuthLink.href = href; mobileAuthLink.textContent = text; }
}

function initBurger() {
    var btn = document.getElementById('burger-btn');
    var menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
        var isOpen = menu.classList.toggle('open');
        btn.classList.toggle('burger-active');
        btn.setAttribute('aria-expanded', isOpen);
    });
    document.addEventListener('click', function (e) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove('open');
            btn.classList.remove('burger-active');
        }
    });
}

function getProductImage(img) {
    if (!img) return API + '/uploads/products/placeholder.webp';
    if (img.startsWith('http')) return img;
    return API + '/uploads/products/' + img;
}

async function updateCartCount() {
    var badge = document.getElementById('cart-count');
    if (!badge || !isLoggedIn()) { if (badge) badge.classList.add('hidden'); return; }
    try {
        var res = await fetch(API + '/cart/', { headers: { 'Authorization': 'Bearer ' + getToken() } });
        if (!res.ok) { badge.classList.add('hidden'); return; }
        var cart = await res.json();
        var total = cart.reduce(function (s, i) { return s + i.quantity; }, 0);
        if (total > 0) { badge.textContent = total > 99 ? '99+' : total; badge.classList.remove('hidden'); }
        else { badge.classList.add('hidden'); }
    } catch (e) { badge.classList.add('hidden'); }
}

var _favProducts = [];

async function loadFavorites() {
    var loadingEl = document.getElementById('fav-loading');
    var gridEl    = document.getElementById('fav-grid');
    var emptyEl   = document.getElementById('fav-empty');
    var clearBtn  = document.getElementById('clear-fav-btn');
    var counterEl = document.getElementById('fav-counter');

    function showEmpty() {
        if (loadingEl) loadingEl.classList.add('hidden');
        if (gridEl)    gridEl.classList.add('hidden');
        if (emptyEl)   emptyEl.classList.remove('hidden');
        if (clearBtn)  clearBtn.classList.add('hidden');
        if (counterEl) counterEl.textContent = '';
    }

    var products = [];

    if (isLoggedIn()) {
        try {
            var res = await fetch(API + '/favorites/', {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            if (res.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
                return;
            }
            products = res.ok ? await res.json() : [];
        } catch (e) { products = []; }
    } else {
        var ids = [];
        try { ids = JSON.parse(localStorage.getItem('favorites') || '[]'); } catch(e) {}
        if (ids.length > 0) {
            var responses = await Promise.all(ids.map(function(id) {
                return fetch(API + '/products/' + id).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
            }));
            products = responses.filter(Boolean);
        }
    }

    _favProducts = products;
    if (loadingEl) loadingEl.classList.add('hidden');

    if (!products || products.length === 0) { showEmpty(); return; }

    if (gridEl)    gridEl.classList.remove('hidden');
    if (emptyEl)   emptyEl.classList.add('hidden');
    if (clearBtn)  clearBtn.classList.remove('hidden');
    if (counterEl) counterEl.textContent = products.length + ' ' + pluralize(products.length, 'товар', 'товара', 'товаров');

    renderFavorites(products, gridEl);
}

function renderFavorites(products, container) {
    container.innerHTML = products.map(function (p, i) {
        var imgSrc = getProductImage(p.image);
        var price = Number(p.price).toLocaleString('ru-RU');
        return '<div class="fav-card" style="animation-delay:' + (i * 0.07) + 's" data-id="' + p.id + '">' +
            '<div class="fav-card-image-wrapper">' +
                '<a href="product.html?id=' + p.id + '">' +
                    '<img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" onerror="this.src=\'' + API + '/uploads/products/placeholder.webp\'">' +
                '</a>' +
                '<div class="fav-card-heart"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>' +
                '<div class="fav-card-actions">' +
                    '<button class="fav-action-btn remove-btn" onclick="removeFavorite(' + p.id + ')" title="Удалить из избранного">' +
                        '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                    '</button>' +
                    '<button class="fav-action-btn cart-btn" onclick="addToCartFromFav(event,' + p.id + ',this)" title="В корзину">' +
                        '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
                    '</button>' +
                '</div>' +
            '</div>' +
            '<div class="fav-card-body">' +
                '<a href="product.html?id=' + p.id + '" class="fav-card-name">' + escapeHtml(p.name) + '</a>' +
                (p.category_name ? '<p class="fav-card-category">' + escapeHtml(p.category_name) + '</p>' : '') +
                '<p class="fav-card-price">' + price + ' ₽</p>' +
                '<button class="fav-card-add-btn" onclick="addToCartFromFav(event,' + p.id + ',this)">В корзину</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

async function removeFavorite(productId) {
    var card = document.querySelector('.fav-card[data-id="' + productId + '"]');
    if (card) {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
    }
    if (isLoggedIn()) {
        try {
            await fetch(API + '/favorites/' + productId, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
        } catch(e) {}
    } else {
        try {
            var favs = JSON.parse(localStorage.getItem('favorites') || '[]').filter(function(id) { return id !== productId; });
            localStorage.setItem('favorites', JSON.stringify(favs));
        } catch(e) {}
    }
    setTimeout(function () {
        showToast('Удалено из избранного', 'info');
        loadFavorites();
    }, 300);
}

async function addToCartFromFav(event, productId, btnEl) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!isLoggedIn()) {
        showToast('Войдите, чтобы добавить в корзину', 'error');
        setTimeout(function () { window.location.href = 'login.html'; }, 1500);
        return;
    }
    if (btnEl) { btnEl.disabled = true; if (btnEl.classList.contains('fav-card-add-btn')) btnEl.textContent = '...'; }
    try {
        var res = await fetch(API + '/cart/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
            body: JSON.stringify({ product_id: productId, quantity: 1 })
        });
        if (res.status === 401) {
            localStorage.removeItem('access_token'); localStorage.removeItem('user');
            showToast('Сессия истекла', 'error');
            setTimeout(function () { window.location.href = 'login.html'; }, 1500);
            return;
        }
        if (!res.ok) { var err = await res.json(); throw new Error(err.detail || 'Ошибка'); }
        showToast('Добавлено в корзину', 'success');
        updateCartCount();
        if (btnEl && btnEl.classList.contains('fav-card-add-btn')) {
            btnEl.textContent = 'Добавлено';
            btnEl.classList.add('added');
            setTimeout(function () { btnEl.textContent = 'В корзину'; btnEl.classList.remove('added'); btnEl.disabled = false; }, 2000);
        } else if (btnEl) { btnEl.disabled = false; }
    } catch (e) {
        showToast(e.message, 'error');
        if (btnEl) { btnEl.disabled = false; if (btnEl.classList.contains('fav-card-add-btn')) btnEl.textContent = 'В корзину'; }
    }
}

async function clearFavorites() {
    if (!confirm('Очистить избранное?')) return;
    if (isLoggedIn() && _favProducts.length > 0) {
        await Promise.all(_favProducts.map(function(p) {
            return fetch(API + '/favorites/' + p.id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + getToken() }
            }).catch(function() {});
        }));
    } else {
        localStorage.setItem('favorites', '[]');
    }
    showToast('Избранное очищено', 'info');
    loadFavorites();
}

function pluralize(n, one, two, five) {
    var abs = Math.abs(n) % 100;
    var n1 = abs % 10;
    if (abs > 10 && abs < 20) return five;
    if (n1 > 1 && n1 < 5) return two;
    if (n1 === 1) return one;
    return five;
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type) {
    type = type || 'info';
    var old = document.querySelector('.fixed-toast');
    if (old) old.remove();
    var el = document.createElement('div');
    var bg = type === 'error' ? '#991b1b' : type === 'success' ? '#065f46' : '#1e40af';
    el.className = 'fixed-toast';
    el.style.cssText = 'position:fixed;bottom:1.25rem;right:1.25rem;padding:.875rem 1.5rem;border-radius:.75rem;color:white;font-size:.875rem;font-weight:500;z-index:9999;background:' + bg + ';box-shadow:0 8px 24px rgba(0,0,0,.15);transform:translateY(20px);opacity:0;transition:all .3s ease;';
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.transform = 'translateY(0)'; el.style.opacity = '1'; });
    setTimeout(function () {
        el.style.transform = 'translateY(20px)'; el.style.opacity = '0';
        setTimeout(function () { el.remove(); }, 300);
    }, 3000);
}