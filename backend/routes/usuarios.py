from flask import Blueprint, request, jsonify
import mysql.connector
import bcrypt
import re
from config import DB_CONFIG

usuarios_bp = Blueprint('usuarios', __name__)

# ── Conexión a la BD ──────────────────────────────────────
def get_db():
    return mysql.connector.connect(**DB_CONFIG)

# ── Validaciones ──────────────────────────────────────────
def validar_nombre(v):
    return bool(re.match(r'^[A-Za-záéíóúÁÉÍÓÚñÑ\s]{3,100}$', v.strip()))

def validar_programa(v):
    return bool(re.match(r'^[A-Za-záéíóúÁÉÍÓÚñÑ\s]{3,100}$', v.strip()))

def validar_codigo(v):
    return bool(re.match(r'^[A-Za-z0-9]{4,20}$', v.strip()))

def validar_correo(v):
    return bool(re.match(r'^[\w\.-]+@[\w\.-]+\.\w{2,}$', v.strip()))

def validar_contrasena(v):
    if len(v) < 8:
        return False
    if not re.search(r'\d', v):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-]', v):
        return False
    return True

# ── POST /api/registro ────────────────────────────────────
@usuarios_bp.route('/registro', methods=['POST'])
def registrar_usuario():
    data = request.get_json()

    nombre    = data.get('nombre', '').strip()
    programa  = data.get('programa', '').strip()
    codigo    = data.get('codigo', '').strip()
    correo    = data.get('correo', '').strip()
    contrasena = data.get('contrasena', '')

    # Validar campos
    errores = {}
    if not validar_nombre(nombre):
        errores['nombre'] = 'Solo letras y espacios, mínimo 3 caracteres'
    if not validar_programa(programa):
        errores['programa'] = 'Solo letras y espacios, mínimo 3 caracteres'
    if not validar_codigo(codigo):
        errores['codigo'] = 'Solo letras y números, entre 4 y 20 caracteres'
    if not validar_correo(correo):
        errores['correo'] = 'Debe ser un correo válido (ej: nombre@fet.edu.co)'
    if not validar_contrasena(contrasena):
        errores['contrasena'] = 'Mínimo 8 caracteres, 1 número y 1 carácter especial'

    if errores:
        return jsonify({'ok': False, 'errores': errores}), 400

    # Encriptar contraseña
    hash_pw = bcrypt.hashpw(contrasena.encode('utf-8'), bcrypt.gensalt())

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            """INSERT INTO usuarios (nombre, programa, codigo, correo, contrasena)
               VALUES (%s, %s, %s, %s, %s)""",
            (nombre, programa, codigo, correo, hash_pw.decode('utf-8'))
        )
        db.commit()
        return jsonify({'ok': True, 'mensaje': 'Usuario registrado exitosamente'}), 201

    except mysql.connector.errors.IntegrityError:
        return jsonify({'ok': False, 'errores': {
            'general': 'El código o correo ya está registrado'
        }}), 409
    finally:
        cursor.close()
        db.close()

# ── POST /api/login ───────────────────────────────────────
@usuarios_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    correo    = data.get('correo', '').strip()
    contrasena = data.get('contrasena', '')

    if not correo or not contrasena:
        return jsonify({'ok': False, 'mensaje': 'Correo y contraseña requeridos'}), 400

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM usuarios WHERE correo = %s AND activo = 1", (correo,)
        )
        usuario = cursor.fetchone()

        if not usuario:
            return jsonify({'ok': False, 'mensaje': 'Correo o contraseña incorrectos'}), 401

        # Verificar contraseña
        pw_valida = bcrypt.checkpw(
            contrasena.encode('utf-8'),
            usuario['contrasena'].encode('utf-8')
        )

        if not pw_valida:
            return jsonify({'ok': False, 'mensaje': 'Correo o contraseña incorrectos'}), 401

        # Respuesta sin la contraseña
        return jsonify({
            'ok': True,
            'usuario': {
                'id':      usuario['id'],
                'nombre':  usuario['nombre'],
                'correo':  usuario['correo'],
                'tipo':    usuario['tipo'],
                'programa': usuario['programa'],
                'codigo':  usuario['codigo']
            }
        }), 200

    finally:
        cursor.close()
        db.close()

# ── GET /api/usuarios ─────────────────────────────────────
@usuarios_bp.route('/usuarios', methods=['GET'])
def listar_usuarios():
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            """SELECT id, nombre, programa, codigo, correo, tipo, genero
               FROM usuarios WHERE activo = 1
               ORDER BY creado_en DESC"""
        )
        usuarios = cursor.fetchall()
        return jsonify({'ok': True, 'usuarios': usuarios}), 200
    finally:
        cursor.close()
        db.close()

# ── DELETE /api/usuarios/<id> ─────────────────────────────
@usuarios_bp.route('/usuarios/<int:uid>', methods=['DELETE'])
def eliminar_usuario(uid):
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("UPDATE usuarios SET activo = 0 WHERE id = %s", (uid,))
        db.commit()
        return jsonify({'ok': True, 'mensaje': 'Usuario eliminado'}), 200
    finally:
        cursor.close()
        db.close()