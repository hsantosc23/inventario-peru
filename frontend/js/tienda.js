// tienda.js — panel para crear y acomodar la tienda virtual
let TDA = null;
const SECCIONES = {
  portada:   { titulo: "Portada",            ayuda: "Logo, nombre del negocio y botón de WhatsApp" },
  buscador:  { titulo: "Buscador y filtros", ayuda: "Caja de búsqueda y categorías" },
  destacados:{ titulo: "Destacados",         ayuda: "Los productos que marcaste como destacados" },
  catalogo:  { titulo: "Catálogo",           ayuda: "Todos los productos publicados" },
  info:      { titulo: "Información",        ayuda: "Dirección, horario y contacto" }
};
const SEC_DEFECTO = ["portada", "buscador", "destacados", "catalogo", "info"];
const urlTienda = () => location.origin + "/tienda.html?t=" + (TDA ? TDA.slug : "");

// ---------- Pestaña ----------
(function(){
  const tabs = document.querySelector("#inv .tabs"), cont = document.getElementById("t-inv");
  if (!tabs || !cont || document.getElementById("tab-tda")) return;
  const sede = document.getElementById("tab-sede");
  const b = document.createElement("button");
  b.id = "tab-tda"; b.textContent = "Mi tienda"; b.onclick = () => verTab("tda");
  sede ? tabs.insertBefore(b, sede) : tabs.appendChild(b);
  const d = document.createElement("div");
  d.id = "t-tda"; d.className = "hide";
  cont.parentElement.insertBefore(d, cont.nextSibling);
})();

const slugDe = s => String(s || "tienda").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "tienda";

async function cargarTienda(){
  const { data } = await sb.from("tiendas").select("*").eq("negocio_id", NEG.id).maybeSingle();
  TDA = data || null;
  if (TDA && (!TDA.secciones || !TDA.secciones.length)) TDA.secciones = SEC_DEFECTO.map(k => ({ k, on: true }));
  pintarTienda();
}

function pintarTienda(){
  const box = $("t-tda"); if (!box) return;
  if (!TDA) {
    box.innerHTML = `<div class="card" style="max-width:520px;margin:0 auto;text-align:center">
      <h2 style="margin-top:0">Tu tienda virtual</h2>
      <p class="gr">Publica tu catálogo en una página que puedes compartir por WhatsApp, Instagram o Facebook.
      Tus clientes arman su pedido y al tocar Comprar te llega por WhatsApp con los productos y el total.</p>
      <button class="pri full" onclick="crearTienda()">Crear mi tienda virtual</button>
      <div class="msg" id="td-msg"></div></div>`;
    return;
  }
  const lista = TDA.secciones.map((s, i) => `<div class="fila">
      <div style="flex:1;min-width:0"><b>${SECCIONES[s.k] ? SECCIONES[s.k].titulo : s.k}</b>
        <small class="gr" style="display:block">${SECCIONES[s.k] ? SECCIONES[s.k].ayuda : ""}</small></div>
      <button onclick="moverSeccion(${i},-1)" ${i === 0 ? "disabled" : ""} aria-label="Subir">↑</button>
      <button onclick="moverSeccion(${i},1)" ${i === TDA.secciones.length - 1 ? "disabled" : ""} aria-label="Bajar">↓</button>
      <button class="${s.on ? "" : "peligro"}" onclick="verSeccion(${i})">${s.on ? "Visible" : "Oculta"}</button>
    </div>`).join("");

  const listas = ATRS.filter(a => a.tipo === "lista");
  box.innerHTML = `<div class="inv-grid">
    <div class="inv-izq"><div class="card">
      <b>Datos de la tienda</b>
      <label>Nombre que verán tus clientes</label><input type="text" id="td-titulo" maxlength="60" value="${esc(TDA.titulo || "")}">
      <label>Frase corta</label><input type="text" id="td-desc" maxlength="120" value="${esc(TDA.descripcion || "")}" placeholder="Ej.: Ropa para toda ocasión">
      <label>WhatsApp donde recibes los pedidos</label><input type="tel" id="td-wsp" inputmode="numeric" maxlength="9" value="${esc(TDA.whatsapp || "")}" placeholder="987654321">
      <div class="f2">
        <div><label>Dirección</label><input type="text" id="td-dir" maxlength="80" value="${esc(TDA.direccion || "")}"></div>
        <div><label>Horario</label><input type="text" id="td-hor" maxlength="60" value="${esc(TDA.horario || "")}" placeholder="Lun a sáb 10am - 8pm"></div>
      </div>
      <label>Color principal</label><input type="color" id="td-color" value="${esc(TDA.color || "#4f46e5")}" style="height:44px;padding:4px">
      <label>Agrupar por</label>
      <select id="td-cat"><option value="">Sin categorías</option>
        ${listas.map(a => `<option value="${esc(a.clave)}"${TDA.campo_categoria === a.clave ? " selected" : ""}>${esc(a.etiqueta)}</option>`).join("")}</select>
      <label class="opt" style="padding:10px"><input type="checkbox" id="td-agot" ${TDA.mostrar_agotados ? "checked" : ""}> Mostrar también lo que está sin stock</label>
      <label class="opt" style="padding:10px"><input type="checkbox" id="td-act" ${TDA.activa ? "checked" : ""}> Tienda publicada</label>
      <button class="pri full" onclick="guardarTienda()">Guardar cambios</button>
      <div class="msg" id="td-msg"></div>
    </div></div>
    <div class="inv-der">
      <div class="card" style="margin-bottom:12px">
        <b>Enlace de tu tienda</b>
        <input type="text" readonly value="${esc(urlTienda())}" onclick="this.select()" style="margin-top:8px">
        <div style="display:flex;gap:8px;margin-top:8px">
          <button style="flex:1" onclick="copiarTienda()">Copiar</button>
          <button style="flex:1" onclick="window.open(urlTienda(),'_blank')">Ver tienda</button>
          <button class="pri" style="flex:1" onclick="compartirTienda()">Compartir</button>
        </div>
        ${TDA.activa ? "" : `<p class="msg" style="margin-top:8px">La tienda está sin publicar: por ahora solo tú puedes verla.</p>`}
      </div>
      <div class="card" style="margin-bottom:12px">
        <b>Orden de las secciones</b>
        <p class="gr" style="margin:6px 0">Usa las flechas para acomodar cómo se ve tu tienda.</p>
        ${lista}
      </div>
      <div class="card">
        <b>Qué se publica</b>
        <p class="gr" style="margin:6px 0">Marca lo que quieres mostrar y qué va en Destacados.</p>
        <input type="text" id="td-buscar" placeholder="Buscar producto" oninput="listarPubs()">
        <div id="td-prods" style="max-height:50vh;overflow:auto;margin-top:8px"></div>
      </div>
    </div></div>`;
  listarPubs();
}

