// atributos.js — los campos del producto salen de la configuración del rubro
let ATRS = [], ATRS_RUBRO = null;
const ATRS_DEFECTO = [{ clave: "nombre", etiqueta: "Nombre", tipo: "texto", columna: "nombre",
  obligatorio: true, en_codigo: false, en_nombre: true, en_estadisticas: false, opciones: null, orden: 1 }];

async function cargarAtributos(){
  const rubro = (NEG && NEG.rubro) || "";
  let data = null;
  if (rubro) ({ data } = await sb.from("rubro_atributos").select("*").eq("rubro", rubro).order("orden"));
  ATRS = (data && data.length) ? data : ATRS_DEFECTO;
  ATRS_RUBRO = rubro;
  pintarCamposProducto();
  pintarBloque();
}

// El atributo que forma el prefijo del código (talla, por ejemplo)
const atrCodigo = () => ATRS.find(a => a.en_codigo) || null;

// Prefijo de un código ya existente: la opción con la que empieza, seguida solo de números
function prefijoDe(codigo){
  const a = atrCodigo(); if (!a) return "";
  return (a.opciones || []).find(o => String(codigo).startsWith(o) && /^\d+$/.test(String(codigo).slice(o.length))) || "";
}

function pintarCamposProducto(){
  const box = $("f-atrs"); if (!box) return;
  box.innerHTML = ATRS.map(a => {
    const id = "fa-" + a.clave, ayuda = a.ayuda ? ` placeholder="${esc(a.ayuda)}"` : "";
    const campo = a.tipo === "lista"
      ? `<select id="${id}"${a.en_codigo ? ' onchange="codigoPorAtributo()"' : ""}><option value="">${a.obligatorio ? "Elige una opción" : "—"}</option>${(a.opciones || []).map(o => `<option>${esc(o)}</option>`).join("")}</select>`
      : `<input type="${a.tipo === "numero" ? "number" : a.tipo === "fecha" ? "date" : "text"}" id="${id}"${ayuda}>`;
    return `<div><label>${esc(a.etiqueta)}${a.obligatorio ? "" : ` <small class="gr">(opcional)</small>`}</label>${campo}</div>`;
  }).join("");
}

// Lee el formulario: qué va a columnas reales, qué al jsonb, el nombre y el prefijo
function atrLeer(){
  const columnas = {}, atributos = {}, partes = [];
  let prefijo = "", falta = null;
  ATRS.forEach(a => {
    const el = $("fa-" + a.clave); if (!el) return;
    const v = String(el.value || "").trim();
    if (a.obligatorio && !v && !falta) falta = a.etiqueta;
    if (a.en_codigo) prefijo = v;
    if (a.en_nombre && v) partes.push(v);
    if (a.columna) columnas[a.columna] = v || null;
    else if (v) atributos[a.clave] = v;
  });
  return { falta, prefijo, nombre: partes.join(" "), columnas, atributos };
}

function atrPintar(p){
  ATRS.forEach(a => {
    const el = $("fa-" + a.clave); if (!el) return;
    el.value = a.en_codigo ? prefijoDe(p.codigo)
      : a.columna ? (p[a.columna] || "")
      : ((p.atributos || {})[a.clave] || "");
  });
}

function atrLimpiar(){ ATRS.forEach(a => { const el = $("fa-" + a.clave); if (el) el.value = ""; }); }

// Resumen de los atributos que no están en el nombre, para la lista del inventario
function atrResumen(p){
  return ATRS.filter(a => !a.en_nombre && !a.en_codigo && !a.columna)
    .map(a => (p.atributos || {})[a.clave]).filter(Boolean).join(" · ");
}

// Carga por bloque: una casilla por cada opción del atributo del código
function pintarBloque(){
  const box = $("p-tallas"), a = atrCodigo();
  if (!box) return;
  const lbl = $("p-lbl-bloque");
    const btn = document.getElementById("modo-b-bloque");
  if (!a || a.tipo !== "lista") {
    box.innerHTML = "";
    if (btn) btn.classList.add("hide");
    if (typeof verModo === "function") verModo("uno");
    return;
  }
  if (btn) { btn.classList.remove("hide"); btn.textContent = `Por bloque (${a.etiqueta.toLowerCase()})`; }