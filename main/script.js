const API = window.API_BASE;

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">' +
    '<rect width="400" height="500" fill="#f5f0eb"/>' +
    '<text x="200" y="260" font-family="sans-serif" font-size="14" ' +
    'fill="#9ca3af" text-anchor="middle">Нет фото</text>' +
    '</svg>'
);

function getToken() {
    return localStorage.getItem('access_token');
}

function getUser() {
    const u = localStorage.getItem('user');
    if (!u) return null;
    try { return JSON.parse(u); } catch { return null; }
}

function isLoggedIn() {
    return !!getToken();
}

function getProductImage(imageName) {
    if (!imageName) return PLACEHOLDER;
    if (imageName.startsWith('http')) return imageName;
    if (imageName.startsWith('data:')) return imageName;
    return API + '/uploads/products/' + imageName;
}

function imgError(el) {
    el.onerror = null;
    el.src = PLACEHOLDER;
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
    var bgColor = type === 'error'
        ? 'bg-red-600'
        : type === 'success'
        ? 'bg-green-600'
        : 'bg-blue-600';

    el.className = 'fixed-toast fixed bottom-5 right-5 px-6 py-3 rounded-lg shadow-lg text-white z-[9999] transform transition-all duration-300 translate-y-10 opacity-0 ' + bgColor;
    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(function () {
        el.classList.remove('translate-y-10', 'opacity-0');
    });

    setTimeout(function () {
        el.classList.add('translate-y-10', 'opacity-0');
        setTimeout(function () {
            if (el.parentNode) el.remove();
        }, 300);
    }, 3000);
}

