
"use strict";

/* =========================================
   1. CONFIGURACIÓN Y UTILIDADES
========================================= */

const API_BASE = "http://127.0.0.1:8000";

const seleccionar = (selector, contenedor = document) =>
    contenedor.querySelector(selector);

const seleccionarTodos = (selector, contenedor = document) =>
    [...contenedor.querySelectorAll(selector)];

function mostrarMensaje(elemento, texto) {
    if (elemento) {
        elemento.textContent = texto;
    }
}

function formatearFecha(fecha) {
    if (!fecha) return "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
    }

    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
}

async function solicitarAPI(ruta, opciones = {}) {
    const respuesta = await fetch(`${API_BASE}${ruta}`, {
        ...opciones,
        headers: {
            ...(opciones.body ? { "Content-Type": "application/json" } : {}),
            ...(opciones.headers || {}),
        },
    });

    if (!respuesta.ok) {
        let detalle = `Error del servidor (${respuesta.status}).`;

        try {
            const datos = await respuesta.json();
            if (datos.detail) {
                detalle = Array.isArray(datos.detail)
                    ? datos.detail.map((error) => error.msg).join(" ")
                    : datos.detail;
            }
        } catch {
            // Conservamos el mensaje de error original.
        }

        throw new Error(detalle);
    }

    if (respuesta.status === 204) {
        return null;
    }

    return respuesta.json();
}


/* =========================================
   2. PESTAÑAS DE PREDICACIONES
========================================= */

const tabVideos = seleccionar("#tab-videos");
const tabBosquejos = seleccionar("#tab-bosquejos");
const panelVideos = seleccionar("#videos");
const panelBosquejos = seleccionar("#bosquejos");

function mostrarContenido(tipo) {
    if (!tabVideos || !tabBosquejos || !panelVideos || !panelBosquejos) {
        return;
    }

    const mostrarVideos = tipo === "videos";

    panelVideos.hidden = !mostrarVideos;
    panelBosquejos.hidden = mostrarVideos;

    tabVideos.classList.toggle("tipo-activo", mostrarVideos);
    tabBosquejos.classList.toggle("tipo-activo", !mostrarVideos);

    tabVideos.setAttribute("aria-selected", String(mostrarVideos));
    tabBosquejos.setAttribute("aria-selected", String(!mostrarVideos));

    tabVideos.tabIndex = mostrarVideos ? 0 : -1;
    tabBosquejos.tabIndex = mostrarVideos ? -1 : 0;
}

if (tabVideos && tabBosquejos) {
    tabVideos.addEventListener("click", () => mostrarContenido("videos"));
    tabBosquejos.addEventListener("click", () => mostrarContenido("bosquejos"));

    mostrarContenido("videos");

    [tabVideos, tabBosquejos].forEach((pestana) => {
        pestana.addEventListener("keydown", (evento) => {
            if (evento.key === "ArrowRight" || evento.key === "ArrowLeft") {
                evento.preventDefault();

                const siguiente =
                    pestana === tabVideos ? tabBosquejos : tabVideos;

                mostrarContenido(
                    siguiente === tabVideos ? "videos" : "bosquejos"
                );

                siguiente.focus();
            }
        });
    });
}


/* =========================================
   3. ACTIVIDADES CONECTADAS A FASTAPI
========================================= */

const contenedorActividades = seleccionar("#lista-actividades");
const formularioActividad = seleccionar("#form-actividad");
const mensajeActividad = seleccionar("#mensaje-actividad");

function crearTarjetaActividad(actividad) {
    const tarjeta = document.createElement("article");
    tarjeta.classList.add("tarjeta-actividad");

    const categoria = document.createElement("span");
    categoria.classList.add("actividad-categoria");
    categoria.textContent = actividad.categoria;

    const titulo = document.createElement("h3");
    titulo.textContent = actividad.titulo;

    const descripcion = document.createElement("p");
    descripcion.textContent = actividad.descripcion;

    const fecha = document.createElement("p");
    fecha.classList.add("actividad-fecha");
    fecha.textContent = formatearFecha(actividad.fecha);

    tarjeta.append(categoria, titulo, descripcion, fecha);

    return tarjeta;
}

function mostrarEstadoActividades(texto) {
    if (!contenedorActividades) return;

    const mensaje = document.createElement("p");
    mensaje.textContent = texto;
    contenedorActividades.replaceChildren(mensaje);
}

async function cargarActividades() {
    if (!contenedorActividades) return;

    mostrarEstadoActividades("Cargando actividades...");

    try {
        const actividades = await solicitarAPI("/api/actividades");

        if (!Array.isArray(actividades) || actividades.length === 0) {
            mostrarEstadoActividades(
                "Por ahora no hay actividades publicadas."
            );
            return;
        }

        const tarjetas = actividades.map(crearTarjetaActividad);
        contenedorActividades.replaceChildren(...tarjetas);
    } catch (error) {
        console.error("No se pudieron cargar las actividades:", error);

        mostrarEstadoActividades(
            "No pudimos cargar las actividades. Inténtalo de nuevo más tarde."
        );
    }
}

