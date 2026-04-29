from flask import Flask
from flask_cors import CORS
from routes.usuarios import usuarios_bp

app = Flask(__name__)
CORS(app)  # Permite que el frontend HTML se conecte al backend

app.register_blueprint(usuarios_bp, url_prefix='/api')

if __name__ == '__main__':
    print(" Servidor Bodega FET corriendo en http://localhost:5000")
    app.run(debug=True, port=5000)