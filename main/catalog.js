const API = window.API_BASE;

let allProducts = [];
let categories = [];
let currentCategory = null;
let priceMin = null;
let priceMax = null;
let currentSort = 'newest';
let viewMode = 'grid';
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 12;

const CATEGORY_ORDER = [3, 1, 2];

function getToken() { return localStorage.getItem('access_token'); }
function getUser() { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; }
function isLoggedIn() { return !!getToken(); }

function formatPrice(n) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency', currency: 'RUB', minimumFractionDigits: 0
    }).format(n);
}

function getProductImage(imageName) {
    if (!imageName) return `${API}/uploads/products/placeholder.webp`;
    if (imageName.startsWith('http')) return imageName;
    return `${API}/uploads/products/${imageName}`;
}

async function apiGet(url) {
    try {
        const res = await fetch(`${API}${url}`);
        if (!res.ok) throw new Error('Ошибка загрузки');
        return await res.json();
    } catch (e) {
        console.error('API Error:', e);
        return null;
    }
}

async function apiPost(url, data) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
    const res = await fetch(`${API}${url}`, {
        method: 'POST', headers, body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || 'Ошибка');
    return json;
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('category');
    if (catParam) currentCategory = parseInt(catParam);

    await Promise.all([loadCategories(), loadProducts()]);

    initSorting();
    initViewToggle();
    initPriceFilter();
    initFilterToggle();
    initBurgerMenu();
    initResetBtn();
    initSearch();
    updateNavbar();
    updateCartCount();
});

async function loadCategories() {
    const data = await apiGet('/products/categories');
    if (data) {
        categories = data;
        renderCategories();
    }
}

async function loadProducts() {
    const data = await apiGet('/products/');
    if (data) {
        allProducts = data;
        applyFilters();
    }
}

function renderCategories() {
    const container = document.getElementById('category-list');
    if (!container) return;

    const children = categories.filter(c => c.parent_id);

    const parents = [...categories.filter(c => !c.parent_id)].sort((a, b) => {
        const ia = CATEGORY_ORDER.indexOf(a.id);
        const ib = CATEGORY_ORDER.indexOf(b.id);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });

    const totalCount = allProducts.length;

    let html = `
        <button class="filter-option ${!currentCategory ? 'active' : ''}" onclick="selectCategory(null)">
            <span>Все товары</span>
            <span class="filter-count">${totalCount}</span>
        </button>
    `;

    parents.forEach(parent => {
        const childIds = children.filter(c => c.parent_id === parent.id).map(c => c.id);
        const count = allProducts.filter(p =>
            p.category_id === parent.id || childIds.includes(p.category_id)
        ).length;

        html += `
            <button class="filter-option ${currentCategory === parent.id ? 'active' : ''}"
                    onclick="selectCategory(${parent.id})">
                <span>${parent.name}</span>
                <span class="filter-count">${count}</span>
            </button>
        `;

        const subs = children
            .filter(c => c.parent_id === parent.id)
            .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

        subs.forEach(sub => {
            const subCount = allProducts.filter(p => p.category_id === sub.id).length;
            html += `
                <button class="filter-option sub ${currentCategory === sub.id ? 'active' : ''}"
                        onclick="selectCategory(${sub.id})">
                    <span>${sub.name}</span>
                    <span class="filter-count">${subCount}</span>
                </button>
            `;
        });
    });

    container.innerHTML = html;
}

function selectCategory(catId) {
    currentCategory = catId;

    const url = new URL(window.location);
    if (catId) {
        url.searchParams.set('category', catId);
    } else {
        url.searchParams.delete('category');
    }
    window.history.replaceState({}, '', url);

    applyFilters(true);
    updateTitle();
    updateActiveFilters();
}

function initSearch() {
    const input = document.getElementById('catalog-search');
    const clearBtn = document.getElementById('catalog-search-clear');
    if (!input) return;

    let debounceTimer;
    input.addEventListener('input', () => {
        searchQuery = input.value.trim();
        clearBtn && (searchQuery ? clearBtn.classList.remove('hidden') : clearBtn.classList.add('hidden'));
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => applyFilters(true), 250);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            input.value = '';
            searchQuery = '';
            clearBtn.classList.add('hidden');
            applyFilters(true);
        });
    }
}

function applyFilters(resetPage) {
    if (resetPage) currentPage = 1;

    let filtered = [...allProducts];

    if (currentCategory) {
        const childIds = categories
            .filter(c => c.parent_id === currentCategory)
            .map(c => c.id);
        const validIds = [currentCategory, ...childIds];
        filtered = filtered.filter(p => validIds.includes(p.category_id));
    }

    if (priceMin !== null) filtered = filtered.filter(p => p.price >= priceMin);
    if (priceMax !== null) filtered = filtered.filter(p => p.price <= priceMax);

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        );
    }

    switch (currentSort) {
        case 'price_asc':  filtered.sort((a, b) => a.price - b.price); break;
        case 'price_desc': filtered.sort((a, b) => b.price - a.price); break;
        case 'name':       filtered.sort((a, b) => a.name.localeCompare(b.name, 'ru')); break;
        default:           filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
    }

    renderProducts(filtered);
    updateTitle();
    updateResetBtn();
    renderCategories();
}

