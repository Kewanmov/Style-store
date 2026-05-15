// main/admin.js
var API_URL = window.API_BASE;

// ===== AUTH =====
function getToken() {
    return localStorage.getItem('access_token') || '';
}

function getUser() {
    var u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
}

function authHeaders() {
    return {
        'Authorization': 'Bearer ' + getToken(),
        'Content-Type': 'application/json'
    };
}

function checkAdmin() {
    var token = getToken();
    var user = getUser();
    if (!token || !user || user.role !== 'admin') {
        window.location.href = 'login.html';
        return false;
    }
    // Обновляем UI
    var avatarEl = document.querySelector('.admin-avatar');
    var nameEl = document.querySelector('.admin-user span');
    if (avatarEl && user.name) avatarEl.textContent = user.name.charAt(0).toUpperCase();
    if (nameEl && user.name) nameEl.textContent = user.name;
    return true;
}

function doLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ===== HELPERS =====
function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
}

function formatMoney(n) {
    return Number(n || 0).toLocaleString('ru-RU') + ' ₽';
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ru-RU');
}

// Toast notification
function showToast(message, type) {
    type = type || 'success';
    var old = document.querySelector('.admin-toast');
    if (old) old.remove();

    var toast = document.createElement('div');
    toast.className = 'admin-toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function () { toast.classList.add('show'); }, 10);
    setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
}

// ===== API WRAPPER =====
async function api(method, url, data) {
    var opts = {
        method: method,
        headers: authHeaders()
    };
    if (data && (method === 'POST' || method === 'PUT')) {
        opts.body = JSON.stringify(data);
    }

    var res = await fetch(API_URL + url, opts);

    if (res.status === 401) {
        doLogout();
        return null;
    }

    // DELETE может вернуть 200 с json или без
    var text = await res.text();
    var json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        json = {};
    }

    if (!res.ok) {
        throw new Error(json.detail || 'Ошибка запроса');
    }

    return json;
}

// ===== CACHED DATA =====
var adminData = {
    products: [],
    orders: [],
    users: [],
    categories: []
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function () {
    if (!checkAdmin()) return;

    initNavigation();
    initSidebarToggle();
    initModalClose();
    initLogout();
    initAddButtons();
    initSearch();

    loadDashboard();
});

// ===== NAVIGATION =====
function initNavigation() {
    var navItems = document.querySelectorAll('.nav-item[data-section]');
    for (var i = 0; i < navItems.length; i++) {
        navItems[i].addEventListener('click', function (e) {
            e.preventDefault();
            var section = this.getAttribute('data-section');
            switchSection(section);
        });
    }

    var hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'products', 'orders', 'users', 'categories'].indexOf(hash) !== -1) {
        switchSection(hash);
    }
}

function switchSection(name) {
    var sections = document.querySelectorAll('.admin-section');
    var navItems = document.querySelectorAll('.nav-item[data-section]');
    var titles = {
        dashboard: 'Дашборд',
        products: 'Товары',
        orders: 'Заказы',
        users: 'Пользователи',
        categories: 'Категории'
    };

    for (var i = 0; i < sections.length; i++) sections[i].classList.remove('active');
    for (var j = 0; j < navItems.length; j++) navItems[j].classList.remove('active');

    var target = document.getElementById('section-' + name);
    if (target) target.classList.add('active');

    var activeNav = document.querySelector('.nav-item[data-section="' + name + '"]');
    if (activeNav) activeNav.classList.add('active');

    setText('page-title', titles[name] || name);
    window.location.hash = name;
    closeMobileSidebar();

    switch (name) {
        case 'dashboard': loadDashboard(); break;
        case 'products': loadProducts(); break;
        case 'orders': loadOrders(); break;
        case 'users': loadUsers(); break;
        case 'categories': loadCategories(); break;
    }
}

