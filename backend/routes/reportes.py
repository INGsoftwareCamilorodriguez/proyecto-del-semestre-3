from flask import Blueprint, request, jsonify
import mysql.connector
from config import DB_CONFIG
from functools import wraps

reportes_bp = Blueprint('reportes', __name__)

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

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

@reportes_bp.route('/reportes/usuarios-por-tipo', methods=['GET'])
@solo_admin
def usuarios_por_tipo():
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            """SELECT tipo, COUNT(*) AS total
               FROM usuarios
               WHERE activo = 1 AND tipo != 'Admin'
               GROUP BY tipo"""
        )
        filas = cursor.fetchall()
        resultado = {'Estudiante': 0, 'Docente': 0, 'Visitante': 0}
        for f in filas:
            if f['tipo'] in resultado:
                resultado[f['tipo']] = f['total']
        return jsonify({'ok': True, 'data': resultado}), 200
    finally:
        cursor.close(); db.close()

@reportes_bp.route('/reportes/solicitudes-por-categoria', methods=['GET'])
@solo_admin
def solicitudes_por_categoria():
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            """SELECT i.categoria, COUNT(*) AS total
               FROM solicitudes_prestamo s
               JOIN inventario i ON i.id = s.inventario_id
               GROUP BY i.categoria
               ORDER BY total DESC"""
        )
        filas = cursor.fetchall()
        resultado = {'Fútbol': 0, 'Baloncesto': 0, 'Tenis de Mesa': 0, 'Voleibol': 0, 'General': 0}
        for f in filas:
            cat = f['categoria']
            if cat in resultado:
                resultado[cat] = f['total']
        return jsonify({'ok': True, 'data': resultado}), 200
    finally:
        cursor.close(); db.close()

@reportes_bp.route('/reportes/solicitudes-por-mes', methods=['GET'])
@solo_admin
def solicitudes_por_mes():
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            """SELECT MONTH(fecha_solicitud) AS mes, COUNT(*) AS total
               FROM solicitudes_prestamo
               WHERE YEAR(fecha_solicitud) = YEAR(CURDATE())
               GROUP BY mes
               ORDER BY mes"""
        )
        filas = cursor.fetchall()
        meses = [0] * 12
        for f in filas:
            meses[f['mes'] - 1] = f['total']
        return jsonify({'ok': True, 'data': meses}), 200
    finally:
        cursor.close(); db.close()