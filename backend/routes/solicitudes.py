from flask import Blueprint, request, jsonify
import mysql.connector
from config import DB_CONFIG
from functools import wraps
from datetime import datetime

solicitudes_bp = Blueprint('solicitudes', __name__)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

# ── Decorator: solo admin ─────────────────────────────
def solo_admin(f):
    @wraps(f)
    def decorador(*args, **kwargs):
        admin_id = request.headers.get('X-Admin-Id')
        if not admin_id:
            return jsonify({'ok': False, 'mensaje': 'No autorizado'}), 401
        try:
            db = get_db()
            cursor = db.cursor(dictionary=True)
            cursor.execute("SELECT tipo FROM usuarios WHERE id = %s AND activo = 1", (admin_id,))
            usuario = cursor.fetchone()
            cursor.close(); db.close()
        except Exception:
            return jsonify({'ok': False, 'mensaje': 'Error del servidor'}), 500
        if not usuario or usuario['tipo'] != 'Admin':
            return jsonify({'ok': False, 'mensaje': 'Acceso denegado'}), 403
        return f(*args, **kwargs)
    return decorador

# ── Decorator: usuario autenticado ───────────────────
def usuario_autenticado(f):
    @wraps(f)
    def decorador(*args, **kwargs):
        usuario_id = request.headers.get('X-Usuario-Id')
        if not usuario_id:
            return jsonify({'ok': False, 'mensaje': 'No autorizado'}), 401
        try:
            db = get_db()
            cursor = db.cursor(dictionary=True)
            cursor.execute("SELECT id FROM usuarios WHERE id = %s AND activo = 1", (usuario_id,))
            u = cursor.fetchone()
            cursor.close(); db.close()
        except Exception:
            return jsonify({'ok': False, 'mensaje': 'Error del servidor'}), 500
        if not u:
            return jsonify({'ok': False, 'mensaje': 'Sesión inválida'}), 401
        return f(*args, **kwargs)
    return decorador

# ─────────────────────────────────────────────────────
#  RUTAS DE USUARIO
# ─────────────────────────────────────────────────────

# ── POST /api/solicitudes  (usuario crea una solicitud) ──
@solicitudes_bp.route('/solicitudes', methods=['POST'])
@usuario_autenticado
def crear_solicitud():
    data                = request.get_json()
    usuario_id          = request.headers.get('X-Usuario-Id')
    inventario_id       = data.get('inventario_id')
    cantidad_solicitada = data.get('cantidad_solicitada', 1)
    tipo_usuario        = data.get('tipo_usuario', 'Estudiante')

    if not inventario_id:
        return jsonify({'ok': False, 'mensaje': 'Debes seleccionar un producto'}), 400

    tipos_validos = ['Estudiante', 'Docente', 'Visitante']
    if tipo_usuario not in tipos_validos:
        return jsonify({'ok': False, 'mensaje': 'Tipo de usuario inválido'}), 400

    try:
        cantidad_solicitada = int(cantidad_solicitada)
        if cantidad_solicitada < 1:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'ok': False, 'mensaje': 'Cantidad inválida'}), 400

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Verificar que el producto existe y hay stock suficiente
        cursor.execute(
            "SELECT id, nombre, cantidad, estado FROM inventario WHERE id = %s",
            (inventario_id,)
        )
        producto = cursor.fetchone()
        if not producto:
            return jsonify({'ok': False, 'mensaje': 'Producto no encontrado'}), 404
        if producto['estado'] != 'Disponible' or producto['cantidad'] < cantidad_solicitada:
            return jsonify({'ok': False, 'mensaje': 'No hay suficiente stock disponible'}), 400

        # Verificar que el usuario no tenga ya una solicitud pendiente del mismo producto
        cursor.execute(
            """SELECT id FROM solicitudes_prestamo
               WHERE usuario_id = %s AND inventario_id = %s AND estado = 'Pendiente'""",
            (usuario_id, inventario_id)
        )
        if cursor.fetchone():
            return jsonify({'ok': False, 'mensaje': 'Ya tienes una solicitud pendiente para este producto'}), 409

        # Crear la solicitud
        cursor2 = db.cursor()
        cursor2.execute(
            """INSERT INTO solicitudes_prestamo
               (usuario_id, inventario_id, cantidad_solicitada, tipo_usuario, estado)
               VALUES (%s, %s, %s, %s, 'Pendiente')""",
            (usuario_id, inventario_id, cantidad_solicitada, tipo_usuario)
        )
        db.commit()
        solicitud_id = cursor2.lastrowid
        return jsonify({
            'ok': True,
            'mensaje': f'Solicitud enviada para "{producto["nombre"]}". El administrador la revisará pronto.',
            'solicitud_id': solicitud_id
        }), 201
    finally:
        cursor.close()
        if 'cursor2' in dir():
            cursor2.close()
        db.close()

