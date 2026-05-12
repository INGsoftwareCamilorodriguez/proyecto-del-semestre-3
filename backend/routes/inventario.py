from flask import Blueprint, request, jsonify
import mysql.connector
from config import DB_CONFIG
from functools import wraps

inventario_bp = Blueprint('inventario', __name__)

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

# ── GET /api/inventario  (público) ──────────────────────
@inventario_bp.route('/inventario', methods=['GET'])
def listar_inventario():
    categoria = request.args.get('categoria')
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        if categoria:
            cursor.execute(
                """SELECT id, nombre, descripcion, categoria, cantidad, estado, imagen_url
                   FROM inventario
                   WHERE categoria = %s
                   ORDER BY categoria, nombre""",
                (categoria,)
            )
        else:
            cursor.execute(
                """SELECT id, nombre, descripcion, categoria, cantidad, estado, imagen_url
                   FROM inventario
                   ORDER BY categoria, nombre"""
            )
        items = cursor.fetchall()
        return jsonify({'ok': True, 'inventario': items}), 200
    finally:
        cursor.close(); db.close()

# ── POST /api/inventario  (solo admin) ──────────────────
@inventario_bp.route('/inventario', methods=['POST'])
@solo_admin
def crear_elemento():
    data        = request.get_json()
    nombre      = data.get('nombre', '').strip()
    descripcion = data.get('descripcion', '').strip()
    categoria   = data.get('categoria', '').strip()
    cantidad    = data.get('cantidad', 0)
    estado      = data.get('estado', 'Disponible')
    imagen_url  = data.get('imagen_url', None)

    categorias_validas = ['Fútbol', 'Baloncesto', 'Tenis de Mesa', 'Voleibol', 'General']
    estados_validos    = ['Disponible', 'Agotado', 'Mantenimiento']

    if not nombre:
        return jsonify({'ok': False, 'mensaje': 'El nombre es requerido'}), 400
    if categoria not in categorias_validas:
        return jsonify({'ok': False, 'mensaje': 'Categoría inválida'}), 400
    if estado not in estados_validos:
        return jsonify({'ok': False, 'mensaje': 'Estado inválido'}), 400
    try:
        cantidad = int(cantidad)
        if cantidad < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'ok': False, 'mensaje': 'Cantidad inválida'}), 400

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """INSERT INTO inventario (nombre, descripcion, categoria, cantidad, estado, imagen_url)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (nombre, descripcion, categoria, cantidad, estado, imagen_url)
        )
        db.commit()
        nuevo_id = cursor.lastrowid
        return jsonify({'ok': True, 'mensaje': 'Elemento creado', 'id': nuevo_id}), 201
    finally:
        cursor.close(); db.close()

# ── PUT /api/inventario/<id>  (solo admin) ──────────────
@inventario_bp.route('/inventario/<int:inv_id>', methods=['PUT'])
@solo_admin
def editar_elemento(inv_id):
    data        = request.get_json()
    nombre      = data.get('nombre', '').strip()
    descripcion = data.get('descripcion', '').strip()
    categoria   = data.get('categoria', '').strip()
    cantidad    = data.get('cantidad')
    estado      = data.get('estado', '').strip()
    imagen_url  = data.get('imagen_url', None)

    categorias_validas = ['Fútbol', 'Baloncesto', 'Tenis de Mesa', 'Voleibol', 'General']
    estados_validos    = ['Disponible', 'Agotado', 'Mantenimiento']

    if not nombre:
        return jsonify({'ok': False, 'mensaje': 'El nombre es requerido'}), 400
    if categoria not in categorias_validas:
        return jsonify({'ok': False, 'mensaje': 'Categoría inválida'}), 400
    if estado not in estados_validos:
        return jsonify({'ok': False, 'mensaje': 'Estado inválido'}), 400
    try:
        cantidad = int(cantidad)
        if cantidad < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'ok': False, 'mensaje': 'Cantidad inválida'}), 400

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """UPDATE inventario
               SET nombre=%s, descripcion=%s, categoria=%s,
                   cantidad=%s, estado=%s, imagen_url=%s
               WHERE id=%s""",
            (nombre, descripcion, categoria, cantidad, estado, imagen_url, inv_id)
        )
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({'ok': False, 'mensaje': 'Elemento no encontrado'}), 404
        return jsonify({'ok': True, 'mensaje': 'Elemento actualizado'}), 200
    finally:
        cursor.close(); db.close()

# ── DELETE /api/inventario/<id>  (solo admin) ────────────
@inventario_bp.route('/inventario/<int:inv_id>', methods=['DELETE'])
@solo_admin
def eliminar_elemento(inv_id):
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Verificar si hay solicitudes asociadas a este producto
        cursor.execute(
            """SELECT COUNT(*) as total FROM solicitudes_prestamo
               WHERE inventario_id = %s AND estado IN ('Pendiente', 'Aprobado')""",
            (inv_id,)
        )
        resultado = cursor.fetchone()

        if resultado['total'] > 0:
            return jsonify({
                'ok': False,
                'mensaje': f'No se puede eliminar: hay {resultado["total"]} solicitud(es) activa(s) para este producto. Espera a que sean rechazadas o devueltas.'
            }), 409

        # Si no hay solicitudes activas, eliminar en orden correcto
        # 1) Obtener IDs de solicitudes históricas de este producto
        cursor.execute(
            "SELECT id FROM solicitudes_prestamo WHERE inventario_id = %s",
            (inv_id,)
        )
        solicitudes = cursor.fetchall()
        ids_solicitudes = [s['id'] for s in solicitudes]

        cursor2 = db.cursor()

        # 2) Eliminar mensajes que referencian esas solicitudes
        if ids_solicitudes:
            formato = ','.join(['%s'] * len(ids_solicitudes))
            cursor2.execute(
                f"DELETE FROM mensajes WHERE solicitud_id IN ({formato})",
                ids_solicitudes
            )

        # 3) Eliminar las solicitudes históricas
        cursor2.execute(
            "DELETE FROM solicitudes_prestamo WHERE inventario_id = %s",
            (inv_id,)
        )

        # 4) Eliminar el producto
        cursor2.execute("DELETE FROM inventario WHERE id = %s", (inv_id,))
        db.commit()

        if cursor2.rowcount == 0:
            return jsonify({'ok': False, 'mensaje': 'Elemento no encontrado'}), 404

        return jsonify({'ok': True, 'mensaje': 'Elemento eliminado correctamente'}), 200

    finally:
        cursor.close()
        if 'cursor2' in dir():
            cursor2.close()
        db.close()