function renderProducts(products) {
    const grid = document.getElementById('catalog-grid');
    const empty = document.getElementById('catalog-empty');
    const countEl = document.getElementById('catalog-count');
    const paginationEl = document.getElementById('pagination');

    if (!products || products.length === 0) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        if (countEl) countEl.textContent = '0 товаров';
        if (paginationEl) paginationEl.classList.add('hidden');
        return;
    }

    const totalPages = Math.ceil(products.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageProducts = products.slice(start, start + PAGE_SIZE);

    grid.classList.remove('hidden');
    empty.classList.add('hidden');
    if (countEl) countEl.textContent = `${products.length} ${pluralize(products.length, 'товар', 'товара', 'товаров')}`;
    grid.className = viewMode === 'list' ? 'catalog-grid list-view' : 'catalog-grid';

    const placeholderUrl = `${API}/uploads/products/placeholder.webp`;

    grid.innerHTML = pageProducts.map((p, i) => {
        const cat = categories.find(c => c.id === p.category_id);
        const inStock = p.stock > 0;
        const imageUrl = getProductImage(p.image);
        const delay = (i % 6) * 0.05;

        return `
            <a href="product.html?id=${p.id}" class="catalog-card" style="animation-delay:${delay}s">
                <div class="catalog-card-img-wrap">
                    <img src="${imageUrl}" alt="${p.name}" loading="lazy"
                         onerror="this.onerror=null;this.src='${placeholderUrl}'">
                    ${!inStock ? '<div class="catalog-card-stock stock-out">Нет в наличии</div>' : ''}
                    ${inStock && p.stock <= 5 ? '<div class="catalog-card-stock stock-low">Мало</div>' : ''}
                </div>
                <div class="catalog-card-body">
                    <div class="catalog-card-category">${cat ? cat.name : ''}</div>
                    <span class="catalog-card-name">${p.name}</span>
                    <div class="catalog-card-price">${formatPrice(p.price)}</div>
                    <button class="catalog-card-cart-btn" onclick="handleAddToCart(event, ${p.id})">
                        В корзину
                    </button>
                </div>
            </a>
        `;
    }).join('');

    renderPagination(totalPages, paginationEl, products);
}

function renderPagination(totalPages, container, allFiltered) {
    if (!container) return;
    if (totalPages <= 1) { container.classList.add('hidden'); return; }

    container.classList.remove('hidden');
    let html = `<button class="page-btn" onclick="goToPage(${currentPage - 1}, event)" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;

    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
            if (i === 3 || i === totalPages - 2) html += '<span style="padding:0 4px;color:#9ca3af">…</span>';
            continue;
        }
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i}, event)">${i}</button>`;
    }

    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1}, event)" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
    container.innerHTML = html;
}

function goToPage(page, event) {
    if (event) event.preventDefault();
    currentPage = page;
    applyFilters(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleAddToCart(event, productId) {
    event.preventDefault();
    event.stopPropagation();

    if (!isLoggedIn()) {
        showToast('Войдите, чтобы добавить в корзину', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }

    const btn = event.currentTarget;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '...';

    try {
        await apiPost('/cart/', { product_id: productId, quantity: 1 });
        btn.textContent = '✓ Добавлено';
        btn.classList.add('added');
        showToast('Товар добавлен в корзину', 'success');
        updateCartCount();

        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('added');
            btn.disabled = false;
        }, 2000);
    } catch (err) {
        showToast(err.message, 'error');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function updateTitle() {
    const titleEl = document.getElementById('catalog-title');
    const breadEl = document.getElementById('catalog-breadcrumb');

    if (currentCategory) {
        const cat = categories.find(c => c.id === currentCategory);
        const name = cat ? cat.name : 'Каталог';
        if (titleEl) titleEl.textContent = name;
        if (breadEl) breadEl.textContent = name;
    } else {
        if (titleEl) titleEl.textContent = 'Каталог';
        if (breadEl) breadEl.textContent = 'Каталог';
    }
}

function updateActiveFilters() {
    const container = document.getElementById('active-filters');
    if (!container) return;

    let html = '';

    if (currentCategory) {
        const cat = categories.find(c => c.id === currentCategory);
        if (cat) {
            html += `<button class="active-filter-tag" onclick="selectCategory(null)">${cat.name} ✕</button>`;
        }
    }

    if (priceMin !== null || priceMax !== null) {
        const label = `${priceMin || '0'} — ${priceMax || '∞'} ₽`;
        html += `<button class="active-filter-tag" onclick="resetPrice()">${label} ✕</button>`;
    }

    container.innerHTML = html;
}

function initSorting() {
    const select = document.getElementById('sort-select');
    if (!select) return;
    select.addEventListener('change', () => {
        currentSort = select.value;
        applyFilters(true);
    });
}

function initViewToggle() {
    const gridBtn = document.getElementById('view-grid');
    const listBtn = document.getElementById('view-list');
    if (!gridBtn || !listBtn) return;

    gridBtn.addEventListener('click', () => {
        viewMode = 'grid';
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        applyFilters();
    });

    listBtn.addEventListener('click', () => {
        viewMode = 'list';
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        applyFilters();
    });
}

function initPriceFilter() {
    const applyBtn = document.getElementById('price-apply');
    if (!applyBtn) return;

    applyBtn.addEventListener('click', () => {
        const min = document.getElementById('price-min').value;
        const max = document.getElementById('price-max').value;
        priceMin = min ? parseFloat(min) : null;
        priceMax = max ? parseFloat(max) : null;
        applyFilters(true);
        updateActiveFilters();
    });

    ['price-min', 'price-max'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); applyBtn.click(); }
            });
        }
    });
}

