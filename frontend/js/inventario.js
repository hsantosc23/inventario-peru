// Panel de inventario: productos, stock bajo e importación Excel

let NEG = null, PUEDE = false, PRODS = [], EDIT = null;

const bajo = p => p.stock_minimo > 0 && p.stock <= p.stock_minimo;

let AUTO = "";

// Código = talla + número correlativo de todo el inventario (XS0001, M0002, L0003...).
// Sin talla, solo el número (0004). Nunca repite un código que ya exista.
function siguienteCodigo(talla){
  const usados = new Set(PRODS.map(p => p.codigo));
  let n = 0;
  PRODS.forEach(p => { const m = p.codigo.match(/^(\D*)(\d+)$/); if (m && m[1] === (talla || "")) n = Math.max(n, parseInt(m[2], 10)); });
  let c;
    do { n++; c = (talla || "") + String(n).padStart(6 - (talla || "").length, "0"); } while (usados.has(c));
  return c;
}

// Rellena el código solo si está vacío o si todavía tiene el código automático
function codigoPorDefecto(){
  if (!PUEDE || EDIT) return;
  const campo = $("f-codigo"), v = campo.value.trim();
  if (v === "" || v === AUTO) { AUTO = siguienteCodigo($("f-talla").value); campo.value = AUTO; }
}

// Al elegir una talla se genera el código con esa talla
function codigoPorTalla(){
  if (EDIT) return;
  AUTO = siguienteCodigo($("f-talla").value);
  $("f-codigo").value = AUTO;
}

async function cargarProductos(){
  const { data, error } = await sb.from("productos").select("*").eq("negocio_id", NEG.id).order("nombre");
  $("pr-msg").textContent = error ? "No se pudo cargar: " + error.message : "";
  PRODS = error ? [] : data.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
  const b = PRODS.filter(bajo);
  $("alerta").classList.toggle("hide", !b.length);
  $("alerta").innerHTML = "<b>Stock bajo en " + b.length + " producto(s):</b> " +
    b.slice(0, 8).map(p => esc(p.nombre) + " (" + p.stock + ")").join(", ") + (b.length > 8 ? "..." : "");
  listar();
  codigoPorDefecto();
}

function listar(){
  const q = $("buscar").value.trim().toLowerCase();
  const r = PRODS.filter(p => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q));
  $("lista").innerHTML = r.length ? r.map(p =>
    `<div class="fila"><div><b>${esc(p.codigo)}</b> · ${esc(p.nombre)}<small>Stock: ${p.stock}${bajo(p) ? ' <b style="color:#b45309">· stock bajo</b>' : ""}</small></div>
     <div class="pre">S/ ${Number(p.precio).toFixed(2)}</div>
     ${PUEDE ? `<button onclick="editar('${p.id}')">Editar</button><button onclick="borrar('${p.id}')">Borrar</button>` : ""}</div>`
  ).join("") : `<p class="gr">No hay productos para mostrar.</p>`;
}

function limpiarForm(){
  EDIT = null;
  ["f-codigo","f-nombre","f-precio","f-stock","f-min"].forEach(i => $(i).value = "");
  $("f-titulo").textContent = "Agregar producto";
  $("f-btn").textContent = "Guardar producto";
  $("f-cancel").classList.add("hide");
  codigoPorDefecto();
}

function editar(id){
  const p = PRODS.find(x => x.id === id); if (!p) return;
  EDIT = id;
  $("f-codigo").value = p.codigo; $("f-nombre").value = p.nombre;
  $("f-precio").value = p.precio; $("f-stock").value = p.stock; $("f-min").value = p.stock_minimo;
  $("f-talla").value = (p.codigo.match(/^(XS|S|M|L)\d+$/) || [])[1] || "";
  $("f-titulo").textContent = "Editar producto";
  $("f-btn").textContent = "Guardar cambios";
  $("f-cancel").classList.remove("hide");
  window.scrollTo(0, 0);
}

async function guardarProducto(){
  const msg = $("pr-msg"); msg.textContent = "";
  const codigo = $("f-codigo").value.trim(), nombre = $("f-nombre").value.trim(),
        precio = parseFloat($("f-precio").value), stock = parseInt($("f-stock").value || "0", 10),
        stock_minimo = parseInt($("f-min").value || "0", 10);
  if (!codigo || !nombre) return msg.textContent = "Escribe el código y el nombre.";
  if (isNaN(precio) || precio < 0) return msg.textContent = "Escribe un precio válido.";
  if (isNaN(stock)) return msg.textContent = "Escribe un stock válido.";
  if (isNaN(stock_minimo) || stock_minimo < 0) return msg.textContent = "Escribe un aviso de stock válido.";
  const fila = { codigo, nombre, precio, stock, stock_minimo };
  const { error } = EDIT
    ? await sb.from("productos").update(fila).eq("id", EDIT)
    : await sb.from("productos").insert({ ...fila, negocio_id: NEG.id });
  if (error) return msg.textContent = error.code === "23505"
    ? "Ya tienes un producto con ese código." : "No se pudo guardar: " + error.message;
  limpiarForm();
  cargarProductos();
}

async function borrar(id){
  if (!confirm("¿Borrar este producto?")) return;
  const { data, error } = await sb.from("productos").delete().eq("id", id).eq("negocio_id", NEG.id).select();
  if (error) return $("pr-msg").textContent = "No se pudo borrar: " + error.message;
  if (!data.length) return $("pr-msg").textContent = "No se pudo borrar: el producto no es de tu negocio o tu plan no lo permite.";
  cargarProductos();
}

function plantilla(){
  const ws = XLSX.utils.aoa_to_sheet([
    ["codigo", "nombre", "precio", "stock", "stock_minimo"],
    ["A001", "Arroz 1 kg", 4.5, 40, 10]
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");
  XLSX.writeFile(wb, "plantilla_productos.xlsx");
}

async function importar(){
  const msg = $("pr-msg"); msg.style.color = ""; msg.textContent = "";
  const f = $("f-xls").files[0];
  if (!f) return msg.textContent = "Elige un archivo Excel o CSV.";
  let filas;
  try {
    const wb = XLSX.read(await f.arrayBuffer());
    filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  } catch (e) { return msg.textContent = "No se pudo leer el archivo."; }
  const mapa = new Map(), malas = [];
  filas.forEach((r, i) => {
    const k = {};
    Object.keys(r).forEach(c => k[c.trim().toLowerCase()] = r[c]);
    const codigo = String(k.codigo ?? "").trim(), nombre = String(k.nombre ?? "").trim();
    const precio = parseFloat(k.precio), stock = parseInt(k.stock || 0, 10), min = parseInt(k.stock_minimo || 0, 10);
    if (!codigo || !nombre || isNaN(precio) || precio < 0 || isNaN(stock) || isNaN(min) || min < 0) return malas.push(i + 2);
    mapa.set(codigo, { negocio_id: NEG.id, codigo, nombre, precio, stock, stock_minimo: min });
  });
  const rows = [...mapa.values()];
  if (!rows.length) return msg.textContent = "No hay filas válidas. Revisa los títulos de las columnas.";
  if (rows.length > 2000) return msg.textContent = "Máximo 2000 productos por archivo.";
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from("productos").upsert(rows.slice(i, i + 500), { onConflict: "negocio_id,codigo" });
    if (error) return msg.textContent = "Error al importar: " + error.message;
  }
  $("f-xls").value = "";
  msg.style.color = "#166534";
  msg.textContent = rows.length + " productos importados" +
    (malas.length ? ". Filas con error (revisar): " + malas.slice(0, 10).join(", ") : ".");
  cargarProductos();
}