// estadisticas.js — panel de estadísticas con Chart.js (ventas, gastos, circular, líneas y puntos)
let EST = null, GRAFICOS = {};
const EST_COLORES = ["#2f6df6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
const sol = n => "S/ " + Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Día y hora (hora de Lima) de una fecha guardada con zona horaria
function partesLima(f){
  const p = {};
  new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date(f)).forEach(x => p[x.type] = x.value);
  return { dia: Number(p.day), hora: (Number(p.hour) % 24) + Number(p.minute) / 60 };
}

// Convierte las filas de la base de datos en los datos de los gráficos (mes = "AAAA-MM")
function prepararEstadisticas(ventas, gastos, mes){
  const [y, m] = mes.split("-").map(Number), dias = new Date(y, m, 0).getDate();
  const vDia = Array(dias).fill(0), gDia = Array(dias).fill(0), puntos = [], cats = {};
  let totalV = 0, totalG = 0, nV = 0;
  ventas.filter(v => !v.anulada).forEach(v => {
    const t = Number(v.total), q = partesLima(v.fecha);
    vDia[q.dia - 1] += t; totalV += t; nV++;
    puntos.push({ x: Math.round(q.hora * 100) / 100, y: t });
  });
  gastos.forEach(g => {
    const t = Number(g.monto);
    gDia[Number(String(g.fecha).slice(8, 10)) - 1] += t; totalG += t;
    cats[g.categoria || "Otros"] = (cats[g.categoria || "Otros"] || 0) + t;
  });
  const r = a => a.map(x => Math.round(x * 100) / 100);
  return {
    dias, vDia: r(vDia), gDia: r(gDia), puntos,
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
  if (typeof Chart === "undefined") return msg.textContent = "No se pudo cargar la librería de gráficos. Revisa tu conexión.";
  const campo = $("e-mes");
  if (!campo.value) campo.value = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 7);
  const mes = campo.value, [y, m] = mes.split("-").map(Number);
  const ini = mes + "-01", sig = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  try {
        const ids = estIds();
    const ventas = await estFilas(() => sb.from("ventas").select("negocio_id,fecha,total,anulada").in("negocio_id", ids)
      .gte("fecha", ini + "T00:00:00-05:00").lt("fecha", sig + "T00:00:00-05:00").order("fecha"));
    const gastos = await estFilas(() => sb.from("gastos").select("negocio_id,fecha,categoria,monto").in("negocio_id", ids)
      .gte("fecha", ini).lt("fecha", sig).order("fecha"));
    EST = prepararEstadisticas(ventas, gastos, mes);
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

  graficar("g-linea", {
    type: "line",
    data: {
      labels: Array.from({ length: EST.dias }, (_, i) => i + 1),
      datasets: [
        { label: "Ventas", data: EST.vDia, borderColor: EST_COLORES[0], backgroundColor: "rgba(47,109,246,.15)", fill: true, tension: .3, pointRadius: 3 },
        { label: "Gastos", data: EST.gDia, borderColor: EST_COLORES[3], backgroundColor: "rgba(239,68,68,.10)", fill: true, tension: .3, pointRadius: 3 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { title: i => "Día " + i[0].label, label: c => c.dataset.label + ": " + sol(c.parsed.y) } } },
      scales: { y: eje, x: { title: { display: true, text: "Día del mes" } } } },
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
