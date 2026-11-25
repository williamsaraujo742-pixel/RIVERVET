function esc(texto) {
  return String(texto).replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[caracter]);
}

async function api(url, opciones) {
  const respuesta = await fetch(url, opciones);
  const texto = await respuesta.text();
  let datos = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch (error) {
      datos = { error: texto };
    }
  }
  if (!respuesta.ok) {
    throw new Error((datos && datos.error) || `Error del servidor (${respuesta.status}).`);
  }
  return datos;
}

const mensaje = document.getElementById("mensaje");
const listaPacientes = document.getElementById("lista-pacientes");
const listaCitas = document.getElementById("lista-citas");
const listaRecordatorios = document.getElementById("lista-recordatorios");
const selectCita = document.getElementById("cita-paciente");
const selectHistorial = document.getElementById("historial-paciente");
const historialContenido = document.getElementById("historial-contenido");
let pacientes = [];

function mostrarError(error) {
  mensaje.textContent = error.message || "Ocurrió un error inesperado.";
  mensaje.hidden = false;
}

function limpiarError() {
  mensaje.textContent = "";
  mensaje.hidden = true;
}

function opcionesPacientes(select, textoInicial) {
  const valorAnterior = select.value;
  select.innerHTML = `<option value="">${esc(textoInicial)}</option>` +
    pacientes.map((p) => `<option value="${esc(p.id)}">${esc(p.mascota)} — ${esc(p.dueno)}</option>`).join("");
  if (pacientes.some((p) => String(p.id) === valorAnterior)) {
    select.value = valorAnterior;
  }
}

async function cargarPacientes() {
  pacientes = await api("/api/pacientes");
  listaPacientes.innerHTML = pacientes.length
    ? pacientes.map((p) => `
      <article class="panel-card">
        <div><h3>${esc(p.mascota)}</h3><p>${esc(p.dueno)} · ${esc(p.telefono)}</p></div>
      </article>`).join("")
    : '<p class="panel-empty">Todavía no hay pacientes registrados.</p>';
  opcionesPacientes(selectCita, "Elige un paciente");
  opcionesPacientes(selectHistorial, "Elige un paciente");
  await cargarCitas();
}

async function cargarCitas() {
  const citas = await api("/api/citas");
  listaCitas.innerHTML = citas.length
    ? citas.map((c) => {
      const paciente = pacientes.find((p) => p.id === c.pacienteId);
      const nombre = paciente ? `${paciente.mascota} — ${paciente.dueno}` : "Paciente";
      return `
        <article class="panel-card panel-appointment">
          <div>
            <h3>${esc(nombre)}</h3>
            <p>${esc(c.fecha)} · ${esc(c.hora)}${c.motivo ? ` · ${esc(c.motivo)}` : ""}</p>
            <span class="panel-status">${esc(c.estado)}</span>
          </div>
          <div class="panel-actions">
            <button type="button" class="panel-button" data-cita="${esc(c.id)}" data-estado="confirmada">Confirmar</button>
            <button type="button" class="panel-button" data-cita="${esc(c.id)}" data-estado="atendida">Atendida</button>
            <button type="button" class="panel-button panel-cancel" data-cita="${esc(c.id)}" data-estado="cancelada">Cancelar</button>
          </div>
        </article>`;
    }).join("")
    : '<p class="panel-empty">Todavía no hay citas registradas.</p>';
}

