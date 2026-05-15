const API = window.API_BASE;

let product    = null;
let categories = [];
let quantity   = 1;
let selectedSize = null;
let productSizes = [];

function getToken()   { return localStorage.getItem('access_token'); }
function getUser()    { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; }
function isLoggedIn() { return !!getToken(); }

function formatPrice(n) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency', currency: 'RUB', minimumFractionDigits: 0
    }).format(n);
}

function getProductImage(imageName) {
    if (!imageName) return API + '/uploads/products/placeholder.webp';
    if (imageName.startsWith('http') || imageName.startsWith('data:')) return imageName;
    return API + '/uploads/products/' + imageName;
}

function getApiFallback(imageName) {
    if (!imageName) return API + '/uploads/products/placeholder.webp';
    return API + '/uploads/products/' + imageName;
}

async function apiGet(url) {
    try {
        const res = await fetch(API + url);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

async function apiPost(url, data) {
    const res = await fetch(API + url, {
        method: 'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || 'Ошибка');
    return json;
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) { showNotFound(); return; }

    const favPromise = isLoggedIn()
        ? fetch(API + '/favorites/', { headers: { 'Authorization': 'Bearer ' + getToken() } })
            .then(r => r.ok ? r.json() : []).catch(() => [])
        : Promise.resolve(null);

    const [productData, categoriesData, sizesData, favData] = await Promise.all([
        apiGet('/products/' + id),
        apiGet('/products/categories'),
        apiGet('/products/' + id + '/sizes'),
        favPromise
    ]);

    categories   = categoriesData || [];
    productSizes = sizesData      || [];

    if (!productData) { showNotFound(); return; }

    product = productData;
    saveToRecentlyViewed(product);
    const isFavorited = Array.isArray(favData) && favData.some(f => f.id === product.id);

    renderProduct();
    renderSizes();
    loadRelated();
    initQuantity();
    initAddToCart();
    initFavorite(isFavorited, favData);
    updateNavbar();
    updateCartCount();
    initBurgerMenu();
});

function renderProduct() {
    document.getElementById('product-loading').classList.add('hidden');
    document.getElementById('product-content').classList.remove('hidden');

    document.title = product.name + ' — STYLE';

    const cat     = categories.find(c => c.id === product.category_id);
    const catLink = document.getElementById('product-category-link');
    const breadProduct = document.getElementById('bread-product');

    if (cat) {
        catLink.textContent = cat.name;
        catLink.href = 'catalog.html?category=' + cat.id;
    } else {
        catLink.textContent = 'Каталог';
        catLink.href = 'catalog.html';
    }

    if (breadProduct) breadProduct.textContent = product.name;

    document.getElementById('product-name').textContent  = product.name;
    document.getElementById('product-price').textContent = formatPrice(product.price);

    const stockEl = document.getElementById('product-stock');
    if (product.stock > 0) {
        stockEl.innerHTML   = '<span class="stock-indicator"></span> В наличии: ' + product.stock + ' шт.';
        stockEl.className   = 'product-stock in-stock-text';
    } else {
        stockEl.innerHTML   = '<span class="stock-indicator"></span> Нет в наличии';
        stockEl.className   = 'product-stock out-stock-text';
        const addBtn = document.getElementById('add-to-cart-btn');
        if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Нет в наличии'; }
    }

    const descEl = document.getElementById('product-description');
    if (product.description) {
        descEl.innerHTML = '<p class="desc-title">Описание</p><p>' + product.description + '</p>';
    } else {
        descEl.innerHTML = '';
    }

    const rawImage  = product.image || null;
    const mainImg   = document.getElementById('main-image');
    mainImg.src     = getProductImage(rawImage);
    mainImg.alt     = product.name;
    mainImg.onerror = function () {
        if (this.dataset.tried === '1') {
            this.onerror = null;
            this.src = API + '/uploads/products/placeholder.webp';
        } else {
            this.dataset.tried = '1';
            this.src = getApiFallback(rawImage);
        }
    };
}

function renderSizes() {
    const section = document.getElementById('size-section');
    const grid    = document.getElementById('size-grid');
    if (!section || !grid) return;

    if (productSizes.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    grid.innerHTML = '';

    productSizes.forEach(function(sizeObj) {
        const btn      = document.createElement('button');
        btn.className  = 'size-btn';
        btn.dataset.size = sizeObj.size;
        btn.textContent  = sizeObj.size;

        if (sizeObj.stock === 0) {
            btn.classList.add('disabled');
            btn.disabled = true;
            btn.title    = 'Нет в наличии';
        } else {
            btn.addEventListener('click', function() {
                selectSize(this, sizeObj.size);
            });
        }

        grid.appendChild(btn);
    });
}

function selectSize(btn, size) {
    document.querySelectorAll('.size-btn').forEach(function(b) {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');
    selectedSize = size;

    const label = document.getElementById('size-selected-label');
    if (label) label.textContent = size;

    const err = document.getElementById('size-error');
    if (err) err.classList.add('hidden');
}

function initQuantity() {
    const minusBtn = document.getElementById('qty-minus');
    const plusBtn  = document.getElementById('qty-plus');
    const display  = document.getElementById('qty-value');
    if (!minusBtn || !plusBtn || !display) return;

    minusBtn.disabled = true;

    minusBtn.addEventListener('click', function() {
        if (quantity > 1) {
            quantity--;
            display.textContent   = quantity;
            minusBtn.disabled     = quantity <= 1;
        }
    });

    plusBtn.addEventListener('click', function() {
        const max = product ? product.stock : 99;
        if (quantity < max) {
            quantity++;
            display.textContent = quantity;
            minusBtn.disabled   = false;
        }
    });
}

function initAddToCart() {
    const btn = document.getElementById('add-to-cart-btn');
    if (!btn) return;

    btn.addEventListener('click', async function() {
        if (!isLoggedIn()) {
            showToast('Войдите в аккаунт для добавления в корзину', 'info');
            setTimeout(function() { window.location.href = 'login.html'; }, 1500);
            return;
        }

        if (!product || product.stock <= 0) return;

        const sizeSection = document.getElementById('size-section');
        const sizeErr     = document.getElementById('size-error');

        if (sizeSection && !sizeSection.classList.contains('hidden') && !selectedSize) {
            if (sizeErr) sizeErr.classList.remove('hidden');
            sizeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg class="animate-spin" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2v4m0 12v4m-7.071-3.929l2.828-2.828m8.486-8.486l2.828-2.828M2 12h4m12 0h4m-3.929 7.071l-2.828-2.828M7.757 7.757L4.929 4.929"/></svg> Добавляем...';

        try {
            const cartData = { product_id: product.id, quantity: quantity };
            if (selectedSize) cartData.size = selectedSize;

            await apiPost('/cart/', cartData);

            btn.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg> Добавлено!';
            btn.classList.add('added');

            const toastMsg = product.name + (selectedSize ? ', размер ' + selectedSize : '') + ' — добавлен в корзину';
            showToast(toastMsg);
            updateCartCount();

            setTimeout(function() {
                btn.innerHTML = originalText;
                btn.classList.remove('added');
                btn.disabled  = false;
            }, 2000);

        } catch (err) {
            showToast(err.message, 'error');
            btn.innerHTML = originalText;
            btn.disabled  = false;
        }
    });
}

function initFavorite(isFavorited, favData) {
    const favBtn = document.getElementById('fav-btn');
    if (!product || !favBtn) return;

    function updateFavUI(active) {
        active ? favBtn.classList.add('is-fav') : favBtn.classList.remove('is-fav');
    }

    if (!isLoggedIn()) {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        let active = favs.includes(product.id);
        updateFavUI(active);
        favBtn.addEventListener('click', function() {
            const list = JSON.parse(localStorage.getItem('favorites') || '[]');
            const idx = list.indexOf(product.id);
            if (idx > -1) { list.splice(idx, 1); active = false; showToast('Удалено из избранного', 'info'); }
            else           { list.push(product.id); active = true; showToast('Добавлено в избранное'); }
            localStorage.setItem('favorites', JSON.stringify(list));
            updateFavUI(active);
        });
        return;
    }

    let active = !!isFavorited;
    updateFavUI(active);

    favBtn.addEventListener('click', async function() {
        favBtn.disabled = true;
        try {
            const method = active ? 'DELETE' : 'POST';
            const res = await fetch(API + '/favorites/' + product.id, {
                method,
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            if (res.status === 401) { window.location.href = 'login.html'; return; }
            if (!res.ok) throw new Error();
            active = !active;
            updateFavUI(active);
            showToast(active ? 'Добавлено в избранное' : 'Удалено из избранного', active ? 'success' : 'info');
        } catch(e) {
            showToast('Ошибка', 'error');
        } finally {
            favBtn.disabled = false;
        }
    });
}

function saveToRecentlyViewed(p) {
    try {
        var key = 'recently_viewed';
        var list = JSON.parse(localStorage.getItem(key) || '[]');
        list = list.filter(function(item) { return item.id !== p.id; });
        list.unshift({ id: p.id, name: p.name, price: p.price, image: p.image || null });
        if (list.length > 10) list = list.slice(0, 10);
        localStorage.setItem(key, JSON.stringify(list));
    } catch(e) {}
}

async function loadRelated() {
    if (!product) return;

    var byCat = await apiGet('/products/?category_id=' + product.category_id + '&limit=8');
    var related = (byCat || []).filter(function(p) { return p.id !== product.id; });

    if (related.length < 4) {
        var extra = await apiGet('/products/?limit=12');
        var others = (extra || []).filter(function(p) {
            return p.id !== product.id && !related.find(function(r) { return r.id === p.id; });
        });
        related = related.concat(others.sort(function() { return Math.random() - 0.5; })).slice(0, 4);
    } else {
        related = related.slice(0, 4);
    }

    if (related.length === 0) return;

    const section = document.getElementById('related-section');
    const grid    = document.getElementById('related-grid');
    if (!section || !grid) return;

    section.classList.remove('hidden');

    grid.innerHTML = related.map(function(p) {
        const cat      = categories.find(function(c) { return c.id === p.category_id; });
        const imgSrc   = getProductImage(p.image);
        const imgFallback = getApiFallback(p.image);
        return '<a href="product.html?id=' + p.id + '" class="related-card">'
            + '<div class="related-card-image">'
            +   '<img src="' + imgSrc + '" alt="' + p.name + '" loading="lazy"'
            +     ' onerror="if(this.dataset.tried===\'1\'){this.src=API+\'/uploads/products/placeholder.webp\';this.onerror=null;}else{this.dataset.tried=\'1\';this.src=\'' + imgFallback + '\';}">'
            + '</div>'
            + '<div class="related-card-body">'
            +   '<div class="related-card-category">' + (cat ? cat.name : '') + '</div>'
            +   '<span class="related-card-name">' + p.name + '</span>'
            +   '<span class="related-card-price">' + formatPrice(p.price) + '</span>'
            + '</div>'
            + '</a>';
    }).join('');
}

function showToast(message, type) {
    type = type || 'success';
    const old = document.querySelector('.toast-notification');
    if (old) old.remove();

    const icons = { success: '✓', error: '✕', info: 'ℹ' };

    const toast = document.createElement('div');
    toast.className = 'toast-notification toast-' + type;
    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ') + '</span><span>' + message + '</span>';
    document.body.appendChild(toast);

    requestAnimationFrame(function() { toast.classList.add('show'); });
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
}

function showNotFound() {
    document.getElementById('product-loading').classList.add('hidden');
    document.getElementById('product-not-found').classList.remove('hidden');
    document.title = 'Товар не найден — STYLE';
}

function updateNavbar() {
    const authLink       = document.getElementById('auth-link');
    const mobileAuthLink = document.getElementById('mobile-auth-link');
    if (!isLoggedIn()) return;
    const user = getUser();
    if (!user) return;
    const href = user.role === 'admin' ? 'admin.html' : 'profile.html';
    const text = user.name || user.email || 'Профиль';
    if (authLink)       { authLink.href = href;       authLink.textContent = text; }
    if (mobileAuthLink) { mobileAuthLink.href = href; mobileAuthLink.textContent = text; }
}

async function updateCartCount() {
    if (!isLoggedIn()) return;
    try {
        const res = await fetch(API + '/cart/', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (res.ok) {
            const cart  = await res.json();
            const badge = document.getElementById('cart-count');
            if (badge) {
                const total = cart.reduce(function(s, i) { return s + i.quantity; }, 0);
                if (total > 0) {
                    badge.textContent = total > 99 ? '99+' : total;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        }
    } catch (e) {}
}

function initBurgerMenu() {
    const btn  = document.getElementById('burger-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function() {
        const isOpen = menu.classList.toggle('open');
        btn.classList.toggle('burger-active');
        btn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', function(e) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove('open');
            btn.classList.remove('burger-active');
        }
    });
}