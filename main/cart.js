var API = window.API_BASE;

document.addEventListener('DOMContentLoaded', function () {
    initBurger();
    updateNavbar();
    loadCart();

    var clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCart);
    }
});

function getToken() {
    return localStorage.getItem('access_token');
}

function getUser() {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch (e) { return null; }
}

function isLoggedIn() {
    return !!getToken();
}

function updateNavbar() {
    var authLink = document.getElementById('auth-link');
    var mobileAuthLink = document.getElementById('mobile-auth-link');

    if (!isLoggedIn()) return;

    var user = getUser();
    if (!user) return;

    var href = user.role === 'admin' ? 'admin.html' : 'profile.html';
    var text = user.name || user.username || 'Профиль';

    if (authLink)       { authLink.href = href;       authLink.textContent = text; }
    if (mobileAuthLink) { mobileAuthLink.href = href; mobileAuthLink.textContent = text; }
}

function initBurger() {
    var btn  = document.getElementById('burger-btn');
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

function getProductImage(imageName) {
    if (!imageName) return API + '/uploads/products/placeholder.webp';
    if (imageName.startsWith('http') || imageName.startsWith('data:')) return imageName;
    return API + '/uploads/products/' + imageName;
}

function getApiFallbackImage(imageName) {
    if (!imageName) return API + '/uploads/products/placeholder.webp';
    return API + '/uploads/products/' + imageName;
}

async function updateCartCount() {
    var badge = document.getElementById('cart-count');
    if (!badge) return;

    if (!isLoggedIn()) {
        badge.classList.add('hidden');
        return;
    }

    try {
        var res = await fetch(API + '/cart/', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (!res.ok) { badge.classList.add('hidden'); return; }

        var cart  = await res.json();
        var total = 0;
        for (var i = 0; i < cart.length; i++) total += cart[i].quantity;

        if (total > 0) {
            badge.textContent = total > 99 ? '99+' : total;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (e) {
        badge.classList.add('hidden');
    }
}

async function loadCart() {
    var loadingEl      = document.querySelector('.cart-loading');
    var contentEl      = document.getElementById('cart-content');
    var summaryEl      = document.getElementById('cart-summary');
    var emptyEl        = document.getElementById('cart-empty');
    var notLoggedEl    = document.getElementById('cart-not-logged');
    var clearBtn       = document.getElementById('clear-cart-btn');
    var itemsContainer = document.getElementById('cart-items');

    if (!isLoggedIn()) {
        if (loadingEl)   loadingEl.style.display = 'none';
        if (contentEl)   contentEl.classList.add('hidden');
        if (emptyEl)     emptyEl.classList.add('hidden');
        if (notLoggedEl) notLoggedEl.classList.remove('hidden');
        if (clearBtn)    clearBtn.classList.add('hidden');
        return;
    }

    try {
        var res = await fetch(API + '/cart/', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (res.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            if (loadingEl)   loadingEl.style.display = 'none';
            if (contentEl)   contentEl.classList.add('hidden');
            if (notLoggedEl) notLoggedEl.classList.remove('hidden');
            return;
        }

        if (!res.ok) throw new Error('Server error');

        var cartItems = await res.json();

        if (loadingEl) loadingEl.style.display = 'none';

        if (!cartItems || cartItems.length === 0) {
            if (contentEl)   contentEl.classList.add('hidden');
            if (emptyEl)     emptyEl.classList.remove('hidden');
            if (notLoggedEl) notLoggedEl.classList.add('hidden');
            if (clearBtn)    clearBtn.classList.add('hidden');
            updateCartCount();
            return;
        }

        if (contentEl)   contentEl.classList.remove('hidden');
        if (emptyEl)     emptyEl.classList.add('hidden');
        if (notLoggedEl) notLoggedEl.classList.add('hidden');
        if (summaryEl)   summaryEl.classList.remove('hidden');
        if (clearBtn)    clearBtn.classList.remove('hidden');

        renderCartItems(cartItems, itemsContainer);
        updateSummary(cartItems);
        updateCartCount();

    } catch (err) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.classList.add('hidden');
        if (emptyEl)   emptyEl.classList.remove('hidden');
    }
}

function renderCartItems(items, container) {
    var html = '';

    for (var i = 0; i < items.length; i++) {
        var item         = items[i];
        var p            = item.product || item;
        var productId    = item.product_id || p.id;
        var name         = p.name || 'Товар';
        var price        = Number(p.price || 0);
        var qty          = item.quantity || 1;
        var subtotal     = price * qty;
        var rawImage     = p.image || item.image || null;
        var categoryName = p.category_name || '';
        var size         = item.size || null;
        var sizeAttr     = size ? ' data-size="' + escapeHtml(size) + '"' : '';

        var imgSrc      = getProductImage(rawImage);
        var imgFallback = getApiFallbackImage(rawImage);

        html += '<div class="cart-item"'
            + ' style="animation-delay:' + (i * 0.08) + 's"'
            + ' data-id="' + productId + '"'
            + sizeAttr + '>'

            + '<a href="product.html?id=' + productId + '" class="cart-item-image-link">'
            +   '<img'
            +     ' src="'     + escapeHtml(imgSrc)      + '"'
            +     ' alt="'     + escapeHtml(name)         + '"'
            +     ' loading="lazy"'
            +     ' onerror="if(this.dataset.tried===\'1\'){this.src=API+\'/uploads/products/placeholder.webp\';this.onerror=null;}else{this.dataset.tried=\'1\';this.src=\'' + escapeHtml(imgFallback) + '\';}"'
            +   '>'
            + '</a>'

            + '<div class="cart-item-info">'
            +   '<a href="product.html?id=' + productId + '" class="cart-item-name">' + escapeHtml(name) + '</a>'

            +   '<div class="cart-item-meta">'
            +     (categoryName ? '<span class="cart-item-category">' + escapeHtml(categoryName) + '</span>' : '')
            +     (size
                    ? '<span class="cart-item-size">Размер: <strong>' + escapeHtml(size) + '</strong></span>'
                    : '')
            +   '</div>'

            +   '<div class="cart-item-bottom">'
            +     '<div class="quantity-control">'
            +       '<button class="quantity-btn" onclick="changeQuantity(' + productId + ', -1, ' + (size ? '\'' + escapeHtml(size) + '\'' : 'null') + ')"' + (qty <= 1 ? ' disabled' : '') + '>'
            +         '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>'
            +       '</button>'
            +       '<span class="quantity-value">' + qty + '</span>'
            +       '<button class="quantity-btn" onclick="changeQuantity(' + productId + ', 1, ' + (size ? '\'' + escapeHtml(size) + '\'' : 'null') + ')">'
            +         '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
            +       '</button>'
            +     '</div>'
            +     '<span class="cart-item-price">' + subtotal.toLocaleString('ru-RU') + ' &#8381;</span>'
            +     '<button class="cart-item-remove" onclick="removeItem(' + productId + ', ' + (size ? '\'' + escapeHtml(size) + '\'' : 'null') + ')" title="Удалить">'
            +       '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
            +     '</button>'
            +   '</div>'
            + '</div>'
            + '</div>';
    }

    container.innerHTML = html;
}

function updateSummary(items) {
    var totalItems = 0;
    var totalPrice = 0;

    for (var i = 0; i < items.length; i++) {
        var p     = items[i].product || items[i];
        var price = Number(p.price || 0);
        totalItems += items[i].quantity;
        totalPrice += price * items[i].quantity;
    }

    var deliveryFree = totalPrice >= 5000;
    var deliveryCost = deliveryFree ? 0 : 300;

    var countEl    = document.getElementById('summary-count');
    var subtotalEl = document.getElementById('summary-subtotal');
    var deliveryEl = document.getElementById('summary-delivery');
    var totalEl    = document.getElementById('summary-total');

    if (countEl)    countEl.textContent    = totalItems;
    if (subtotalEl) subtotalEl.textContent = totalPrice.toLocaleString('ru-RU') + ' \u20BD';

    if (deliveryEl) {
        if (deliveryFree) {
            deliveryEl.textContent = 'Бесплатно';
            deliveryEl.className   = 'text-green-600 font-medium';
        } else {
            deliveryEl.textContent = '300 \u20BD';
            deliveryEl.className   = 'font-medium';
        }
    }

    if (totalEl) totalEl.textContent = (totalPrice + deliveryCost).toLocaleString('ru-RU') + ' \u20BD';
}

async function changeQuantity(productId, delta, size) {
    size = size || null;

    try {
        var res = await fetch(API + '/cart/', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (!res.ok) return;

        var cart = await res.json();
        var item = null;

        for (var i = 0; i < cart.length; i++) {
            var pid  = cart[i].product_id || (cart[i].product && cart[i].product.id);
            var sz   = cart[i].size || null;
            if (pid === productId && sz === size) { item = cart[i]; break; }
        }

        if (!item) return;

        var newQty = Math.min(Math.max(item.quantity + delta, 1), 99);

        var body = { quantity: newQty };
        if (size) body.size = size;

        await fetch(API + '/cart/' + productId, {
            method: 'PUT',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': 'Bearer ' + getToken()
            },
            body: JSON.stringify(body)
        });

        loadCart();
    } catch (e) {
        showNotification('Ошибка изменения количества', 'error');
    }
}

async function removeItem(productId, size) {
    size = size || null;

    var selector = '.cart-item[data-id="' + productId + '"]';
    if (size) selector += '[data-size="' + size + '"]';
    var cartItem = document.querySelector(selector);

    if (cartItem) {
        cartItem.style.transition = 'all 0.3s ease';
        cartItem.style.opacity = '0';
        cartItem.style.transform = 'translateX(-30px)';
    }

    setTimeout(async function () {
        try {
            var url = 'http://127.0.0.1:8000/cart/' + productId;
            if (size) url += '?size=' + encodeURIComponent(size);

            var res = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });

            if (!res.ok) {
                var err = await res.json().catch(function() { return {}; });
                showNotification(err.detail || 'Ошибка удаления', 'error');
            } else {
                showNotification('Товар удалён из корзины', 'info');
            }
        } catch (e) {
            showNotification('Ошибка удаления', 'error');
        }
        loadCart();
    }, 300);
}

async function clearCart() {
    if (!confirm('Очистить корзину?')) return;

    try {
        var res = await fetch(API + '/cart/', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (!res.ok) return;

        var cart = await res.json();

        await Promise.all(cart.map(function (item) {
            var pid  = item.product_id || (item.product && item.product.id);
            var size = item.size || null;
            var url  = API + '/cart/' + pid;
            if (size) url += '?size=' + encodeURIComponent(size);
            return fetch(url, {
                method:  'DELETE',
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
        }));

        showNotification('Корзина очищена', 'info');
        loadCart();
    } catch (e) {
        showNotification('Ошибка очистки корзины', 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, type) {
    type = type || 'info';
    var existing = document.querySelector('.notification');
    if (existing) existing.remove();

    var colors = { error: '#dc2626', success: '#16a34a', info: '#722f37' };

    var el = document.createElement('div');
    el.style.cssText = [
        'position:fixed',
        'bottom:20px',
        'right:20px',
        'padding:14px 24px',
        'border-radius:12px',
        'color:#fff',
        'font-size:14px',
        'font-weight:500',
        'z-index:99999',
        'box-shadow:0 8px 24px rgba(0,0,0,0.15)',
        'opacity:0',
        'transform:translateY(12px)',
        'transition:all 0.3s ease',
        'background:' + (colors[type] || colors.info),
        'max-width:280px',
        'width:auto',
        'display:inline-block',
        'word-break:break-word',
        'left:auto',
        'top:auto'
    ].join(';');

    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(function () {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    });

    setTimeout(function () {
        el.style.opacity = '0';
        el.style.transform = 'translateY(12px)';
        setTimeout(function () { if (el.parentNode) el.remove(); }, 300);
    }, 3000);
}