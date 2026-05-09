const API = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', function () {

    // ── Verificar sesión y tipo Admin ──────────────────────
    const usuarioSesion = sessionStorage.getItem('usuarioFET');
    if (!usuarioSesion) {
        window.location.href = '/inicio_de_usuario_y_registro/index.html';
        return;
    }
    const usuario = JSON.parse(usuarioSesion);
    if (usuario.tipo !== 'Admin') {
        alert('Acceso restringido al administrador.');
        sessionStorage.removeItem('usuarioFET');
        window.location.href = '/inicio_de_usuario_y_registro/index.html';
        return;
    }

    // Mostrar nombre del admin
    const adminNombre = document.querySelector('.sidebar-header h2');
    if (adminNombre) adminNombre.textContent = usuario.nombre;

    // ── Helper fetch autenticado ───────────────────────────
    function fetchAdmin(url, options = {}) {
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Id': usuario.id,
                ...(options.headers || {})
            }
        });
    }

    // ── Variables de estado inventario ────────────────────
    let inventarioEditandoId = null;

    // ── Variables de estado solicitudes ──────────────────
    let solicitudRechazandoId = null;

    // ── DOM general ──────────────────────────────────────
    const sidebar    = document.getElementById('sidebar');
    const overlay    = document.getElementById('overlay');
    const menuToggle = document.getElementById('menuToggle');
    const navItems   = document.querySelectorAll('.nav-item');
    const sections   = document.querySelectorAll('.content-section');
    const logoutBtn  = document.getElementById('logoutBtn');

    // ── Carga inicial ─────────────────────────────────────
    cargarDashboard();
    cargarUsuarios();
    actualizarBadgeSolicitudes();

    // Refresca el badge cada 60 segundos
    setInterval(actualizarBadgeSolicitudes, 60000);

    // ── Navegación sidebar ────────────────────────────────
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('data-section');

            navItems.forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            sections.forEach(s => {
                s.classList.remove('active');
                if (s.id === target) s.classList.add('active');
            });

            if (window.innerWidth <= 968) cerrarSidebar();

            switch (target) {
                case 'dashboard':   cargarDashboard();   break;
                case 'usuarios':    cargarUsuarios();     break;
                case 'solicitudes': cargarSolicitudes();  break;
                case 'inventario':  cargarInventario();   break;
            }
        });
    });

    // Toggle menú móvil
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', cerrarSidebar);

    // Cerrar sesión
    logoutBtn.addEventListener('click', e => {
        e.preventDefault();
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            sessionStorage.removeItem('usuarioFET');
            window.location.href = '/inicio_de_usuario_y_registro/index.html';
        }
    });

    // Búsqueda y filtros usuarios
    document.getElementById('searchUsuario').addEventListener('input', cargarUsuarios);
    document.getElementById('filterTipo').addEventListener('change', cargarUsuarios);

    // ══════════════════════════════════════════════════════
    //  DASHBOARD
    // ══════════════════════════════════════════════════════
    async function cargarDashboard() {
        try {
            const res      = await fetchAdmin(`${API}/usuarios`);
            const respuesta = await res.json();
            const usuarios  = respuesta.usuarios || [];

            document.getElementById('totalUsuarios').textContent = usuarios.length;

            // Préstamos activos (solicitudes aprobadas)
            try {
                const resSol = await fetchAdmin(`${API}/solicitudes`);
                const dataSol = await resSol.json();
                const todas = dataSol.solicitudes || [];
                const activos = todas.filter(s => s.estado === 'Aprobada').length;
                document.getElementById('prestamosActivos').textContent = activos;
            } catch (_) {}

            const activityList = document.getElementById('recentActivity');
            if (usuarios.length === 0) {
                activityList.innerHTML = '<p class="no-data">No hay actividad reciente</p>';
                return;
            }
            activityList.innerHTML = usuarios.slice(0, 5).map(u => `
                <div class="activity-item">
                    <i class="fas fa-user-circle"></i>
                    <div>
                        <strong>${u.nombre}</strong> se registró como ${u.tipo}
                        <br><small>${u.programa}</small>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error cargando dashboard:', err);
        }
    }

    // ══════════════════════════════════════════════════════
    //  USUARIOS
    // ══════════════════════════════════════════════════════
    async function cargarUsuarios() {
        try {
            const res       = await fetchAdmin(`${API}/usuarios`);
            const respuesta = await res.json();
            let usuarios    = respuesta.usuarios || [];

            const searchTerm = document.getElementById('searchUsuario').value.toLowerCase();
            const filterTipo = document.getElementById('filterTipo').value;

            if (searchTerm) {
                usuarios = usuarios.filter(u =>
                    u.nombre.toLowerCase().includes(searchTerm) ||
                    u.programa.toLowerCase().includes(searchTerm)
                );
            }
            if (filterTipo) {
                usuarios = usuarios.filter(u => u.tipo === filterTipo);
            }

            const tbody = document.getElementById('usuariosTableBody');
            if (usuarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="no-data">No se encontraron usuarios</td></tr>';
                return;
            }
            tbody.innerHTML = usuarios.map(u => `
                <tr>
                    <td>${u.nombre}</td>
                    <td>${u.programa}</td>
                    <td><span class="badge">${u.tipo}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-delete" onclick="eliminarUsuario(${u.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Error cargando usuarios:', err);
            document.getElementById('usuariosTableBody').innerHTML =
                '<tr><td colspan="5" class="no-data">Error conectando con el servidor</td></tr>';
        }
    }

    window.eliminarUsuario = async function (id) {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            const res = await fetchAdmin(`${API}/usuarios/${id}`, { method: 'DELETE' });
            const respuesta = await res.json();
            if (res.ok) {
                cargarUsuarios();
                cargarDashboard();
            } else {
                alert('Error al eliminar: ' + respuesta.mensaje);
            }
        } catch (err) {
            alert('Error de conexión con el servidor');
        }
    };

    // ══════════════════════════════════════════════════════
    //  SOLICITUDES
    // ══════════════════════════════════════════════════════

    // Badge en sidebar (pendientes)
    async function actualizarBadgeSolicitudes() {
        try {
            const res  = await fetchAdmin(`${API}/solicitudes`);
            const data = await res.json();
            const todas = data.solicitudes || [];
            const pendientes = todas.filter(s => s.estado === 'Pendiente').length;

            const badge = document.getElementById('badgeSolicitudes');
            const tabBadge = document.getElementById('tabBadgePendientes');

            if (pendientes > 0) {
                badge.style.display = 'inline-block';
                badge.textContent   = pendientes;
            } else {
                badge.style.display = 'none';
            }
            if (tabBadge) tabBadge.textContent = pendientes;
        } catch (err) {
            console.error('Error actualizando badge solicitudes:', err);
        }
    }

    async function cargarSolicitudes() {
        try {
            const res  = await fetchAdmin(`${API}/solicitudes`);
            const data = await res.json();
            const todas = data.solicitudes || [];

            const pendientes = todas.filter(s => s.estado === 'Pendiente');
            const aprobadas  = todas.filter(s => s.estado === 'Aprobada');

            renderFilaSolicitudes('tbodyPendientes', pendientes, true,  false);
            renderFilaSolicitudes('tbodyAprobadas',  aprobadas,  false, true);
            renderFilaSolicitudesTodas('tbodyTodas', todas);

            // Actualizar badge
            const badge = document.getElementById('badgeSolicitudes');
            const tabBadge = document.getElementById('tabBadgePendientes');
            if (pendientes.length > 0) {
                badge.style.display = 'inline-block';
                badge.textContent   = pendientes.length;
            } else {
                badge.style.display = 'none';
            }
            if (tabBadge) tabBadge.textContent = pendientes.length;

        } catch (err) {
            console.error('Error cargando solicitudes:', err);
        }
    }

    function renderFilaSolicitudes(tbodyId, lista, mostrarAprobarRechazar, mostrarDevuelto) {
        const tbody = document.getElementById(tbodyId);
        if (!lista.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="no-data">No hay solicitudes</td></tr>`;
            return;
        }
        tbody.innerHTML = lista.map(s => {
            let acciones = '';
            if (mostrarAprobarRechazar) {
                acciones = `
                    <button class="btn-aprobar" onclick="aprobarSolicitud(${s.id})">
                        <i class="fas fa-check"></i> Aprobar
                    </button>
                    <button class="btn-rechazar" onclick="abrirModalRechazo(${s.id})">
                        <i class="fas fa-times"></i> Rechazar
                    </button>`;
            }
            if (mostrarDevuelto) {
                acciones = `
                    <button class="btn-devuelto" onclick="devolverSolicitud(${s.id})">
                        <i class="fas fa-undo"></i> Devuelto
                    </button>`;
            }
            return `
                <tr>
                    <td>${s.usuario_nombre || s.usuario_id}</td>
                    <td>${s.elemento_nombre || s.inventario_id}</td>
                    <td>${s.cantidad}</td>
                    <td>${formatFecha(s.fecha_solicitud)}</td>
                    <td><div class="action-btns">${acciones}</div></td>
                </tr>`;
        }).join('');
    }

    function renderFilaSolicitudesTodas(tbodyId, lista) {
        const tbody = document.getElementById(tbodyId);
        if (!lista.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="no-data">No hay solicitudes</td></tr>`;
            return;
        }
        tbody.innerHTML = lista.map(s => `
            <tr>
                <td>${s.usuario_nombre || s.usuario_id}</td>
                <td>${s.elemento_nombre || s.inventario_id}</td>
                <td>${s.cantidad}</td>
                <td><span class="estado-badge estado-${(s.estado||'').toLowerCase().replace(' ','-')}">${s.estado}</span></td>
                <td>${formatFecha(s.fecha_solicitud)}</td>
            </tr>
        `).join('');
    }

    function formatFecha(fecha) {
        if (!fecha) return '—';
        const d = new Date(fecha);
        return isNaN(d) ? fecha : d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
    }

    // Aprobar
    window.aprobarSolicitud = async function (id) {
        if (!confirm('¿Aprobar esta solicitud?')) return;
        try {
            const res = await fetchAdmin(`${API}/solicitudes/${id}/aprobar`, { method: 'PUT' });
            const data = await res.json();
            if (res.ok) {
                mostrarToast('Solicitud aprobada', 'success');
                cargarSolicitudes();
                cargarDashboard();
            } else {
                mostrarToast(data.mensaje || 'Error al aprobar', 'error');
            }
        } catch (err) {
            mostrarToast('Error de conexión', 'error');
        }
    };

    // Abrir modal rechazo
    window.abrirModalRechazo = function (id) {
        solicitudRechazandoId = id;
        document.getElementById('motivoRechazo').value = '';
        document.getElementById('modalRechazo').classList.add('active');
    };

    document.getElementById('btnCancelRechazo').addEventListener('click', () => {
        document.getElementById('modalRechazo').classList.remove('active');
        solicitudRechazandoId = null;
    });

    document.getElementById('btnConfirmRechazo').addEventListener('click', async () => {
        const motivo = document.getElementById('motivoRechazo').value.trim();
        if (!motivo) {
            alert('Escribe un motivo antes de rechazar.');
            return;
        }
        try {
            const res = await fetchAdmin(`${API}/solicitudes/${solicitudRechazandoId}/rechazar`, {
                method: 'PUT',
                body: JSON.stringify({ motivo })
            });
            const data = await res.json();
            if (res.ok) {
                document.getElementById('modalRechazo').classList.remove('active');
                solicitudRechazandoId = null;
                mostrarToast('Solicitud rechazada', 'info');
                cargarSolicitudes();
            } else {
                mostrarToast(data.mensaje || 'Error al rechazar', 'error');
            }
        } catch (err) {
            mostrarToast('Error de conexión', 'error');
        }
    });

    // Devolver
    window.devolverSolicitud = async function (id) {
        if (!confirm('¿Marcar como devuelto?')) return;
        try {
            const res = await fetchAdmin(`${API}/solicitudes/${id}/devolver`, { method: 'PUT' });
            const data = await res.json();
            if (res.ok) {
                mostrarToast('Elemento marcado como devuelto', 'success');
                cargarSolicitudes();
                cargarDashboard();
            } else {
                mostrarToast(data.mensaje || 'Error al marcar devolución', 'error');
            }
        } catch (err) {
            mostrarToast('Error de conexión', 'error');
        }
    };

    // Tabs de solicitudes
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const tab = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-sol-content').forEach(c => c.classList.remove('active'));
            document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
        });
    });

    // ══════════════════════════════════════════════════════
    //  INVENTARIO
    // ══════════════════════════════════════════════════════
    async function cargarInventario() {
        const grid = document.getElementById('inventoryGrid');
        grid.innerHTML = '<p class="no-data">Cargando inventario...</p>';
        try {
            const res  = await fetchAdmin(`${API}/inventario`);
            const data = await res.json();
            const items = data.inventario || data || [];

            if (!items.length) {
                grid.innerHTML = '<p class="no-data">No hay elementos en el inventario</p>';
                return;
            }

            grid.innerHTML = items.map(item => `
                <div class="inventory-card">
                    <div class="inv-header">
                        <h3>${item.nombre}</h3>
                        <span class="inv-category">${item.categoria}</span>
                    </div>
                    <div class="inv-details">
                        <p><strong>Cantidad:</strong> ${item.cantidad}</p>
                        <p><strong>Estado:</strong>
                            <span class="estado-badge estado-${(item.estado||'').toLowerCase().replace(' ','-')}">
                                ${item.estado}
                            </span>
                        </p>
                    </div>
                    <div class="action-btns" style="margin-top:15px">
                        <button class="btn-edit" onclick="editarInventario(${item.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="eliminarInventario(${item.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error cargando inventario:', err);
            grid.innerHTML = '<p class="no-data">Error conectando con el servidor</p>';
        }
    }

    // Abrir modal agregar
    document.getElementById('btnAddInventario').addEventListener('click', () => {
        inventarioEditandoId = null;
        document.getElementById('modalTitle').textContent = 'Agregar Elemento';
        document.getElementById('formInventario').reset();
        document.getElementById('modalInventario').classList.add('active');
    });

    // Cancelar modal inventario
    document.getElementById('btnCancelModal').addEventListener('click', () => {
        document.getElementById('modalInventario').classList.remove('active');
        inventarioEditandoId = null;
    });

    // Guardar inventario (crear o editar)
    document.getElementById('formInventario').addEventListener('submit', async function (e) {
        e.preventDefault();
        const payload = {
            nombre:    document.getElementById('invNombre').value.trim(),
            categoria: document.getElementById('invCategoria').value,
            cantidad:  parseInt(document.getElementById('invCantidad').value),
            estado:    document.getElementById('invEstado').value
        };

        try {
            let res;
            if (inventarioEditandoId) {
                res = await fetchAdmin(`${API}/inventario/${inventarioEditandoId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetchAdmin(`${API}/inventario`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }
            const data = await res.json();
            if (res.ok) {
                document.getElementById('modalInventario').classList.remove('active');
                inventarioEditandoId = null;
                mostrarToast(inventarioEditandoId ? 'Elemento actualizado' : 'Elemento agregado', 'success');
                cargarInventario();
            } else {
                mostrarToast(data.mensaje || 'Error al guardar', 'error');
            }
        } catch (err) {
            mostrarToast('Error de conexión', 'error');
        }
    });

    // Editar inventario
    window.editarInventario = async function (id) {
        try {
            const res  = await fetchAdmin(`${API}/inventario`);
            const data = await res.json();
            const items = data.inventario || data || [];
            const item  = items.find(i => i.id === id);
            if (!item) return;

            inventarioEditandoId = id;
            document.getElementById('modalTitle').textContent = 'Editar Elemento';
            document.getElementById('invNombre').value    = item.nombre;
            document.getElementById('invCategoria').value = item.categoria;
            document.getElementById('invCantidad').value  = item.cantidad;
            document.getElementById('invEstado').value    = item.estado;
            document.getElementById('modalInventario').classList.add('active');
        } catch (err) {
            mostrarToast('Error cargando el elemento', 'error');
        }
    };

    // Eliminar inventario
    window.eliminarInventario = async function (id) {
        if (!confirm('¿Eliminar este elemento del inventario?')) return;
        try {
            const res  = await fetchAdmin(`${API}/inventario/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                mostrarToast('Elemento eliminado', 'success');
                cargarInventario();
            } else {
                mostrarToast(data.mensaje || 'Error al eliminar', 'error');
            }
        } catch (err) {
            mostrarToast('Error de conexión', 'error');
        }
    };

    // ── Tabs registros deportivos ──────────────────────────
    document.querySelectorAll('[data-deporte]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-deporte]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const dep = this.getAttribute('data-deporte');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('tab' + dep.charAt(0).toUpperCase() + dep.slice(1)).classList.add('active');
        });
    });

    // ── Utilidades ─────────────────────────────────────────
    function cerrarSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    // Toast de notificación
    function mostrarToast(mensaje, tipo = 'success') {
        const colores = { success: '#228b22', error: '#d32f2f', info: '#1976d2' };
        const toast = document.createElement('div');
        toast.style.cssText = `
            position:fixed; bottom:30px; right:30px; z-index:9999;
            background:${colores[tipo] || colores.success}; color:#fff;
            padding:14px 22px; border-radius:10px;
            font-size:0.95em; font-weight:500;
            box-shadow:0 4px 20px rgba(0,0,0,0.2);
            animation: slideInToast 0.3s ease;
        `;
        toast.textContent = mensaje;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.4s'; }, 2500);
        setTimeout(() => toast.remove(), 3000);
    }

    // Estilos inyectados
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInToast {
            from { transform: translateX(100px); opacity: 0; }
            to   { transform: translateX(0);     opacity: 1; }
        }
        .activity-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
            transition: background 0.3s;
        }
        .activity-item:hover { background: var(--verde-claro); }
        .activity-item i { font-size: 1.5em; color: var(--verde-principal); }
        .badge {
            background: var(--verde-claro);
            color: var(--verde-principal);
            padding: 3px 10px;
            border-radius: 15px;
            font-size: 0.85em;
        }
        /* Badge en sidebar */
        .badge-nav {
            background: #d32f2f;
            color: #fff;
            border-radius: 50%;
            font-size: 0.72em;
            font-weight: 700;
            min-width: 20px;
            height: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-left: auto;
            padding: 0 5px;
        }
        /* Badge en tab */
        .badge-tab {
            background: #d32f2f;
            color: #fff;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 700;
            padding: 2px 7px;
            margin-left: 6px;
        }
        /* Botones solicitudes */
        .btn-aprobar {
            background: var(--verde-principal);
            color: #fff;
            border: none;
            padding: 7px 14px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85em;
            transition: background 0.2s;
            display:flex; align-items:center; gap:5px;
        }
        .btn-aprobar:hover { background: var(--verde-oscuro); }
        .btn-rechazar {
            background: var(--rojo-error);
            color: #fff;
            border: none;
            padding: 7px 14px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85em;
            transition: background 0.2s;
            display:flex; align-items:center; gap:5px;
        }
        .btn-rechazar:hover { background: #b71c1c; }
        .btn-devuelto {
            background: var(--azul);
            color: #fff;
            border: none;
            padding: 7px 14px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85em;
            transition: background 0.2s;
            display:flex; align-items:center; gap:5px;
        }
        .btn-devuelto:hover { background: #1565c0; }
        /* Estados */
        .estado-badge {
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.82em;
            font-weight: 600;
        }
        .estado-pendiente  { background: #fff3e0; color: #f57c00; }
        .estado-aprobada   { background: #e8f5e9; color: #228b22; }
        .estado-rechazada  { background: #fce4ec; color: #d32f2f; }
        .estado-devuelta   { background: #e3f2fd; color: #1976d2; }
        .estado-disponible { background: #e8f5e9; color: #228b22; }
        .estado-en-préstamo{ background: #fff3e0; color: #f57c00; }
        .estado-mantenimiento { background: #fce4ec; color: #d32f2f; }
        /* Tabs solicitudes */
        .tab-sol-content { display: none; }
        .tab-sol-content.active { display: block; }
    `;
    document.head.appendChild(style);
});