// Registro de ventas: carrito con descuentos, descuento de stock e historial por periodo

let CARRITO = [], VPER = "dia", VREF = new Date(), LINEA = 0;

function verTab(t){
  ["inv", "ven", "gas", "caja", "pen", "est"].forEach(x => {
    $("t-" + x).classList.toggle("hide", x !== t);
    $("tab-" + x).classList.toggle("act", x === t);
  });
  if (t === "ven") { cargarVentas(); pintarCarrito(); pintarUsoComprobantes(); $("v-buscar").focus(); }
  if (t === "gas") cargarGastos();
  if (t === "caja") cargarCaja();
  if (t === "pen") cargarPendientes();
  if (t === "est") cargarEstadisticas();
  const b = $("tab-" + t), bar = b && b.parentElement;
  if (bar) bar.scrollTo({ left: b.offsetLeft - (bar.clientWidth - b.offsetWidth) / 2, behavior: "smooth" });
}

function buscarVenta(){
  const q = $("v-buscar").value.trim().toLowerCase(), box = $("v-res");
  if (!q) { box.className = ""; box.innerHTML = ""; return; }
  if (/^mod-/.test(q) && abrirModelo(q)) return;
  const r = PRODS.filter(p => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)).slice(0, 6);
  box.className = "res";
  box.innerHTML = r.length ? r.map(p => p.stock > 0
    ? `<div onclick="agregarAlCarrito('${p.id}')"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)} · S/ ${Number(p.precio).toFixed(2)} <small class="gr">(stock ${p.stock})</small></div>`
    : `<div class="gr"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)} · sin stock</div>`).join("")
    : `<div class="gr">No se encontró ese producto.</div>`;
}

// Enter con un código exacto agrega el producto sin tocar nada más
function enterVenta(ev){
  if (ev.key !== "Enter") return;
  const q = $("v-buscar").value.trim().toLowerCase();
  if (/^mod-/.test(q) && abrirModelo(q)) return;
  const p = PRODS.find(x => x.codigo.toLowerCase() === q);
  if (p && p.stock > 0) agregarAlCarrito(p.id);
} 

// Unidades de un producto que ya están en otras líneas del carrito
const usado = (id, k) => CARRITO.filter(c => c.id === id && c.k !== k).reduce((s, c) => s + c.cant, 0);

function agregarAlCarrito(id){
  const p = PRODS.find(x => x.id === id); if (!p) return;
  if (usado(id, -1) >= p.stock) return alert("Ya agregaste todo el stock disponible de este producto.");
  // Cada toque agrega un recuadro nuevo (junto a los del mismo producto) para poder editar el precio de uno solo
  const linea = { k: ++LINEA, id, cant: 1, precio: null };
  const i = CARRITO.map(x => x.id).lastIndexOf(id);
  if (i < 0) CARRITO.push(linea); else CARRITO.splice(i + 1, 0, linea);
  $("v-buscar").value = ""; $("v-res").className = ""; $("v-res").innerHTML = "";
  pintarCarrito(); $("v-buscar").focus();
}

function cambiarCant(k, v){
  const c = CARRITO.find(x => x.k === k), p = c && PRODS.find(x => x.id === c.id);
  if (!p) return;
  c.cant = Math.max(1, Math.min(parseInt(v, 10) || 1, p.stock - usado(c.id, k)));
  pintarCarrito();
}

// Descuento: baja el precio por unidad de este recuadro (nunca por encima del de lista)
function editarPrecio(k){
  const c = CARRITO.find(x => x.k === k), p = c && PRODS.find(x => x.id === c.id);
  if (!p) return;
  const lista = Number(p.precio), actual = c.precio != null ? c.precio : lista;
  const txt = prompt("Precio por unidad (S/). Precio de lista: " + lista.toFixed(2), actual.toFixed(2));
  if (txt === null) return;
  const v = Math.round(parseFloat(txt.replace(",", ".")) * 100) / 100;
  if (isNaN(v) || v < 0) return alert("Escribe un precio válido.");
  if (v > lista) return alert("El precio no puede ser mayor al de lista (S/ " + lista.toFixed(2) + ").");
  c.precio = v === lista ? null : v;
  pintarCarrito();
}

function quitar(k){ CARRITO = CARRITO.filter(x => x.k !== k); pintarCarrito(); }

function pintarCarrito(){
  CARRITO = CARRITO.filter(c => PRODS.some(p => p.id === c.id));
  let total = 0;
  $("v-carrito").innerHTML = CARRITO.length ? CARRITO.map(c => {
    const p = PRODS.find(x => x.id === c.id), pu = c.precio != null ? c.precio : Number(p.precio), sub = pu * c.cant;
    total += sub;
    const desc = c.precio != null ? ` · <b style="color:#b45309">descuento (lista S/ ${Number(p.precio).toFixed(2)})</b>` : "";
    return `<div class="fila carro"><div class="info"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)}<small>S/ ${pu.toFixed(2)} c/u · stock ${p.stock}${desc}</small></div>
      <input type="number" class="cant" min="1" max="${p.stock - usado(c.id, c.k)}" value="${c.cant}" onchange="cambiarCant(${c.k}, this.value)">
        <div class="pre">S/ ${sub.toFixed(2)}<small>${c.cant} × S/ ${pu.toFixed(2)}</small></div>
      <button onclick="editarPrecio(${c.k})">Editar</button><button onclick="quitar(${c.k})">Quitar</button></div>`;
  }).join("") : `<p class="gr">Busca un producto por código o nombre y tócalo para agregarlo.</p>`;
  $("v-total").textContent = "Total: S/ " + total.toFixed(2);
}

