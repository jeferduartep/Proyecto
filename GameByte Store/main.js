/* ============================================================
   GameByte Store — main.js
   Funcionalidades:
     1. Carrusel  (navegación, dots, autoplay, pausa en hover)
     2. Carrito   (agregar, eliminar, contador, resumen, localStorage)
     3. Nav activa (highlight del link según sección visible)
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   1. CARRUSEL
   ───────────────────────────────────────────────────────────── */
(function initCarousel() {
  const track  = document.getElementById('track');
  const dotsEl = document.getElementById('dots');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');

  if (!track || !dotsEl) return;

  const slides = Array.from(track.querySelectorAll('.game-slide'));
  let current  = 0;
  let autoplay = null;
  const INTERVAL = 4000;

  /* — Crear dots — */
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type      = 'button';
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Ir al slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });

  /* — Ir a un slide — */
  function goTo(n) {
    current = (n + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsEl.querySelectorAll('.dot').forEach((d, i) =>
      d.classList.toggle('active', i === current)
    );
  }

  /* — Autoplay — */
  function startAutoplay() {
    autoplay = setInterval(() => goTo(current + 1), INTERVAL);
  }
  function stopAutoplay() {
    clearInterval(autoplay);
  }

  /* — Controles — */
  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));

  /* — Pausa en hover — */
  track.addEventListener('mouseenter', stopAutoplay);
  track.addEventListener('mouseleave', startAutoplay);

  /* — Swipe táctil — */
  let touchStartX = 0;
  track.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goTo(diff > 0 ? current + 1 : current - 1);
  }, { passive: true });

  startAutoplay();
})();


/* ─────────────────────────────────────────────────────────────
   2. CARRITO DE COMPRAS
   ───────────────────────────────────────────────────────────── */
