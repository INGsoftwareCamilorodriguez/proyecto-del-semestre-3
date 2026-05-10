const API = 'http://localhost:5000';

// ── SESIÓN ─────────────────────────────────────────────────────────────────
const usuario = JSON.parse(sessionStorage.getItem('usuarioFET') || 'null');
if (!usuario) {
  window.location.href = '/inicio_de_usuario_y_registro/index.html';
}

// ── ESTADO ─────────────────────────────────────────────────────────────────
let mensajes     = [];
let panelAbierto = false;

// ── ELEMENTOS ──────────────────────────────────────────────────────────────
const btnMensajes     = document.getElementById('btn-mensajes');
const badgeMensajes   = document.getElementById('badge-mensajes');
const panelMensajes   = document.getElementById('panel-mensajes');
const panelCuerpo     = document.getElementById('panel-cuerpo');
const btnLeerTodos    = document.getElementById('btn-leer-todos');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');

// ── INICIALIZACIÓN ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Cerrar sesión
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', e => {
      e.preventDefault();
      sessionStorage.removeItem('usuarioFET');
      window.location.href = '/inicio_de_usuario_y_registro/index.html';
    });
  }

  // Abrir/cerrar panel
  btnMensajes.addEventListener('click', e => {
    e.stopPropagation();
    panelAbierto ? cerrarPanel() : abrirPanel();
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', e => {
    if (panelAbierto && !panelMensajes.contains(e.target) && e.target !== btnMensajes) {
      cerrarPanel();
    }
  });

  // Marcar todos leídos
  btnLeerTodos.addEventListener('click', e => {
    e.stopPropagation();
    marcarTodosLeidos();
  });

  // Scroll suave
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const dest = document.querySelector(this.getAttribute('href'));
      if (dest) { e.preventDefault(); dest.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  // Badge al cargar la página
  cargarNoLeidos();

  // Refrescar badge cada 30 segundos
  setInterval(cargarNoLeidos, 30000);
});

// ── ABRIR PANEL ─────────────────────────────────────────────────────────────
function abrirPanel() {
  panelMensajes.style.display = 'block';
  panelAbierto = true;
  cargarMensajes();
}

// ── CERRAR PANEL ────────────────────────────────────────────────────────────
function cerrarPanel() {
  panelMensajes.style.display = 'none';
  panelAbierto = false;
}

// ── BADGE (sin abrir panel) ──────────────────────────────────────────────────
async function cargarNoLeidos() {
  try {
    const res = await fetch(`${API}/api/mensajes/no-leidos`, {
      headers: { 'X-Usuario-Id': usuario.id }
    });
    if (!res.ok) return;
    const data = await res.json();
    // FIX: el backend devuelve { ok: true, no_leidos: N }
    actualizarBadge(data.no_leidos ?? 0);
  } catch { /* silencioso */ }
}

// ── ACTUALIZAR BADGE ────────────────────────────────────────────────────────
function actualizarBadge(count) {
  if (count > 0) {
    badgeMensajes.textContent  = count > 99 ? '99+' : count;
    badgeMensajes.style.display = 'flex';
  } else {
    badgeMensajes.style.display = 'none';
  }
}

// ── CARGAR MENSAJES ──────────────────────────────────────────────────────────
async function cargarMensajes() {
  panelCuerpo.innerHTML = `
    <div class="panel-cargando">
      <i class="fas fa-spinner fa-spin"></i> Cargando...
    </div>`;

  try {
    const res = await fetch(`${API}/api/mensajes`, {
      headers: { 'X-Usuario-Id': usuario.id }
    });
    if (!res.ok) throw new Error('Error ' + res.status);
    const data = await res.json();

    // FIX: el backend devuelve { ok: true, mensajes: [...] }
    mensajes = data.mensajes || [];
    renderPanel();
  } catch (err) {
    console.error('Error cargando mensajes:', err);
    panelCuerpo.innerHTML = `
      <div class="panel-vacio">
        <i class="fas fa-exclamation-circle"></i>
        Error al cargar mensajes
      </div>`;
  }
}