function initSidebarToggle() {
    var toggle = document.getElementById('sidebar-toggle');
    var overlay = document.getElementById('sidebar-overlay-mobile');

    if (toggle) {
        toggle.addEventListener('click', function () {
            document.getElementById('admin-sidebar').classList.toggle('open');
            overlay.classList.toggle('hidden');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeMobileSidebar);
    }
}

function closeMobileSidebar() {
    var sidebar = document.getElementById('admin-sidebar');
    var overlay = document.getElementById('sidebar-overlay-mobile');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.add('hidden');
}

function initLogout() {
    var btn = document.getElementById('logout-btn');
    if (btn) {
        btn.addEventListener('click', function () {
            if (confirm('Выйти из системы?')) doLogout();
        });
    }
}

function initModalClose() {
    var closeBtn = document.getElementById('modal-close');
    var overlay = document.getElementById('modal-overlay');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
    });
}

function openModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.body.style.overflow = '';
}

function initAddButtons() {
    var addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function () {
            showProductModal(null);
        });
    }

    var addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', function () {
            showCategoryModal(null);
        });
    }
}

function initSearch() {
    var prodSearch = document.getElementById('products-search');
    if (prodSearch) {
        prodSearch.addEventListener('input', function () {
            var q = this.value.toLowerCase();
            var filtered = adminData.products.filter(function (p) {
                return p.name.toLowerCase().indexOf(q) !== -1;
            });
            renderProductsTable(filtered);
        });
    }

    var userSearch = document.getElementById('users-search');
    if (userSearch) {
        userSearch.addEventListener('input', function () {
            var q = this.value.toLowerCase();
            var filtered = adminData.users.filter(function (u) {
                return u.name.toLowerCase().indexOf(q) !== -1 ||
                       u.email.toLowerCase().indexOf(q) !== -1;
            });
            renderUsersTable(filtered);
        });
    }
}

async function loadDashboard() {
    try {
        var stats = await api('GET', '/admin/stats');
        if (stats) {
            setText('stat-users', stats.users || 0);
            setText('stat-products', stats.products || 0);
            setText('stat-orders', stats.orders || 0);
            setText('stat-revenue', formatMoney(stats.revenue));
        }
    } catch (e) {
        setText('stat-users', '—');
        setText('stat-products', '—');
        setText('stat-orders', '—');
        setText('stat-revenue', '—');
    }

    loadRecentOrders();
    loadRecentUsers();
}

async function loadRecentOrders() {
    var container = document.getElementById('recent-orders');
    try {
        var orders = await api('GET', '/admin/orders');
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="empty-placeholder">Заказов пока нет</div>';
            return;
        }

        var recent = orders.slice(0, 5);
        var html = '';
        for (var i = 0; i < recent.length; i++) {
            var o = recent[i];
            // Ищем пользователя
            var userName = 'ID: ' + o.user_id;

            html += '<div class="recent-row">' +
                '<div class="recent-info">' +
                    '<span class="recent-name">Заказ #' + o.id + '</span>' +
                    '<span class="recent-sub">' + userName + ' · ' + formatDate(o.created_at) + '</span>' +
                '</div>' +
                '<span class="recent-value">' + formatMoney(o.total) + '</span>' +
            '</div>';
        }
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<div class="empty-placeholder">Не удалось загрузить</div>';
    }
}

async function loadRecentUsers() {
    var container = document.getElementById('recent-users');
    try {
        var users = await api('GET', '/admin/users');
        if (!users || users.length === 0) {
            container.innerHTML = '<div class="empty-placeholder">Пользователей нет</div>';
            return;
        }

        var recent = users.slice(0, 5);
        var html = '';
        for (var i = 0; i < recent.length; i++) {
            var u = recent[i];
            html += '<div class="recent-row">' +
                '<div class="recent-info">' +
                    '<span class="recent-name">' + u.name + '</span>' +
                    '<span class="recent-sub">' + u.email + '</span>' +
                '</div>' +
                '<span class="role-badge ' + (u.role === 'admin' ? 'role-admin' : 'role-user') + '">' +
                    (u.role === 'admin' ? 'Админ' : 'Юзер') +
                '</span>' +
            '</div>';
        }
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<div class="empty-placeholder">Не удалось загрузить</div>';
    }
}

async function loadProducts() {
    var tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="empty-placeholder">Загрузка...</td></tr>';

    try {
        var products = await api('GET', '/products/');
        var categories = await api('GET', '/products/categories');

        adminData.products = products || [];
        adminData.categories = categories || [];

        renderProductsTable(adminData.products);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-placeholder">Ошибка загрузки</td></tr>';
    }
}

