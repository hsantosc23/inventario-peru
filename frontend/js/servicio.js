// servicio.js — taller: órdenes de servicio de celulares
let ORD = [], ORD_F = "activas", ORD_SEL = null;

const EST_ORD = { recibido:"Recibido", diagnostico:"En diagnóstico", repuesto:"Esperando repuesto",
  reparacion:"En reparación", listo:"Listo para entregar", entregado:"Entregado", no_reparado:"No reparado" };
const EST_COLOR = { recibido:"#64748b", diagnostico:"#6366f1", repuesto:"#d97706", reparacion:"#0ea5e9",
  listo:"#16a34a", entregado:"#475569", no_reparado:"#ef4444" };
const esTaller = () => NEG && NEG.rubro === "celulares";

// ---------- Pantalla ----------
(function(){
  const tabs = document.querySelector("#inv .tabs"), cont = document.getElementById("t-inv");
  if (!tabs || !cont || document.getElementById("tab-ser")) return;
  const sede = document.getElementById("tab-sede");
  const b = document.createElement("button");
  b.id = "tab-ser"; b.textContent = "Taller"; b.onclick = () => verTab("ser");
  sede ? tabs.insertBefore(b, sede) : tabs.appendChild(b);
  const d = document.createElement("div");
  d.id = "t-ser"; d.className = "hide";
  d.innerHTML = `<div class="inv-grid">
    <div class="inv-izq"><div class="card">
      <b>Nueva orden de servicio</b>
      <label>Cliente</label><input type="text" id="so-cliente" maxlength="60">
      <div class="f2">
        <div><label>Celular</label><input type="tel" id="so-cel" inputmode="numeric" maxlength="9" placeholder="987654321"></div>
        <div><label>DNI (opcional)</label><input type="text" id="so-doc" inputmode="numeric" maxlength="8"></div>
        <div><label>Marca</label><input type="text" id="so-marca" placeholder="Samsung"></div>
        <div><label>Modelo</label><input type="text" id="so-modelo" placeholder="Galaxy A54"></div>
        <div><label>IMEI (opcional)</label><input type="text" id="so-imei" inputmode="numeric" maxlength="17"></div>
        <div><label>Color</label><input type="text" id="so-color"></div>
      </div>
      <label>Falla que reporta el cliente</label><input type="text" id="so-falla" maxlength="200">
      <label>Estado físico al recibir</label><input type="text" id="so-fisico" maxlength="200" placeholder="Rayones en la tapa, esquina golpeada">
      <label>Qué deja además del equipo</label><input type="text" id="so-acc" maxlength="160" placeholder="Cargador, chip, memoria">
      <label>Clave o patrón <small class="gr">(se borra al entregar)</small></label><input type="text" id="so-clave" maxlength="40">
      <div class="f2">
        <div><label>Presupuesto (S/)</label><input type="number" id="so-pres" min="0" step="0.01" inputmode="decimal"></div>
        <div><label>Adelanto (S/)</label><input type="number" id="so-ade" min="0" step="0.01" inputmode="decimal"></div>
      </div>
      <label>Medio de pago del adelanto</label>
      <select id="so-medio">${Object.entries(MEDIOS).map(([k,t]) => `<option value="${k}">${t}</option>`).join("")}</select>
      <label>Técnico</label><input type="text" id="so-tec" maxlength="40">
      <button class="pri full" onclick="guardarOrden()">Registrar orden</button>
      <div class="msg" id="so-msg"></div>
    </div></div>
    <div class="inv-der">
      <input type="text" id="so-buscar" placeholder="Buscar por cliente, celular, IMEI o número" oninput="pintarOrdenes()">
      <div id="so-chips" style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0"></div>
      <div id="so-resumen" style="margin:10px 0;font-weight:600;color:var(--gr)"></div>
      <div id="so-lista"></div>
    </div></div>`;
  cont.parentElement.insertBefore(d, cont.nextSibling);
})();

// ---------- Datos ----------
async function cargarOrdenes(){
  const box = $("so-lista"); if (!box) return;
  const { data, error } = await sb.from("ordenes_servicio")
    .select("*, orden_repuestos(id,codigo,nombre,cantidad,precio)")
    .eq("negocio_id", NEG.id).order("fecha", { ascending: false }).limit(400);
  if (error) { box.innerHTML = `<p class="msg">No se pudieron cargar: ${esc(error.message)}</p>`; return; }
  ORD = data || [];
  pintarOrdenes();
}

