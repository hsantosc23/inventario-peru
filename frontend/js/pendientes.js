// Pagos pendientes: separados con adelanto o clientes que prometieron comprar. Conserva el historial de pagos.
let PEND = [], PE_PROD = null;

const peFalta = p => Math.max(0, Math.round((Number(p.total) - Number(p.adelanto)) * 100) / 100);
const peFecha = f => new Date(f).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "2-digit" });

function calcFaltaPend(){
  const t = parseFloat($("pe-total").value) || 0, a = parseFloat($("pe-adelanto").value) || 0;
  $("pe-falta").textContent = "Falta pagar: " + sol(Math.max(0, t - a));
}

// Al escribir el producto salen las opciones del inventario, como en una venta
function buscarPendProd(){
  PE_PROD = null;
  const q = $("pe-detalle").value.trim().toLowerCase(), box = $("pe-res");
  if (!q) { box.className = ""; box.innerHTML = ""; return; }
  const r = PRODS.filter(p => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)).slice(0, 6);
  box.className = "res";
  box.innerHTML = r.length ? r.map(p =>
    `<div onclick="elegirPendProd('${p.id}')"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)} · S/ ${Number(p.precio).toFixed(2)} <small class="gr">(stock ${p.stock})</small></div>`).join("")
    : `<div class="gr">No está en tu inventario: se guardará como texto libre.</div>`;
}

function elegirPendProd(id){
  const p = PRODS.find(x => x.id === id); if (!p) return;
  PE_PROD = p.id;
  $("pe-detalle").value = `${p.codigo} · ${p.nombre}`;
  $("pe-total").value = Number(p.precio).toFixed(2);
  $("pe-res").className = ""; $("pe-res").innerHTML = "";
  calcFaltaPend();
  $("pe-adelanto").focus();
}

async function cargarPendientes(){
  const { data, error } = await sb.from("pagos_pendientes").select("*").eq("negocio_id", NEG.id).order("creado", { ascending: false });
  if (error) { $("pe-resumen").textContent = "No se pudo cargar: " + error.message; return; }
  PEND = data || [];
  listarPendientes();
}

function listarPendientes(){
  const q = $("pe-buscar").value.trim().toLowerCase(), est = $("pe-estado").value;
  const lista = PEND.filter(p => (est === "todos" || p.estado === est) &&
    (!q || `${p.cliente} ${p.detalle || ""} ${p.celular || ""}`.toLowerCase().includes(q)))
    .sort((a, b) => (a.estado === b.estado ? 0 : a.estado === "pendiente" ? -1 : 1));
  const porCobrar = lista.filter(p => p.estado === "pendiente").reduce((a, p) => a + peFalta(p), 0);
  $("pe-resumen").textContent = `${lista.length} registro(s) · Por cobrar: ${sol(porCobrar)}`;
  $("pe-lista").innerHTML = lista.length ? lista.map(p => {
    const pagado = p.estado === "pagado";
    const pagos = (p.abonos || []).map(a => `${peFecha(a.fecha)}: ${sol(a.monto)}`).join(" · ");
    return `<div class="pend${pagado ? " pagado" : ""}"><div class="pend-top"><b>${esc(p.cliente)}</b><span class="chip ${pagado ? "ok" : "pen"}">${pagado ? "Pagado" : "Pendiente"}</span></div>
      <div class="gr">${esc(p.detalle || "")}${p.celular ? " · " + esc(p.celular) : ""}</div>
      <div class="pend-nums">Total ${sol(p.total)} · Pagado ${sol(p.adelanto)}${pagado ? "" : ` · <b>Falta ${sol(peFalta(p))}</b>`}</div>
      <small class="gr">Registrado el ${peFecha(p.creado)}${pagado && p.pagado_en ? " · Completado el " + peFecha(p.pagado_en) : ""}</small>
      ${pagos ? `<div class="pend-hist"><b>Pagos:</b> ${pagos}</div>` : ""}
      ${pagado ? "" : `<button onclick="abonarPendiente('${p.id}')">Registrar abono</button>
      <button class="pri" onclick="pagarPendiente('${p.id}')">Pago completo</button>
      ${p.celular ? `<button onclick="avisarPendiente('${p.id}')">WhatsApp</button>` : ""}`}
      <button onclick="borrarPendiente('${p.id}')">Borrar</button></div>`;
  }).join("") : `<p class="gr">No hay registros.</p>`;
}