function renderProductsTable(products) {
    var tbody = document.getElementById('products-tbody');

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-placeholder">Товаров нет</td></tr>';
        return;
    }

    var html = '';
    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        var cat = findCategory(p.category_id);
        var catName = cat ? cat.name : '—';
        var stockStyle = p.stock < 5
            ? 'color:#dc2626;font-weight:700'
            : 'color:#059669;font-weight:600';

        var thumbSrc = p.image
            ? (p.image.startsWith('http') ? p.image : API_URL + '/uploads/products/' + p.image)
            : '';
        html += '<tr>' +
            '<td>' +
                (thumbSrc
                    ? '<img src="' + thumbSrc + '" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px;background:#f5f5f5">'
                    : '<div style="width:48px;height:48px;background:#f5f5f5;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:1.2rem">—</div>'
                ) +
            '</td>' +
            '<td><strong>' + escHtml(p.name) + '</strong>' +
                (p.description ? '<br><small style="color:#999">' + escHtml(p.description).substring(0, 50) + '</small>' : '') +
            '</td>' +
            '<td>' + escHtml(catName) + '</td>' +
            '<td>' + formatMoney(p.price) + '</td>' +
            '<td><span style="' + stockStyle + '">' + p.stock + ' шт.</span></td>' +
            '<td><div class="table-actions">' +
                '<button class="action-btn action-edit" onclick="showProductModal(' + p.id + ')">Изменить</button>' +
                '<button class="action-btn" style="background:#e0f2fe;color:#0369a1" onclick="showSizesModal(' + p.id + ',\'' + escAttr(p.name) + '\')">Размеры</button>' +
                '<button class="action-btn action-delete" onclick="deleteProduct(' + p.id + ')">Удалить</button>' +
            '</div></td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
}

function showProductModal(productId) {
    var product = null;
    if (productId) {
        product = adminData.products.find(function (p) { return p.id === productId; });
    }

    var title = product ? 'Редактировать товар' : 'Новый товар';
    var cats = adminData.categories || [];

    var catOptions = '';
    for (var i = 0; i < cats.length; i++) {
        var selected = (product && product.category_id === cats[i].id) ? ' selected' : '';
        catOptions += '<option value="' + cats[i].id + '"' + selected + '>' + escHtml(cats[i].name) + '</option>';
    }

    var currentImageUrl = product && product.image
        ? (product.image.startsWith('http') ? product.image : API_URL + '/uploads/products/' + product.image)
        : '';

    var formHtml =
        '<form id="product-form" class="modal-form">' +
            '<div class="form-group">' +
                '<label>Название</label>' +
                '<input type="text" id="pf-name" value="' + (product ? escAttr(product.name) : '') + '" required>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Описание</label>' +
                '<textarea id="pf-desc" rows="3">' + (product ? escHtml(product.description || '') : '') + '</textarea>' +
            '</div>' +
            '<div class="form-row">' +
                '<div class="form-group">' +
                    '<label>Цена (₽)</label>' +
                    '<input type="number" id="pf-price" step="0.01" min="0" value="' + (product ? product.price : '') + '" required>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Остаток (шт.)</label>' +
                    '<input type="number" id="pf-stock" min="0" value="' + (product ? product.stock : 0) + '" required>' +
                '</div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Категория</label>' +
                '<select id="pf-cat" required>' + catOptions + '</select>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Изображение</label>' +
                (currentImageUrl ? '<img id="pf-img-preview" src="' + escAttr(currentImageUrl) + '" style="max-height:80px;border-radius:6px;margin-bottom:6px;display:block" onerror="this.style.display=\'none\'">' : '<div id="pf-img-preview"></div>') +
                '<input type="file" id="pf-image-file" accept="image/jpeg,image/png,image/webp,image/gif" style="font-size:0.9rem">' +
                '<small style="color:#888">JPEG, PNG, WebP — макс. 5 МБ</small>' +
            '</div>' +
            '<div class="modal-actions">' +
                '<button type="button" class="action-btn action-cancel" onclick="closeModal()">Отмена</button>' +
                '<button type="submit" class="add-btn">' + (product ? 'Сохранить' : 'Добавить') + '</button>' +
            '</div>' +
        '</form>';

    openModal(title, formHtml);

    var fileInput = document.getElementById('pf-image-file');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            var preview = document.getElementById('pf-img-preview');
            if (this.files && this.files[0] && preview) {
                preview.src = URL.createObjectURL(this.files[0]);
                preview.style.display = 'block';
            }
        });
    }

    document.getElementById('product-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        var data = {
            name: document.getElementById('pf-name').value.trim(),
            description: document.getElementById('pf-desc').value.trim() || null,
            price: parseFloat(document.getElementById('pf-price').value),
            stock: parseInt(document.getElementById('pf-stock').value),
            category_id: parseInt(document.getElementById('pf-cat').value),
            image: product ? (product.image || null) : null
        };

        try {
            var savedProduct;
            if (product) {
                savedProduct = await api('PUT', '/admin/products/' + product.id, data);
                showToast('Товар обновлён');
            } else {
                savedProduct = await api('POST', '/admin/products', data);
                showToast('Товар добавлен');
            }

            var imageFile = document.getElementById('pf-image-file');
            if (imageFile && imageFile.files && imageFile.files[0] && savedProduct && savedProduct.id) {
                var fd = new FormData();
                fd.append('file', imageFile.files[0]);
                var uploadRes = await fetch(API_URL + '/admin/products/' + savedProduct.id + '/upload-image', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + getToken() },
                    body: fd
                });
                if (!uploadRes.ok) {
                    var err = await uploadRes.json().catch(function() { return {}; });
                    showToast('Товар сохранён, но изображение не загружено: ' + (err.detail || ''), 'error');
                }
            }

            closeModal();
            loadProducts();
            loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function showSizesModal(productId, productName) {
    openModal('Размеры — ' + productName, '<div id="sizes-content">Загрузка...</div>');
    var sizes = await api('GET', '/admin/products/' + productId + '/sizes').catch(function() { return []; });
    renderSizesModal(productId, sizes || []);
}