async function registrarVenta(){
  const msg = $("v-msg"); msg.style.color = ""; msg.textContent = "";
  if (!CARRITO.length) return msg.textContent = "Agrega al menos un producto.";
  const tipo = $("v-tipo").value, fac = tipo === "factura", nota = tipo === "nota";
  const doc = nota ? "" : (fac ? $("v-ruc") : $("v-dni")).value.trim();
  const nombre = (fac ? $("v-razon") : $("v-nombre-b")).value.trim(), dir = fac ? $("v-dir").value.trim() : "";
  const total = CARRITO.reduce((s, c) => { const p = PRODS.find(x => x.id === c.id); return s + (c.precio != null ? c.precio : Number(p.precio)) * c.cant; }, 0);
  if (fac) {
    if (!/^[0-9]{11}$/.test(doc)) return msg.textContent = "La factura necesita un RUC de 11 dígitos.";
    if (!nombre) return msg.textContent = "La factura necesita la razón social.";
  } else if (!nota) {
    if (doc && !/^[0-9]{8}$/.test(doc)) return msg.textContent = "El DNI debe tener 8 dígitos.";
    if (doc && !nombre) return msg.textContent = "Si das el DNI, escribe también el nombre del cliente.";
    if (total > 700 && !doc) return msg.textContent = "Una boleta mayor a S/ 700 necesita el DNI del cliente.";
  }

  // Nota de venta: nombre y celular del cliente son opcionales
  if (nota) {
    const cel = $("v-cel-n").value.trim();
    if (cel && !/^[0-9]{9}$/.test(cel)) return msg.textContent = "El celular debe tener 9 dígitos.";
  }

  if (!nota) {
    const { data: uso } = await sb.rpc("mi_uso_comprobantes");
    if (uso && uso.en_prueba && uso.usados >= uso.limite)
      return msg.textContent = `En tu semana de prueba puedes emitir hasta ${uso.limite} boletas o facturas y ya las usaste. Registra la venta como Nota de venta o activa tu plan.`;
  }

  const items = CARRITO.map(c => ({ producto_id: c.id, cantidad: c.cant, precio: c.precio }));
  const { data: id, error } = await sb.rpc("registrar_venta", { p_items: items });
  if (error) return msg.textContent = "No se pudo registrar la venta: " + error.message;
  // medio de pago y datos opcionales del cliente se guardan en paralelo, sin hacer esperar al resto
  const pMedio = sb.rpc("fijar_datos_venta", {
    p_venta: id, p_medio: $("v-medio").value,
    p_nombre: nota ? ($("v-nombre-n").value.trim() || null) : null,
    p_celular: nota ? ($("v-cel-n").value.trim() || null) : null });
  let e2 = null, r = null;
  if (!nota) {
    ({ error: e2 } = await sb.rpc("datos_comprobante", { p_venta: id, p_tipo: tipo, p_doc: doc, p_nombre: nombre, p_direccion: dir }));
    if (!e2) r = await emitirComprobante(id, tipo, doc, nombre);
  }
  await pMedio;
  CARRITO = [];
  ["v-dni", "v-nombre-b", "v-ruc", "v-razon", "v-dir", "v-nombre-n", "v-cel-n"].forEach(i => $(i).value = "");
  $("v-medio").value = "efectivo";
  pintarCarrito();
  await Promise.all([cargarProductos(), cargarVentas()]);
  pintarUsoComprobantes();
  if (e2) return msg.textContent = "Venta registrada y stock descontado, pero no se pudo emitir el comprobante: " + e2.message;
  if (r && !r.ok) return msg.textContent = "Venta registrada, pero SUNAT no aceptó el comprobante: " + (r.mensaje || r.error);
  msg.style.color = "#166534";
  msg.textContent = "Venta registrada" + (r ? ". Comprobante " + r.comprobante + " emitido" : "") + ". El stock ya se descontó.";
  if ($("v-imprimir").checked) imprimirComprobante(id);
}

async function emitirComprobante(ventaId, tipo, doc, nombre) {
  if (tipo !== "boleta" && tipo !== "factura") return null;
  const { data, error } = await sb.functions.invoke("emitir-comprobante", {
    body: { venta_id: ventaId, tipo, cliente: { numero: doc, nombre } }
  });
  if (error) {
    let m = error.message;
    try { m = (await error.context.json()).error || m; } catch {}
    return { ok: false, mensaje: m };
  }
  return data;
}

function verTipoDoc(){
  const t = $("v-tipo").value;
  $("v-cli-b").classList.toggle("hide", t !== "boleta");
  $("v-cli-f").classList.toggle("hide", t !== "factura");
  $("v-cli-n").classList.toggle("hide", t !== "nota");
}

// ---------- Historial: diario, semanal y mensual ----------

function verPeriodo(p){
  VPER = p; VREF = new Date();
  ["dia", "semana", "mes"].forEach(x => $("per-" + x).classList.toggle("act", x === p));
  cargarVentas();
}

function moverPeriodo(n){
  const d = new Date(VREF);
  if (VPER === "dia") d.setDate(d.getDate() + n);
  else if (VPER === "semana") d.setDate(d.getDate() + 7 * n);
  else d.setMonth(d.getMonth() + n, 1);
  VREF = d;
  cargarVentas();
}

