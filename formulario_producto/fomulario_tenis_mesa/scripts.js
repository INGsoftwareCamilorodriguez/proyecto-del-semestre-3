document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.getElementById('formularioFutbol');
    const mensajeExito = document.getElementById('mensajeExito');

    // Elementos de validación
    const nombre = document.getElementById('nombre');
    const programa = document.getElementById('programa');
    const tipoUsuario = document.getElementById('tipoUsuario');
    const codigoEstudiante = document.getElementById('codigoEstudiante');
    const correoInstitucional = document.getElementById('correoInstitucional');
    const implementosDisponibles = document.getElementById('implementosDisponibles');
    const cantidad = document.getElementById('cantidad');

    // Elementos de error
    const errorNombre = document.getElementById('errorNombre');
    const errorPrograma = document.getElementById('errorPrograma');
    const errorTipoUsuario = document.getElementById('errorTipoUsuario');
    const errorCodigoEstudiante = document.getElementById('errorCodigoEstudiante');
    const errorCorreoInstitucional = document.getElementById('errorCorreoInstitucional');
    const errorImplementosDisponibles = document.getElementById('errorImplementosDisponibles');
    const errorCantidad = document.getElementById('errorCantidad');

    // Validación en tiempo real para nombre
    nombre.addEventListener('input', function() {
        if (nombre.value.trim().length > 0 && nombre.value.trim().length < 5) {
            mostrarError(errorNombre, 'El nombre debe tener al menos 5 caracteres');
            nombre.classList.add('error');
        } else {
            limpiarError(errorNombre);
            nombre.classList.remove('error');
        }
    });

    // Validación en tiempo real para código del estudiante
    codigoEstudiante.addEventListener('input', function() {
        if (codigoEstudiante.value.trim() && codigoEstudiante.value.trim().length < 5) {
            mostrarError(errorCodigoEstudiante, 'El código debe tener al menos 5 caracteres');
            codigoEstudiante.classList.add('error');
        } else {
            limpiarError(errorCodigoEstudiante);
            codigoEstudiante.classList.remove('error');
        }
    });

    // Validación en tiempo real para correo institucional
    correoInstitucional.addEventListener('input', function() {
        const valor = correoInstitucional.value.trim();
        const esCorreoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
        if (valor && !esCorreoValido) {
            mostrarError(errorCorreoInstitucional, 'Ingrese un correo institucional válido');
            correoInstitucional.classList.add('error');
        } else {
            limpiarError(errorCorreoInstitucional);
            correoInstitucional.classList.remove('error');
        }
    });

    // Limpiar errores en tiempo real para otros campos
    [programa, tipoUsuario, codigoEstudiante, correoInstitucional, implementosDisponibles, cantidad].forEach(elemento => {
        elemento.addEventListener('input', function() {
            const errorElement = document.getElementById('error' + elemento.id.charAt(0).toUpperCase() + elemento.id.slice(1));
            if (elemento.value.trim()) {
                limpiarError(errorElement);
                elemento.classList.remove('error');
            }
        });

        elemento.addEventListener('change', function() {
            const errorElement = document.getElementById('error' + elemento.id.charAt(0).toUpperCase() + elemento.id.slice(1));
            if (elemento.value) {
                limpiarError(errorElement);
                elemento.classList.remove('error');
            }
        });
    });

    // Manejo del envío del formulario
    formulario.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Limpiar mensajes anteriores
        limpiarTodosErrores();
        mensajeExito.classList.remove('show');
        
        let esValido = true;

        // Validar nombre
        if (!nombre.value.trim()) {
            mostrarError(errorNombre, 'El nombre es obligatorio');
            nombre.classList.add('error');
            esValido = false;
        } else if (nombre.value.trim().length < 5) {
            mostrarError(errorNombre, 'El nombre debe tener al menos 5 caracteres');
            nombre.classList.add('error');
            esValido = false;
        }

        // Validar programa
        if (!programa.value.trim()) {
            mostrarError(errorPrograma, 'El programa es obligatorio');
            programa.classList.add('error');
            esValido = false;
        }

        // Validar tipo de usuario
        if (!tipoUsuario.value) {
            mostrarError(errorTipoUsuario, 'Seleccione un tipo de usuario');
            tipoUsuario.classList.add('error');
            esValido = false;
        }

        // Validar código del estudiante
        if (!codigoEstudiante.value.trim()) {
            mostrarError(errorCodigoEstudiante, 'El código del estudiante es obligatorio');
            codigoEstudiante.classList.add('error');
            esValido = false;
        } else if (codigoEstudiante.value.trim().length < 5) {
            mostrarError(errorCodigoEstudiante, 'El código debe tener al menos 5 caracteres');
            codigoEstudiante.classList.add('error');
            esValido = false;
        }

        // Validar correo institucional
        if (!correoInstitucional.value.trim()) {
            mostrarError(errorCorreoInstitucional, 'El correo institucional es obligatorio');
            correoInstitucional.classList.add('error');
            esValido = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoInstitucional.value.trim())) {
            mostrarError(errorCorreoInstitucional, 'Ingrese un correo institucional válido');
            correoInstitucional.classList.add('error');
            esValido = false;
        }

        // Validar implementos disponibles
        if (!implementosDisponibles.value) {
            mostrarError(errorImplementosDisponibles, 'Seleccione un implemento disponible');
            implementosDisponibles.classList.add('error');
            esValido = false;
        }

        // Validar cantidad
        if (cantidad.value === '') {
            mostrarError(errorCantidad, 'Seleccione una cantidad');
            cantidad.classList.add('error');
            esValido = false;
        }

        // Si todo es válido, mostrar éxito y limpiar
        if (esValido) {
            // Mostrar mensaje de éxito
            mensajeExito.classList.add('show');
            
            // Limpiar formulario
            formulario.reset();
            limpiarTodosErrores();
            
            // Quitar clases de error
            [nombre, programa, tipoUsuario, codigoEstudiante, correoInstitucional, implementosDisponibles, cantidad].forEach(el => {
                el.classList.remove('error');
            });

            // Scroll suave al mensaje de éxito
            mensajeExito.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Ocultar mensaje después de 5 segundos
            setTimeout(() => {
                mensajeExito.classList.remove('show');
            }, 5000);
        } else {
            // Scroll al primer error
            const primerError = document.querySelector('.error');
            if (primerError) {
                primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });

    // Funciones auxiliares
    function mostrarError(elemento, mensaje) {
        elemento.textContent = mensaje;
    }

    function limpiarError(elemento) {
        elemento.textContent = '';
    }

    function limpiarTodosErrores() {
           [errorNombre, errorPrograma, errorTipoUsuario, errorCodigoEstudiante, errorCorreoInstitucional,
            errorImplementosDisponibles, errorCantidad].forEach(limpiarError);
    }

    // Efecto de hover en inputs
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('mouseenter', function() {
            if (!this.classList.contains('error')) {
                this.style.transform = 'scale(1.02)';
            }
        });
        
        input.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });

    // Animación del logo al cargar
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.style.opacity = '0';
        setTimeout(() => {
            logo.style.transition = 'opacity 0.8s ease';
            logo.style.opacity = '1';
        }, 300);
    }
});