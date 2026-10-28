// Panel de inventario: productos, stock bajo e importación Excel

let NEG = null, PUEDE = false, PRODS = [], EDIT = null;

const bajo = p => p.stock_minimo > 0 && p.stock <= p.stock_minimo;

let AUTO = "";

// ---------- Fotos opcionales ----------
let FOTO_QUITAR = false;
const fotoUrl = ruta => ruta ? sb.storage.from("productos").getPublicUrl(ruta).data.publicUrl : "";
const fotoEnUso = (ruta, exceptoId) => PRODS.some(p => p.foto === ruta && p.id !== exceptoId);

// Reduce la foto a 700 px y la guarda como JPEG liviano
function reducirImagen(archivo, max = 700){
  return new Promise((ok, mal) => {
    const img = new Image(), url = URL.createObjectURL(archivo);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok(b) : mal(new Error("No se pudo procesar la imagen")), "image/jpeg", 0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error("El archivo no es una imagen válida")); };
    img.src = url;
  });
}

async function subirFoto(archivo){
  const blob = await reducirImagen(archivo);
  const ruta = `${NEG.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from("productos").upload(ruta, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return ruta;
}

const borrarFotoStorage = ruta => ruta ? sb.storage.from("productos").remove([ruta]) : null;

function pintarPrevia(url){
  const i = $("f-foto-prev"); i.classList.toggle("hide", !url); if (url) i.src = url;
  $("f-foto-quitar").classList.toggle("hide", !url);
}
function previaFoto(){ const a = $("f-foto").files[0]; FOTO_QUITAR = false; pintarPrevia(a ? URL.createObjectURL(a) : null); }
function quitarFoto(){ $("f-foto").value = ""; FOTO_QUITAR = true; pintarPrevia(null); }
function verFoto(url){ const m = $("m-foto"); m.querySelector("img").src = url; m.classList.remove("hide"); }

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

// Orden de la lista: tallas XS, S, M, L (de arriba hacia abajo) y, dentro de cada talla, de menor a mayor número.
// Los códigos sin talla van al final.
const ORDEN_TALLA = { XS: 0, S: 1, M: 2, L: 3 };

function ordenarProductos(lista){
  const clave = p => {
    const m = p.codigo.match(/^(XS|S|M|L)(\d+)$/i);
    return m ? [ORDEN_TALLA[m[1].toUpperCase()], parseInt(m[2], 10)] : [4, 0];
  };
  return lista.sort((a, b) => {
    const x = clave(a), y = clave(b);
    return x[0] - y[0] || x[1] - y[1] || a.codigo.localeCompare(b.codigo, undefined, { numeric: true });
  });
}

async function cargarProductos(){
  const { data, error } = await sb.from("productos").select("*").eq("negocio_id", NEG.id).order("nombre");
  $("pr-msg").textContent = error ? "No se pudo cargar: " + error.message : "";
  PRODS = error ? [] : ordenarProductos(data);
  const b = PRODS.filter(bajo);
  $("alerta").classList.toggle("hide", !b.length);
    $("alerta").innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
    <b>⚠ Stock bajo en ${b.length} producto(s)</b>
    <button type="button" onclick="verStockBajo()" style="width:auto !important;flex:none;padding:6px 18px">Ver</button></div>`;
  listar();
  codigoPorDefecto();
}

function listar(){
  const q = $("buscar").value.trim().toLowerCase();
  const r = PRODS.filter(p => p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q));
  $("lista").innerHTML = r.length ? r.map(p => {
    const url = fotoUrl(p.foto);
    const mini = url ? `<img class="miniatura" src="${url}" alt="" loading="lazy" onclick="verFoto('${url}')">` : `<span class="miniatura vacia"></span>`;
    return `<div class="fila"><div class="prod-info">${mini}<div><b>${esc(p.codigo)}</b> · ${esc(p.nombre)}<span class="stock ${p.stock > 0 ? "hay" : "cero"}">Stock: ${p.stock}${bajo(p) ? ' <b style="color:#b45309">· stock bajo</b>' : ""}</span></div></div>
     <div class="pre">S/ ${Number(p.precio).toFixed(2)}</div>
     ${PUEDE ? `<button onclick="editar('${p.id}')">Editar</button><button onclick="borrar('${p.id}')">Borrar</button>` : ""}</div>`;
  }).join("") : `<p class="gr">No hay productos para mostrar.</p>`;
}

