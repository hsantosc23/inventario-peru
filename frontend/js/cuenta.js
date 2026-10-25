// Configuración de la cuenta: estado, nombre de la empresa, contraseña y modalidad

// Círculo de usuario de la cabecera: nombre de la empresa y borde según el estado de la cuenta
function actualizarPerfil(){
  const n = NEG, activo = PUEDE && n.estado === "activo", prueba = PUEDE && n.estado === "prueba";
  $("perfil-nombre").textContent = n.nombre || "Mi empresa";
  $("perfil-av").className = "avatar " + (activo ? "ok" : prueba ? "prueba" : "mal");
  $("perfil").title = activo ? "Plan activo" : prueba ? "Prueba gratis" : "Cuenta suspendida o vencida";
}

function verConfig(){
  if (!NEG) return alert("Primero elige el tipo de negocio.");
  const n = NEG, activo = PUEDE && n.estado === "activo", prueba = PUEDE && n.estado === "prueba";
  $("c-estado").className = "card " + (activo ? "estado-ok" : prueba ? "estado-prueba" : "estado-mal");
  $("c-estado-txt").textContent = activo ? "Plan activo."
    : prueba ? "Prueba gratis activa hasta el " + new Date(n.prueba_hasta).toLocaleDateString("es-PE") + "."
    : n.estado === "suspendido" ? "Cuenta suspendida por falta de pago: puedes ver tus datos, pero no editarlos."
    : "Tu plan o tu prueba venció: puedes ver tus datos, pero no editarlos. Renueva tu pago para seguir.";
  $("c-nombre").value = n.nombre || "";
    const actual = n.tipo === "hostal" ? "hotel" : (n.formalidad || "formal");
  document.querySelectorAll('input[name="c-tipo"]').forEach(r => r.checked = r.value === actual);
  $("c-rubro").value = n.rubro || "";
  ["c-clave0", "c-clave1", "c-clave2"].forEach(i => $(i).value = "");
  ["c-msg-nombre", "c-msg-clave", "c-msg-tipo"].forEach(i => { $(i).style.color = ""; $(i).textContent = ""; });
  verTipoConfig();
  show("config");
  cargarDatosFiscales();
}

async function cargarNumeracion(){
  const { data: n } = await sb.rpc("mi_numeracion");
  $("n-sb").value = (n && n.serie_boleta) || "B001";
  $("n-sf").value = (n && n.serie_factura) || "F001";
  $("n-ub").value = (n && n.ultimo_boleta) || 0;
  $("n-uf").value = (n && n.ultimo_factura) || 0;
}

async function guardarNumeracion(){
  const msg = $("n-msg"); msg.style.color = ""; msg.textContent = "";
  const serB = $("n-sb").value.trim().toUpperCase(), serF = $("n-sf").value.trim().toUpperCase();
  const ub = parseInt($("n-ub").value || "0", 10), uf = parseInt($("n-uf").value || "0", 10);
  if (!/^B[A-Z0-9]{3}$/.test(serB)) return msg.textContent = "La serie de boletas empieza con B y tiene 4 caracteres (ej.: B001).";
  if (!/^F[A-Z0-9]{3}$/.test(serF)) return msg.textContent = "La serie de facturas empieza con F y tiene 4 caracteres (ej.: F001).";
  if (isNaN(ub) || ub < 0 || isNaN(uf) || uf < 0) return msg.textContent = "Escribe números válidos.";
  const { error } = await sb.rpc("configurar_numeracion", { p_sb: serB, p_ub: ub, p_sf: serF, p_uf: uf });
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  msg.style.color = "#166534";
  msg.textContent = `Listo. La próxima boleta será ${serB}-${String(ub + 1).padStart(8, "0")} y la próxima factura ${serF}-${String(uf + 1).padStart(8, "0")}.`;
  cargarNumeracion();
}

async function guardarNombre(){
  const msg = $("c-msg-nombre"); msg.style.color = ""; msg.textContent = "";
  const nombre = $("c-nombre").value.trim();
  if (!nombre) return msg.textContent = "Escribe el nombre de tu empresa.";
  const { error } = await sb.from("negocios").update({ nombre }).eq("id", NEG.id);
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  NEG.nombre = nombre; $("p-titulo").textContent = nombre; actualizarPerfil();
  msg.style.color = "#166534"; msg.textContent = "Nombre actualizado.";
}