function pintarOrdenes(){
  const q = ($("so-buscar").value || "").trim().toLowerCase();
  const activas = o => o.estado !== "entregado" && o.estado !== "no_reparado";
  const cuenta = {};
  Object.keys(EST_ORD).forEach(k => cuenta[k] = ORD.filter(o => o.estado === k).length);
  $("so-chips").innerHTML =
    `<button class="${ORD_F === "activas" ? "pri" : ""}" onclick="filtroOrden('activas')">En taller (${ORD.filter(activas).length})</button>` +
    Object.entries(EST_ORD).map(([k,t]) => `<button class="${ORD_F === k ? "pri" : ""}" onclick="filtroOrden('${k}')">${t} (${cuenta[k]})</button>`).join("");

  let r = ORD_F === "activas" ? ORD.filter(activas) : ORD.filter(o => o.estado === ORD_F);
  if (q) r = r.filter(o => [o.cliente, o.celular, o.imei, o.marca, o.modelo, String(o.numero)]
    .some(v => String(v || "").toLowerCase().includes(q)));

  const pend = r.reduce((s, o) => s + Math.max(0, Number(o.total || o.presupuesto || 0) - Number(o.adelanto || 0)), 0);
  $("so-resumen").textContent = `${r.length} orden(es)` + (pend ? ` · Por cobrar: ${sol(pend)}` : "");

  const dias = o => Math.floor((Date.now() - new Date(o.fecha)) / 86400000);
  $("so-lista").innerHTML = r.length ? r.map(o => {
    const d = dias(o), alerta = d >= 7 && o.estado !== "entregado" && o.estado !== "no_reparado";
    return `<div class="fila" style="cursor:pointer" onclick="verOrden('${o.id}')">
      <div style="flex:1;min-width:0">
        <b>#${String(o.numero).padStart(4,"0")}</b> · ${esc(o.cliente)}
        <small class="gr" style="display:block">${esc([o.marca,o.modelo].filter(Boolean).join(" ") || "Equipo")} · ${esc(o.falla || "")}</small>
        <small style="color:${EST_COLOR[o.estado]};font-weight:700">${EST_ORD[o.estado]}</small>
        <small class="gr"> · ${d === 0 ? "hoy" : d + " día(s)"}${alerta ? " ⚠" : ""}</small>
      </div>
      <div class="pre">${sol(o.total || o.presupuesto || 0)}</div></div>`;
  }).join("") : `<p class="gr">No hay órdenes aquí.</p>`;
}

function filtroOrden(k){ ORD_F = k; pintarOrdenes(); }

async function guardarOrden(){
  const msg = $("so-msg"); msg.style.color = ""; msg.textContent = "";
  const cliente = $("so-cliente").value.trim(), falla = $("so-falla").value.trim();
  if (!cliente) return msg.textContent = "Escribe el nombre del cliente.";
  if (!falla) return msg.textContent = "Escribe la falla que reporta el cliente.";
  const fila = {
    negocio_id: NEG.id, cliente, celular: $("so-cel").value.trim() || null, documento: $("so-doc").value.trim() || null,
    marca: $("so-marca").value.trim() || null, modelo: $("so-modelo").value.trim() || null,
    imei: $("so-imei").value.trim() || null, color: $("so-color").value.trim() || null,
    falla, estado_fisico: $("so-fisico").value.trim() || null, accesorios: $("so-acc").value.trim() || null,
    clave_equipo: $("so-clave").value.trim() || null,
    presupuesto: parseFloat($("so-pres").value) || 0, adelanto: parseFloat($("so-ade").value) || 0,
    medio_adelanto: $("so-medio").value, tecnico: $("so-tec").value.trim() || null
  };
  const { data, error } = await sb.from("ordenes_servicio").insert(fila).select().single();
  if (error) return msg.textContent = "No se pudo registrar: " + error.message;
  ["so-cliente","so-cel","so-doc","so-marca","so-modelo","so-imei","so-color","so-falla","so-fisico","so-acc","so-clave","so-pres","so-ade","so-tec"]
    .forEach(i => $(i).value = "");
  msg.style.color = "#16a34a"; msg.textContent = `Orden #${String(data.numero).padStart(4,"0")} registrada.`;
  await cargarOrdenes();
  imprimirRecepcion(data.id);
}

