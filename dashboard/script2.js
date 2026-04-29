document.addEventListener('DOMContentLoaded', function() {
    // Inicializar datos de ejemplo si no existen
    inicializarDatos();

    // Elementos del DOM
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const menuToggle = document.getElementById('menuToggle');
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    const logoutBtn = document.getElementById('logoutBtn');

    // Cargar datos iniciales
    cargarDashboard();
    cargarUsuarios();
    cargarRegistros();
    cargarInventario();
    cargarReportes();

    // Navegación
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSection) {
                    section.classList.add('active');
                }
            });
            
            if (window.innerWidth <= 968) {
                cerrarSidebar();
            }

            // Recargar datos de la sección
            switch(targetSection) {
                case 'dashboard': cargarDashboard(); break;
                case 'usuarios': cargarUsuarios(); break;
                case 'registros': cargarRegistros(); break;
                case 'inventario': cargarInventario(); break;
                case 'reportes': cargarReportes(); break;
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
            alert('Sesión cerrada exitosamente. Redirigiendo...');
            window.location.href = 'login.html';
        }
    });

    // Tabs de registros deportivos
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.getElementById('tab' + this.getAttribute('data-deporte').charAt(0).toUpperCase() + 
                         this.getAttribute('data-deporte').slice(1)).classList.add('active');
        });
    });

    // Búsqueda y filtros
    document.getElementById('searchUsuario').addEventListener('input', cargarUsuarios);
    document.getElementById('filterTipo').addEventListener('change', cargarUsuarios);

    // Funciones de carga de datos
    function cargarDashboard() {
        const usuarios = JSON.parse(localStorage.getItem('usuariosFET') || '[]');
        const futbol = JSON.parse(localStorage.getItem('registrosFutbolFET') || '[]');
        const tenis = JSON.parse(localStorage.getItem('registrosTenisFET') || '[]');
        const inventario = JSON.parse(localStorage.getItem('inventarioFET') || '[]');
        
        document.getElementById('totalUsuarios').textContent = usuarios.length;
        document.getElementById('totalFutbol').textContent = futbol.length;
        document.getElementById('totalTenis').textContent = tenis.length;
        
        const prestamos = inventario.filter(item => item.estado === 'En préstamo').length;
        document.getElementById('prestamosActivos').textContent = prestamos;

        // Actividad reciente
        const activityList = document.getElementById('recentActivity');
        let activityHTML = '';
        
        const allRegistros = [
            ...futbol.map(r => ({...r, deporte: 'Fútbol'})),
            ...tenis.map(r => ({...r, deporte: 'Tenis de Mesa'}))
        ].sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro)).slice(0, 5);
        
        allRegistros.forEach(reg => {
            activityHTML += `
                <div class="activity-item">
                    <i class="fas fa-${reg.deporte === 'Fútbol' ? 'futbol' : 'table-tennis'}"></i>
                    <div>
                        <strong>${reg.nombre}</strong> se registró en ${reg.deporte}
                        <small>${new Date(reg.fechaRegistro).toLocaleDateString()}</small>
                    </div>
                </div>
            `;
        });
        
        activityList.innerHTML = activityHTML || '<p class="no-data">No hay actividad reciente</p>';
    }

    function cargarUsuarios() {
        const usuarios = JSON.parse(localStorage.getItem('usuariosFET') || '[]');
        const searchTerm = document.getElementById('searchUsuario').value.toLowerCase();
        const filterTipo = document.getElementById('filterTipo').value;
        
        let usuariosFiltrados = usuarios.filter(u => {
            const matchSearch = u.nombre.toLowerCase().includes(searchTerm) || 
                              u.programa.toLowerCase().includes(searchTerm);
            const matchTipo = !filterTipo || u.tipoUsuario === filterTipo;
            return matchSearch && matchTipo;
        });

        const tbody = document.getElementById('usuariosTableBody');
        
        if (usuariosFiltrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No se encontraron usuarios</td></tr>';
            return;
        }

        // Paginación simple (10 por página)
        const pageSize = 10;
        const totalPages = Math.ceil(usuariosFiltrados.length / pageSize);
        let currentPage = 1;
        
        mostrarPaginaUsuarios(usuariosFiltrados, currentPage, pageSize);
        crearPaginacion(totalPages, currentPage, (page) => {
            mostrarPaginaUsuarios(usuariosFiltrados, page, pageSize);
        });
    }

    function mostrarPaginaUsuarios(usuarios, page, pageSize) {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginaUsuarios = usuarios.slice(start, end);
        
        const tbody = document.getElementById('usuariosTableBody');
        tbody.innerHTML = paginaUsuarios.map((user, index) => `
            <tr>
                <td>${user.nombre}</td>
                <td>${user.programa}</td>
                <td><span class="badge">${user.tipoUsuario}</span></td>
                <td>${user.genero}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-edit" onclick="editarUsuario(${start + index})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="confirmarEliminarUsuario(${start + index})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function crearPaginacion(totalPages, currentPage, callback) {
        const paginacion = document.getElementById('paginacionUsuarios');
        let html = '';
        
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" 
                           onclick="event.preventDefault();">${i}</button>`;
        }
        
        paginacion.innerHTML = html;
        
        // Agregar event listeners
        paginacion.querySelectorAll('.page-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                paginacion.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                callback(index + 1);
            });
        });
    }

    // CRUD Usuarios
    window.editarUsuario = function(index) {
        const usuarios = JSON.parse(localStorage.getItem('usuariosFET') || '[]');
        const usuario = usuarios[index];
        
        const nuevoNombre = prompt('Editar nombre:', usuario.nombre);
        if (nuevoNombre !== null && nuevoNombre.trim() !== '') {
            usuario.nombre = nuevoNombre.trim();
            localStorage.setItem('usuariosFET', JSON.stringify(usuarios));
            cargarUsuarios();
            cargarDashboard();
        }
    };

    window.confirmarEliminarUsuario = function(index) {
        const modal = document.getElementById('modalConfirm');
        modal.classList.add('active');
        
        document.getElementById('btnConfirmDelete').onclick = function() {
            const usuarios = JSON.parse(localStorage.getItem('usuariosFET') || '[]');
            usuarios.splice(index, 1);
            localStorage.setItem('usuariosFET', JSON.stringify(usuarios));
            modal.classList.remove('active');
            cargarUsuarios();
            cargarDashboard();
        };
        
        document.getElementById('btnCancelDelete').onclick = function() {
            modal.classList.remove('active');
        };
    };

    // CRUD Inventario
    function cargarInventario() {
        const inventario = JSON.parse(localStorage.getItem('inventarioFET') || '[]');
        const grid = document.getElementById('inventoryGrid');
        
        if (inventario.length === 0) {
            grid.innerHTML = '<p class="no-data">No hay elementos en el inventario</p>';
            return;
        }
        
        grid.innerHTML = inventario.map((item, index) => `
            <div class="inventory-card">
                <div class="inv-header">
                    <h3>${item.nombre}</h3>
                    <span class="inv-category">${item.categoria}</span>
                </div>
                <div class="inv-details">
                    <p><strong>Cantidad:</strong> ${item.cantidad}</p>
                    <p><strong>Estado:</strong> ${item.estado}</p>
                </div>
                <div class="action-btns" style="margin-top: 15px;">
                    <button class="btn-edit" onclick="editarInventario(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="eliminarInventario(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    window.editarInventario = function(index) {
        const inventario = JSON.parse(localStorage.getItem('inventarioFET') || '[]');
        const item = inventario[index];
        
        document.getElementById('modalTitle').textContent = 'Editar Elemento';
        document.getElementById('invNombre').value = item.nombre;
        document.getElementById('invCategoria').value = item.categoria;
        document.getElementById('invCantidad').value = item.cantidad;
        document.getElementById('invEstado').value = item.estado;
        
        const modal = document.getElementById('modalInventario');
        modal.classList.add('active');
        
        document.getElementById('formInventario').onsubmit = function(e) {
            e.preventDefault();
            item.nombre = document.getElementById('invNombre').value;
            item.categoria = document.getElementById('invCategoria').value;
            item.cantidad = document.getElementById('invCantidad').value;
            item.estado = document.getElementById('invEstado').value;
            
            localStorage.setItem('inventarioFET', JSON.stringify(inventario));
            modal.classList.remove('active');
            cargarInventario();
        };
    };

    window.eliminarInventario = function(index) {
        if (confirm('¿Eliminar este elemento del inventario?')) {
            const inventario = JSON.parse(localStorage.getItem('inventarioFET') || '[]');
            inventario.splice(index, 1);
            localStorage.setItem('inventarioFET', JSON.stringify(inventario));
            cargarInventario();
        }
    };

    document.getElementById('btnAddInventario').addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Agregar Elemento';
        document.getElementById('formInventario').reset();
        document.getElementById('modalInventario').classList.add('active');
        
        document.getElementById('formInventario').onsubmit = function(e) {
            e.preventDefault();
            const nuevoItem = {
                nombre: document.getElementById('invNombre').value,
                categoria: document.getElementById('invCategoria').value,
                cantidad: document.getElementById('invCantidad').value,
                estado: document.getElementById('invEstado').value
            };
            
            const inventario = JSON.parse(localStorage.getItem('inventarioFET') || '[]');
            inventario.push(nuevoItem);
            localStorage.setItem('inventarioFET', JSON.stringify(inventario));
            document.getElementById('modalInventario').classList.remove('active');
            cargarInventario();
        };
    });

    document.getElementById('btnCancelModal').addEventListener('click', () => {
        document.getElementById('modalInventario').classList.remove('active');
    });

    // Registros deportivos
    function cargarRegistros() {
        // Fútbol
        const futbol = JSON.parse(localStorage.getItem('registrosFutbolFET') || '[]');
        document.getElementById('futbolTableBody').innerHTML = futbol.length > 0 
            ? futbol.map(reg => `
                <tr>
                    <td>${reg.nombre}</td>
                    <td>${reg.posicion}</td>
                    <td>${reg.numeroCamiseta}</td>
                    <td>${reg.experiencia}</td>
                    <td>${new Date(reg.fechaRegistro).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-delete" onclick="eliminarRegistro('futbol', '${reg.fechaRegistro}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="6" class="no-data">No hay registros de fútbol</td></tr>';

        // Tenis de Mesa
        const tenis = JSON.parse(localStorage.getItem('registrosTenisFET') || '[]');
        document.getElementById('tenisTableBody').innerHTML = tenis.length > 0
            ? tenis.map(reg => `
                <tr>
                    <td>${reg.nombre}</td>
                    <td>${reg.manoDominante}</td>
                    <td>${reg.tipoJuego}</td>
                    <td>${reg.experiencia}</td>
                    <td>${new Date(reg.fechaRegistro).toLocaleDateString()}</td>
                    <td>
                        <button class="btn-delete" onclick="eliminarRegistro('tenis', '${reg.fechaRegistro}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="6" class="no-data">No hay registros de tenis de mesa</td></tr>';
    }

    window.eliminarRegistro = function(deporte, fecha) {
        if (confirm('¿Eliminar este registro?')) {
            const key = deporte === 'futbol' ? 'registrosFutbolFET' : 'registrosTenisFET';
            const registros = JSON.parse(localStorage.getItem(key) || '[]');
            const nuevosRegistros = registros.filter(r => r.fechaRegistro !== fecha);
            localStorage.setItem(key, JSON.stringify(nuevosRegistros));
            cargarRegistros();
            cargarDashboard();
        }
    };

    // Reportes
    function cargarReportes() {
        const usuarios = JSON.parse(localStorage.getItem('usuariosFET') || '[]');
        
        // Usuarios por tipo
        const estudiantes = usuarios.filter(u => u.tipoUsuario === 'Estudiante').length;
        const docentes = usuarios.filter(u => u.tipoUsuario === 'Docente').length;
        const visitantes = usuarios.filter(u => u.tipoUsuario === 'Visitante').length;
        const maxUsers = Math.max(estudiantes, docentes, visitantes, 1);
        
        document.getElementById('barEstudiante').querySelector('.bar-value').textContent = estudiantes;
        document.getElementById('barEstudiante').querySelector('.bar-value').style.width = 
            (estudiantes / maxUsers * 100) + '%';
        document.getElementById('barDocente').querySelector('.bar-value').textContent = docentes;
        document.getElementById('barDocente').querySelector('.bar-value').style.width = 
            (docentes / maxUsers * 100) + '%';
        document.getElementById('barVisitante').querySelector('.bar-value').textContent = visitantes;
        document.getElementById('barVisitante').querySelector('.bar-value').style.width = 
            (visitantes / maxUsers * 100) + '%';
    }

    // Agregar usuario de ejemplo
    document.getElementById('btnAddUsuario').addEventListener('click', () => {
        const nombre = prompt('Nombre completo:');
        if (!nombre) return;
        const programa = prompt('Programa académico:');
        if (!programa) return;
        
        const tipoUsuario = prompt('Tipo de usuario (Estudiante/Docente/Visitante):');
        if (!tipoUsuario) return;
        
        const genero = prompt('Género (Masculino/Femenino/Otro):');
        if (!genero) return;
        
        const usuarios = JSON.parse(localStorage.getItem('usuariosFET') || '[]');
        usuarios.push({ nombre, programa, tipoUsuario, genero });
        localStorage.setItem('usuariosFET', JSON.stringify(usuarios));
        cargarUsuarios();
        cargarDashboard();
    });

    function inicializarDatos() {
        // Datos de ejemplo si no existen
        if (!localStorage.getItem('usuariosFET')) {
            const usuariosEjemplo = [
                { nombre: 'Juan Carlos Pérez', programa: 'Ingeniería de Sistemas', tipoUsuario: 'Estudiante', genero: 'Masculino' },
                { nombre: 'María Fernanda López', programa: 'Ingeniería Industrial', tipoUsuario: 'Estudiante', genero: 'Femenino' },
                { nombre: 'Carlos Ramírez', programa: 'Administración', tipoUsuario: 'Docente', genero: 'Masculino' },
                { nombre: 'Ana Martínez', programa: 'Derecho', tipoUsuario: 'Visitante', genero: 'Femenino' }
            ];
            localStorage.setItem('usuariosFET', JSON.stringify(usuariosEjemplo));
        }
        
        if (!localStorage.getItem('registrosFutbolFET')) {
            const futbolEjemplo = [
                { nombre: 'Juan Carlos Pérez', posicion: 'Mediocampista', numeroCamiseta: '10', experiencia: 'Avanzado', fechaRegistro: '2024-03-15' },
                { nombre: 'Pedro González', posicion: 'Delantero', numeroCamiseta: '9', experiencia: 'Intermedio', fechaRegistro: '2024-03-14' }
            ];
            localStorage.setItem('registrosFutbolFET', JSON.stringify(futbolEjemplo));
        }
        
        if (!localStorage.getItem('registrosTenisFET')) {
            const tenisEjemplo = [
                { nombre: 'María Fernanda López', manoDominante: 'Derecha', tipoJuego: 'Ofensivo', experiencia: 'Intermedio', fechaRegistro: '2024-03-16' }
            ];
            localStorage.setItem('registrosTenisFET', JSON.stringify(tenisEjemplo));
        }
        
        if (!localStorage.getItem('inventarioFET')) {
            const inventarioEjemplo = [
                { nombre: 'Balón de Fútbol Profesional', categoria: 'Fútbol', cantidad: '15', estado: 'Disponible' },
                { nombre: 'Raqueta de Tenis de Mesa', categoria: 'Tenis de Mesa', cantidad: '20', estado: 'Disponible' },
                { nombre: 'Mesa de Ping Pong', categoria: 'Tenis de Mesa', cantidad: '5', estado: 'Disponible' },
                { nombre: 'Malla de Voleibol', categoria: 'General', cantidad: '3', estado: 'Mantenimiento' }
            ];
            localStorage.setItem('inventarioFET', JSON.stringify(inventarioEjemplo));
        }
    }

    function cerrarSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    // Responsive
    window.addEventListener('resize', () => {
        if (window.innerWidth > 968) {
            cerrarSidebar();
        }
    });

    // Estilos adicionales para actividad reciente
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
        .activity-item:hover {
            background: var(--verde-claro);
        }
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