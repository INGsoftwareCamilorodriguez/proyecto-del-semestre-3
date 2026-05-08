document.addEventListener('DOMContentLoaded', function() {
    const formulario = document.getElementById('formularioTenis');
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

    // Limpiar errores en tiempo real para campos de texto
    programa.addEventListener('input', function() {
        if (programa.value.trim()) {
            limpiarError(errorPrograma);
            programa.classList.remove('error');
        }
    });

    codigoEstudiante.addEventListener('input', function() {
        if (codigoEstudiante.value.trim().length >= 5) {
            limpiarError(errorCodigoEstudiante);
            codigoEstudiante.classList.remove('error');
        }
    });

    correoInstitucional.addEventListener('input', function() {
        const valor = correoInstitucional.value.trim();
        const esCorreoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
        if (valor && esCorreoValido) {
            limpiarError(errorCorreoInstitucional);
            correoInstitucional.classList.remove('error');
        }
    });

    // Limpiar errores en tiempo real para campos select
    const selectFields = [
        { element: tipoUsuario, error: errorTipoUsuario },
        { element: implementosDisponibles, error: errorImplementosDisponibles },
        { element: cantidad, error: errorCantidad }
    ];

    selectFields.forEach(({ element, error }) => {
        element.addEventListener('change', function() {
            if (element.value) {
                limpiarError(error);
                element.classList.remove('error');
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
        } else if (nombre.value.trim().length > 50) {
            mostrarError(errorNombre, 'El nombre no debe exceder 50 caracteres');
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
        if (!cantidad.value) {
            mostrarError(errorCantidad, 'Seleccione una cantidad');
            cantidad.classList.add('error');
            esValido = false;
        }

        // Si todo es válido, mostrar éxito y limpiar
        if (esValido) {
            // Mostrar mensaje de éxito
            mensajeExito.classList.add('show');
            
            // Guardar datos en localStorage (simulación)
            const datosJugador = {
                nombre: nombre.value.trim(),
                programa: programa.value.trim(),
                tipoUsuario: tipoUsuario.value,
                codigoEstudiante: codigoEstudiante.value.trim(),
                correoInstitucional: correoInstitucional.value.trim(),
                implementosDisponibles: implementosDisponibles.value,
                cantidad: cantidad.value,
                fechaRegistro: new Date().toISOString()
            };
            
            // Almacenar en localStorage
            const registrosTenis = JSON.parse(localStorage.getItem('registrosTenisFET') || '[]');
            registrosTenis.push(datosJugador);
            localStorage.setItem('registrosTenisFET', JSON.stringify(registrosTenis));
            
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
            
            // Mostrar en consola los datos registrados (para depuración)
            console.log('✅ Jugador registrado exitosamente:', datosJugador);
        } else {
            // Scroll al primer error
            const primerError = document.querySelector('.error');
            if (primerError) {
                primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                primerError.focus();
            }
        }
    });

    // Funciones auxiliares
    function mostrarError(elemento, mensaje) {
        elemento.textContent = mensaje;
        elemento.style.animation = 'fadeIn 0.3s ease';
    }

    function limpiarError(elemento) {
        elemento.textContent = '';
        elemento.style.animation = '';
    }

    function limpiarTodosErrores() {
           [errorNombre, errorPrograma, errorTipoUsuario, errorCodigoEstudiante, errorCorreoInstitucional,
            errorImplementosDisponibles, errorCantidad].forEach(limpiarError);
    }

    // Efectos hover mejorados en inputs y selects
    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(input => {
        input.addEventListener('mouseenter', function() {
            if (!this.classList.contains('error')) {
                this.style.transform = 'translateY(-2px)';
                this.style.borderColor = '#228b22';
            }
        });
        
        input.addEventListener('mouseleave', function() {
            if (!this.classList.contains('error')) {
                this.style.transform = 'translateY(0)';
                this.style.borderColor = '#e0e0e0';
            }
        });
    });

    // Animación del logo al cargar
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.style.opacity = '0';
        setTimeout(() => {
            logo.style.transition = 'opacity 0.8s ease, transform 0.3s ease';
            logo.style.opacity = '1';
        }, 300);
    }

    // Validación para evitar números en el nombre
    nombre.addEventListener('input', function() {
        const valor = this.value;
        if (/\d/.test(valor)) {
            mostrarError(errorNombre, 'El nombre no debe contener números');
            nombre.classList.add('error');
        } else if (valor.trim().length >= 5) {
            limpiarError(errorNombre);
            nombre.classList.remove('error');
        }
    });
});