// tienda-editor.js — editor visual de la tienda virtual. Solo se carga cuando entra el dueño.
(function(){
  "use strict";

  /* ---------- Estilos del editor ---------- */
  const css = `
  .ed-fab{position:fixed;left:16px;bottom:16px;z-index:58;background:#111;color:#fff;border:0;border-radius:999px;padding:12px 20px;font:600 14px Inter,system-ui,sans-serif;box-shadow:0 10px 26px rgba(0,0,0,.28);cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;line-height:1.2}
  .ed-fab[hidden]{display:none}
  .ed-fab small{font-weight:500;font-size:11px;color:#fcd34d}
  .ed{position:fixed;z-index:65;background:#fff;color:#15171a;font:14px/1.4 Inter,system-ui,sans-serif;display:flex;flex-direction:column;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 18px 50px rgba(0,0,0,.22)}
  .ed *{box-sizing:border-box}
  .ed button{font:inherit;cursor:pointer;color:inherit}
  .ed-a{display:flex;align-items:center;gap:8px;padding:16px 14px 10px;position:relative}
  .ed-st{flex:1;font-size:12px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ed-st.err{color:#dc2626}
  .ed-ud{width:38px;height:38px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;font-size:17px}
  .ed-ud:disabled{opacity:.35;cursor:default}
  .ed-ok{background:#111;color:#fff !important;border:0;border-radius:10px;padding:10px 18px;font-weight:600}
  .ed-grip{display:none;position:absolute;top:0;left:50%;transform:translateX(-50%);width:90px;height:16px;border:0;background:none;align-items:center;justify-content:center;padding:0}
  .ed-grip span{width:40px;height:4px;border-radius:4px;background:#d1d5db}
  .ed-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:0 14px 10px;background:#f3f4f6;border-radius:12px;padding:4px}
  .ed-tabs button{border:0;background:none;border-radius:9px;padding:9px 6px;font-weight:600;color:#4b5563}
  .ed-tabs button.on{background:#fff;color:#111;box-shadow:0 1px 3px rgba(0,0,0,.12)}
  .ed-body{flex:1;overflow:auto;padding:2px 14px 28px;overscroll-behavior:contain}
  .ed-tip{color:#6b7280;font-size:13px;margin:2px 0 12px}
  .ed-h{font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:700;color:#6b7280;margin:20px 0 10px}
  .ed-h:first-child{margin-top:4px}
  .ly{display:flex;align-items:center;gap:6px;border:1px solid #e5e7eb;border-radius:12px;padding:6px 8px;margin-bottom:6px;background:#fff;cursor:pointer}
  .ly.on{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
  .ly.off .ly-n{color:#9ca3af;text-decoration:line-through}
  .ly.fx{background:#fafafa}
  .ly-h{touch-action:none;cursor:grab;font-size:20px;line-height:1;color:#9ca3af;padding:8px 8px;border-radius:8px;user-select:none;-webkit-user-select:none}
  .ly-h:active{cursor:grabbing;background:#eff6ff;color:#3b82f6}
  .ly-h0{width:36px;text-align:center;color:#cbd5e1;font-size:12px}
  .ly-n{flex:1;font-weight:500;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ly-v{width:36px;height:36px;border:0;background:none;border-radius:8px;color:#4b5563;display:flex;align-items:center;justify-content:center}
  .ly-v:hover{background:#f3f4f6}
  .ly-v svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .ed-add{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .ed-add button{border:1px dashed #cbd5e1;background:#f9fafb;border-radius:12px;padding:12px 10px;text-align:left;display:flex;flex-direction:column;gap:3px}
  .ed-add button:hover{border-color:#3b82f6;background:#eff6ff}
  .ed-add small{color:#6b7280;font-size:11px;line-height:1.3}
  .f{display:block;margin-bottom:16px}
  .f>span{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:600;margin-bottom:7px;color:#374151}
  .f output{font-weight:500;color:#6b7280}
  .f input:not([type]),.f input[type=text],.f textarea{width:100%;font:inherit;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#111}
  .f input:focus,.f textarea:focus{outline:0;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
  .f textarea{resize:vertical;min-height:84px}
  .f input[type=range]{width:100%;accent-color:#3b82f6;height:28px}
  .cl{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
  .cl input[type=color]{width:42px;height:34px;border:1px solid #e5e7eb;border-radius:8px;padding:2px;background:#fff;cursor:pointer}
  .sw{width:28px;height:28px;border-radius:50%;border:1px solid rgba(0,0,0,.15);padding:0}
  .sw.on{box-shadow:0 0 0 2px #fff,0 0 0 4px #3b82f6}
  .mini{border:1px solid #e5e7eb;background:#fff;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:600}
  .mini.on{background:#111;color:#fff !important;border-color:#111}
  .sg{display:flex;gap:4px;background:#f3f4f6;border-radius:10px;padding:3px}
  .sg button{flex:1;border:0;background:none;border-radius:8px;padding:8px 4px;font-size:12px;font-weight:600;color:#4b5563}
  .sg button.on{background:#fff;color:#111;box-shadow:0 1px 3px rgba(0,0,0,.12)}
  .im{border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
  .im img{width:100%;height:140px;object-fit:cover;display:block}
  .im0{height:92px;display:flex;align-items:center;justify-content:center;color:#9ca3af;background:#f9fafb;font-size:13px}
  .im-b{display:flex;gap:6px;padding:8px}
  .im-b .pri{flex:1;background:#111;color:#fff !important;border:0;border-radius:9px;padding:10px;font-weight:600}
  .ck{display:flex;gap:10px;align-items:center;margin-bottom:16px;font-weight:600;font-size:13px;cursor:pointer}
  .ck input{width:18px;height:18px;accent-color:#3b82f6}
  .bn{display:flex;gap:6px;margin-bottom:6px}
  .f .bn input{font:inherit;padding:9px 10px;border:1px solid #e5e7eb;border-radius:9px;min-width:0;background:#fff;color:#111}
  .f .bn .bn-i{width:56px;text-align:center;flex:none}
  .f .bn .bn-t{width:auto;flex:1}
  .del{width:100%;margin-top:18px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626 !important;border-radius:10px;padding:12px;font-weight:600}
  .ed-cargando{opacity:.6;pointer-events:none}

  body.edit-on #app [data-id],body.edit-on #app [data-fix]{cursor:pointer;outline:2px solid transparent;outline-offset:-2px;transition:outline-color .12s}
  body.edit-on #app [data-id]:hover,body.edit-on #app [data-fix]:hover{outline-color:rgba(59,130,246,.45)}
  body.edit-on #app .sel{outline:2px solid #3b82f6 !important}
  body.edit-on #app .aviso,body.edit-on #app .pie{position:relative}
  body.edit-on #app .oculta{opacity:.42}
  body.edit-on #app{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
  body.edit-on #app img{-webkit-user-drag:none;user-drag:none}
  body.edit-on #app input,body.edit-on #app a{pointer-events:none}
  .selchip{position:absolute;top:8px;left:8px;z-index:30;background:#3b82f6;color:#fff;border-radius:9px;padding:7px 12px;font:600 12px Inter,system-ui,sans-serif;display:flex;gap:8px;align-items:center;box-shadow:0 4px 14px rgba(59,130,246,.4);touch-action:none;cursor:grab;letter-spacing:0;text-transform:none;line-height:1}
  .selchip.fijo{cursor:default}
  .selchip-h{font-size:15px}
  .fotob{position:absolute;left:8px;top:8px;z-index:5;display:flex;gap:6px;align-items:center;background:rgba(17,17,17,.86);color:#fff;border:0;border-radius:999px;padding:8px 12px;font:600 11px Inter,system-ui,sans-serif;cursor:pointer;pointer-events:auto}
  .drg-g{position:fixed;left:0;top:0;z-index:100;background:#111;color:#fff;padding:10px 14px;border-radius:10px;font:600 13px Inter,system-ui,sans-serif;pointer-events:none;box-shadow:0 14px 30px rgba(0,0,0,.3);white-space:nowrap;will-change:transform}
  .drg-l{position:fixed;height:4px;background:#3b82f6;border-radius:4px;z-index:99;pointer-events:none;box-shadow:0 0 0 4px rgba(59,130,246,.2)}
  .drg-l.nulo{opacity:.25}
  .drg-o{opacity:.3 !important}
  .drg-ok{animation:drgok .7s ease}
  @keyframes drgok{0%{box-shadow:inset 0 0 0 4px #22c55e}100%{box-shadow:inset 0 0 0 0 rgba(34,197,94,0)}}
  body.arrastrando,body.arrastrando *{cursor:grabbing !important;-webkit-user-select:none !important;user-select:none !important}

  @media(min-width:1024px){
    .ed{top:0;right:0;bottom:0;width:380px}
    body.edit-on #app{margin-right:380px}
  }
  @media(max-width:1023px){
    .ed{left:0;right:0;bottom:0;height:min(56vh,540px);border-radius:18px 18px 0 0;transition:transform .25s ease}
    .ed.min{transform:translateY(calc(100% - 104px))}
    body.arrastrando .ed{transform:translateY(calc(100% - 46px))}
    .ed-grip{display:flex}
    body.edit-on #app{padding-bottom:min(56vh,540px)}
    .ed input,.ed textarea{font-size:16px !important}
    .ed-add{grid-template-columns:1fr 1fr 1fr}
  }`;
  const est = document.createElement("style");
  est.textContent = css;
  document.head.appendChild(est);

  /* ---------- Estado ---------- */
  const CAMPOS = ["titulo", "color", "whatsapp", "direccion", "horario", "aviso", "hero_titulo", "hero_eyebrow",
    "hero_sub", "hero_cta", "hero_img", "beneficios", "secciones"];
  const SW = ["#ffffff", "#f7f7f5", "#f3ede4", "#fdf2f8", "#eef2ff", "#ecfdf5", "#1f2937", "#111111"];
  const PAD_DEF = { portada: 0, banner: 0, beneficios: 0, imagen: 0, buscador: 40 };
  const OJO = '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OJO_NO = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.6A17 17 0 002 12s3.5 7 10 7a9.7 9.7 0 005.4-1.6"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/></svg>';

  let SEL = null, TAB = "sec", PILA = [], rafaga = false, ultCampo = "", tRafaga = 0, tRaf = 0, tAuto = 0;
  let version = 0, guardando = false, otraVez = false, sucio = false, upDest = null, DRG = null, bloqueoClic = 0;
  let fab = null, panel = null;

  const padDef = k => (PAD_DEF[k] != null ? PAD_DEF[k] : 56);
  const anchoDef = k => (["portada", "banner", "imagen", "beneficios"].includes(k) ? "full" : "box");
  const esMovil = () => matchMedia("(max-width:1023px)").matches;
  const secSel = () => T.secciones.find(s => s.id === SEL) || null;
  const elDe = id => !id ? null : (["aviso", "cabecera", "pie"].includes(id)
    ? document.querySelector(`#app [data-fix="${id}"]`) : document.querySelector(`#secs > [data-id="${id}"]`));
  const nombreSec = s => NOMBRES[s.k] + (["banner", "texto"].includes(s.k) && s.c && s.c.titulo ? ": " + s.c.titulo : "");
  const nombreDe = id => id === "aviso" ? "Barra de aviso" : id === "cabecera" ? "Cabecera" : id === "pie" ? "Pie de página"
    : (s => s ? nombreSec(s) + (s.on ? "" : " (oculta)") : "")(T.secciones.find(x => x.id === id));

  /* ---------- Arranque ---------- */
  fab = document.createElement("button");
  fab.className = "ed-fab";
  fab.innerHTML = `✎ Editar tienda${T.activa ? "" : "<small>Sin publicar · solo tú la ves</small>"}`;
  fab.onclick = entrar;
  document.body.appendChild(fab);

  const app = $("app");
  app.addEventListener("click", clicPagina, true);
  app.addEventListener("pointerdown", presionPagina);
  app.addEventListener("dragstart", e => { if (EDIT) e.preventDefault(); });
  document.addEventListener("contextmenu", e => { if (EDIT && e.target.closest("#app")) e.preventDefault(); });
  document.addEventListener("touchmove", e => { if (DRG && DRG.on) e.preventDefault(); }, { passive: false });
  window.addEventListener("beforeunload", e => { if (EDIT && sucio) { e.preventDefault(); e.returnValue = ""; } });

  function entrar(){
    EDIT = true;
    document.body.classList.add("edit-on");
    fab.hidden = true;
    PILA = []; sucio = false; SEL = null; TAB = "sec";
    crearPanel();
    pintar();
    pintarPanel();
    estado("Toca una sección para editarla.");
  }

  async function salir(){
    if (sucio) { const ok = await guardar(); if (!ok && !confirm("No se pudieron guardar los últimos cambios. ¿Salir de todos modos?")) return; }
    EDIT = false; SEL = null;
    document.body.classList.remove("edit-on");
    if (panel) panel.remove();
    panel = null;
    fab.hidden = false;
    fab.innerHTML = `✎ Editar tienda${T.activa ? "" : "<small>Sin publicar · solo tú la ves</small>"}`;
    pintar();
  }

  /* ---------- Panel ---------- */
  function crearPanel(){
    panel = document.createElement("div");
    panel.className = "ed" + (esMovil() ? " min" : "");
    panel.id = "ed";
    panel.innerHTML = `<div class="ed-a">
        <button class="ed-grip" data-x="min" aria-label="Abrir o cerrar el panel"><span></span></button>
        <span class="ed-st" id="ed-st"></span>
        <button class="ed-ud" data-x="undo" id="ed-undo" title="Deshacer" aria-label="Deshacer">↶</button>
        <button class="ed-ok" data-x="salir">Listo</button>
      </div>
      <div class="ed-tabs"><button data-tab="sec">Secciones</button><button data-tab="prop">Editar</button><button data-tab="gen">Tienda</button></div>
      <div class="ed-body" id="ed-body"></div>
      <input type="file" id="ed-file" accept="image/*" hidden>`;
    document.body.appendChild(panel);
    panel.addEventListener("click", clicPanel);
    panel.addEventListener("input", inputPanel);
    panel.addEventListener("pointerdown", e => { const h = e.target.closest(".ly-h"); if (h) arrastrarLista(e, h); });
    panel.querySelector("#ed-file").addEventListener("change", archivoElegido);
  }

  function abrirPanel(){ if (panel) panel.classList.remove("min"); }
  function togPanel(){ if (panel && esMovil()) panel.classList.toggle("min"); }

  function estado(t, err){
    const e = $("ed-st"); if (!e) return;
    e.textContent = t || ""; e.classList.toggle("err", !!err);
  }

  function pintarPanel(){
    if (!panel) return;
    panel.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === TAB));
    const body = $("ed-body"), y = body.scrollTop;
    body.innerHTML = TAB === "sec" ? pSecciones() : TAB === "gen" ? pTienda() : pEditar();
    body.scrollTop = TAB === "prop" ? y : 0;
    $("ed-undo").disabled = !PILA.length;
  }

  /* ---------- Controles ---------- */
  const v = x => esc(x == null ? "" : x);
  const C = {
    t: (b, l, val, ph) => `<label class="f"><span>${l}</span><input data-b="${b}" value="${v(val)}" placeholder="${v(ph)}"></label>`,
    a: (b, l, val, ph) => `<label class="f"><span>${l}</span><textarea data-b="${b}" rows="4" placeholder="${v(ph)}">${v(val)}</textarea></label>`,
    col: (b, l, val, def) => `<div class="f"><span>${l}</span><div class="cl">
        <input type="color" data-b="${b}" value="${v(val || def)}" title="Elegir otro color">
        ${SW.map(c => `<button class="sw${val === c ? " on" : ""}" data-sw="${b}" data-v="${c}" style="background:${c}" title="${c}" aria-label="Color ${c}"></button>`).join("")}
        <button class="mini${val ? "" : " on"}" data-reset="${b}">Auto</button></div></div>`,
    r: (b, l, val, def, min, max, step, u) => `<label class="f"><span>${l}<output>${val == null ? def : val}${u}</output></span>
        <input type="range" data-b="${b}" data-u="${u}" min="${min}" max="${max}" step="${step}" value="${val == null ? def : val}"></label>`,
    seg: (b, l, val, ops) => `<div class="f"><span>${l}</span><div class="sg">${ops.map(([x, n, st]) =>
        `<button data-seg="${b}" data-v="${x}" class="${String(val == null ? "" : val) === String(x) ? "on" : ""}"${st ? ` style="${st}"` : ""}>${n}</button>`).join("")}</div></div>`,
    img: (b, l, val) => `<div class="f"><span>${l}</span><div class="im">
        ${val ? `<img src="${v(val)}" alt="">` : `<div class="im0">Sin imagen</div>`}
        <div class="im-b"><button class="pri" data-up="${b}">${val ? "Cambiar imagen" : "Subir imagen"}</button>
        ${val ? `<button class="mini" data-quitar="${b}">Quitar</button>` : ""}</div></div></div>`,
    chk: (b, l, val) => `<label class="ck"><input type="checkbox" data-b="${b}" ${val ? "checked" : ""}> ${l}</label>`
  };

  function pSecciones(){
    const fijo = (id, n, extra) => `<div class="ly fx${SEL === id ? " on" : ""}" data-sel="${id}">
        <span class="ly-h0">fijo</span><span class="ly-n">${n}</span>${extra || ""}</div>`;
    return `<p class="ed-tip">Arrastra ⠿ para ordenar. En la página también puedes arrastrar: con el mouse, o en el celular manteniendo presionada la sección.</p>
      ${fijo("aviso", "Barra de aviso", `<button class="ly-v" data-vis-aviso title="${D.aviso_on ? "Ocultar" : "Mostrar"}">${D.aviso_on ? OJO : OJO_NO}</button>`)}
      ${fijo("cabecera", "Cabecera")}
      <div id="ly-lista">${T.secciones.map(s => `<div class="ly${SEL === s.id ? " on" : ""}${s.on ? "" : " off"}" data-sel="${esc(s.id)}">
          <span class="ly-h" title="Arrastrar">⠿</span><span class="ly-n">${esc(nombreSec(s))}</span>
          <button class="ly-v" data-vis="${esc(s.id)}" title="${s.on ? "Ocultar" : "Mostrar"}" aria-label="${s.on ? "Ocultar" : "Mostrar"}">${s.on ? OJO : OJO_NO}</button></div>`).join("")}</div>
      ${fijo("pie", "Pie de página")}
      <div class="ed-h">Agregar sección</div>
      <div class="ed-add">
        <button data-nueva="banner"><b>Banner</b><small>Imagen grande con texto y botón</small></button>
        <button data-nueva="texto"><b>Texto</b><small>Título y párrafo</small></button>
        <button data-nueva="imagen"><b>Imagen</b><small>Una foto a lo ancho</small></button>
      </div>`;
  }

  function pTienda(){
    return `<div class="ed-h">Tu tienda</div>
      ${C.t("t:titulo", "Nombre de la tienda", T.titulo)}
      ${C.img("d:logo", "Logo (si no subes uno, se muestra el nombre)", D.logo)}
      ${C.col("t:color", "Color principal (botones)", T.color, "#c2714f")}
      ${C.seg("d:fuente", "Letra de los títulos", D.fuente || "elegante", [
        ["elegante", "Elegante", "font-family:'Playfair Display',serif"],
        ["moderna", "Moderna", "font-family:Inter,sans-serif"],
        ["clasica", "Clásica", "font-family:'Cormorant Garamond',serif;font-size:14px"]])}
      ${C.t("t:whatsapp", "WhatsApp donde recibes los pedidos", T.whatsapp, "987654321")}
      <p class="ed-tip">Para publicar u ocultar la tienda, y para elegir qué productos se muestran, entra a <b>Mi tienda</b> en tu panel.</p>`;
  }

  function pEditar(){
    if (!SEL) return `<p class="ed-tip">Toca una sección en la página, o elígela en <b>Secciones</b>, para cambiar sus textos, colores, tamaño y fotos.</p>`;
    if (SEL === "aviso") {
      const a = D.avisoSt || {};
      return `<div class="ed-h">Barra de aviso</div>
        ${C.chk("d:aviso_on", "Mostrar la barra", D.aviso_on)}
        ${C.t("t:aviso", "Texto", T.aviso, "Envíos a todo el Perú")}
        ${C.col("a:bg", "Color de fondo", a.bg, "#111111")}
        ${C.col("a:tx", "Color del texto", a.tx, "#ffffff")}`;
    }
    if (SEL === "cabecera") {
      const h = D.header || {};
      return `<div class="ed-h">Cabecera</div>
        ${C.img("d:logo", "Logo", D.logo)}
        ${C.t("d:menu", "Texto del enlace (solo en computadora)", D.menu, "Ver catálogo")}
        ${C.col("h:bg", "Color de fondo", h.bg, "#f7f7f5")}
        ${C.col("h:tx", "Color del texto", h.tx, "#15171a")}`;
    }
    if (SEL === "pie") {
      const f = D.footer || {};
      return `<div class="ed-h">Pie de página</div>
        ${C.col("f:bg", "Color de fondo", f.bg, "#f7f7f5")}
        ${C.col("f:tx", "Color del texto", f.tx, "#6b7280")}
        <p class="ed-tip">El pie muestra el nombre, la dirección, el horario y el WhatsApp de la tienda.</p>`;
    }
    const s = secSel();
    if (!s) { SEL = null; return pEditar(); }
    return contenido(s) + caja(s) + (BASE.includes(s.k) ? "" : `<button class="del" data-del="${esc(s.id)}">Eliminar esta sección</button>`);
  }

  function contenido(s){
    const k = s.k, c = s.c || {}, st = s.st || {};
    let h = `<div class="ed-h">${NOMBRES[k]}</div>`;
    if (k === "portada") {
      h += C.img("t:hero_img", "Imagen de fondo", T.hero_img);
      h += C.r("st:osc", "Oscurecer la imagen", st.osc != null ? Math.round(st.osc * 100) : null, 70, 0, 100, 5, "%");
      h += C.t("t:hero_eyebrow", "Texto pequeño de arriba", T.hero_eyebrow, "NUEVA COLECCIÓN");
      h += C.t("t:hero_titulo", "Título", T.hero_titulo, T.titulo);
      h += C.a("t:hero_sub", "Frase", T.hero_sub == null ? T.descripcion : T.hero_sub, "Comodidad y estilo en cada prenda");
      h += C.t("t:hero_cta", "Texto del botón (vacío = sin botón)", T.hero_cta == null ? "Comprar ahora" : T.hero_cta);
      h += C.col("st:btn", "Color del botón", st.btn, T.color || "#c2714f");
    } else if (k === "banner") {
      h += C.img("c:img", "Imagen de fondo", c.img);
      h += C.r("st:osc", "Oscurecer la imagen", st.osc != null ? Math.round(st.osc * 100) : null, 70, 0, 100, 5, "%");
      h += C.t("c:eyebrow", "Texto pequeño de arriba", c.eyebrow, "OFERTA");
      h += C.t("c:titulo", "Título", c.titulo);
      h += C.a("c:sub", "Frase", c.sub);
      h += C.t("c:cta", "Texto del botón (vacío = sin botón)", c.cta == null ? "Ver catálogo" : c.cta);
      h += C.col("st:btn", "Color del botón", st.btn, T.color || "#c2714f");
    } else if (k === "texto") {
      h += C.t("c:titulo", "Título", c.titulo);
      h += C.a("c:txt", "Texto", c.txt);
    } else if (k === "imagen") {
      h += C.img("c:img", "Imagen", c.img);
      h += C.t("c:alt", "Descripción corta de la imagen", c.alt, "Ej.: vitrina de la tienda");
    } else if (k === "beneficios") {
      const b = Array.isArray(T.beneficios) ? T.beneficios : [];
      h += `<div class="f"><span>Beneficios (ícono y texto)</span>
        ${b.map((x, i) => `<div class="bn"><input class="bn-i" data-bn="${i}" data-bk="i" value="${v(x.i)}" maxlength="4">
          <input class="bn-t" data-bn="${i}" data-bk="t" value="${v(x.t)}" maxlength="40">
          <button class="mini" data-ben-del="${i}" aria-label="Quitar">✕</button></div>`).join("")}
        ${b.length < 6 ? `<button class="mini" data-ben-add>+ Agregar beneficio</button>` : ""}</div>`;
    } else if (k === "buscador") {
      h += C.t("c:ph", "Texto dentro del buscador", c.ph, "Buscar producto...");
      h += C.chk("c:nocat", "Ocultar los botones de categorías", c.nocat);
    } else if (k === "destacados" || k === "catalogo") {
      h += C.t("c:titulo", "Título", c.titulo, k === "destacados" ? "Productos destacados" : "Todos los productos");
      h += C.seg("st:cols", "Productos por fila (en computadora)", st.cols || 4, [[2, "2"], [3, "3"], [4, "4"], [5, "5"]]);
      h += `<p class="ed-tip">En celular siempre se ven 2 por fila. Para cambiar la foto de un producto, toca <b>Cambiar foto</b> sobre él.</p>`;
    } else if (k === "info") {
      h += C.t("c:titulo", "Título", c.titulo, "Dónde estamos");
      h += C.t("t:direccion", "Dirección", T.direccion);
      h += C.t("t:horario", "Horario", T.horario, "Lun a sáb 10am - 8pm");
      h += C.t("t:whatsapp", "WhatsApp", T.whatsapp, "987654321");
    }
    return h;
  }

  function caja(s){
    const k = s.k, st = s.st || {};
    let h = `<div class="ed-h">Caja</div>`;
    h += C.chk("sec:on", "Visible en la tienda", s.on);
    h += C.col("st:bg", "Color de fondo", st.bg, "#ffffff");
    h += C.col("st:tx", "Color del texto", st.tx, "#15171a");
    if (k === "portada" || k === "banner") h += C.r("st:alto", "Alto", st.alto, 70, 30, 100, 5, "vh");
    if (k === "imagen") h += C.r("st:alto", "Alto", st.alto, 50, 20, 100, 5, "vh");
    h += C.r("st:pad", "Espacio arriba y abajo", st.pad, padDef(k), 0, 160, 4, "px");
    h += C.r("st:esc", "Tamaño del texto", st.esc != null ? Math.round(st.esc * 100) : null, 100, 75, 150, 5, "%");
    h += C.seg("st:ancho", "Ancho", st.ancho || anchoDef(k), [["full", "Completo"], ["box", "Con margen"]]);
    if (["portada", "banner", "texto", "buscador", "info"].includes(k))
      h += C.seg("st:alin", "Alineación", st.alin || "", [["", "Auto"], ["l", "Izq."], ["c", "Centro"], ["r", "Der."]]);
    return h;
  }

  /* ---------- Cambios ---------- */
  function ref(b){
    const i = b.indexOf(":"), sc = b.slice(0, i), key = b.slice(i + 1);
    if (sc === "t") return [T, key];
    if (sc === "d") return [D, key];
    if (sc === "a") return [D.avisoSt || (D.avisoSt = {}), key];
    if (sc === "h") return [D.header || (D.header = {}), key];
    if (sc === "f") return [D.footer || (D.footer = {}), key];
    const s = secSel(); if (!s) return [null, key];
    if (sc === "st") return [s.st || (s.st = {}), key];
    if (sc === "c") return [s.c || (s.c = {}), key];
    if (sc === "sec") return [s, key];
    return [null, key];
  }
  function poner(b, val){
    const [o, k] = ref(b); if (!o) return;
    if (val === null || val === undefined) delete o[k]; else o[k] = val;
  }

  function snap(){
    const t = {}; CAMPOS.forEach(k => t[k] = T[k]);
    return JSON.stringify({ t, d: D });
  }
  function paso(){
    PILA.push(snap());
    if (PILA.length > 60) PILA.shift();
    const u = $("ed-undo"); if (u) u.disabled = false;
  }
  function deshacer(){
    if (!PILA.length) return;
    const x = JSON.parse(PILA.pop());
    Object.assign(T, x.t);
    D = x.d;
    if (SEL && !["aviso", "cabecera", "pie"].includes(SEL) && !secSel()) SEL = null;
    marcarCambio();
    pintar(); pintarPanel();
    estado("Se deshizo el último cambio.");
  }

  // Programa el dibujo y el guardado automático
  function cambio(b, soloSec){
    marcarCambio();
    cancelAnimationFrame(tRaf);
    tRaf = requestAnimationFrame(() => (soloSec && SEL && secSel()) ? repintarSec(SEL) : pintar());
  }
  function marcarCambio(){
    sucio = true; version++;
    estado("Cambios sin guardar...");
    clearTimeout(tAuto);
    tAuto = setTimeout(guardar, 2000);
  }

  function inputPanel(e){
    const el = e.target;
    if (el.dataset.bn !== undefined) {
      const cb = "bn" + el.dataset.bn + el.dataset.bk;
      if (!rafaga || ultCampo !== cb) { paso(); rafaga = true; ultCampo = cb; }
      clearTimeout(tRafaga); tRafaga = setTimeout(() => rafaga = false, 700);
      const b = T.beneficios[Number(el.dataset.bn)];
      if (b) b[el.dataset.bk] = el.value;
      return cambio("t:beneficios");
    }
    const b = el.dataset.b; if (!b) return;
    if (!rafaga || ultCampo !== b) { paso(); rafaga = true; ultCampo = b; }
    clearTimeout(tRafaga); tRafaga = setTimeout(() => rafaga = false, 700);
    let val;
    if (el.type === "checkbox") val = el.checked ? 1 : 0;
    else if (el.type === "range") {
      val = Number(el.value);
      const out = el.closest(".f").querySelector("output");
      if (out) out.textContent = el.value + (el.dataset.u || "");
      if (el.dataset.u === "%") val = Math.round(val) / 100;
    } else val = el.value;
    if (b === "t:whatsapp") { val = String(val).replace(/\D/g, "").slice(0, 9); if (el.value !== val) el.value = val; }
    if (el.type === "color") {
      const cl = el.closest(".cl");
      if (cl) { cl.querySelectorAll(".sw").forEach(x => x.classList.toggle("on", x.dataset.v === val)); const a = cl.querySelector("[data-reset]"); if (a) a.classList.remove("on"); }
    }
    poner(b, val);
    cambio(b, /^(st|c|sec):/.test(b));
  }

  function clicPanel(e){
    const t = e.target.closest("button,[data-sel]");
    if (!t) { if (e.target.closest(".ed-a")) togPanel(); return; }
    const d = t.dataset;
    if (d.tab) { TAB = d.tab; abrirPanel(); return pintarPanel(); }
    if (d.x === "salir") return salir();
    if (d.x === "undo") return deshacer();
    if (d.x === "min") return togPanel();
    if (d.visAviso !== undefined) { paso(); D.aviso_on = D.aviso_on ? 0 : 1; cambio("d:aviso_on"); return pintarPanel(); }
    if (d.vis) {
      paso();
      const s = T.secciones.find(x => x.id === d.vis);
      if (s) s.on = s.on ? 0 : 1;
      cambio("x"); return pintarPanel();
    }
    if (d.nueva) return nuevaSec(d.nueva);
    if (d.del) return borrarSec(d.del);
    if (d.seg) {
      paso();
      const val = d.v === "" ? null : (d.seg === "st:cols" ? Number(d.v) : d.v);
      poner(d.seg, d.seg === "st:cols" && val === 4 ? null : val);
      cambio(d.seg, /^(st|c|sec):/.test(d.seg)); return pintarPanel();
    }
    if (d.sw) { paso(); poner(d.sw, d.v); cambio(d.sw, /^(st|c|sec):/.test(d.sw)); return pintarPanel(); }
    if (d.reset) { paso(); poner(d.reset, null); cambio(d.reset, /^(st|c|sec):/.test(d.reset)); return pintarPanel(); }
    if (d.up) { upDest = { b: d.up }; return $("ed-file").click(); }
    if (d.quitar) { paso(); poner(d.quitar, null); cambio(d.quitar, /^(st|c|sec):/.test(d.quitar)); return pintarPanel(); }
    if (d.benAdd !== undefined) {
      paso();
      T.beneficios = Array.isArray(T.beneficios) ? T.beneficios : [];
      T.beneficios.push({ i: "⭐", t: "Nuevo beneficio" });
      cambio("t:beneficios"); return pintarPanel();
    }
    if (d.benDel !== undefined) {
      paso(); T.beneficios.splice(Number(d.benDel), 1);
      cambio("t:beneficios"); return pintarPanel();
    }
    if (d.sel !== undefined && !e.target.closest(".ly-h,.ly-v")) return seleccionar(d.sel, true);
  }

  function seleccionar(id, desdeLista){
    SEL = id; TAB = "prop";
    if (!sucio) estado("");
    abrirPanel(); pintarPanel(); window.trasPintar();
    if (desdeLista) {
      const el = elDe(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function nuevaSec(k){
    paso();
    const c = k === "banner" ? { eyebrow: "", titulo: "Nueva colección", sub: "Escribe aquí una frase corta", cta: "Ver catálogo" }
      : k === "texto" ? { titulo: "Sobre nosotros", txt: "Cuéntale a tus clientes quiénes son, qué venden y por qué elegirlos." } : {};
    const s = { id: uid(), k, on: 1, st: {}, c };
    const i = T.secciones.findIndex(x => x.id === SEL);
    T.secciones.splice(i >= 0 ? i + 1 : T.secciones.length, 0, s);
    SEL = s.id; TAB = "prop";
    marcarCambio(); pintar(); pintarPanel();
    const el = elDe(s.id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function borrarSec(id){
    const s = T.secciones.find(x => x.id === id); if (!s) return;
    if (!confirm(`¿Eliminar la sección "${nombreSec(s)}"? Puedes deshacerlo con ↶.`)) return;
    paso();
    T.secciones = T.secciones.filter(x => x.id !== id);
    SEL = null; TAB = "sec";
    marcarCambio(); pintar(); pintarPanel();
  }

  function moverSec(a, b){
    if (a === b || a < 0 || b < 0) return;
    paso();
    const [x] = T.secciones.splice(a, 1);
    T.secciones.splice(b, 0, x);
    SEL = x.id;
    marcarCambio(); pintar(); pintarPanel();
    const el = elDe(x.id);
    if (el) { el.classList.add("drg-ok"); setTimeout(() => el.classList.remove("drg-ok"), 800); }
    estado("Sección movida.");
  }

  /* ---------- Guardar ---------- */
  async function guardar(){
    clearTimeout(tAuto);
    if (guardando) { otraVez = true; return false; }
    guardando = true;
    const v0 = version;
    estado("Guardando...");
    const fila = {};
    CAMPOS.forEach(k => fila[k] = T[k] === undefined ? null : T[k]);
    fila.disenio = D;
    let ok = false;
    try {
      const { error } = await sb.from("tiendas").update(fila).eq("id", T.id);
      if (error) estado("No se guardó: " + error.message, true);
      else { ok = true; if (version === v0) { sucio = false; estado("Guardado ✓"); } }
    } catch (err) { estado("No se guardó: revisa tu conexión.", true); }
    guardando = false;
    if (otraVez || (ok && version !== v0)) { otraVez = false; tAuto = setTimeout(guardar, 600); }
    return ok;
  }

  /* ---------- Imágenes ---------- */
  function comprimir(file, max){
    return new Promise(res => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return res(file);
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        const tipo = file.type === "image/png" ? "image/png" : "image/jpeg";
        cv.toBlob(b => res(b && b.size < file.size ? new File([b], "img", { type: tipo }) : file), tipo, 0.84);
      };
      img.onerror = () => { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }

  async function subir(file, nombre){
    if (!/^image\//.test(file.type)) throw new Error("El archivo no es una imagen.");
    if (file.size > 15 * 1024 * 1024) throw new Error("La imagen pesa más de 15 MB.");
    const f = await comprimir(file, /logo/.test(nombre) ? 700 : 1800);
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const ruta = `${T.slug}/${nombre}-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("tiendas").upload(ruta, f, { contentType: f.type, cacheControl: "31536000", upsert: false });
    if (error) throw error;
    return sb.storage.from("tiendas").getPublicUrl(ruta).data.publicUrl;
  }

  async function archivoElegido(e){
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    const dest = upDest; upDest = null;
    if (!file || !dest) return;
    estado("Subiendo imagen...");
    if (panel) panel.classList.add("ed-cargando");
    try {
      if (dest.prod) {
        const p = ITEMS.find(x => x.id === dest.prod); if (!p) return;
        const col = COLS_FOTO.find(k => k in p);
        if (!col) throw new Error("tu tabla de productos no tiene un campo de foto");
        const url = await subir(file, "productos/" + p.id);
        const { error } = await sb.from("productos").update({ [col]: url }).eq("id", p.id);
        if (error) throw error;
        p[col] = url;
        pintarGrids(); window.trasPintar();
        estado("Foto del producto actualizada ✓");
      } else {
        const url = await subir(file, dest.b.replace(/[^a-z0-9]+/gi, "-"));
        paso(); poner(dest.b, url);
        cambio(dest.b, /^(st|c|sec):/.test(dest.b));
        pintarPanel();
      }
    } catch (err) {
      estado("No se pudo subir: " + (err.message || err), true);
    } finally {
      if (panel) panel.classList.remove("ed-cargando");
    }
  }

  /* ---------- Página en modo edición ---------- */
  function clicPagina(e){
    if (!EDIT) return;
    const f = e.target.closest("[data-foto]");
    e.preventDefault(); e.stopPropagation();
    if (f) { upDest = { prod: f.dataset.foto }; return $("ed-file").click(); }
    if (Date.now() - bloqueoClic < 350) return;
    const el = e.target.closest("[data-id],[data-fix]");
    if (el) seleccionar(el.dataset.id || el.dataset.fix, false);
  }

  function presionPagina(e){
    if (!EDIT || (e.button && e.button !== 0)) return;
    if (e.target.closest("[data-foto]")) return;
    const sec = e.target.closest("#secs > [data-id]");
    if (!sec) return;
    const chip = !!e.target.closest(".selchip");
    arrastrar(e, {
      el: sec, inmediato: chip || e.pointerType !== "touch",
      lista: () => [...document.querySelectorAll("#secs > [data-id]")],
      etiqueta: nombreDe(sec.dataset.id),
      limites: () => ({ top: 70, bottom: esMovil() ? innerHeight - 50 : innerHeight }),
      alSoltar: moverSec
    });
  }

  function arrastrarLista(e, h){
    const row = h.closest(".ly");
    e.preventDefault();
    arrastrar(e, {
      el: row, inmediato: true,
      lista: () => [...document.querySelectorAll("#ly-lista > .ly")],
      etiqueta: row.querySelector(".ly-n").textContent,
      scroller: $("ed-body"),
      alSoltar: moverSec
    });
  }

  // Arrastre con mouse, lápiz o dedo. En celular, sobre la página, empieza al mantener presionado.
  function arrastrar(e, o){
    if (DRG) return;
    const touch = e.pointerType === "touch";
    const d = DRG = { o, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, on: false, ins: null };
    const empezar = () => {
      if (DRG !== d || d.on) return;
      d.on = true;
      d.items = o.lista();
      d.desde = d.items.indexOf(o.el);
      if (d.desde < 0) return fin(false);
      d.g = document.createElement("div"); d.g.className = "drg-g"; d.g.textContent = "⠿ " + o.etiqueta;
      d.l = document.createElement("div"); d.l.className = "drg-l";
      document.body.append(d.g, d.l);
      o.el.classList.add("drg-o");
      document.body.classList.add("arrastrando");
      try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
      seguir();
      d.raf = requestAnimationFrame(auto);
    };
    if (touch && !o.inmediato) d.t = setTimeout(empezar, 380);

    const mv = ev => {
      if (ev.pointerId !== d.id) return;
      d.x = ev.clientX; d.y = ev.clientY;
      if (!d.on) {
        const dist = Math.hypot(d.x - d.x0, d.y - d.y0);
        if (touch && !o.inmediato) { if (dist > 10) fin(false); return; }
        if (dist < 6) return;
        empezar();
      }
      if (ev.cancelable) ev.preventDefault();
      seguir();
    };
    const up = ev => { if (ev.pointerId === d.id) fin(ev.type === "pointerup"); };

    function seguir(){
      if (!d.on) return;
      d.g.style.transform = `translate(${d.x + 14}px,${d.y + 14}px)`;
      const it = d.items;
      let i = it.length;
      for (let j = 0; j < it.length; j++) {
        const r = it[j].getBoundingClientRect();
        if (d.y < r.top + r.height / 2) { i = j; break; }
      }
      d.ins = i;
      const r = it[Math.min(i, it.length - 1)].getBoundingClientRect();
      const top = i < it.length ? r.top : r.bottom;
      d.l.style.top = (top - 2) + "px";
      d.l.style.left = r.left + "px";
      d.l.style.width = r.width + "px";
      d.l.classList.toggle("nulo", i === d.desde || i === d.desde + 1);
    }
    function auto(){
      if (DRG !== d || !d.on) return;
      const lim = o.scroller ? o.scroller.getBoundingClientRect() : (o.limites ? o.limites() : { top: 0, bottom: innerHeight });
      const z = 80;
      let vel = 0;
      if (d.y < lim.top + z) vel = -Math.ceil((lim.top + z - d.y) / 4);
      else if (d.y > lim.bottom - z) vel = Math.ceil((d.y - (lim.bottom - z)) / 4);
      if (vel) { if (o.scroller) o.scroller.scrollTop += vel; else window.scrollBy(0, vel); seguir(); }
      d.raf = requestAnimationFrame(auto);
    }
    function fin(ok){
      clearTimeout(d.t); cancelAnimationFrame(d.raf);
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (d.on) {
        if (d.g) d.g.remove();
        if (d.l) d.l.remove();
        o.el.classList.remove("drg-o");
        document.body.classList.remove("arrastrando");
        bloqueoClic = Date.now();
        if (ok && d.ins != null) {
          const hasta = d.ins > d.desde ? d.ins - 1 : d.ins;
          if (hasta !== d.desde) o.alSoltar(d.desde, hasta);
        }
      }
      if (DRG === d) DRG = null;
    }
    window.addEventListener("pointermove", mv, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  // Marca la sección elegida y le pone su etiqueta para moverla
  window.trasPintar = function(){
    if (!EDIT) return;
    document.querySelectorAll("#app .sel").forEach(x => x.classList.remove("sel"));
    document.querySelectorAll("#app .selchip").forEach(x => x.remove());
    const el = elDe(SEL); if (!el) return;
    el.classList.add("sel");
    const movible = !!el.dataset.id;
    const chip = document.createElement("div");
    chip.className = "selchip" + (movible ? "" : " fijo");
    chip.setAttribute("data-ed", "");
    chip.innerHTML = (movible ? `<span class="selchip-h">⠿</span>` : "") + esc(nombreDe(SEL)) + (movible ? " · arrastra para mover" : "");
    el.appendChild(chip);
  };
})();