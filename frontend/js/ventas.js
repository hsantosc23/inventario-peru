// Registro de ventas: carrito con descuentos, descuento de stock e historial por periodo

let CARRITO = [], VPER = "dia", VREF = new Date(), LINEA = 0;

function verTab(t){
  ["inv", "ven", "gas"].forEach(x => {
    $("t-" + x).classList.toggle("hide", x !== t);
    $("tab-" + x).classList.toggle("act", x === t);
  });
  if (t === "ven") { cargarVentas(); pintarCarrito(); $("v-buscar").focus(); }
  if (t === "gas") cargarGastos();
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
  const linea = { k: ++LINEA, id, cant: 1, precio: null };
  const i = CARRITO.map(x => x.id).lastIndexOf(id);
  if (i < 0) CARRITO.push(linea); else CARRITO.splice(i + 1, 0, linea);
  const c = CARRITO.find(x => x.id === id && x.precio == null);
  if (c) c.cant++; else CARRITO.push({ k: ++LINEA, id, cant: 1, precio: null });
  $("v-buscar").value = ""; $("v-res").className = ""; $("v-res").innerHTML = "";
  pintarCarrito(); $("v-buscar").focus();
}

function cambiarCant(k, v){
  const c = CARRITO.find(x => x.k === k), p = c && PRODS.find(x => x.id === c.id);
  if (!p) return;
  c.cant = Math.max(1, Math.min(parseInt(v, 10) || 1, p.stock - usado(c.id, k)));
  pintarCarrito();
}

// Descuento: baja el precio por unidad (nunca por encima del de lista).
// Si la línea tiene varias unidades, pregunta a cuántas aplicarlo y las separa en otra línea.
function editarPrecio(k){
  const c = CARRITO.find(x => x.k === k), p = c && PRODS.find(x => x.id === c.id);
  if (!p) return;
  const lista = Number(p.precio), actual = c.precio != null ? c.precio : lista;
  const txt = prompt("Precio por unidad (S/). Precio de lista: " + lista.toFixed(2), actual.toFixed(2));
  if (txt === null) return;
  const v = Math.round(parseFloat(txt.replace(",", ".")) * 100) / 100;
  if (isNaN(v) || v < 0) return alert("Escribe un precio válido.");
  if (v > lista) return alert("El precio no puede ser mayor al de lista (S/ " + lista.toFixed(2) + ").");
  let n = c.cant;
  if (c.cant > 1) {
    const r = prompt("Tienes " + c.cant + " unidades. ¿A cuántas aplicar este precio? (1 a " + c.cant + ")", "1");
    if (r === null) return;
    n = Math.max(1, Math.min(parseInt(r, 10) || 1, c.cant));
  }
  const precio = v === lista ? null : v;
  if (n === c.cant) c.precio = precio;
  else { c.cant -= n; CARRITO.splice(CARRITO.indexOf(c) + 1, 0, { k: ++LINEA, id: c.id, cant: n, precio }); }
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
      <div class="pre">S/ ${sub.toFixed(2)}</div>
      <button onclick="editarPrecio(${c.k})">Editar</button><button onclick="quitar(${c.k})">Quitar</button></div>`;
  }).join("") : `<p class="gr">Busca un producto por código o nombre y tócalo para agregarlo.</p>`;
  $("v-total").textContent = "Total: S/ " + total.toFixed(2);
}

async function registrarVenta(){
  const msg = $("v-msg"); msg.style.color = ""; msg.textContent = "";
  if (!CARRITO.length) return msg.textContent = "Agrega al menos un producto.";
  const items = CARRITO.map(c => ({ producto_id: c.id, cantidad: c.cant, precio: c.precio }));
  const { error } = await sb.rpc("registrar_venta", { p_items: items });
  if (error) return msg.textContent = "No se pudo registrar la venta: " + error.message;
  CARRITO = [];
  await cargarProductos();
  pintarCarrito();
  cargarVentas();
  msg.style.color = "#166534";
  msg.textContent = "Venta registrada. El stock ya se descontó.";
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

async function cargarVentas(){
  const [a, b] = rangoVentas(), ahora = new Date(), dia = VPER === "dia";
  const f = (d, o) => d.toLocaleDateString("es-PE", o);
  const fin = new Date(b); fin.setDate(fin.getDate() - 1);
  $("v-rango").textContent = dia ? f(a, { weekday: "long", day: "numeric", month: "long" }) + (a <= ahora && ahora < b ? " (hoy)" : "")
    : VPER === "semana" ? "Semana del " + f(a, { day: "numeric", month: "short" }) + " al " + f(fin, { day: "numeric", month: "short" })
    : f(a, { month: "long", year: "numeric" });
  $("v-sig").disabled = b > ahora;
    $("v-fecha").max = new Date(ahora - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $("v-fecha").value = new Date(a - a.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const { data, error } = await sb.from("ventas").select("id,fecha,total,anulada,venta_items(codigo,nombre,cantidad)")
    .eq("negocio_id", NEG.id).gte("fecha", a.toISOString()).lt("fecha", b.toISOString()).order("fecha", { ascending: false });
  if (error) return $("v-lista").innerHTML = `<p class="msg">No se pudieron cargar: ${esc(error.message)}</p>`;
  const validas = data.filter(v => !v.anulada), anuladas = data.length - validas.length;
  const suma = validas.reduce((s, v) => s + Number(v.total), 0);
  $("v-hoy").textContent = validas.length + " venta(s) · Total: S/ " + suma.toFixed(2) + (anuladas ? " · " + anuladas + " anulada(s)" : "");
  const hora = v => new Date(v.fecha).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  const fila = v => `<div class="fila${v.anulada ? " anulada" : ""}"><div>${hora(v)}${v.anulada ? " · <b>Anulada</b>" : ""}
      <small>${v.venta_items.map(i => i.cantidad + "× " + esc(i.nombre)).join(", ")}</small></div>
      <div class="pre">S/ ${Number(v.total).toFixed(2)}</div>
      ${PUEDE && !v.anulada ? `<button onclick="anularVenta('${v.id}')">Anular</button>` : ""}</div>`;
  const dias = {};
  data.forEach(v => { const k = f(new Date(v.fecha), { weekday: "short", day: "numeric", month: "short" }); (dias[k] = dias[k] || []).push(v); });
  $("v-lista").innerHTML = data.length ? Object.entries(dias).map(([k, vs]) => {
    const ok = vs.filter(v => !v.anulada);
    return (dia ? "" : `<div class="dia"><b>${esc(k)}</b> · ${ok.length} venta(s) · S/ ${ok.reduce((s, v) => s + Number(v.total), 0).toFixed(2)}</div>`)
      + vs.map(fila).join("");
  }).join("") : `<p class="gr">No hay ventas en este periodo.</p>`;
}

async function anularVenta(id){
  if (!confirm("¿Anular esta venta? El stock de sus productos se devolverá al inventario.")) return;
  const msg = $("v-msg"); msg.style.color = ""; msg.textContent = "";
  const { error } = await sb.rpc("anular_venta", { p_venta: id });
  if (error) return msg.textContent = "No se pudo anular: " + error.message;
  await cargarProductos();
  pintarCarrito();
  cargarVentas();
  msg.style.color = "#166534";
  msg.textContent = "Venta anulada. El stock fue devuelto al inventario.";
}


// Calendario: ir a las ventas de una fecha concreta
function irAFecha(v){
  if (!v) return;
  VPER = "dia"; VREF = new Date(v + "T00:00:00");
  ["dia", "semana", "mes"].forEach(x => $("per-" + x).classList.toggle("act", x === "dia"));
  cargarVentas();
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