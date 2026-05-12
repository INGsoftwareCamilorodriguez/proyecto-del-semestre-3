const API = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', function () {

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

    const adminNombre = document.querySelector('.sidebar-header h2');
    if (adminNombre) adminNombre.textContent = usuario.nombre;

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

    let inventarioEditandoId  = null;
    let categoriaTabActiva    = 'Fútbol';
    let solicitudRechazandoId = null;

    const sidebar    = document.getElementById('sidebar');
    const overlay    = document.getElementById('overlay');
    const menuToggle = document.getElementById('menuToggle');
    const navItems   = document.querySelectorAll('.nav-item');
    const sections   = document.querySelectorAll('.content-section');
    const logoutBtn  = document.getElementById('logoutBtn');

    cargarDashboard();
    cargarUsuarios();
    actualizarBadgeSolicitudes();
    setInterval(actualizarBadgeSolicitudes, 60000);

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
                case 'dashboard':   cargarDashboard();           break;
                case 'usuarios':    cargarUsuarios();             break;
                case 'solicitudes': cargarSolicitudes();          break;
                case 'registros':   cargarRegistrosDeportivos();  break;
                case 'inventario':  cargarInventarioPorTab();     break;
                case 'reportes':    cargarReportes();             break;
            }
        });
    });

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', cerrarSidebar);

    logoutBtn.addEventListener('click', e => {
        e.preventDefault();
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            sessionStorage.removeItem('usuarioFET');
            window.location.href = '/inicio_de_usuario_y_registro/index.html';
        }
    });

    document.getElementById('searchUsuario').addEventListener('input', cargarUsuarios);
    document.getElementById('filterTipo').addEventListener('change', cargarUsuarios);


    //  DASHBOARD
    async function cargarDashboard() {
        try {
            const resU    = await fetchAdmin(`${API}/usuarios?todos=true`);
            const dataU   = await resU.json();
            const usuarios = dataU.usuarios || [];

            const activos     = usuarios.filter(u => u.activo == 1).length;
            const inactivos   = usuarios.filter(u => u.activo == 0).length;
            const estudiantes = usuarios.filter(u => u.tipo === 'Estudiante').length;
            const docentes    = usuarios.filter(u => u.tipo === 'Docente').length;

            setDashStat('dashActivos',     activos);
            setDashStat('dashInactivos',   inactivos);
            setDashStat('dashEstudiantes', estudiantes);
            setDashStat('dashDocentes',    docentes);

            // Actividad reciente — últimas solicitudes
            try {
                const resSol  = await fetchAdmin(`${API}/solicitudes`);
                const dataSol = await resSol.json();
                const todas   = dataSol.solicitudes || [];
                const activityList = document.getElementById('recentActivity');
                const recientes = [...todas].sort((a,b) =>
                    new Date(b.fecha_solicitud) - new Date(a.fecha_solicitud)
                ).slice(0, 6);

                if (recientes.length === 0) {
                    activityList.innerHTML = '<p class="no-data">No hay actividad reciente</p>';
                } else {
                    activityList.innerHTML = recientes.map(s => {
                        const iconMap = {
                            'Pendiente': { icon: '⏳', cls: 'act-pendiente' },
                            'Aprobado':  { icon: '✅', cls: 'act-aprobado'  },
                            'Rechazado': { icon: '❌', cls: 'act-rechazado' },
                            'Devuelto':  { icon: '↩️', cls: 'act-devuelto'  }
                        };
                        const meta = iconMap[s.estado] || { icon: '📋', cls: '' };
                        return `
                        <div class="activity-item ${meta.cls}">
                            <span class="act-icon">${meta.icon}</span>
                            <div class="act-body">
                                <strong>${s.usuario_nombre || 'Usuario'}</strong>
                                solicitó <em>${s.elemento_nombre || 'elemento'}</em>
                                <span class="estado-badge estado-${(s.estado||'').toLowerCase()}">${s.estado}</span>
                                <br><small>${formatFecha(s.fecha_solicitud)}</small>
                            </div>
                        </div>`;
                    }).join('');
                }
            } catch (_) {}

        } catch (err) {
            console.error('Error cargando dashboard:', err);
        }
    }

    function setDashStat(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // ══════════════════════════════════════════════════════
    //  USUARIOS
    // ══════════════════════════════════════════════════════
    async function cargarUsuarios() {
        try {
            const res       = await fetchAdmin(`${API}/usuarios?todos=true`);
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
                <tr style="${u.activo == 0 ? 'opacity:0.6;background:#fafafa;' : ''}">
                    <td>${u.nombre}</td>
                    <td>${u.programa}</td>
                    <td><span class="badge">${u.tipo}</span></td>
                    <td>
                        <span class="estado-badge ${u.activo == 1 ? 'estado-aprobado' : 'estado-rechazado'}">
                            ${u.activo == 1 ? '● Activo' : '● Inactivo'}
                        </span>
                    </td>
                    <td>
                        <div class="gear-wrapper">
                            <button class="btn-gear" onclick="toggleGearMenu(event, ${u.id})" title="Acciones">
                                ⚙️
                            </button>
                            <div class="gear-menu" id="gearMenu_${u.id}">
                                ${u.activo == 1
                                    ? `<button class="gear-item gear-danger" onclick="desactivarUsuario(${u.id})">
                                            🚫 Desactivar usuario
                                       </button>`
                                    : `<button class="gear-item gear-success" onclick="reactivarUsuario(${u.id})">
                                            ✅ Reactivar usuario
                                       </button>`
                                }
                            </div>
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

    // Cerrar menús de engranaje al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.gear-wrapper')) {
            document.querySelectorAll('.gear-menu.open').forEach(m => m.classList.remove('open'));
        }
    });

    window.toggleGearMenu = function(e, id) {
        e.stopPropagation();
        const menu = document.getElementById('gearMenu_' + id);
        const wasOpen = menu.classList.contains('open');
        document.querySelectorAll('.gear-menu.open').forEach(m => m.classList.remove('open'));
        if (!wasOpen) menu.classList.add('open');
    };

    // ── DESACTIVAR usuario (activo → inactivo) ──────────
    window.desactivarUsuario = async function (id) {
        if (!confirm('¿Desactivar este usuario? No podrá iniciar sesión.')) return;
        try {
            const res = await fetchAdmin(`${API}/usuarios/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                mostrarToast('Usuario desactivado', 'info');
                cargarUsuarios();
                cargarDashboard();
            } else {
                mostrarToast(data.mensaje || 'Error al desactivar', 'error');
            }
        } catch (err) {
            mostrarToast('Error de conexión con el servidor', 'error');
        }
    };

    // ── REACTIVAR usuario (inactivo → activo) ───────────
    window.reactivarUsuario = async function (id) {
        if (!confirm('¿Reactivar este usuario?')) return;
        try {
            const res       = await fetchAdmin(`${API}/usuarios/${id}/reactivar`, { method: 'PUT' });
            const respuesta = await res.json();
            if (res.ok) {
                mostrarToast('Usuario reactivado', 'success');
                cargarUsuarios();
                cargarDashboard();
            } else {
                mostrarToast('Error: ' + respuesta.mensaje, 'error');
            }
        } catch (err) {
            mostrarToast('Error de conexión con el servidor', 'error');
        }
    };

    // ── Modal Agregar Usuario ─────────────────────────────
    if (!document.getElementById('modalCrearUsuario')) {
        document.body.insertAdjacentHTML('beforeend', `
        <div class="modal" id="modalCrearUsuario">
            <div class="modal-content">
                <h3>Agregar Usuario</h3>
                <div id="errorCrearUsuario" style="display:none;background:#fce4ec;color:#d32f2f;
                    padding:10px;border-radius:8px;margin:10px 0;font-size:0.9em"></div>
                <div class="form-group">
                    <label>Nombre completo</label>
                    <input type="text" id="cuNombre" placeholder="Nombre completo">
                </div>
                <div class="form-group">
                    <label>Programa académico</label>
                    <input type="text" id="cuPrograma" placeholder="Ej: Ingeniería de Software">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Código / Identificación</label>
                        <input type="text" id="cuCodigo" placeholder="C.C 12345678">
                    </div>
                    <div class="form-group">
                        <label>Tipo de usuario</label>
                        <select id="cuTipo">
                            <option value="Estudiante">Estudiante</option>
                            <option value="Docente">Docente</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Correo electrónico</label>
                    <input type="email" id="cuCorreo" placeholder="correo@ejemplo.com">
                </div>
                <div class="form-group">
                    <label>Contraseña</label>
                    <input type="password" id="cuContrasena" placeholder="Mín. 8 caracteres, 1 número, 1 especial">
                </div>
                <div class="modal-actions">
                    <button class="btn-save" id="btnConfirmCrearUsuario"> Crear Usuario</button>
                    <button class="btn-cancel" id="btnCancelCrearUsuario">Cancelar</button>
                </div>
            </div>
        </div>`);
    }

    const secHeader = document.querySelector('#usuarios .section-header');
    if (secHeader && !document.getElementById('btnAddUsuario')) {
        const btn = document.createElement('button');
        btn.className = 'btn-add';
        btn.id = 'btnAddUsuario';
        btn.innerHTML = ' Agregar Usuario';
        secHeader.appendChild(btn);
    }

    document.addEventListener('click', function (e) {
        if (e.target.closest('#btnAddUsuario')) {
            document.getElementById('errorCrearUsuario').style.display = 'none';
            ['cuNombre','cuPrograma','cuCodigo','cuCorreo','cuContrasena'].forEach(id =>
                document.getElementById(id).value = ''
            );
            document.getElementById('cuTipo').value = 'Estudiante';
            document.getElementById('modalCrearUsuario').classList.add('active');
        }
    });

    document.getElementById('btnCancelCrearUsuario').addEventListener('click', () => {
        document.getElementById('modalCrearUsuario').classList.remove('active');
    });

    document.getElementById('btnConfirmCrearUsuario').addEventListener('click', async () => {
        const errorBox = document.getElementById('errorCrearUsuario');
        errorBox.style.display = 'none';
        const payload = {
            nombre:     document.getElementById('cuNombre').value.trim(),
            programa:   document.getElementById('cuPrograma').value.trim(),
            codigo:     document.getElementById('cuCodigo').value.trim(),
            correo:     document.getElementById('cuCorreo').value.trim(),
            contrasena: document.getElementById('cuContrasena').value,
            tipo:       document.getElementById('cuTipo').value
        };
        try {
            const res  = await fetchAdmin(`${API}/usuarios/crear`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                document.getElementById('modalCrearUsuario').classList.remove('active');
                mostrarToast('Usuario creado exitosamente', 'success');
                cargarUsuarios();
                cargarDashboard();
            } else {
                let msg = data.mensaje || '';
                if (data.errores) msg = Object.values(data.errores).join(' · ');
                errorBox.textContent = msg || 'Error al crear usuario';
                errorBox.style.display = 'block';
            }
        } catch (err) {
            errorBox.textContent = 'Error de conexión con el servidor';
            errorBox.style.display = 'block';
        }
    });

    // ══════════════════════════════════════════════════════
    //  SOLICITUDES
    // ══════════════════════════════════════════════════════
    async function actualizarBadgeSolicitudes() {
        try {
            const res   = await fetchAdmin(`${API}/solicitudes`);
            const data  = await res.json();
            const todas = data.solicitudes || [];
            const pendientes = todas.filter(s => s.estado === 'Pendiente').length;
            const rechazadas = todas.filter(s => s.estado === 'Rechazado').length;
            const badge    = document.getElementById('badgeSolicitudes');
            const tabBadge = document.getElementById('tabBadgePendientes');
            const tabBadgeRechazadas = document.getElementById('tabBadgeRechazadas');
            if (pendientes > 0) {
                badge.style.display = 'inline-block';
                badge.textContent   = pendientes;
            } else {
                badge.style.display = 'none';
            }
            if (tabBadge) tabBadge.textContent = pendientes;
            if (tabBadgeRechazadas) {
                if (rechazadas > 0) {
                    tabBadgeRechazadas.style.display = 'inline-block';
                    tabBadgeRechazadas.textContent   = rechazadas;
                } else {
                    tabBadgeRechazadas.style.display = 'none';
                }
            }
        } catch (err) {
            console.error('Error actualizando badge solicitudes:', err);
        }
    }

    async function cargarSolicitudes() {
        try {
            const res   = await fetchAdmin(`${API}/solicitudes`);
            const data  = await res.json();
            const todas = data.solicitudes || [];
            const pendientes = todas.filter(s => s.estado === 'Pendiente');
            const aprobadas  = todas.filter(s => s.estado === 'Aprobado');
            const rechazadas = todas.filter(s => s.estado === 'Rechazado');
            renderFilaSolicitudes('tbodyPendientes', pendientes, true,  false);
            renderFilaSolicitudes('tbodyAprobadas',  aprobadas,  false, true);
            renderFilaRechazadas('tbodyRechazadas',  rechazadas);
            renderFilaSolicitudesTodas('tbodyTodas', todas);
            const badge    = document.getElementById('badgeSolicitudes');
            const tabBadge = document.getElementById('tabBadgePendientes');
            const tabBadgeRechazadas = document.getElementById('tabBadgeRechazadas');
            if (pendientes.length > 0) {
                badge.style.display = 'inline-block';
                badge.textContent   = pendientes.length;
            } else {
                badge.style.display = 'none';
            }
            if (tabBadge) tabBadge.textContent = pendientes.length;
            if (tabBadgeRechazadas) {
                if (rechazadas.length > 0) {
                    tabBadgeRechazadas.style.display = 'inline-block';
                    tabBadgeRechazadas.textContent   = rechazadas.length;
                } else {
                    tabBadgeRechazadas.style.display = 'none';
                }
            }
        } catch (err) {
            console.error('Error cargando solicitudes:', err);
        }
    }

    function renderFilaSolicitudes(tbodyId, lista, mostrarAprobarRechazar, mostrarDevuelto) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        if (!lista.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="no-data">No hay solicitudes</td></tr>`;
            return;
        }
        tbody.innerHTML = lista.map(s => {
            let acciones = '';
            if (mostrarAprobarRechazar) {
                acciones = `
                    <button class="btn-aprobar" onclick="aprobarSolicitud(${s.id})">✔ Aprobar</button>
                    <button class="btn-rechazar" onclick="abrirModalRechazo(${s.id})">✖ Rechazar</button>`;
            }
            if (mostrarDevuelto) {
                acciones = `
                    <button class="btn-devuelto" onclick="devolverSolicitud(${s.id})">↩ Devuelto</button>`;
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

    function renderFilaRechazadas(tbodyId, lista) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        if (!lista.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="no-data">No hay solicitudes rechazadas</td></tr>`;
            return;
        }
        tbody.innerHTML = lista.map(s => `
            <tr>
                <td>${s.usuario_nombre || s.usuario_id}</td>
                <td>${s.elemento_nombre || s.inventario_id}</td>
                <td>${s.cantidad}</td>
                <td>${formatFecha(s.fecha_solicitud)}</td>
                <td class="motivo-rechazo">${s.mensaje_admin || '<em style="color:#999">Sin motivo registrado</em>'}</td>
            </tr>
        `).join('');
    }

    function renderFilaSolicitudesTodas(tbodyId, lista) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        if (!lista.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="no-data">No hay solicitudes</td></tr>`;
            return;
        }
        tbody.innerHTML = lista.map(s => `
            <tr>
                <td>${s.usuario_nombre || s.usuario_id}</td>
                <td>${s.elemento_nombre || s.inventario_id}</td>
                <td>${s.cantidad}</td>
                <td><span class="estado-badge estado-${(s.estado||'').toLowerCase()}">${s.estado}</span></td>
                <td>${formatFecha(s.fecha_solicitud)}</td>
            </tr>
        `).join('');
    }

    function formatFecha(fecha) {
        if (!fecha) return '—';
        const d = new Date(fecha);
        return isNaN(d) ? fecha : d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
    }

    window.aprobarSolicitud = async function (id) {
        if (!confirm('¿Aprobar esta solicitud?')) return;
        try {
            const res  = await fetchAdmin(`${API}/solicitudes/${id}/aprobar`, { method: 'PUT' });
            const data = await res.json();
            if (res.ok) {
                mostrarToast('Solicitud aprobada', 'success');
                cargarSolicitudes(); cargarDashboard();
            } else {
                mostrarToast(data.mensaje || 'Error al aprobar', 'error');
            }
        } catch (err) { mostrarToast('Error de conexión', 'error'); }
    };

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
        if (!motivo) { alert('Escribe un motivo antes de rechazar.'); return; }
        try {
            const res = await fetchAdmin(`${API}/solicitudes/${solicitudRechazandoId}/rechazar`, {
                method: 'PUT',
                body: JSON.stringify({ mensaje: motivo })
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
        } catch (err) { mostrarToast('Error de conexión', 'error'); }
    });

    window.devolverSolicitud = async function (id) {
        if (!confirm('¿Marcar como devuelto?')) return;
        try {
            const res  = await fetchAdmin(`${API}/solicitudes/${id}/devolver`, { method: 'PUT' });
            const data = await res.json();
            if (res.ok) {
                mostrarToast('Elemento marcado como devuelto', 'success');
                cargarSolicitudes(); cargarDashboard();
            } else {
                mostrarToast(data.mensaje || 'Error al marcar devolución', 'error');
            }
        } catch (err) { mostrarToast('Error de conexión', 'error'); }
    };

    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const tab = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-sol-content').forEach(c => c.classList.remove('active'));
            const tabEl = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
            if (tabEl) tabEl.classList.add('active');
        });
    });

    // ══════════════════════════════════════════════════════
    //  REGISTROS DEPORTIVOS
    // ══════════════════════════════════════════════════════
    const DEPORTES_CATEGORIAS = {
        'futbol':     'Fútbol',
        'baloncesto': 'Baloncesto',
        'tenis':      'Tenis de Mesa',
        'voleibol':   'Voleibol'
    };

    async function cargarRegistrosDeportivos() {
        try {
            const res   = await fetchAdmin(`${API}/solicitudes`);
            const data  = await res.json();
            const todas = data.solicitudes || [];
            const aprobadas = todas.filter(s => s.estado === 'Aprobado');
            Object.entries(DEPORTES_CATEGORIAS).forEach(([clave, categoria]) => {
                const tbody = document.getElementById('tbodyReg' +
                    clave.charAt(0).toUpperCase() + clave.slice(1));
                if (!tbody) return;
                const filtradas = aprobadas.filter(s =>
                    (s.categoria || '').toLowerCase() === categoria.toLowerCase()
                );
                if (!filtradas.length) {
                    tbody.innerHTML = `<tr><td colspan="5" class="no-data">No hay registros de ${categoria}</td></tr>`;
                    return;
                }
                tbody.innerHTML = filtradas.map(s => `
                    <tr>
                        <td>${s.usuario_nombre || s.usuario_id}</td>
                        <td>${s.elemento_nombre || s.inventario_id}</td>
                        <td>${s.cantidad}</td>
                        <td>${formatFecha(s.fecha_solicitud)}</td>
                        <td>${formatFecha(s.fecha_respuesta)}</td>
                    </tr>
                `).join('');
            });
        } catch (err) {
            console.error('Error cargando registros deportivos:', err);
        }
    }

    document.querySelectorAll('[data-deporte]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-deporte]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const dep = this.getAttribute('data-deporte');
            document.querySelectorAll('.tab-dep-content').forEach(c => c.classList.remove('active'));
            const tabEl = document.getElementById('tabDep' +
                dep.charAt(0).toUpperCase() + dep.slice(1));
            if (tabEl) tabEl.classList.add('active');
        });
    });

    // ══════════════════════════════════════════════════════
    //  INVENTARIO
    // ══════════════════════════════════════════════════════
    async function cargarInventarioPorTab(categoria = null) {
        const cat = categoria || categoriaTabActiva;
        categoriaTabActiva = cat;
        const grid = document.getElementById('inventoryGrid');
        if (!grid) return;
        grid.innerHTML = '<p class="no-data">Cargando inventario...</p>';
        try {
            const res  = await fetchAdmin(`${API}/inventario?categoria=${encodeURIComponent(cat)}`);
            const data = await res.json();
            const items = data.inventario || data || [];
            if (!items.length) {
                grid.innerHTML = `<p class="no-data">No hay elementos en la categoría ${cat}</p>`;
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
                        <button class="btn-edit" onclick="editarInventario(${item.id})" title="Editar">✏️</button>
                        <button class="btn-delete" onclick="eliminarInventario(${item.id})" title="Eliminar">🗑️</button>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            grid.innerHTML = '<p class="no-data">Error conectando con el servidor</p>';
        }
    }

    document.querySelectorAll('[data-categoria]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-categoria]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            cargarInventarioPorTab(this.getAttribute('data-categoria'));
        });
    });

    document.getElementById('btnAddInventario').addEventListener('click', () => {
        inventarioEditandoId = null;
        document.getElementById('modalTitle').textContent = 'Agregar Elemento';
        document.getElementById('formInventario').reset();
        const selectCat = document.getElementById('invCategoria');
        selectCat.value    = categoriaTabActiva;
        selectCat.disabled = true;
        document.getElementById('modalInventario').classList.add('active');
    });

    document.getElementById('btnCancelModal').addEventListener('click', () => {
        document.getElementById('modalInventario').classList.remove('active');
        document.getElementById('invCategoria').disabled = false;
        inventarioEditandoId = null;
    });

    document.getElementById('formInventario').addEventListener('submit', async function (e) {
        e.preventDefault();
        const selectCat = document.getElementById('invCategoria');
        const payload = {
            nombre:    document.getElementById('invNombre').value.trim(),
            categoria: selectCat.value,
            cantidad:  parseInt(document.getElementById('invCantidad').value),
            estado:    document.getElementById('invEstado').value
        };
        selectCat.disabled = false;
        try {
            const esEdicion = inventarioEditandoId !== null;
            const res = esEdicion
                ? await fetchAdmin(`${API}/inventario/${inventarioEditandoId}`, { method: 'PUT', body: JSON.stringify(payload) })
                : await fetchAdmin(`${API}/inventario`, { method: 'POST', body: JSON.stringify(payload) });
            const data = await res.json();
            if (res.ok) {
                document.getElementById('modalInventario').classList.remove('active');
                inventarioEditandoId = null;
                mostrarToast(esEdicion ? 'Elemento actualizado' : 'Elemento agregado', 'success');
                cargarInventarioPorTab();
            } else {
                mostrarToast(data.mensaje || 'Error al guardar', 'error');
            }
        } catch (err) { mostrarToast('Error de conexión', 'error'); }
    });

    window.editarInventario = async function (id) {
        try {
            const res  = await fetchAdmin(`${API}/inventario`);
            const data = await res.json();
            const item  = (data.inventario || data || []).find(i => i.id === id);
            if (!item) return;
            inventarioEditandoId = id;
            document.getElementById('modalTitle').textContent   = 'Editar Elemento';
            document.getElementById('invNombre').value          = item.nombre;
            document.getElementById('invCategoria').value       = item.categoria;
            document.getElementById('invCategoria').disabled    = false;
            document.getElementById('invCantidad').value        = item.cantidad;
            document.getElementById('invEstado').value          = item.estado;
            document.getElementById('modalInventario').classList.add('active');
        } catch (err) { mostrarToast('Error cargando el elemento', 'error'); }
    };

    window.eliminarInventario = async function (id) {
        if (!confirm('¿Eliminar este elemento del inventario?')) return;
        try {
            const res  = await fetchAdmin(`${API}/inventario/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                mostrarToast('Elemento eliminado', 'success');
                cargarInventarioPorTab();
            } else {
                mostrarToast(data.mensaje || 'Error al eliminar', 'error');
            }
        } catch (err) { mostrarToast('Error de conexión', 'error'); }
    };

    // ══════════════════════════════════════════════════════
    //  REPORTES
    // ══════════════════════════════════════════════════════
    async function cargarReportes() {
        await Promise.all([
            cargarReporteUsuariosTipo(),
            cargarReporteDeportes(),
            cargarReporteMensual()
        ]);
    }

    async function cargarReporteUsuariosTipo() {
        try {
            const res  = await fetchAdmin(`${API}/reportes/usuarios-por-tipo`);
            const data = await res.json();
            if (!data.ok) return;
            const d = data.data;
            const total = (d.Estudiante || 0) + (d.Docente || 0) + (d.Visitante || 0) || 1;
            const barE = document.getElementById('barEstudiante');
            const barD = document.getElementById('barDocente');
            const barV = document.getElementById('barVisitante');
            if (barE) {
                barE.querySelector('.bar-value').textContent = d.Estudiante || 0;
                barE.style.width = Math.round((d.Estudiante / total) * 100) + '%';
            }
            if (barD) {
                barD.querySelector('.bar-value').textContent = d.Docente || 0;
                barD.style.width = Math.round((d.Docente / total) * 100) + '%';
            }
            if (barV) {
                barV.querySelector('.bar-value').textContent = d.Visitante || 0;
                barV.style.width = Math.round((d.Visitante / total) * 100) + '%';
            }
        } catch (err) { console.error('Error reportes tipo usuario:', err); }
    }

    async function cargarReporteDeportes() {
        try {
            const res  = await fetchAdmin(`${API}/reportes/solicitudes-por-categoria`);
            const data = await res.json();
            if (!data.ok) return;
            const d = data.data;
            const container = document.getElementById('chartDeportes');
            if (!container) return;
            const categorias = [
                { nombre: 'Fútbol',        valor: d['Fútbol']        || 0, color: '#228b22' },
                { nombre: 'Baloncesto',    valor: d['Baloncesto']    || 0, color: '#1976d2' },
                { nombre: 'Tenis de Mesa', valor: d['Tenis de Mesa'] || 0, color: '#f57c00' },
                { nombre: 'Voleibol',      valor: d['Voleibol']      || 0, color: '#7b1fa2' },
                { nombre: 'General',       valor: d['General']       || 0, color: '#455a64' }
            ];
            const maxVal = Math.max(...categorias.map(c => c.valor)) || 1;
            container.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:12px;width:100%">
                    ${categorias.map(c => `
                        <div style="display:flex;align-items:center;gap:10px">
                            <span style="width:110px;font-size:0.85em;color:#555">${c.nombre}</span>
                            <div style="flex:1;background:#f0f0f0;border-radius:6px;height:24px;overflow:hidden">
                                <div style="height:100%;width:${Math.round((c.valor/maxVal)*100)}%;
                                    background:${c.color};border-radius:6px;
                                    transition:width 0.6s ease;
                                    display:flex;align-items:center;justify-content:flex-end;padding-right:6px">
                                    ${c.valor > 0 ? `<span style="color:#fff;font-size:0.75em;font-weight:700">${c.valor}</span>` : ''}
                                </div>
                            </div>
                            <span style="width:28px;text-align:right;font-weight:700;font-size:0.9em;color:#333">${c.valor}</span>
                        </div>
                    `).join('')}
                </div>`;
        } catch (err) { console.error('Error reportes deportes:', err); }
    }

    async function cargarReporteMensual() {
        try {
            const res  = await fetchAdmin(`${API}/reportes/solicitudes-por-mes`);
            const data = await res.json();
            if (!data.ok) return;
            const meses   = data.data;
            const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            const maxVal  = Math.max(...meses) || 1;
            const container = document.getElementById('chartMensual');
            if (!container) return;
            container.innerHTML = `
                <div style="display:flex;align-items:flex-end;height:200px;gap:6px;justify-content:space-around">
                    ${meses.map((val, i) => `
                        <div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px">
                            <span style="font-size:0.72em;font-weight:700;color:#228b22">${val > 0 ? val : ''}</span>
                            <div style="
                                width:100%;
                                height:${Math.max(Math.round((val/maxVal)*160), val > 0 ? 8 : 2)}px;
                                background:${val > 0 ? 'linear-gradient(to top,#228b22,#e8f5e9)' : '#eee'};
                                border-radius:6px 6px 0 0;
                                transition:height 0.5s ease;
                            "></div>
                            <span style="font-size:0.72em;color:#999">${nombres[i]}</span>
                        </div>
                    `).join('')}
                </div>`;
        } catch (err) { console.error('Error reportes mensual:', err); }
    }

    // ── Utilidades ─────────────────────────────────────────
    function cerrarSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    function mostrarToast(mensaje, tipo = 'success') {
        const colores = { success: '#228b22', error: '#d32f2f', info: '#1976d2' };
        const toast   = document.createElement('div');
        toast.style.cssText = `
            position:fixed;bottom:30px;right:30px;z-index:9999;
            background:${colores[tipo]||colores.success};color:#fff;
            padding:14px 22px;border-radius:10px;font-size:0.95em;font-weight:500;
            box-shadow:0 4px 20px rgba(0,0,0,0.2);animation:slideInToast 0.3s ease;
        `;
        toast.textContent = mensaje;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity 0.4s'; }, 2500);
        setTimeout(() => toast.remove(), 3000);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInToast {
            from { transform:translateX(100px); opacity:0; }
            to   { transform:translateX(0);     opacity:1; }
        }

        /* ── Gear / Dropdown ── */
        .gear-wrapper { position:relative; display:inline-block; }
        .btn-gear {
            background:none; border:none; font-size:1.4em;
            cursor:pointer; padding:4px 8px; border-radius:8px;
            transition:transform 0.3s, background 0.2s;
            line-height:1;
        }
        .btn-gear:hover { background:#f0f0f0; transform:rotate(45deg); }
        .gear-menu {
            display:none; position:absolute; right:0; top:calc(100% + 6px);
            background:#fff; border:1px solid #e0e0e0; border-radius:10px;
            box-shadow:0 6px 24px rgba(0,0,0,0.13); min-width:190px;
            z-index:500; overflow:hidden; animation:fadeIn 0.18s ease;
        }
        .gear-menu.open { display:block; }
        .gear-item {
            display:flex; align-items:center; gap:8px;
            width:100%; padding:11px 16px; border:none; background:none;
            font-size:0.9em; cursor:pointer; text-align:left;
            transition:background 0.15s;
        }
        .gear-item:hover { background:#f5f5f5; }
        .gear-danger  { color:#d32f2f; }
        .gear-success { color:#228b22; }

        /* ── Dashboard extra stats ── */
        .dash-extra-row {
            display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
            gap:14px; margin-bottom:24px;
        }
        .dash-mini-card {
            background:#fff; border-radius:12px; padding:18px 20px;
            box-shadow:0 2px 10px rgba(0,0,0,0.06);
            display:flex; flex-direction:column; gap:4px;
            border-left:4px solid #e0e0e0;
        }
        .dash-mini-card.green  { border-left-color:#228b22; }
        .dash-mini-card.blue   { border-left-color:#1976d2; }
        .dash-mini-card.orange { border-left-color:#f57c00; }
        .dash-mini-card.red    { border-left-color:#d32f2f; }
        .dash-mini-card.purple { border-left-color:#7b1fa2; }
        .dash-mini-label { font-size:0.78em; color:#888; font-weight:500; }
        .dash-mini-value { font-size:1.6em; font-weight:700; color:#333; }

        /* ── Activity items ── */
        .activity-item {
            display:flex; align-items:flex-start; gap:14px;
            padding:14px 16px; border-bottom:1px solid #f0f0f0;
            transition:background 0.2s; border-radius:8px;
        }
        .activity-item:hover { background:#f9fdf9; }
        .act-icon { font-size:1.4em; line-height:1; min-width:28px; }
        .act-body { font-size:0.9em; color:#444; line-height:1.6; }
        .act-body strong { color:#222; }
        .act-body small  { color:#999; }
        .act-body .estado-badge { margin-left:6px; vertical-align:middle; }

        /* ── Metric icon ── */
        .metric-icon {
            width:52px; height:52px; border-radius:14px;
            display:flex; align-items:center; justify-content:center;
            font-size:1.6em; flex-shrink:0;
        }

        /* ── badges ── */
        .badge { background:var(--verde-claro);color:var(--verde-principal);padding:3px 10px;border-radius:15px;font-size:0.85em; }
        .badge-nav {
            background:#d32f2f;color:#fff;border-radius:50%;font-size:0.72em;font-weight:700;
            min-width:20px;height:20px;display:inline-flex;align-items:center;
            justify-content:center;margin-left:auto;padding:0 5px;
        }
        .badge-tab { background:#d32f2f;color:#fff;border-radius:12px;font-size:0.75em;font-weight:700;padding:2px 7px;margin-left:6px; }
        .btn-aprobar {
            background:var(--verde-principal);color:#fff;border:none;padding:7px 14px;
            border-radius:8px;cursor:pointer;font-size:0.85em;transition:background 0.2s;
            display:flex;align-items:center;gap:5px;
        }
        .btn-aprobar:hover { background:var(--verde-oscuro); }
        .btn-rechazar {
            background:var(--rojo-error);color:#fff;border:none;padding:7px 14px;
            border-radius:8px;cursor:pointer;font-size:0.85em;transition:background 0.2s;
            display:flex;align-items:center;gap:5px;
        }
        .btn-rechazar:hover { background:#b71c1c; }
        .btn-devuelto {
            background:var(--azul);color:#fff;border:none;padding:7px 14px;
            border-radius:8px;cursor:pointer;font-size:0.85em;transition:background 0.2s;
            display:flex;align-items:center;gap:5px;
        }
        .btn-devuelto:hover { background:#1565c0; }
        .estado-badge { padding:3px 10px;border-radius:12px;font-size:0.82em;font-weight:600; }
        .estado-pendiente    { background:#fff3e0;color:#f57c00; }
        .estado-aprobado     { background:#e8f5e9;color:#228b22; }
        .estado-rechazado    { background:#fce4ec;color:#d32f2f; }
        .estado-devuelto     { background:#e3f2fd;color:#1976d2; }
        .estado-disponible   { background:#e8f5e9;color:#228b22; }
        .estado-agotado      { background:#fff3e0;color:#f57c00; }
        .estado-mantenimiento{ background:#fce4ec;color:#d32f2f; }
        .tab-sol-content        { display:none; }
        .tab-sol-content.active { display:block; }
        .tab-dep-content        { display:none; }
        .tab-dep-content.active { display:block; }
        .motivo-rechazo { font-size:0.85em;color:#555;max-width:220px;white-space:pre-line; }
    `;
    document.head.appendChild(style);
});