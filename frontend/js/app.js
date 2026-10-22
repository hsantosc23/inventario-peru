// Arranque: decide qué pantalla mostrar

async function irSegunNegocio(){
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return show("login");
  const { data: n, error } = await sb.from("negocios").select("id,nombre,tipo,estado,prueba_hasta,modalidades,whatsapp").eq("owner_id", user.id).maybeSingle();
  if (error || !n) { show("login"); $("l-msg").textContent = "No se pudo cargar tu negocio" + (error ? ": " + error.message : "."); return; }
  nav(true);
  if (!n.tipo) return show("modalidad");
  const dias = Math.ceil((new Date(n.prueba_hasta) - new Date()) / 86400000);
  const { data: ok } = await sb.rpc("puede_editar");
  PUEDE = ok === true;
  $("p-titulo").textContent = n.nombre || "Bienvenido";
  $("p-info").textContent = PUEDE
    ? (n.estado === "activo" ? "Plan activo." : "Te quedan " + dias + " día(s) de prueba gratis.")
    : n.estado === "suspendido" ? "Tu cuenta está suspendida: puedes ver tu inventario, pero no editarlo. Escríbenos para reactivarla."
    : n.estado === "activo" ? "Tu plan venció: puedes ver tu inventario, pero no editarlo. Renueva tu pago para seguir."
    : "Tu prueba terminó: puedes ver tu inventario, pero no editarlo. Activa tu plan.";
    NEG = n;
  actualizarPerfil();
  const esTienda = n.tipo === "tienda";
  $("inv").classList.toggle("hide", !esTienda);
  $("hotel").classList.toggle("hide", esTienda);
  $("form-prod").classList.toggle("hide", !PUEDE);
  $("imp").classList.toggle("hide", !PUEDE);
  $("inv-grid").classList.toggle("solo", !PUEDE);
  $("hotel-grid").classList.toggle("solo", !PUEDE);
  $("ven-grid").classList.toggle("solo", !PUEDE);
  $("gas-grid").classList.toggle("solo", !PUEDE);
  show("panel");
  if (esTienda) { verTab("inv"); cargarProductos(); } else iniciarHotel();
}

sb.auth.getSession().then(({ data }) => {
  if (data.session) irSegunNegocio();
  else { nav(false); show("home"); }
});