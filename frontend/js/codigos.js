// Códigos de barras: etiquetas para imprimir y escáner con la cámara en Ventas

let JSBC = null;
function cargarJsBarcode(){
  if (window.JsBarcode) return Promise.resolve();
  return JSBC || (JSBC = new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js";
    s.onload = ok; s.onerror = () => { JSBC = null; no(new Error("No se pudo cargar la librería de códigos de barras. Revisa tu conexión.")); };
    document.head.appendChild(s);
  }));
}

// ---------- Etiquetas ----------
let ET = {};   // id de producto -> cantidad de etiquetas

function abrirEtiquetas(){
  ET = {};
  modalBase(`<b>Etiquetas con código de barras</b>
    <p class="gr" style="margin:6px 0">Marca las prendas e indica cuántas etiquetas imprimir de cada una.</p>
    <input type="text" id="et-buscar" placeholder="Buscar por código o nombre" oninput="listarEtiquetas()">
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">
      <button onclick="marcarTodasEt('stock')">Todo (cantidad = stock)</button>
      <button onclick="marcarTodasEt('uno')">Todo (1 c/u)</button>
      <button onclick="marcarTodasEt('nada')">Quitar marcas</button></div>
    <div id="et-lista" style="max-height:38vh;overflow:auto"></div>
    <label>Formato</label>
    <select id="et-formato"><option value="rollo">Rollo de etiquetas 50 × 30 mm</option><option value="a4">Hoja A4 (4 columnas)</option></select>
    <label class="opt" style="padding:10px"><input type="checkbox" id="et-precio" checked> Mostrar el precio</label>
    <div class="msg" id="et-msg"></div>
    <div style="display:flex;gap:8px;margin-top:8px"><button style="flex:1" onclick="cerrarModal()">Cancelar</button>
    <button class="pri" style="flex:2" onclick="imprimirEtiquetas()">Imprimir etiquetas</button></div>`, 520);
  listarEtiquetas();
}

function listarEtiquetas(){
  const q = $("et-buscar").value.trim().toLowerCase();
  const r = PRODS.filter(p => !q || p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)).slice(0, 80);
  $("et-lista").innerHTML = r.length ? r.map(p => `<div class="fila" style="gap:8px">
      <input type="checkbox" ${ET[p.id] ? "checked" : ""} onchange="marcarEt('${p.id}', this.checked)" style="width:auto">
      <div style="flex:1;min-width:0"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)}<small class="gr"> stock ${p.stock}</small></div>
      <input type="number" min="1" max="200" value="${ET[p.id] || 1}" onchange="copiasEt('${p.id}', this.value)" style="width:70px"></div>`).join("")
    : `<p class="gr">No hay productos.</p>`;
}

function marcarEt(id, on){ if (on) ET[id] = ET[id] || 1; else delete ET[id]; }
function copiasEt(id, v){ if (ET[id]) ET[id] = Math.max(1, Math.min(parseInt(v, 10) || 1, 200)); }
function marcarTodasEt(modo){
  ET = {};
  if (modo !== "nada") PRODS.forEach(p => { if (modo === "uno") ET[p.id] = 1; else if (p.stock > 0) ET[p.id] = Math.min(p.stock, 200); });
  listarEtiquetas();
}

function svgCodigo(c){
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(s, c, { format: "CODE128", displayValue: true, fontSize: 12, height: 34, width: 1.4, margin: 0, textMargin: 1 });
  s.setAttribute("style", "max-width:100%;height:auto");
  return s.outerHTML;
}

