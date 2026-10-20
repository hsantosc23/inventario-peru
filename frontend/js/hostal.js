// Panel de hotel: habitaciones, ingresos y huéspedes

let HABS = [], ESTS = [], HUES = [], SEL = null;
const MODS = { hora: "Por hora", noche: "Por noche", dia_completo: "Día completo" };
const fmt = d => new Date(d).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const aLocal = d => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function iniciarHotel(){
  const mods = NEG.modalidades && NEG.modalidades.length ? NEG.modalidades : Object.keys(MODS);
  $("h-mod").innerHTML = mods.map(m => `<option value="${m}">${MODS[m] || m}</option>`).join("");
  if (!$("h-huespedes").children.length) addHuesped();
  cargarHotel().then(calcSalida);
}

async function cargarHotel(){
  const [h, e] = await Promise.all([
    sb.from("habitaciones").select("*"),
    sb.from("estancias").select("*").is("salida_real", null)
  ]);
  if (h.error || e.error) return $("h-msg").textContent = "No se pudo cargar: " + (h.error || e.error).message;
  HABS = h.data.sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
  ESTS = e.data;
  const ids = ESTS.map(x => x.id);
  HUES = ids.length ? (await sb.from("huespedes").select("*").in("estancia_id", ids)).data || [] : [];
  pintarHotel();
}

function pintarHotel(){
  const act = Object.fromEntries(ESTS.map(e => [e.habitacion_id, e]));
  $("h-config").classList.toggle("hide", !(PUEDE && !HABS.length));
  $("h-form").classList.toggle("hide", !(PUEDE && HABS.length));
  $("h-resumen").textContent = HABS.length
    ? ESTS.length + " de " + HABS.length + " habitaciones ocupadas" : "Aún no hay habitaciones creadas.";
  $("h-cuartos").innerHTML = HABS.map(h => {
    const e = act[h.id], g = e ? HUES.filter(x => x.estancia_id === e.id) : [];
    const venc = e && e.salida_prevista && new Date(e.salida_prevista) < new Date();
    return `<div class="cuarto${e ? " ocupado" : ""}${venc ? " venc" : ""}${SEL === h.id ? " sel" : ""}" onclick="selCuarto('${h.id}')">
      <b>${esc(h.numero)}</b><small>${e ? esc(g.map(x => x.nombre.split(" ")[0]).join(", ")) + (venc ? " · tiempo vencido" : "") : "Libre"}</small></div>`;
  }).join("");
  const cur = $("h-hab").value, libres = HABS.filter(h => !act[h.id]);
  $("h-hab").innerHTML = libres.map(h => `<option value="${h.id}">${esc(h.numero)}</option>`).join("")
    || "<option value=''>Sin habitaciones libres</option>";
  if (libres.some(h => h.id === cur)) $("h-hab").value = cur;
  if (SEL && act[SEL]) detalle(SEL); else $("h-detalle").classList.add("hide");
}

function selCuarto(id){
  const ocupada = ESTS.some(e => e.habitacion_id === id);
  SEL = id;
  if (!ocupada && PUEDE) $("h-hab").value = id;
  pintarHotel();
  if (!ocupada) calcSalida();
}

function detalle(id){
  const h = HABS.find(x => x.id === id), e = ESTS.find(x => x.habitacion_id === id);
  const g = HUES.filter(x => x.estancia_id === e.id);
  $("h-detalle").classList.remove("hide");
  $("h-detalle").innerHTML = `<b>Habitación ${esc(h.numero)}</b>
    <p>${MODS[e.modalidad]} · S/ ${Number(e.precio).toFixed(2)}<br>Ingreso: ${fmt(e.ingreso)}<br>
    Salida prevista: ${e.salida_prevista ? fmt(e.salida_prevista) : "-"}</p>
    ${g.map(x => `<div>${esc(x.nombre)} · ${esc(x.documento_tipo || "")} ${esc(x.documento_numero || "")}</div>`).join("")}
    ${PUEDE ? `<button class="pri full" onclick="salida('${e.id}')">Registrar salida (check-out)</button>` : ""}`;
}

