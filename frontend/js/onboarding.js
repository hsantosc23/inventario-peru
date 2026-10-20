// Elección de modalidad del negocio

function verTipo(){
  const t = document.querySelector('input[name="tipo"]:checked');
  $("m-cobro").classList.toggle("hide", !(t && t.value === "hostal"));
}

async function guardarModalidad(){
  const msg = $("m-msg"); msg.textContent = "";
  const nombre = $("m-nombre").value.trim();
  const t = document.querySelector('input[name="tipo"]:checked');
  const cobros = [...document.querySelectorAll('input[name="cobro"]:checked')].map(c => c.value);
  if (!nombre) return msg.textContent = "Escribe el nombre de tu negocio.";
  if (!t) return msg.textContent = "Elige el tipo de negocio.";
  if (t.value === "hostal" && !cobros.length) return msg.textContent = "Marca al menos una forma de cobro.";
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("negocios")
    .update({ nombre, tipo: t.value, modalidades: t.value === "hostal" ? cobros : null })
    .eq("owner_id", user.id);
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  irSegunNegocio();
}