// ---------- Detalle ----------
function verOrden(id){
  const o = ORD.find(x => x.id === id); if (!o) return;
  ORD_SEL = id;
  const rep = o.orden_repuestos || [];
  const totalRep = rep.reduce((s, r) => s + Number(r.precio) * r.cantidad, 0);
  const entregada = o.estado === "entregado";
  modalBase(`<b style="font-size:18px">Orden #${String(o.numero).padStart(4,"0")}</b>
    <p class="gr" style="margin:6px 0">${esc(o.cliente)}${o.celular ? " · " + esc(o.celular) : ""} · ${new Date(o.fecha).toLocaleString("es-PE")}</p>
    <div class="card" style="margin-bottom:10px">
      <b>${esc([o.marca,o.modelo].filter(Boolean).join(" ") || "Equipo")}</b>
      ${o.imei ? `<small class="gr" style="display:block">IMEI ${esc(o.imei)}</small>` : ""}
      <small class="gr" style="display:block">Falla: ${esc(o.falla)}</small>
      ${o.estado_fisico ? `<small class="gr" style="display:block">Estado: ${esc(o.estado_fisico)}</small>` : ""}
      ${o.accesorios ? `<small class="gr" style="display:block">Dejó: ${esc(o.accesorios)}</small>` : ""}
      ${o.clave_equipo ? `<small class="gr" style="display:block">Clave: ${esc(o.clave_equipo)}</small>` : ""}
    </div>
    <label>Estado</label>
    <select id="od-estado" ${entregada ? "disabled" : ""} onchange="cambiarEstadoOrden()">
      ${Object.entries(EST_ORD).map(([k,t]) => `<option value="${k}"${k === o.estado ? " selected" : ""}>${t}</option>`).join("")}</select>
    <label>Diagnóstico del técnico</label>
    <input type="text" id="od-diag" maxlength="300" value="${esc(o.diagnostico || "")}" ${entregada ? "disabled" : ""} onchange="guardarDiag()">
    <div style="margin-top:12px"><b>Repuestos usados</b>
      <div id="od-rep">${rep.length ? rep.map(r => `<div class="fila"><div style="flex:1;min-width:0">${r.cantidad} × ${esc(r.nombre)}<small class="gr" style="display:block">${esc(r.codigo || "")}</small></div>
        <div class="pre">${sol(Number(r.precio) * r.cantidad)}</div>
        ${entregada ? "" : `<button class="peligro" onclick="quitarRep('${r.id}')">Quitar</button>`}</div>`).join("")
        : `<p class="gr">Todavía no se usó ningún repuesto.</p>`}</div>
      ${entregada ? "" : `<input type="text" id="od-buscar" placeholder="Busca un repuesto del inventario" autocomplete="off" oninput="buscarRep()"><div id="od-res"></div>`}
    </div>
    <div class="card" style="margin-top:12px">
      <div class="f2">
        <div><label>Mano de obra (S/)</label><input type="number" id="od-mo" min="0" step="0.01" value="${Number(o.mano_obra || 0).toFixed(2)}" ${entregada ? "disabled" : ""} oninput="calcOrden()"></div>
        <div><label>Garantía (días)</label><input type="number" id="od-gar" min="0" step="1" value="${o.garantia_dias || 30}" ${entregada ? "disabled" : ""}></div>
      </div>
      <p class="gr" style="margin:6px 0">Repuestos: ${sol(totalRep)} · Adelanto: ${sol(o.adelanto || 0)}</p>
      <div id="od-total" class="pre" style="font-size:18px"></div>
      ${entregada ? `<p class="gr">Entregada el ${new Date(o.entregado_en).toLocaleString("es-PE")}${o.garantia_hasta ? ` · Garantía hasta el ${new Date(o.garantia_hasta + "T12:00:00").toLocaleDateString("es-PE")}` : ""}</p>`
        : `<label>Medio de pago del saldo</label>
           <select id="od-medio">${Object.entries(MEDIOS).map(([k,t]) => `<option value="${k}">${t}</option>`).join("")}</select>
           <button class="pri full" onclick="entregarOrden()">Entregar y cobrar</button>`}
    </div>
    <div class="msg" id="od-msg"></div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button style="flex:1" onclick="imprimirRecepcion('${o.id}')">Imprimir</button>
      ${o.celular ? `<button style="flex:1" onclick="avisarOrden('${o.id}')">WhatsApp</button>` : ""}
    </div>`, 540);
  calcOrden();
}

