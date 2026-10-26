// estadisticas.js — panel de estadísticas con Chart.js: día, semana, mes o año
// ---------- Estilo moderno para todos los gráficos ----------
(function(){
  if (!window.Chart) return;
  const PAL = ["#6366f1", "#22d3ee", "#34d399", "#fbbf24", "#fb7185", "#a78bfa", "#38bdf8", "#f97316"];
  const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const oscuro = () => document.documentElement.dataset.tema === "oscuro";

  function ajustarDefaults(){
    const d = Chart.defaults, osc = oscuro();
    d.font.family = "Inter, system-ui, sans-serif";
    d.font.size = 12;
    d.color = osc ? "#aab4d4" : "#64748b";
    d.borderColor = osc ? "rgba(255,255,255,.06)" : "rgba(15,23,42,.06)";
    d.animation.duration = 700;
    d.animation.easing = "easeOutQuart";
    d.maintainAspectRatio = false;
    d.scale.border.display = false;
    d.scale.grid.color = osc ? "rgba(255,255,255,.06)" : "rgba(15,23,42,.06)";
    d.scales.category.grid.display = false;
    d.elements.bar.borderRadius = 8;
    d.elements.bar.borderSkipped = false;
    d.elements.line.tension = .38;
    d.elements.line.borderWidth = 2.5;
    d.elements.point.radius = 0;
    d.elements.point.hoverRadius = 5;
    d.datasets.bar.maxBarThickness = 42;
    d.datasets.bar.categoryPercentage = .72;
    d.plugins.legend.labels.usePointStyle = true;
    d.plugins.legend.labels.boxWidth = 8;
    d.plugins.legend.labels.boxHeight = 8;
    Object.assign(d.plugins.tooltip, {
      backgroundColor: "rgba(10,15,31,.94)", titleColor: "#fff", bodyColor: "#dbe3ff",
      padding: 12, cornerRadius: 12, boxPadding: 5, borderColor: "rgba(255,255,255,.1)", borderWidth: 1
    });
  }
  ajustarDefaults();

  // Colores con degradado según la paleta
  Chart.register({
    id: "temaModerno",
    beforeUpdate(){ ajustarDefaults(); },
    beforeDatasetsUpdate(chart){
      const tipo = chart.config.type, ca = chart.chartArea, horiz = chart.options.indexAxis === "y";
      chart.data.datasets.forEach((ds, i) => {
        const t = ds.type || tipo, base = PAL[i % PAL.length];
        if (t === "pie" || t === "doughnut" || t === "polarArea") {
          ds.backgroundColor = (ds.data || []).map((_, k) => PAL[k % PAL.length]);
          ds.borderWidth = 0; ds.hoverOffset = 8;
        } else if (t === "bar") {
          const multi = (chart.data.datasets.length === 1);  // una serie: cada barra con su color
          const mk = c => {
            if (!ca) return c;
            const g = horiz ? chart.ctx.createLinearGradient(ca.left, 0, ca.right, 0)
                            : chart.ctx.createLinearGradient(0, ca.top, 0, ca.bottom);
            horiz ? (g.addColorStop(0, rgba(c, .35)), g.addColorStop(1, c)) : (g.addColorStop(0, c), g.addColorStop(1, rgba(c, .35)));
            return g;
          };
          ds.backgroundColor = multi ? (ds.data || []).map((_, k) => mk(PAL[k % PAL.length])) : mk(base);
        } else if (t === "line") {
          ds.borderColor = base;
          ds.fill = true;
          if (ca) {
            const g = chart.ctx.createLinearGradient(0, ca.top, 0, ca.bottom);
            g.addColorStop(0, rgba(base, .35)); g.addColorStop(1, rgba(base, 0));
            ds.backgroundColor = g;
          }
          ds.pointBackgroundColor = base;
        } else if (t === "scatter" || t === "bubble") {
          ds.backgroundColor = rgba(base, .55);
          ds.borderColor = base;
          ds.pointRadius = 6; ds.pointHoverRadius = 8;
        }
      });
    }
  });
})();