async function cambiarClave(){
  const msg = $("c-msg-clave"); msg.style.color = ""; msg.textContent = "";
  const actual = $("c-clave0").value, nueva = $("c-clave1").value, rep = $("c-clave2").value;
  if (!actual) return msg.textContent = "Escribe tu contraseña actual.";
  if (nueva.length < 6) return msg.textContent = "La nueva contraseña debe tener al menos 6 caracteres.";
  if (nueva !== rep) return msg.textContent = "Las contraseñas no coinciden.";
  const { data: { user } } = await sb.auth.getUser();
  const { error: e1 } = await sb.auth.signInWithPassword({ email: user.email, password: actual });
  if (e1) return msg.textContent = "La contraseña actual no es correcta.";
  const { error } = await sb.auth.updateUser({ password: nueva });
  if (error) return msg.textContent = "No se pudo cambiar: " + error.message;
  ["c-clave0", "c-clave1", "c-clave2"].forEach(i => $(i).value = "");
  msg.style.color = "#166534"; msg.textContent = "Contraseña actualizada.";
}

function verTipoConfig(){
  const t = document.querySelector('input[name="c-tipo"]:checked');
  $("c-rubro-box").classList.toggle("hide", !t || t.value === "hotel");
}

async function cambiarModalidad(){
  const msg = $("c-msg-tipo"); msg.style.color = ""; msg.textContent = "";
  const t = document.querySelector('input[name="c-tipo"]:checked');
  if (!t) return msg.textContent = "Elige el tipo de negocio.";
  const hotel = t.value === "hotel", rubro = $("c-rubro").value;
  if (!hotel && !rubro) return msg.textContent = "Elige el rubro de tu negocio.";
  const actual = NEG.tipo === "hostal" ? "hotel" : (NEG.formalidad || "formal");
  if (t.value === actual && (hotel || rubro === (NEG.rubro || ""))) return msg.textContent = "No hay cambios.";
  if (!confirm("¿Cambiar el tipo de negocio? Tus datos no se borran.")) return;
  const cambios = hotel
    ? { tipo: "hostal", formalidad: null, rubro: null, modalidades: null }
    : { tipo: "tienda", formalidad: t.value, rubro, modalidades: null };
  const { error } = await sb.from("negocios").update(cambios).eq("id", NEG.id);
  if (error) return msg.textContent = "No se pudo cambiar: " + error.message;
  await irSegunNegocio();
}

// Ajusta las pantallas según el tipo de negocio y el rubro
function aplicarModalidad(){
  if (!NEG || NEG.tipo !== "tienda") return;
  const informal = NEG.formalidad === "por_formalizar";
  const caja = $("f-talla-box");
  if (caja) caja.classList.toggle("hide", NEG.rubro !== "ropa");
  const mb = $("modos"); if (mb) mb.classList.toggle("hide", NEG.rubro !== "ropa");
  if (NEG.rubro !== "ropa") verModo("uno");
  $("v-tipo").innerHTML = informal
    ? '<option value="nota">Nota de venta (sin SUNAT)</option>'
    : '<option value="boleta">Boleta</option><option value="factura">Factura</option>';
  verTipoDoc();
  pintarUsoComprobantes();
}

async function cargarDatosFiscales(){
  const { data } = await sb.rpc("mis_datos_fiscales");
  const f = data && data[0];
  $("f-ruc").value = f ? (f.ruc || "") : "";
  $("f-razon").value = f ? (f.razon_social || "") : "";
  cargarNumeracion();
}

async function guardarDatosFiscales(){
  const msg = $("f-msg"); msg.style.color = ""; msg.textContent = "";
  const { error } = await sb.rpc("guardar_datos_fiscales", { p_ruc: $("f-ruc").value.trim(), p_razon: $("f-razon").value.trim() });
  if (error) return msg.textContent = error.message;
  msg.style.color = "#166534";
  msg.textContent = "Datos de facturación guardados.";
}

async function cargarNumeracion(){
  const { data: n } = await sb.rpc("mi_numeracion");
  $("n-sb").value = (n && n.serie_boleta) || "B010";
  $("n-sf").value = (n && n.serie_factura) || "F010";
  $("n-ub").value = (n && n.ultimo_boleta) || 0;
  $("n-uf").value = (n && n.ultimo_factura) || 0;
}