// Devuelve [inicio, fin) del periodo elegido; la semana empieza el lunes
function rangoVentas(){
  const d = new Date(VREF); d.setHours(0, 0, 0, 0);
  let a, b;
  if (VPER === "dia") { a = d; b = new Date(d); b.setDate(b.getDate() + 1); }
  else if (VPER === "semana") { a = new Date(d); a.setDate(a.getDate() - ((a.getDay() + 6) % 7)); b = new Date(a); b.setDate(b.getDate() + 7); }
  else { a = new Date(d.getFullYear(), d.getMonth(), 1); b = new Date(d.getFullYear(), d.getMonth() + 1, 1); }
  return [a, b];
}

async function anularVenta(id, sinPreguntar){
  if (!sinPreguntar && !confirm("¿Anular esta venta? El stock de sus productos se devolverá al inventario.")) return;
  const msg = $("v-msg"); msg.style.color = ""; msg.textContent = "";
  const { error } = await sb.rpc("anular_venta", { p_venta: id });
  if (error) return msg.textContent = "No se pudo anular: " + error.message;
  await cargarProductos();
  pintarCarrito();
  cargarVentas();
  msg.style.color = "#166534";
  msg.textContent = "Venta anulada. El stock fue devuelto al inventario.";
}

// ---------- Gastos ----------

async function cargarGastos(){
  const hoy = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (!$("g-mes").value) $("g-mes").value = hoy.slice(0, 7);
  if (!$("g-fecha").value) $("g-fecha").value = hoy;
  const [y, m] = $("g-mes").value.split("-").map(Number);
  const ini = `${y}-${String(m).padStart(2, "0")}-01`;
  const sig = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const { data, error } = await sb.from("gastos").select("*").eq("negocio_id", NEG.id)
    .gte("fecha", ini).lt("fecha", sig).order("fecha", { ascending: false });
  if (error) return $("g-lista").innerHTML = `<p class="msg">No se pudieron cargar: ${esc(error.message)}</p>`;
  const suma = data.reduce((s, g) => s + Number(g.monto), 0);
  $("g-total").textContent = data.length + " gasto(s) · Total: S/ " + suma.toFixed(2);
  $("g-lista").innerHTML = data.length ? data.map(g =>
    `<div class="fila"><div><b>${esc(g.concepto)}</b><small>${esc(g.categoria)} · ${g.fecha.split("-").reverse().join("/")}</small></div>
      <div class="pre">S/ ${Number(g.monto).toFixed(2)}</div>
      ${PUEDE ? `<button onclick="borrarGasto('${g.id}')">Borrar</button>` : ""}</div>`).join("")
    : `<p class="gr">No hay gastos en este mes.</p>`;
}

async function guardarGasto(){
  const msg = $("g-msg"); msg.style.color = ""; msg.textContent = "";
  const concepto = $("g-concepto").value.trim(), monto = parseFloat($("g-monto").value), fecha = $("g-fecha").value;
  if (!concepto) return msg.textContent = "Escribe el concepto del gasto.";
  if (isNaN(monto) || monto < 0) return msg.textContent = "Escribe un monto válido.";
  if (!fecha) return msg.textContent = "Elige la fecha.";
  const { error } = await sb.from("gastos").insert({ negocio_id: NEG.id, concepto, categoria: $("g-cat").value, monto, fecha });
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  $("g-concepto").value = ""; $("g-monto").value = "";
  $("g-mes").value = fecha.slice(0, 7);
  msg.style.color = "#166534"; msg.textContent = "Gasto registrado.";
  cargarGastos();
}

async function borrarGasto(id){
  if (!confirm("¿Borrar este gasto?")) return;
  const { data, error } = await sb.from("gastos").delete().eq("id", id).eq("negocio_id", NEG.id).select();
  if (error || !data.length) return alert("No se pudo borrar" + (error ? ": " + error.message : "."));
  cargarGastos();
}

// ¿Este navegador tiene selector de semana? (si no, se usa el de fecha)
const SEMANA_OK = (() => { const i = document.createElement("input"); i.type = "week"; return i.type === "week"; })();
let VDATA = [], VNOMBRE = "";

// Fecha -> "2026-W43" (semana ISO, empieza en lunes)
function semanaISO(d){
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7));
  const s1 = new Date(x.getFullYear(), 0, 4);
  const w = 1 + Math.round(((x - s1) / 86400000 - 3 + ((s1.getDay() + 6) % 7)) / 7);
  return x.getFullYear() + "-W" + String(w).padStart(2, "0");
}

// "2026-W43" -> lunes de esa semana
function lunesISO(v){
  const [y, w] = v.split("-W").map(Number);
  const j4 = new Date(y, 0, 4), lun = new Date(j4);
  lun.setDate(j4.getDate() - ((j4.getDay() + 6) % 7) + (w - 1) * 7);
  return lun;
}

function irAFecha(v){
  if (!v) return;
  VREF = v.includes("W") ? lunesISO(v) : new Date(v.length === 7 ? v + "-01T00:00:00" : v + "T00:00:00");
  cargarVentas();
}

const MEDIOS = { efectivo: "Efectivo", yape_plin: "Yape / Plin", tarjeta: "Tarjeta", transferencia: "Transferencia" };

