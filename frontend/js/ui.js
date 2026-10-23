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