function renderSizesModal(productId, sizes) {
    var PRESET = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
    var presetOptions = PRESET.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');

    var rows = sizes.map(function(s) {
        return '<tr id="size-row-' + s.id + '">' +
            '<td><strong>' + escHtml(s.size) + '</strong></td>' +
            '<td><input type="number" min="0" value="' + s.stock + '" style="width:80px;padding:4px 8px;border:1.5px solid #e5e7eb;border-radius:6px" id="stock-' + s.id + '"></td>' +
            '<td><div class="table-actions">' +
                '<button class="action-btn action-edit" onclick="saveSizeStock(' + productId + ',' + s.id + ',\'' + escAttr(s.size) + '\')">Сохранить</button>' +
                '<button class="action-btn action-delete" onclick="deleteSize(' + productId + ',' + s.id + ')">Удалить</button>' +
            '</div></td>' +
        '</tr>';
    }).join('');

    var html =
        '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">' +
            '<thead><tr style="background:#f5f5f5"><th style="text-align:left;padding:8px">Размер</th><th style="padding:8px">Остаток</th><th style="padding:8px">Действия</th></tr></thead>' +
            '<tbody id="sizes-tbody">' + (rows || '<tr><td colspan="3" style="text-align:center;color:#999;padding:16px">Размеры не добавлены</td></tr>') + '</tbody>' +
        '</table>' +
        '<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">' +
            '<div>' +
                '<label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px">Размер</label>' +
                '<select id="new-size-val" style="padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:8px;background:white">' +
                    presetOptions +
                '</select>' +
            '</div>' +
            '<div>' +
                '<label style="font-size:0.85rem;color:#666;display:block;margin-bottom:4px">Остаток</label>' +
                '<input type="number" id="new-size-stock" min="0" value="0" style="width:90px;padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:8px">' +
            '</div>' +
            '<button class="add-btn" onclick="addSize(' + productId + ')" style="padding:8px 18px">+ Добавить</button>' +
        '</div>';

    document.getElementById('sizes-content').innerHTML = html;
}