function limpiarForm(){
  EDIT = null;
  ["f-codigo","f-nombre","f-color","f-precio","f-stock","f-min"].forEach(i => $(i).value = "");
  $("f-foto").value = ""; FOTO_QUITAR = false; pintarPrevia(null);
  $("f-titulo").textContent = "Agregar producto";
  $("f-btn").textContent = "Guardar producto";
  $("f-cancel").classList.add("hide");
  codigoPorDefecto();
}

function editar(id){
  const p = PRODS.find(x => x.id === id); if (!p) return;
  if (typeof verModo === "function") verModo("uno");
  EDIT = id;
  $("f-codigo").value = p.codigo; $("f-nombre").value = p.modelo || p.nombre; $("f-color").value = p.color || "";
  $("f-precio").value = p.precio; $("f-stock").value = p.stock; $("f-min").value = p.stock_minimo;
  $("f-talla").value = (p.codigo.match(/^(XS|S|M|L)\d+$/) || [])[1] || "";
  $("f-foto").value = ""; FOTO_QUITAR = false; pintarPrevia(fotoUrl(p.foto) || null);
  $("f-titulo").textContent = "Editar producto";
  $("f-btn").textContent = "Guardar cambios";
  $("f-cancel").classList.remove("hide");
  window.scrollTo(0, 0);
}

const normP = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

async function guardarProducto(){
  const msg = $("pr-msg"); msg.textContent = "";
  const codigo = $("f-codigo").value.trim(), modelo = $("f-nombre").value.trim(), color = $("f-color").value.trim(),
        nombre = color ? modelo + " " + color : modelo,
        precio = parseFloat($("f-precio").value), stock = parseInt($("f-stock").value || "0", 10),
        stock_minimo = parseInt($("f-min").value || "0", 10);
  if (!codigo || !modelo) return msg.textContent = "Escribe el código y el nombre.";
  if (isNaN(precio) || precio < 0) return msg.textContent = "Escribe un precio válido.";
  if (isNaN(stock)) return msg.textContent = "Escribe un stock válido.";
  if (isNaN(stock_minimo) || stock_minimo < 0) return msg.textContent = "Escribe un aviso de stock válido.";

  const anterior = EDIT ? ((PRODS.find(x => x.id === EDIT) || {}).foto || null) : null;
  let foto = anterior;
  const arch = $("f-foto").files[0];
  try {
    if (arch) foto = await subirFoto(arch);
    else if (FOTO_QUITAR) foto = null;
  } catch (e) { return msg.textContent = "No se pudo subir la foto: " + (e.message || e); }

      if (!EDIT) {
    const t = $("f-talla").value.toUpperCase(), clave = normP(nombre);
    const ya = PRODS.find(p => p.codigo !== codigo && normP(p.nombre) === clave &&
      ((p.codigo.match(/^(XS|S|M|L)\d+$/i) || [])[1] || "").toUpperCase() === t);
    if (ya) {
      if (!confirm(`Ya existe ${ya.codigo} · ${ya.nombre} (stock ${ya.stock}).\n\n¿Sumar ${stock} unidad(es) a ese producto?\n\nSi cancelas, no se crea nada.`)) return;
      const { error: e2 } = await sb.from("productos").update({ stock: ya.stock + stock }).eq("id", ya.id).eq("negocio_id", NEG.id);
      if (e2) return msg.textContent = "No se pudo sumar el stock: " + e2.message;
      limpiarForm();
      return cargarProductos();
    }
  }

  const fila = { codigo, nombre, modelo, color: color || null, precio, stock, stock_minimo, foto };
  const { error } = EDIT
    ? await sb.from("productos").update(fila).eq("id", EDIT)
    : await sb.from("productos").insert({ ...fila, negocio_id: NEG.id });
  if (error) {
    if (arch) borrarFotoStorage(foto);
    return msg.textContent = error.code === "23505" ? "Ya tienes un producto con ese código." : "No se pudo guardar: " + error.message;
  }
  if (anterior && anterior !== foto && !fotoEnUso(anterior, EDIT)) borrarFotoStorage(anterior);
  limpiarForm();
  cargarProductos();
}