(function initCart() {
  const STORAGE_KEY = 'gamebyte_cart';

  /* — Estado — */
  let cart = loadCart();

  /* — Persistencia — */
  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }
  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  /* — Helpers — */
  function findItem(name) {
    return cart.find(i => i.name === name);
  }
  function addItem(name, price) {
    const item = findItem(name);
    if (item) {
      item.qty += 1;
    } else {
      cart.push({ name, price, qty: 1 });
    }
    saveCart();
    updateBadge();
    showToast(`"${name}" añadido al carrito`);
  }
  function removeItem(name) {
    cart = cart.filter(i => i.name !== name);
    saveCart();
    updateBadge();
    renderCartPanel();
  }
  function changeQty(name, delta) {
    const item = findItem(name);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      removeItem(name);
    } else {
      saveCart();
      renderCartPanel();
    }
  }
  function totalItems() {
    return cart.reduce((sum, i) => sum + i.qty, 0);
  }
  function totalPrice() {
    return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  }
  function parsePrice(str) {
    return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
  }
  function formatPrice(num) {
    return '$' + num.toLocaleString('es-CO') + ' COP';
  }

  /* — Badge del carrito — */
  function updateBadge() {
    const badge = document.querySelector('.cart-badge');
    if (!badge) return;
    const total = totalItems();
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
  }

  /* — Toast de confirmación — */
  function showToast(msg) {
    let toast = document.getElementById('gb-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gb-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('gb-toast--show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('gb-toast--show'), 2800);
  }

  /* — Panel lateral del carrito — */
  function createCartPanel() {
    const panel = document.createElement('aside');
    panel.id        = 'cart-panel';
    panel.className = 'cart-panel';
    panel.setAttribute('aria-label', 'Carrito de compras');
    panel.innerHTML = `
      <div class="cart-panel__header">
        <h2 class="cart-panel__title">Carrito</h2>
        <button class="cart-panel__close" id="cart-close" aria-label="Cerrar carrito">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <ul class="cart-panel__list" id="cart-list"></ul>
      <div class="cart-panel__footer">
        <p class="cart-panel__total">Total: <span id="cart-total">$0 COP</span></p>
        <a href="#checkout" class="btn-comprar cart-panel__checkout">Finalizar compra</a>
      </div>`;
    document.body.appendChild(panel);

    /* Overlay */
    const overlay = document.createElement('div');
    overlay.id        = 'cart-overlay';
    overlay.className = 'cart-overlay';
    document.body.appendChild(overlay);

    document.getElementById('cart-close').addEventListener('click', closeCart);
    overlay.addEventListener('click', closeCart);
  }

  function openCart() {
    renderCartPanel();
    document.getElementById('cart-panel')?.classList.add('cart-panel--open');
    document.getElementById('cart-overlay')?.classList.add('cart-overlay--show');
    document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    document.getElementById('cart-panel')?.classList.remove('cart-panel--open');
    document.getElementById('cart-overlay')?.classList.remove('cart-overlay--show');
    document.body.style.overflow = '';
  }

  function renderCartPanel() {
    const list  = document.getElementById('cart-list');
    const total = document.getElementById('cart-total');
    if (!list || !total) return;

    if (cart.length === 0) {
      list.innerHTML = '<li class="cart-panel__empty">Tu carrito está vacío 🎮</li>';
    } else {
      list.innerHTML = cart.map(item => `
        <li class="cart-panel__item">
          <div class="cart-panel__info">
            <p class="cart-panel__name">${item.name}</p>
            <p class="cart-panel__price">${formatPrice(item.price)}</p>
          </div>
          <div class="cart-panel__qty">
            <button class="cart-qty-btn" data-action="dec" data-name="${item.name}" aria-label="Quitar uno">−</button>
            <span>${item.qty}</span>
            <button class="cart-qty-btn" data-action="inc" data-name="${item.name}" aria-label="Agregar uno">+</button>
          </div>
          <button class="cart-panel__remove" data-name="${item.name}" aria-label="Eliminar ${item.name}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </li>`).join('');
    }
    total.textContent = formatPrice(totalPrice());

    /* Delegación de eventos en la lista */
    list.querySelectorAll('.cart-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = btn.dataset.action === 'inc' ? 1 : -1;
        changeQty(btn.dataset.name, delta);
      });
    });
    list.querySelectorAll('.cart-panel__remove').forEach(btn => {
      btn.addEventListener('click', () => removeItem(btn.dataset.name));
    });
  }

  /* — Conectar botones "Comprar" de toda la página — */
  function bindBuyButtons() {
    document.querySelectorAll('.btn-comprar, .ns-btn').forEach(btn => {
      /* Evitar re-binding */
      if (btn.dataset.cartBound) return;
      btn.dataset.cartBound = 'true';

      btn.addEventListener('click', e => {
        e.preventDefault();

        /* Buscar nombre y precio en el slide o card más cercano */
        const card  = btn.closest('.game-slide, .ns-card');
        const name  = card?.querySelector('.slide-title, .ns-name')?.textContent?.trim();
        const priceStr = card?.querySelector('.slide-price, .ns-price')?.textContent?.trim();

        if (name && priceStr) {
          addItem(name, parsePrice(priceStr));
        }
      });
    });
  }

  /* — Inicialización — */
  createCartPanel();
  updateBadge();

  /* Abrir panel al pulsar el icono del carrito */
  document.querySelector('.btn-cart')?.addEventListener('click', e => {
    e.preventDefault();
    openCart();
  });

  /* Bind inicial y re-bind por si hay contenido dinámico */
  bindBuyButtons();

  /* Exportar bindBuyButtons por si se añaden cards dinámicamente */
  window.GameByte = window.GameByte || {};
  window.GameByte.bindBuyButtons = bindBuyButtons;
})();


/* ─────────────────────────────────────────────────────────────
   3. NAVEGACIÓN ACTIVA AL HACER SCROLL
   ───────────────────────────────────────────────────────────── */
(function initActiveNav() {
  const sections = Array.from(
    document.querySelectorAll('section[id], footer[id]')
  );
  const navLinks = Array.from(document.querySelectorAll('.nav-btn'));

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach(link => {
        const isActive = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('active', isActive);
      });
    });
  }, {
    rootMargin: '-40% 0px -55% 0px', /* activa cuando la sección ocupa el centro */
    threshold: 0
  });

  sections.forEach(sec => observer.observe(sec));
})();