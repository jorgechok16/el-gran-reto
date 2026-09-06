# EL GRAN RETO — JAVIER & DANI

Web normal (no app) con registro/inicio de sesión y cuentas guardadas en PostgreSQL.

## La opción sencilla: Render

Este proyecto incluye `render.yaml` para crear el servidor Node.js y una base de datos PostgreSQL desde Render.

### 1. Subir el proyecto a GitHub

Crea un repositorio privado en GitHub y sube **el contenido de esta carpeta** (no el ZIP dentro de otro ZIP).

Estructura:

- `server.js`
- `package.json`
- `render.yaml`
- `public/index.html`
- `.env.example`
- `README.md`

### 2. Crear el servicio en Render

En Render: **New → Blueprint** y selecciona el repositorio de GitHub.

Render leerá `render.yaml` y creará:

- un Web Service Node.js para el juego;
- una base de datos PostgreSQL;
- `DATABASE_URL` conectada automáticamente;
- `JWT_SECRET` generado automáticamente.

Comandos configurados:

- Build: `npm install`
- Start: `npm start`

### 3. Comprobar el juego

Render te dará una dirección parecida a:

`https://el-gran-reto.onrender.com`

Ábrela y prueba:

1. Crear una cuenta.
2. Cerrar sesión.
3. Volver a iniciar sesión.
4. Abrir la web desde otro dispositivo.

### 4. Conectar el dominio elgranreto.com

En el servicio de Render abre **Settings → Custom Domains → Add Custom Domain** y añade:

`elgranreto.com`

Render indicará los registros DNS exactos que debes poner en el proveedor donde compraste el dominio. Render gestiona automáticamente el certificado TLS y redirige HTTP a HTTPS.

También puedes añadir `www.elgranreto.com`; Render gestiona la redirección correspondiente.

### 5. Base de datos

La tabla `users` se crea automáticamente al arrancar el servidor. Las contraseñas no se guardan en texto plano: se almacenan mediante bcrypt.

## Importante sobre el plan gratuito

Los recursos gratuitos de Render sirven para probar el proyecto, pero tienen limitaciones y el PostgreSQL gratuito tiene una caducidad indicada por Render. Para una web que quieras mantener permanentemente, revisa el plan de pago antes de ponerla como servicio definitivo.

## Seguridad

No subas `.env` ni contraseñas al repositorio. `JWT_SECRET` se genera y se guarda como variable de entorno en Render.