function botonesVenta(v) {
  if (v.anulada) return "<b>Anulada</b>";
  const emitida = v.cpe_estado === "aceptado";
  let h = `<button onclick="imprimirComprobante('${v.id}')">Imprimir</button>`;
  if (PUEDE) {
    h += `<button onclick="cambiarMedio('${v.id}')">Medio de pago</button>`;
        h += `<button onclick="cambiarPrenda('${v.id}')">${emitida ? "Cambio de talla" : "Cambio de prenda"}</button>`;
    if (v.tipo_doc && !emitida) h += `<button class="aviso" onclick="reintentarEmision('${v.id}')">Reintentar emisión</button>`;
    if (emitida && v.cpe_nc_estado !== "aceptado") {
      // con comprobante aceptado solo hay nota de crédito, y solo desde el negocio principal
      if (!CTX.es_sede) h += `<button class="peligro" onclick="devolverVenta('${v.id}')">Devolución (NC)</button>`;
    } else h += `<button class="peligro" onclick="anularVenta('${v.id}')">Anular</button>`;
  }
  return `<div class="bts">${h}</div>`;
}

// ---------- Ventana emergente simple ----------
function modalBase(html, ancho){
  cerrarModal();
  const ov = document.createElement("div");
  ov.id = "md-ov";
  ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:12px;overflow:auto";
  ov.innerHTML = `<div class="card" style="max-width:${ancho || 440}px;width:100%;margin:auto">${html}</div>`;
  document.body.appendChild(ov);
}
function cerrarModal(){ const o = document.getElementById("md-ov"); if (o) o.remove(); }

// ---------- Cambiar el medio de pago ----------
function cambiarMedio(id){
  const v = VDATA.find(x => x.id === id); if (!v) return;
  modalBase(`<b>Medio de pago de la venta</b>
    <p class="gr" style="margin:6px 0">Total ${sol(v.total)}. Elige cómo pagó realmente el cliente.</p>
    <select id="md-medio">${Object.entries(MEDIOS).map(([k, t]) => `<option value="${k}"${k === v.medio_pago ? " selected" : ""}>${t}</option>`).join("")}</select>
    <div class="msg" id="md-msg"></div>
    <div style="display:flex;gap:8px;margin-top:8px"><button style="flex:1" onclick="cerrarModal()">Cancelar</button>
    <button class="pri" style="flex:2" onclick="guardarMedio('${id}')">Guardar</button></div>`);
}
async function guardarMedio(id){
  const { error } = await sb.rpc("fijar_medio_pago", { p_venta: id, p_medio: $("md-medio").value });
  if (error) return $("md-msg").textContent = "No se pudo cambiar: " + error.message;
  cerrarModal(); cargarVentas();
}

// ---------- Cambio de prenda (sin devolución de dinero) ----------
let CP = null;

function cambiarPrenda(id){
  const v = VDATA.find(x => x.id === id); if (!v) return;
    CP = { v, prod: null, soloTalla: v.cpe_estado === "aceptado" };
  const opts = v.venta_items.map(i => `<option value="${i.id}">${i.cantidad} × ${esc(i.nombre)} (S/ ${Number(i.precio_unitario).toFixed(2)} c/u)</option>`).join("");
  modalBase(`<b>Cambio de prenda</b>
    <p class="gr" style="margin:6px 0">La prenda que devuelve vuelve al stock y la nueva se descuenta. No se devuelve dinero: la nueva debe valer lo mismo o más, y la diferencia se cobra.</p>
    <label>Prenda que devuelve</label><select id="cp-item" onchange="pintarTallasCambio(); calcCambio()">${opts}</select>
    <label>Cantidad que devuelve</label><input type="number" id="cp-cdev" min="1" value="1" oninput="syncCantCambio(); calcCambio()">
    <div id="cp-tallas"></div>
    <label>Prenda nueva</label><input type="text" id="cp-prod" autocomplete="off" placeholder="Escribe código o nombre" oninput="buscarCambio()">
    <div id="cp-res"></div>
    <div class="f2"><div><label>Cantidad nueva</label><input type="number" id="cp-cant" min="1" value="1" oninput="calcCambio()"></div>
    <div><label>Precio c/u (S/)</label><input type="number" id="cp-precio" min="0" step="0.01" oninput="calcCambio()"></div></div>
    <div id="cp-dif" class="pre" style="font-size:16px;margin:8px 0">Elige la prenda nueva</div>
    <div id="cp-medio-box" class="hide"><label>Medio de pago de la diferencia</label>
      <select id="cp-medio">${Object.entries(MEDIOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></div>
    <div class="msg" id="cp-msg"></div>
    <div style="display:flex;gap:8px;margin-top:8px"><button style="flex:1" onclick="cerrarModal()">Cancelar</button>
        <button class="pri" style="flex:2" id="cp-ok" onclick="confirmarCambio()">Confirmar cambio</button></div>`);
    pintarTallasCambio();
  if (CP.soloTalla) {
    // con comprobante emitido solo se cambia la talla: se oculta el buscador y el precio
    $("cp-prod").previousElementSibling.classList.add("hide");
    $("cp-prod").classList.add("hide"); $("cp-res").classList.add("hide");
    $("cp-precio").closest(".f2").classList.add("hide");
    $("cp-dif").textContent = "Elige la talla nueva";
    $("cp-dif").insertAdjacentHTML("beforebegin", `<p class="gr" style="margin:6px 0">Esta venta tiene comprobante emitido: solo se puede cambiar la talla (misma prenda y mismo precio). El comprobante no cambia.</p>`);
  }
}

