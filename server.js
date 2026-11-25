const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Ruta de comprobación (útil al desplegar)
app.get("/salud", (req, res) => res.json({ ok: true }));

app.use((req, res) => res.status(404).send("Página no encontrada"));

app.listen(PORT, () => console.log(`Rivervet en http://localhost:${PORT}`));