async function guardarNumeracion(){
  const msg = $("n-msg"); msg.style.color = ""; msg.textContent = "";
  const serB = $("n-sb").value.trim().toUpperCase(), serF = $("n-sf").value.trim().toUpperCase();
  const ub = parseInt($("n-ub").value || "0", 10), uf = parseInt($("n-uf").value || "0", 10);
  if (!/^B[A-Z0-9]{3}$/.test(serB)) return msg.textContent = "La serie de boletas empieza con B y tiene 4 caracteres (ej.: B010).";
  if (!/^F[A-Z0-9]{3}$/.test(serF)) return msg.textContent = "La serie de facturas empieza con F y tiene 4 caracteres (ej.: F010).";
  if (isNaN(ub) || ub < 0 || isNaN(uf) || uf < 0) return msg.textContent = "Escribe números válidos.";
  const { error } = await sb.rpc("configurar_numeracion", { p_sb: serB, p_ub: ub, p_sf: serF, p_uf: uf });
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  await cargarNumeracion();
  msg.style.color = "#166534";
  msg.textContent = `Listo. La próxima boleta será ${serB}-${String(ub + 1).padStart(8, "0")} y la próxima factura ${serF}-${String(uf + 1).padStart(8, "0")}.`;
}

let CTX = { es_sede: false }, SEDES = [], NUEVA_SEDE = null;

// "usuario" -> correo interno; un correo completo se deja igual
const usuarioAEmail = v => { v = String(v || "").trim(); return v.includes("@") ? v : v.toLowerCase() + "@sede.gestoraperu.app"; };

// Se llama después de cargar el negocio: si el dueño eligió una sede, el panel pasa a ser el de esa sede
async function aplicarContexto(){
  const [{ data: a }, { data: c }] = await Promise.all([sb.rpc("negocio_activo"), sb.rpc("mi_contexto")]);
  CTX = c || { es_sede: false };
  if (a && NEG && a.id !== NEG.id) NEG = { ...NEG, ...a };
  const b = $("tab-sede"); if (b) b.classList.toggle("hide", CTX.es_sede || !NEG || NEG.tipo !== "tienda");
  ["card-clave", "card-tipo", "card-fiscal", "sedes-card"].forEach(id => {
    const e = $(id); if (e) e.classList.toggle("hide", CTX.es_sede || (id === "sedes-card" && (!NEG || NEG.tipo !== "tienda")));
  });
  await cargarSedes();
}

async function cargarSedes(){
  SEDES = [];
  if (!CTX.es_sede) { const { data } = await sb.rpc("mis_sedes"); SEDES = data || []; }
  pintarBarraSedes(); pintarAccesosSedes();
}

function pintarBarraSedes(){
  const barra = $("sede-barra"); if (!barra) return;
  const hay = SEDES.length > 1;
  barra.classList.toggle("hide", !hay);
  if (!hay) return;
  $("sede-sel").innerHTML = SEDES.map(s => `<option value="${s.id}">${esc(s.nombre)}${s.principal ? " (principal)" : ""}</option>`).join("");
  $("sede-sel").value = NEG.id;
}

async function cambiarSedeSel(id){
  const raiz = SEDES.find(s => s.principal);
  const { error } = await sb.rpc("cambiar_sede", { p_negocio: raiz && id === raiz.id ? null : id });
  if (error) return alert("No se pudo cambiar de sede: " + error.message);
  CARRITO = [];
  cerrarSede();
  await irSegunNegocio();
}

function pintarAccesosSedes(){
  const el = $("sedes-lista"); if (!el) return;
  const hijas = SEDES.filter(s => !s.principal);
  el.innerHTML = hijas.length ? hijas.map(s => `<div class="acceso"><b>${esc(s.nombre)}</b>
      <small>Boletas ${esc(s.serie_boleta)} (último ${s.ultimo_boleta}) · Facturas ${esc(s.serie_factura)} (último ${s.ultimo_factura}) · Anexo ${esc(s.anexo)}</small>
      <div class="f2"><div><label>Usuario</label><input type="text" readonly value="${esc(s.usuario)}"></div>
      <div><label>Contraseña</label><input type="text" readonly value="${esc(s.clave)}"></div></div>
      <button onclick="copiarAcceso('${s.id}')">Copiar acceso</button>
      <button onclick="cambiarSedeSel('${s.id}')">Entrar a esta sede</button></div>`).join("")
    : `<p class="gr">Aún no tienes sedes. Usa el botón "Agregar sede +" del panel.</p>`;
}