async function addSize(productId) {
    var size  = document.getElementById('new-size-val').value.trim();
    var stock = parseInt(document.getElementById('new-size-stock').value) || 0;
    if (!size) { showToast('Выберите размер', 'error'); return; }
    try {
        await api('POST', '/admin/products/' + productId + '/sizes', { size: size, stock: stock });
        showToast('Размер добавлен');
        var sizes = await api('GET', '/admin/products/' + productId + '/sizes');
        var title = document.getElementById('modal-title').textContent;
        var name = title.replace('Размеры — ', '');
        renderSizesModal(productId, sizes || []);
    } catch(e) { showToast(e.message, 'error'); }
}

async function saveSizeStock(productId, sizeId, sizeName) {
    var input = document.getElementById('stock-' + sizeId);
    var stock = parseInt(input ? input.value : 0) || 0;
    try {
        await api('PUT', '/admin/products/' + productId + '/sizes/' + sizeId, { size: sizeName, stock: stock });
        showToast('Остаток обновлён');
        loadProducts();
    } catch(e) { showToast(e.message, 'error'); }
}

async function deleteSize(productId, sizeId) {
    if (!confirm('Удалить размер?')) return;
    try {
        await api('DELETE', '/admin/products/' + productId + '/sizes/' + sizeId);
        showToast('Размер удалён');
        var row = document.getElementById('size-row-' + sizeId);
        if (row) row.remove();
        loadProducts();
    } catch(e) { showToast(e.message, 'error'); }
}

async function deleteProduct(id) {
    if (!confirm('Удалить товар #' + id + '?')) return;
    try {
        await api('DELETE', '/admin/products/' + id);
        showToast('Товар удалён');
        loadProducts();
        loadDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function loadOrders() {
    var container = document.getElementById('orders-list');
    container.innerHTML = '<div class="empty-placeholder">Загрузка...</div>';

    try {
        var orders = await api('GET', '/admin/orders');
        var users = await api('GET', '/admin/users');

        adminData.orders = orders || [];
        adminData.users = users || [];

        window._allOrders = adminData.orders;
        renderOrders(adminData.orders);
        initOrderFilters();
    } catch (e) {
        container.innerHTML = '<div class="empty-placeholder">Ошибка загрузки заказов</div>';
    }
}

function renderOrders(orders) {
    var container = document.getElementById('orders-list');
    var statusLabels = {
        new: 'Новый', processing: 'В обработке', shipped: 'Отправлен',
        delivered: 'Доставлен', cancelled: 'Отменён'
    };

    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="empty-placeholder">Заказов нет</div>';
        return;
    }

    var html = '';
    for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        var user = findUser(o.user_id);
        var userName = user ? user.name : 'ID: ' + o.user_id;
        var userEmail = user ? user.email : '';

        html += '<div class="order-card">' +
            '<div class="order-header">' +
                '<div>' +
                    '<div class="order-id">Заказ #' + o.id + '</div>' +
                    '<div class="order-date">' + formatDate(o.created_at) + '</div>' +
                    '<div class="order-customer">' + escHtml(userName) +
                        (userEmail ? ' · ' + escHtml(userEmail) : '') +
                    '</div>' +
                '</div>' +
                '<div style="text-align:right">' +
                    '<select class="order-status-select status-' + o.status + '" ' +
                        'onchange="updateOrderStatus(' + o.id + ', this.value)">';

        var statuses = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];
        for (var s = 0; s < statuses.length; s++) {
            html += '<option value="' + statuses[s] + '"' +
                (o.status === statuses[s] ? ' selected' : '') + '>' +
                statusLabels[statuses[s]] + '</option>';
        }

        html += '</select>' +
                    '<div class="order-total">' + formatMoney(o.total) + '</div>' +
                '</div>' +
            '</div>';

        if (o.shipping_address) {
            html += '<div class="order-details"><strong>Адрес:</strong> ' + escHtml(o.shipping_address) + '</div>';
        }
        if (o.comment) {
            html += '<div class="order-details"><strong>Комментарий:</strong> ' + escHtml(o.comment) + '</div>';
        }

        if (o.items && o.items.length > 0) {
            html += '<div class="order-items-section">';
            for (var j = 0; j < o.items.length; j++) {
                var item = o.items[j];
                var prod = findProduct(item.product_id);
                var itemName = prod ? prod.name : 'Товар #' + item.product_id;

                html += '<div class="order-items-row">' +
                    '<span style="font-size:1.2rem">👕</span>' +
                    '<span class="item-name">' + escHtml(itemName) + (item.size ? ' <span style="color:#888;font-size:0.8em">(р.&nbsp;' + escHtml(item.size) + ')</span>' : '') + '</span>' +
                    '<span>×' + item.quantity + '</span>' +
                    '<span style="font-weight:600">' + formatMoney(item.price_at_purchase) + '</span>' +
                '</div>';
            }
            html += '</div>';
        }

        html += '</div>';
    }
    container.innerHTML = html;
}

