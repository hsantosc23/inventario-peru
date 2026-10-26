// Cierre de caja: resumen del día, efectivo esperado vs contado e historial
let CIERRES = [], CAJA = null;

const hoyLima = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
const diaSig = f => { const d = new Date(f + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
const num = id => parseFloat($(id).value) || 0;
const r2 = n => Math.round(n * 100) / 100;

async function cargarCaja(){
  if (!$("ca-fecha").value) $("ca-fecha").value = hoyLima();
  await cargarCierres();
  await calcularCaja();
}

async function cargarCierres(){
  const { data } = await sb.from("cierres_caja").select("*").eq("negocio_id", NEG.id).order("fecha", { ascending: false }).limit(60);
  CIERRES = data || [];
  $("ca-hist").innerHTML = CIERRES.length ? CIERRES.map(c => {
    const tot = Number(c.ventas_efectivo) + Number(c.ventas_yape) + Number(c.ventas_tarjeta) + Number(c.ventas_transf);
    const d = Number(c.diferencia), ok = Math.abs(d) < 0.005;
    return `<div class="pend"><div class="pend-top"><b>${c.fecha.split("-").reverse().join("/")}</b>
      <span class="chip ${ok ? "ok" : "pen"}">${ok ? "Cuadra" : (d > 0 ? "Sobra " : "Falta ") + sol(Math.abs(d))}</span></div>
      <div class="pend-nums">Ventas ${sol(tot)} (${c.n_ventas}) · Gastos ${sol(c.gastos)} · Contado ${sol(c.contado)}</div>
      ${c.observacion ? `<small class="gr">${esc(c.observacion)}</small><br>` : ""}
      <button onclick="verCierre('${c.fecha}')">Ver</button><button onclick="imprimirCierre('${c.id}')">Imprimir</button></div>`;
  }).join("") : `<p class="gr">Aún no has cerrado ninguna caja.</p>`;
}

function verCierre(f){ $("ca-fecha").value = f; cargarCaja(); window.scrollTo(0, 0); }

async function calcularCaja(){
  const msg = $("ca-msg"); msg.style.color = ""; msg.textContent = "";
  const f = $("ca-fecha").value || hoyLima(), ini = f + "T00:00:00-05:00", fin = diaSig(f) + "T00:00:00-05:00";
  try {
    const ventas = await estFilas(() => sb.from("ventas").select("total,anulada,medio_pago,cobrado_antes,ajustes").eq("negocio_id", NEG.id).gte("fecha", ini).lt("fecha", fin));
    const gastos = await estFilas(() => sb.from("gastos").select("monto").eq("negocio_id", NEG.id).eq("fecha", f));
    const { data: pp } = await sb.from("pagos_pendientes").select("abonos,convertido_en,devuelto_en,devuelto_monto").eq("negocio_id", NEG.id)
      .or(`estado.eq.pendiente,pagado_en.gte.${ini},devuelto_en.gte.${ini}`);
    const { data: conAj } = await sb.from("ventas").select("anulada,ajustes").eq("negocio_id", NEG.id).not("ajustes", "is", null).limit(2000);
    const medios = { efectivo: 0, yape_plin: 0, tarjeta: 0, transferencia: 0 };
    const t0 = new Date(ini).getTime(), t1 = new Date(fin).getTime(), enDia = x => { const t = new Date(x).getTime(); return t >= t0 && t < t1; };
    let n = 0, anul = 0;
    // de una venta solo cuenta lo cobrado ese día: sin lo ya cobrado antes ni las diferencias de cambios (esas entran el día del cambio)
    ventas.forEach(v => {
      if (v.anulada) { anul++; return; }
      n++;
      const aj = (v.ajustes || []).reduce((s, a) => s + Number(a.monto), 0);
      medios[v.medio_pago] = (medios[v.medio_pago] || 0) + Number(v.total) - Number(v.cobrado_antes || 0) - aj;
    });
    (conAj || []).forEach(v => { if (!v.anulada) (v.ajustes || []).forEach(a => { if (enDia(a.fecha)) medios[a.medio] = (medios[a.medio] || 0) + Number(a.monto); }); });
    let cobros = 0, devol = 0;
    (pp || []).forEach(p => {
      if (p.devuelto_en && enDia(p.devuelto_en)) devol += Number(p.devuelto_monto || 0);
      if (p.convertido_en && enDia(p.convertido_en)) return;   // se completó hoy: ya está en la venta
      (p.abonos || []).forEach(a => { if (enDia(a.fecha)) cobros += Number(a.monto); });
    });
    CAJA = { fecha: f, n, anul, medios, cobros: r2(cobros), devol: r2(devol), gastos: r2(gastos.reduce((s, g) => s + Number(g.monto), 0)) };
  } catch (e) { return msg.textContent = "No se pudieron cargar los datos: " + e.message; }

  const ya = CIERRES.find(c => c.fecha === f);
  if (ya) {
    $("ca-apertura").value = ya.apertura; $("ca-contado").value = ya.contado; $("ca-retiro").value = ya.retiro || ""; $("ca-obs").value = ya.observacion || "";
    msg.textContent = "Ya cerraste la caja de esta fecha. Si guardas de nuevo, se actualiza el cierre.";
  } else {
    const prev = CIERRES.filter(c => c.fecha < f).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    $("ca-apertura").value = prev ? r2(Number(prev.contado) - Number(prev.retiro)) : "";
    $("ca-contado").value = ""; $("ca-retiro").value = ""; $("ca-obs").value = "";
  }
  pintarCaja();
}

function calculosCaja(){
  const ap = num("ca-apertura"), ret = num("ca-retiro"), vacio = $("ca-contado").value === "", ct = num("ca-contado");
  const esperado = r2(ap + CAJA.medios.efectivo + CAJA.cobros - CAJA.devol - CAJA.gastos);
  return { ap, ret, ct, vacio, esperado, dif: vacio ? null : r2(ct - esperado) };
}

function pintarCaja(){
  if (!CAJA) return;
  const c = calculosCaja(), m = CAJA.medios;
  const L = (t, v, extra = "") => `<div class="caja-linea ${extra}"><span>${t}</span><b>${v}</b></div>`;
  const totalVentas = m.efectivo + m.yape_plin + m.tarjeta + m.transferencia;
  let dif = "";
  if (c.dif !== null) {
    const ok = Math.abs(c.dif) < 0.005;
    dif = L(ok ? "Diferencia" : c.dif > 0 ? "Sobra" : "Falta", ok ? "Cuadra" : sol(Math.abs(c.dif)), ok ? "ok" : "mal")
        + L("Queda en caja para mañana", sol(Math.max(0, c.ct - c.ret)));
  }
  $("ca-resumen").innerHTML =
    L(`Ventas (${CAJA.n}${CAJA.anul ? ", " + CAJA.anul + " anuladas" : ""})`, sol(totalVentas), "fuerte") +
    L("· Efectivo", sol(m.efectivo)) + L("· Yape / Plin", sol(m.yape_plin)) +
    L("· Tarjeta", sol(m.tarjeta)) + L("· Transferencia", sol(m.transferencia)) +
    L("Cobros de pagos pendientes", sol(CAJA.cobros)) +
    L("Devoluciones de separados", "− " + sol(CAJA.devol)) +
    L("Gastos del día", "− " + sol(CAJA.gastos)) +
    L("Fondo inicial", sol(c.ap)) +
    L("Efectivo esperado en caja", sol(c.esperado), "fuerte") + dif;
}

async function cerrarCaja(){
  const msg = $("ca-msg"); msg.style.color = ""; msg.textContent = "";
  if (!CAJA) return;
  const c = calculosCaja();
  if (c.vacio) return msg.textContent = "Escribe el efectivo que contaste en caja.";
  if (c.ap < 0 || c.ct < 0 || c.ret < 0) return msg.textContent = "Los montos no pueden ser negativos.";
  if (c.ret > c.ct) return msg.textContent = "El retiro no puede ser mayor al efectivo contado.";
  const ya = CIERRES.find(x => x.fecha === CAJA.fecha);
  if (ya && !confirm("Ya cerraste la caja de esta fecha. ¿Actualizar el cierre?")) return;
  const m = CAJA.medios;
  const { error } = await sb.from("cierres_caja").upsert({
    negocio_id: NEG.id, fecha: CAJA.fecha, apertura: c.ap,
    ventas_efectivo: r2(m.efectivo), ventas_yape: r2(m.yape_plin), ventas_tarjeta: r2(m.tarjeta), ventas_transf: r2(m.transferencia),
    cobros_pendientes: CAJA.cobros, gastos: CAJA.gastos, esperado: c.esperado, contado: c.ct, diferencia: c.dif, retiro: c.ret,
    n_ventas: CAJA.n, n_anuladas: CAJA.anul, observacion: $("ca-obs").value.trim() || null,
  }, { onConflict: "negocio_id,fecha" });
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  await cargarCierres();
  msg.style.color = "#166534"; msg.textContent = "Caja cerrada.";
  const nuevo = CIERRES.find(x => x.fecha === CAJA.fecha);
  if (nuevo && confirm("Caja cerrada. ¿Imprimir el cierre?")) imprimirCierre(nuevo.id);
}

function imprimirCierre(id){
  const c = CIERRES.find(x => x.id === id); if (!c) return;
  const L = (t, v) => `<div style="display:flex;justify-content:space-between"><span>${t}</span><b>${v}</b></div>`;
  const tot = Number(c.ventas_efectivo) + Number(c.ventas_yape) + Number(c.ventas_tarjeta) + Number(c.ventas_transf);
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return alert("Permite las ventanas emergentes para imprimir.");
  w.document.write(`<html><head><title>Cierre de caja</title><style>body{font-family:monospace;width:300px;margin:8px auto;font-size:13px}h3{text-align:center;margin:4px 0}hr{border:0;border-top:1px dashed #000}</style></head><body>
    <h3>${esc(NEG.nombre || "")}</h3><h3>CIERRE DE CAJA</h3><div style="text-align:center">${c.fecha.split("-").reverse().join("/")}</div><hr>
    ${L("Ventas (" + c.n_ventas + ")", sol(tot))}${L("· Efectivo", sol(c.ventas_efectivo))}${L("· Yape / Plin", sol(c.ventas_yape))}${L("· Tarjeta", sol(c.ventas_tarjeta))}${L("· Transferencia", sol(c.ventas_transf))}
    ${L("Cobros pendientes", sol(c.cobros_pendientes))}${L("Gastos", "- " + sol(c.gastos))}${L("Fondo inicial", sol(c.apertura))}<hr>
    ${L("Esperado en caja", sol(c.esperado))}${L("Efectivo contado", sol(c.contado))}${L("Diferencia", sol(c.diferencia))}${L("Retiro/depósito", sol(c.retiro))}
    ${c.observacion ? "<hr>" + esc(c.observacion) : ""}<hr><div style="text-align:center">Gestora Perú</div></body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}