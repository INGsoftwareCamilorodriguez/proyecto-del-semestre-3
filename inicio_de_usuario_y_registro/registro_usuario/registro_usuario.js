const API = 'http://localhost:5000/api';

document.getElementById('formularioRegistro').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Limpiar errores anteriores
    limpiarErrores();

    const datos = {
        nombre:    document.getElementById('nombre').value,
        programa:  document.getElementById('programa').value,
        codigo:    document.getElementById('codigoEstudiante').value,
        correo:    document.getElementById('correoInstitucional').value,
        contrasena: document.getElementById('contrasena').value
    };

    try {
        const res = await fetch(`${API}/registro`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(datos)
        });

        const respuesta = await res.json();

        if (!res.ok) {
            // Mostrar errores en el formulario
            const errores = respuesta.errores;
            if (errores.nombre)     mostrarError('errorNombre', errores.nombre);
            if (errores.programa)   mostrarError('errorPrograma', errores.programa);
            if (errores.codigo)     mostrarError('errorCodigoEstudiante', errores.codigo);
            if (errores.correo)     mostrarError('errorCorreoInstitucional', errores.correo);
            if (errores.contrasena) mostrarError('errorcontrasena', errores.contrasena);
            if (errores.general)    mostrarError('errorNombre', errores.general);
        } else {
            // Registro exitoso
            document.getElementById('mensajeExito').classList.add('show');
            this.reset();

            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                window.location.href = '/inicio_de_usuario_y_registro/index.html';
            }, 2000);
        }

    } catch (error) {
        mostrarError('errorNombre', 'Error de conexión con el servidor. ¿Está corriendo el backend?');
    }
});

function mostrarError(id, mensaje) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = mensaje;
        const input = el.previousElementSibling;
        if (input) input.classList.add('error');
    }
}

function limpiarErrores() {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('input').forEach(el => el.classList.remove('error'));
}