function calcCambio(){
  const it = CP.v.venta_items.find(i => i.id === $("cp-item").value); if (!it) return null;
  $("cp-cdev").max = it.cantidad;
  const cdev = parseInt($("cp-cdev").value, 10) || 0, cant = parseInt($("cp-cant").value, 10) || 0, pr = parseFloat($("cp-precio").value);
  const viejo = Math.round(Number(it.precio_unitario) * cdev * 100) / 100;
  const nuevo = isNaN(pr) ? 0 : Math.round(pr * cant * 100) / 100;
  const dif = Math.round((nuevo - viejo) * 100) / 100;
  $("cp-dif").textContent = !CP.prod ? "Elige la prenda nueva"
    : dif >= 0 ? "Diferencia a cobrar: " + sol(dif) : "Faltan " + sol(-dif) + " para igualar el valor";
  $("cp-medio-box").classList.toggle("hide", !(CP.prod && dif > 0));
  return { it, cdev, cant, pr, dif };
}

function buscarCambio(){
  CP.prod = null;
  const q = $("cp-prod").value.trim().toLowerCase(), box = $("cp-res");
  if (!q) { box.className = ""; box.innerHTML = ""; calcCambio(); return; }
  const r = PRODS.filter(p => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)).slice(0, 6);
  box.className = "res";
  box.innerHTML = r.length ? r.map(p =>
    `<div onclick="elegirCambio('${p.id}')"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)} · S/ ${Number(p.precio).toFixed(2)} <small class="gr">(stock ${p.stock})</small></div>`).join("")
    : `<div class="gr">No se encontró esa prenda.</div>`;
  calcCambio();
}

function elegirCambio(id, precio, mismo){
  const p = PRODS.find(x => x.id === id); if (!p) return;
  CP.prod = p.id; CP.mismo = !!mismo;
  $("cp-prod").value = `${p.codigo} · ${p.nombre}`;
  $("cp-precio").value = (precio != null ? Math.min(Number(precio), Number(p.precio)) : Number(p.precio)).toFixed(2);
  $("cp-cant").value = $("cp-cdev").value || 1;
  $("cp-res").className = ""; $("cp-res").innerHTML = "";
  calcCambio();
}

async function confirmarCambio(){
  const msg = $("cp-msg"); msg.style.color = ""; msg.textContent = "";
  const c = calcCambio(), p = PRODS.find(x => x.id === CP.prod);
  if (!p) return msg.textContent = "Elige la prenda nueva.";
  if (CP.soloTalla && !CP.mismo) return msg.textContent = "Elige una de las tallas disponibles.";
  if (!(c.cdev >= 1 && c.cdev <= c.it.cantidad)) return msg.textContent = "La cantidad que devuelve debe estar entre 1 y " + c.it.cantidad + ".";
  if (!(c.cant >= 1)) return msg.textContent = "La cantidad nueva no es válida.";
  if (isNaN(c.pr) || c.pr < 0) return msg.textContent = "El precio no es válido.";
  if (c.pr > Number(p.precio)) return msg.textContent = "El precio no puede ser mayor al de lista (S/ " + Number(p.precio).toFixed(2) + ").";
  if (c.dif < 0) return msg.textContent = "No se devuelve dinero: elige una prenda de igual o mayor valor.";
  const btn = $("cp-ok"); btn.disabled = true;
  const { error } = await sb.rpc("cambiar_prenda", {
    p_item: c.it.id, p_producto: p.id, p_cantidad: c.cant, p_precio: c.pr, p_cant_cambio: c.cdev, p_medio: $("cp-medio").value });
  if (error) { btn.disabled = false; return msg.textContent = "No se pudo hacer el cambio: " + error.message; }
  cerrarModal();
  await Promise.all([cargarProductos(), cargarVentas()]);
  const m = $("v-msg"); m.style.color = "#166534";
  m.textContent = "Cambio registrado. El stock se actualizó" + (c.dif > 0 ? ". Cobra " + sol(c.dif) + " de diferencia." : ".");
}

