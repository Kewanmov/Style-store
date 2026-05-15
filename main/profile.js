const API = window.API_BASE;

function getToken() {
    return localStorage.getItem('access_token');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

function getProductImage(imageName) {
    if (!imageName) return API + '/uploads/products/placeholder.webp';
    if (imageName.startsWith('http')) return imageName;
    return API + '/uploads/products/' + imageName;
}

function getAvatarUrl(avatarFilename) {
    if (!avatarFilename) return null;
    if (avatarFilename.startsWith('http')) return avatarFilename;
    return API + '/uploads/avatars/' + avatarFilename;
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(message, type) {
    type = type || 'info';
    var old = document.querySelector('.fixed-toast');
    if (old) old.remove();

    var el = document.createElement('div');
    var bg = type === 'error'
        ? '#dc2626'
        : type === 'success'
        ? '#065f46'
        : '#1d4ed8';

    el.style.cssText = [
        'position:fixed',
        'bottom:20px',
        'right:20px',
        'padding:14px 24px',
        'border-radius:12px',
        'color:white',
        'font-size:0.875rem',
        'font-weight:500',
        'z-index:9999',
        'box-shadow:0 8px 24px rgba(0,0,0,0.15)',
        'background:' + bg,
        'transition:all 0.3s ease',
        'opacity:0',
        'transform:translateY(12px)'
    ].join(';');
    el.className = 'fixed-toast';
    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(function () {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    });

    setTimeout(function () {
        el.style.opacity = '0';
        el.style.transform = 'translateY(12px)';
        setTimeout(function () {
            if (el.parentNode) el.remove();
        }, 300);
    }, 3000);
}

function setAvatarDisplay(el, user) {
    if (!el) return;
    var url = getAvatarUrl(user.avatar);
    if (url) {
        el.textContent = '';
        el.style.backgroundImage = 'url(' + url + ')';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
    } else {
        el.style.backgroundImage = '';
        el.textContent = (user.name || 'U').charAt(0).toUpperCase();
    }
}

function initAvatarUpload() {
    var wrapper = document.getElementById('avatar-wrapper');
    var input   = document.getElementById('avatar-input');
    if (!wrapper || !input) return;

    wrapper.addEventListener('click', function() { input.click(); });

    input.addEventListener('change', async function() {
        var file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showNotification('Файл слишком большой (макс. 2 МБ)', 'error');
            return;
        }

        var overlay = wrapper.querySelector('.avatar-upload-overlay');
        if (overlay) overlay.style.opacity = '1';

        var fd = new FormData();
        fd.append('file', file);

        try {
            var res = await fetch(API + '/users/me/avatar', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken() },
                body: fd
            });
            var data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Ошибка загрузки');

            localStorage.setItem('user', JSON.stringify(data));
            setAvatarDisplay(document.getElementById('profile-avatar'), data);
            showNotification('Фото обновлено', 'success');
        } catch(err) {
            showNotification(err.message, 'error');
        } finally {
            if (overlay) overlay.style.opacity = '';
            input.value = '';
        }
    });
}

function loadRecentlyViewed() {
    var grid  = document.getElementById('history-grid');
    var empty = document.getElementById('history-empty');
    if (!grid) return;

    try {
        var list = JSON.parse(localStorage.getItem('recently_viewed') || '[]');
        if (!list.length) {
            if (empty) empty.classList.remove('hidden');
            return;
        }
        grid.innerHTML = list.map(function(item) {
            var imgSrc = item.image
                ? API + '/uploads/products/' + item.image
                : API + '/uploads/products/placeholder.webp';
            var price = Number(item.price).toLocaleString('ru-RU');
            return '<a href="product.html?id=' + item.id + '" class="profile-fav-card">' +
                '<img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(item.name) + '" loading="lazy">' +
                '<div class="profile-fav-card-info">' +
                    '<div class="profile-fav-card-name">' + escapeHtml(item.name) + '</div>' +
                    '<div class="profile-fav-card-price">' + price + ' ₽</div>' +
                '</div>' +
            '</a>';
        }).join('');
    } catch(e) {
        if (empty) empty.classList.remove('hidden');
    }
}

function initTabs() {
    var navItems = document.querySelectorAll('.profile-nav-item');
    var tabs     = document.querySelectorAll('.profile-tab');

    navItems.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var target = btn.getAttribute('data-tab');

            // Снимаем активный класс со всех кнопок и вкладок
            navItems.forEach(function (b) { b.classList.remove('active'); });
            tabs.forEach(function (t) { t.classList.remove('active'); });

            // Активируем нужную вкладку
            btn.classList.add('active');
            var tab = document.getElementById('tab-' + target);
            if (tab) tab.classList.add('active');

            // Загружаем данные при первом открытии вкладки
            if (target === 'orders' && !window._ordersLoaded) {
                loadOrders();
            }
            if (target === 'favorites' && !window._favoritesLoaded) {
                loadFavorites();
            }
            if (target === 'history') {
                loadRecentlyViewed();
            }
        });
    });
}

