const API = 'http://localhost:5000/api';

document.querySelector('.login-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const correo     = document.getElementById('username').value.trim();
    const contrasena = document.getElementById('password').value;

    const errorEl = document.getElementById('errorLogin');
    if (errorEl) errorEl.remove();

    try {
        const res = await fetch(`${API}/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ correo, contrasena })
        });

        const respuesta = await res.json();

        if (!res.ok) {
            const form = document.querySelector('.login-form');
            const div = document.createElement('div');
            div.id = 'errorLogin';
            div.style.cssText = `
                background: #fff0f0;
                border: 1px solid #d32f2f;
                color: #d32f2f;
                padding: 10px 15px;
                border-radius: 10px;
                margin-top: 10px;
                text-align: center;
                font-size: 0.9rem;
            `;
            div.textContent = respuesta.mensaje;
            form.appendChild(div);

        } else {
            sessionStorage.setItem('usuarioFET', JSON.stringify(respuesta.usuario));

            // Redirigir según tipo
            if (respuesta.usuario.tipo === 'Admin') {
                window.location.href = '/dashboard/panel_admin.html';
            } else {
                window.location.href = '/inicio_pagina/apartado_principal/inicio.html';
            }
        }

    } catch (error) {
        const form = document.querySelector('.login-form');
        const div = document.createElement('div');
        div.id = 'errorLogin';
        div.style.cssText = `
            background: #fff0f0;
            border: 1px solid #d32f2f;
            color: #d32f2f;
            padding: 10px 15px;
            border-radius: 10px;
            margin-top: 10px;
            text-align: center;
            font-size: 0.9rem;
        `;
        div.textContent = 'Error de conexión. ¿Está corriendo el servidor?';
        form.appendChild(div);
    }
});