function initOrderFilters() {
    var tabs = document.querySelectorAll('.filter-tab');
    for (var i = 0; i < tabs.length; i++) {
        // Remove old listeners by cloning
        var newTab = tabs[i].cloneNode(true);
        tabs[i].parentNode.replaceChild(newTab, tabs[i]);
    }

    var freshTabs = document.querySelectorAll('.filter-tab');
    for (var k = 0; k < freshTabs.length; k++) {
        freshTabs[k].addEventListener('click', function () {
            for (var j = 0; j < freshTabs.length; j++) freshTabs[j].classList.remove('active');
            this.classList.add('active');
            var status = this.getAttribute('data-status');
            if (status === 'all') {
                renderOrders(window._allOrders || []);
            } else {
                var filtered = (window._allOrders || []).filter(function (o) {
                    return o.status === status;
                });
                renderOrders(filtered);
            }
        });
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        await api('PUT', '/admin/orders/' + orderId + '/status', { status: status });
        showToast('Статус заказа #' + orderId + ' обновлён');
        loadOrders();
        loadDashboard();
    } catch (e) {
        showToast('Ошибка: ' + e.message, 'error');
    }
}

async function loadUsers() {
    var tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '<tr><td colspan="7" class="empty-placeholder">Загрузка...</td></tr>';

    try {
        var users = await api('GET', '/admin/users');
        adminData.users = users || [];
        renderUsersTable(adminData.users);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-placeholder">Ошибка загрузки</td></tr>';
    }
}

function renderUsersTable(users) {
    var tbody = document.getElementById('users-tbody');

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-placeholder">Пользователей нет</td></tr>';
        return;
    }

    var html = '';
    for (var i = 0; i < users.length; i++) {
        var u = users[i];
        var isAdmin = u.role === 'admin';

        html += '<tr>' +
            '<td>' + u.id + '</td>' +
            '<td><strong>' + escHtml(u.name) + '</strong></td>' +
            '<td>' + escHtml(u.email) + '</td>' +
            '<td>' + (u.phone ? escHtml(u.phone) : '—') + '</td>' +
            '<td><span class="role-badge ' + (isAdmin ? 'role-admin' : 'role-user') + '">' +
                (isAdmin ? 'Админ' : 'Юзер') + '</span></td>' +
            '<td>' + formatDate(u.created_at) + '</td>' +
            '<td><div class="table-actions">' +
                (isAdmin
                    ? '<span style="color:#ccc;font-size:0.8rem">Защищён</span>'
                    : '<button class="action-btn action-delete" onclick="deleteUser(' + u.id + ')">Удалить</button>'
                ) +
            '</div></td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
}

