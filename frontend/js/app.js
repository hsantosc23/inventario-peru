// Arranque: decide qué pantalla mostrar

async function irSegunNegocio(){
  const { data: n, error } = await sb.from("negocios").select("id,nombre,tipo,estado,prueba_hasta,modalidades,whatsapp").maybeSingle();
  if (error || !n) return show("login");
  nav(true);
  if (!n.tipo) return show("modalidad");
  const dias = Math.ceil((new Date(n.prueba_hasta) - new Date()) / 86400000);
  $("p-titulo").textContent = n.nombre || "Bienvenido";
  $("p-info").textContent = n.estado === "activo" ? "Plan activo."
    : (dias > 0 ? "Te quedan " + dias + " día(s) de prueba gratis."
                : "Tu prueba terminó: puedes ver tus datos, pero no editarlos. Activa tu plan.");
  NEG = n;
  PUEDE = n.estado === "activo" || (n.estado === "prueba" && dias > 0);
  const esTienda = n.tipo === "tienda";
  $("inv").classList.toggle("hide", !esTienda);
  $("p-hostal").classList.toggle("hide", esTienda);
  $("form-prod").classList.toggle("hide", !PUEDE);
  $("imp").classList.toggle("hide", !PUEDE);
  show("panel");
  if (esTienda) cargarProductos();
}

sb.auth.getSession().then(({ data }) => { if (data.session) irSegunNegocio(); });
