// Estadísticas de ropa: tallas, colores, modelos, stock y prendas sin movimiento
const ER_TALLAS = ["XS", "S", "M", "L"];
const tallaDe = c => { const m = String(c || "").match(/^(XS|S|M|L)\d+$/i); return m ? m[1].toUpperCase() : "Sin talla"; };
// El nombre de una prenda es "modelo color": el color es la última palabra
const partesNombre = n => { const w = String(n || "").trim().split(/\s+/); return w.length > 1 ? { modelo: w.slice(0, -1).join(" "), color: w[w.length - 1].toLowerCase() } : { modelo: w[0] || "—", color: "sin color" }; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function armarEstRopa(){
  let box = $("e-ropa");
  if (box) return box;
  box = document.createElement("div");
  box.id = "e-ropa";
  box.style.marginTop = "16px";
  const g = id => `<div class="card"><b id="${id}-t"></b><div style="position:relative;height:260px;margin-top:8px"><canvas id="${id}"></canvas></div><p class="gr hide" id="${id}-v">Sin datos en este mes.</p></div>`;
  box.innerHTML = `<h3 style="margin:8px 0">Estadísticas de ropa</h3>
    <div class="card" id="er-res" style="margin-bottom:12px"></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px">
      ${g("er-talla")}${g("er-color")}${g("er-modelo")}${g("er-stock")}
    </div>
    <div class="card" id="er-quieta" style="margin-top:12px"></div>`;
  $("t-est").appendChild(box);
  return box;
}

const agrupar = (items, clave) => {
  const m = {};
  items.forEach(i => { const k = clave(i), x = m[k] || (m[k] = { u: 0, s: 0 }); x.u += Number(i.cantidad); x.s += Number(i.subtotal); });
  return Object.entries(m).sort((a, b) => b[1].u - a[1].u);
};

function barraRopa(id, titulo, etiquetas, datos, horizontal){
  $(id + "-t").textContent = titulo;
  const vacio = !datos.length || datos.every(x => !x);
  $(id).parentElement.classList.toggle("hide", vacio);
  $(id + "-v").classList.toggle("hide", !vacio);
  if (vacio) return;
  const eje = horizontal ? "x" : "y";
  graficar(id, { type: "bar",
    data: { labels: etiquetas, datasets: [{ data: datos, backgroundColor: EST_COLORES, borderRadius: 6 }] },
    options: { indexAxis: horizontal ? "y" : "x", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed[eje] + " unidades" } } },
      scales: { [eje]: { beginAtZero: true, ticks: { precision: 0 } } } } });
}

async function cargarEstRopa(){
  const box = armarEstRopa();
  box.classList.toggle("hide", !NEG || NEG.tipo !== "tienda");
  if (!NEG || NEG.tipo !== "tienda" || typeof Chart === "undefined") return;
  const ids = estIds(), mes = $("e-mes").value, [y, m] = mes.split("-").map(Number);
  const ini = mes + "-01", sig = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const corte = new Date(Date.now() - 60 * 864e5).toISOString();
  let items, recientes, prods;
  try {
    items = await estFilas(() => sb.from("venta_items").select("codigo,nombre,cantidad,subtotal,ventas!inner(fecha,anulada)").in("negocio_id", ids)
      .eq("ventas.anulada", false).gte("ventas.fecha", ini + "T00:00:00-05:00").lt("ventas.fecha", sig + "T00:00:00-05:00").order("id"));
    recientes = await estFilas(() => sb.from("venta_items").select("negocio_id,codigo,ventas!inner(fecha,anulada)").in("negocio_id", ids)
      .eq("ventas.anulada", false).gte("ventas.fecha", corte).order("id"));
    prods = await estFilas(() => sb.from("productos").select("negocio_id,codigo,nombre,precio,stock,created_at").in("negocio_id", ids).order("id"));
  } catch (e) { $("er-res").textContent = "No se pudieron cargar las estadísticas de ropa: " + e.message; return; }

  // Resumen
  const unidades = items.reduce((s, i) => s + Number(i.cantidad), 0);
  const porTalla = agrupar(items, i => tallaDe(i.codigo)), porColor = agrupar(items, i => cap(partesNombre(i.nombre).color));
  const porModelo = agrupar(items, i => cap(partesNombre(i.nombre).modelo));
  const top = a => a.length ? `<b>${esc(a[0][0])}</b> (${a[0][1].u})` : "—";
  $("er-res").innerHTML = `Prendas vendidas en el mes: <b>${unidades}</b> · Talla más vendida: ${top(porTalla)} · Color más vendido: ${top(porColor)} · Modelo más vendido: ${top(porModelo)}`;

  // Ventas por talla (en orden XS, S, M, L)
  const mt = Object.fromEntries(porTalla);
  const tallas = [...ER_TALLAS, "Sin talla"].filter(t => mt[t]);
  barraRopa("er-talla", "Unidades vendidas por talla", tallas, tallas.map(t => mt[t].u));
  // Colores y modelos (los 8 primeros)
  barraRopa("er-color", "Unidades vendidas por color", porColor.slice(0, 8).map(x => x[0]), porColor.slice(0, 8).map(x => x[1].u));
  barraRopa("er-modelo", "Modelos más vendidos", porModelo.slice(0, 8).map(x => x[0]), porModelo.slice(0, 8).map(x => x[1].u), true);
  // Stock actual por talla
  const st = {}; prods.forEach(p => { const t = tallaDe(p.codigo); st[t] = (st[t] || 0) + Number(p.stock); });
  const ts = [...ER_TALLAS, "Sin talla"].filter(t => st[t]);
  barraRopa("er-stock", "Stock actual por talla (unidades)", ts, ts.map(t => st[t]));

  // Prendas con stock que no se venden hace 60 días
  const vendidas = new Set(recientes.map(r => r.negocio_id + "|" + r.codigo));
  const nuevo = new Date(corte).getTime();
  const quietas = prods.filter(p => p.stock > 0 && !vendidas.has(p.negocio_id + "|" + p.codigo) && new Date(p.created_at).getTime() < nuevo)
    .sort((a, b) => b.stock * b.precio - a.stock * a.precio);
  const valor = prods.reduce((s, p) => s + p.stock * Number(p.precio), 0);
  const nombreSede = id => { const s = SEDES.find(x => x.id === id); return s ? s.nombre : ""; };
  $("er-quieta").innerHTML = `<b>Prendas sin movimiento (60 días sin venderse)</b>
    <p class="gr" style="margin:4px 0">Stock total valorizado a precio de venta: <b>${sol(valor)}</b>. ${quietas.length ? `Tienes <b>${quietas.length}</b> prenda(s) detenidas por <b>${sol(quietas.reduce((s, p) => s + p.stock * p.precio, 0))}</b>.` : "No tienes prendas detenidas."}</p>
    ${quietas.length ? `<table class="tabla-sedes"><tr><th>Código</th><th>Prenda</th><th>Stock</th><th>Valor</th></tr>` +
      quietas.slice(0, 15).map(p => `<tr><td>${esc(p.codigo)}</td><td>${esc(p.nombre)}${ids.length > 1 ? ` <small class="gr">· ${esc(nombreSede(p.negocio_id))}</small>` : ""}</td><td>${p.stock}</td><td>${sol(p.stock * p.precio)}</td></tr>`).join("") + `</table>${quietas.length > 15 ? `<small class="gr">Se muestran las 15 de mayor valor.</small>` : ""}` : ""}`;
}