async function imprimirEtiquetas(){
  const msg = $("et-msg"); msg.textContent = "";
  const sel = PRODS.filter(p => ET[p.id]);
  if (!sel.length) return msg.textContent = "Marca al menos una prenda.";
  try { await cargarJsBarcode(); } catch (e) { return msg.textContent = e.message; }
  const a4 = $("et-formato").value === "a4", precio = $("et-precio").checked;
  const una = p => `<div class="et"><div class="n">${esc(p.nombre)}</div>${precio ? `<div class="p">S/ ${Number(p.precio).toFixed(2)}</div>` : ""}${svgCodigo(p.codigo)}</div>`;
  const todas = sel.flatMap(p => Array(ET[p.id]).fill(p)).map(una).join("");
  imprimirHTML(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiquetas</title><style>
    ${a4 ? "@page{size:A4;margin:8mm}" : "@page{size:50mm 30mm;margin:0}"}
    body{margin:0;font-family:Arial,sans-serif}
    ${a4 ? ".hoja{display:flex;flex-wrap:wrap}" : ""}
    .et{width:${a4 ? "25%" : "50mm"};height:30mm;box-sizing:border-box;padding:2mm 2.5mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;
      ${a4 ? "border:.2mm dashed #bbb;page-break-inside:avoid" : "page-break-after:always"}}
    .n{font:600 9px Arial;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .p{font:700 11px Arial}
    </style></head><body>${a4 ? `<div class="hoja">${todas}</div>` : todas}</body></html>`);
  cerrarModal();
}

// ---------- Escáner con la cámara (en Ventas) ----------
let ESC = null;

async function abrirEscaner(){
  if (!("BarcodeDetector" in window))
    return alert("Este navegador no puede escanear con la cámara. Usa Chrome en Android, o una pistola lectora: escanea con el cursor en el buscador y se agrega solo.");
  modalBase(`<b>Escanear código de barras</b>
    <video id="es-video" playsinline muted style="width:100%;border-radius:12px;background:#000;margin-top:8px"></video>
    <div class="msg" id="es-msg" style="color:var(--gr)">Apunta al código de la etiqueta. Se agrega a la venta y puedes seguir escaneando.</div>
    <button class="pri full" onclick="cerrarEscaner()">Terminar</button>`);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = $("es-video"); video.srcObject = stream; await video.play();
    const det = new BarcodeDetector({ formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "qr_code"] });
    ESC = { stream, ultimo: "", t: 0, ocupado: false };
    ESC.timer = setInterval(async () => {
      if (!ESC || ESC.ocupado) return;
      ESC.ocupado = true;
      try {
        const r = await det.detect(video);
        if (r.length) {
          const cod = r[0].rawValue.trim();
          if (cod !== ESC.ultimo || Date.now() - ESC.t > 2500) { ESC.ultimo = cod; ESC.t = Date.now(); alLeerCodigo(cod); }
        }
      } catch {} finally { if (ESC) ESC.ocupado = false; }
    }, 350);
  } catch (e) { cerrarEscaner(); alert("No se pudo usar la cámara: " + (e.message || e)); }
}

function alLeerCodigo(cod){
  const m = $("es-msg"); if (!m) return;

  // Código de modelo (MOD-...): se cierra la cámara y se eligen color y talla
  if (/^mod-/i.test(cod)) {
    if (typeof abrirModelo !== "function" || !abrirModelo(cod)) {
      m.style.color = "#ef4444"; m.textContent = "El modelo " + cod + " no está en tu inventario."; return;
    }
    cerrarEscaner();
    const r = $("v-res"); if (r && r.scrollIntoView) r.scrollIntoView({ block: "center", behavior: "smooth" });
    if (navigator.vibrate) navigator.vibrate(60);
    return;
  }

  const p = PRODS.find(x => x.codigo.toLowerCase() === cod.toLowerCase());
  if (!p) { m.style.color = "#ef4444"; m.textContent = "El código " + cod + " no está en tu inventario."; return; }
  if (p.stock <= 0) { m.style.color = "#ef4444"; m.textContent = p.nombre + " no tiene stock."; return; }
  cerrarEscaner();                 // se lee una sola vez y se cierra la cámara
  agregarAlCarrito(p.id);
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (navigator.vibrate) navigator.vibrate(60);
}

function cerrarEscaner(){
  if (ESC) { clearInterval(ESC.timer); ESC.stream.getTracks().forEach(t => t.stop()); ESC = null; }
  cerrarModal();
}

// Botones en las pantallas existentes
(function(){
  const b = document.getElementById("buscar");
  if (b && !document.getElementById("btn-etiquetas")) {
    const x = document.createElement("button");
    x.id = "btn-etiquetas"; x.textContent = "Etiquetas con código de barras"; x.style.margin = "8px 0"; x.onclick = abrirEtiquetas;
    b.after(x);
  }
  const v = document.getElementById("v-buscar");
  if (v && !document.getElementById("btn-escaner")) {
    const x = document.createElement("button");
    x.id = "btn-escaner"; x.textContent = "Escanear con la cámara"; x.style.margin = "6px 0"; x.onclick = abrirEscaner;
    v.after(x);
  }
})();