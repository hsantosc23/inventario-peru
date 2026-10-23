function verTipo(){
  const t = document.querySelector('input[name="tipo"]:checked');
  $("m-rubro-box").classList.toggle("hide", !t || t.value === "hotel");
}

async function guardarModalidad(){
  const msg = $("m-msg"); msg.textContent = "";
  const nombre = $("m-nombre").value.trim();
  const t = document.querySelector('input[name="tipo"]:checked');
  if (!nombre) return msg.textContent = "Escribe el nombre de tu negocio.";
  if (!t) return msg.textContent = "Elige el tipo de negocio.";
  const hotel = t.value === "hotel", rubro = $("m-rubro").value;
  if (!hotel && !rubro) return msg.textContent = "Elige el rubro de tu negocio.";
  const { data: { user } } = await sb.auth.getUser();
  const cambios = hotel
    ? { nombre, tipo: "hostal", formalidad: null, rubro: null, modalidades: null }
    : { nombre, tipo: "tienda", formalidad: t.value, rubro, modalidades: null };
  const { error } = await sb.from("negocios").update(cambios).eq("owner_id", user.id);
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  await irSegunNegocio();
}