function resetPrice() {
    priceMin = null;
    priceMax = null;
    document.getElementById('price-min').value = '';
    document.getElementById('price-max').value = '';
    applyFilters(true);
    updateActiveFilters();
}

function updateResetBtn() {
    const btn = document.getElementById('reset-filters');
    if (!btn) return;
    if (currentCategory || priceMin !== null || priceMax !== null) {
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
    }
}

function initResetBtn() {
    const btn = document.getElementById('reset-filters');
    if (!btn) return;
    btn.addEventListener('click', () => {
        currentCategory = null;
        priceMin = null;
        priceMax = null;
        document.getElementById('price-min').value = '';
        document.getElementById('price-max').value = '';
        const url = new URL(window.location);
        url.searchParams.delete('category');
        window.history.replaceState({}, '', url);
        applyFilters(true);
        updateActiveFilters();
    });
}

function initFilterToggle() {
    const toggle = document.getElementById('filter-toggle');
    const sidebar = document.getElementById('sidebar');
    const close = document.getElementById('sidebar-close');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggle && sidebar) toggle.addEventListener('click', () => {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.remove('hidden');
    });

    if (close && sidebar) close.addEventListener('click', () => {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.add('hidden');
    });

    if (overlay && sidebar) overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.add('hidden');
    });
}

function initBurgerMenu() {
    const btn = document.getElementById('burger-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('open');
        btn.classList.toggle('burger-active');
        btn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove('open');
            btn.classList.remove('burger-active');
        }
    });
}

function updateNavbar() {
    const authLink = document.getElementById('auth-link');
    const mobileAuthLink = document.getElementById('mobile-auth-link');

    if (isLoggedIn()) {
        const user = getUser();
        if (user) {
            const href = user.role === 'admin' ? 'admin.html' : 'profile.html';
            const text = user.name || user.email || 'Профиль';
            if (authLink) { authLink.href = href; authLink.textContent = text; }
            if (mobileAuthLink) { mobileAuthLink.href = href; mobileAuthLink.textContent = text; }
        }
    }
}

async function updateCartCount() {
    if (!isLoggedIn()) return;
    try {
        const res = await fetch(`${API}/cart/`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (res.ok) {
            const cart = await res.json();
            const badge = document.getElementById('cart-count');
            if (badge && cart.length > 0) {
                const total = cart.reduce((s, i) => s + i.quantity, 0);
                badge.textContent = total;
                badge.classList.remove('hidden');
            }
        }
    } catch (e) {}
}

function showToast(message, type = 'success') {
    const old = document.querySelector('.fixed-toast');
    if (old) old.remove();

    const el = document.createElement('div');
    const bg = type === 'error' ? '#991b1b' : type === 'success' ? '#065f46' : '#1e40af';
    el.className = 'fixed-toast';
    el.style.cssText = `
        position:fixed;bottom:1.25rem;right:1.25rem;padding:.875rem 1.5rem;
        border-radius:.75rem;color:white;font-size:.875rem;font-weight:500;
        z-index:9999;background:${bg};box-shadow:0 8px 24px rgba(0,0,0,.15);
        transform:translateY(20px);opacity:0;transition:all .3s ease;
    `;
    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(() => {
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
    });

    setTimeout(() => {
        el.style.transform = 'translateY(20px)';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

function pluralize(n, one, two, five) {
    const abs = Math.abs(n) % 100;
    const n1 = abs % 10;
    if (abs > 10 && abs < 20) return five;
    if (n1 > 1 && n1 < 5) return two;
    if (n1 === 1) return one;
    return five;
}