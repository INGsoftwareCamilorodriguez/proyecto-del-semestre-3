# Bodega Deportiva FET

Este es un proyecto web para la gestión de la bodega deportiva de la Fundación Escuela Tecnologica de Neiva (FET). Permite el registro de usuarios, el inicio de sesión, y un panel de administración desde donde se pueden ver y eliminar usuarios registrados.

El proyecto está dividido en dos partes: un backend construido con Python y Flask, y un frontend en HTML, CSS y JavaScript puro.

---

## Lo que necesitas tener instalado

para el funcionamiento de este proyecto necesita las siguientes herramientas

Python 3.10: se descárga de https://www.python.org/downloads

MySQL 8.0: se descárga de https://dev.mysql.com/downloads/mysql. 

XAMPP 8.3.12: se descárga de https://www.apachefriends.org/es/download.html

MySQL Workbench: se descárga de https://dev.mysql.com/downloads/workbench.

---

## Configurar el backend

para el backend se crea un archivo donde esta todo el backend del proyecto. Y el archivo se llama backend, a continuacion como debe configurar desde la terminal de:

1. primero se determina la ubicacion del la descarga del frameword:

```
cd backend
```

2. se instala las dependencias del proyecto con:

```
pip install flask flask-cors mysql-connector-python bcrypt
```

se tiene que crear un archivo para colocar los datos de mysql `config.py`: y edítalo con los datos de tu mysql local:

```
DB_CONFIG = {
    'host':     'localhost',
    'user':     'root',
    'password': '',
    'database': 'bodega_fet'
}
```
---

## Crear la base de datos

en mysql workbench crea un script para crea la base de datos y este es el codigo:

```sql
CREATE DATABASE bodega_fet
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bodega_fet;

CREATE TABLE usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    programa    VARCHAR(100)  NOT NULL,
    codigo      VARCHAR(20)   NOT NULL UNIQUE,
    correo      VARCHAR(100)  NOT NULL UNIQUE,
    contrasena  VARCHAR(255)  NOT NULL,
    tipo        ENUM('Estudiante','Docente','Visitante','Admin') DEFAULT 'Estudiante',
    activo      TINYINT(1)    DEFAULT 1,
    creado_en   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventario (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    categoria   ENUM('Futbol','Tenis de Mesa','General') NOT NULL,
    cantidad    INT           DEFAULT 0,
    estado      ENUM('Disponible','En prestamo','Mantenimiento') DEFAULT 'Disponible',
    creado_en   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prestamos (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id        INT NOT NULL,
    inventario_id     INT NOT NULL,
    fecha_prestamo    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_devolucion  TIMESTAMP NULL,
    estado            ENUM('Activo','Devuelto') DEFAULT 'Activo',
    FOREIGN KEY (usuario_id)    REFERENCES usuarios(id)   ON DELETE CASCADE,
    FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE CASCADE
);

CREATE TABLE registros_deportivos (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT NOT NULL,
    deporte         ENUM('Futbol','Tenis de Mesa') NOT NULL,
    datos_extra     JSON,
    fecha_registro  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

---

## Crear el usuario administrador

en el caso del administrador no se creo desde el formulario de registro se crea en la base de datos

primero genera el hash de la contraseña que quieras usar. Crea un archivo temporal llamado `generar_hash.py` ahi dentro se tiene que colocar:

```python
import bcrypt

pw = "Admin123!"  # aqui se cambia la focking contraseña
hash_pw = bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
print(hash_pw)
```
despues se ejecuta esto:
```
python generar_hash.py
```

la contraseña cifrada que salio en la terminal se debe modificar en el msyql con el siguiente comando

```sql
USE bodega_fet;

INSERT INTO usuarios (nombre, programa, codigo, correo, contrasena, tipo)
VALUES (
  'Administrador FET',
  'Administracion',
  'ADMIN001',
  'admin@fet.edu.co',
  'aca se debe colocar la focking contraseña cifrada',
  'Admin'
);
```

y pues para verificar es con este comando:

```sql
SELECT id, nombre, correo, tipo FROM usuarios WHERE tipo = 'Admin';
```
---

## Correr el proyecto

Abre una terminal, entra a la carpeta backend y arranca el servidor:

```
cd backend
python app.py
```

Debes ver algo como esto:

```
Servidor Bodega FET corriendo en http://localhost:5000
```

pero siempre y cuando el xampp este prendido, el xampp tiene que estar 

```
mysql start 3306
```


---

## Estructura del proyecto

```
proyecto-del-semestre-3/
    backend/
        routes/
            usuarios.py       rutas de la API
        app.py                servidor principal Flask
        config.py             configuracion de la BD (no se sube al repo)
        config.example.py     plantilla de configuracion
    dashboard/
        panel_admin.html      panel de administracion
        script2.js            logica del panel
        style2.css            estilos del panel
    inicio_pagina/
        inicio.html           pagina de inicio
    inicio_de_usuario_y_registro/
        index.html            formulario de login y registro
    formulario_producto/      formularios deportivos
    README.md
```

---

## una cosa importante

El archivo `config.py`, `.pyc`, `generar_hash.py` no se debe subir al repositorio porque contiene informacion delicata y inesesaria para el repo

para eso se crea el `.gitignore` y la estructura del `.gitignore` es la siguiente":

```
# Python
__pycache__/
*.pyc

# Archivos sensibles
backend/config.py
backend/generar_hash.py

# VS Code
.vscode/

# Sistema operativo
Thumbs.db
.DS_Store
```