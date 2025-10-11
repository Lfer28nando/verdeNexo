// VerdeNexo Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Shopping cart functionality
    const cartButtons = document.querySelectorAll('.btn-cart');
    const cartBadge = document.querySelector('.badge');
    let cartCount = 0;

    cartButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Add loading state
            const originalText = this.innerHTML;
            this.innerHTML = '<span class="spinner"></span> Agregando...';
            this.disabled = true;

            // Simulate API call
            setTimeout(() => {
                cartCount++;
                cartBadge.textContent = cartCount;
                
                // Reset button
                this.innerHTML = originalText;
                this.disabled = false;
                
                // Show success message
                showToast('Producto agregado al carrito', 'success');
                
                // Add animation to cart icon
                const cartIcon = document.querySelector('.fa-shopping-cart');
                cartIcon.classList.add('animate__animated', 'animate__bounce');
                setTimeout(() => {
                    cartIcon.classList.remove('animate__animated', 'animate__bounce');
                }, 1000);
            }, 1000);
        });
    });

    // Newsletter form
    const newsletterForm = document.querySelector('.newsletter-section form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = this.querySelector('input[type="email"]').value;
            const button = this.querySelector('button');
            
            if (email) {
                const originalText = button.innerHTML;
                button.innerHTML = '<span class="spinner"></span> Suscribiendo...';
                button.disabled = true;
                
                // Simulate API call
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                    this.querySelector('input[type="email"]').value = '';
                    showToast('¡Gracias por suscribirte!', 'success');
                }, 1500);
            }
        });
    }

    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Product search functionality
    const searchInput = document.querySelector('#productSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const productCards = document.querySelectorAll('.product-card');
            
            productCards.forEach(card => {
                const title = card.querySelector('.card-title').textContent.toLowerCase();
                const description = card.querySelector('.card-text').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    card.style.display = 'block';
                    card.classList.add('fade-in-up');
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Image lazy loading
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('loading');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));

    // Fade in animations on scroll
    const animatedElements = document.querySelectorAll('.fade-in-up');
    const elementObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = '0.1s';
                entry.target.classList.add('animate__animated', 'animate__fadeInUp');
            }
        });
    });

    animatedElements.forEach(el => elementObserver.observe(el));
});

// Toast notification function
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1080';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Product filter functionality
function filterProducts(category) {
    const products = document.querySelectorAll('.product-card');
    
    products.forEach(product => {
        if (category === 'all' || product.dataset.category === category) {
            product.style.display = 'block';
            product.classList.add('fade-in-up');
        } else {
            product.style.display = 'none';
        }
    });
}

// Price range filter
function filterByPrice(minPrice, maxPrice) {
    const products = document.querySelectorAll('.product-card');
    
    products.forEach(product => {
        const price = parseFloat(product.dataset.price);
        
        if (price >= minPrice && price <= maxPrice) {
            product.style.display = 'block';
        } else {
            product.style.display = 'none';
        }
    });
}

// Form validation helper
function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        }
    });

    return isValid;
}

// Local storage helpers
const Storage = {
    set: (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    },
    
    get: (key) => {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    },
    
    remove: (key) => {
        localStorage.removeItem(key);
    }
};

// Shopping cart management
const Cart = {
    items: Storage.get('cart') || [],
    
    add: (product) => {
        const existingItem = Cart.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            Cart.items.push({...product, quantity: 1});
        }
        
        Cart.save();
        Cart.updateBadge();
    },
    
    remove: (productId) => {
        Cart.items = Cart.items.filter(item => item.id !== productId);
        Cart.save();
        Cart.updateBadge();
    },
    
    updateQuantity: (productId, quantity) => {
        const item = Cart.items.find(item => item.id === productId);
        if (item) {
            item.quantity = quantity;
            if (quantity <= 0) {
                Cart.remove(productId);
            } else {
                Cart.save();
            }
        }
    },
    
    clear: () => {
        Cart.items = [];
        Cart.save();
        Cart.updateBadge();
    },
    
    save: () => {
        Storage.set('cart', Cart.items);
    },
    
    updateBadge: () => {
        const badge = document.querySelector('#carrito-contador');
        if (badge) {
            const totalItems = Cart.items.reduce((sum, item) => sum + item.quantity, 0);
            badge.textContent = totalItems;
        }
        updateCarritoUI();
    },
    
    getTotal: () => {
        return Cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
};

// Initialize cart badge on page load
document.addEventListener('DOMContentLoaded', () => {
    Cart.updateBadge();
});

