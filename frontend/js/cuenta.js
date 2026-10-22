// Configuración de la cuenta: estado, nombre de la empresa, contraseña y modalidad

function verConfig(){
  if (!NEG) return alert("Primero elige el tipo de negocio.");
  const n = NEG, activo = PUEDE && n.estado === "activo", prueba = PUEDE && n.estado === "prueba";
  $("c-estado").className = "card " + (activo ? "estado-ok" : prueba ? "estado-prueba" : "estado-mal");
  $("c-estado-txt").textContent = activo ? "Plan activo."
    : prueba ? "Prueba gratis activa hasta el " + new Date(n.prueba_hasta).toLocaleDateString("es-PE") + "."
    : n.estado === "suspendido" ? "Cuenta suspendida por falta de pago: puedes ver tus datos, pero no editarlos."
    : "Tu plan o tu prueba venció: puedes ver tus datos, pero no editarlos. Renueva tu pago para seguir.";
  $("c-nombre").value = n.nombre || "";
  document.querySelectorAll('input[name="c-tipo"]').forEach(r => r.checked = r.value === n.tipo);
  document.querySelectorAll('input[name="c-cobro"]').forEach(c => c.checked = (n.modalidades || []).includes(c.value));
  ["c-clave0", "c-clave1", "c-clave2"].forEach(i => $(i).value = "");
  ["c-msg-nombre", "c-msg-clave", "c-msg-tipo"].forEach(i => { $(i).style.color = ""; $(i).textContent = ""; });
  verTipoConfig();
  show("config");
}

async function guardarNombre(){
  const msg = $("c-msg-nombre"); msg.style.color = ""; msg.textContent = "";
  const nombre = $("c-nombre").value.trim();
  if (!nombre) return msg.textContent = "Escribe el nombre de tu empresa.";
  const { error } = await sb.from("negocios").update({ nombre }).eq("id", NEG.id);
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  NEG.nombre = nombre; $("p-titulo").textContent = nombre;
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
  $("c-cobros").classList.toggle("hide", !(t && t.value === "hostal"));
}

async function cambiarModalidad(){
  const msg = $("c-msg-tipo"); msg.style.color = ""; msg.textContent = "";
  const t = document.querySelector('input[name="c-tipo"]:checked');
  const cobros = [...document.querySelectorAll('input[name="c-cobro"]:checked')].map(c => c.value);
  if (!t) return msg.textContent = "Elige el tipo de negocio.";
  if (t.value === "hostal" && !cobros.length) return msg.textContent = "Marca al menos una forma de cobro.";
  if (t.value === "tienda" && NEG.tipo === "tienda") return msg.textContent = "Ya tienes esa modalidad.";
  if (!confirm("¿Cambiar la modalidad de tu negocio? Tus datos no se borran: seguirán guardados si vuelves a la modalidad anterior.")) return;
  const { error } = await sb.from("negocios")
    .update({ tipo: t.value, modalidades: t.value === "hostal" ? cobros : null }).eq("id", NEG.id);
  if (error) return msg.textContent = "No se pudo cambiar: " + error.message;
  await irSegunNegocio();
}