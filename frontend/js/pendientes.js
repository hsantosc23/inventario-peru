// Pagos pendientes: separados con adelanto o clientes que prometieron comprar. Al completarse generan la venta.
let PEND = [], PE_ITEMS = [], PC = null;

const peFalta = p => Math.max(0, Math.round((Number(p.total) - Number(p.adelanto)) * 100) / 100);
const peFecha = f => new Date(f).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "2-digit" });

function calcFaltaPend(){
  const t = parseFloat($("pe-total").value) || 0, a = parseFloat($("pe-adelanto").value) || 0;
  $("pe-falta").textContent = "Falta pagar: " + sol(Math.max(0, t - a));
}

// ---------- Prendas del pendiente (varias) ----------

function cajaItemsPend(){
  let b = $("pe-items");
  if (!b) { b = document.createElement("div"); b.id = "pe-items"; $("pe-res").after(b); }
  return b;
}

function pintarItemsPend(){
  const box = cajaItemsPend();
  box.innerHTML = PE_ITEMS.map((i, k) => {
    const p = PRODS.find(x => x.id === i.producto_id);
    const stock = p ? p.stock : i.cantidad;
    return `<div class="fila carro"><div class="info"><b>${esc(i.codigo)}</b> · ${esc(i.nombre)}<small>S/ ${Number(i.precio).toFixed(2)} c/u · stock ${stock}</small></div>
      <input type="number" class="cant" min="1" max="${stock}" value="${i.cantidad}" onchange="pendCant(${k}, this.value)">
      <div class="pre">S/ ${(Number(i.precio) * i.cantidad).toFixed(2)}</div>
      <button onclick="pendQuitar(${k})">Quitar</button></div>`;
  }).join("");
  if (PE_ITEMS.length) $("pe-total").value = PE_ITEMS.reduce((s, i) => s + Number(i.precio) * i.cantidad, 0).toFixed(2);
  calcFaltaPend();
}

function pendCant(k, v){
  const i = PE_ITEMS[k], p = i && PRODS.find(x => x.id === i.producto_id); if (!i) return;
  i.cantidad = Math.max(1, Math.min(parseInt(v, 10) || 1, p ? p.stock : 9999));
  pintarItemsPend();
}
function pendQuitar(k){ PE_ITEMS.splice(k, 1); pintarItemsPend(); if (!PE_ITEMS.length) { $("pe-total").value = ""; calcFaltaPend(); } }

// Al escribir el producto salen las opciones del inventario, como en una venta
function buscarPendProd(){
  const q = $("pe-detalle").value.trim().toLowerCase(), box = $("pe-res");
  if (!q) { box.className = ""; box.innerHTML = ""; return; }
  const r = PRODS.filter(p => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)).slice(0, 6);
  box.className = "res";
  box.innerHTML = r.length ? r.map(p => p.stock > 0
    ? `<div onclick="elegirPendProd('${p.id}')"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)} · S/ ${Number(p.precio).toFixed(2)} <small class="gr">(stock ${p.stock})</small></div>`
    : `<div class="gr"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)} · sin stock</div>`).join("")
    : `<div class="gr">No está en tu inventario: se guardará como texto libre.</div>`;
}

function elegirPendProd(id){
  const p = PRODS.find(x => x.id === id); if (!p) return;
  const ya = PE_ITEMS.find(i => i.producto_id === p.id);
  if (ya) ya.cantidad = Math.min(ya.cantidad + 1, p.stock);
  else PE_ITEMS.push({ producto_id: p.id, codigo: p.codigo, nombre: p.nombre, cantidad: 1, precio: Number(p.precio) });
  $("pe-detalle").value = "";
  $("pe-res").className = ""; $("pe-res").innerHTML = "";
  pintarItemsPend();
  $("pe-detalle").focus();
}