// Login function
function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showToast('Por favor complete todos los campos', 'error');
        return;
    }
    
    // Simulate login process
    showToast('Iniciando sesión...', 'info');
    
    setTimeout(() => {
        // Hide login modal
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        loginModal.hide();
        
        // Show user as logged in
        document.getElementById('botonesSesion').style.display = 'none';
        document.getElementById('avatarSesion').style.display = 'block';
        
        showToast('¡Bienvenido de vuelta!', 'success');
        
        // Clear form
        document.getElementById('loginForm').reset();
    }, 1500);
}

// Register function
function register() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const acceptTerms = document.getElementById('acceptTerms').checked;
    
    if (!name || !email || !password || !confirmPassword) {
        showToast('Por favor complete todos los campos', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (!acceptTerms) {
        showToast('Debe aceptar los términos y condiciones', 'error');
        return;
    }
    
    // Simulate registration process
    showToast('Registrando usuario...', 'info');
    
    setTimeout(() => {
        // Hide register modal
        const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        registerModal.hide();
        
        showToast('¡Registro exitoso! Bienvenido a Verde Nexo', 'success');
        
        // Clear form
        document.getElementById('registerForm').reset();
    }, 1500);
}

// Cart functions
function vaciarCarrito() {
    Cart.clear();
    updateCarritoUI();
    showToast('Carrito vaciado', 'info');
}

function updateCarritoUI() {
    const carritoLista = document.getElementById('carrito-lista');
    const carritoTotal = document.getElementById('carrito-total');
    const carritoContador = document.getElementById('carrito-contador');
    
    if (Cart.items.length === 0) {
        carritoLista.innerHTML = '<div class="text-muted">El carrito está vacío</div>';
        carritoTotal.innerHTML = '';
        carritoContador.textContent = '0';
    } else {
        let html = '';
        Cart.items.forEach(item => {
            html += `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="flex-grow-1">
                        <small class="fw-bold">${item.nombre}</small><br>
                        <small class="text-muted">$${item.precio} x ${item.quantity}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="Cart.remove(${item.id})">×</button>
                </div>
            `;
        });
        carritoLista.innerHTML = html;
        carritoTotal.innerHTML = `Total: $${Cart.getTotal().toFixed(2)}`;
        
        const totalItems = Cart.items.reduce((sum, item) => sum + item.quantity, 0);
        carritoContador.textContent = totalItems;
    }
}

// Productos Slider Functions
let currentSlide = 0;
const slideWidth = 300 + 24; // 300px width + 1.5rem margin (24px)

function moverSlider(direction) {
    const slider = document.getElementById('productosSlider');
    const slides = document.querySelectorAll('.producto-slide');
    const maxSlides = slides.length;
    const container = slider.parentElement;
    const containerWidth = container.offsetWidth;
    const maxVisibleSlides = Math.floor(containerWidth / slideWidth);
    
    if (direction === 'next') {
        currentSlide++;
        // Si llegamos al final, volver al inicio (infinito)
        if (currentSlide > maxSlides - maxVisibleSlides) {
            currentSlide = 0;
        }
    } else if (direction === 'prev') {
        currentSlide--;
        // Si llegamos al inicio, ir al final (infinito)
        if (currentSlide < 0) {
            currentSlide = Math.max(0, maxSlides - maxVisibleSlides);
        }
    }
    
    const translateX = -currentSlide * slideWidth;
    slider.style.transform = `translateX(${translateX}px)`;
    
    // Las flechas siempre están activas en modo infinito
    updateSliderArrows(true);
}

function updateSliderArrows(infiniteMode = true) {
    const leftArrow = document.querySelector('.slider-arrow-left');
    const rightArrow = document.querySelector('.slider-arrow-right');
    
    if (leftArrow && rightArrow) {
        if (infiniteMode) {
            // En modo infinito, las flechas siempre están activas
            leftArrow.style.opacity = '0.8';
            rightArrow.style.opacity = '0.8';
            leftArrow.style.pointerEvents = 'auto';
            rightArrow.style.pointerEvents = 'auto';
        } else {
            // Modo finito (por si lo necesitas más adelante)
            const slides = document.querySelectorAll('.producto-slide');
            const container = document.getElementById('productosSlider').parentElement;
            const containerWidth = container.offsetWidth;
            const maxVisibleSlides = Math.floor(containerWidth / slideWidth);
            const maxSlideIndex = Math.max(0, slides.length - maxVisibleSlides);
            
            leftArrow.style.opacity = currentSlide === 0 ? '0.5' : '0.8';
            rightArrow.style.opacity = currentSlide >= maxSlideIndex ? '0.5' : '0.8';
            leftArrow.style.pointerEvents = currentSlide === 0 ? 'none' : 'auto';
            rightArrow.style.pointerEvents = currentSlide >= maxSlideIndex ? 'none' : 'auto';
        }
    }
}

function agregarAlCarrito(productoId, precio) {
    // Obtener el nombre del producto desde el DOM
    const productoElement = event.target.closest('.card');
    const nombreProducto = productoElement.querySelector('.card-title').textContent;
    
    const producto = {
        id: productoId,
        nombre: nombreProducto,
        precio: precio
    };
    
    Cart.add(producto);
    showToast(`${nombreProducto} agregado al carrito`, 'success');
    
    // Agregar animación al botón
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check me-1"></i>Agregado';
    button.classList.remove('btn-outline-success');
    button.classList.add('btn-success');
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.classList.remove('btn-success');
        button.classList.add('btn-outline-success');
    }, 1500);
}

