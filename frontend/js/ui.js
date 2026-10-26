// ui.js — modo oscuro y círculo de carga. Se carga al final, después de app.js.
(function () {
  const raiz = document.documentElement;
  const btnTema = document.createElement("button");
  btnTema.type = "button"; btnTema.id = "tema"; btnTema.className = "tema-btn";
  const pintarTema = () => {
    const oscuro = raiz.dataset.tema === "oscuro";
    btnTema.textContent = oscuro ? "☀️" : "🌙";
    btnTema.title = btnTema.ariaLabel = oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  };
  btnTema.onclick = () => {
    const t = raiz.dataset.tema === "oscuro" ? "claro" : "oscuro";
    raiz.dataset.tema = t;
    try { localStorage.setItem("tema", t); } catch (e) {}
    pintarTema();
  };
  const cab = document.querySelector("header");
  if (cab) {
    const der = document.createElement("div");
    der.className = "hdr-der";
    ["nav-out", "nav-in"].forEach(id => { const n = document.getElementById(id); if (n) der.appendChild(n); });
    der.appendChild(btnTema);
    cab.appendChild(der);
  }
  pintarTema();

  const vel = document.createElement("div");
  vel.id = "cargando"; vel.className = "hide";
  vel.innerHTML = '<div class="cargando-caja"><div class="spin"></div><span>Procesando…</span></div>';
  document.body.appendChild(vel);

  let activos = 0, retardo = null;
  const mostrar = () => { if (++activos === 1) retardo = setTimeout(() => vel.classList.remove("hide"), 150); };
  const ocultar = () => { if (--activos <= 0) { activos = 0; clearTimeout(retardo); vel.classList.add("hide"); } };

  const ACCIONES = /^(cargar|guardar|registrar|anular|borrar|importar|cambiar|acceder|devolver|reintentar|descargar|salir|eliminar|editar)/;
  Object.keys(window).forEach(nombre => {
    const f = window[nombre];
    if (typeof f !== "function" || !ACCIONES.test(nombre)) return;
    window[nombre] = async function (...args) {
      mostrar();
      try { return await f.apply(this, args); } finally { ocultar(); }
    };
  });
})();

// ---------- Ojo para ver/ocultar la contraseña en todos los campos ----------
(function(){
  function ponerOjo(inp){
    if (inp.dataset.ojo) return;
    inp.dataset.ojo = "1";
    const tenia = document.activeElement === inp;
    const w = document.createElement("div");
    w.className = "pw-wrap";
    w.style.margin = getComputedStyle(inp).margin;
    inp.style.margin = "0";
    inp.parentNode.insertBefore(w, inp);
    w.appendChild(inp);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pw-ojo";
    b.tabIndex = -1;
    b.title = "Mostrar contraseña";
    b.textContent = "👁";
    b.onclick = () => {
      const ver = inp.type === "password";
      inp.type = ver ? "text" : "password";
      b.textContent = ver ? "🙈" : "👁";
      b.title = ver ? "Ocultar contraseña" : "Mostrar contraseña";
      inp.focus();
    };
    w.appendChild(b);
    if (tenia) inp.focus();
  }
  function revisar(){ document.querySelectorAll('input[type="password"]').forEach(ponerOjo); }
  revisar();
  new MutationObserver(revisar).observe(document.body, { childList: true, subtree: true });
})();