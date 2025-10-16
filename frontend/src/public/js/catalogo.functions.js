// catalogo.functions.js
import { API } from '/js/api.js';

// -------------------- Config interceptor (auth) --------------------
API.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || '';
    const isProtected = [
      '/api/products/', // para calificar (POST)
      '/api/users',
      '/api/cart',
      '/api/checkout',
      '/api/admin'
    ].some(path => url.includes(path));
    // Si es /api/auth/profile y da 401, mostrar mensaje informativo en vez de error
    if (err.response?.status === 401 && url.includes('/api/auth/profile')) {
      console.info('No hay sesión activa. El usuario no está logueado.');
      // Opcional: showToast('No has iniciado sesión.', 'info');
      return Promise.reject(err);
    }
    if (err.response?.status === 401 && isProtected) {
      showToast('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');
      setTimeout(() => (window.location.href = '/login'), 1200);
    }
    return Promise.reject(err);
  }
);

// -------------------- Estado y selectores --------------------
const state = {
  currentPage: 1,
  currentFilters: {
    search: '',
    sort: 'nombre',
    minPrice: '',
    maxPrice: '',
    categories: [],
    availability: ['true'],
    tags: []
  },
  currentView: 'grid',
  productsData: [],
  totalProducts: 0,
  totalPages: 0,
  cartSessionId: null
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const SELECTORS = {
  searchInput: '#searchInput',
  sortSelect: '#sortSelect',
  minPrice: '#minPrice',
  maxPrice: '#maxPrice',
  checkboxes: '.checkbox-custom input[type="checkbox"]',
  gridViewBtn: '#gridView',
  productsGrid: '#productsGrid',
  paginationControls: '#paginationControls',
  resultsCount: '#resultsCount',
  ratingStars: '#ratingStars',
  submitRating: '#submitRating'
};

// -------------------- Utilidades --------------------
const debounce = (fn, delay = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

function showError(message) {
  const grid = $(SELECTORS.productsGrid);
  if (!grid) return;
  grid.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h4>Error al cargar productos</h4>
      <p>${message}</p>
      <button class="btn btn-success" id="retryLoad">Reintentar</button>
    </div>
  `;
  const btn = $('#retryLoad');
  if (btn) btn.addEventListener('click', () => loadProducts());
}

// -------------------- Ratings --------------------
const calculateAverageRating = (calificaciones = []) =>
  calificaciones.length === 0 ? 0 : calificaciones.reduce((s, c) => s + (c.estrellas || 0), 0) / calificaciones.length;

function createStarsDisplay(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return '★'.repeat(full) + (half ? '<span class="star half">★</span>' : '') + '☆'.repeat(empty);
}

async function checkAuthentication() {
  try {
    const res = await API.get('/api/auth/profile');
    return Boolean(res.data && res.data.success && res.data.user);
  } catch {
    return false;
  }
}

async function openRatingModal(productId, productName) {
  const isLogged = await checkAuthentication();
  if (!isLogged) {
    showToast('Debes iniciar sesión para calificar productos', 'warning');
    setTimeout(() => (window.location.href = '/login'), 1200);
    return;
  }

  const title = $('#ratingProductName');
  const modalEl = $('#ratingModal');
  if (title) title.textContent = productName;
  if (modalEl) modalEl.dataset.productId = productId;
  resetRatingModal();
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

function resetRatingModal() {
  $$('#ratingStars .rating-star').forEach(s => s.classList.remove('active'));
  const rc = $('#ratingComment');
  if (rc) rc.value = '';
  const rt = $('#ratingText');
  if (rt) rt.textContent = 'Selecciona una calificación';
  const submit = $(SELECTORS.submitRating);
  if (submit) submit.disabled = true;
}

function setRating(rating) {
  const modal = $('#ratingModal');
  if (modal) modal.dataset.selectedRating = rating;
  highlightStars(rating);
  const texts = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' };
  const rt = $('#ratingText');
  if (rt) rt.textContent = texts[rating] || 'Selecciona una calificación';
  const submit = $(SELECTORS.submitRating);
  if (submit) submit.disabled = false;
}

function highlightStars(rating = 0) {
  $$('#ratingStars .rating-star').forEach((s, i) => s.classList.toggle('active', i < rating));
}

async function submitRating() {
  const modal = $('#ratingModal');
  if (!modal) return;
  const productId = modal.dataset.productId;
  const rating = parseInt(modal.dataset.selectedRating || 0, 10);
  const comment = ($('#ratingComment')?.value || '').trim();

  if (!rating || rating < 1 || rating > 5) {
    showToast('Selecciona una calificación válida', 'error');
    return;
  }

  const submitBtn = $(SELECTORS.submitRating);
  const originalText = submitBtn?.innerHTML || 'Enviar';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Enviando...';
  }

  try {
    const res = await API.post(`/api/products/${productId}/rate`, { estrellas: rating, comentario: comment || undefined });
    if (res.data?.ok) {
      showToast('¡Calificación enviada exitosamente!', 'success');
      bootstrap.Modal.getInstance(modal).hide();
      await loadProducts();
    } else {
      showToast(res.data?.message || 'Error al enviar calificación', 'error');
    }
  } catch (err) {
    console.error('Error submitting rating:', err);
    let message = 'Error al enviar calificación';
    if (err.response?.status === 400) {
      const m = err.response.data?.error?.message || err.response.data?.message;
      message = m?.includes('Ya has calificado') ? 'Ya has calificado este producto anteriormente' : m || 'Datos inválidos';
    } else if (err.response?.status === 401) {
      message = 'Tu sesión ha expirado. Redirigiendo al login...';
      setTimeout(() => (window.location.href = '/login'), 1200);
    } else if (err.response?.status === 404) {
      message = 'Producto no encontrado';
    }
    showToast(message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}

// -------------------- Catalog (filters, load, render) --------------------
function initEventListeners() {
  const si = $(SELECTORS.searchInput);
  const ss = $(SELECTORS.sortSelect);
  const mp = $(SELECTORS.minPrice);
  const xp = $(SELECTORS.maxPrice);

  if (si) si.addEventListener('input', debounce(handleSearch, 300));
  if (ss) ss.addEventListener('change', handleSort);
  if (mp) mp.addEventListener('input', debounce(handlePriceFilter, 300));
  if (xp) xp.addEventListener('input', debounce(handlePriceFilter, 300));

  $$(SELECTORS.checkboxes).forEach(cb => cb.addEventListener('change', handleFilterChange));

  const stars = $(SELECTORS.ratingStars);
  if (stars) {
    $$('#ratingStars .rating-star').forEach(star => {
      star.addEventListener('click', () => setRating(parseInt(star.dataset.rating, 10)));
      star.addEventListener('mouseover', () => highlightStars(parseInt(star.dataset.rating, 10)));
    });
    stars.addEventListener('mouseleave', () => {
      const sel = parseInt($('#ratingModal')?.dataset.selectedRating || 0, 10);
      highlightStars(sel);
    });
  }

  const submit = $(SELECTORS.submitRating);
  if (submit) submit.addEventListener('click', submitRating);
}

function handleSearch() {
  state.currentFilters.search = $(SELECTORS.searchInput)?.value.trim() || '';
  state.currentPage = 1;
  loadProducts();
}

function handleSort() {
  state.currentFilters.sort = $(SELECTORS.sortSelect)?.value || 'nombre';
  state.currentPage = 1;
  loadProducts();
}

function handlePriceFilter() {
  state.currentFilters.minPrice = $(SELECTORS.minPrice)?.value || '';
  state.currentFilters.maxPrice = $(SELECTORS.maxPrice)?.value || '';
  state.currentPage = 1;
  loadProducts();
}

function handleFilterChange() {
  state.currentFilters.categories = $$('#cat-interior:checked, #cat-exterior:checked, #cat-aromaticas:checked, #cat-suculentas:checked').map(cb => cb.value);
  state.currentFilters.availability = $$('#disp-disponible:checked, #disp-agotado:checked').map(cb => cb.value);
  state.currentFilters.tags = $$('#tag-destacado:checked, #tag-nuevo:checked, #tag-oferta:checked').map(cb => cb.value);
  state.currentPage = 1;
  loadProducts();
}

function clearFilters() {
  if ($(SELECTORS.searchInput)) $(SELECTORS.searchInput).value = '';
  if ($(SELECTORS.sortSelect)) $(SELECTORS.sortSelect).value = 'nombre';
  if ($(SELECTORS.minPrice)) $(SELECTORS.minPrice).value = '';
  if ($(SELECTORS.maxPrice)) $(SELECTORS.maxPrice).value = '';
  $$(SELECTORS.checkboxes).forEach(cb => (cb.checked = cb.id === 'disp-disponible'));

  state.currentFilters = {
    search: '',
    sort: 'nombre',
    minPrice: '',
    maxPrice: '',
    categories: [],
    availability: ['true'],
    tags: []
  };

  state.currentPage = 1;
  loadProducts();
}

function toggleFilters() {
  const sidebar = document.querySelector('.filters-sidebar');
  if (!sidebar) return;
  if (window.innerWidth < 992) sidebar.classList.toggle('d-none');
}

function toggleView(view) {
  state.currentView = view;
  const gv = $(SELECTORS.gridViewBtn);
  const lv = $('#listView');
  if (gv) gv.classList.toggle('active', view === 'grid');
  if (lv) lv.classList.toggle('active', view === 'list');
  renderProducts(state.productsData);
}

async function loadProducts() {
  try {
    const params = new URLSearchParams({
      page: state.currentPage,
      limit: 12,
      sort: state.currentFilters.sort,
      search: state.currentFilters.search,
      minPrice: state.currentFilters.minPrice,
      maxPrice: state.currentFilters.maxPrice,
      categories: state.currentFilters.categories.join(','),
      availability: state.currentFilters.availability.join(','),
      tags: state.currentFilters.tags.join(',')
    });

    const { data } = await API.get(`/api/products/filter?${params}`);
    if (data?.ok) {
      state.productsData = data.data.products || [];
      state.totalProducts = data.data.total || 0;
      state.totalPages = data.data.pages || 0;
      renderProducts(state.productsData);
      renderPagination();
      updateResultsCount();
    } else {
      showError('Error al cargar productos');
    }
  } catch (err) {
    console.error('Error loading products:', err);
    showError('Error de conexión al cargar productos');
  }
}

// -------------------- Renderizado --------------------
function renderProducts(products) {
  const grid = $(SELECTORS.productsGrid);
  if (!grid) return;

  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-leaf"></i>
        <h4>No se encontraron productos</h4>
        <p>Intenta ajustar tus filtros de búsqueda</p>
        <button class="btn btn-success" onclick="clearFilters()">Limpiar Filtros</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map((p, i) => createProductCard(p, i)).join('');
}

function createProductCard(product = {}, index = 0) {
  const img = product.imagenes?.[0] ? `${API_BASE}/uploads/imagenes/${product.imagenes[0]}` : 'https://pic.onlinewebfonts.com/thumbnails/icons_574013.svg';
  const price = product.precioBase ? `$${product.precioBase.toFixed(2)}` : 'Precio no disponible';
  const avg = calculateAverageRating(product.calificaciones || []);
  const count = (product.calificaciones || []).length;
  const stars = createStarsDisplay(avg);

  // Evita inyección de comillas en el onclick construyendo atributos que usen id y funciones globales
  return `
    <div class="product-card">
      <div class="product-image-container">
        <img src="${img}" alt="${escapeHtml(product.nombre)}" class="product-image" loading="lazy">
        ${product.disponibilidad ? '' : '<div class="product-badge">Agotado</div>'}
        <div class="product-wishlist" data-id="${product._id}">
          <i class="far fa-heart"></i>
        </div>
      </div>
      <div class="product-body">
        <h3 class="product-title">${escapeHtml(product.nombre)}</h3>
        <p class="product-description">${escapeHtml(product.descripcion || 'Descripción no disponible')}</p>
        <div class="product-price">${price}</div>
        <div class="product-rating">
          <div class="product-stars interactive" data-id="${product._id}" data-name="${escapeHtml(product.nombre)}">${stars}</div>
          <span class="product-rating-count">(${count})</span>
        </div>
        <div class="product-actions">
          <button class="btn btn-add-cart" data-id="${product._id}" data-price="${product.precioBase || 0}" ${!product.disponibilidad ? 'disabled' : ''}>
            <i class="fas fa-cart-plus me-1"></i>Agregar
          </button>
          <button class="btn btn-quick-view" data-id="${product._id}">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderPagination() {
  const container = $(SELECTORS.paginationControls);
  if (!container) return;
  container.innerHTML = '';
  if (state.totalPages <= 1) return;

  const fragment = document.createDocumentFragment();

  const createPageLink = (html, page) => {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'page-link-custom';
    a.innerHTML = html;
    a.addEventListener('click', (e) => { e.preventDefault(); changePage(page); });
    return a;
  };

  if (state.currentPage > 1) fragment.appendChild(createPageLink('<i class="fas fa-chevron-left"></i>', state.currentPage - 1));

  const start = Math.max(1, state.currentPage - 2);
  const end = Math.min(state.totalPages, state.currentPage + 2);
  for (let i = start; i <= end; i++) {
    const a = createPageLink(String(i), i);
    if (i === state.currentPage) a.classList.add('active');
    fragment.appendChild(a);
  }

  if (state.currentPage < state.totalPages) fragment.appendChild(createPageLink('<i class="fas fa-chevron-right"></i>', state.currentPage + 1));

  container.appendChild(fragment);
}

function changePage(page) {
  state.currentPage = page;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateResultsCount() {
  const el = $(SELECTORS.resultsCount);
  if (el) el.textContent = `Mostrando ${state.productsData.length} de ${state.totalProducts} productos`;
}

// -------------------- Carrito, wishlist y quick view --------------------
function getOrCreateCartSessionId() {
  if (!state.cartSessionId) {
    state.cartSessionId = localStorage.getItem('cartSessionId');
    if (!state.cartSessionId) {
      state.cartSessionId = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cartSessionId', state.cartSessionId);
    }
  }
  return state.cartSessionId;
}

async function addToCart(productId, price) {
  const result = await window.CartManager?.addToCart(productId, 1);
  if (result?.success) showToast('Producto agregado al carrito', 'success');
  else showToast(result?.message || 'Error al agregar al carrito', 'error');
}

async function addToCartFromModal() {
  const q = parseInt($('#quantityInput')?.value || '1', 10);
  const productId = $('#quickViewModal')?.dataset.productId;
  if (!productId) return;
  if (q < 1 || q > 50) return showToast('Cantidad inválida', 'warning');

  const result = await window.CartManager?.addToCart(productId, q);
  if (result?.success) {
    showToast(`${q} producto(s) agregado(s) al carrito`, 'success');
    bootstrap.Modal.getInstance($('#quickViewModal')).hide();
  } else showToast(result?.message || 'Error al agregar al carrito', 'error');
}

async function updateCartCount() {
  await window.CartManager?.updateCartCount();
}

function createReviewHTML(review = {}) {
  const stars = '★'.repeat(review.estrellas || 0) + '☆'.repeat(5 - (review.estrellas || 0));
  const date = new Date(review.fecha || review.createdAt || Date.now()).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
  return `
    <div class="review-item">
      <div class="review-stars">${stars}</div>
      <div class="review-author">Usuario</div>
      <div class="review-date">${date}</div>
      ${review.comentario ? `<div class="review-comment">"${escapeHtml(review.comentario)}"</div>` : ''}
    </div>
  `;
}

async function quickView(productId) {
  const product = state.productsData.find(p => p._id === productId);
  if (!product) return;

  $('#quickViewTitle').textContent = product.nombre;
  $('#quickViewPrice').textContent = `$${(product.precioBase || 0).toFixed(2)}`;
  $('#quickViewDescription').textContent = product.descripcion || 'Descripción no disponible';

  $('#quickViewStars').innerHTML = createStarsDisplay(calculateAverageRating(product.calificaciones || []));
  const next = $('#quickViewStars')?.nextElementSibling;
  if (next) next.textContent = `(${(product.calificaciones || []).length})`;

  $('#quickViewImage').src = product.imagenes?.[0] ? `${API_BASE}/uploads/imagenes/${product.imagenes[0]}` : 'https://pic.onlinewebfonts.com/thumbnails/icons_574013.svg';

  const thumbs = $('#quickViewThumbnails');
  if (thumbs) {
    thumbs.innerHTML = '';
    (product.imagenes || []).slice(0, 10).forEach((img, i) => {
      const t = document.createElement('img');
      t.src = `${API_BASE}/uploads/imagenes/${img}`;
      t.className = `thumbnail ${i === 0 ? 'active' : ''}`;
      t.addEventListener('click', () => changeMainImage(img, t));
      thumbs.appendChild(t);
    });
  }

  const reviewsContainer = $('#quickViewReviews');
  if (reviewsContainer) {
    if (product.calificaciones && product.calificaciones.length > 0) {
      const recent = product.calificaciones.slice(-3).reverse();
      reviewsContainer.innerHTML = `<h6 class="mb-2">Reseñas recientes:</h6><div class="quick-view-reviews">${recent.map(createReviewHTML).join('')}</div>`;
    } else {
      reviewsContainer.innerHTML = `<div class="no-reviews"><small>Sé el primero en calificar este producto</small></div>`;
    }
  }

  $('#quantityInput').value = 1;
  $('#quickViewModal').dataset.productId = productId;
  new bootstrap.Modal($('#quickViewModal')).show();
}

function changeMainImage(imageName, thumbnailEl) {
  $('#quickViewImage').src = `${API_BASE}/uploads/imagenes/${imageName}`;
  $$('.thumbnail').forEach(t => t.classList.remove('active'));
  thumbnailEl.classList.add('active');
}

function changeQuantity(delta) {
  const input = $('#quantityInput');
  if (!input) return;
  const cur = parseInt(input.value || '1', 10);
  input.value = Math.max(1, Math.min(99, cur + delta));
}

function viewFullDetails() {
  const id = $('#quickViewModal')?.dataset.productId;
  if (id) window.location.href = `/producto/${id}`;
}

function toggleWishlist(productId, event) {
  let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  const idx = wishlist.indexOf(productId);
  if (idx > -1) {
    wishlist.splice(idx, 1);
    showToast('Removido de favoritos', 'info');
  } else {
    wishlist.push(productId);
    showToast('Agregado a favoritos', 'success');
  }
  localStorage.setItem('wishlist', JSON.stringify(wishlist));

  // Actualizar icono si se llamó desde un evento
  try {
    const heartIcon = (event?.target?.closest('.product-wishlist') || event?.target)?.querySelector('i');
    if (heartIcon) heartIcon.className = idx > -1 ? 'far fa-heart' : 'fas fa-heart';
  } catch (e) { /* ignore */ }
}

// -------------------- Helpers --------------------
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// -------------------- Inicialización --------------------
function attachDelegatedHandlers() {
  const grid = $(SELECTORS.productsGrid);
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.btn-add-cart');
    if (addBtn) {
      const id = addBtn.dataset.id;
      return addToCart(id, Number(addBtn.dataset.price || 0));
    }

    const quick = e.target.closest('.btn-quick-view');
    if (quick) return quickView(quick.dataset.id);

    const wishlist = e.target.closest('.product-wishlist');
    if (wishlist) {
      return toggleWishlist(wishlist.dataset.id, e);
    }

    const stars = e.target.closest('.product-stars.interactive');
    if (stars) {
      return openRatingModal(stars.dataset.id, stars.dataset.name);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  attachDelegatedHandlers();
  loadProducts();
  updateCartCount();
});

// -------------------- Export / Expose global for inline use --------------------
window.clearFilters = clearFilters;
window.changePage = changePage;
window.quickView = quickView;
window.addToCart = addToCart;
window.addToCartFromModal = addToCartFromModal;
window.toggleWishlist = (id) => toggleWishlist(id);
window.openRatingModal = openRatingModal;
window.viewFullDetails = viewFullDetails;
window.toggleView = toggleView;
window.getOrCreateCartSessionId = getOrCreateCartSessionId;
