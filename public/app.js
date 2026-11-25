// Configuración de contacto: cambia solo estas dos líneas.
const WHATSAPP_NUMBER = "51986104823"; // código de país + número, sin espacios ni +
const WHATSAPP_MESSAGE = "Hola, quiero probar Rivervet en mi clínica";

const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
document.querySelectorAll("[data-wa]").forEach((a) => { a.href = waUrl; });
