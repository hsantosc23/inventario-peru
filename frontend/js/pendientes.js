// Pagos pendientes: clientes que separaron un producto con adelanto o prometieron comprar
let PEND = [];

const peFalta = p => Math.max(0, Number(p.total) - Number(p.adelanto));

function calcFaltaPend(){
  const t = parseFloat($("pe-total").value) || 0, a = parseFloat($("pe-adelanto").value) || 0;
  $("pe-falta").textContent = "Falta pagar: " + sol(Math.max(0, t - a));
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
    (!q || `${p.cliente} ${p.detalle || ""} ${p.celular || ""}`.toLowerCase().includes(q)));
  const porCobrar = lista.filter(p => p.estado === "pendiente").reduce((a, p) => a + peFalta(p), 0);
  $("pe-resumen").textContent = `${lista.length} registro(s) · Por cobrar: ${sol(porCobrar)}`;
  $("pe-lista").innerHTML = lista.length ? lista.map(p => {
    const pagado = p.estado === "pagado";
    const fecha = new Date(p.creado).toLocaleDateString("es-PE", { timeZone: "America/Lima" });
    return `<div class="pend"><div class="pend-top"><b>${esc(p.cliente)}</b><span class="chip ${pagado ? "ok" : "pen"}">${pagado ? "Pagado" : "Pendiente"}</span></div>
      <div class="gr">${esc(p.detalle || "")}${p.celular ? " · " + esc(p.celular) : ""}</div>
      <div class="pend-nums">Total ${sol(p.total)} · Adelanto ${sol(p.adelanto)}${pagado ? "" : ` · <b>Falta ${sol(peFalta(p))}</b>`}</div>
      <small class="gr">${fecha}</small><br>
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
  const completo = adelanto >= total;
  const { error } = await sb.from("pagos_pendientes").insert({
    negocio_id: NEG.id, cliente, detalle: detalle || null, celular: celular || null, total, adelanto,
    estado: completo ? "pagado" : "pendiente", pagado_en: completo ? new Date().toISOString() : null,
  });
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  ["pe-cliente", "pe-detalle", "pe-total", "pe-adelanto", "pe-cel"].forEach(i => $(i).value = "");
  calcFaltaPend();
  msg.style.color = "#166534"; msg.textContent = "Guardado.";
  await cargarPendientes();
}

async function abonarPendiente(id){
  const p = PEND.find(x => x.id === id); if (!p) return;
  const v = prompt(`Abono de ${p.cliente}. Falta ${sol(peFalta(p))}.\n¿Cuánto paga ahora? (S/)`);
  if (v === null) return;
  const m = parseFloat(v);
  if (!(m > 0)) return alert("Escribe un monto válido.");
  const adelanto = Math.min(Number(p.total), Number(p.adelanto) + m), completo = adelanto >= Number(p.total);
  const { error } = await sb.from("pagos_pendientes").update({
    adelanto, estado: completo ? "pagado" : "pendiente", pagado_en: completo ? new Date().toISOString() : null }).eq("id", id);
  if (error) return alert("No se pudo guardar: " + error.message);
  await cargarPendientes();
}

async function pagarPendiente(id){
  const p = PEND.find(x => x.id === id); if (!p) return;
  if (!confirm(`¿${p.cliente} pagó completo? Se cobrarán ${sol(peFalta(p))} restantes.`)) return;
  const { error } = await sb.from("pagos_pendientes").update({ adelanto: p.total, estado: "pagado", pagado_en: new Date().toISOString() }).eq("id", id);
  if (error) return alert("No se pudo guardar: " + error.message);
  await cargarPendientes();
}

function avisarPendiente(id){
  const p = PEND.find(x => x.id === id); if (!p || !p.celular) return;
  const txt = `Hola ${p.cliente}, te recordamos que tienes un saldo pendiente de ${sol(peFalta(p))}${p.detalle ? " por: " + p.detalle : ""}. ¡Gracias!`;
  window.open(`https://wa.me/51${p.celular}?text=${encodeURIComponent(txt)}`, "_blank");
}

async function borrarPendiente(id){
  if (!confirm("¿Borrar este registro?")) return;
  const { error } = await sb.from("pagos_pendientes").delete().eq("id", id);
  if (error) return alert("No se pudo borrar: " + error.message);
  await cargarPendientes();
}