function verModo(m){
  $("modo-uno").classList.toggle("hide", m !== "uno");
  $("modo-bloque").classList.toggle("hide", m !== "bloque");
  $("modo-b-uno").classList.toggle("act", m === "uno");
  $("modo-b-bloque").classList.toggle("act", m === "bloque");
}

async function guardarPrenda(){
  const msg = $("p-msg"); msg.style.color = ""; msg.textContent = "";
  const modelo = $("p-modelo").value.trim(), color = $("p-color").value.trim();
  const precio = parseFloat($("p-precio").value), min = parseInt($("p-min").value) || 0;
  if (!modelo) return msg.textContent = "Escribe el modelo.";
  if (!color) return msg.textContent = "Escribe el color.";
  if (!(precio > 0)) return msg.textContent = "Escribe un precio válido.";
  const tallas = ["XS", "S", "M", "L"].filter(t => $("p-" + t).value !== "");
  if (!tallas.length) return msg.textContent = "Escribe la cantidad de al menos una talla.";
  for (const t of tallas) if (!(parseInt($("p-" + t).value) >= 0)) return msg.textContent = "Cantidad inválida en la talla " + t + ".";

  const nombre = `${modelo} ${color}`, clave = normP(nombre);
  const nuevas = [], sumadas = [];
  for (const t of tallas) {
    const cant = parseInt($("p-" + t).value);
    const { data } = await sb.from("productos").select("id,codigo,nombre,stock,modelo,color").eq("negocio_id", NEG.id).like("codigo", t + "%");
    const re = new RegExp("^" + t + "(\\d+)$");
    const deTalla = (data || []).filter(r => re.test(r.codigo));
    const ya = deTalla.find(r => normP(r.nombre) === clave);
    if (ya) {
      // ya existe ese modelo y color en esa talla: se suma al código que ya tiene
      const { error } = await sb.from("productos")
        .update({ stock: ya.stock + cant, modelo: ya.modelo || modelo, color: ya.color || color })
        .eq("id", ya.id).eq("negocio_id", NEG.id);
      if (error) return msg.textContent = "No se pudo sumar el stock de " + ya.codigo + ": " + error.message;
      sumadas.push(`${ya.codigo} (${ya.stock} → ${ya.stock + cant})`);
      continue;
    }
    const max = deTalla.reduce((m, r) => Math.max(m, +re.exec(r.codigo)[1]), 0);
    nuevas.push({
      negocio_id: NEG.id,
      codigo: t + String(max + 1).padStart(6 - t.length, "0"),
      nombre, modelo, color,
      precio, stock: cant, stock_minimo: min
    });
  }
  if (nuevas.length) {
    const { error } = await sb.from("productos").insert(nuevas);
    if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  }
  msg.style.color = "var(--ok,#16a34a)";
  msg.textContent = "Listo." +
    (nuevas.length ? ` Nuevos: ${nuevas.map(f => f.codigo).join(", ")}.` : "") +
    (sumadas.length ? ` Stock sumado en: ${sumadas.join(", ")}.` : "");
  ["p-modelo", "p-color", "p-precio", "p-min", "p-XS", "p-S", "p-M", "p-L"].forEach(i => $(i).value = "");
  if (typeof cargarProductos === "function") cargarProductos();
}