function calcSalida(){
  const m = $("h-mod").value, ahora = new Date();
  $("h-horas-box").classList.toggle("hide", m !== "hora");
  const horas = parseInt($("h-horas").value, 10) || 1;
  let s;
  if (m === "hora") s = new Date(+ahora + horas * 3600000);
  else if (m === "noche") { s = new Date(ahora); s.setDate(s.getDate() + 1); s.setHours(12, 0, 0, 0); }
  else s = new Date(+ahora + 86400000);
  $("h-salida").value = aLocal(s);
  const h = HABS.find(x => x.id === $("h-hab").value);
  if (h) {
    const base = m === "hora" ? h.precio_hora : m === "noche" ? h.precio_noche : h.precio_dia;
    $("h-precio").value = base != null ? (base * (m === "hora" ? horas : 1)).toFixed(2) : "";
  }
}

function addHuesped(){
  const d = document.createElement("div");
  d.className = "hues";
  d.innerHTML = `<input type="text" class="hn" placeholder="Nombre completo">
    <select class="ht"><option>DNI</option><option>CE</option><option>PASAPORTE</option></select>
    <input type="text" class="hd" placeholder="N.º de documento">`;
  $("h-huespedes").appendChild(d);
}

async function registrarIngreso(){
  const msg = $("h-msg"); msg.textContent = "";
  const hab = $("h-hab").value, mod = $("h-mod").value, sal = $("h-salida").value, precio = parseFloat($("h-precio").value);
  const gs = [...document.querySelectorAll("#h-huespedes .hues")].map(d => ({
    nombre: d.querySelector(".hn").value.trim(),
    documento_tipo: d.querySelector(".ht").value,
    documento_numero: d.querySelector(".hd").value.trim() }));
  if (!hab) return msg.textContent = "Elige una habitación libre.";
  if (gs.some(g => !g.nombre || !g.documento_numero)) return msg.textContent = "Completa el nombre y el documento de cada huésped.";
  if (gs.some(g => g.documento_tipo === "DNI" && !/^[0-9]{8}$/.test(g.documento_numero))) return msg.textContent = "El DNI debe tener 8 dígitos.";
  if (isNaN(precio) || precio < 0) return msg.textContent = "Escribe el precio.";
  const { data: e, error } = await sb.from("estancias").insert({
    negocio_id: NEG.id, habitacion_id: hab, modalidad: mod, precio,
    salida_prevista: sal ? new Date(sal).toISOString() : null }).select().single();
  if (error) return msg.textContent = error.code === "23505" ? "Esa habitación ya está ocupada." : "No se pudo registrar: " + error.message;
  const { error: e2 } = await sb.from("huespedes").insert(gs.map(g => ({ ...g, negocio_id: NEG.id, estancia_id: e.id })));
  if (e2) { await sb.from("estancias").delete().eq("id", e.id); return msg.textContent = "No se pudo guardar a los huéspedes: " + e2.message; }
  $("h-huespedes").innerHTML = ""; addHuesped(); SEL = null;
  await cargarHotel(); calcSalida();
}

async function salida(id){
  if (!confirm("¿Registrar la salida y liberar la habitación?")) return;
  const { error } = await sb.from("estancias").update({ salida_real: new Date().toISOString() }).eq("id", id);
  if (error) return $("h-msg").textContent = "No se pudo registrar la salida: " + error.message;
  SEL = null;
  await cargarHotel(); calcSalida();
}

async function crearHabitaciones(){
  const msg = $("c-msg"); msg.textContent = "";
  const pisos = parseInt($("c-pisos").value, 10), por = parseInt($("c-por").value, 10);
  const num = id => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
  if (!(pisos >= 1 && pisos <= 20 && por >= 1 && por <= 50)) return msg.textContent = "Pisos: de 1 a 20. Habitaciones por piso: de 1 a 50.";
  const filas = [];
  for (let p = 1; p <= pisos; p++) for (let n = 1; n <= por; n++)
    filas.push({ negocio_id: NEG.id, piso: p, numero: String(p * 100 + n),
      precio_hora: num("c-hora"), precio_noche: num("c-noche"), precio_dia: num("c-dia") });
  const { error } = await sb.from("habitaciones").insert(filas);
  if (error) return msg.textContent = "No se pudieron crear: " + error.message;
  await cargarHotel(); calcSalida();
}