async function cargarVentas(){
  const [a, b] = rangoVentas(), ahora = new Date(), dia = VPER === "dia";
  const f = (d, o) => d.toLocaleDateString("es-PE", o);
  const fin = new Date(b); fin.setDate(fin.getDate() - 1);
  const local = d => new Date(d - d.getTimezoneOffset() * 60000).toISOString();
  const iso = d => local(d).slice(0, 10);

  // Calendario: fecha, semana (lunes a domingo) o mes, según el periodo
  const modo = VPER === "mes" ? "month" : VPER === "semana" && SEMANA_OK ? "week" : "date";
  const valor = d => modo === "month" ? local(d).slice(0, 7) : modo === "week" ? semanaISO(d) : iso(d);
  const campo = $("v-fecha");
  campo.type = modo; campo.max = valor(ahora); campo.value = valor(VREF);
  $("v-fecha-lbl").textContent = VPER === "mes" ? "Mes"
    : VPER === "semana" ? (modo === "week" ? "Elige la semana" : "Elige un día de la semana") : "Fecha";
  const dl = { weekday: "long", day: "numeric", month: "short" };
  $("v-rango").textContent = VPER === "semana" ? "Semana del " + f(a, dl) + " al " + f(fin, dl) : "";
  VNOMBRE = dia ? "dia_" + iso(a) : VPER === "semana" ? "semana_" + iso(a) + "_al_" + iso(fin) : "mes_" + iso(a).slice(0, 7);

  VDATA = [];
  const { data, error } = await sb.from("ventas")
  .select("id,fecha,total,anulada,cliente_doc,cliente_nombre,cpe_nc_estado,cpe_serie,cpe_numero,cpe_estado,tipo_doc,numero,medio_pago,venta_items(id,codigo,nombre,cantidad,precio_unitario,subtotal)")
  .eq("negocio_id", NEG.id).gte("fecha", a.toISOString()).lt("fecha", b.toISOString()).order("fecha", { ascending: false });
  if (error) return $("v-lista").innerHTML = `<p class="msg">No se pudieron cargar: ${esc(error.message)}</p>`;
  VDATA = data;
  const validas = data.filter(v => !v.anulada), anuladas = data.length - validas.length;
  const suma = validas.reduce((s, v) => s + Number(v.total), 0);
  $("v-hoy").textContent = validas.length + " venta(s) · Total: S/ " + suma.toFixed(2) + (anuladas ? " · " + anuladas + " anulada(s)" : "");

  // Lista: una fila por producto (hora, cantidad, producto y total)
  const hora = v => new Date(v.fecha).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  // Cada compra es un bloque: la hora, los productos y el total aparecen una sola vez por compra
  const compra = v => {
    const n = v.venta_items.length;
    return `<tbody class="compra${v.anulada ? " anulada" : ""}">` + v.venta_items.map((i, k) => `<tr>
    ${k === 0 ? `<td rowspan="${n}">${hora(v)}${v.tipo_doc ? `<small class="gr"><br>${v.tipo_doc === "factura" ? "Factura" : "Boleta"} ${v.cpe_estado === "aceptado" ? v.cpe_serie + "-" + v.cpe_numero : String(v.numero).padStart(6, "0")}</small>` : ""}<small class="gr"><br>${MEDIOS[v.medio_pago] || ""}</small></td>` : ""}
    <td class="c">${i.cantidad}</td>
      <td>${esc(i.nombre)}${n > 1 ? ` <span class="gr">· S/ ${Number(i.subtotal).toFixed(2)}</span>` : ""}</td>
      ${k === 0 ? `<td rowspan="${n}" class="pre">S/ ${Number(v.total).toFixed(2)}</td>
      <td rowspan="${n}" class="bt">${botonesVenta(v)}</td>` : ""}
    </tr>`).join("") + `</tbody>`;
  };
  const tabla = vs => `<table class="tv"><thead><tr><th>Hora</th><th class="c">Cant.</th><th>Producto</th><th class="t">Total</th><th></th></tr></thead>${vs.map(compra).join("")}</table>`;

  const dias = {};
  data.forEach(v => { const k = f(new Date(v.fecha), { weekday: "short", day: "numeric", month: "short" }); (dias[k] = dias[k] || []).push(v); });
  $("v-lista").innerHTML = data.length ? Object.entries(dias).map(([k, vs]) => {
    const ok = vs.filter(v => !v.anulada);
    return (dia ? "" : `<div class="dia"><b>${esc(k)}</b> · ${ok.length} venta(s) · S/ ${ok.reduce((s, v) => s + Number(v.total), 0).toFixed(2)}</div>`) + tabla(vs);
  }).join("") : `<p class="gr">No hay ventas en este periodo.</p>`;
}