// ── RENDERIZAR PANEL ─────────────────────────────────────────────────────────
function renderPanel() {
  const noLeidos = mensajes.filter(m => !m.leido).length;
  actualizarBadge(noLeidos);

  if (!mensajes.length) {
    panelCuerpo.innerHTML = `
      <div class="panel-vacio">
        <i class="fas fa-inbox"></i>
        No tienes mensajes
      </div>`;
    return;
  }

  const iconoTipo = {
    'Aprobado':    'fas fa-check-circle',
    'Rechazado':   'fas fa-times-circle',
    'Informativo': 'fas fa-info-circle'
  };

  panelCuerpo.innerHTML = mensajes.map(m => `
    <div class="panel-item tipo-${m.tipo} ${m.leido ? '' : 'no-leido'}"
         data-id="${m.id}" onclick="abrirMensaje(${m.id})">
      <div class="panel-item-icono">
        <i class="${iconoTipo[m.tipo] || 'fas fa-envelope'}"></i>
      </div>
      <div class="panel-item-contenido">
        <div class="panel-item-asunto">${escapeHtml(m.asunto || 'Sin asunto')}</div>
        <div class="panel-item-preview">${escapeHtml((m.cuerpo || '').substring(0, 60))}${(m.cuerpo || '').length > 60 ? '...' : ''}</div>
        <div class="panel-item-fecha">${formatearFecha(m.creado_en)}</div>
      </div>
      ${!m.leido ? '<div class="punto-noLeido"></div>' : ''}
      <div class="panel-item-acciones" onclick="event.stopPropagation()">
        <button class="btn-panel-eliminar" title="Eliminar" onclick="eliminarMensaje(${m.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// ── ABRIR MENSAJE (modal) ────────────────────────────────────────────────────
async function abrirMensaje(id) {
  const m = mensajes.find(x => x.id === id);
  if (!m) return;

  // Marcar como leído si no lo estaba
  if (!m.leido) await marcarLeido(id);

  const iconoTipo = {
    'Aprobado':    'fas fa-check-circle',
    'Rechazado':   'fas fa-times-circle',
    'Informativo': 'fas fa-info-circle'
  };

  // Reemplazar saltos de línea por <br> en el cuerpo
  const cuerpoHtml = escapeHtml(m.cuerpo || '(Sin contenido)').replace(/\n/g, '<br>');

  const modal = document.createElement('div');
  modal.className = 'modal-msg-overlay';
  modal.id = 'modal-msg-global';
  modal.innerHTML = `
    <div class="modal-msg-box">
      <div class="modal-msg-header tipo-${m.tipo}">
        <h4><i class="${iconoTipo[m.tipo] || 'fas fa-envelope'}"></i> ${escapeHtml(m.asunto || 'Sin asunto')}</h4>
        <button class="modal-msg-cerrar" onclick="cerrarModalMsg()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-msg-body">
        <div class="modal-msg-meta">
          <span class="badge-tipo tipo-${m.tipo}">${m.tipo}</span>
          <span class="modal-msg-fecha">${formatearFecha(m.creado_en)}</span>
        </div>
        <div class="modal-msg-cuerpo">${cuerpoHtml}</div>
      </div>
      <div class="modal-msg-footer">
        <button class="btn-modal-eliminar" onclick="eliminarMensaje(${m.id}); cerrarModalMsg();">
          <i class="fas fa-trash"></i> Eliminar
        </button>
        <button class="btn-modal-cerrar" onclick="cerrarModalMsg()">Cerrar</button>
      </div>
    </div>
  `;

  modal.addEventListener('click', e => { if (e.target === modal) cerrarModalMsg(); });
  document.body.appendChild(modal);
  cerrarPanel();
}

// ── CERRAR MODAL ─────────────────────────────────────────────────────────────
function cerrarModalMsg() {
  const modal = document.getElementById('modal-msg-global');
  if (modal) modal.remove();
}

// ── MARCAR LEÍDO ─────────────────────────────────────────────────────────────
async function marcarLeido(id) {
  try {
    await fetch(`${API}/api/mensajes/${id}/leer`, {
      method: 'PUT',
      headers: { 'X-Usuario-Id': usuario.id }
    });
    const idx = mensajes.findIndex(m => m.id === id);
    if (idx !== -1) mensajes[idx].leido = true;
    renderPanel();
  } catch { /* silencioso */ }
}

// ── MARCAR TODOS LEÍDOS ───────────────────────────────────────────────────────
async function marcarTodosLeidos() {
  try {
    const res = await fetch(`${API}/api/mensajes/leer-todos`, {
      method: 'PUT',
      headers: { 'X-Usuario-Id': usuario.id }
    });
    if (!res.ok) throw new Error();
    mensajes.forEach(m => m.leido = true);
    renderPanel();
  } catch {
    alert('No se pudo completar la acción. Intenta de nuevo.');
  }
}

// ── ELIMINAR MENSAJE ──────────────────────────────────────────────────────────
async function eliminarMensaje(id) {
  if (!confirm('¿Eliminar este mensaje?')) return;
  try {
    const res = await fetch(`${API}/api/mensajes/${id}`, {
      method: 'DELETE',
      headers: { 'X-Usuario-Id': usuario.id }
    });
    if (!res.ok) throw new Error();
    mensajes = mensajes.filter(m => m.id !== id);
    renderPanel();
  } catch {
    alert('No se pudo eliminar. Intenta de nuevo.');
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  try {
    return new Date(fechaStr).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return fechaStr; }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}