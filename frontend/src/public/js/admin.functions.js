import { API } from './api.functions.js';
import authGuard from './authGuard.js';

// Previsualización en tiempo real
function updatePreview() {
    document.getElementById('previewNombre').textContent = document.getElementById('cpNombre').value || 'Nombre del producto';
    document.getElementById('previewDescripcion').textContent = document.getElementById('cpDescripcion').value || 'Descripción del producto...';
    document.getElementById('previewPrecio').textContent = document.getElementById('cpPrecio').value || '0.00';
    document.getElementById('previewStock').textContent = document.getElementById('cpStock').value || '0';
    document.getElementById('previewDisponibilidad').textContent = document.getElementById('cpDisponibilidad').value === 'true' ? 'Disponible' : 'No disponible';
    document.getElementById('previewDisponibilidad').className = document.getElementById('cpDisponibilidad').value === 'true' ? 'badge bg-success mb-2' : 'badge bg-secondary mb-2';
    document.getElementById('previewEtiquetas').textContent = document.getElementById('cpEtiquetas').value || '-';
    let variantes = document.getElementById('cpVariantes').value;
    try {
        variantes = variantes ? JSON.stringify(JSON.parse(variantes), null, 0) : '-';
    } catch { variantes = 'Formato inválido'; }
    document.getElementById('previewVariantes').textContent = variantes;
    // Imagen
    const imgInput = document.getElementById('cpImagenes');
    if (imgInput.files && imgInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('previewImg').src = e.target.result;
        };
        reader.readAsDataURL(imgInput.files[0]);
    } else {
        document.getElementById('previewImg').src = 'https://via.placeholder.com/150x150?text=Imagen';
    }
    // Ficha técnica
    const fichaInput = document.getElementById('cpFichaTecnica');
    if (fichaInput.files && fichaInput.files[0]) {
        document.getElementById('previewFicha').innerHTML = `<i class='fas fa-file-pdf text-danger'></i> ${fichaInput.files[0].name}`;
    } else {
        document.getElementById('previewFicha').innerHTML = '';
    }
}
['cpNombre','cpDescripcion','cpPrecio','cpStock','cpDisponibilidad','cpEtiquetas','cpVariantes','cpImagenes','cpFichaTecnica'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
    document.getElementById(id).addEventListener('change', updatePreview);
});
// Envío del formulario
document.getElementById('createProductForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    // Etiquetas como array
    if (formData.get('etiquetas')) {
        formData.set('etiquetas', formData.get('etiquetas').split(',').map(t => t.trim()).filter(Boolean));
    }
    // Variantes como array
    if (formData.get('variantes')) {
        try {
            formData.set('variantes', JSON.stringify(JSON.parse(formData.get('variantes'))));
        } catch {}
    }
    try {
        const res = await API.post('/api/products/create', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.ok || res.data.success) {
            alert('Producto creado correctamente');
            bootstrap.Modal.getInstance(document.getElementById('createProductModal')).hide();
            loadProducts();
        } else {
            alert(res.data.message || 'Error al crear producto');
        }
    } catch (err) {
        alert('Error al crear producto');
    }
});



        // Ejecutar guard al cargar
        document.addEventListener('DOMContentLoaded', () => {
            authGuard('/login');

            // Agregar event listeners para logout
            const logoutBtn = document.getElementById('logoutBtn');
            const logoutBtnMobile = document.getElementById('logoutBtnMobile');

            if (logoutBtn) {
                logoutBtn.addEventListener('click', logout);
            }
            if (logoutBtnMobile) {
                logoutBtnMobile.addEventListener('click', logout);
            }

            // Cargar datos iniciales
            loadDashboard();
            loadUsers();
            loadProducts();
        });

        // Función para cargar dashboard
        async function loadDashboard() {
            try {
                const res = await API.get('/api/admin/dashboard');
                if (res.data.success) {
                    const data = res.data.data;
                    populateDashboard(data);
                }
            } catch (err) {
                console.error('Error loading dashboard:', err);
                document.getElementById('dashboardContent').innerHTML = '<p class="text-center text-danger">Error al cargar el dashboard</p>';
            }
        }

        // Función para poblar dashboard
        function populateDashboard(data) {
            const stats = data.stats;
            const usersByRole = data.usersByRole;
            const recentProducts = data.recentProducts;
            const recentUsers = data.recentUsers;

            document.getElementById('dashboardContent').innerHTML = `
                <!-- Estadísticas -->
                <div class="row mb-4">
                    <div class="col-md-3 mb-3">
                        <div class="stats-card">
                            <div class="stats-number">${stats.totalUsers}</div>
                            <div class="stats-label">Total Usuarios</div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="stats-card">
                            <div class="stats-number">${stats.totalProducts}</div>
                            <div class="stats-label">Total Productos</div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="stats-card">
                            <div class="stats-number">${stats.activeProducts}</div>
                            <div class="stats-label">Productos Activos</div>
                        </div>
                    </div>
                    <div class="col-md-3 mb-3">
                        <div class="stats-card">
                            <div class="stats-number">${stats.inactiveProducts}</div>
                            <div class="stats-label">Productos Inactivos</div>
                        </div>
                    </div>
                </div>

                <!-- Gráfico de roles de usuario -->
                <div class="admin-section mb-4">
                    <div class="section-header">
                        <h3><i class="fas fa-chart-pie me-2"></i>Distribución de Roles</h3>
                        <p>Usuarios por rol en el sistema</p>
                    </div>
                    <canvas id="rolesChart" width="400" height="200"></canvas>
                </div>

                <div class="row">
                    <!-- Usuarios recientes -->
                    <div class="col-md-6">
                        <div class="admin-section">
                            <div class="section-header">
                                <h3><i class="fas fa-user-plus me-2"></i>Usuarios Recientes</h3>
                                <p>Últimos usuarios registrados</p>
                            </div>
                            <div class="table-responsive">
                                <table class="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Usuario</th>
                                            <th>Email</th>
                                            <th>Rol</th>
                                            <th>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${recentUsers.map(user => `
                                            <tr>
                                                <td>${user.username}</td>
                                                <td>${user.email}</td>
                                                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                                                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Productos recientes -->
                    <div class="col-md-6">
                        <div class="admin-section">
                            <div class="section-header">
                                <h3><i class="fas fa-box-open me-2"></i>Productos Recientes</h3>
                                <p>Últimos productos agregados</p>
                            </div>
                            <div class="table-responsive">
                                <table class="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Precio</th>
                                            <th>Estado</th>
                                            <th>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${recentProducts.map(product => `
                                            <tr>
                                                <td>${product.nombre}</td>
                                                <td>$${product.precioBase}</td>
                                                <td>
                                                    <span class="badge ${product.disponibilidad ? 'bg-success' : 'bg-secondary'}">
                                                        ${product.disponibilidad ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td>${new Date(product.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Crear gráfico de roles
            createRolesChart(usersByRole);
        }

        // Función para crear gráfico de roles
        function createRolesChart(usersByRole) {
            const ctx = document.getElementById('rolesChart').getContext('2d');
            const roleLabels = usersByRole.map(item => item._id);
            const roleData = usersByRole.map(item => item.count);

            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: roleLabels,
                    datasets: [{
                        data: roleData,
                        backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Función para cargar usuarios
        async function loadUsers(page = 1) {
            try {
                const res = await API.get(`/api/admin/users?page=${page}`);
                if (res.data.success) {
                    populateUsers(res.data.data);
                }
            } catch (err) {
                console.error('Error loading users:', err);
                document.getElementById('usersContent').innerHTML = '<p class="text-center text-danger">Error al cargar usuarios</p>';
            }
        }

        // Función para poblar tabla de usuarios
        function populateUsers(data) {
            const { users, pagination } = data;

            document.getElementById('usersContent').innerHTML = `
                <div class="table-responsive">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Registro</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>${user.username}</td>
                                    <td>${user.email}</td>
                                    <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                                    <td>
                                        <span class="badge ${user.verifiedEmail ? 'bg-success' : 'bg-warning'}">
                                            ${user.verifiedEmail ? 'Verificado' : 'No verificado'}
                                        </span>
                                    </td>
                                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <button class="btn btn-admin-warning btn-sm me-2" onclick="showChangeRoleModal('${user._id}', '${user.username}', '${user.role}')">
                                            <i class="fas fa-user-edit"></i>
                                        </button>
                                        <button class="btn btn-admin btn-sm" onclick="showDeleteUserModal('${user._id}', '${user.username}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Paginación -->
                ${pagination.pages > 1 ? `
                    <nav aria-label="Paginación de usuarios" class="mt-4">
                        <ul class="pagination justify-content-center">
                            ${pagination.page > 1 ? `<li class="page-item"><a class="page-link" href="#" onclick="loadUsers(${pagination.page - 1})">Anterior</a></li>` : ''}
                            ${Array.from({length: pagination.pages}, (_, i) => i + 1).map(pageNum => `
                                <li class="page-item ${pageNum === pagination.page ? 'active' : ''}">
                                    <a class="page-link" href="#" onclick="loadUsers(${pageNum})">${pageNum}</a>
                                </li>
                            `).join('')}
                            ${pagination.page < pagination.pages ? `<li class="page-item"><a class="page-link" href="#" onclick="loadUsers(${pagination.page + 1})">Siguiente</a></li>` : ''}
                        </ul>
                    </nav>
                ` : ''}
            `;
        }

        // Función para cargar productos
        async function loadProducts(page = 1) {
            try {
                const res = await API.get(`/api/admin/products?page=${page}`);
                if (res.data.success) {
                    populateProducts(res.data.data);
                }
            } catch (err) {
                console.error('Error loading products:', err);
                document.getElementById('productsContent').innerHTML = '<p class="text-center text-danger">Error al cargar productos</p>';
            }
        }

        // Función para poblar tabla de productos
        function populateProducts(data) {
            const { products, pagination } = data;

            document.getElementById('productsContent').innerHTML = `
                <div class="d-flex justify-content-end mb-3">
                    <button class="btn btn-admin-success" data-bs-toggle="modal" data-bs-target="#createProductModal">
                        <i class="fas fa-plus me-2"></i>Crear producto
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Precio Base</th>
                                <th>Disponibilidad</th>
                                <th>Creado</th>
                                <th>Acciones</th>
                                <th>Ficha técnica</th>
                            </tr>
                        </thead>
                        <tbody>
                                ${products.map(product => '<tr><td>' + product.nombre + '</td><td>$' + product.precioBase + '</td><td><span class="badge ' + (product.disponibilidad ? 'bg-success' : 'bg-secondary') + '">' + (product.disponibilidad ? 'Disponible' : 'No disponible') + '</span></td><td>' + new Date(product.createdAt).toLocaleDateString() + '</td><td><button class="btn btn-admin-warning btn-sm me-2" onclick="showEditProductModal(\'' + product._id + '\')"><i class="fas fa-edit me-1"></i>Editar</button><button class="btn ' + (product.disponibilidad ? 'btn-admin' : 'btn-admin-success') + ' btn-sm" onclick="showToggleProductModal(\'' + product._id + '\', \'' + product.nombre + '\', ' + product.disponibilidad + ')"><i class="fas ' + (product.disponibilidad ? 'fa-eye-slash' : 'fa-eye') + ' me-1"></i>' + (product.disponibilidad ? 'Desactivar' : 'Activar') + '</button></td><td><form class="techsheet-upload-form d-flex align-items-center gap-2" data-product-id="' + product._id + '" enctype="multipart/form-data" style="display:inline-flex; min-width:180px;"><label class="form-label mb-0" style="font-size:0.95em; color:#555;">PDF</label><input type="file" name="file" accept="application/pdf" class="form-control form-control-sm" style="width:120px;" required /><button type="submit" class="btn btn-outline-success btn-sm px-3 py-1" style="font-weight:600; border-radius:6px;"><i class="fas fa-upload me-1"></i>Subir</button></form><div class="techsheet-result" style="font-size:0.9em;"></div>' + (product.fichaTecnica ? '<div class="d-flex flex-column align-items-start ms-2"><span class="fw-semibold text-dark" style="font-size:0.97em;"><i class="fas fa-file-pdf me-1 text-danger"></i>' + product.fichaTecnica + '</span><span class="text-secondary" style="font-size:0.92em;">Subido: ' + (product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : new Date(product.createdAt).toLocaleDateString()) + '</span><div class="d-flex gap-2 mt-1"><a href="https://verdenexo-backend.onrender.com/api/products/' + product._id + '/technical-sheet" target="_blank" class="btn btn-outline-primary btn-sm px-2 py-1" style="font-weight:600; border-radius:6px;"><i class="fas fa-eye me-1"></i>Abrir</a><a href="https://verdenexo-backend.onrender.com/api/products/' + product._id + '/technical-sheet" download class="btn btn-outline-success btn-sm px-2 py-1" style="font-weight:600; border-radius:6px;"><i class="fas fa-download me-1"></i>Descargar</a></div></div>' : '<span class="text-muted ms-2" style="font-size:0.95em;">Sin ficha</span>') + '</td></tr>').join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Paginación -->
                ${pagination.pages > 1 ? `
                    <nav aria-label="Paginación de productos" class="mt-4">
                        <ul class="pagination justify-content-center">
                            ${pagination.page > 1 ? '<li class="page-item"><a class="page-link" href="#" onclick="loadProducts(' + (pagination.page - 1) + ')">Anterior</a></li>' : ''}
                            ${Array.from({length: pagination.pages}, (_, i) => i + 1).map(pageNum => `
                                <li class="page-item ${pageNum === pagination.page ? 'active' : ''}">
                                    <a class="page-link" href="#" onclick="loadProducts(${pageNum})">${pageNum}</a>
                                </li>
                            `).join('')}
                            ${pagination.page < pagination.pages ? '<li class="page-item"><a class="page-link" href="#" onclick="loadProducts(' + (pagination.page + 1) + ')">Siguiente</a></li>' : ''}
                        </ul>
                    </nav>
                ` : ''}
            `;
            // Agregar event listeners a los formularios de ficha técnica
            setTimeout(() => {
                document.querySelectorAll('.techsheet-upload-form').forEach(form => {
                    form.addEventListener('submit', async function(e) {
                        e.preventDefault();
                        const productId = form.getAttribute('data-product-id');
                        const fileInput = form.querySelector('input[type="file"]');
                        const resultDiv = form.nextElementSibling;
                        if (!fileInput.files.length) return;
                        const formData = new FormData();
                        formData.append('file', fileInput.files[0]);
                        try {
                            const res = await API.post(`/api/products/${productId}/technical-sheet`, formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            if (res.data.ok) {
                                resultDiv.innerHTML = `<div class='alert alert-success p-2 mb-0 d-flex align-items-center gap-2'><i class='fas fa-check-circle me-2'></i>Ficha técnica subida correctamente.</div>`;
                            } else {
                                resultDiv.innerHTML = `<div class='alert alert-danger p-2 mb-0 d-flex align-items-center gap-2'><i class='fas fa-exclamation-circle me-2'></i>${res.data.message || 'Error al subir PDF.'}</div>`;
                            }
                        } catch (err) {
                            resultDiv.innerHTML = `<div class='alert alert-danger p-2 mb-0 d-flex align-items-center gap-2'><i class='fas fa-exclamation-circle me-2'></i>Error al subir PDF.</div>`;
                        }
                    });
                });
                // Modal de edición de producto (dinámico)
                if (!document.getElementById('editProductModal')) {
                    document.body.insertAdjacentHTML('beforeend', `
                    <div class="modal fade" id="editProductModal" tabindex="-1" aria-labelledby="editProductModalLabel" aria-hidden="true">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header bg-warning text-dark">
                                    <h5 class="modal-title" id="editProductModalLabel"><i class="fas fa-edit me-2"></i>Editar producto</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body" id="editProductModalBody">
                                    <div class="loading"><div class="spinner-border" role="status"><span class="visually-hidden">Cargando...</span></div></div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" form="editProductForm" class="btn btn-admin-warning">Guardar cambios</button>
                                </div>
                            </div>
                        </div>
                    </div>`);
                }
                // Modal de creación de producto (dinámico)
                if (!document.getElementById('createProductModal')) {
                    document.body.insertAdjacentHTML('beforeend', `
                    <div class="modal fade" id="createProductModal" tabindex="-1" aria-labelledby="createProductModalLabel" aria-hidden="true">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header bg-success text-white">
                                    <h5 class="modal-title" id="createProductModalLabel"><i class="fas fa-plus me-2"></i>Crear producto</h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <form id="createProductForm" enctype="multipart/form-data">
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Nombre</label>
                                                <input type="text" class="form-control" name="nombre" required />
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Precio base</label>
                                                <input type="number" class="form-control" name="precioBase" min="0" step="0.01" required />
                                            </div>
                                            <div class="col-md-12">
                                                <label class="form-label">Descripción</label>
                                                <textarea class="form-control" name="descripcion" rows="2" required></textarea>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Stock</label>
                                                <input type="number" class="form-control" name="stock" min="0" required />
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Disponibilidad</label>
                                                <select class="form-select" name="disponibilidad">
                                                    <option value="true" selected>Disponible</option>
                                                    <option value="false">No disponible</option>
                                                </select>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Etiquetas</label>
                                                <input type="text" class="form-control" name="etiquetas" placeholder="Separadas por coma" />
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Imágenes</label>
                                                <input type="file" class="form-control" name="imagenes" accept="image/*" multiple />
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Ficha técnica (PDF)</label>
                                                <input type="file" class="form-control" name="fichaTecnica" accept="application/pdf" />
                                            </div>
                                            <div class="col-md-12">
                                                <label class="form-label">Variantes (JSON)</label>
                                                <textarea class="form-control" name="variantes" rows="2" placeholder='[{"atributo":"color","valor":"verde","precio":10,"stock":5}]'></textarea>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" form="createProductForm" class="btn btn-admin-success">Crear producto</button>
                                </div>
                            </div>
                        </div>
                    </div>`);
                }
                // Registrar evento submit para creación
                const createForm = document.getElementById('createProductForm');
                if (createForm) {
                    createForm.addEventListener('submit', async function(e) {
                        e.preventDefault();
                        const formData = new FormData(createForm);
                        // Etiquetas como array
                        if (formData.get('etiquetas')) {
                            formData.set('etiquetas', formData.get('etiquetas').split(',').map(t => t.trim()).filter(Boolean));
                        }
                        // Variantes como array
                        if (formData.get('variantes')) {
                            try {
                                formData.set('variantes', JSON.stringify(JSON.parse(formData.get('variantes'))));
                            } catch {}
                        }
                        try {
                            const res = await API.post('/api/products', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            if (res.data.ok || res.data.success) {
                                alert('Producto creado correctamente');
                                bootstrap.Modal.getInstance(document.getElementById('createProductModal')).hide();
                                loadProducts();
                            } else {
                                alert(res.data.message || 'Error al crear producto');
                            }
                        } catch (err) {
                            alert('Error al crear producto');
                        }
                    });
                }
                window.showEditProductModal = async function(productId) {
                    const modal = new bootstrap.Modal(document.getElementById('editProductModal'));
                    const body = document.getElementById('editProductModalBody');
                    body.innerHTML = '<div class="loading"><div class="spinner-border" role="status"><span class="visually-hidden">Cargando...</span></div></div>';
                    try {
                        const res = await API.get(`/api/products/${productId}`);
                        if (res.data.ok && res.data.data) {
                            const p = res.data.data;
                            body.innerHTML = '<form id="editProductForm" enctype="multipart/form-data">' +
                                '<div class="row g-3">' +
                                    '<div class="col-md-6">' +
                                        '<label class="form-label">Nombre</label>' +
                                        '<input type="text" class="form-control" name="nombre" id="epNombre" value="' + (p.nombre || '') + '" required />' +
                                    '</div>' +
                                    '<div class="col-md-6">' +
                                        '<label class="form-label">Precio base</label>' +
                                        '<input type="number" class="form-control" name="precioBase" id="epPrecio" min="0" step="0.01" value="' + (p.precioBase || 0) + '" required />' +
                                    '</div>' +
                                    '<div class="col-md-12">' +
                                        '<label class="form-label">Descripción</label>' +
                                        '<textarea class="form-control" name="descripcion" id="epDescripcion" rows="2" required>' + (p.descripcion || '') + '</textarea>' +
                                    '</div>' +
                                    '<div class="col-md-4">' +
                                        '<label class="form-label">Stock</label>' +
                                        '<input type="number" class="form-control" name="stock" id="epStock" min="0" value="' + (p.stock || 0) + '" required />' +
                                    '</div>' +
                                    '<div class="col-md-4">' +
                                        '<label class="form-label">Disponibilidad</label>' +
                                        '<select class="form-select" name="disponibilidad" id="epDisponibilidad">' +
                                            '<option value="true"' + (p.disponibilidad ? ' selected' : '') + '>Disponible</option>' +
                                            '<option value="false"' + (!p.disponibilidad ? ' selected' : '') + '>No disponible</option>' +
                                        '</select>' +
                                    '</div>' +
                                    '<div class="col-md-4">' +
                                        '<label class="form-label">Etiquetas</label>' +
                                        '<input type="text" class="form-control" name="etiquetas" id="epEtiquetas" value="' + (Array.isArray(p.etiquetas) ? p.etiquetas.join(', ') : '') + '" placeholder="Separadas por coma" />' +
                                    '</div>' +
                                    '<div class="col-md-6">' +
                                        '<label class="form-label">Imágenes</label>' +
                                        '<input type="file" class="form-control" name="imagenes" id="epImagenes" accept="image/*" multiple />' +
                                        '<div class="mt-2">' +
                                            (Array.isArray(p.imagenes) && p.imagenes.length ? p.imagenes.map(img => '<span class="badge bg-secondary me-1">' + img + '</span>').join('') : '<span class="text-muted">Sin imágenes</span>') +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="col-md-6">' +
                                        '<label class="form-label">Ficha técnica (PDF)</label>' +
                                        '<input type="file" class="form-control" name="fichaTecnica" id="epFichaTecnica" accept="application/pdf" />' +
                                        '<div class="mt-2">' +
                                            (p.fichaTecnica ? '<span class="badge bg-danger"><i class="fas fa-file-pdf me-1"></i>' + p.fichaTecnica + '</span>' : '<span class="text-muted">Sin ficha</span>') +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="col-md-12">' +
                                        '<label class="form-label">Variantes (JSON)</label>' +
                                        '<textarea class="form-control" name="variantes" id="epVariantes" rows="2" placeholder=\'[{"atributo":"color","valor":"verde","precio":10,"stock":5}]\'>' + (Array.isArray(p.variantes) ? JSON.stringify(p.variantes) : '') + '</textarea>' +
                                    '</div>' +
                                '</div>' +
                            '</form>';
                            // Registrar evento submit para edición
                            const editForm = document.getElementById('editProductForm');
                            if (editForm) {
                                editForm.addEventListener('submit', async function(e) {
                                    e.preventDefault();
                                    const formData = new FormData(editForm);
                                    // Etiquetas como array
                                    if (formData.get('etiquetas')) {
                                        formData.set('etiquetas', formData.get('etiquetas').split(',').map(t => t.trim()).filter(Boolean));
                                    }
                                    // Variantes como array
                                    if (formData.get('variantes')) {
                                        try {
                                            formData.set('variantes', JSON.stringify(JSON.parse(formData.get('variantes'))));
                                        } catch {}
                                    }
                                    try {
                                        const res = await API.put(`/api/products/edit/${productId}`, formData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                        if (res.data.ok || res.data.success) {
                                            alert('Producto actualizado correctamente');
                                            modal.hide();
                                            loadProducts();
                                        } else {
                                            alert(res.data.message || 'Error al actualizar producto');
                                        }
                                    } catch (err) {
                                        alert('Error al actualizar producto');
                                    }
                                });
                            }
                        }
                    } catch (err) {
                        body.innerHTML = '<div class="alert alert-danger">Error al cargar datos del producto</div>';
                    }
                    modal.show();
                };
            }, 100);
        }

        // Función para mostrar modal de cambio de rol
        function showChangeRoleModal(userId, username, currentRole) {
            document.getElementById('userToChange').textContent = username;
            document.getElementById('newRole').value = currentRole;
            window.currentUserId = userId;

            const modal = new bootstrap.Modal(document.getElementById('changeRoleModal'));
            modal.show();
        }

        // Función para cambiar rol de usuario
        async function changeUserRole() {
            const newRole = document.getElementById('newRole').value;

            try {
                const res = await API.put(`/api/admin/users/${window.currentUserId}/role`, { role: newRole });
                if (res.data.success) {
                    bootstrap.Modal.getInstance(document.getElementById('changeRoleModal')).hide();
                    loadUsers();
                    loadDashboard(); // Recargar estadísticas
                    alert('Rol actualizado correctamente');
                } else {
                    alert(res.data.message || 'Error al cambiar rol');
                }
            } catch (err) {
                console.error('Error changing role:', err);
                alert('Error al cambiar rol');
            }
        }

        // Función para mostrar modal de eliminación de usuario
        function showDeleteUserModal(userId, username) {
            document.getElementById('userToDelete').textContent = username;
            window.currentUserId = userId;

            const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
            modal.show();
        }

        // Función para eliminar usuario
        async function deleteUser() {
            try {
                const res = await API.delete(`/api/admin/users/${window.currentUserId}`);
                if (res.data.success) {
                    bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
                    loadUsers();
                    loadDashboard(); // Recargar estadísticas
                    alert('Usuario eliminado correctamente');
                } else {
                    alert(res.data.message || 'Error al eliminar usuario');
                }
            } catch (err) {
                console.error('Error deleting user:', err);
                alert('Error al eliminar usuario');
            }
        }

        // Función para mostrar modal de cambio de disponibilidad de producto
        function showToggleProductModal(productId, productName, currentAvailability) {
            const action = currentAvailability ? 'desactivar' : 'activar';
            document.getElementById('productToggleMessage').innerHTML = `¿Estás seguro de que quieres <strong>${action}</strong> el producto "<strong>${productName}</strong>"?`;
            window.currentProductId = productId;
            window.newAvailability = !currentAvailability;

            // Asegurarse de que el botón de confirmar esté vinculado correctamente
            const confirmBtn = document.getElementById('confirmToggleProductBtn');
            if (confirmBtn) {
                confirmBtn.onclick = async function() {
                    await toggleProductAvailability();
                };
            }

            const modal = new bootstrap.Modal(document.getElementById('toggleProductModal'));
            modal.show();
        }

        // Función para cambiar disponibilidad de producto
        async function toggleProductAvailability() {
            try {
                const res = await API.patch(`/api/admin/products/${window.currentProductId}/availability`, {});
                if (res.data.success) {
                    bootstrap.Modal.getInstance(document.getElementById('toggleProductModal')).hide();
                    loadProducts();
                    loadDashboard(); // Recargar estadísticas
                    alert(res.data.message);
                } else {
                    alert(res.data.message || 'Error al cambiar disponibilidad');
                }
            } catch (err) {
                console.error('Error toggling product availability:', err);
                alert('Error al cambiar disponibilidad');
            }
        }

        // Función para logout
        async function logout() {
            try {
                await API.get('/api/auth/logout');
                window.location.replace('/login');
            } catch (err) {
                console.error('Error en logout:', err);
                window.location.replace('/login');
            }
        }

        // Cargar información del admin
        async function loadAdminInfo() {
            try {
                const res = await API.get('/api/auth/profile');
                if (res.data.success) {
                    document.getElementById('adminEmail').textContent = res.data.user.email;
                }
            } catch (err) {
                console.error('Error loading admin info:', err);
            }
        }

        // Cargar info del admin al inicio
        loadAdminInfo();

        window.showToggleProductModal = showToggleProductModal;
        window.toggleProductAvailability = toggleProductAvailability;
        window.showChangeRoleModal = showChangeRoleModal;
        window.changeUserRole = changeUserRole;
        window.showDeleteUserModal = showDeleteUserModal;
        window.deleteUser = deleteUser;
