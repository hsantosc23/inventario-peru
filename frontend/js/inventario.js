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
// Código = prefijo del atributo (talla, por ejemplo) + correlativo. Sin prefijo, solo el número.
function siguienteCodigo(pref){
  pref = pref || "";
  const usados = new Set(PRODS.map(p => p.codigo));
  const esc_ = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("^" + esc_(pref) + "(\\d+)$");
  let n = 0;
  PRODS.forEach(p => {
    if (!pref && prefijoDe(p.codigo)) return;     // sin prefijo no se cuentan los que sí lo tienen
    const m = re.exec(p.codigo); if (m) n = Math.max(n, parseInt(m[1], 10));
  });
  let c;
  do { n++; c = pref + String(n).padStart(Math.max(6 - pref.length, 3), "0"); } while (usados.has(c));
  return c;
}

function codigoPorDefecto(){
  if (!PUEDE || EDIT) return;
  const campo = $("f-codigo"); if (!campo) return;
  const v = campo.value.trim();
  const a = atrCodigo(), el = a && $("fa-" + a.clave);
  if (v === "" || v === AUTO) { AUTO = siguienteCodigo(el ? el.value : ""); campo.value = AUTO; }
}

function codigoPorAtributo(){
  if (EDIT) return;
  const a = atrCodigo(), el = a && $("fa-" + a.clave);
  AUTO = siguienteCodigo(el ? el.value : "");
  $("f-codigo").value = AUTO;
}

// Orden de la lista: según el orden de las opciones del atributo del código, y dentro, por número
function ordenarProductos(lista){
  const a = atrCodigo(), ops = (a && a.opciones) || [];
  const clave = p => {
    const pr = prefijoDe(p.codigo);
    const i = pr ? ops.indexOf(pr) : ops.length + 1;
    return [i < 0 ? ops.length : i, parseInt(String(p.codigo).slice(pr.length), 10) || 0];
  };
  return lista.sort((x, y) => {
    const a1 = clave(x), b1 = clave(y);
    return a1[0] - b1[0] || a1[1] - b1[1] || x.codigo.localeCompare(y.codigo, undefined, { numeric: true });
  });
}

async function cargarProductos(){
    if (ATRS_RUBRO !== ((NEG && NEG.rubro) || "")) await cargarAtributos();
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
    return     `<div class="fila"><div><b>${esc(p.codigo)}</b> · ${esc(p.nombre)}${atrResumen(p) ? ` <small class="gr">· ${esc(atrResumen(p))}</small>` : ""}<span class="stock ${p.stock > 0 ? "hay" : "cero"}">Stock: ${p.stock}${bajo(p) ? ' <b style="color:#b45309">· stock bajo</b>' : ""}</span></div></div>
     <div class="pre">S/ ${Number(p.precio).toFixed(2)}</div>
     ${PUEDE ? `<button onclick="editar('${p.id}')">Editar</button><button onclick="borrar('${p.id}')">Borrar</button>` : ""}</div>`;
  }).join("") : `<p class="gr">No hay productos para mostrar.</p>`;
}

function limpiarForm(){
  EDIT = null;
  ["f-codigo","f-precio","f-stock","f-min"].forEach(i => $(i).value = "");
  atrLimpiar();
  $("f-titulo").textContent = "Agregar producto";
  $("f-btn").textContent = "Guardar producto";
  $("f-cancel").classList.add("hide");
  codigoPorDefecto();
}

function editar(id){
  const p = PRODS.find(x => x.id === id); if (!p) return;
  EDIT = id;
  $("f-codigo").value = p.codigo;
  $("f-precio").value = p.precio; $("f-stock").value = p.stock; $("f-min").value = p.stock_minimo;
  atrPintar(p);
  $("f-titulo").textContent = "Editar producto";
  $("f-btn").textContent = "Guardar cambios";
  $("f-cancel").classList.remove("hide");
  window.scrollTo(0, 0);
}

const normP = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");