async function borrar(id){
  if (!confirm("¿Borrar este producto?")) return;
  const p = PRODS.find(x => x.id === id);
  const { data, error } = await sb.from("productos").delete().eq("id", id).eq("negocio_id", NEG.id).select();
  if (error) return $("pr-msg").textContent = "No se pudo borrar: " + error.message;
  if (!data.length) return $("pr-msg").textContent = "No se pudo borrar: el producto no es de tu negocio o tu plan no lo permite.";
  if (p && p.foto && !fotoEnUso(p.foto, id)) borrarFotoStorage(p.foto);
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

// ---------- Stock bajo: lista en recuadro y descarga ----------
const listaBajos = () => PRODS.filter(bajo).sort((x, y) => x.stock - y.stock || x.nombre.localeCompare(y.nombre));
const hoyArchivo = () => new Date().toLocaleDateString("sv-SE");   // AAAA-MM-DD
const nombreArchivo = () => String((NEG && NEG.nombre) || "inventario").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]+/g, "_");

function verStockBajo(){
  const b = listaBajos();
  modalBase(`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <b style="font-size:17px">Stock bajo (${b.length})</b>
      <button type="button" onclick="cerrarModal()" aria-label="Cerrar" style="width:36px;height:36px;padding:0;border-radius:50%;flex:none">✕</button></div>
    <p class="gr" style="margin:6px 0 8px">Productos que llegaron o bajaron del mínimo que configuraste.</p>
    <div style="max-height:52vh;overflow:auto;border-top:1px solid var(--bd)">
      ${b.map(p => `<div style="display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid var(--bd)">
        <div style="flex:1;min-width:0"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)}<small class="gr" style="display:block">Avisar si baja de ${p.stock_minimo}</small></div>
        <b style="font-size:17px;color:${p.stock <= 0 ? "#ef4444" : "#d97706"}">${p.stock}</b></div>`).join("") || `<p class="gr">No hay productos con stock bajo.</p>`}
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="pri" style="flex:1" onclick="descargarStockBajo()">Descargar</button>
      <button style="flex:1" onclick="cerrarModal()">Volver</button></div>`, 520);
}

function descargarStockBajo(){
  const b = listaBajos();
  if (!b.length) return alert("No hay productos con stock bajo.");
  const ws = XLSX.utils.json_to_sheet(b.map(p => ({
    "Código": p.codigo, "Producto": p.nombre, "Stock": p.stock, "Avisar si baja de": p.stock_minimo, "Precio (S/)": Number(p.precio) })));
  ws["!cols"] = [{ wch: 10 }, { wch: 34 }, { wch: 8 }, { wch: 16 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock bajo");
  XLSX.writeFile(wb, "stock_bajo_" + nombreArchivo() + "_" + hoyArchivo() + ".xlsx");
}

// ---------- Descargar todo el inventario ----------
function descargarInventario(){
  if (!PRODS.length) return alert("No hay productos para descargar.");
  const talla = c => (String(c).match(/^(XS|S|M|L)\d+$/i) || [])[1] || "";
  const filas = PRODS.map(p => ({
    "Código": p.codigo, "Producto": p.nombre, "Modelo": p.modelo || "", "Color": p.color || "", "Talla": talla(p.codigo).toUpperCase(),
    "Precio (S/)": Number(p.precio), "Stock": p.stock, "Avisar si baja de": p.stock_minimo,
    "Valor en stock (S/)": Math.round(Number(p.precio) * p.stock * 100) / 100 }));
  const total = filas.reduce((s, f) => s + f["Valor en stock (S/)"], 0);
  filas.push({}, { "Producto": "TOTAL", "Stock": PRODS.reduce((s, p) => s + p.stock, 0), "Valor en stock (S/)": Math.round(total * 100) / 100 });
  const ws = XLSX.utils.json_to_sheet(filas);
  ws["!cols"] = [{ wch: 10 }, { wch: 34 }, { wch: 20 }, { wch: 14 }, { wch: 7 }, { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, "inventario_" + nombreArchivo() + "_" + hoyArchivo() + ".xlsx");
}

// Botón junto al buscador
(function(){
  const b = document.getElementById("buscar");
  if (b && !document.getElementById("btn-desc-inv"))
    b.insertAdjacentHTML("afterend", `<button type="button" id="btn-desc-inv" onclick="descargarInventario()" style="margin-top:8px">Descargar inventario (Excel)</button>`);
})();