function calcOrden(){
  const o = ORD.find(x => x.id === ORD_SEL); if (!o || !$("od-total")) return;
  const rep = (o.orden_repuestos || []).reduce((s, r) => s + Number(r.precio) * r.cantidad, 0);
  const mo = parseFloat($("od-mo").value) || 0;
  const total = Math.round((rep + mo) * 100) / 100, saldo = Math.round((total - Number(o.adelanto || 0)) * 100) / 100;
  $("od-total").textContent = `Total: ${sol(total)} · Saldo a cobrar: ${sol(Math.max(0, saldo))}`;
}

async function cambiarEstadoOrden(){
  const { error } = await sb.from("ordenes_servicio").update({ estado: $("od-estado").value }).eq("id", ORD_SEL);
  if (error) return $("od-msg").textContent = "No se pudo cambiar: " + error.message;
  await cargarOrdenes(); verOrden(ORD_SEL);
}

async function guardarDiag(){
  await sb.from("ordenes_servicio").update({ diagnostico: $("od-diag").value.trim() || null }).eq("id", ORD_SEL);
  await cargarOrdenes();
}

function buscarRep(){
  const q = $("od-buscar").value.trim().toLowerCase(), box = $("od-res");
  if (!q) { box.className = ""; box.innerHTML = ""; return; }
  const r = PRODS.filter(p => (p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q))).slice(0, 6);
  box.className = "res";
  box.innerHTML = r.length ? r.map(p => p.stock > 0
    ? `<div onclick="ponerRep('${p.id}')"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)} · S/ ${Number(p.precio).toFixed(2)} <small class="gr">(stock ${p.stock})</small></div>`
    : `<div class="gr"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)} · sin stock</div>`).join("")
    : `<div class="gr">No se encontró ese repuesto.</div>`;
}

async function ponerRep(id){
  const p = PRODS.find(x => x.id === id); if (!p) return;
  const { error } = await sb.rpc("agregar_repuesto", { p_orden: ORD_SEL, p_producto: id, p_cantidad: 1, p_precio: Number(p.precio) });
  if (error) return $("od-msg").textContent = "No se pudo agregar: " + error.message;
  await Promise.all([cargarProductos(), cargarOrdenes()]);
  verOrden(ORD_SEL);
}

async function quitarRep(item){
  const { error } = await sb.rpc("quitar_repuesto", { p_item: item });
  if (error) return $("od-msg").textContent = "No se pudo quitar: " + error.message;
  await Promise.all([cargarProductos(), cargarOrdenes()]);
  verOrden(ORD_SEL);
}

function entregarOrden(){
  const o = ORD.find(x => x.id === ORD_SEL); if (!o) return;
  const mo = parseFloat($("od-mo").value) || 0, gar = parseInt($("od-gar").value, 10) || 0;
  const rep = (o.orden_repuestos || []).reduce((s, r) => s + Number(r.precio) * r.cantidad, 0);
  const total = Math.round((rep + mo) * 100) / 100;
  const saldo = Math.round((total - Number(o.adelanto || 0)) * 100) / 100;
  if (total <= 0) return $("od-msg").textContent = "Pon la mano de obra o agrega repuestos antes de entregar.";
  const formal = NEG.formalidad !== "por_formalizar";
  cerrarModal();
  modalBase(`<b>Entregar y cobrar</b>
    <p class="gr" style="margin:6px 0">Orden #${String(o.numero).padStart(4,"0")} · Total ${sol(total)}${o.adelanto ? ` · Adelanto ${sol(o.adelanto)}` : ""}</p>
    <div class="pre" style="font-size:19px;margin-bottom:8px">Cobrar ahora: ${sol(Math.max(0, saldo))}</div>
    <label>Comprobante</label>
    <select id="oe-tipo" onchange="verTipoEntrega()">
      ${formal ? `<option value="boleta">Boleta</option><option value="factura">Factura</option>`
               : `<option value="nota">Ticket de venta</option>`}
    </select>
    <div id="oe-b" class="${formal ? "" : "hide"}">
      <label>DNI del cliente (obligatorio si pasa de S/ 700)</label><input type="text" id="oe-dni" inputmode="numeric" maxlength="8" value="${esc(o.documento || "")}">
      <label>Nombre del cliente</label><input type="text" id="oe-nom" value="${esc(o.cliente || "")}">
    </div>
    <div id="oe-f" class="hide">
      <label>RUC</label><input type="text" id="oe-ruc" inputmode="numeric" maxlength="11">
      <label>Razón social</label><input type="text" id="oe-razon">
      <label>Dirección (opcional)</label><input type="text" id="oe-dir">
    </div>
    <div id="oe-n" class="${formal ? "hide" : ""}">
      <label>Nombre del cliente</label><input type="text" id="oe-nom-n" value="${esc(o.cliente || "")}">
      <label>Celular (opcional)</label><input type="tel" id="oe-cel" inputmode="numeric" maxlength="9" value="${esc(o.celular || "")}">
    </div>
    <label>Medio de pago</label>
    <select id="oe-medio">${Object.entries(MEDIOS).map(([k,t]) => `<option value="${k}">${t}</option>`).join("")}</select>
    <div class="msg" id="oe-msg"></div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button style="flex:1" onclick="cerrarModal()">Cancelar</button>
      <button class="pri" style="flex:2" id="oe-ok" onclick="confirmarEntrega(${mo}, ${gar})">Entregar y cobrar</button></div>`);
}