async function cargarHistorial() {
  if (!selectHistorial.value) {
    historialContenido.innerHTML = '<p class="panel-empty">Selecciona un paciente para ver su historial.</p>';
    return;
  }
  const historial = await api(`/api/pacientes/${encodeURIComponent(selectHistorial.value)}/historial`);
  const citasHtml = historial.citas.length
    ? historial.citas.map((c) => `
      <article class="panel-card">
        <h3>Cita · ${esc(c.fecha)} · ${esc(c.hora)}</h3>
        <p>${esc(c.motivo || "Sin motivo")} · Estado: ${esc(c.estado)}</p>
      </article>`).join("")
    : '<p class="panel-empty">No hay citas en el historial.</p>';
  const atencionesHtml = historial.atenciones.length
    ? historial.atenciones.map((a) => `
      <article class="panel-card">
        <h3>Atención · ${esc(a.fecha)}</h3>
        <p><strong>Diagnóstico:</strong> ${esc(a.diagnostico)}</p>
        <p><strong>Tratamiento:</strong> ${esc(a.tratamiento || "Sin tratamiento registrado")}</p>
      </article>`).join("")
    : '<p class="panel-empty">No hay atenciones registradas.</p>';
  historialContenido.innerHTML = `
    <h3 class="panel-group-title">Citas</h3>${citasHtml}
    <h3 class="panel-group-title">Atenciones</h3>${atencionesHtml}`;
}

async function cargarRecordatorios() {
  const recordatorios = await api("/api/recordatorios");
  listaRecordatorios.innerHTML = recordatorios.length
    ? recordatorios.map((r) => `
      <article class="panel-card panel-reminder">
        <div>
          <h3>${esc(r.mascota)} · ${esc(r.hora)}</h3>
          <p>Dueño: ${esc(r.dueno)}</p>
        </div>
        <a class="panel-button panel-primary" href="${esc(r.wa)}" target="_blank" rel="noopener">Enviar por WhatsApp</a>
      </article>`).join("")
    : '<p class="panel-empty">No hay citas para mañana.</p>';
}

document.querySelectorAll("[data-vista]").forEach((boton) => {
  boton.addEventListener("click", async () => {
    limpiarError();
    document.querySelectorAll("[data-vista]").forEach((otro) => {
      const seleccionado = otro === boton;
      otro.classList.toggle("active", seleccionado);
      otro.setAttribute("aria-selected", String(seleccionado));
    });
    document.querySelectorAll("[data-vista-panel]").forEach((seccion) => {
      seccion.hidden = seccion.dataset.vistaPanel !== boton.dataset.vista;
    });
    try {
      if (boton.dataset.vista === "recordatorios") await cargarRecordatorios();
      if (boton.dataset.vista === "historial") await cargarHistorial();
    } catch (error) {
      mostrarError(error);
    }
  });
});

document.getElementById("form-paciente").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  limpiarError();
  const datos = Object.fromEntries(new FormData(evento.currentTarget));
  try {
    await api("/api/pacientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    evento.currentTarget.reset();
    await cargarPacientes();
  } catch (error) {
    mostrarError(error);
  }
});

document.getElementById("form-cita").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  limpiarError();
  const datos = Object.fromEntries(new FormData(evento.currentTarget));
  try {
    await api("/api/citas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    evento.currentTarget.reset();
    await cargarCitas();
  } catch (error) {
    mostrarError(error);
  }
});

listaCitas.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("[data-cita][data-estado]");
  if (!boton) return;
  limpiarError();
  try {
    await api(`/api/citas/${encodeURIComponent(boton.dataset.cita)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: boton.dataset.estado }),
    });
    await cargarCitas();
  } catch (error) {
    mostrarError(error);
  }
});

selectHistorial.addEventListener("change", async () => {
  limpiarError();
  try {
    await cargarHistorial();
  } catch (error) {
    mostrarError(error);
  }
});

document.getElementById("form-atencion").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  limpiarError();
  if (!selectHistorial.value) {
    mostrarError(new Error("Selecciona un paciente antes de guardar la atención."));
    return;
  }
  const datos = Object.fromEntries(new FormData(evento.currentTarget));
  try {
    await api(`/api/pacientes/${encodeURIComponent(selectHistorial.value)}/atenciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    evento.currentTarget.reset();
    await cargarHistorial();
  } catch (error) {
    mostrarError(error);
  }
});

cargarPacientes().then(cargarRecordatorios).catch(mostrarError);
