from flask import Blueprint, request, jsonify
import mysql.connector
from config import DB_CONFIG
from functools import wraps

mensajes_bp = Blueprint('mensajes', __name__)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

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

# ── GET /api/mensajes  (todos los mensajes del usuario) ──
@mensajes_bp.route('/mensajes', methods=['GET'])
@usuario_autenticado
def listar_mensajes():
    usuario_id = request.headers.get('X-Usuario-Id')
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            """SELECT id, asunto, cuerpo, tipo, leido, creado_en
               FROM mensajes
               WHERE usuario_id = %s
               ORDER BY creado_en DESC""",
            (usuario_id,)
        )
        mensajes = cursor.fetchall()
        for m in mensajes:
            if m['creado_en']:
                m['creado_en'] = m['creado_en'].strftime('%Y-%m-%d %H:%M')
        return jsonify({'ok': True, 'mensajes': mensajes}), 200
    finally:
        cursor.close(); db.close()

# ── GET /api/mensajes/no-leidos  (contador para el badge) ──
@mensajes_bp.route('/mensajes/no-leidos', methods=['GET'])
@usuario_autenticado
def contar_no_leidos():
    usuario_id = request.headers.get('X-Usuario-Id')
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT total_no_leidos FROM v_mensajes_no_leidos WHERE usuario_id = %s",
            (usuario_id,)
        )
        fila = cursor.fetchone()
        total = fila['total_no_leidos'] if fila else 0
        return jsonify({'ok': True, 'no_leidos': total}), 200
    finally:
        cursor.close(); db.close()

# ── PUT /api/mensajes/<id>/leer  (marcar un mensaje como leído) ──
@mensajes_bp.route('/mensajes/<int:msg_id>/leer', methods=['PUT'])
@usuario_autenticado
def marcar_leido(msg_id):
    usuario_id = request.headers.get('X-Usuario-Id')
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE mensajes SET leido = 1 WHERE id = %s AND usuario_id = %s",
            (msg_id, usuario_id)
        )
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({'ok': False, 'mensaje': 'Mensaje no encontrado'}), 404
        return jsonify({'ok': True}), 200
    finally:
        cursor.close(); db.close()

# ── PUT /api/mensajes/leer-todos  (marcar todos como leídos) ──
@mensajes_bp.route('/mensajes/leer-todos', methods=['PUT'])
@usuario_autenticado
def marcar_todos_leidos():
    usuario_id = request.headers.get('X-Usuario-Id')
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "UPDATE mensajes SET leido = 1 WHERE usuario_id = %s AND leido = 0",
            (usuario_id,)
        )
        db.commit()
        return jsonify({'ok': True, 'actualizados': cursor.rowcount}), 200
    finally:
        cursor.close(); db.close()

# ── DELETE /api/mensajes/<id>  (eliminar un mensaje) ─────
@mensajes_bp.route('/mensajes/<int:msg_id>', methods=['DELETE'])
@usuario_autenticado
def eliminar_mensaje(msg_id):
    usuario_id = request.headers.get('X-Usuario-Id')
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "DELETE FROM mensajes WHERE id = %s AND usuario_id = %s",
            (msg_id, usuario_id)
        )
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({'ok': False, 'mensaje': 'Mensaje no encontrado'}), 404
        return jsonify({'ok': True, 'mensaje': 'Mensaje eliminado'}), 200
    finally:
        cursor.close(); db.close()