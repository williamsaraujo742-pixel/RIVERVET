# Rivervet web

1. Instala Node.js (versión 18 o superior): https://nodejs.org
2. En esta carpeta, ejecuta:
   npm install
   npm start
3. Abre http://localhost:3000

El panel de gestión está en http://localhost:3000/panel.html. Los datos se guardan
en memoria y se pierden al reiniciar el servidor.

Cambiar el WhatsApp: edita las dos primeras líneas de public/app.js.
Estructura: server.js (Express), public/index.html, public/panel.html, public/panel.js,
public/styles.css, public/app.js, public/img/.