async function loadUserData() {
    try {
        var res = await fetch(API + '/users/me', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (res.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        if (!res.ok) throw new Error('Ошибка загрузки');

        var user = await res.json();
        localStorage.setItem('user', JSON.stringify(user));

        // Сайдбар
        var nameEl   = document.getElementById('profile-name');
        var emailEl  = document.getElementById('profile-email');
        var avatarEl = document.getElementById('profile-avatar');

        if (nameEl)   nameEl.textContent  = user.name  || '—';
        if (emailEl)  emailEl.textContent = user.email || '—';
        setAvatarDisplay(avatarEl, user);

        // Форма личных данных
        var editName    = document.getElementById('edit-name');
        var editEmail   = document.getElementById('edit-email');
        var editPhone   = document.getElementById('edit-phone');
        var editAddress = document.getElementById('edit-address');

        if (editName)    editName.value    = user.name    || '';
        if (editEmail)   editEmail.value   = user.email   || '';
        if (editPhone)   editPhone.value   = user.phone   || '';
        if (editAddress) editAddress.value = user.address || '';

    } catch (e) {
        console.error('loadUserData error:', e);
        window.location.href = 'login.html';
    }
}

function initPersonalForm() {
    var form = document.getElementById('personal-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        var name    = document.getElementById('edit-name').value.trim();
        var phone   = document.getElementById('edit-phone').value.trim();
        var addrEl  = document.getElementById('edit-address');
        var errEl   = document.getElementById('personal-error');
        var btn     = form.querySelector('.profile-save-btn');
        var orig    = btn.textContent;

        // Валидация
        if (!name) {
            if (errEl) {
                errEl.textContent = 'Имя не может быть пустым';
                errEl.classList.remove('hidden');
            }
            return;
        }

        btn.textContent = 'Сохранение...';
        btn.disabled    = true;
        if (errEl) errEl.classList.add('hidden');

        try {
            var body = { name: name, phone: phone };
            if (addrEl) body.address = addrEl.value.trim();

            var res = await fetch(API + '/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                var err = await res.json();
                throw new Error(err.detail || 'Ошибка сохранения');
            }

            var user = await res.json();
            localStorage.setItem('user', JSON.stringify(user));

            // Обновляем сайдбар
            var nameEl   = document.getElementById('profile-name');
            var avatarEl = document.getElementById('profile-avatar');
            if (nameEl)   nameEl.textContent   = user.name || '—';
            if (avatarEl) avatarEl.textContent  =
                (user.name || 'U').charAt(0).toUpperCase();

            showNotification('Данные сохранены', 'success');
            btn.textContent      = '✓ Сохранено';
            btn.style.background = '#065f46';
            setTimeout(function () {
                btn.textContent      = orig;
                btn.style.background = '';
            }, 2000);

        } catch (err) {
            if (errEl) {
                errEl.textContent = err.message;
                errEl.classList.remove('hidden');
            }
            showNotification(err.message, 'error');
            btn.textContent = orig;
        } finally {
            btn.disabled = false;
        }
    });
}

function initPasswordForm() {
    var form = document.getElementById('password-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        var oldPass  = document.getElementById('old-password').value;
        var newPass  = document.getElementById('new-password').value;
        var newPass2 = document.getElementById('new-password2').value;
        var errEl    = document.getElementById('password-error');
        var okEl     = document.getElementById('password-success');
        var btn      = form.querySelector('.profile-save-btn');

        errEl.classList.add('hidden');
        okEl.classList.add('hidden');

        if (newPass.length < 6) {
            errEl.textContent = 'Новый пароль — минимум 6 символов';
            errEl.classList.remove('hidden');
            return;
        }
        if (newPass !== newPass2) {
            errEl.textContent = 'Пароли не совпадают';
            errEl.classList.remove('hidden');
            return;
        }

        btn.disabled = true;
        var orig = btn.textContent;
        btn.textContent = 'Сохранение...';

        try {
            var res = await fetch(API + '/users/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                body: JSON.stringify({ old_password: oldPass, new_password: newPass })
            });
            var data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Ошибка');
            okEl.textContent = 'Пароль успешно изменён';
            okEl.classList.remove('hidden');
            form.reset();
        } catch(err) {
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = orig;
        }
    });
}

var STATUS_LABELS = {
    'new':        'Новый',
    'processing': 'В обработке',
    'shipped':    'Доставляется',
    'delivered':  'Завершён',
    'cancelled':  'Отменён'
};

