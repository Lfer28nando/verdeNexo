// ===== CATÁLOGO JAVASCRIPT AVANZADO =====

class CatalogoApp {
    constructor() {
        this.filters = {};
        this.sortOrder = 'default';
        this.currentView = 'grid';
        this.itemsPerPage = 12;
        this.currentPage = 1;
        this.cart = [];
        this.wishlist = [];
        this.searchTimeout = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCart();
        this.loadWishlist();
        this.initializeFilters();
        this.updateCartUI();
    }

    // ===== EVENT BINDINGS =====
    bindEvents() {
        // Búsqueda en tiempo real
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Filtros rápidos
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                this.toggleQuickFilter(e.target);
            });
        });

        // Filtros del sidebar
        document.querySelectorAll('.filter-options input').forEach(input => {
            input.addEventListener('change', () => {
                this.updateFilters();
            });
        });

        // Rango de precio
        document.getElementById('minPrice')?.addEventListener('input', (e) => {
            this.updatePriceFilter();
        });
        document.getElementById('maxPrice')?.addEventListener('input', (e) => {
            this.updatePriceFilter();
        });

        // Ordenamiento
        document.getElementById('sortSelect')?.addEventListener('change', (e) => {
            this.updateSort(e.target.value);
        });

        // Vista grid/lista
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleView(e.target.dataset.view);
            });
        });

        // Items por página
        document.getElementById('itemsPerPage')?.addEventListener('change', (e) => {
            this.updateItemsPerPage(parseInt(e.target.value));
        });

        // Botones de producto
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToCart(parseInt(e.target.dataset.productId));
            });
        });

        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleWishlist(parseInt(e.target.dataset.productId));
            });
        });

        document.querySelectorAll('.quick-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openQuickView(parseInt(e.target.dataset.productId));
            });
        });

        // Carrito flotante
        document.getElementById('floatingCartBtn')?.addEventListener('click', () => {
            this.toggleCart();
        });

        document.getElementById('cartClose')?.addEventListener('click', () => {
            this.closeCart();
        });

        document.getElementById('cartOverlay')?.addEventListener('click', () => {
            this.closeCart();
        });

        // Limpiar filtros
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Colapsar filtros
        document.querySelectorAll('.filter-title').forEach(title => {
            title.addEventListener('click', (e) => {
                const target = e.target.dataset.bsTarget || e.target.getAttribute('data-bs-target');
                if (target) {
                    const collapse = document.querySelector(target);
                    const isExpanded = e.target.getAttribute('aria-expanded') === 'true';
                    e.target.setAttribute('aria-expanded', !isExpanded);
                }
            });
        });

        // Responsive: cerrar filtros en móvil al hacer scroll
        if (window.innerWidth <= 992) {
            let lastScrollTop = 0;
            window.addEventListener('scroll', () => {
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                if (currentScroll > lastScrollTop && currentScroll > 100) {
                    // Scrolling down
                    this.collapseMobileFilters();
                }
                lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
            }, { passive: true });
        }
    }

    // ===== BÚSQUEDA =====
    handleSearch(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.filters.search = query.trim();
            this.applyFilters();
        }, 300);
    }

    // ===== FILTROS RÁPIDOS =====
    toggleQuickFilter(chip) {
        chip.classList.toggle('active');
        const filter = chip.dataset.filter;
        
        if (chip.classList.contains('active')) {
            this.filters[filter] = true;
        } else {
            delete this.filters[filter];
        }
        
        this.applyFilters();
    }

    // ===== FILTROS DEL SIDEBAR =====
    updateFilters() {
        // Categorías
        const categorias = Array.from(document.querySelectorAll('input[name="categoria"]:checked'))
            .map(input => input.value);
        if (categorias.length > 0) {
            this.filters.categorias = categorias;
        } else {
            delete this.filters.categorias;
        }

        // Marcas
        const marcas = Array.from(document.querySelectorAll('input[name="marca"]:checked'))
            .map(input => input.value);
        if (marcas.length > 0) {
            this.filters.marcas = marcas;
        } else {
            delete this.filters.marcas;
        }

        // Disponibilidad
        const disponibilidad = Array.from(document.querySelectorAll('input[name="disponibilidad"]:checked'))
            .map(input => input.value);
        if (disponibilidad.length > 0) {
            this.filters.disponibilidad = disponibilidad;
        } else {
            delete this.filters.disponibilidad;
        }

        // Rating
        const rating = document.querySelector('input[name="rating"]:checked');
        if (rating) {
            this.filters.rating = rating.value;
        } else {
            delete this.filters.rating;
        }

        this.applyFilters();
    }

    updatePriceFilter() {
        const minPrice = document.getElementById('minPrice')?.value;
        const maxPrice = document.getElementById('maxPrice')?.value;

        if (minPrice || maxPrice) {
            this.filters.precio = {
                min: minPrice ? parseFloat(minPrice) : null,
                max: maxPrice ? parseFloat(maxPrice) : null
            };
        } else {
            delete this.filters.precio;
        }

        this.applyFilters();
    }

    // ===== APLICAR FILTROS =====
    async applyFilters() {
        this.showLoading();
        
        try {
            const params = new URLSearchParams();
            
            // Agregar filtros a los parámetros
            Object.keys(this.filters).forEach(key => {
                if (Array.isArray(this.filters[key])) {
                    this.filters[key].forEach(value => {
                        params.append(key, value);
                    });
                } else if (typeof this.filters[key] === 'object' && this.filters[key] !== null) {
                    // Para filtros de precio
                    Object.keys(this.filters[key]).forEach(subKey => {
                        if (this.filters[key][subKey] !== null) {
                            params.append(`${key}_${subKey}`, this.filters[key][subKey]);
                        }
                    });
                } else {
                    params.append(key, this.filters[key]);
                }
            });

            // Agregar ordenamiento
            if (this.sortOrder !== 'default') {
                params.append('sort', this.sortOrder);
            }

            // Agregar paginación
            params.append('page', this.currentPage);
            params.append('items_per_page', this.itemsPerPage);

            // Hacer petición AJAX
            const response = await fetch(`/catalogo/ajax/?${params.toString()}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.updateProductsGrid(data.products);
                this.updatePagination(data.pagination);
                this.updateResultsCount(data.total);
                this.updateActiveFilters();
            }
        } catch (error) {
            console.error('Error applying filters:', error);
            this.showError('Error al aplicar filtros. Inténtalo de nuevo.');
        } finally {
            this.hideLoading();
        }
    }

    // ===== ORDENAMIENTO =====
    updateSort(sortOrder) {
        this.sortOrder = sortOrder;
        this.currentPage = 1;
        this.applyFilters();
    }

    // ===== VISTA GRID/LISTA =====
    toggleView(view) {
        this.currentView = view;
        
        // Actualizar botones
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Actualizar grid
        const grid = document.getElementById('productsGrid');
        if (view === 'list') {
            grid.classList.add('list-view');
        } else {
            grid.classList.remove('list-view');
        }
    }

    // ===== ITEMS POR PÁGINA =====
    updateItemsPerPage(items) {
        this.itemsPerPage = items;
        this.currentPage = 1;
        this.applyFilters();
    }

    // ===== CARRITO =====
    addToCart(productId, quantity = 1) {
        const existingItem = this.cart.find(item => item.product_id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                product_id: productId,
                quantity: quantity,
                timestamp: Date.now()
            });
        }

        this.saveCart();
        this.updateCartUI();
        this.showCartNotification(productId, quantity);
        
        // Enviar al servidor
        this.syncCartWithServer(productId, quantity);
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.product_id !== productId);
        this.saveCart();
        this.updateCartUI();
        this.syncCartWithServer(productId, 0, 'remove');
    }

    updateCartQuantity(productId, quantity) {
        const item = this.cart.find(item => item.product_id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                item.quantity = quantity;
                this.saveCart();
                this.updateCartUI();
                this.syncCartWithServer(productId, quantity, 'update');
            }
        }
    }

    async syncCartWithServer(productId, quantity, action = 'add') {
        try {
            const response = await fetch('/carrito/ajax/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({
                    action: action,
                    product_id: productId,
                    quantity: quantity
                })
            });

            const data = await response.json();
            if (!data.success) {
                console.error('Error syncing cart:', data.error);
            }
        } catch (error) {
            console.error('Error syncing cart:', error);
        }
    }

    toggleCart() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        
        if (sidebar.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    closeCart() {
        document.getElementById('cartSidebar').classList.remove('open');
        document.getElementById('cartOverlay').classList.remove('active');
        document.body.style.overflow = '';
    }

    updateCartUI() {
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const badge = document.getElementById('cartBadge');
        const count = document.querySelector('.cart-count');
        
        if (badge) badge.textContent = totalItems;
        if (count) count.textContent = `(${totalItems})`;
        
        // Actualizar contenido del carrito
        this.renderCartItems();
    }

    async renderCartItems() {
        const container = document.getElementById('cartItems');
        const emptyState = document.getElementById('cartEmpty');
        
        if (this.cart.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        emptyState.style.display = 'none';

        // Obtener información de productos
        try {
            const productIds = this.cart.map(item => item.product_id);
            const response = await fetch('/productos/info/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({ product_ids: productIds })
            });

            const products = await response.json();
            
            let html = '';
            let subtotal = 0;

            this.cart.forEach(item => {
                const product = products.find(p => p.id === item.product_id);
                if (product) {
                    const itemTotal = product.precio_final * item.quantity;
                    subtotal += itemTotal;

                    html += `
                        <div class="cart-item" data-product-id="${product.id}">
                            <div class="cart-item-image">
                                <img src="${product.imagen}" alt="${product.nombre}">
                            </div>
                            <div class="cart-item-info">
                                <h6>${product.nombre}</h6>
                                <div class="cart-item-price">$${product.precio_final}</div>
                                <div class="cart-item-controls">
                                    <button class="btn btn-sm btn-outline-secondary" onclick="catalog.updateCartQuantity(${product.id}, ${item.quantity - 1})">-</button>
                                    <span class="quantity">${item.quantity}</span>
                                    <button class="btn btn-sm btn-outline-secondary" onclick="catalog.updateCartQuantity(${product.id}, ${item.quantity + 1})">+</button>
                                </div>
                            </div>
                            <div class="cart-item-remove">
                                <button class="btn btn-link text-danger" onclick="catalog.removeFromCart(${product.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }
            });

            container.innerHTML = html;
            document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
            document.getElementById('cartTotal').textContent = `$${subtotal.toFixed(2)}`;

        } catch (error) {
            console.error('Error rendering cart items:', error);
        }
    }

    // ===== WISHLIST =====
    toggleWishlist(productId) {
        const index = this.wishlist.indexOf(productId);
        const btn = document.querySelector(`[data-product-id="${productId}"].wishlist-btn`);
        
        if (index > -1) {
            this.wishlist.splice(index, 1);
            btn?.querySelector('i').classList.replace('fas', 'far');
            this.showNotification('Producto eliminado de favoritos', 'info');
        } else {
            this.wishlist.push(productId);
            btn?.querySelector('i').classList.replace('far', 'fas');
            this.showNotification('Producto agregado a favoritos', 'success');
        }
        
        this.saveWishlist();
        this.syncWishlistWithServer(productId);
    }

    async syncWishlistWithServer(productId) {
        try {
            const response = await fetch('/wishlist/ajax/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({
                    product_id: productId,
                    action: this.wishlist.includes(productId) ? 'add' : 'remove'
                })
            });

            const data = await response.json();
            if (!data.success) {
                console.error('Error syncing wishlist:', data.error);
            }
        } catch (error) {
            console.error('Error syncing wishlist:', error);
        }
    }

    // ===== VISTA RÁPIDA =====
    async openQuickView(productId) {
        const modal = new bootstrap.Modal(document.getElementById('quickViewModal'));
        const content = document.getElementById('quickViewContent');
        
        content.innerHTML = '<div class="text-center py-4"><div class="spinner-border" role="status"></div></div>';
        modal.show();

        try {
            const response = await fetch(`/producto/${productId}/quick-view/`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();
            if (data.success) {
                content.innerHTML = data.html;
                this.bindQuickViewEvents();
            } else {
                content.innerHTML = '<div class="alert alert-danger">Error al cargar el producto</div>';
            }
        } catch (error) {
            console.error('Error loading quick view:', error);
            content.innerHTML = '<div class="alert alert-danger">Error al cargar el producto</div>';
        }
    }

    bindQuickViewEvents() {
        // Agregar eventos específicos del modal de vista rápida
        const modal = document.getElementById('quickViewModal');
        modal.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                this.addToCart(productId);
            });
        });
    }

    // ===== UTILIDADES =====
    clearAllFilters() {
        this.filters = {};
        this.sortOrder = 'default';
        this.currentPage = 1;

        // Limpiar UI
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.remove('active');
        });

        document.querySelectorAll('.filter-options input').forEach(input => {
            input.checked = false;
        });

        document.getElementById('minPrice').value = '';
        document.getElementById('maxPrice').value = '';
        document.getElementById('sortSelect').value = 'default';

        this.applyFilters();
    }

    updateResultsCount(total) {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            countElement.textContent = total;
        }
    }

    updateActiveFilters() {
        const activeFiltersText = document.getElementById('activeFilters');
        const filterCount = Object.keys(this.filters).length;
        
        if (filterCount > 0) {
            activeFiltersText.textContent = ` - ${filterCount} filtro${filterCount > 1 ? 's' : ''} activo${filterCount > 1 ? 's' : ''}`;
        } else {
            activeFiltersText.textContent = '';
        }
    }

    collapseMobileFilters() {
        if (window.innerWidth <= 992) {
            document.querySelectorAll('.filter-group .collapse').forEach(collapse => {
                const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapse);
                bsCollapse.hide();
            });
        }
    }

    showLoading() {
        const grid = document.getElementById('productsGrid');
        grid.style.opacity = '0.6';
        grid.style.pointerEvents = 'none';
    }

    hideLoading() {
        const grid = document.getElementById('productsGrid');
        grid.style.opacity = '1';
        grid.style.pointerEvents = 'auto';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'success') {
        // Crear toast notification
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'info' ? 'info' : 'success'} alert-dismissible position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    showCartNotification(productId, quantity) {
        this.showNotification(`Producto agregado al carrito (${quantity})`, 'success');
    }

    // ===== ALMACENAMIENTO LOCAL =====
    saveCart() {
        localStorage.setItem('verdeNexo_cart', JSON.stringify(this.cart));
    }

    loadCart() {
        const saved = localStorage.getItem('verdeNexo_cart');
        if (saved) {
            this.cart = JSON.parse(saved);
        }
    }

    saveWishlist() {
        localStorage.setItem('verdeNexo_wishlist', JSON.stringify(this.wishlist));
    }

    loadWishlist() {
        const saved = localStorage.getItem('verdeNexo_wishlist');
        if (saved) {
            this.wishlist = JSON.parse(saved);
            this.updateWishlistUI();
        }
    }

    updateWishlistUI() {
        this.wishlist.forEach(productId => {
            const btn = document.querySelector(`[data-product-id="${productId}"].wishlist-btn`);
            if (btn) {
                btn.querySelector('i').classList.replace('far', 'fas');
            }
        });
    }

    initializeFilters() {
        // Cargar filtros desde URL si existen
        const urlParams = new URLSearchParams(window.location.search);
        
        urlParams.forEach((value, key) => {
            if (key === 'categoria') {
                if (!this.filters.categorias) this.filters.categorias = [];
                this.filters.categorias.push(value);
                document.querySelector(`input[name="categoria"][value="${value}"]`).checked = true;
            }
            // Agregar más filtros según sea necesario
        });
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
               document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    }

    updateProductsGrid(products) {
        // Esta función se implementará cuando tengamos la respuesta del servidor
        console.log('Updating products grid with:', products);
    }

    updatePagination(pagination) {
        // Esta función se implementará cuando tengamos la respuesta del servidor
        console.log('Updating pagination with:', pagination);
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.catalog = new CatalogoApp();
});

// ===== CSS ADICIONAL PARA ELEMENTOS DINÁMICOS =====
const additionalStyles = `
.cart-item {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #eee;
    gap: 1rem;
}

.cart-item-image img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
}

.cart-item-info {
    flex: 1;
}

.cart-item-info h6 {
    margin: 0 0 0.25rem 0;
    font-size: 0.9rem;
    font-weight: 600;
}

.cart-item-price {
    color: var(--primary-color);
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.cart-item-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.cart-item-controls .quantity {
    min-width: 30px;
    text-align: center;
    font-weight: 600;
}

.cart-item-remove button {
    color: #dc3545;
    padding: 0.25rem;
}

.spinner-border {
    color: var(--primary-color);
}
`;

// Agregar estilos adicionales
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);