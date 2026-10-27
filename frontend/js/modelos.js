// Código por modelo: al escanearlo se elige color y talla. Y etiquetas de modelo.
const slugM = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const modeloDe = p => {
  if (p.modelo) return String(p.modelo).trim();
  const n = String(p.nombre || "").trim();
  // sin campo modelo: se quita el color (última palabra) en prendas con talla
  return /^(XS|S|M|L)\d+$/i.test(p.codigo) && /\s/.test(n) ? n.replace(/\s+\S+$/, "") : n;
};
const colorDe = p => {
  if (p.color) return String(p.color).trim();
  const n = String(p.nombre || "").trim();
  return /^(XS|S|M|L)\d+$/i.test(p.codigo) && /\s/.test(n) ? n.split(/\s+/).pop() : "";
};
const hashM = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 60466176).toString(36).toUpperCase().padStart(5, "0"); };
const codigoModelo = m => "MOD-" + hashM(slugM(m));
const tallaDe = p => { const m = String(p.codigo).match(/^(XS|S|M|L)\d+$/i); return m ? m[1].toUpperCase() : p.codigo; };
const ORD_T = { XS: 0, S: 1, M: 2, L: 3 };

// ---------- Elegir color y talla al escanear un código de modelo ----------
let MOD = null;

function abrirModelo(codigo){
  const rest = String(codigo).replace(/^mod-/i, "").toUpperCase();
  const slug = PRODS.map(p => slugM(modeloDe(p))).find(s => s && (s === rest || hashM(s) === rest));
  if (!slug) return false;
  MOD = { slug, color: null, lista: [] };
  pintarModelo();
  return true;
}

function pintarModelo(){
  if (!MOD) return;
  const box = $("v-res");
  const items = PRODS.filter(p => slugM(modeloDe(p)) === MOD.slug);
  const nombre = items.length ? modeloDe(items[0]) : "";
  const colores = [...new Set(items.map(colorDe))];
  MOD.lista = colores;
  if (MOD.color == null && colores.length === 1) MOD.color = colores[0];
  box.className = "res";
  if (MOD.color == null) {
    box.innerHTML = `<div class="gr" style="padding:8px 10px"><b>${esc(nombre)}</b> · elige el color</div><div class="mod-bts">` +
      colores.map((c, i) => `<button type="button" onclick="modColor(${i})">${esc(c || "Sin color")}</button>`).join("") + `</div>`;
    return;
  }
  const tallas = items.filter(p => colorDe(p) === MOD.color)
    .sort((a, b) => (ORD_T[tallaDe(a)] ?? 9) - (ORD_T[tallaDe(b)] ?? 9));
  box.innerHTML = `<div class="gr" style="padding:8px 10px"><b>${esc(nombre + (MOD.color ? " " + MOD.color : ""))}</b> · elige la talla</div><div class="mod-bts">` +
    tallas.map(p => p.stock > 0
      ? `<button type="button" onclick="agregarAlCarrito('${p.id}')">${esc(tallaDe(p))}<small>S/ ${Number(p.precio).toFixed(2)} · stock ${p.stock}</small></button>`
      : `<button type="button" disabled>${esc(tallaDe(p))}<small>sin stock</small></button>`).join("") +
    `</div>` + (colores.length > 1 ? `<div style="padding:0 10px 8px"><button type="button" onclick="MOD.color=null;pintarModelo()">← Otro color</button></div>` : "");
}

function modColor(i){ if (!MOD) return; MOD.color = MOD.lista[i]; pintarModelo(); }

// ---------- Etiquetas de modelo (rollo 50 × 30 mm) ----------
function cargarJsB(){
  return new Promise((ok, err) => {
    if (window.JsBarcode) return ok();
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js";
    s.onload = ok; s.onerror = () => err(new Error("No se pudo cargar el generador de códigos."));
    document.head.appendChild(s);
  });
}

