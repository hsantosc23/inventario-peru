// Panel de administrador: negocios, estados, precio y notas

const fecha = d => new Date(d).toLocaleDateString("es-PE");

let LISTA = [], RES = {};

const solesAdm = n => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const resumenVentas = id => {
  const r = RES[id]; if (!r) return "";
  return `${r.comprobantes_mes} comprobante(s) este mes · vendido ${solesAdm(r.total_mes)}${Number(r.sedes) ? " · " + r.sedes + " sede(s)" : ""}`;
};

async function iniciar(){
  const { data: ok } = await sb.rpc("es_admin");
  if (!ok) { $("m").textContent = "Esta cuenta no es administradora."; await sb.auth.signOut(); return; }
  $("login").classList.add("hide"); $("app").classList.remove("hide"); $("salir").classList.remove("hide");
  cargar();
}

async function cargar(){
  const [{ data, error }, { data: res }] = await Promise.all([sb.rpc("admin_listar_negocios"), sb.rpc("admin_resumen_ventas")]);
  if (error) return $("resumen").textContent = "Error: " + error.message;
  LISTA = data || [];
  RES = {}; (res || []).forEach(r => RES[r.negocio_id] = r);
  pintar();
}

function estadoReal(n){
  if (n.estado === "activo" && n.pagado_hasta && new Date(n.pagado_hasta) < new Date()) return ["Pago vencido", "mal"];
  if (n.estado === "prueba" && new Date(n.prueba_hasta) < new Date()) return ["Prueba vencida", "mal"];
  return n.estado === "activo" ? ["Activo", "ok"] : n.estado === "suspendido" ? ["Suspendido", "mal"] : ["En prueba", ""];
}

function pintar(){
  const q = $("q").value.trim().toLowerCase();
  const r = LISTA.filter(n => (n.email || "").toLowerCase().includes(q) || (n.nombre || "").toLowerCase().includes(q));
  const act = LISTA.filter(n => n.estado === "activo").length;
  $("resumen").textContent = LISTA.length + " negocios · " + act + " activos";
  $("lista").innerHTML = r.map(n => {
    const [t, c] = estadoReal(n);
    return `<div class="fila" onclick="ver('${n.id}')"><b>${esc(n.nombre || "(sin nombre aún)")}</b>
      <span class="tag ${c}">${t}</span>${n.email_confirmado ? "" : ' <span class="tag mal">Correo sin confirmar</span>'}
      <br><small>${esc(n.email)} · ${n.tipo || "sin modalidad"} · registrado ${fecha(n.fecha_registro)}</small>
      <br><small class="gr">${resumenVentas(n.id)}</small></div>`;
  }).join("") || '<p class="gr">No hay resultados.</p>';
}

async function ver(id){
  const n = LISTA.find(x => x.id === id); if (!n) return;
  const [t, c] = estadoReal(n);
  const wa = n.whatsapp ? `<a href="https://wa.me/51${esc(n.whatsapp)}" target="_blank" rel="noopener">${esc(n.whatsapp)} (abrir WhatsApp)</a>` : "sin WhatsApp";
  $("det").classList.remove("hide");
  $("det").innerHTML = `<b style="font-size:18px">${esc(n.nombre || "(sin nombre aún)")}</b> <span class="tag ${c}">${t}</span>
    <p>${esc(n.email)}<br>WhatsApp: ${wa}<br>Tipo: ${n.tipo || "no eligió modalidad"}<br>
    Prueba hasta: ${fecha(n.prueba_hasta)}<br>Correo confirmado: ${n.email_confirmado ? "sí" : "NO"}<br>
    Productos cargados: ${n.total_productos}</p>
        <p>${(() => { const r = RES[id]; return r
      ? `Ventas este mes: ${r.ventas_mes} (${solesAdm(r.total_mes)})<br>Comprobantes este mes: ${r.comprobantes_mes} · emitidos en total: ${r.comprobantes_total}<br>Sedes: ${r.sedes}<br>Última venta: ${r.ultima_venta ? fecha(r.ultima_venta) : "sin ventas"}`
      : "Sin datos de ventas."; })()}</p>
    <label class="gr">Precio acordado (S/ al mes)</label><input type="number" id="d-precio" step="0.01" value="${n.precio_acordado ?? ""}">
    <label class="gr">Pagado hasta</label><input type="date" id="d-pago" value="${n.pagado_hasta ?? ""}">
    <label class="gr">Notas (solo tú las ves)</label><input type="text" id="d-notas" value="${esc(n.notas)}">
    <button onclick="guardarDatos('${id}')">Guardar datos</button>
    <div class="acc">
      <button class="pri" onclick="accion('${id}','activo')">Activar</button>
      <button onclick="extender('${id}')">+7 días de prueba</button>
      <button onclick="accion('${id}','suspendido')">Suspender</button>
      <button onclick="$('det').classList.add('hide')">Cerrar</button>
    </div>
    <div class="msg" id="a-msg"></div>
    <b>Productos (solo lectura)</b><div id="prods" class="gr">Cargando...</div>`;
  $("det").scrollIntoView({ behavior: "smooth" });
  const { data, error } = await sb.from("productos").select("codigo,nombre,precio,stock").eq("negocio_id", id).order("nombre").limit(50);
  $("prods").innerHTML = error ? "No se pudo cargar." : (data.length ? data.map(p =>
    `<div>${esc(p.codigo)} · ${esc(p.nombre)} · S/ ${Number(p.precio).toFixed(2)} · stock ${p.stock}</div>`).join("") : "Aún no cargó productos.");
}

async function accion(id, estado){
  if (!confirm("¿Cambiar el estado a " + estado + "?")) return;
  const { error } = await sb.rpc("admin_cambiar_estado", { p_negocio: id, p_estado: estado });
  if (error) return $("a-msg").textContent = error.message;
  await cargar(); ver(id);
}

async function extender(id){
  const { error } = await sb.rpc("admin_extender_prueba", { p_negocio: id, p_dias: 7 });
  if (error) return $("a-msg").textContent = error.message;
  await cargar(); ver(id);
}

async function guardarDatos(id){
  const precio = $("d-precio").value, pago = $("d-pago").value;
  const { error } = await sb.rpc("admin_guardar_datos", {
    p_negocio: id, p_precio: precio === "" ? null : parseFloat(precio),
    p_notas: $("d-notas").value.trim() || null, p_pagado: pago || null });
  if (error) return $("a-msg").textContent = error.message;
  await cargar(); ver(id);
}

async function salir(){ await sb.auth.signOut(); location.reload(); }

sb.auth.getSession().then(({ data }) => { if (data.session) iniciar(); });
