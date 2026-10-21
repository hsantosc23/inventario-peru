// Registro de ventas: carrito, descuento automático de stock y ventas del día

let CARRITO = [];

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
  if (c) c.cant = Math.min(c.cant + 1, p.stock); else CARRITO.push({ id, cant: 1 });
  $("v-buscar").value = ""; $("v-res").className = ""; $("v-res").innerHTML = "";
  pintarCarrito(); $("v-buscar").focus();
}

function cambiarCant(id, v){
  const c = CARRITO.find(x => x.id === id), p = PRODS.find(x => x.id === id);
  if (!c || !p) return;
  c.cant = Math.max(1, Math.min(parseInt(v, 10) || 1, p.stock));
  pintarCarrito();
}

function quitar(id){ CARRITO = CARRITO.filter(x => x.id !== id); pintarCarrito(); }

function pintarCarrito(){
  CARRITO = CARRITO.filter(c => PRODS.some(p => p.id === c.id));
  let total = 0;
  $("v-carrito").innerHTML = CARRITO.length ? CARRITO.map(c => {
    const p = PRODS.find(x => x.id === c.id), sub = p.precio * c.cant;
    total += sub;
    return `<div class="fila"><div><b>${esc(p.codigo)}</b> · ${esc(p.nombre)}<small>S/ ${Number(p.precio).toFixed(2)} · stock ${p.stock}</small></div>
      <input type="number" class="cant" min="1" max="${p.stock}" value="${c.cant}" onchange="cambiarCant('${c.id}', this.value)">
      <div class="pre">S/ ${sub.toFixed(2)}</div><button onclick="quitar('${c.id}')">Quitar</button></div>`;
  }).join("") : `<p class="gr">Busca un producto por código o nombre y tócalo para agregarlo.</p>`;
  $("v-total").textContent = "Total: S/ " + total.toFixed(2);
}

async function registrarVenta(){
  const msg = $("v-msg"); msg.style.color = ""; msg.textContent = "";
  if (!CARRITO.length) return msg.textContent = "Agrega al menos un producto.";
  const { error } = await sb.rpc("registrar_venta", { p_items: CARRITO.map(c => ({ producto_id: c.id, cantidad: c.cant })) });
  if (error) return msg.textContent = "No se pudo registrar la venta: " + error.message;
  CARRITO = [];
  await cargarProductos();
  pintarCarrito();
  cargarVentas();
  msg.style.color = "#166534";
  msg.textContent = "Venta registrada. El stock ya se descontó.";
}

async function cargarVentas(){
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const { data, error } = await sb.from("ventas").select("id,fecha,total,venta_items(codigo,nombre,cantidad)")
    .eq("negocio_id", NEG.id).gte("fecha", hoy.toISOString()).order("fecha", { ascending: false });
  if (error) return $("v-lista").innerHTML = `<p class="msg">No se pudieron cargar: ${esc(error.message)}</p>`;
  const suma = data.reduce((s, v) => s + Number(v.total), 0);
  $("v-hoy").textContent = "Ventas de hoy: " + data.length + " · S/ " + suma.toFixed(2);
  $("v-lista").innerHTML = data.length ? data.map(v =>
    `<div class="fila"><div>${new Date(v.fecha).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
      <small>${v.venta_items.map(i => i.cantidad + "× " + esc(i.nombre)).join(", ")}</small></div>
      <div class="pre">S/ ${Number(v.total).toFixed(2)}</div></div>`).join("")
    : `<p class="gr">Todavía no hay ventas hoy.</p>`;
}