function modelosLista(){
  const m = new Map();
  PRODS.forEach(p => { const s = slugM(modeloDe(p)); if (s && !m.has(s)) m.set(s, modeloDe(p)); });
  return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

function abrirEtiquetasModelo(){
  const mods = modelosLista();
  modalBase(`<b>Etiquetas de modelo</b>
    <p class="gr" style="margin:6px 0">Un código por modelo. Al escanearlo, la app pregunta el color y la talla.</p>
    <input type="text" id="em-q" placeholder="Buscar modelo" oninput="filtrarEM()">
    <div id="em-lista" style="max-height:44vh;overflow:auto;margin:8px 0">
      ${mods.map(([s, n]) => `<label class="em-fila" data-n="${esc(n.toLowerCase())}"><input type="checkbox" class="em-chk" value="${esc(s)}"> <span><b>${esc(n)}</b><small class="gr" style="display:block">${esc(codigoModelo(n))}</small></span></label>`).join("") || `<p class="gr">No hay productos.</p>`}
    </div>
    <label>Copias por modelo</label><input type="number" id="em-n" min="1" max="100" value="1">
    <div class="msg" id="em-msg"></div>
    <div style="display:flex;gap:8px;margin-top:8px"><button style="flex:1" id="em-no">Cerrar</button><button class="pri" style="flex:2" id="em-si">Imprimir</button></div>`);
  $("em-no").onclick = cerrarModal;
  $("em-si").onclick = imprimirEtiquetasModelo;
}

function filtrarEM(){
  const q = $("em-q").value.trim().toLowerCase();
  document.querySelectorAll(".em-fila").forEach(f => f.classList.toggle("hide", q && !f.dataset.n.includes(q)));
}

async function imprimirEtiquetasModelo(){
  const msg = $("em-msg"); msg.textContent = "";
  const sel = [...document.querySelectorAll(".em-chk:checked")].map(c => c.value);
  if (!sel.length) return msg.textContent = "Marca al menos un modelo.";
  const copias = Math.max(1, Math.min(100, parseInt($("em-n").value, 10) || 1));
  try { await cargarJsB(); } catch (e) { return msg.textContent = e.message; }
  const nombres = new Map(modelosLista());
  let html = "";
    sel.forEach(s => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, "MOD-" + hashM(s), { format: "CODE128", height: 40, width: 2, fontSize: 12, margin: 0, displayValue: true });
    // que escale al ancho de la etiqueta sin cortarse
    const w = parseFloat(svg.getAttribute("width")), h = parseFloat(svg.getAttribute("height"));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.removeAttribute("width"); svg.removeAttribute("height");
    const una = `<div class="e"><div class="n">${esc(nombres.get(s) || s)}</div>${svg.outerHTML}</div>`;
    html += una.repeat(copias);
  });
  cerrarModal();
  imprimirHTML(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiquetas de modelo</title><style>
    @page{size:50mm 30mm;margin:0}
    body{margin:0;font-family:sans-serif}
    .e{width:50mm;height:30mm;box-sizing:border-box;padding:2mm 2.5mm;text-align:center;page-break-after:always;overflow:hidden}
    .n{font-weight:700;font-size:11px;line-height:1.15;margin-bottom:1mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .e svg{width:100%;height:auto;max-height:20mm}
  </style></head><body>${html}</body></html>`);
}

// Botón en la pantalla de Inventario (junto al buscador)
(function(){
  const b = $("buscar");
  if (b && !$("btn-em")) b.insertAdjacentHTML("afterend", `<button type="button" id="btn-em" onclick="abrirEtiquetasModelo()" style="margin-top:8px">Etiquetas de modelo (escanear: color y talla)</button>`);
})();

// El escáner de la cámara también acepta códigos de modelo
(function(){
  const orig = window.alLeerCodigo;
  if (typeof orig !== "function") return;
  window.alLeerCodigo = function(c){
    const txt = String(typeof c === "string" ? c : (c && (c.rawValue || c.text)) || "").trim();
    if (/^mod-/i.test(txt)) {
      const b = $("v-buscar"); if (b) b.value = txt;
      if (typeof cerrarEscaner === "function") cerrarEscaner();
      if (!abrirModelo(txt)) alert("No se encontró ese modelo en tu inventario.");
      return;
    }
    return orig.apply(this, arguments);
  };
})();