async function loadOrders() {
    window._ordersLoaded = true;

    var loading = document.getElementById('orders-loading');
    var list    = document.getElementById('orders-list');
    var empty   = document.getElementById('orders-empty');

    if (!list) return;

    // Показываем скелетон
    if (loading) loading.style.display = 'flex';
    list.innerHTML = '';
    if (empty) empty.classList.add('hidden');

    try {
        var res = await fetch(API + '/orders/', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (res.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        if (!res.ok) throw new Error('Ошибка загрузки заказов');

        var orders = await res.json();

        // Скрываем скелетон
        if (loading) loading.style.display = 'none';

        if (!orders || orders.length === 0) {
            if (empty) empty.classList.remove('hidden');
            return;
        }

        list.innerHTML = orders.map(function (order) {
            var date = new Date(order.created_at).toLocaleDateString('ru-RU', {
                day:   '2-digit',
                month: 'long',
                year:  'numeric'
            });
            var statusLabel = STATUS_LABELS[order.status] || order.status;
            var total = Number(order.total).toLocaleString('ru-RU');

            // Состав заказа
            var itemsHtml = '';
            if (order.items && order.items.length > 0) {
                itemsHtml = '<div class="order-items-list">' +
                    order.items.map(function (item) {
                        var name = escapeHtml(item.product_name || 'Товар') + ' × ' + item.quantity;
                        if (item.size) name += ' <span style="color:#888;font-size:0.8em">(р. ' + escapeHtml(item.size) + ')</span>';
                        return '<span class="order-item-name">' + name + '</span>';
                    }).join(', ') +
                '</div>';
            }

            var actionsHtml = '';
            if (order.status === 'new') {
                if (order.payment_method === 'online') {
                    actionsHtml += '<button class="profile-save-btn" style="margin-top:10px;padding:8px 18px;font-size:0.875rem" onclick="payOrder(' + order.id + ',this)">Оплатить онлайн</button> ';
                }
                actionsHtml += '<button class="order-cancel-btn" onclick="cancelOrder(' + order.id + ',this)">Отменить заказ</button>';
            }

            return '<div class="order-card">' +
                '<div>' +
                    '<div class="order-id">Заказ #' + order.id + '</div>' +
                    '<div class="order-date">' + date + '</div>' +
                    itemsHtml +
                    (actionsHtml ? '<div style="margin-top:8px">' + actionsHtml + '</div>' : '') +
                '</div>' +
                '<span class="order-status ' + order.status + '">' +
                    statusLabel +
                '</span>' +
                '<div class="order-total">' + total + ' ₽</div>' +
            '</div>';
        }).join('');

    } catch (err) {
        console.error('loadOrders error:', err);
        if (loading) loading.style.display = 'none';
        if (list) list.innerHTML =
            '<p class="text-gray-400 text-sm py-4">' +
            'Не удалось загрузить заказы</p>';
    }
}

async function loadFavorites() {
    window._favoritesLoaded = true;

    var grid  = document.getElementById('profile-fav-grid');
    var empty = document.getElementById('profile-fav-empty');

    if (!grid) return;

    grid.innerHTML = '<p class="text-gray-400 text-sm">Загрузка...</p>';
    if (empty) empty.classList.add('hidden');

    try {
        var res = await fetch(API + '/favorites/', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (res.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        if (!res.ok) throw new Error('Ошибка загрузки избранного');

        var items = await res.json();
        grid.innerHTML = '';

        if (!items || items.length === 0) {
            if (empty) empty.classList.remove('hidden');
            return;
        }

        grid.innerHTML = items.map(function (item) {
            var imgSrc = getProductImage(item.image);
            var price  = Number(item.price).toLocaleString('ru-RU');

            return '<div class="profile-fav-card-wrapper" style="position:relative">' +
                '<a href="product.html?id=' + item.id +
                    '" class="profile-fav-card">' +
                    '<img src="' + escapeHtml(imgSrc) +
                        '" alt="' + escapeHtml(item.name) +
                        '" loading="lazy">' +
                    '<div class="profile-fav-card-info">' +
                        '<div class="profile-fav-card-name">' +
                            escapeHtml(item.name) +
                        '</div>' +
                        '<div class="profile-fav-card-price">' +
                            price + ' ₽' +
                        '</div>' +
                    '</div>' +
                '</a>' +
                '<button ' +
                    'onclick="removeFavorite(event,' + item.id + ')" ' +
                    'class="fav-remove-btn" ' +
                    'title="Удалить из избранного" ' +
                    'aria-label="Удалить из избранного">' +
                    '×' +
                '</button>' +
            '</div>';
        }).join('');

    } catch (err) {
        console.error('loadFavorites error:', err);
        grid.innerHTML =
            '<p class="text-gray-400 text-sm py-4">' +
            'Не удалось загрузить избранное</p>';
    }
}

async function removeFavorite(event, productId) {
    event.preventDefault();
    event.stopPropagation();

    var btn = event.currentTarget;
    btn.disabled = true;
    btn.textContent = '...';

    try {
        var res = await fetch(API + '/favorites/' + productId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (!res.ok) throw new Error('Ошибка удаления');

        // Убираем карточку из DOM
        var wrapper = btn.closest('.profile-fav-card-wrapper');
        if (wrapper) {
            wrapper.style.opacity = '0';
            wrapper.style.transform = 'scale(0.9)';
            wrapper.style.transition = 'all 0.3s ease';
            setTimeout(function () {
                wrapper.remove();
                // Проверяем — не пуста ли сетка
                var grid = document.getElementById('profile-fav-grid');
                var empty = document.getElementById('profile-fav-empty');
                if (grid && grid.children.length === 0 && empty) {
                    empty.classList.remove('hidden');
                }
            }, 300);
        }

        showNotification('Удалено из избранного', 'success');
        window._favoritesLoaded = false; // сброс для перезагрузки

    } catch (err) {
        showNotification('Ошибка удаления', 'error');
        btn.disabled = false;
        btn.textContent = '×';
    }
}

function initLogout() {
    var btn = document.getElementById('logout-btn');
    if (!btn) return;

    btn.addEventListener('click', function () {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
}

function updateNavbar() {
    var authLink       = document.getElementById('auth-link');
    var mobileAuthLink = document.getElementById('mobile-auth-link');
    var token          = getToken();

    if (token) {
        var user = getUser();
        if (user) {
            var text = user.name || user.email || 'Профиль';
            var href = user.role === 'admin' ? 'admin.html' : 'profile.html';
            if (authLink) {
                authLink.textContent = text;
                authLink.href = href;
            }
            if (mobileAuthLink) {
                mobileAuthLink.textContent = text;
                mobileAuthLink.href = href;
            }
        }
    } else {
        if (authLink) {
            authLink.textContent = 'Войти';
            authLink.href = 'login.html';
        }
        if (mobileAuthLink) {
            mobileAuthLink.textContent = 'Войти';
            mobileAuthLink.href = 'login.html';
        }
    }
}

function updateCartCount() {
    var badge = document.getElementById('cart-count');
    if (!badge || !getToken()) return;

    fetch(API + '/cart/', {
        headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then(function (res) {
        if (!res.ok) return;
        return res.json();
    }).then(function (cart) {
        if (!cart) return;
        var total = cart.reduce(function (s, i) { return s + i.quantity; }, 0);
        if (total > 0) {
            badge.textContent = total > 99 ? '99+' : total;
            badge.classList.remove('hidden');
        }
    }).catch(function () {});
}

function initBurgerMenu() {
    var burgerBtn  = document.getElementById('burger-btn');
    var mobileMenu = document.getElementById('mobile-menu');
    if (!burgerBtn || !mobileMenu) return;

    burgerBtn.addEventListener('click', function () {
        var isOpen = mobileMenu.classList.toggle('open');
        burgerBtn.classList.toggle('burger-active');
        burgerBtn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', function (e) {
        if (!mobileMenu.contains(e.target) &&
            !burgerBtn.contains(e.target)) {
            mobileMenu.classList.remove('open');
            burgerBtn.classList.remove('burger-active');
            burgerBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

async function cancelOrder(orderId, btn) {
    if (!confirm('Отменить заказ #' + orderId + '?')) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Отмена...'; }
    try {
        var res = await fetch(API + '/orders/' + orderId + '/cancel', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        var data = await res.json();
        if (!res.ok) {
            showNotification(data.detail || 'Ошибка отмены', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Отменить заказ'; }
            return;
        }
        showNotification('Заказ #' + orderId + ' отменён', 'success');
        window._ordersLoaded = false;
        loadOrders();
    } catch(e) {
        showNotification('Ошибка сети', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Отменить заказ'; }
    }
}

async function payOrder(orderId, btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Загрузка...'; }
    try {
        var res = await fetch(API + '/payments/create/' + orderId, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        var data = await res.json();
        if (!res.ok) {
            showNotification(data.detail || 'Ошибка оплаты', 'error');
            if (btn) { btn.disabled = false; btn.textContent = 'Оплатить онлайн'; }
            return;
        }
        if (data.confirmation_url) {
            window.location.href = data.confirmation_url;
        }
    } catch(e) {
        showNotification('Ошибка сети', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Оплатить онлайн'; }
    }
}

document.addEventListener('DOMContentLoaded', function () {

    // Проверка авторизации
    if (!getToken()) {
        window.location.href = 'login.html';
        return;
    }

    updateNavbar();
    updateCartCount();
    initBurgerMenu();
    initTabs();
    initPersonalForm();
    initPasswordForm();
    initAvatarUpload();
    initLogout();
    loadUserData();
    loadOrders();
});