# ── GET /api/solicitudes/mias  (solicitudes del usuario logueado) ──
@solicitudes_bp.route('/solicitudes/mias', methods=['GET'])
@usuario_autenticado
def mis_solicitudes():
    usuario_id = request.headers.get('X-Usuario-Id')
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            """SELECT s.id, s.estado, s.cantidad_solicitada, s.tipo_usuario,
                      s.mensaje_admin, s.fecha_solicitud, s.fecha_respuesta,
                      i.nombre AS producto_nombre, i.categoria
               FROM solicitudes_prestamo s
               JOIN inventario i ON i.id = s.inventario_id
               WHERE s.usuario_id = %s
               ORDER BY s.fecha_solicitud DESC""",
            (usuario_id,)
        )
        solicitudes = cursor.fetchall()
        # Convertir fechas a string para JSON
        for s in solicitudes:
            if s['fecha_solicitud']:
                s['fecha_solicitud'] = s['fecha_solicitud'].strftime('%Y-%m-%d %H:%M')
            if s['fecha_respuesta']:
                s['fecha_respuesta'] = s['fecha_respuesta'].strftime('%Y-%m-%d %H:%M')
        return jsonify({'ok': True, 'solicitudes': solicitudes}), 200
    finally:
        cursor.close(); db.close()

# ─────────────────────────────────────────────────────
#  RUTAS DE ADMIN
# ─────────────────────────────────────────────────────

# ── GET /api/solicitudes  (admin ve TODAS las solicitudes) ──
@solicitudes_bp.route('/solicitudes', methods=['GET'])
@solo_admin
def listar_solicitudes():
    estado = request.args.get('estado')  # filtro opcional: Pendiente/Aprobado/Rechazado
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        if estado:
            cursor.execute(
                """SELECT * FROM v_solicitudes WHERE estado = %s
                   ORDER BY fecha_solicitud DESC""",
                (estado,)
            )
        else:
            cursor.execute(
                "SELECT * FROM v_solicitudes ORDER BY fecha_solicitud DESC"
            )
        solicitudes = cursor.fetchall()
        for s in solicitudes:
            if s['fecha_solicitud']:
                s['fecha_solicitud'] = s['fecha_solicitud'].strftime('%Y-%m-%d %H:%M')
            if s.get('fecha_respuesta'):
                s['fecha_respuesta'] = s['fecha_respuesta'].strftime('%Y-%m-%d %H:%M')
        return jsonify({'ok': True, 'solicitudes': solicitudes}), 200
    finally:
        cursor.close(); db.close()

# ── PUT /api/solicitudes/<id>/aprobar  (admin aprueba) ───
@solicitudes_bp.route('/solicitudes/<int:sol_id>/aprobar', methods=['PUT'])
@solo_admin
def aprobar_solicitud(sol_id):
    admin_id = request.headers.get('X-Admin-Id')
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Verificar que la solicitud existe y está pendiente
        cursor.execute(
            """SELECT s.*, i.nombre AS producto_nombre, u.nombre AS usuario_nombre
               FROM solicitudes_prestamo s
               JOIN inventario i ON i.id = s.inventario_id
               JOIN usuarios u ON u.id = s.usuario_id
               WHERE s.id = %s AND s.estado = 'Pendiente'""",
            (sol_id,)
        )
        solicitud = cursor.fetchone()
        if not solicitud:
            return jsonify({'ok': False, 'mensaje': 'Solicitud no encontrada o ya fue procesada'}), 404

        # Verificar stock actual
        cursor.execute(
            "SELECT cantidad FROM inventario WHERE id = %s",
            (solicitud['inventario_id'],)
        )
        inv = cursor.fetchone()
        if not inv or inv['cantidad'] < solicitud['cantidad_solicitada']:
            return jsonify({'ok': False, 'mensaje': 'Stock insuficiente para aprobar'}), 400

        # Aprobar la solicitud (el trigger descuenta el stock automáticamente)
        cursor2 = db.cursor()
        cursor2.execute(
            """UPDATE solicitudes_prestamo
               SET estado = 'Aprobado', admin_id = %s, fecha_respuesta = NOW()
               WHERE id = %s""",
            (admin_id, sol_id)
        )

        # Crear mensaje para el usuario
        cursor2.execute(
            """INSERT INTO mensajes (usuario_id, solicitud_id, asunto, cuerpo, tipo)
               VALUES (%s, %s, %s, %s, 'Aprobado')""",
            (
                solicitud['usuario_id'],
                sol_id,
                f'✅ Solicitud aprobada: {solicitud["producto_nombre"]}',
                f'Hola {solicitud["usuario_nombre"]}, tu solicitud de {solicitud["cantidad_solicitada"]} '
                f'unidad(es) de "{solicitud["producto_nombre"]}" ha sido APROBADA. '
                f'Puedes pasar a recogerla en la bodega deportiva FET.'
            )
        )
        db.commit()
        return jsonify({'ok': True, 'mensaje': 'Solicitud aprobada correctamente'}), 200
    finally:
        cursor.close()
        if 'cursor2' in dir():
            cursor2.close()
        db.close()