// Descarga en Excel las ventas del periodo que se está viendo
function descargarVentas(){
  if (!VDATA.length) return alert("No hay ventas en este periodo para descargar.");
  const filas = [];
  VDATA.forEach(v => {
    const d = new Date(v.fecha);
    v.venta_items.forEach(i => filas.push({
      "Fecha": d.toLocaleDateString("es-PE"),
      "Hora": d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
      "Código": i.codigo, "Producto": i.nombre, "Cantidad": i.cantidad,
      "Precio unitario": Number(i.precio_unitario), "Total": Number(i.subtotal),
      "Estado": v.anulada ? "Anulada" : "Válida" }));
  });
  const total = filas.filter(r => r["Estado"] === "Válida").reduce((s, r) => s + r["Total"], 0);
  filas.push({}, { "Producto": "TOTAL (sin ventas anuladas)", "Total": Math.round(total * 100) / 100 });
  const ws = XLSX.utils.json_to_sheet(filas);
  ws["!cols"] = [{ wch: 11 }, { wch: 8 }, { wch: 10 }, { wch: 30 }, { wch: 9 }, { wch: 14 }, { wch: 10 }, { wch: 9 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ventas");
  XLSX.writeFile(wb, "ventas_" + VNOMBRE + ".xlsx");
}


// ---------- Impresión del comprobante (ticket de 80 mm) ----------

// Mientras la plataforma no esté conectada a SUNAT, el comprobante es interno.
// Cuando se conecte, deja este texto vacío ("").
const AVISO_COMPROBANTE = "Documento interno. No es comprobante de pago electrónico válido ante la SUNAT.";
const CPE_PRODUCCION = false;

function imprimirHTML(html){
  const doc = new DOMParser().parseFromString(html, "text/html");
  const esIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // Reglas de la boleta limitadas a la zona de impresión
  let css = "";
  doc.querySelectorAll("style").forEach(s => {
    const tmp = document.createElement("style");
    tmp.media = "not all";
    tmp.textContent = s.textContent;
    document.head.appendChild(tmp);
    for (const r of tmp.sheet.cssRules) {
      if (r.type === 1) {
        const sel = r.selectorText.split(",").map(x => {
          x = x.trim();
          return /^(html|body)$/i.test(x) ? "#print-area" : "#print-area " + x;
        }).join(",");
        css += sel + "{" + r.style.cssText + "}";
      } else css += r.cssText;   // @page y similares
    }
    tmp.remove();
  });

  ["print-prev", "print-style"].forEach(id => { const o = document.getElementById(id); if (o) o.remove(); });

  const st = document.createElement("style");
  st.id = "print-style";
  st.textContent = css + `
    #print-prev{display:none}
    #print-prev.ver{display:block;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.65);overflow:auto;padding:16px}
    #print-prev .pp-bts{display:flex;gap:8px;max-width:340px;margin:0 auto 10px}
    #print-prev .pp-bts button{flex:1;margin:0;width:auto}
    #print-prev .pp-caja{background:#fff;color:#000;max-width:340px;margin:0 auto;padding:14px;border-radius:12px;overflow:auto}
    @media print{
      html,body{background:#fff!important;padding:0!important;margin:0!important}
      body>*:not(#print-prev){display:none!important}
      #print-prev,#print-prev.ver{display:block!important;position:static!important;background:none!important;padding:0!important;overflow:visible!important}
      #print-prev .pp-bts{display:none!important}
      #print-prev .pp-caja{padding:0!important;border-radius:0!important;max-width:none!important;margin:0!important;overflow:visible!important}
    }`;

  const prev = document.createElement("div");
  prev.id = "print-prev";
  prev.innerHTML = `<div class="pp-bts"><button class="pri" id="pp-imp">Imprimir</button><button id="pp-cerrar">Cerrar</button></div>
    <div class="pp-caja"><div id="print-area">${doc.body.innerHTML}</div></div>`;

  const tituloAnterior = document.title;
  if (doc.title) document.title = doc.title;
  document.head.appendChild(st);
  document.body.appendChild(prev);

  const cerrar = () => { prev.remove(); st.remove(); document.title = tituloAnterior; };
  document.getElementById("pp-cerrar").onclick = cerrar;
  document.getElementById("pp-imp").onclick = () => window.print();   // toque directo: Safari sí lo permite

  if (esIOS) {
    prev.classList.add("ver");            // iPhone: vista previa y botón Imprimir
  } else {
    window.addEventListener("afterprint", cerrar, { once: true });
    setTimeout(() => window.print(), 250);
  }
}

async function imprimirComprobante(id){
  const { data: v, error } = await sb.from("ventas")
    .select("id,fecha,total,anulada,cpe_serie,cpe_numero,cpe_estado,tipo_doc,numero,cliente_doc,cliente_nombre,cliente_direccion,cliente_celular,venta_items(codigo,nombre,cantidad,precio_unitario,subtotal)")
    .eq("id", id).single();
  if (error) return alert("No se pudo cargar la venta: " + error.message);
  if (v.anulada) return alert("Esta venta está anulada.");
  const fac = v.tipo_doc === "factura", d = new Date(v.fecha), total = Number(v.total);
  const emitido = v.cpe_estado === "aceptado";
  const titulo = emitido ? (fac ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA ELECTRÓNICA")
        : fac ? "FACTURA" : v.tipo_doc === "boleta" ? "BOLETA DE VENTA" : "TICKET DE VENTA";
  const num = emitido ? v.cpe_serie + "-" + v.cpe_numero : (v.numero ? "N.º " + String(v.numero).padStart(6, "0") : "");
  const aviso = !emitido ? AVISO_COMPROBANTE
    : CPE_PRODUCCION ? "Representación impresa del comprobante electrónico"
    : "COMPROBANTE DE PRUEBA - SIN VALOR TRIBUTARIO";
  const { data: fis } = await sb.rpc("mis_datos_fiscales");
  const fi = fis && fis[0];
  const cliente = fac
    ? `RUC: ${esc(v.cliente_doc)}<br>Razón social: ${esc(v.cliente_nombre)}${v.cliente_direccion ? "<br>Dirección: " + esc(v.cliente_direccion) : ""}<hr>`
    : (v.cliente_doc || v.cliente_nombre || v.cliente_celular)
      ? `${v.cliente_nombre ? "Cliente: " + esc(v.cliente_nombre) + "<br>" : ""}${v.cliente_doc ? "DNI: " + esc(v.cliente_doc) + "<br>" : ""}${v.cliente_celular ? "Cel: " + esc(v.cliente_celular) : ""}<hr>` : "";
  const filas = v.venta_items.map(i => `<tr><td>${i.cantidad} x ${esc(i.nombre)}<br>&nbsp;&nbsp;S/ ${Number(i.precio_unitario).toFixed(2)} c/u</td>
    <td class="r">S/ ${Number(i.subtotal).toFixed(2)}</td></tr>`).join("");
  // Factura: desglose referencial suponiendo que los precios ya incluyen IGV (18 %)
  const base = total / 1.18;
  const totales = fac
    ? `<tr><td>Op. gravada</td><td class="r">S/ ${base.toFixed(2)}</td></tr><tr><td>IGV (18 %)</td><td class="r">S/ ${(total - base).toFixed(2)}</td></tr>` : "";
  imprimirHTML(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titulo} ${num}</title><style>
    @page{size:80mm auto;margin:4mm}
    body{font:12px/1.35 monospace;width:72mm;margin:0;color:#000}
    .c{text-align:center}.r{text-align:right;white-space:nowrap}
    hr{border:0;border-top:1px dashed #000;margin:6px 0}
    table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:2px 0}
    </style></head><body>
  <div class="c"><b>${esc(emitido && fi ? fi.razon_social : (NEG.nombre || ""))}</b>${emitido && fi ? "<br>RUC " + fi.ruc : ""}<br>${titulo}<br>${num}</div><hr>
    Fecha: ${d.toLocaleDateString("es-PE")} ${d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}<br>
    ${cliente || "<hr>"}
    <table>${filas}</table><hr>
    <table>${totales}<tr><td><b>TOTAL</b></td><td class="r"><b>S/ ${total.toFixed(2)}</b></td></tr></table><hr>
    <div class="c">${aviso ? aviso + "<br>" : ""}¡Gracias por su compra!</div>
    </body></html>`);
}

async function devolverVenta(id) {
    if (CTX.es_sede) return alert("Solo la cuenta del negocio principal puede hacer devoluciones con nota de crédito.");
  if (!confirm("Se emitirá una NOTA DE CRÉDITO en SUNAT por el total de la venta y luego se anulará, devolviendo el stock. ¿Continuar?")) return;
  const msg = $("v-msg"); msg.style.color = ""; msg.textContent = "Emitiendo nota de crédito...";
  const { data, error } = await sb.functions.invoke("emitir-comprobante", { body: { accion: "nota_credito", venta_id: id } });
  let r = data;
  if (error) { r = { ok: false, mensaje: error.message }; try { r.mensaje = (await error.context.json()).error || r.mensaje; } catch {} }
  if (!r || !r.ok) return msg.textContent = "No se pudo emitir la nota de crédito: " + ((r && (r.mensaje || r.error)) || "sin respuesta");
  msg.style.color = "#166534"; msg.textContent = "Nota de crédito " + r.comprobante + " emitida.";
  await anularVenta(id, true);
}

async function reintentarEmision(id) {
  const { data: v, error } = await sb.from("ventas").select("tipo_doc,cliente_doc,cliente_nombre").eq("id", id).single();
  if (error) return alert(error.message);
  const r = await emitirComprobante(id, v.tipo_doc, v.cliente_doc || "", v.cliente_nombre || "");
  alert(r && r.ok ? "Comprobante " + r.comprobante + " emitido" : "No se pudo emitir: " + ((r && (r.mensaje || r.error)) || "sin respuesta"));
  cargarVentas();
}

async function pintarUsoComprobantes(){
  const el = $("v-uso"); if (!el) return;
  if (!NEG || NEG.formalidad === "por_formalizar") { el.textContent = ""; return; }
  const { data: u } = await sb.rpc("mi_uso_comprobantes");
  el.textContent = u && u.en_prueba ? `Prueba: ${u.usados} de ${u.limite} boletas o facturas usadas` : "";
}

// Misma prenda en otra talla o en otro color: botones con el stock de cada opción
function pintarTallasCambio(){
  const caja = $("cp-tallas"); if (!caja) return;
  const it = CP.v.venta_items.find(i => i.id === $("cp-item").value);
  const actual = it && PRODS.find(p => p.id === it.producto_id);
  const nombre = it ? String(it.nombre).trim().toLowerCase() : "";
  const talla = c => { const m = String(c).match(/^(XS|S|M|L)\d+$/i); return m ? m[1].toUpperCase() : c; };
  const conTalla = p => /^(XS|S|M|L)\d+$/i.test(p.codigo);
  const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  // Modelo y color: los campos guardados o, si faltan, "modelo color" separado por la última palabra
  const modeloP = p => p.modelo ? norm(p.modelo) : (conTalla(p) ? norm(p.nombre).replace(/\s+\S+$/, "") : norm(p.nombre));
  const colorP = p => p.color ? norm(p.color) : (conTalla(p) && /\s/.test(p.nombre.trim()) ? norm(p.nombre).split(/\s+/).pop() : "");
  const nomColor = p => p.color ? p.color : (conTalla(p) && /\s/.test(p.nombre.trim()) ? p.nombre.trim().split(/\s+/).pop() : p.nombre);
  const orden = { XS: 0, S: 1, M: 2, L: 3 };
  const precio = it ? Number(it.precio_unitario) : 0;

  // Otras tallas del mismo producto
  const otras = PRODS.filter(p => p.nombre.trim().toLowerCase() === nombre && (!actual || p.id !== actual.id))
    .sort((a, b) => (orden[talla(a.codigo)] ?? 9) - (orden[talla(b.codigo)] ?? 9));

  // Otros colores del mismo modelo, en la misma talla
  let colores = [];
  if (actual && !CP.soloTalla) {
    const mod = modeloP(actual), t = talla(actual.codigo), col = colorP(actual);
    colores = PRODS.filter(p => p.id !== actual.id && modeloP(p) === mod && talla(p.codigo) === t && colorP(p) !== col);
  }

  let h = "";
  if (otras.length) h += `<label>Cambiar solo la talla (mismo precio)</label><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">` +
    otras.map(p => `<button ${p.stock > 0 ? "" : "disabled"} onclick="elegirCambio('${p.id}', ${precio}, true)">${esc(talla(p.codigo))} <small>(stock ${p.stock})</small></button>`).join("") + `</div>`;
  if (!CP.soloTalla) {
    h += `<label>Cambiar solo el color (misma talla y precio)</label>`;
    h += colores.length
      ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">` +
        colores.map(p => `<button ${p.stock > 0 ? "" : "disabled"} onclick="elegirCambio('${p.id}', ${precio}, true)">${esc(nomColor(p))} <small>(stock ${p.stock})</small></button>`).join("") + `</div>`
      : `<p class="gr" style="margin:2px 0 8px">No hay otros colores de este modelo en esta talla.</p>`;
  }
  if (!h && CP.soloTalla) h = `<p class="gr">No hay otras tallas de esta prenda en el inventario.</p>`;
  caja.innerHTML = h;
}

function syncCantCambio(){ if (CP && CP.mismo) $("cp-cant").value = $("cp-cdev").value || 1; }