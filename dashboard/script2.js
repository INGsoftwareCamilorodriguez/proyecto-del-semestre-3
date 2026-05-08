const API = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', function() {

    // Verificar sesión Y que sea Admin
    const usuarioSesion = sessionStorage.getItem('usuarioFET');
    if (!usuarioSesion) {
        window.location.href = '/inicio_de_usuario_y_registro/index.html';
        return;
    }

    const usuario = JSON.parse(usuarioSesion);

    // Si no es Admin, lo manda de vuelta al inicio
    if (usuario.tipo !== 'Admin') {
        alert('Acceso restringido al administrador.');
        sessionStorage.removeItem('usuarioFET');
        window.location.href = '/inicio_de_usuario_y_registro/index.html';
        return;
    }

    // Mostrar nombre del admin en sidebar
    const adminNombre = document.querySelector('.sidebar-header h2');
    if (adminNombre) adminNombre.textContent = usuario.nombre;

    // Helper: fetch autenticado con el id del admin
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

    // Elementos del DOM
    const sidebar    = document.getElementById('sidebar');
    const overlay    = document.getElementById('overlay');
    const menuToggle = document.getElementById('menuToggle');
    const navItems   = document.querySelectorAll('.nav-item');
    const sections   = document.querySelectorAll('.content-section');
    const logoutBtn  = document.getElementById('logoutBtn');

    // Cargar datos iniciales
    cargarDashboard();
    cargarUsuarios();

    // Navegación
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) section.classList.add('active');
            });

            if (window.innerWidth <= 968) cerrarSidebar();

            switch(targetSection) {
                case 'dashboard': cargarDashboard(); break;
                case 'usuarios':  cargarUsuarios();  break;
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
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            sessionStorage.removeItem('usuarioFET');
            window.location.href = '/inicio_de_usuario_y_registro/index.html';
        }
    });

    // Búsqueda y filtros
    document.getElementById('searchUsuario').addEventListener('input', cargarUsuarios);
    document.getElementById('filterTipo').addEventListener('change', cargarUsuarios);

    // ── Cargar Dashboard ──────────────────────────────────
    async function cargarDashboard() {
        try {
            const res      = await fetchAdmin(`${API}/usuarios`);
            const respuesta = await res.json();
            const usuarios  = respuesta.usuarios || [];

            document.getElementById('totalUsuarios').textContent = usuarios.length;

            const activityList = document.getElementById('recentActivity');
            if (usuarios.length === 0) {
                activityList.innerHTML = '<p class="no-data">No hay actividad reciente</p>';
                return;
            }

            activityList.innerHTML = usuarios.slice(0, 5).map(u => `
                <div class="activity-item">
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

    // ── Cargar Usuarios ───────────────────────────────────
    async function cargarUsuarios() {
        try {
            const res       = await fetchAdmin(`${API}/usuarios`);
            const respuesta = await res.json();
            let usuarios    = respuesta.usuarios || [];

            // Filtros
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

    // ── Eliminar Usuario ──────────────────────────────────
    window.eliminarUsuario = async function(id) {
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

    function cerrarSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    // Estilos actividad reciente
    const style = document.createElement('style');
    style.textContent = `
        .activity-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
            transition: all 0.3s ease;
        }
        .activity-item:hover { background: var(--verde-claro); }
        .activity-item i {
            font-size: 1.5em;
            color: var(--verde-principal);
        }
        .badge {
            background: var(--verde-claro);
            color: var(--verde-principal);
            padding: 3px 10px;
            border-radius: 15px;
            font-size: 0.85em;
        }
    `;
    document.head.appendChild(style);
});