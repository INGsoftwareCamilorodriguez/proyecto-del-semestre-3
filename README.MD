# Bodega Deportiva FET

Este es un sistema web para la gestión de la bodega deportiva de la Fundación de Educación Superior del Oriente Colombiano (FET). Permite el registro de usuarios, el inicio de sesión, y un panel de administración desde donde se pueden ver y eliminar usuarios registrados.

El proyecto está dividido en dos partes: un backend construido con Python y Flask, y un frontend en HTML, CSS y JavaScript puro.

---

## Lo que necesitas tener instalado

Antes de correr el proyecto, asegúrate de tener instalado lo siguiente en tu computadora.

**Python 3.10 o superior**
Descárgalo desde https://www.python.org/downloads. Durante la instalación marca la opción "Add Python to PATH".

**MySQL 8.0 o superior**
Puedes descargarlo desde https://dev.mysql.com/downloads/mysql. También puedes usar XAMPP si ya lo tienes, viene con MySQL incluido.

**MySQL Workbench** (opcional pero recomendado)
Es la interfaz gráfica para manejar la base de datos. Descárgalo desde https://dev.mysql.com/downloads/workbench.

**Visual Studio Code**
El editor recomendado para este proyecto. Descárgalo desde https://code.visualstudio.com.

Dentro de VS Code instala la extensión **Live Server** de Ritwick Dey. La encuentras buscándola en el panel de extensiones (Ctrl + Shift + X).

---

## Clonar el repositorio

Abre una terminal y ejecuta:

```
git clone https://github.com/tu-usuario/proyecto-del-semestre-3.git
cd proyecto-del-semestre-3
```

---

## Configurar el backend

Entra a la carpeta del backend:

```
cd backend
```

Instala las dependencias del proyecto con:

```
pip install flask flask-cors mysql-connector-python bcrypt
```

O si el proyecto tiene un archivo requirements.txt:

```
pip install -r requirements.txt
```

Ahora crea el archivo de configuración. En la carpeta backend vas a encontrar un archivo llamado `config.example.py`. Copia ese archivo y renómbralo a `config.py`:

```
copy config.example.py config.py
```

Abre `config.py` y edítalo con los datos de tu MySQL local:

```python
DB_CONFIG = {
    'host':     'localhost',
    'user':     'root',
    'password': 'tu_contraseña_de_mysql',
    'database': 'bodega_fet'
}
```

Si tu MySQL no tiene contraseña (por ejemplo en XAMPP), deja el campo password como cadena vacía.

---

## Crear la base de datos

Abre MySQL Workbench o tu gestor de MySQL preferido y ejecuta el siguiente script completo. Esto crea la base de datos y todas las tablas necesarias:

```sql
CREATE DATABASE IF NOT EXISTS bodega_fet
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bodega_fet;

CREATE TABLE IF NOT EXISTS usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    programa    VARCHAR(100)  NOT NULL,
    codigo      VARCHAR(20)   NOT NULL UNIQUE,
    correo      VARCHAR(100)  NOT NULL UNIQUE,
    contrasena  VARCHAR(255)  NOT NULL,
    tipo        ENUM('Estudiante','Docente','Visitante','Admin') DEFAULT 'Estudiante',
    genero      ENUM('Masculino','Femenino','Otro') DEFAULT NULL,
    activo      TINYINT(1)    DEFAULT 1,
    creado_en   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventario (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100)  NOT NULL,
    categoria   ENUM('Futbol','Tenis de Mesa','General') NOT NULL,
    cantidad    INT           DEFAULT 0,
    estado      ENUM('Disponible','En prestamo','Mantenimiento') DEFAULT 'Disponible',
    creado_en   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prestamos (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id        INT NOT NULL,
    inventario_id     INT NOT NULL,
    fecha_prestamo    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_devolucion  TIMESTAMP NULL,
    estado            ENUM('Activo','Devuelto') DEFAULT 'Activo',
    FOREIGN KEY (usuario_id)    REFERENCES usuarios(id)   ON DELETE CASCADE,
    FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registros_deportivos (
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

El administrador no se crea desde el formulario de registro. Tienes que crearlo directamente en la base de datos siguiendo estos pasos.

Primero genera el hash de la contraseña que quieras usar. Crea un archivo temporal llamado `generar_hash.py` dentro de la carpeta backend con este contenido:

```python
import bcrypt

pw = "Admin123!"  # cambia esto por la contraseña que quieras
hash_pw = bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
print(hash_pw)
```

Ejecútalo desde la terminal:

```
python generar_hash.py
```

Copia el resultado que aparece en la terminal. Luego ve a MySQL Workbench y ejecuta este INSERT, reemplazando el hash con el que copiaste:

```sql
USE bodega_fet;

INSERT INTO usuarios (nombre, programa, codigo, correo, contrasena, tipo)
VALUES (
  'Administrador FET',
  'Administracion',
  'ADMIN001',
  'admin@fet.edu.co',
  '$2b$12$AQUI_VA_EL_HASH_QUE_GENERASTE',
  'Admin'
);
```

Puedes verificar que quedó bien con:

```sql
SELECT id, nombre, correo, tipo FROM usuarios WHERE tipo = 'Admin';
```

Debe aparecer una fila con el administrador. Después de esto puedes borrar el archivo `generar_hash.py`.

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

Deja esa terminal abierta. El backend debe estar corriendo todo el tiempo que uses la aplicación.

Ahora abre VS Code, busca el archivo `inicio_pagina/inicio.html`, haz clic derecho sobre él y selecciona "Open with Live Server". Eso abre el frontend en el navegador en una dirección como `http://127.0.0.1:5500`.

---

## Credenciales del administrador por defecto

Estas son las credenciales con las que puedes ingresar al panel de administración, a menos que hayas usado datos distintos al crear el administrador:

```
Correo:     admin@fet.edu.co
Contraseña: Admin123!
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

## Notas importantes

El archivo `config.py` nunca debe subirse al repositorio porque contiene datos sensibles como la contraseña de tu base de datos. Ya está en el `.gitignore` del proyecto para evitar esto.

Si al correr el proyecto ves un error de conexion a la base de datos, revisa que MySQL esté corriendo y que los datos en `config.py` sean correctos.

Si usas XAMPP, asegúrate de que el servicio de MySQL esté activo desde el panel de control de XAMPP antes de correr el backend.