function verTipoEntrega(){
  const t = $("oe-tipo").value;
  $("oe-b").classList.toggle("hide", t !== "boleta");
  $("oe-f").classList.toggle("hide", t !== "factura");
  $("oe-n").classList.toggle("hide", t !== "nota");
}

async function confirmarEntrega(mo, gar){
  const msg = $("oe-msg"); msg.style.color = ""; msg.textContent = "";
  const tipo = $("oe-tipo").value, nota = tipo === "nota";
  const o = ORD.find(x => x.id === ORD_SEL); if (!o) return;
  const rep = (o.orden_repuestos || []).reduce((s, r) => s + Number(r.precio) * r.cantidad, 0);
  const total = Math.round((rep + mo) * 100) / 100;

  let doc = "", nombre = "", dir = "", cel = null;
  if (tipo === "factura") {
    doc = $("oe-ruc").value.trim(); nombre = $("oe-razon").value.trim(); dir = $("oe-dir").value.trim();
    if (!/^[0-9]{11}$/.test(doc)) return msg.textContent = "El RUC debe tener 11 dígitos.";
    if (!nombre) return msg.textContent = "Escribe la razón social.";
  } else if (tipo === "boleta") {
    doc = $("oe-dni").value.trim(); nombre = $("oe-nom").value.trim();
    if (doc && !/^[0-9]{8}$/.test(doc)) return msg.textContent = "El DNI debe tener 8 dígitos.";
    if (total > 700 && !doc) return msg.textContent = "Una boleta mayor a S/ 700 necesita el DNI del cliente.";
  } else {
    nombre = $("oe-nom-n").value.trim(); cel = $("oe-cel").value.trim() || null;
    if (cel && !/^[0-9]{9}$/.test(cel)) return msg.textContent = "El celular debe tener 9 dígitos.";
  }
  if (!nota) {
    const { data: uso } = await sb.rpc("mi_uso_comprobantes");
    if (uso && uso.en_prueba && uso.usados >= uso.limite)
      return msg.textContent = `En tu semana de prueba ya usaste las ${uso.limite} boletas o facturas disponibles.`;
  }

  const btn = $("oe-ok"); btn.disabled = true;
  msg.textContent = "Registrando...";

  const { error: e1 } = await sb.rpc("entregar_orden",
    { p_orden: ORD_SEL, p_mano_obra: mo, p_medio: $("oe-medio").value, p_garantia: gar });
  if (e1) { btn.disabled = false; return msg.textContent = "No se pudo entregar: " + e1.message; }

  const { data: venta, error: e2 } = await sb.rpc("facturar_orden", { p_orden: ORD_SEL });
  if (e2) { btn.disabled = false; return msg.textContent = "Orden entregada, pero no se pudo registrar la venta: " + e2.message; }

  await sb.rpc("fijar_datos_venta", { p_venta: venta, p_medio: $("oe-medio").value,
    p_nombre: nombre || null, p_celular: cel });

  let r = null, e3 = null;
  if (!nota) {
    ({ error: e3 } = await sb.rpc("datos_comprobante", { p_venta: venta, p_tipo: tipo, p_doc: doc, p_nombre: nombre, p_direccion: dir }));
    if (!e3) r = await emitirComprobante(venta, tipo, doc, nombre);
  }

  cerrarModal();
  await Promise.all([cargarOrdenes(), cargarProductos()]);
  if (typeof cargarVentas === "function") cargarVentas();
  if (e3) alert("Orden entregada, pero no se pudo emitir el comprobante: " + e3.message);
  else if (r && !r.ok) alert("Orden entregada, pero SUNAT no aceptó el comprobante: " + (r.mensaje || r.error));
  else imprimirComprobante(venta);
}