function updateNavbar() {
    const authLink       = document.getElementById('auth-link');
    const mobileAuthLink = document.getElementById('mobile-auth-link');

    if (isLoggedIn()) {
        const user = getUser();
        if (user) {
            const href = user.role === 'admin' ? 'admin.html' : 'profile.html';
            const text = user.name || user.email || 'Профиль';
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
        const res = await fetch(API + '/users/me', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (res.ok) {
            const user = await res.json();
            localStorage.setItem('user', JSON.stringify(user));
            const href = user.role === 'admin' ? 'admin.html' : 'profile.html';
            const text = user.name || user.email || 'Профиль';
            if (authLink)       { authLink.href = href;       authLink.textContent = text; }
            if (mobileAuthLink) { mobileAuthLink.href = href; mobileAuthLink.textContent = text; }
        } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            if (authLink)       { authLink.href = 'login.html';       authLink.textContent = 'Войти'; }
            if (mobileAuthLink) { mobileAuthLink.href = 'login.html'; mobileAuthLink.textContent = 'Войти'; }
        }
    } catch (e) {
        console.error('fetchAndSetUser error:', e);
    }
}

async function updateCartCount() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    if (!isLoggedIn()) {
        badge.classList.add('hidden');
        return;
    }

    try {
        const res = await fetch(API + '/cart/', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (res.status === 401) { badge.classList.add('hidden'); return; }

        if (res.ok) {
            const cart  = await res.json();
            const total = cart.reduce(function (sum, item) { return sum + item.quantity; }, 0);
            if (total > 0) {
                badge.textContent = total > 99 ? '99+' : total;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error('updateCartCount error:', e);
    }
}

function goToProduct(event, productId) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    window.location.href = 'product.html?id=' + productId;
}

function initHeroSwiper() {
    new Swiper('.hero-swiper', {
        loop:     true,
        speed:    800,
        autoplay: { delay: 5000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: {
            nextEl: '.hero-swiper .swiper-button-next',
            prevEl: '.hero-swiper .swiper-button-prev'
        }
    });
}

let newSwiper = null;

function initNewSwiper() {
    newSwiper = new Swiper('.new-swiper', {
        loop:         false,
        slidesPerView: 1.2,
        spaceBetween:  20,
        navigation: {
            nextEl: '.new-swiper .swiper-button-next',
            prevEl: '.new-swiper .swiper-button-prev'
        },
        breakpoints: {
            640:  { slidesPerView: 2.2, spaceBetween: 20 },
            1024: { slidesPerView: 4,   spaceBetween: 24 }
        }
    });
}

function initBurgerMenu() {
    const burgerBtn  = document.getElementById('burger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!burgerBtn || !mobileMenu) return;

    burgerBtn.addEventListener('click', function () {
        const isOpen = mobileMenu.classList.toggle('open');
        burgerBtn.classList.toggle('burger-active');
        burgerBtn.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', function (e) {
        if (!mobileMenu.contains(e.target) && !burgerBtn.contains(e.target)) {
            mobileMenu.classList.remove('open');
            burgerBtn.classList.remove('burger-active');
            burgerBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

function initSearch() {
    const forms = [
        document.getElementById('search-form'),
        document.getElementById('mobile-search-form')
    ];
    forms.forEach(function (form) {
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const input = form.querySelector('input');
            const query = input ? input.value.trim() : '';
            if (query) {
                window.location.href = 'catalog.html?search=' + encodeURIComponent(query);
            }
        });
    });
}

async function loadNewProducts() {
    const wrapper = document.getElementById('new-products');
    if (!wrapper) return;

    try {
        const res = await fetch(API + '/products/?limit=8');
        if (!res.ok) throw new Error('Ошибка сервера');

        let products = await res.json();
        products.sort(function (a, b) {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        if (products.length === 0) {
            wrapper.innerHTML = '<div class="swiper-slide"><p class="text-gray-400 py-10 pl-5">Товары скоро появятся</p></div>';
            return;
        }

        wrapper.innerHTML = products.map(function (p) {
            const imgSrc = getProductImage(p.image);
            const price  = Number(p.price).toLocaleString('ru-RU');
            const isOut  = p.stock === 0;

            return '<div class="swiper-slide">'
                + '<div class="product-card group relative">'
                +   '<a href="product.html?id=' + p.id + '" class="block overflow-hidden rounded-lg bg-gray-100 aspect-[3/4]">'
                +     '<img src="' + imgSrc + '" alt="' + escapeHtml(p.name) + '" '
                +          'class="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500" '
                +          'loading="lazy" onerror="imgError(this)">'
                +     (isOut ? '<div class="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">Нет в наличии</div>' : '')
                +   '</a>'
                +   '<div class="mt-4 flex justify-between">'
                +     '<div>'
                +       '<h3 class="text-sm text-gray-700">'
                +         '<a href="product.html?id=' + p.id + '">' + escapeHtml(p.name) + '</a>'
                +       '</h3>'
                +       '<p class="mt-1 text-sm text-gray-500">' + escapeHtml(p.category_name || 'Одежда') + '</p>'
                +     '</div>'
                +     '<p class="text-sm font-medium text-gray-900">' + price + ' ₽</p>'
                +   '</div>'
                +   (isOut
                    ? '<button disabled class="mt-4 w-full bg-gray-300 text-gray-500 py-2 rounded text-sm cursor-not-allowed">Нет в наличии</button>'
                    : '<button onclick="goToProduct(event,' + p.id + ')" '
                    +         'class="mt-4 w-full bg-dark text-white py-2 rounded text-sm hover:bg-accent transition relative z-10">'
                    +   'Выбрать размер'
                    + '</button>')
                + '</div>'
                + '</div>';
        }).join('');

        if (newSwiper) newSwiper.update();

    } catch (err) {
        wrapper.innerHTML = '<div class="swiper-slide"><p class="text-gray-400 py-10 pl-5">Не удалось загрузить товары</p></div>';
        console.error('loadNewProducts error:', err);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    updateNavbar();
    updateCartCount();
    if (document.querySelector('.hero-swiper')) initHeroSwiper();
    if (document.querySelector('.new-swiper'))  initNewSwiper();
    initBurgerMenu();
    initSearch();
    if (document.getElementById('new-products')) loadNewProducts();
});