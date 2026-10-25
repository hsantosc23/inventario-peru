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

  if (!nota) {
    const { data: uso } = await sb.rpc("mi_uso_comprobantes");
    if (uso && uso.en_prueba && uso.usados >= uso.limite)
      return msg.textContent = `En tu semana de prueba puedes emitir hasta ${uso.limite} boletas o facturas y ya las usaste. Registra la venta como Nota de venta o activa tu plan.`;
  }

  const items = CARRITO.map(c => ({ producto_id: c.id, cantidad: c.cant, precio: c.precio }));
  const { data: id, error } = await sb.rpc("registrar_venta", { p_items: items });
  if (error) return msg.textContent = "No se pudo registrar la venta: " + error.message;
  // el medio de pago se guarda en paralelo, sin hacer esperar al resto
  const pMedio = sb.rpc("fijar_medio_pago", { p_venta: id, p_medio: $("v-medio").value });
  let e2 = null, r = null;
  if (!nota) {
    ({ error: e2 } = await sb.rpc("datos_comprobante", { p_venta: id, p_tipo: tipo, p_doc: doc, p_nombre: nombre, p_direccion: dir }));
    if (!e2) r = await emitirComprobante(id, tipo, doc, nombre);
  }
  await pMedio;
  CARRITO = [];
  ["v-dni", "v-nombre-b", "v-ruc", "v-razon", "v-dir"].forEach(i => $(i).value = "");
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

function botonesVenta(v) {
  if (v.anulada) return "<b>Anulada</b>";
  let h = `<button onclick="imprimirComprobante('${v.id}')">Imprimir</button>`;
  if (v.cpe_estado === "aceptado") h += `<button onclick="descargarXml('${v.id}')">XML</button>`;
  if (PUEDE && v.tipo_doc && v.cpe_estado !== "aceptado")
    h += `<button class="aviso" onclick="reintentarEmision('${v.id}')">Reintentar emisión</button>`;
  if (PUEDE)
    h += (v.cpe_estado === "aceptado" && v.cpe_nc_estado !== "aceptado")
      ? `<button class="peligro" onclick="devolverVenta('${v.id}')">Devolución</button>`
      : `<button class="peligro" onclick="anularVenta('${v.id}')">Anular</button>`;
  return `<div class="bts">${h}</div>`;
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
    .select("id,fecha,total,anulada,cliente_doc,cliente_nombre,cpe_nc_estado,cpe_serie,cpe_numero,cpe_estado,tipo_doc,numero,venta_items(codigo,nombre,cantidad,precio_unitario,subtotal)")
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
      ${k === 0 ? `<td rowspan="${n}">${hora(v)}${v.tipo_doc ? `<small class="gr"><br>${v.tipo_doc === "factura" ? "Factura" : "Boleta"} ${v.cpe_estado === "aceptado" ? v.cpe_serie + "-" + v.cpe_numero : String(v.numero).padStart(6, "0")}</small>` : ""}</td>` : ""}
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
  let f = document.getElementById("print-frame");
  if (!f) {
    f = document.createElement("iframe");
    f.id = "print-frame";
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(f);
  }
  const d = f.contentWindow.document;
  d.open(); d.write(html); d.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); }, 250);
}

async function imprimirComprobante(id){
  const { data: v, error } = await sb.from("ventas")
    .select("id,fecha,total,anulada,cpe_serie,cpe_numero,cpe_estado,tipo_doc,numero,cliente_doc,cliente_nombre,cliente_direccion,venta_items(codigo,nombre,cantidad,precio_unitario,subtotal)")
    .eq("id", id).single();
  if (error) return alert("No se pudo cargar la venta: " + error.message);
  if (v.anulada) return alert("Esta venta está anulada.");
  const fac = v.tipo_doc === "factura", d = new Date(v.fecha), total = Number(v.total);
  const emitido = v.cpe_estado === "aceptado";
  const titulo = emitido ? (fac ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA ELECTRÓNICA")
    : fac ? "FACTURA" : v.tipo_doc === "boleta" ? "BOLETA DE VENTA" : "Boleta (sin SUNAT)";
  const num = emitido ? v.cpe_serie + "-" + v.cpe_numero : (v.numero ? "N.º " + String(v.numero).padStart(6, "0") : "");
  const aviso = !emitido ? AVISO_COMPROBANTE
    : CPE_PRODUCCION ? "Representación impresa del comprobante electrónico"
    : "COMPROBANTE DE PRUEBA - SIN VALOR TRIBUTARIO";
  const { data: fis } = await sb.rpc("mis_datos_fiscales");
  const fi = fis && fis[0];
  const cliente = fac
    ? `RUC: ${esc(v.cliente_doc)}<br>Razón social: ${esc(v.cliente_nombre)}${v.cliente_direccion ? "<br>Dirección: " + esc(v.cliente_direccion) : ""}<hr>`
    : (v.cliente_doc || v.cliente_nombre)
      ? `${v.cliente_nombre ? "Cliente: " + esc(v.cliente_nombre) + "<br>" : ""}${v.cliente_doc ? "DNI: " + esc(v.cliente_doc) : ""}<hr>` : "";
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

async function descargarXml(id, nc){
  const r = await invocarFn("xml-comprobante", { venta_id: id, nc: !!nc });
  if (!r.ok) return alert(r.error || "No se pudo obtener el XML.");
  const a = document.createElement("a");
  if (r.url) a.href = r.url;
  else {
    const bin = r.formato === "zip" ? Uint8Array.from(atob(r.contenido), c => c.charCodeAt(0)) : new TextEncoder().encode(r.contenido);
    a.href = URL.createObjectURL(new Blob([bin], { type: r.formato === "zip" ? "application/zip" : "application/xml" }));
    a.download = r.nombre;
  }
  document.body.appendChild(a); a.click(); a.remove();
}