let EST = null, GRAFICOS = {};
const EST_COLORES = ["#2f6df6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
const sol = n => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- Periodo elegido (fechas "AAAA-MM-DD" en hora de Lima) ----------
const hoyLimaEst = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
const sumaDias = (s, n) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const sumaMeses = (s, n) => { const d = new Date(s.slice(0, 7) + "-01T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
const lunesDeSemana = v => { const [y, w] = v.split("-W").map(Number); const j4 = new Date(Date.UTC(y, 0, 4)); j4.setUTCDate(j4.getUTCDate() - ((j4.getUTCDay() + 6) % 7) + (w - 1) * 7); return j4.toISOString().slice(0, 10); };

let EPER = "dia", EREF = hoyLimaEst();

// Devuelve [ini, fin) del periodo: fin no se incluye
function rangoEst(){
  const r = EREF;
  if (EPER === "dia") return { ini: r, fin: sumaDias(r, 1) };
  if (EPER === "semana") { const lun = sumaDias(r, -((new Date(r + "T00:00:00Z").getUTCDay() + 6) % 7)); return { ini: lun, fin: sumaDias(lun, 7) }; }
  if (EPER === "mes") { const ini = r.slice(0, 7) + "-01"; return { ini, fin: sumaMeses(ini, 1) }; }
  const y = Number(r.slice(0, 4)); return { ini: y + "-01-01", fin: (y + 1) + "-01-01" };
}

function textoRango(){
  const { ini, fin } = rangoEst(), f = (s, o) => new Date(s + "T00:00:00Z").toLocaleDateString("es-PE", { timeZone: "UTC", ...o });
  if (EPER === "dia") return f(ini, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (EPER === "semana") return "Semana del " + f(ini, { day: "numeric", month: "short" }) + " al " + f(sumaDias(fin, -1), { day: "numeric", month: "short", year: "numeric" });
  if (EPER === "mes") return f(ini, { month: "long", year: "numeric" });
  return "Año " + ini.slice(0, 4);
}

function pintarControlesEst(){
  if (!$("e-per-box")) {
    const viejo = $("e-mes").parentElement;
    viejo.classList.add("hide");
    const box = document.createElement("div");
    box.id = "e-per-box";
    box.innerHTML = `<label>Periodo</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${[["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"], ["anio", "Año"]].map(([k, t]) => `<button id="e-p-${k}" onclick="estPeriodo('${k}')">${t}</button>`).join("")}
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:8px">
        <button onclick="estMover(-1)" aria-label="Anterior">‹</button>
        <input id="e-fecha" onchange="estIrA(this.value)">
        <button onclick="estMover(1)" aria-label="Siguiente">›</button>
      </div>
      <small class="gr" id="e-rango" style="display:block;margin-top:4px"></small>`;
    viejo.parentElement.prepend(box);
  }
  ["dia", "semana", "mes", "anio"].forEach(k => $("e-p-" + k).classList.toggle("pri", k === EPER));
  const c = $("e-fecha");
  c.type = EPER === "dia" ? "date" : EPER === "semana" ? (SEMANA_OK ? "week" : "date") : EPER === "mes" ? "month" : "number";
  if (EPER === "anio") { c.min = 2020; c.max = 2100; c.step = 1; }
  c.value = EPER === "dia" ? EREF : EPER === "semana" ? (SEMANA_OK ? semanaISO(new Date(EREF + "T12:00:00")) : EREF) : EPER === "mes" ? EREF.slice(0, 7) : EREF.slice(0, 4);
  $("e-rango").textContent = textoRango();
}

function estPeriodo(p){ EPER = p === "anio" ? "anio" : p; cargarEstadisticas(); }

function estMover(n){
  const hoy = hoyLimaEst();
  let nuevo = EPER === "dia" ? sumaDias(EREF, n) : EPER === "semana" ? sumaDias(EREF, 7 * n)
    : EPER === "mes" ? sumaMeses(EREF, n) : (Number(EREF.slice(0, 4)) + n) + "-01-01";
  if (nuevo > hoy && rangoDe(nuevo).ini > hoy) return;   // no se avanza más allá de hoy
  EREF = nuevo; cargarEstadisticas();
}
function rangoDe(ref){ const a = EREF; EREF = ref; const r = rangoEst(); EREF = a; return r; }

function estIrA(v){
  if (!v) return;
  EREF = EPER === "dia" ? v : EPER === "semana" ? (v.includes("W") ? lunesDeSemana(v) : v) : EPER === "mes" ? v + "-01" : v + "-01-01";
  if (EREF > hoyLimaEst() && rangoEst().ini > hoyLimaEst()) EREF = hoyLimaEst();
  cargarEstadisticas();
}

// Día y hora (hora de Lima) de una fecha guardada con zona horaria
function partesLima(f){
  const p = {};
  new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date(f)).forEach(x => p[x.type] = x.value);
  return { ymd: `${p.year}-${p.month}-${p.day}`, hora: (Number(p.hour) % 24) + Number(p.minute) / 60 };
}

// Convierte las filas de la base de datos en los datos de los gráficos según el periodo
function prepararEstadisticas(ventas, gastos){
  const { ini, fin } = rangoEst();
  const dias = Math.round((Date.UTC(+fin.slice(0, 4), +fin.slice(5, 7) - 1, +fin.slice(8, 10)) - Date.UTC(+ini.slice(0, 4), +ini.slice(5, 7) - 1, +ini.slice(8, 10))) / 864e5);
  const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const n = EPER === "dia" ? 24 : EPER === "semana" ? 7 : EPER === "mes" ? dias : 12;
  const labels = EPER === "dia" ? Array.from({ length: 24 }, (_, i) => i + "h")
    : EPER === "semana" ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    : EPER === "mes" ? Array.from({ length: n }, (_, i) => String(i + 1)) : MESES;
  const desde = ymd => Math.round((Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) - Date.UTC(+ini.slice(0, 4), +ini.slice(5, 7) - 1, +ini.slice(8, 10))) / 864e5);
  const idx = (ymd, hora) => EPER === "dia" ? Math.floor(hora) : EPER === "semana" ? desde(ymd) : EPER === "mes" ? +ymd.slice(8, 10) - 1 : +ymd.slice(5, 7) - 1;

  const v = Array(n).fill(0), g = Array(n).fill(0), puntos = [], cats = {};
  let totalV = 0, totalG = 0, nV = 0;
  ventas.filter(x => !x.anulada).forEach(x => {
    const t = Number(x.total), q = partesLima(x.fecha), i = idx(q.ymd, q.hora);
    if (i >= 0 && i < n) v[i] += t;
    totalV += t; nV++;
    puntos.push({ x: Math.round(q.hora * 100) / 100, y: t });
  });
  gastos.forEach(x => {
    const t = Number(x.monto), ymd = String(x.fecha).slice(0, 10);
    if (EPER !== "dia") { const i = idx(ymd, 0); if (i >= 0 && i < n) g[i] += t; }
    totalG += t;
    cats[x.categoria || "Otros"] = (cats[x.categoria || "Otros"] || 0) + t;
  });
  const r = a => a.map(x => Math.round(x * 100) / 100);
  const ejeX = { dia: "Hora del día", semana: "Día de la semana", mes: "Día del mes", anio: "Mes" }[EPER];
  const titulo = { dia: "Ventas por hora", semana: "Ventas y gastos por día", mes: "Ventas y gastos por día", anio: "Ventas y gastos por mes" }[EPER];
  return {
    labels, v: r(v), g: r(g), ejeX, titulo, puntos,
    cats: Object.entries(cats).sort((a, b) => b[1] - a[1]),
    totalV, totalG, util: totalV - totalG, nV, promedio: nV ? totalV / nV : 0,
  };
}

async function estFilas(consulta){
  let todo = [], desde = 0;
  for (;;) {
    const { data, error } = await consulta().range(desde, desde + 999);
    if (error) throw error;
    todo = todo.concat(data);
    if (data.length < 1000) return todo;
    desde += 1000;
  }
}

// Qué negocios se suman: la sede elegida o todas
function estIds(){
  const v = $("e-sede") ? $("e-sede").value : "";
  if (!v || SEDES.length < 2) return [NEG.id];
  return v === "todas" ? SEDES.map(s => s.id) : [v];
}

function pintarSelectorEst(){
  const box = $("e-sede-box"), sel = $("e-sede"); if (!box) return;
  const hay = SEDES.length > 1;
  box.classList.toggle("hide", !hay);
  if (!hay) return;
  const previo = sel.value;
  sel.innerHTML = `<option value="todas">Todas las sedes</option>` +
    SEDES.map(s => `<option value="${s.id}">${esc(s.nombre)}${s.principal ? " (principal)" : ""}</option>`).join("");
  sel.value = [...sel.options].some(o => o.value === previo) ? previo : NEG.id;
}

function resumenPorSede(ventas, gastos){
  const box = $("e-por-sede"); if (!box) return;
  const ids = estIds();
  if (ids.length < 2) { box.classList.add("hide"); return; }
  const m = {}; ids.forEach(id => m[id] = { v: 0, g: 0, n: 0 });
  ventas.filter(v => !v.anulada).forEach(v => { const x = m[v.negocio_id]; if (x) { x.v += Number(v.total); x.n++; } });
  gastos.forEach(g => { const x = m[g.negocio_id]; if (x) x.g += Number(g.monto); });
  box.innerHTML = `<b>Resumen por sede</b><table class="tabla-sedes"><tr><th>Sede</th><th>Ventas</th><th>Gastos</th><th>Neto</th><th>N.º</th></tr>` +
    ids.map(id => { const s = SEDES.find(x => x.id === id), x = m[id];
      return `<tr><td>${esc(s ? s.nombre : "Sede")}</td><td>${sol(x.v)}</td><td>${sol(x.g)}</td><td>${sol(x.v - x.g)}</td><td>${x.n}</td></tr>`; }).join("") + `</table>`;
  box.classList.remove("hide");
}

async function cargarEstadisticas(){
  const msg = $("e-msg"); msg.textContent = "";
  pintarSelectorEst();
  pintarControlesEst();
  if (typeof Chart === "undefined") return msg.textContent = "No se pudo cargar la librería de gráficos. Revisa tu conexión.";
  const { ini, fin } = rangoEst();
  try {
    const ids = estIds();
    const ventas = await estFilas(() => sb.from("ventas").select("negocio_id,fecha,total,anulada").in("negocio_id", ids)
      .gte("fecha", ini + "T00:00:00-05:00").lt("fecha", fin + "T00:00:00-05:00").order("fecha"));
    const gastos = await estFilas(() => sb.from("gastos").select("negocio_id,fecha,categoria,monto").in("negocio_id", ids)
      .gte("fecha", ini).lt("fecha", fin).order("fecha"));
    EST = prepararEstadisticas(ventas, gastos);
    resumenPorSede(ventas, gastos);
  } catch (e) { return msg.textContent = "No se pudieron cargar los datos: " + e.message; }
  $("e-k-ventas").textContent = sol(EST.totalV);
  $("e-k-gastos").textContent = sol(EST.totalG);
  $("e-k-util").textContent = sol(EST.util);
  $("e-k-util").style.color = EST.util < 0 ? "#ef4444" : "#10b981";
  $("e-k-n").textContent = EST.nV;
  $("e-k-ticket").textContent = sol(EST.promedio);
  dibujarEstadisticas();
  cargarEstRopa();
}

function graficar(id, config){
  if (GRAFICOS[id]) GRAFICOS[id].destroy();
  GRAFICOS[id] = new Chart($(id), config);
}

function dibujarEstadisticas(){
  if (!EST || typeof Chart === "undefined") return;
  const css = getComputedStyle(document.documentElement);
  const gr = css.getPropertyValue("--gr").trim() || "#64748b", bd = css.getPropertyValue("--bd").trim() || "#dbe4f3";
  Chart.defaults.color = gr; Chart.defaults.borderColor = bd; Chart.defaults.font.family = "inherit";
  const eje = { beginAtZero: true, ticks: { callback: v => "S/ " + v } };

  // título del gráfico principal según el periodo
  const tarjeta = $("g-linea").closest(".card");
  const t = tarjeta && [...tarjeta.children].find(e => /Ventas/.test(e.textContent));
  if (t) t.textContent = EST.titulo;

  const linea = EPER === "mes";
  const dsV = { label: "Ventas", data: EST.v, borderColor: EST_COLORES[0], backgroundColor: linea ? "rgba(47,109,246,.15)" : EST_COLORES[0], fill: linea, tension: .3, pointRadius: 3, borderRadius: linea ? 0 : 4 };
  const dsG = { label: "Gastos", data: EST.g, borderColor: EST_COLORES[3], backgroundColor: linea ? "rgba(239,68,68,.10)" : EST_COLORES[3], fill: linea, tension: .3, pointRadius: 3, borderRadius: linea ? 0 : 4 };
  const prefijo = { dia: "Hora ", mes: "Día " }[EPER] || "";
  graficar("g-linea", {
    type: linea ? "line" : "bar",
    data: { labels: EST.labels, datasets: EPER === "dia" ? [dsV] : [dsV, dsG] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { title: i => prefijo + i[0].label, label: c => c.dataset.label + ": " + sol(c.parsed.y) } } },
      scales: { y: eje, x: { title: { display: true, text: EST.ejeX } } } },
  });

  const hayGastos = EST.cats.length > 0;
  $("g-pie").parentElement.classList.toggle("hide", !hayGastos);
  $("g-pie-vacio").classList.toggle("hide", hayGastos);
  if (hayGastos) graficar("g-pie", {
    type: "doughnut",
    data: { labels: EST.cats.map(c => c[0]), datasets: [{ data: EST.cats.map(c => Math.round(c[1] * 100) / 100), backgroundColor: EST_COLORES, borderWidth: 2, borderColor: css.getPropertyValue("--bd").trim() || "#fff" }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "55%",
      plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: c => c.label + ": " + sol(c.parsed) + " (" + Math.round(c.parsed / EST.totalG * 100) + " %)" } } } },
  });

  const hayVentas = EST.puntos.length > 0;
  $("g-puntos").parentElement.classList.toggle("hide", !hayVentas);
  $("g-puntos-vacio").classList.toggle("hide", hayVentas);
  if (hayVentas) graficar("g-puntos", {
    type: "scatter",
    data: { datasets: [{ label: "Venta", data: EST.puntos, backgroundColor: "rgba(47,109,246,.65)", pointRadius: 5, pointHoverRadius: 7 }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => {
        const h = Math.floor(c.parsed.x), mi = Math.round((c.parsed.x - h) * 60);
        return String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0") + " · " + sol(c.parsed.y); } } } },
      scales: { x: { min: 0, max: 24, ticks: { stepSize: 3, callback: v => v + ":00" }, title: { display: true, text: "Hora del día" } }, y: eje } },
  });
}

// Si cambias entre modo claro y oscuro, los gráficos se vuelven a dibujar con los colores nuevos
new MutationObserver(dibujarEstadisticas).observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });