var DELIVERY_LABELS = {
    courier: 'Курьером до двери',
    pickup:  'Пункт выдачи',
    post:    'Почта России'
};

var PAYMENT_LABELS = {
    online:      'Онлайн (банковская карта)',
    on_delivery: 'При получении'
};

function getToken()   { return localStorage.getItem('access_token'); }
function isLoggedIn() { return !!getToken(); }
function getUser() {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch(e) { return null; }
}
function formatPrice(n) {
    return Number(n).toLocaleString('ru-RU') + ' ₽';
}
function escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function resolveImage(imageName) {
    if (!imageName) return PLACEHOLDER;
    if (imageName.startsWith('http') || imageName.startsWith('data:')) return imageName;
    return API + '/uploads/products/' + imageName;
}

function resolveFallback(imageName) {
    if (!imageName) return PLACEHOLDER;
    return API + '/uploads/products/' + imageName;
}

document.addEventListener('DOMContentLoaded', function () {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    updateNavbar();
    updateCartCount();
    loadCheckoutCart();
    prefillUserData();
    initCheckoutForm();
    initBurgerMenu();
});

function updateNavbar() {
    var authLink       = document.getElementById('auth-link');
    var mobileAuthLink = document.getElementById('mobile-auth-link');
    var user           = getUser();
    if (!user) return;
    var href = user.role === 'admin' ? 'admin.html' : 'profile.html';
    var text = user.name || user.email || 'Профиль';
    if (authLink)       { authLink.href = href;       authLink.textContent = text; }
    if (mobileAuthLink) { mobileAuthLink.href = href; mobileAuthLink.textContent = text; }
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

async function loadCheckoutCart() {
    var container = document.getElementById('checkout-items');
    var totalEl   = document.getElementById('checkout-total');

    try {
        var res = await fetch(API + '/cart/', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (res.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        if (!res.ok) throw new Error('Ошибка загрузки корзины: ' + res.status);

        var cart = await res.json();

        if (!cart || cart.length === 0) {
            window.location.href = 'cart.html';
            return;
        }

        renderCheckoutItems(cart, container, totalEl);

    } catch(e) {
        console.error('loadCheckoutCart error:', e);
        if (container) {
            container.innerHTML = '<p class="text-sm text-red-500 py-4">Не удалось загрузить корзину</p>';
        }
    }
}

function renderCheckoutItems(cart, container, totalEl) {
    if (!container) return;

    var total = 0;
    var html = '';

    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        var product = item.product || {};
        var name = product.name || item.product_name || 'Товар';
        var price = Number(product.price || item.price || 0);
        var rawImage = product.image || item.image || null;
        var qty = item.quantity || 1;
        var lineTotal = price * qty;
        total += lineTotal;

        var imgSrc      = resolveImage(rawImage);
        var imgFallback = resolveFallback(rawImage);

        html += '<div class="checkout-item">'
            + '<img'
            +   ' src="'     + escapeHtml(imgSrc)  + '"'
            +   ' alt="'     + escapeHtml(name)     + '"'
            +   ' class="checkout-item-img"'
            +   ' loading="lazy"'
            +   ' onerror="if(this.dataset.tried===\'1\'){this.src=API+\'/uploads/products/placeholder.webp\';this.onerror=null;}else{this.dataset.tried=\'1\';this.src=\'' + escapeHtml(imgFallback) + '\';}"'
            + '>'
            + '<div class="checkout-item-info">'
            +   '<div class="checkout-item-name">'       + escapeHtml(name)       + '</div>'
            +   '<div class="checkout-item-qty">Кол-во: ' + qty                   + '</div>'
            + '</div>'
            + '<div class="checkout-item-price">'        + formatPrice(lineTotal)  + '</div>'
            + '</div>';
    }

    container.innerHTML = html;

    if (totalEl) totalEl.textContent = formatPrice(total);
}

function prefillUserData() {
    var user = getUser();
    if (!user) return;

    var fields = {
        'ch-name':  user.name,
        'ch-email': user.email,
        'ch-phone': user.phone
    };

    Object.keys(fields).forEach(function(id) {
        var el = document.getElementById(id);
        if (el && fields[id]) el.value = fields[id];
    });
}

function initCheckoutForm() {
    var form = document.getElementById('checkout-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearErrors();

        var nameEl    = document.getElementById('ch-name');
        var phoneEl   = document.getElementById('ch-phone');
        var emailEl   = document.getElementById('ch-email');
        var addressEl = document.getElementById('ch-address');
        var commentEl = document.getElementById('ch-comment');
        var delivery  = form.querySelector('input[name="delivery"]:checked');
        var payment   = form.querySelector('input[name="payment"]:checked');

        var name    = nameEl    ? nameEl.value.trim()    : '';
        var phone   = phoneEl   ? phoneEl.value.trim()   : '';
        var email   = emailEl   ? emailEl.value.trim()   : '';
        var address = addressEl ? addressEl.value.trim() : '';
        var valid   = true;

        if (!name) {
            showFieldError('ch-name-error', nameEl, 'Введите имя');
            valid = false;
        } else if (name.length > 30) {
            showFieldError('ch-name-error', nameEl, 'Максимум 30 символов');
            valid = false;
        }

        if (!phone) {
            showFieldError('ch-phone-error', phoneEl, 'Введите телефон');
            valid = false;
        } else if (phone.length < 10 || phone.length > 18) {
            showFieldError('ch-phone-error', phoneEl, 'От 10 до 18 символов');
            valid = false;
        } else if (/[^\d+() \-]/.test(phone)) {
            showFieldError('ch-phone-error', phoneEl, 'Допустимы: цифры, +, пробелы, скобки, дефис');
            valid = false;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showFieldError('ch-email-error', emailEl, 'Некорректный email');
            valid = false;
        }

        if (!address) {
            showFieldError('ch-address-error', addressEl, 'Введите адрес доставки');
            valid = false;
        } else if (address.length > 200) {
            showFieldError('ch-address-error', addressEl, 'Максимум 200 символов');
            valid = false;
        }

        if (!valid) return;

        var btn = document.getElementById('checkout-submit');
        setLoading(btn, true);

        try {
            var paymentValue  = payment  ? payment.value  : 'on_delivery';
            var deliveryValue = delivery ? delivery.value : 'courier';

            var orderData = {
                customer_name:    name,
                phone:            phone,
                shipping_address: address,
                comment:          commentEl ? commentEl.value.trim() : '',
                payment_method:   paymentValue,
                delivery_method:  deliveryValue
            };

            var res = await fetch(API + '/orders/', {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify(orderData)
            });

            if (res.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
                return;
            }

            if (!res.ok) {
                var errData = await res.json().catch(function() { return {}; });
                throw new Error(errData.detail || ('Ошибка сервера: ' + res.status));
            }

            var order = await res.json();
            showSuccess(order.id || order.order_id, paymentValue, deliveryValue);

        } catch(err) {
            var errEl = document.getElementById('checkout-error');
            if (errEl) {
                errEl.textContent = err.message;
                errEl.classList.remove('hidden');
            }
        } finally {
            setLoading(btn, false);
        }
    });
}

function showSuccess(orderId, paymentValue, deliveryValue) {
    var mainEl    = document.getElementById('checkout-main');
    var breadEl   = document.getElementById('breadcrumb');
    var titleEl   = document.getElementById('checkout-title');
    var successEl = document.getElementById('checkout-success');
    var numEl     = document.getElementById('order-number');
    var infoEl    = document.getElementById('order-info');

    if (mainEl)    mainEl.classList.add('hidden');
    if (breadEl)   breadEl.classList.add('hidden');
    if (titleEl)   titleEl.classList.add('hidden');
    if (successEl) successEl.classList.remove('hidden');
    if (numEl)     numEl.textContent = '#' + (orderId || '—');

    if (infoEl) {
        infoEl.innerHTML =
            '<div class="order-info-row">'
            +   '<span>Способ доставки:</span>'
            +   '<strong>' + (DELIVERY_LABELS[deliveryValue] || deliveryValue) + '</strong>'
            + '</div>'
            + '<div class="order-info-row">'
            +   '<span>Способ оплаты:</span>'
            +   '<strong>' + (PAYMENT_LABELS[paymentValue] || paymentValue) + '</strong>'
            + '</div>';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showFieldError(errorId, inputEl, message) {
    var el = document.getElementById(errorId);
    if (el) el.textContent = message;
    if (inputEl) inputEl.classList.add('error');
}

function clearErrors() {
    document.querySelectorAll('.form-error').forEach(function(el) { el.textContent = ''; });
    document.querySelectorAll('.ch-input').forEach(function(el)   { el.classList.remove('error'); });
    var ge = document.getElementById('checkout-error');
    if (ge) { ge.textContent = ''; ge.classList.add('hidden'); }
}

function setLoading(btn, loading) {
    if (!btn) return;
    var text   = btn.querySelector('.btn-text');
    var loader = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (text)   text.classList.toggle('hidden',  loading);
    if (loader) loader.classList.toggle('hidden', !loading);
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