// ---------- Impresión ----------
function imprimirRecepcion(id){
  const o = ORD.find(x => x.id === id) || {};
  const rep = o.orden_repuestos || [];
  const entregada = o.estado === "entregado";
  const total = Number(o.total || o.presupuesto || 0), saldo = total - Number(o.adelanto || 0);
  imprimirHTML(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Orden ${o.numero}</title><style>
    @page{size:80mm auto;margin:4mm}
    body{font:12px/1.35 monospace;width:72mm;margin:0;color:#000}
    .c{text-align:center}.r{text-align:right}
    hr{border:0;border-top:1px dashed #000;margin:6px 0}
    table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:2px 0}
  </style></head><body>
  <div class="c"><b>${esc(NEG.nombre || "")}</b><br>${entregada ? "COMPROBANTE DE ENTREGA" : "ORDEN DE SERVICIO"}<br>N.º ${String(o.numero).padStart(4,"0")}</div><hr>
  Fecha: ${new Date(o.fecha).toLocaleString("es-PE")}<br>
  Cliente: ${esc(o.cliente || "")}${o.celular ? "<br>Cel: " + esc(o.celular) : ""}<hr>
  Equipo: ${esc([o.marca,o.modelo].filter(Boolean).join(" "))}<br>
  ${o.imei ? "IMEI: " + esc(o.imei) + "<br>" : ""}
  Falla: ${esc(o.falla || "")}<br>
  ${o.estado_fisico ? "Estado: " + esc(o.estado_fisico) + "<br>" : ""}
  ${o.accesorios ? "Deja: " + esc(o.accesorios) + "<br>" : ""}<hr>
  ${entregada && rep.length ? `<table>${rep.map(r => `<tr><td>${r.cantidad} × ${esc(r.nombre)}</td><td class="r">S/ ${(r.precio*r.cantidad).toFixed(2)}</td></tr>`).join("")}
    <tr><td>Mano de obra</td><td class="r">S/ ${Number(o.mano_obra||0).toFixed(2)}</td></tr></table><hr>` : ""}
  <table>
    <tr><td><b>${entregada ? "TOTAL" : "Presupuesto"}</b></td><td class="r"><b>S/ ${total.toFixed(2)}</b></td></tr>
    ${o.adelanto ? `<tr><td>Adelanto</td><td class="r">S/ ${Number(o.adelanto).toFixed(2)}</td></tr>
    <tr><td><b>Saldo</b></td><td class="r"><b>S/ ${Math.max(0,saldo).toFixed(2)}</b></td></tr>` : ""}
  </table><hr>
  ${entregada && o.garantia_hasta ? `<div class="c">Garantía del servicio hasta el ${new Date(o.garantia_hasta+"T12:00:00").toLocaleDateString("es-PE")}</div><hr>` : ""}
  <div class="c" style="font-size:10px">Pasados 30 días sin recoger el equipo, el taller no se responsabiliza por su custodia.<br>Conserve este comprobante para el recojo.</div>
  </body></html>`);
}

function avisarOrden(id){
  const o = ORD.find(x => x.id === id); if (!o || !o.celular) return;
  const t = o.estado === "listo"
    ? `Hola ${o.cliente}, su ${[o.marca,o.modelo].filter(Boolean).join(" ")} ya está listo para recoger. Orden #${String(o.numero).padStart(4,"0")}.`
    : `Hola ${o.cliente}, le escribo por su orden #${String(o.numero).padStart(4,"0")} (${[o.marca,o.modelo].filter(Boolean).join(" ")}). Estado: ${EST_ORD[o.estado]}.`;
  window.open(`https://wa.me/51${o.celular}?text=${encodeURIComponent(t)}`, "_blank");
}

// ---------- Catálogo de servicios (se venden desde Ventas, sin stock) ----------
let SERVS = [];

async function cargarServicios(){
  const { data } = await sb.from("servicios").select("*").eq("negocio_id", NEG.id).eq("activo", true).order("nombre");
  SERVS = (data || []).map(s => ({ ...s, codigo: s.codigo || "SERV", es_servicio: true }));
}

function abrirServicios(){
  modalBase(`<b>Servicios que cobras</b>
    <p class="gr" style="margin:6px 0">Aparecen en Ventas al buscarlos, igual que un producto, pero no descuentan stock.</p>
    <div class="f2">
      <div><label>Nombre del servicio</label><input type="text" id="sv-nombre" maxlength="60" placeholder="Ej.: formateo e instalación"></div>
      <div><label>Precio (S/)</label><input type="number" id="sv-precio" min="0" step="0.01" inputmode="decimal"></div>
      <div><label>Garantía (días)</label><input type="number" id="sv-gar" min="0" step="1" value="0"></div>
    </div>
    <button class="pri full" onclick="guardarServicio()">Agregar servicio</button>
    <div class="msg" id="sv-msg"></div>
    <div id="sv-lista" style="max-height:40vh;overflow:auto;margin-top:10px"></div>`, 520);
  listarServicios();
}

function listarServicios(){
  $("sv-lista").innerHTML = SERVS.length ? SERVS.map(s =>
    `<div class="fila"><div style="flex:1;min-width:0"><b>${esc(s.codigo)}</b> · ${esc(s.nombre)}
      ${s.garantia_dias ? `<small class="gr" style="display:block">Garantía ${s.garantia_dias} día(s)</small>` : ""}</div>
      <div class="pre">S/ ${Number(s.precio).toFixed(2)}</div>
      <button class="peligro" onclick="borrarServicio('${s.id}')">Quitar</button></div>`).join("")
    : `<p class="gr">Todavía no agregaste ningún servicio.</p>`;
}

async function guardarServicio(){
  const msg = $("sv-msg"); msg.style.color = ""; msg.textContent = "";
  const nombre = $("sv-nombre").value.trim(), precio = parseFloat($("sv-precio").value);
  if (!nombre) return msg.textContent = "Escribe el nombre del servicio.";
  if (!(precio >= 0)) return msg.textContent = "Escribe un precio válido.";

  // código automático: SERV0001, SERV0002...
  const { data: todos } = await sb.from("servicios").select("codigo").eq("negocio_id", NEG.id);
  let n = 0;
  (todos || []).forEach(s => { const m = /^SERV(\d+)$/.exec(s.codigo || ""); if (m) n = Math.max(n, parseInt(m[1], 10)); });
  const codigo = "SERV" + String(n + 1).padStart(4, "0");

  const { error } = await sb.from("servicios").insert({ negocio_id: NEG.id, nombre, precio, codigo,
    garantia_dias: parseInt($("sv-gar").value, 10) || 0 });
  if (error) return msg.textContent = error.code === "23505" ? "Ya tienes un servicio con ese nombre." : "No se pudo guardar: " + error.message;
  ["sv-nombre","sv-precio"].forEach(i => $(i).value = "");
  $("sv-gar").value = "0";
  await cargarServicios(); listarServicios();
  msg.style.color = "#16a34a"; msg.textContent = "Servicio agregado con el código " + codigo + ".";
}

async function borrarServicio(id){
  if (!confirm("¿Quitar este servicio del catálogo? Las ventas ya hechas no se tocan.")) return;
  await sb.from("servicios").update({ activo: false }).eq("id", id);
  await cargarServicios(); listarServicios();
}

// En Inventario, elegir "Servicio" en Tipo de producto abre el catálogo de servicios
document.addEventListener("change", e => {
  if (!e.target || e.target.id !== "fa-familia" || e.target.value !== "Servicio") return;
  setTimeout(() => {
    const el = document.getElementById("fa-familia");
    if (el) { el.value = ""; if (typeof pintarCamposProducto === "function") pintarCamposProducto(); }
    abrirServicios();
  }, 0);
});