async function guardarProducto(){
  const msg = $("pr-msg"); msg.textContent = "";
  const a = atrLeer();
  const codigo = $("f-codigo").value.trim();
  const precio = parseFloat($("f-precio").value), stock = parseInt($("f-stock").value || "0", 10),
        stock_minimo = parseInt($("f-min").value || "0", 10);
  if (!codigo) return msg.textContent = "Escribe el código.";
  if (a.falta) return msg.textContent = "Falta: " + a.falta + ".";
  if (!a.nombre) return msg.textContent = "Escribe el nombre del producto.";
  if (isNaN(precio) || precio < 0) return msg.textContent = "Escribe un precio válido.";
  if (isNaN(stock)) return msg.textContent = "Escribe un stock válido.";
  if (isNaN(stock_minimo) || stock_minimo < 0) return msg.textContent = "Escribe un aviso de stock válido.";

  if (!EDIT) {
    const clave = normP(a.nombre);
    const ya = PRODS.find(p => p.codigo !== codigo && normP(p.nombre) === clave && prefijoDe(p.codigo) === a.prefijo);
    if (ya) {
      if (!confirm(`Ya existe ${ya.codigo} · ${ya.nombre} (stock ${ya.stock}).\n\n¿Sumar ${stock} unidad(es) a ese producto?\n\nSi cancelas, no se crea nada.`)) return;
      const { error: e2 } = await sb.from("productos").update({ stock: ya.stock + stock }).eq("id", ya.id).eq("negocio_id", NEG.id);
      if (e2) return msg.textContent = "No se pudo sumar el stock: " + e2.message;
      limpiarForm();
      return cargarProductos();
    }
  }

  const fila = { codigo, nombre: a.nombre, ...a.columnas, atributos: a.atributos, precio, stock, stock_minimo };
  const { error } = EDIT
    ? await sb.from("productos").update(fila).eq("id", EDIT)
    : await sb.from("productos").insert({ ...fila, negocio_id: NEG.id });
  if (error) return msg.textContent = error.code === "23505"
    ? "Ya tienes un producto con ese código." : "No se pudo guardar: " + error.message;
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
  const a = atrCodigo();
  if (!a || a.tipo !== "lista") return msg.textContent = "Este rubro no usa carga por bloque.";
  const modelo = $("p-modelo").value.trim(), color = $("p-color").value.trim();
  const precio = parseFloat($("p-precio").value), min = parseInt($("p-min").value) || 0;
  if (!modelo) return msg.textContent = "Escribe el modelo.";
  if (!(precio > 0)) return msg.textContent = "Escribe un precio válido.";
  const ops = (a.opciones || []).filter(o => $("pb-" + o) && $("pb-" + o).value !== "");
  if (!ops.length) return msg.textContent = `Escribe la cantidad de al menos una ${a.etiqueta.toLowerCase()}.`;
  for (const o of ops) if (!(parseInt($("pb-" + o).value) >= 0)) return msg.textContent = "Cantidad inválida en " + o + ".";

  const nombre = color ? `${modelo} ${color}` : modelo, clave = normP(nombre);
  const nuevas = [], sumadas = [];
  for (const o of ops) {
    const cant = parseInt($("pb-" + o).value);
    const ya = PRODS.find(p => prefijoDe(p.codigo) === o && normP(p.nombre) === clave);
    if (ya) {
      const { error } = await sb.from("productos").update({ stock: ya.stock + cant }).eq("id", ya.id).eq("negocio_id", NEG.id);
      if (error) return msg.textContent = "No se pudo sumar el stock de " + ya.codigo + ": " + error.message;
      sumadas.push(`${ya.codigo} (${ya.stock} → ${ya.stock + cant})`);
      continue;
    }
    nuevas.push({ negocio_id: NEG.id, codigo: siguienteCodigo(o), nombre, modelo, color: color || null,
      precio, stock: cant, stock_minimo: min });
    PRODS.push(nuevas[nuevas.length - 1]);   // para que el siguiente código no se repita
  }
  if (nuevas.length) {
    const { error } = await sb.from("productos").insert(nuevas.map(({ negocio_id, codigo, nombre, modelo, color, precio, stock, stock_minimo }) =>
      ({ negocio_id, codigo, nombre, modelo, color, precio, stock, stock_minimo })));
    if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  }
  msg.style.color = "var(--ok,#16a34a)";
  msg.textContent = "Listo." + (nuevas.length ? ` Nuevos: ${nuevas.map(f => f.codigo).join(", ")}.` : "") +
    (sumadas.length ? ` Stock sumado en: ${sumadas.join(", ")}.` : "");
  ["p-modelo","p-color","p-precio","p-min"].forEach(i => $(i).value = "");
  (a.opciones || []).forEach(o => { const el = $("pb-" + o); if (el) el.value = ""; });
  cargarProductos();
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