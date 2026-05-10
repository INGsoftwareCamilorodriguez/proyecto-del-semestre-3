const API = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', function () {

    const sesionStr = sessionStorage.getItem('usuarioFET');
    if (!sesionStr) { window.location.href = '/inicio_de_usuario_y_registro/index.html'; return; }
    const usuario = JSON.parse(sesionStr);

    const formulario             = document.getElementById('formularioFutbol');
    const mensajeExito           = document.getElementById('mensajeExito');
    const nombre                 = document.getElementById('nombre');
    const programa               = document.getElementById('programa');
    const tipoUsuario            = document.getElementById('tipoUsuario');
    const codigoEstudiante       = document.getElementById('codigoEstudiante');
    const correoInstitucional    = document.getElementById('correoInstitucional');
    const implementosDisponibles = document.getElementById('implementosDisponibles');
    const cantidad               = document.getElementById('cantidad');

    const errorNombre                 = document.getElementById('errorNombre');
    const errorPrograma               = document.getElementById('errorPrograma');
    const errorTipoUsuario            = document.getElementById('errorTipoUsuario');
    const errorCodigoEstudiante       = document.getElementById('errorCodigoEstudiante');
    const errorCorreoInstitucional    = document.getElementById('errorCorreoInstitucional');
    const errorImplementosDisponibles = document.getElementById('errorImplementosDisponibles');
    const errorCantidad               = document.getElementById('errorCantidad');

    if (nombre)              nombre.value              = usuario.nombre   || '';
    if (programa)            programa.value            = usuario.programa || '';
    if (codigoEstudiante)    codigoEstudiante.value    = usuario.codigo   || '';
    if (correoInstitucional) correoInstitucional.value = usuario.correo   || '';

    const tiposValidos = ['Estudiante', 'Docente', 'Visitante'];
    if (tipoUsuario) tipoUsuario.value = tiposValidos.includes(usuario.tipo) ? usuario.tipo : 'Estudiante';

    // Cargar productos de VOLEIBOL desde la BD
    async function cargarProductos() {
        try {
            const res  = await fetch(`${API}/inventario?categoria=Voleibol`);
            const data = await res.json();
            implementosDisponibles.innerHTML = '<option value="">Seleccione una opción</option>';
            if (!data.ok || !data.inventario || data.inventario.length === 0) {
                implementosDisponibles.innerHTML += '<option disabled>No hay productos disponibles</option>';
                return;
            }
            data.inventario.forEach(p => {
                if (p.estado === 'Disponible' && p.cantidad > 0) {
                    const opt = document.createElement('option');
                    opt.value       = p.id;
                    opt.textContent = `${p.nombre} (${p.cantidad} disponibles)`;
                    implementosDisponibles.appendChild(opt);
                }
            });
        } catch (err) {
            implementosDisponibles.innerHTML = '<option disabled>Error cargando productos</option>';
        }
    }
    cargarProductos();

    nombre.addEventListener('input', function () {
        if (nombre.value.trim().length > 0 && nombre.value.trim().length < 5) {
            mostrarError(errorNombre, 'El nombre debe tener al menos 5 caracteres');
            nombre.classList.add('error');
        } else { limpiarError(errorNombre); nombre.classList.remove('error'); }
    });
    codigoEstudiante.addEventListener('input', function () {
        if (codigoEstudiante.value.trim() && codigoEstudiante.value.trim().length < 4) {
            mostrarError(errorCodigoEstudiante, 'El código debe tener al menos 4 caracteres');
            codigoEstudiante.classList.add('error');
        } else { limpiarError(errorCodigoEstudiante); codigoEstudiante.classList.remove('error'); }
    });
    correoInstitucional.addEventListener('input', function () {
        const v = correoInstitucional.value.trim();
        if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
            mostrarError(errorCorreoInstitucional, 'Ingrese un correo válido');
            correoInstitucional.classList.add('error');
        } else { limpiarError(errorCorreoInstitucional); correoInstitucional.classList.remove('error'); }
    });
    [programa, tipoUsuario, implementosDisponibles, cantidad].forEach(el => {
        el.addEventListener('change', function () {
            const errEl = document.getElementById('error' + el.id.charAt(0).toUpperCase() + el.id.slice(1));
            if (el.value) { limpiarError(errEl); el.classList.remove('error'); }
        });
    });

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        limpiarTodosErrores();
        mensajeExito.classList.remove('show');
        let esValido = true;

        if (!nombre.value.trim() || nombre.value.trim().length < 5) {
            mostrarError(errorNombre, 'El nombre debe tener al menos 5 caracteres');
            nombre.classList.add('error'); esValido = false;
        }
        if (!programa.value.trim()) {
            mostrarError(errorPrograma, 'El programa es obligatorio');
            programa.classList.add('error'); esValido = false;
        }

        const tipoActual = tipoUsuario ? tipoUsuario.value : '';
        if (!tiposValidos.includes(tipoActual)) {
            mostrarError(errorTipoUsuario, 'Seleccione un tipo de usuario válido');
            if (tipoUsuario) tipoUsuario.classList.add('error');
            esValido = false;
        }

        if (!codigoEstudiante.value.trim()) {
            mostrarError(errorCodigoEstudiante, 'El código es obligatorio');
            codigoEstudiante.classList.add('error'); esValido = false;
        }
        if (!correoInstitucional.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoInstitucional.value.trim())) {
            mostrarError(errorCorreoInstitucional, 'Ingrese un correo válido');
            correoInstitucional.classList.add('error'); esValido = false;
        }
        if (!implementosDisponibles.value) {
            mostrarError(errorImplementosDisponibles, 'Seleccione un implemento');
            implementosDisponibles.classList.add('error'); esValido = false;
        }
        if (!cantidad.value || parseInt(cantidad.value) < 1) {
            mostrarError(errorCantidad, 'Ingrese una cantidad válida');
            cantidad.classList.add('error'); esValido = false;
        }

        if (!esValido) { document.querySelector('.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

        try {
            const btnSubmit = formulario.querySelector('.btn-submit');
            btnSubmit.disabled = true; btnSubmit.textContent = 'Enviando...';

            const res = await fetch(`${API}/solicitudes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Usuario-Id': usuario.id },
                body: JSON.stringify({
                    inventario_id:       parseInt(implementosDisponibles.value),
                    cantidad_solicitada: parseInt(cantidad.value),
                    tipo_usuario:        tiposValidos.includes(tipoActual) ? tipoActual : 'Estudiante'
                })
            });
            const data = await res.json();

            if (data.ok) {
                mensajeExito.textContent = data.mensaje;
                mensajeExito.classList.add('show');
                formulario.reset();
                if (nombre)              nombre.value              = usuario.nombre   || '';
                if (programa)            programa.value            = usuario.programa || '';
                if (codigoEstudiante)    codigoEstudiante.value    = usuario.codigo   || '';
                if (correoInstitucional) correoInstitucional.value = usuario.correo   || '';
                if (tipoUsuario)         tipoUsuario.value         = tiposValidos.includes(usuario.tipo) ? usuario.tipo : 'Estudiante';
                limpiarTodosErrores();
                cargarProductos();
                mensajeExito.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => mensajeExito.classList.remove('show'), 6000);
            } else {
                mostrarError(errorImplementosDisponibles, data.mensaje || 'Error al enviar la solicitud');
            }
        } catch (err) {
            mostrarError(errorImplementosDisponibles, 'Error de conexión con el servidor');
        } finally {
            const btnSubmit = formulario.querySelector('.btn-submit');
            btnSubmit.disabled = false; btnSubmit.textContent = 'Registrar Jugador';
        }
    });

    function mostrarError(el, msg) { if (el) el.textContent = msg; }
    function limpiarError(el)      { if (el) el.textContent = ''; }
    function limpiarTodosErrores() {
        [errorNombre, errorPrograma, errorTipoUsuario, errorCodigoEstudiante,
         errorCorreoInstitucional, errorImplementosDisponibles, errorCantidad].forEach(limpiarError);
    }

    document.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('mouseenter', function () { if (!this.classList.contains('error')) this.style.transform = 'scale(1.02)'; });
        input.addEventListener('mouseleave', function () { this.style.transform = 'scale(1)'; });
    });
    const logo = document.querySelector('.logo');
    if (logo) { logo.style.opacity = '0'; setTimeout(() => { logo.style.transition = 'opacity 0.8s ease'; logo.style.opacity = '1'; }, 300); }
});