async function crearTienda(){
  const msg = $("td-msg"); msg.textContent = "Creando...";
  let slug = slugDe(NEG.nombre);
  for (let i = 0; i < 25; i++) {
    const s = i === 0 ? slug : slug + "-" + (i + 1);
    const { data, error } = await sb.from("tiendas").insert({
      negocio_id: NEG.id, slug: s, titulo: NEG.nombre,
      campo_categoria: (ATRS.find(a => a.tipo === "lista") || {}).clave || null,
      secciones: SEC_DEFECTO.map(k => ({ k, on: true }))
    }).select().single();
    if (!error) { TDA = data; return pintarTienda(); }
    if (error.code !== "23505") return msg.textContent = "No se pudo crear: " + error.message;
  }
  msg.textContent = "No se pudo generar un enlace libre. Cambia el nombre de tu negocio e inténtalo de nuevo.";
}

async function guardarTienda(){
  const msg = $("td-msg"); msg.style.color = ""; msg.textContent = "";
  const wsp = $("td-wsp").value.trim();
  if (wsp && !/^[0-9]{9}$/.test(wsp)) return msg.textContent = "El WhatsApp debe tener 9 dígitos.";
  if ($("td-act").checked && !wsp) return msg.textContent = "Pon tu WhatsApp antes de publicar: es por donde te llegan los pedidos.";
  const fila = {
    titulo: $("td-titulo").value.trim() || NEG.nombre, descripcion: $("td-desc").value.trim() || null,
    whatsapp: wsp || null, direccion: $("td-dir").value.trim() || null, horario: $("td-hor").value.trim() || null,
    color: $("td-color").value, campo_categoria: $("td-cat").value || null,
    mostrar_agotados: $("td-agot").checked, activa: $("td-act").checked, secciones: TDA.secciones
  };
  const { data, error } = await sb.from("tiendas").update(fila).eq("id", TDA.id).select().single();
  if (error) return msg.textContent = "No se pudo guardar: " + error.message;
  TDA = data;
  msg.style.color = "#16a34a"; msg.textContent = "Cambios guardados.";
}

function moverSeccion(i, d){
  const a = TDA.secciones, j = i + d;
  if (j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]];
  pintarTienda(); guardarTienda();
}
function verSeccion(i){ TDA.secciones[i].on = !TDA.secciones[i].on; pintarTienda(); guardarTienda(); }

function listarPubs(){
  const q = ($("td-buscar").value || "").trim().toLowerCase();
  const r = PRODS.filter(p => !q || p.codigo.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)).slice(0, 200);
  $("td-prods").innerHTML = r.length ? r.map(p => `<div class="fila">
      <div style="flex:1;min-width:0"><b>${esc(p.codigo)}</b> · ${esc(p.nombre)}
        <small class="gr" style="display:block">S/ ${Number(p.precio).toFixed(2)} · stock ${p.stock}</small></div>
      <button class="${p.en_tienda !== false ? "pri" : ""}" onclick="pubProd('${p.id}','en_tienda')">${p.en_tienda !== false ? "Publicado" : "Oculto"}</button>
      <button class="${p.destacado ? "pri" : ""}" onclick="pubProd('${p.id}','destacado')">★</button>
    </div>`).join("") : `<p class="gr">No hay productos.</p>`;
}

async function pubProd(id, campo){
  const p = PRODS.find(x => x.id === id); if (!p) return;
  const valor = campo === "en_tienda" ? !(p.en_tienda !== false) : !p.destacado;
  const { error } = await sb.from("productos").update({ [campo]: valor }).eq("id", id).eq("negocio_id", NEG.id);
  if (error) return alert("No se pudo cambiar: " + error.message);
  p[campo] = valor;
  listarPubs();
}

function copiarTienda(){
  navigator.clipboard.writeText(urlTienda()).then(() => alert("Enlace copiado."), () => alert(urlTienda()));
}
function compartirTienda(){
  const t = `${TDA.titulo || NEG.nombre} — mira nuestro catálogo y haz tu pedido: ${urlTienda()}`;
  if (navigator.share) navigator.share({ title: TDA.titulo || NEG.nombre, text: t, url: urlTienda() }).catch(() => {});
  else window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank");
}