function copiarAcceso(id){
  const s = SEDES.find(x => x.id === id) || (NUEVA_SEDE && NUEVA_SEDE.id === id ? NUEVA_SEDE : null); if (!s) return;
  const txt = `Gestora Perú\nSede: ${s.nombre}\nUsuario: ${s.usuario}\nContraseña: ${s.clave}\nIngresa en: ${location.origin}`;
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
    .then(() => alert("Acceso copiado. Pégalo en WhatsApp."), () => prompt("Copia el acceso:", txt));
}

// ---------- Ventana "Agregar sede" ----------
function verModoSede(){
  $("ms-series").classList.toggle("hide", document.querySelector('input[name="ms-ya"]:checked').value !== "si");
}

function abrirSede(){
  ["ms-nombre", "ms-sb", "ms-sf"].forEach(i => $(i).value = "");
  $("ms-ub").value = 0; $("ms-uf").value = 0;
  $("ms-anexo").value = String(Math.max(SEDES.length, 1)).padStart(4, "0");
  document.querySelector('input[name="ms-ya"][value="no"]').checked = true; verModoSede();
  $("ms-msg").textContent = "";
  $("ms-form").classList.remove("hide"); $("ms-ok").classList.add("hide");
  $("m-sede").classList.remove("hide");
}

function cerrarSede(){ const m = $("m-sede"); if (m) m.classList.add("hide"); }

async function crearSede(){
  const msg = $("ms-msg"); msg.style.color = ""; msg.textContent = "";
  const nombre = $("ms-nombre").value.trim(), anexo = $("ms-anexo").value.trim();
  const ya = document.querySelector('input[name="ms-ya"]:checked').value === "si";
  if (nombre.length < 2) return msg.textContent = "Escribe el nombre de la sede.";
  if (!/^[0-9]{4}$/.test(anexo)) return msg.textContent = "El código de establecimiento tiene 4 dígitos (ej.: 0001).";
  const cuerpo = { nombre, anexo, ya_emitio: ya };
  if (ya) {
    cuerpo.serie_boleta = $("ms-sb").value.trim().toUpperCase(); cuerpo.serie_factura = $("ms-sf").value.trim().toUpperCase();
    cuerpo.ultimo_boleta = parseInt($("ms-ub").value || "0", 10); cuerpo.ultimo_factura = parseInt($("ms-uf").value || "0", 10);
    if (!/^B[A-Z0-9]{3}$/.test(cuerpo.serie_boleta)) return msg.textContent = "La serie de boletas empieza con B y tiene 4 caracteres (ej.: B002).";
    if (!/^F[A-Z0-9]{3}$/.test(cuerpo.serie_factura)) return msg.textContent = "La serie de facturas empieza con F y tiene 4 caracteres (ej.: F002).";
    if (isNaN(cuerpo.ultimo_boleta) || cuerpo.ultimo_boleta < 0 || isNaN(cuerpo.ultimo_factura) || cuerpo.ultimo_factura < 0) return msg.textContent = "Escribe números válidos.";
  }
  const { data, error } = await sb.functions.invoke("crear-sede", { body: cuerpo });
  let r = data;
  if (error) { r = { ok: false, error: error.message }; try { r.error = (await error.context.json()).error || r.error; } catch {} }
  if (!r || !r.ok) return msg.textContent = (r && r.error) || "No se pudo crear la sede.";
  NUEVA_SEDE = r.sede;
  await cargarSedes();
  $("ok-usuario").value = NUEVA_SEDE.usuario; $("ok-clave").value = NUEVA_SEDE.clave;
  $("ok-series").textContent = `Boletas ${NUEVA_SEDE.serie_boleta} · Facturas ${NUEVA_SEDE.serie_factura}`;
  $("ms-form").classList.add("hide"); $("ms-ok").classList.remove("hide");
}

async function entrarSedeNueva(){ if (NUEVA_SEDE) await cambiarSedeSel(NUEVA_SEDE.id); }