async function guardarPendiente(){
  const msg = $("pe-msg"); msg.style.color = ""; msg.textContent = "";
  const cliente = $("pe-cliente").value.trim(), detalle = $("pe-detalle").value.trim(), celular = $("pe-cel").value.trim();
  const total = parseFloat($("pe-total").value), adelanto = parseFloat($("pe-adelanto").value || "0");
  if (!cliente) return msg.textContent = "Escribe el nombre del cliente.";
  if (!(total > 0)) return msg.textContent = "Escribe el precio total.";
  if (isNaN(adelanto) || adelanto < 0) return msg.textContent = "El adelanto no es válido.";
  if (adelanto > total) return msg.textContent = "El adelanto no puede ser mayor al total.";
  if (celular && !/^[0-9]{9}$/.test(celular)) return msg.textContent = "El celular debe tener 9 dígitos.";
  const ahora = new Date().toISOString(), completo = adelanto >= total;
  const { error } = await sb.from("pagos_pendientes").insert({
    negocio_id: NEG.id, cliente, detalle: detalle || null, celular: celular || null, producto_id: PE_PROD,
    total, adelanto, abonos: adelanto > 0 ? [{ fecha: ahora, monto: adelanto }] : [],
    estado: completo ? "pagado" : "pendiente", pagado_en: completo ? ahora : null,
  });
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  ["pe-cliente", "pe-detalle", "pe-total", "pe-adelanto", "pe-cel"].forEach(i => $(i).value = "");
  PE_PROD = null; $("pe-res").className = ""; $("pe-res").innerHTML = "";
  calcFaltaPend();
  msg.style.color = "#166534"; msg.textContent = "Guardado.";
  await cargarPendientes();
}

async function actualizarPend(id, cambios){
  const { error } = await sb.from("pagos_pendientes").update(cambios).eq("id", id);
  if (error) return alert("No se pudo guardar: " + error.message);
  await cargarPendientes();
}

async function abonarPendiente(id){
  const p = PEND.find(x => x.id === id); if (!p) return;
  const v = prompt(`Abono de ${p.cliente}. Falta ${sol(peFalta(p))}.\n¿Cuánto paga ahora? (S/)`);
  if (v === null) return;
  let m = Math.round(parseFloat(v.replace(",", ".")) * 100) / 100;
  if (!(m > 0)) return alert("Escribe un monto válido.");
  m = Math.min(m, peFalta(p));
  const adelanto = Math.round((Number(p.adelanto) + m) * 100) / 100, completo = adelanto >= Number(p.total), ahora = new Date().toISOString();
  await actualizarPend(id, {
    adelanto, abonos: [...(p.abonos || []), { fecha: ahora, monto: m }],
    estado: completo ? "pagado" : "pendiente", pagado_en: completo ? ahora : null });
}

async function pagarPendiente(id){
  const p = PEND.find(x => x.id === id); if (!p) return;
  if (!confirm(`¿${p.cliente} pagó completo? Se registrarán ${sol(peFalta(p))} restantes y quedará en el historial.`)) return;
  const ahora = new Date().toISOString();
  await actualizarPend(id, { adelanto: p.total, abonos: [...(p.abonos || []), { fecha: ahora, monto: peFalta(p) }], estado: "pagado", pagado_en: ahora });
}

function avisarPendiente(id){
  const p = PEND.find(x => x.id === id); if (!p || !p.celular) return;
  const txt = `Hola ${p.cliente}, te recordamos que tienes un saldo pendiente de ${sol(peFalta(p))}${p.detalle ? " por: " + p.detalle : ""}. ¡Gracias!`;
  window.open(`https://wa.me/51${p.celular}?text=${encodeURIComponent(txt)}`, "_blank");
}

async function borrarPendiente(id){
  const p = PEND.find(x => x.id === id);
  if (!confirm(p && p.estado === "pagado" ? "Este registro es parte de tu historial. ¿Borrarlo de todos modos?" : "¿Borrar este registro?")) return;
  const { error } = await sb.from("pagos_pendientes").delete().eq("id", id);
  if (error) return alert("No se pudo borrar: " + error.message);
  await cargarPendientes();
}