# ── PUT /api/solicitudes/<id>/rechazar  (admin rechaza) ──
@solicitudes_bp.route('/solicitudes/<int:sol_id>/rechazar', methods=['PUT'])
@solo_admin
def rechazar_solicitud(sol_id):
    admin_id = request.headers.get('X-Admin-Id')
    data     = request.get_json()
    mensaje_admin = data.get('mensaje', '').strip()

    if not mensaje_admin:
        return jsonify({'ok': False, 'mensaje': 'Debes escribir el motivo del rechazo'}), 400

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """SELECT s.*, i.nombre AS producto_nombre, u.nombre AS usuario_nombre
               FROM solicitudes_prestamo s
               JOIN inventario i ON i.id = s.inventario_id
               JOIN usuarios u ON u.id = s.usuario_id
               WHERE s.id = %s AND s.estado = 'Pendiente'""",
            (sol_id,)
        )
        solicitud = cursor.fetchone()
        if not solicitud:
            return jsonify({'ok': False, 'mensaje': 'Solicitud no encontrada o ya fue procesada'}), 404

        cursor2 = db.cursor()
        cursor2.execute(
            """UPDATE solicitudes_prestamo
               SET estado = 'Rechazado', admin_id = %s,
                   mensaje_admin = %s, fecha_respuesta = NOW()
               WHERE id = %s""",
            (admin_id, mensaje_admin, sol_id)
        )

        # Mensaje al usuario con el motivo del rechazo
        cursor2.execute(
            """INSERT INTO mensajes (usuario_id, solicitud_id, asunto, cuerpo, tipo)
               VALUES (%s, %s, %s, %s, 'Rechazado')""",
            (
                solicitud['usuario_id'],
                sol_id,
                f'❌ Solicitud rechazada: {solicitud["producto_nombre"]}',
                f'Hola {solicitud["usuario_nombre"]}, tu solicitud de "{solicitud["producto_nombre"]}" '
                f'fue RECHAZADA por el siguiente motivo:\n\n"{mensaje_admin}"\n\n'
                f'Si tienes dudas, comunícate con la bodega deportiva FET.'
            )
        )
        db.commit()
        return jsonify({'ok': True, 'mensaje': 'Solicitud rechazada'}), 200
    finally:
        cursor.close()
        if 'cursor2' in dir():
            cursor2.close()
        db.close()

# ── PUT /api/solicitudes/<id>/devolver  (admin marca devuelto) ──
@solicitudes_bp.route('/solicitudes/<int:sol_id>/devolver', methods=['PUT'])
@solo_admin
def marcar_devuelto(sol_id):
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT id FROM solicitudes_prestamo WHERE id = %s AND estado = 'Aprobado'",
            (sol_id,)
        )
        if not cursor.fetchone():
            return jsonify({'ok': False, 'mensaje': 'Solicitud no encontrada o no está activa'}), 404

        cursor2 = db.cursor()
        cursor2.execute(
            """UPDATE solicitudes_prestamo
               SET estado = 'Devuelto', fecha_devolucion = NOW()
               WHERE id = %s""",
            (sol_id,)
        )
        db.commit()
        return jsonify({'ok': True, 'mensaje': 'Préstamo marcado como devuelto'}), 200
    finally:
        cursor.close()
        if 'cursor2' in dir():
            cursor2.close()
        db.close()