if (formularioActividad) {
    formularioActividad.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const categoria = seleccionar("#actividad-categoria")?.value;
        const titulo = seleccionar("#actividad-titulo")?.value.trim();
        const descripcion =
            seleccionar("#actividad-descripcion")?.value.trim();
        const fecha = seleccionar("#actividad-fecha")?.value;

        if (!categoria || !titulo || !descripcion || !fecha) {
            mostrarMensaje(
                mensajeActividad,
                "Completa todos los campos para continuar."
            );
            return;
        }

        // La creación de actividades requiere autorización administrativa.
        // El token solo estará disponible cuando implementemos el inicio
        // de sesión del panel administrativo.
        const token = sessionStorage.getItem("icc_token");

        if (!token) {
            mostrarMensaje(
                mensajeActividad,
                "Para publicar actividades debes iniciar sesión en el panel administrativo. La actividad no se ha guardado."
            );
            return;
        }

        const botonEnviar = formularioActividad.querySelector(
            '[type="submit"]'
        );

        if (botonEnviar) botonEnviar.disabled = true;

        try {
            await solicitarAPI("/api/admin/actividades", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    categoria,
                    titulo,
                    descripcion,
                    fecha,
                    publicada: true,
                }),
            });

            formularioActividad.reset();

            mostrarMensaje(
                mensajeActividad,
                "Actividad guardada correctamente."
            );

            await cargarActividades();
        } catch (error) {
            console.error("No se pudo guardar la actividad:", error);

            mostrarMensaje(
                mensajeActividad,
                `No se pudo guardar la actividad: ${error.message}`
            );
        } finally {
            if (botonEnviar) botonEnviar.disabled = false;
        }
    });
}

cargarActividades();


/* =========================================
   4. FORMULARIO DE ORIENTACIÓN PASTORAL
========================================= */

const formularioCita = seleccionar("#form-cita");
const mensajeCita = seleccionar("#mensaje-cita");

if (formularioCita) {
    formularioCita.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const nombre = seleccionar("#cita-nombre")?.value.trim();
        const contacto = seleccionar("#cita-contacto")?.value.trim();
        const modalidad = seleccionar("#cita-modalidad")?.value;
        const disponibilidad =
            seleccionar("#cita-disponibilidad")?.value.trim();
        const mensaje = seleccionar("#cita-mensaje")?.value.trim();

        if (!nombre || !contacto || !modalidad || !disponibilidad) {
            mostrarMensaje(
                mensajeCita,
                "Completa los campos obligatorios antes de continuar."
            );
            return;
        }

        // La API admite estos valores exactos para modalidad.
        const modalidadesValidas = [
            "presencial",
            "virtual",
            "por-confirmar",
        ];

        if (!modalidadesValidas.includes(modalidad)) {
            mostrarMensaje(
                mensajeCita,
                "La modalidad seleccionada no es válida. Revisa las opciones del formulario."
            );
            return;
        }

        const botonEnviar = formularioCita.querySelector(
            '[type="submit"]'
        );

        if (botonEnviar) botonEnviar.disabled = true;

        mostrarMensaje(mensajeCita, "Enviando solicitud...");

        try {
            const resultado = await solicitarAPI("/api/orientacion", {
                method: "POST",
                body: JSON.stringify({
                    nombre,
                    contacto,
                    modalidad,
                    disponibilidad,
                    mensaje: mensaje || null,
                }),
            });

            formularioCita.reset();

            mostrarMensaje(
                mensajeCita,
                `Solicitud recibida correctamente. Número de referencia: ${resultado.id}. La iglesia deberá confirmar la disponibilidad.`
            );
        } catch (error) {
            console.error("No se pudo enviar la solicitud:", error);

            mostrarMensaje(
                mensajeCita,
                `No pudimos enviar la solicitud: ${error.message}. Inténtalo nuevamente más tarde.`
            );
        } finally {
            if (botonEnviar) botonEnviar.disabled = false;
        }
    });
}


/* =========================================
   5. CHATBOT: ABRIR Y CERRAR
========================================= */

const botonChatbot = seleccionar("#boton-chatbot");
const ventanaChatbot = seleccionar("#ventana-chatbot");
const botonCerrarChatbot = seleccionar("#cerrar-chatbot");
const formularioChatbot = seleccionar("#form-chatbot");
const campoMensajeChatbot = seleccionar("#mensaje-chatbot");
const mensajesChatbot = seleccionar("#mensajes-chatbot");

function abrirChatbot() {
    if (!ventanaChatbot || !botonChatbot) return;

    ventanaChatbot.hidden = false;
    botonChatbot.setAttribute("aria-expanded", "true");
    campoMensajeChatbot?.focus();
}

function cerrarChatbot() {
    if (!ventanaChatbot || !botonChatbot || ventanaChatbot.hidden) return;

    ventanaChatbot.hidden = true;
    botonChatbot.setAttribute("aria-expanded", "false");
    botonChatbot.focus();
}

