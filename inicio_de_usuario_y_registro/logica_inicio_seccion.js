(function(){
        // Simplemente muestra un mensaje acorde con el requerimiento "si el usuario no está registrado"
        const registerBtn = document.getElementById('registerLink');
        if(registerBtn) {
            registerBtn.addEventListener('click', function(e) {
                e.preventDefault();
                // En una app real redirigiría a /registro o mostraría modal.
                alert('📋 Redirigiendo al formulario de registro de Bodega FET.\n(Implementa aquí tu lógica de registro)');
                // Puedes cambiar el comportamiento, por ejemplo window.location.href = '/registro';
            });
        }

        // Para el login, también evitamos envío real
        const loginForm = document.querySelector('.login-form');
        if(loginForm) {
            loginForm.addEventListener('submit', function(e) {
                // Ya tiene preventDefault en el onsubmit inline, pero aseguramos.
                // Si se implementa backend, se quita el alert.
                const user = document.getElementById('username')?.value || '';
                if(user.trim() === '') {
                    alert('👤 Por favor, ingresa tu usuario institucional.');
                } else {
                    console.log('Intento de login:', user);
                }
            });
        }
    })();