// Auto-slider functionality (optional)
let autoSlideInterval;

function startAutoSlider() {
    autoSlideInterval = setInterval(() => {
        const slider = document.getElementById('productosSlider');
        const slides = document.querySelectorAll('.producto-slide');
        const maxSlides = slides.length;
        const container = slider.parentElement;
        const containerWidth = container.offsetWidth;
        const maxVisibleSlides = Math.floor(containerWidth / slideWidth);
        
        // Movimiento infinito para auto-slider
        currentSlide++;
        if (currentSlide > maxSlides - maxVisibleSlides) {
            currentSlide = 0;
        }
        
        const translateX = -currentSlide * slideWidth;
        slider.style.transform = `translateX(${translateX}px)`;
        updateSliderArrows(true);
    }, 4000); // Change slide every 4 seconds
}

function stopAutoSlider() {
    if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
    }
}

// Initialize slider on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize slider arrows
    setTimeout(() => {
        const slider = document.getElementById('productosSlider');
        if (slider) {
            // En modo infinito, las flechas siempre están activas
            updateSliderArrows(true);
            
            // Start auto-slider (opcional - descomenta la línea siguiente)
            // startAutoSlider();
            
            // Pause auto-slider on hover
            const sliderContainer = slider.closest('.position-relative');
            if (sliderContainer) {
                sliderContainer.addEventListener('mouseenter', stopAutoSlider);
                sliderContainer.addEventListener('mouseleave', () => {
                    // startAutoSlider(); // Descomenta si quieres auto-slider
                });
            }
        }
    }, 100);
    
    // Handle window resize for responsive slider
    window.addEventListener('resize', () => {
        const slider = document.getElementById('productosSlider');
        if (slider) {
            const slides = document.querySelectorAll('.producto-slide');
            const container = slider.parentElement;
            const containerWidth = container.offsetWidth;
            const maxVisibleSlides = Math.floor(containerWidth / slideWidth);
            const maxSlides = slides.length;
            
            // En modo infinito, ajustar currentSlide si es necesario
            if (currentSlide > maxSlides - maxVisibleSlides) {
                currentSlide = 0;
                const translateX = -currentSlide * slideWidth;
                slider.style.transform = `translateX(${translateX}px)`;
            }
            
            updateSliderArrows(true);
        }
    });
});

// Contador animado para estadísticas
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    }
    
    updateCounter();
}

// Inicializar contadores cuando entren en viewport
const observerStats = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-count'));
                if (target) {
                    stat.textContent = '0';
                    animateCounter(stat, target);
                    stat.closest('.stat-item').classList.add('animate');
                }
            });
            observerStats.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

// Observar la sección de estadísticas
document.addEventListener('DOMContentLoaded', function() {
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        observerStats.observe(statsSection);
    }
    
    // Newsletter footer form
    const newsletterFooterForm = document.getElementById('newsletterFooterForm');
    if (newsletterFooterForm) {
        newsletterFooterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('footerEmail').value;
            const button = this.querySelector('button');
            
            if (email) {
                const originalHTML = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                button.disabled = true;
                
                // Simulate API call
                setTimeout(() => {
                    button.innerHTML = '<i class="fas fa-check"></i>';
                    document.getElementById('footerEmail').value = '';
                    showToast('¡Gracias por suscribirte a nuestro newsletter!', 'success');
                    
                    // Reset button after 2 seconds
                    setTimeout(() => {
                        button.innerHTML = originalHTML;
                        button.disabled = false;
                    }, 2000);
                }, 1500);
            }
        });
    }
});