async function deleteUser(userId) {
    if (!confirm('Удалить пользователя #' + userId + '?')) return;
    try {
        await api('DELETE', '/admin/users/' + userId);
        showToast('Пользователь удалён');
        loadUsers();
        loadDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function loadCategories() {
    var tbody = document.getElementById('categories-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="empty-placeholder">Загрузка...</td></tr>';

    try {
        var categories = await api('GET', '/admin/categories');
        var products = await api('GET', '/products/');

        adminData.categories = categories || [];
        adminData.products = products || [];

        renderCategoriesTable(adminData.categories);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-placeholder">Ошибка загрузки</td></tr>';
    }
}

function renderCategoriesTable(categories) {
    var tbody = document.getElementById('categories-tbody');

    if (!categories || categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-placeholder">Категорий нет</td></tr>';
        return;
    }

    var html = '';
    for (var i = 0; i < categories.length; i++) {
        var c = categories[i];
        var parent = c.parent_id ? findCategoryById(c.parent_id) : null;
        var parentName = parent ? parent.name : '—';
        var productCount = countProductsInCategory(c.id);

        html += '<tr>' +
            '<td>' + c.id + '</td>' +
            '<td><strong>' + escHtml(c.name) + '</strong></td>' +
            '<td>' + escHtml(c.description || '—') + '</td>' +
            '<td>' + escHtml(parentName) + '</td>' +
            '<td>' + productCount + '</td>' +
            '<td><div class="table-actions">' +
                '<button class="action-btn action-edit" onclick="showCategoryModal(' + c.id + ')">Изменить</button>' +
                '<button class="action-btn action-delete" onclick="deleteCategory(' + c.id + ')">Удалить</button>' +
            '</div></td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
}

function showCategoryModal(catId) {
    var category = null;
    if (catId) {
        category = findCategoryById(catId);
    }

    var title = category ? 'Редактировать категорию' : 'Новая категория';
    var cats = adminData.categories || [];

    var parentOptions = '<option value="">— Нет (корневая) —</option>';
    for (var i = 0; i < cats.length; i++) {
        if (!cats[i].parent_id && (!category || cats[i].id !== category.id)) {
            var selected = (category && category.parent_id === cats[i].id) ? ' selected' : '';
            parentOptions += '<option value="' + cats[i].id + '"' + selected + '>' + escHtml(cats[i].name) + '</option>';
        }
    }

    var formHtml =
        '<form id="category-form" class="modal-form">' +
            '<div class="form-group">' +
                '<label>Название</label>' +
                '<input type="text" id="cf-name" value="' + (category ? escAttr(category.name) : '') + '" required>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Описание</label>' +
                '<textarea id="cf-desc" rows="3">' + (category ? escHtml(category.description || '') : '') + '</textarea>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Родительская категория</label>' +
                '<select id="cf-parent">' + parentOptions + '</select>' +
            '</div>' +
            '<div class="modal-actions">' +
                '<button type="button" class="action-btn action-cancel" onclick="closeModal()">Отмена</button>' +
                '<button type="submit" class="add-btn">' + (category ? 'Сохранить' : 'Добавить') + '</button>' +
            '</div>' +
        '</form>';

    openModal(title, formHtml);

    document.getElementById('category-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        var data = {
            name: document.getElementById('cf-name').value.trim(),
            description: document.getElementById('cf-desc').value.trim() || null,
            parent_id: document.getElementById('cf-parent').value
                ? parseInt(document.getElementById('cf-parent').value)
                : null
        };

        try {
            if (category) {
                await api('PUT', '/admin/categories/' + category.id, data);
                showToast('Категория обновлена');
            } else {
                await api('POST', '/admin/categories', data);
                showToast('Категория добавлена');
            }
            closeModal();
            loadCategories();
            loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function deleteCategory(id) {
    if (!confirm('Удалить категорию #' + id + '?\nВсе товары в ней тоже будут удалены!')) return;
    try {
        await api('DELETE', '/admin/categories/' + id);
        showToast('Категория удалена');
        loadCategories();
        loadDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function findCategory(id) {
    var cats = adminData.categories || [];
    for (var i = 0; i < cats.length; i++) {
        if (cats[i].id === id) return cats[i];
    }
    return null;
}

function findCategoryById(id) {
    return findCategory(id);
}

function findUser(id) {
    var users = adminData.users || [];
    for (var i = 0; i < users.length; i++) {
        if (users[i].id === id) return users[i];
    }
    return null;
}

function findProduct(id) {
    var products = adminData.products || [];
    for (var i = 0; i < products.length; i++) {
        if (products[i].id === id) return products[i];
    }
    return null;
}

function countProductsInCategory(catId) {
    var products = adminData.products || [];
    var count = 0;
    for (var i = 0; i < products.length; i++) {
        if (products[i].category_id === catId) count++;
    }
    return count;
}

function escHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}