async function cargarPendientes(){
  const { data, error } = await sb.from("pagos_pendientes").select("*").eq("negocio_id", NEG.id).order("creado", { ascending: false });
  if (error) { $("pe-resumen").textContent = "No se pudo cargar: " + error.message; return; }
  PEND = data || [];
  cajaItemsPend();
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
      <small class="gr">Registrado el ${peFecha(p.creado)}${pagado && p.pagado_en ? " · Completado el " + peFecha(p.pagado_en) : ""}${p.venta_id ? " · Venta registrada" : ""}</small>
      ${pagos ? `<div class="pend-hist"><b>Pagos:</b> ${pagos}</div>` : ""}
      ${pagado ? (p.venta_id ? "" : `<button class="pri" onclick="abrirCobro('${p.id}')">Generar venta</button>`)
        : `<button onclick="abonarPendiente('${p.id}')">Registrar abono</button>
      <button class="pri" onclick="abrirCobro('${p.id}')">Pago completo</button>
      ${p.celular ? `<button onclick="avisarPendiente('${p.id}')">WhatsApp</button>` : ""}`}
      <button onclick="borrarPendiente('${p.id}')">Borrar</button></div>`;
  }).join("") : `<p class="gr">No hay registros.</p>`;
}

async function guardarPendiente(){
  const msg = $("pe-msg"); msg.style.color = ""; msg.textContent = "";
  const cliente = $("pe-cliente").value.trim(), texto = $("pe-detalle").value.trim(), celular = $("pe-cel").value.trim();
  const total = parseFloat($("pe-total").value), adelanto = parseFloat($("pe-adelanto").value || "0");
  if (!cliente) return msg.textContent = "Escribe el nombre del cliente.";
  if (!PE_ITEMS.length && !texto) return msg.textContent = "Agrega al menos un producto.";
  if (!(total > 0)) return msg.textContent = "Escribe el precio total.";
  if (isNaN(adelanto) || adelanto < 0) return msg.textContent = "El adelanto no es válido.";
  if (adelanto > total) return msg.textContent = "El adelanto no puede ser mayor al total.";
  if (celular && !/^[0-9]{9}$/.test(celular)) return msg.textContent = "El celular debe tener 9 dígitos.";
  const suma = PE_ITEMS.reduce((s, i) => s + Number(i.precio) * i.cantidad, 0);
  if (PE_ITEMS.length && total > suma + 0.005) return msg.textContent = "El total no puede ser mayor a la suma de las prendas (S/ " + suma.toFixed(2) + ").";

  const items = PE_ITEMS.map(i => ({ producto_id: i.producto_id, codigo: i.codigo, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio }));
  let detalle = items.map(i => `${i.cantidad > 1 ? i.cantidad + "× " : ""}${i.codigo} · ${i.nombre}`).join(", ");
  if (texto) detalle = detalle ? detalle + " · " + texto : texto;
  const ahora = new Date().toISOString(), completo = adelanto >= total;
  const { error } = await sb.from("pagos_pendientes").insert({
    negocio_id: NEG.id, cliente, detalle, celular: celular || null,
    producto_id: items.length === 1 ? items[0].producto_id : null, items: items.length ? items : null,
    total, adelanto, abonos: adelanto > 0 ? [{ fecha: ahora, monto: adelanto }] : [],
    estado: completo ? "pagado" : "pendiente", pagado_en: completo ? ahora : null,
  });
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  ["pe-cliente", "pe-detalle", "pe-total", "pe-adelanto", "pe-cel"].forEach(i => $(i).value = "");
  PE_ITEMS = []; $("pe-res").className = ""; $("pe-res").innerHTML = "";
  pintarItemsPend(); calcFaltaPend();
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
  const adelanto = Math.round((Number(p.adelanto) + m) * 100) / 100, ahora = new Date().toISOString();
  if (adelanto >= Number(p.total)) return abrirCobro(id);   // con este abono queda completo: se genera la venta
  await actualizarPend(id, { adelanto, abonos: [...(p.abonos || []), { fecha: ahora, monto: m }] });
}

// ---------- Pago completo -> venta (boleta o factura; nota de venta solo en negocios por formalizar) ----------

function abrirCobro(id){
  const p = PEND.find(x => x.id === id); if (!p) return;
  const items = Array.isArray(p.items) && p.items.length ? p.items : null;
  const prod = !items && p.producto_id ? PRODS.find(x => x.id === p.producto_id) : null;
  const formal = NEG.formalidad !== "por_formalizar", pagado = p.estado === "pagado";
  PC = { p, items, prod: prod ? prod.id : null };
  const cant = prod ? Math.max(1, Math.round(Number(p.total) / Number(prod.precio))) : 1;
  const bloqueProd = items
    ? `<label>Productos</label><div class="gr" style="margin-bottom:6px">${items.map(i => `${i.cantidad} × ${esc(i.codigo)} · ${esc(i.nombre)}`).join("<br>")}</div>`
    : `<label>Producto del inventario</label>
    <input type="text" id="pc-prod" autocomplete="off" placeholder="Escribe código o nombre" oninput="buscarCobroProd()" value="${prod ? esc(prod.codigo + " · " + prod.nombre) : ""}">
    <div id="pc-res"></div>
    <label>Cantidad</label><input type="number" id="pc-cant" min="1" step="1" value="${cant}">`;
  const ov = document.createElement("div");
  ov.id = "pc-ov";
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:12px;overflow:auto";
  ov.innerHTML = `<div class="card" style="max-width:440px;width:100%;margin:auto">
    <b>${pagado ? "Generar venta" : "Pago completo"} · ${esc(p.cliente)}</b>
    <p class="gr" style="margin:6px 0">${pagado ? "Este pago ya está completo." : "Falta cobrar " + sol(peFalta(p)) + "."} Se registrará una venta por el total de ${sol(p.total)} y se descontará el stock.</p>
    ${bloqueProd}
    <label>Comprobante</label>
    <select id="pc-tipo" onchange="verTipoCobro()">
      ${formal ? `<option value="boleta">Boleta electrónica</option><option value="factura">Factura electrónica</option>` : `<option value="nota">Nota de venta (sin SUNAT)</option>`}
    </select>
    <div id="pc-b"><label>DNI del cliente (obligatorio si pasa de S/ 700)</label><input type="text" id="pc-dni" inputmode="numeric" maxlength="8">
      <label>Nombre (si das el DNI)</label><input type="text" id="pc-nombre-b" maxlength="60" value="${esc(p.cliente)}"></div>
    <div id="pc-f" class="hide"><label>RUC</label><input type="text" id="pc-ruc" inputmode="numeric" maxlength="11">
      <label>Razón social</label><input type="text" id="pc-razon" maxlength="100">
      <label>Dirección (opcional)</label><input type="text" id="pc-dir" maxlength="120"></div>
    <div id="pc-n" class="hide"><label>Nombre del cliente (opcional)</label><input type="text" id="pc-nombre-n" maxlength="60" value="${esc(p.cliente)}">
      <label>Celular (opcional)</label><input type="tel" id="pc-cel" inputmode="numeric" maxlength="9" value="${esc(p.celular || "")}"></div>
    <label>Medio de pago${pagado ? "" : " del saldo"}</label>
    <select id="pc-medio"><option value="efectivo">Efectivo</option><option value="yape_plin">Yape / Plin</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select>
    <label class="opt" style="padding:10px"><input type="checkbox" id="pc-imprimir" checked> Imprimir comprobante</label>
    <div class="msg" id="pc-msg"></div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button style="flex:1" onclick="cerrarCobro()">Cancelar</button>
      <button class="pri" style="flex:2" id="pc-ok" onclick="confirmarCobro()">Confirmar y generar venta</button>
    </div></div>`;
  document.body.appendChild(ov);
  verTipoCobro();
}

function cerrarCobro(){ const o = $("pc-ov"); if (o) o.remove(); PC = null; }

function verTipoCobro(){
  const t = $("pc-tipo").value;
  $("pc-b").classList.toggle("hide", t !== "boleta");
  $("pc-f").classList.toggle("hide", t !== "factura");
  $("pc-n").classList.toggle("hide", t !== "nota");
}

function buscarCobroProd(){
  PC.prod = null;
  const q = $("pc-prod").value.trim().toLowerCase(), box = $("pc-res");
  if (!q) { box.className = ""; box.innerHTML = ""; return; }
  const r = PRODS.filter(p => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)).slice(0, 6);
  box.className = "res";
  box.innerHTML = r.length ? r.map(p => p.stock > 0
    ? `<div onclick="elegirCobroProd('${p.id}')"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)} · S/ ${Number(p.precio).toFixed(2)} <small class="gr">(stock ${p.stock})</small></div>`
    : `<div class="gr"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)} · sin stock</div>`).join("")
    : `<div class="gr">No está en tu inventario. Regístralo primero en Inventario.</div>`;
}

function elegirCobroProd(id){
  const p = PRODS.find(x => x.id === id); if (!p) return;
  PC.prod = p.id;
  $("pc-prod").value = `${p.codigo} · ${p.nombre}`;
  $("pc-cant").value = Math.max(1, Math.round(Number(PC.p.total) / Number(p.precio)));
  $("pc-res").className = ""; $("pc-res").innerHTML = "";
}

async function confirmarCobro(){
  const msg = $("pc-msg"); msg.style.color = ""; msg.textContent = "";
  const p = PC.p, total = Number(p.total);

  // Productos de la venta: varias prendas (items) o un solo producto (pendientes anteriores)
  let itemsVenta = [];
  if (PC.items) {
    const base = PC.items.reduce((s, i) => s + Number(i.precio) * i.cantidad, 0);
    const f = base > 0 ? Math.min(1, total / base) : 1;   // si hubo descuento, se reparte entre las prendas
    for (const i of PC.items) {
      const pr = PRODS.find(x => x.id === i.producto_id);
      if (!pr) return msg.textContent = `${i.nombre} ya no está en el inventario.`;
      if (i.cantidad > pr.stock) return msg.textContent = `Stock insuficiente de ${pr.nombre} (quedan ${pr.stock}).`;
      const pu = Math.min(Math.round(Number(i.precio) * f * 100) / 100, Number(pr.precio));
      itemsVenta.push({ producto_id: pr.id, cantidad: i.cantidad, precio: pu });
    }
  } else {
    const prod = PRODS.find(x => x.id === PC.prod);
    if (!prod) return msg.textContent = "Elige el producto del inventario.";
    const cant = parseInt($("pc-cant").value, 10);
    if (!(cant >= 1)) return msg.textContent = "La cantidad no es válida.";
    if (cant > prod.stock) return msg.textContent = `Stock insuficiente de ${prod.nombre} (quedan ${prod.stock}).`;
    const pu = Math.round(total / cant * 100) / 100;
    if (pu > Number(prod.precio)) return msg.textContent = `El precio por unidad (S/ ${pu.toFixed(2)}) supera el de lista (S/ ${Number(prod.precio).toFixed(2)}). Sube la cantidad.`;
    itemsVenta = [{ producto_id: prod.id, cantidad: cant, precio: pu }];
  }

  const tipo = $("pc-tipo").value, fac = tipo === "factura", nota = tipo === "nota";
  const doc = nota ? "" : (fac ? $("pc-ruc") : $("pc-dni")).value.trim();
  const nombre = (fac ? $("pc-razon") : $("pc-nombre-b")).value.trim(), dir = fac ? $("pc-dir").value.trim() : "";
  if (fac) {
    if (!/^[0-9]{11}$/.test(doc)) return msg.textContent = "La factura necesita un RUC de 11 dígitos.";
    if (!nombre) return msg.textContent = "La factura necesita la razón social.";
  } else if (!nota) {
    if (doc && !/^[0-9]{8}$/.test(doc)) return msg.textContent = "El DNI debe tener 8 dígitos.";
    if (doc && !nombre) return msg.textContent = "Si das el DNI, escribe también el nombre.";
    if (total > 700 && !doc) return msg.textContent = "Una boleta mayor a S/ 700 necesita el DNI del cliente.";
  } else {
    const cel = $("pc-cel").value.trim();
    if (cel && !/^[0-9]{9}$/.test(cel)) return msg.textContent = "El celular debe tener 9 dígitos.";
  }
  if (!nota) {
    const { data: uso } = await sb.rpc("mi_uso_comprobantes");
    if (uso && uso.en_prueba && uso.usados >= uso.limite)
      return msg.textContent = `En tu semana de prueba puedes emitir hasta ${uso.limite} boletas o facturas y ya las usaste. Activa tu plan.`;
  }

  const btn = $("pc-ok"); btn.disabled = true;
  const falla = t => { msg.textContent = t; btn.disabled = false; };
  const { data: id, error } = await sb.rpc("registrar_venta", { p_items: itemsVenta });
  if (error) return falla("No se pudo registrar la venta: " + error.message);
  await sb.rpc("fijar_datos_venta", {
    p_venta: id, p_medio: $("pc-medio").value,
    p_nombre: nota ? ($("pc-nombre-n").value.trim() || null) : null,
    p_celular: nota ? ($("pc-cel").value.trim() || null) : null });
  const { error: e3 } = await sb.rpc("enlazar_pendiente", { p_pend: p.id, p_venta: id });
  if (e3) return falla("La venta se creó, pero no se pudo cerrar el pendiente: " + e3.message);

  let r = null, e2 = null;
  if (!nota) {
    ({ error: e2 } = await sb.rpc("datos_comprobante", { p_venta: id, p_tipo: tipo, p_doc: doc, p_nombre: nombre, p_direccion: dir }));
    if (!e2) r = await emitirComprobante(id, tipo, doc, nombre);
  }
  const imprimir = $("pc-imprimir").checked;
  cerrarCobro();
  await Promise.all([cargarPendientes(), cargarProductos()]);
  if (e2) alert("Venta registrada, pero no se pudo preparar el comprobante: " + e2.message + "\nPuedes reintentar desde Ventas.");
  else if (r && !r.ok) alert("Venta registrada, pero SUNAT no aceptó el comprobante: " + (r.mensaje || r.error) + "\nPuedes reintentar desde Ventas.");
  else if (imprimir) imprimirComprobante(id);
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