if (botonChatbot && ventanaChatbot) {
    botonChatbot.addEventListener("click", () => {
        if (ventanaChatbot.hidden) {
            abrirChatbot();
        } else {
            cerrarChatbot();
        }
    });
}

if (botonCerrarChatbot) {
    botonCerrarChatbot.addEventListener("click", cerrarChatbot);
}

document.addEventListener("keydown", (evento) => {
    if (
        evento.key === "Escape" &&
        ventanaChatbot &&
        !ventanaChatbot.hidden
    ) {
        cerrarChatbot();
    }
});


/* =========================================
   6. CHATBOT: MENSAJES Y RESPUESTAS
========================================= */

function agregarMensajeChatbot(texto, tipo) {
    if (!mensajesChatbot) return;

    const mensaje = document.createElement("p");

    mensaje.classList.add(
        tipo === "usuario" ? "mensaje-usuario" : "mensaje-asistente"
    );

    mensaje.textContent = texto;

    mensajesChatbot.appendChild(mensaje);
    mensajesChatbot.scrollTop = mensajesChatbot.scrollHeight;
}

function responderChatbot(texto) {
    const consulta = texto
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    if (
        consulta.includes("horario") ||
        consulta.includes("hora") ||
        consulta.includes("culto") ||
        consulta.includes("servicio")
    ) {
        return "Los horarios de los cultos están pendientes de confirmación. Consulta los canales oficiales de ICC Adonay.";
    }

    if (
        consulta.includes("ubicacion") ||
        consulta.includes("direccion") ||
        consulta.includes("donde queda")
    ) {
        return "La dirección oficial debe publicarse en la sección de Contacto. Por ahora, no tengo una ubicación confirmada.";
    }

    if (consulta.includes("ministerio")) {
        return "ICC Adonay cuenta con ministerios como Evangelismo, Diáconos, MÍA, Alabanza, Danza, Consolidación, Audiovisuales, Jóvenes, Parejas, Altar de Avivamiento y Labor Social. Consulta la sección Ministerios.";
    }

    if (
        consulta.includes("predicacion") ||
        consulta.includes("sermon") ||
        consulta.includes("bosquejo") ||
        consulta.includes("video")
    ) {
        return "Puedes consultar los videos y los futuros bosquejos en la sección Predicaciones.";
    }

    if (
        consulta.includes("pastor") ||
        consulta.includes("orientacion") ||
        consulta.includes("cita") ||
        consulta.includes("consejeria")
    ) {
        return "Visita la sección Orientación pastoral para enviar una solicitud. La cita deberá confirmarse directamente con la iglesia.";
    }

    if (
        consulta.includes("instituto") ||
        consulta.includes("campus")
    ) {
        return "Encontrarás la sección Instituto / Campus en esta página. El enlace oficial debe configurarse antes de publicarlo.";
    }

    if (
        consulta.includes("hola") ||
        consulta.includes("buenos dias") ||
        consulta.includes("buenas tardes") ||
        consulta.includes("buenas noches")
    ) {
        return "¡Hola! Bienvenido a ICC Adonay. Puedes preguntarme por los ministerios, las predicaciones o la orientación pastoral.";
    }

    if (consulta.includes("gracias")) {
        return "¡Con gusto! Gracias por visitar ICC Adonay.";
    }

    return "Todavía no tengo información confirmada para responder eso. Consulta las secciones de esta página o comunícate con la iglesia por sus canales oficiales.";
}

if (formularioChatbot && campoMensajeChatbot) {
    formularioChatbot.addEventListener("submit", (evento) => {
        evento.preventDefault();

        const texto = campoMensajeChatbot.value.trim();

        if (!texto) {
            campoMensajeChatbot.focus();
            return;
        }

        agregarMensajeChatbot(texto, "usuario");
        campoMensajeChatbot.value = "";

        agregarMensajeChatbot(responderChatbot(texto), "asistente");
        campoMensajeChatbot.focus();
    });
}


/* =========================================
   7. ENLACE DEL INSTITUTO
========================================= */

const enlaceInstituto = seleccionar("#enlace-instituto");

if (enlaceInstituto) {
    enlaceInstituto.addEventListener("click", (evento) => {
        const destino = enlaceInstituto.getAttribute("href");

        if (!destino || destino === "#") {
            evento.preventDefault();

            alert(
                "El enlace del Instituto / Campus todavía debe configurarse con su dirección oficial."
            );
        }
    });
}


/* =========================================
   8. CERRAR CHATBOT AL HACER CLIC AFUERA
========================================= */

document.addEventListener("click", (evento) => {
    if (!ventanaChatbot || ventanaChatbot.hidden) return;

    const clicDentroChatbot = evento.target.closest(
        "#ventana-chatbot, #boton-chatbot"
    );

    if (!clicDentroChatbot) {
        cerrarChatbot();
    }
});


/* =========================================
   9. INICIALIZACIÓN
========================================= */

console.info("ICC Adonay: JavaScript inicializado correctamente.");
