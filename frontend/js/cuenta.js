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
}

async function guardarDatosFiscales(){
  const msg = $("f-msg"); msg.style.color = ""; msg.textContent = "";
  const { error } = await sb.rpc("guardar_datos_fiscales", { p_ruc: $("f-ruc").value.trim(), p_razon: $("f-razon").value.trim() });
  if (error) return msg.textContent = error.message;
  msg.style.color = "#166534";
  msg.textContent = "Datos de facturación guardados.";
}