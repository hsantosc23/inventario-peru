// Registro de ventas: carrito con descuentos, descuento de stock e historial por periodo

let CARRITO = [], VPER = "dia", VREF = new Date();

function verTab(t){
  $("t-inv").classList.toggle("hide", t !== "inv");
  $("t-ven").classList.toggle("hide", t !== "ven");
  $("tab-inv").classList.toggle("act", t === "inv");
  $("tab-ven").classList.toggle("act", t === "ven");
  if (t === "ven") { cargarVentas(); pintarCarrito(); $("v-buscar").focus(); }
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

function agregarAlCarrito(id){
  const p = PRODS.find(x => x.id === id); if (!p) return;
  const c = CARRITO.find(x => x.id === id);
  if (c) c.cant = Math.min(c.cant + 1, p.stock); else CARRITO.push({ id, cant: 1, precio: null });
  $("v-buscar").value = ""; $("v-res").className = ""; $("v-res").innerHTML = "";
  pintarCarrito(); $("v-buscar").focus();
}

function cambiarCant(id, v){
  const c = CARRITO.find(x => x.id === id), p = PRODS.find(x => x.id === id);
  if (!c || !p) return;
  c.cant = Math.max(1, Math.min(parseInt(v, 10) || 1, p.stock));
  pintarCarrito();
}

// Descuento: baja el precio por unidad (nunca por encima del precio de lista)
function editarPrecio(id){
  const c = CARRITO.find(x => x.id === id), p = PRODS.find(x => x.id === id);
  if (!c || !p) return;
  const lista = Number(p.precio), actual = c.precio != null ? c.precio : lista;
  const txt = prompt("Precio por unidad (S/). Precio de lista: " + lista.toFixed(2), actual.toFixed(2));
  if (txt === null) return;
  const v = Math.round(parseFloat(txt.replace(",", ".")) * 100) / 100;
  if (isNaN(v) || v < 0) return alert("Escribe un precio válido.");
  if (v > lista) return alert("El precio no puede ser mayor al de lista (S/ " + lista.toFixed(2) + "). Para subirlo, edita el producto en el inventario.");
  c.precio = v === lista ? null : v;
  pintarCarrito();
}

function quitar(id){ CARRITO = CARRITO.filter(x => x.id !== id); pintarCarrito(); }

function pintarCarrito(){
  CARRITO = CARRITO.filter(c => PRODS.some(p => p.id === c.id));
  let total = 0;
  $("v-carrito").innerHTML = CARRITO.length ? CARRITO.map(c => {
    const p = PRODS.find(x => x.id === c.id), pu = c.precio != null ? c.precio : Number(p.precio), sub = pu * c.cant;
    total += sub;
    const desc = c.precio != null ? ` · <b style="color:#b45309">descuento (lista S/ ${Number(p.precio).toFixed(2)})</b>` : "";
    return `<div class="fila carro"><div class="info"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)}<small>S/ ${pu.toFixed(2)} c/u · stock ${p.stock}${desc}</small></div>
      <input type="number" class="cant" min="1" max="${p.stock}" value="${c.cant}" onchange="cambiarCant('${c.id}', this.value)">
      <div class="pre">S/ ${sub.toFixed(2)}</div>
      <button onclick="editarPrecio('${c.id}')">Editar</button><button onclick="quitar('${c.id}')">Quitar</button></div>`;
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
  const { data, error } = await sb.from("ventas").select("id,fecha,total,venta_items(codigo,nombre,cantidad)")
    .eq("negocio_id", NEG.id).gte("fecha", a.toISOString()).lt("fecha", b.toISOString()).order("fecha", { ascending: false });
  if (error) return $("v-lista").innerHTML = `<p class="msg">No se pudieron cargar: ${esc(error.message)}</p>`;
  const suma = data.reduce((s, v) => s + Number(v.total), 0);
  $("v-hoy").textContent = data.length + " venta(s) · Total: S/ " + suma.toFixed(2);
  const hora = v => new Date(v.fecha).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  const dias = {};
  data.forEach(v => { const k = f(new Date(v.fecha), { weekday: "short", day: "numeric", month: "short" }); (dias[k] = dias[k] || []).push(v); });
  $("v-lista").innerHTML = data.length ? Object.entries(dias).map(([k, vs]) =>
    (dia ? "" : `<div class="dia"><b>${esc(k)}</b> · ${vs.length} venta(s) · S/ ${vs.reduce((s, v) => s + Number(v.total), 0).toFixed(2)}</div>`) +
    vs.map(v => `<div class="fila"><div>${hora(v)}<small>${v.venta_items.map(i => i.cantidad + "× " + esc(i.nombre)).join(", ")}</small></div>
      <div class="pre">S/ ${Number(v.total).toFixed(2)}</div></div>`).join("")
  ).join("") : `<p class="gr">No hay ventas en este periodo.</p>`;
}