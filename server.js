const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

let pacientes = [];   // { id, mascota, dueno, telefono }
let citas = [];       // { id, pacienteId, fecha, hora, motivo, estado }
let atenciones = [];  // { id, pacienteId, fecha, diagnostico, tratamiento }
let nextId = 1;

app.use(express.json());

// TODO: agregar autenticación antes de usar el panel con datos reales.

// Pacientes
app.get("/api/pacientes", (req, res) => res.json(pacientes));
app.post("/api/pacientes", (req, res) => {
  const { mascota, dueno, telefono } = req.body || {};
  const mascotaLimpia = typeof mascota === "string" ? mascota.trim() : "";
  const duenoLimpio = typeof dueno === "string" ? dueno.trim() : "";
  const telefonoLimpio = telefono ? String(telefono).trim() : "";
  if (!mascotaLimpia || !duenoLimpio || !telefonoLimpio)
    return res.status(400).json({ error: "Completa mascota, dueño y teléfono." });
  if (!/^\d{9}$/.test(telefonoLimpio))
    return res.status(400).json({ error: "El teléfono debe tener 9 dígitos." });
  const p = {
    id: nextId++,
    mascota: mascotaLimpia,
    dueno: duenoLimpio,
    telefono: telefonoLimpio,
  };
  pacientes.push(p);
  res.status(201).json(p);
});

// Citas
app.get("/api/citas", (req, res) => res.json(citas));
app.post("/api/citas", (req, res) => {
  const { pacienteId, fecha, hora, motivo } = req.body || {};
  if (pacienteId === undefined || pacienteId === null || pacienteId === "" ||
      typeof fecha !== "string" || !fecha.trim() ||
      typeof hora !== "string" || !hora.trim())
    return res.status(400).json({ error: "Completa paciente, fecha y hora." });
  const idPaciente = Number(pacienteId);
  if (!pacientes.some((p) => p.id === idPaciente))
    return res.status(404).json({ error: "El paciente no existe." });
  if (citas.some((c) => c.fecha === fecha && c.hora === hora && c.estado !== "cancelada"))
    return res.status(409).json({ error: "Ese horario ya está ocupado." });
  const c = {
    id: nextId++,
    pacienteId: idPaciente,
    fecha,
    hora,
    motivo: motivo || "",
    estado: "pendiente",
  };
  citas.push(c);
  res.status(201).json(c);
});
app.patch("/api/citas/:id", (req, res) => {
  const c = citas.find((x) => x.id === Number(req.params.id));
  if (!c) return res.status(404).json({ error: "No encontrada" });
  const estados = ["pendiente", "confirmada", "atendida", "cancelada"];
  const { estado } = req.body || {};
  if (!estados.includes(estado))
    return res.status(400).json({ error: "El estado no es válido." });
  c.estado = estado;
  res.json(c);
});

// Historial
app.get("/api/pacientes/:id/historial", (req, res) => {
  const id = Number(req.params.id);
  if (!pacientes.some((p) => p.id === id))
    return res.status(404).json({ error: "El paciente no existe." });
  res.json({
    citas: citas.filter((c) => c.pacienteId === id),
    atenciones: atenciones.filter((a) => a.pacienteId === id),
  });
});
app.post("/api/pacientes/:id/atenciones", (req, res) => {
  const pacienteId = Number(req.params.id);
  if (!pacientes.some((p) => p.id === pacienteId))
    return res.status(404).json({ error: "El paciente no existe." });
  const { fecha, diagnostico, tratamiento } = req.body || {};
  if (typeof fecha !== "string" || !fecha.trim() ||
      typeof diagnostico !== "string" || !diagnostico.trim())
    return res.status(400).json({ error: "La fecha y el diagnóstico son obligatorios." });
  const a = {
    id: nextId++,
    pacienteId,
    fecha: fecha.trim(),
    diagnostico: diagnostico.trim(),
    tratamiento: tratamiento ? String(tratamiento).trim() : "",
  };
  atenciones.push(a);
  res.status(201).json(a);
});

// Recordatorios: citas de mañana con enlace de WhatsApp
app.get("/api/recordatorios", (req, res) => {
  const hoyLima = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const mananaLima = new Date(`${hoyLima}T12:00:00Z`);
  mananaLima.setUTCDate(mananaLima.getUTCDate() + 1);
  const manana = mananaLima.toISOString().slice(0, 10);
  res.json(citas.filter((c) => c.fecha === manana && c.estado !== "cancelada").map((c) => {
    const p = pacientes.find((x) => x.id === c.pacienteId);
    const msg = `Hola ${p.dueno}, le recordamos la cita de ${p.mascota} mañana a las ${c.hora} en Rivervet.`;
    return {
      hora: c.hora,
      mascota: p.mascota,
      dueno: p.dueno,
      wa: `https://wa.me/51${p.telefono}?text=${encodeURIComponent(msg)}`,
    };
  }));
});

app.use(express.static(path.join(__dirname, "public")));

// Ruta de comprobación (útil al desplegar)
app.get("/salud", (req, res) => res.json({ ok: true }));

app.use((req, res) => res.status(404).send("Página no encontrada"));

app.listen(PORT, () => console.log(`Rivervet en http://localhost:${PORT}`));
