# Visitas Académicas UTSJR

Aplicación local para organizar visitas académicas presenciales y virtuales. El frontend carga grupos desde MySQL y guarda las visitas mediante una API de Node.js y Express.

## Requisitos

- Node.js 20 o posterior
- MySQL Server 8.0 o posterior
- MySQL Workbench para administrar la base de datos, si se desea usar una interfaz gráfica

## Instalación

1. Instala las dependencias bloqueadas del proyecto con `npm ci`.
2. Ejecuta `base_datos.sql` desde MySQL Workbench con una cuenta administradora. El script crea el esquema `visitas_universitarias` y carga grupos de ejemplo. Se puede ejecutar de nuevo y no elimina registros.
3. Crea una cuenta local para la aplicación y dale acceso únicamente a su esquema:

   ```sql
   CREATE USER 'visitas_app'@'localhost' IDENTIFIED BY 'elige-una-clave-local';
   GRANT SELECT, INSERT, UPDATE, DELETE ON visitas_universitarias.* TO 'visitas_app'@'localhost';
   ```

4. Copia `.env.example` a `.env` y configura la contraseña de esa cuenta. El archivo `.env` se mantiene fuera de Git.
5. Inicia la aplicación con `npm start` y abre `http://127.0.0.1:3000`.

## Uso

- El indicador superior muestra si el backend está conectado con MySQL.
- Los grupos, programas, tutores y alumnos se cargan desde la base.
- Las visitas se guardan junto con asistencia, modalidad y transporte dentro de una transacción.
- El servidor escucha en `127.0.0.1` por defecto para mantener el acceso en la computadora local.

Cada persona que descargue el repositorio configura su propia instancia de MySQL y su propio archivo `.env`. El repositorio contiene el código y el esquema; no publica la base de datos activa de otra computadora ni sus credenciales.
