from flask import Flask
from flask_cors import CORS
from routes.usuarios    import usuarios_bp
from routes.inventario  import inventario_bp
from routes.solicitudes import solicitudes_bp
from routes.mensajes    import mensajes_bp

app = Flask(__name__)
CORS(app)  # Permite que el frontend HTML se conecte al backend

# Registrar todos los blueprints bajo /api
app.register_blueprint(usuarios_bp,    url_prefix='/api')
app.register_blueprint(inventario_bp,  url_prefix='/api')
app.register_blueprint(solicitudes_bp, url_prefix='/api')
app.register_blueprint(mensajes_bp,    url_prefix='/api')

if __name__ == '__main__':
    print("Servidor Bodega FET corriendo en http://localhost:5000")
    print()
    print("  Rutas disponibles:")
    print("  POST   /api/registro")
    print("  POST   /api/login")
    print("  GET    /api/usuarios              (admin)")
    print("  DELETE /api/usuarios/<id>         (admin)")
    print("  ---")
    print("  GET    /api/inventario            (público)")
    print("  POST   /api/inventario            (admin)")
    print("  PUT    /api/inventario/<id>       (admin)")
    print("  DELETE /api/inventario/<id>       (admin)")
    print("  ---")
    print("  POST   /api/solicitudes           (usuario)")
    print("  GET    /api/solicitudes           (admin)")
    print("  GET    /api/solicitudes/mias      (usuario)")
    print("  PUT    /api/solicitudes/<id>/aprobar   (admin)")
    print("  PUT    /api/solicitudes/<id>/rechazar  (admin)")
    print("  PUT    /api/solicitudes/<id>/devolver  (admin)")
    print("  ---")
    print("  GET    /api/mensajes              (usuario)")
    print("  GET    /api/mensajes/no-leidos    (usuario)")
    print("  PUT    /api/mensajes/<id>/leer    (usuario)")
    print("  PUT    /api/mensajes/leer-todos   (usuario)")
    print("  DELETE /api/mensajes/<id>         (usuario)")
    app.run(debug=True, port=5000)