// estropa.js — estadísticas de ropa: qué modelos, colores, tallas y prendas se venden más y menos
(function(){
  const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
  const bonito = s => { s = String(s || "").trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  const conTalla = c => /^(XS|S|M|L)\d+$/i.test(c);
  const tallaDe = c => { const m = String(c).match(/^(XS|S|M|L)\d+$/i); return m ? m[1].toUpperCase() : "Sin talla"; };
  const ORD = { XS: 0, S: 1, M: 2, L: 3 };
  let SEL_MOD = "", DET = null;   // modelo elegido en el buscador y su detalle
  let LISTA = [];                 // modelos para el buscador

  // Modelo y color: los campos guardados o, si faltan, la última palabra del nombre
  function partes(codigo, nombre, modelo, color){
    nombre = String(nombre || "").trim();
    if (modelo) return { modelo: String(modelo).trim(), color: String(color || "").trim() };
    if (conTalla(codigo) && /\s/.test(nombre)) { const w = nombre.split(/\s+/); return { modelo: w.slice(0, -1).join(" "), color: w[w.length - 1] }; }
    return { modelo: nombre, color: "" };
  }
  const toca = (mapa, clave, nombre) => { if (!mapa.has(clave)) mapa.set(clave, { nombre, u: 0, stock: 0 }); return mapa.get(clave); };
  const top = (mapa, n) => [...mapa.values()].filter(x => x.u > 0).sort((a, b) => b.u - a.u || a.nombre.localeCompare(b.nombre)).slice(0, n);
  const low = (mapa, n) => [...mapa.values()].filter(x => x.stock > 0).sort((a, b) => a.u - b.u || b.stock - a.stock).slice(0, n);

  const hoja = (id, titulo, sub, lista, alto) => `<div class="card est-card"><b>${titulo}</b>${sub ? `<br><small class="gr">${sub}</small>` : ""}
    ${lista.length ? `<div class="est-lienzo" style="height:${alto || Math.max(170, lista.length * 34 + 50)}px"><canvas id="${id}"></canvas></div>` : `<p class="gr" style="margin-top:10px">Sin datos en este periodo.</p>`}</div>`;

  function barras(id, lista, horiz){
    if (!lista.length || !$(id)) return;
    const eje = horiz ? "x" : "y";
    graficar(id, {
      type: "bar",
      data: { labels: lista.map(x => x.nombre), datasets: [{ label: "Unidades", data: lista.map(x => x.u) }] },
      options: { indexAxis: horiz ? "y" : "x", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: c => c.parsed[eje] + " unidad(es) vendida(s)",
          afterLabel: c => "Stock actual: " + lista[c.dataIndex].stock } } },
        scales: { [eje]: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
  }

  // Detalle del modelo elegido en el buscador: sus tallas y sus colores
  function pintarDet(){
    const box = $("er-det"); if (!box) return;
    const d = DET && DET.get(SEL_MOD);
    if (!d) { box.innerHTML = ""; return; }
    const tallas = [...d.t.values()].sort((a, b) => (ORD[a.nombre] ?? 9) - (ORD[b.nombre] ?? 9));
    const colores = [...d.c.values()].sort((a, b) => b.u - a.u || a.nombre.localeCompare(b.nombre));
    const total = tallas.reduce((s, t) => s + t.u, 0);
    const tt = [...tallas].sort((a, b) => b.u - a.u)[0], cc = colores[0];
    box.innerHTML = total
      ? `<p class="gr" style="margin:10px 0">${esc(d.nombre)}: <b>${total}</b> vendida(s) · Talla que más sale: <b>${esc(tt.nombre)}</b> (${tt.u}) · Color que más sale: <b>${esc(cc.nombre)}</b> (${cc.u})</p>`
      : `<p class="gr" style="margin:10px 0">${esc(d.nombre)} no tiene ventas en este periodo.</p>`;
    box.innerHTML += `<div class="est-grid">
        ${hoja("er-d-talla", "Tallas de " + esc(d.nombre), "Unidades vendidas", total ? tallas : [], 230)}
        ${hoja("er-d-color", "Colores de " + esc(d.nombre), "Unidades vendidas", total ? colores : [])}</div>`;
    if (total) { barras("er-d-talla", tallas, false); barras("er-d-color", colores, true); }
  }

  window.estRopaBuscar = v => {
    const box = $("er-res"); if (!box) return;
    SEL_MOD = ""; pintarDet();                    // al escribir se limpia la selección anterior
    const q = norm(v);
    if (!q) { box.className = ""; box.innerHTML = ""; return; }
    const r = LISTA.filter(x => norm(x.n).includes(q)).slice(0, 8);
    box.className = "res";
    box.innerHTML = r.length
      ? r.map(x => `<div data-k="${esc(x.k)}" onclick="estRopaModelo(this.dataset.k)">${esc(x.n)}</div>`).join("")
      : `<div class="gr">No se encontró ese modelo.</div>`;
  };
  window.estRopaModelo = k => {
    SEL_MOD = k;
    const box = $("er-res"); if (box) { box.className = ""; box.innerHTML = ""; }
    const d = DET && DET.get(k), q = $("er-q"); if (q && d) q.value = d.nombre;
    pintarDet();
  };

  window.cargarEstRopa = async function(){
    const cont = $("t-est");
    let box = $("e-ropa");
    if (!box && cont) { box = document.createElement("div"); box.id = "e-ropa"; box.style.marginTop = "18px"; cont.appendChild(box); }
    if (!box) return;
    const esRopa = NEG && (NEG.rubro === "ropa" || PRODS.some(p => conTalla(p.codigo)));
    box.classList.toggle("hide", !esRopa);
    if (!esRopa) return;
    box.innerHTML = `<h3 style="margin:0 0 6px">Estadísticas de ropa</h3><p class="gr">Cargando...</p>`;

    try {
      const { ini, fin } = rangoEst();
      const filas = await estFilas(() => sb.from("venta_items")
        .select("codigo,nombre,cantidad,ventas!inner(fecha,anulada)")
        .in("negocio_id", estIds())
        .eq("ventas.anulada", false)
        .gte("ventas.fecha", ini + "T00:00:00-05:00").lt("ventas.fecha", fin + "T00:00:00-05:00")
        .order("id"));

      const M = new Map(), C = new Map(), T = new Map(), P = new Map(), D = new Map();
      const porCodigo = new Map(PRODS.map(p => [p.codigo, p]));
      const registra = (codigo, nombre, modelo, color, unidades, stock) => {
        const x = partes(codigo, nombre, modelo, color), t = tallaDe(codigo);
        const nm = norm(x.modelo), nc = norm(x.color);
        const objs = [
          toca(M, nm, bonito(x.modelo)),
          x.color ? toca(C, nc, bonito(x.color)) : null,
          toca(T, t, t),
          toca(P, nm + "|" + nc, bonito(x.modelo) + (x.color ? " " + x.color.toLowerCase() : ""))
        ];
        objs.forEach(o => { if (o) { o.u += unidades; o.stock += stock; } });
        // detalle por modelo (para el buscador)
        const d = D.get(nm) || D.set(nm, { nombre: bonito(x.modelo), t: new Map(), c: new Map() }).get(nm);
        const a = toca(d.t, t, t); a.u += unidades; a.stock += stock;
        const b = toca(d.c, nc || "-", x.color ? bonito(x.color) : "Sin color"); b.u += unidades; b.stock += stock;
      };
      // catálogo (para saber qué existe y cuánto stock hay)
      PRODS.forEach(p => registra(p.codigo, p.nombre, p.modelo, p.color, 0, p.stock));
      // ventas del periodo
      filas.forEach(r => { const p = porCodigo.get(r.codigo); registra(r.codigo, r.nombre, p && p.modelo, p && p.color, r.cantidad, 0); });

      const total = filas.reduce((s, r) => s + r.cantidad, 0);
      const tallas = [...T.values()].filter(t => t.u > 0 || t.stock > 0).sort((a, b) => (ORD[a.nombre] ?? 9) - (ORD[b.nombre] ?? 9));
      const mejor = lista => lista.length && lista[0].u > 0 ? `<b>${esc(lista[0].nombre)}</b> (${lista[0].u})` : "—";
      const tTop = [...tallas].sort((a, b) => b.u - a.u)[0];

      DET = D;
      if (!D.has(SEL_MOD)) SEL_MOD = "";
      LISTA = [...M.entries()].map(([k, m]) => ({ k, n: m.nombre })).sort((a, b) => a.n.localeCompare(b.n));
      const selNombre = SEL_MOD && D.get(SEL_MOD) ? D.get(SEL_MOD).nombre : "";

      box.innerHTML = `<h3 style="margin:0 0 4px">Estadísticas de ropa</h3>
        <p class="gr" style="margin:0 0 10px">${esc(textoRango())}</p>
        <div class="card" style="margin-bottom:12px">Prendas vendidas: <b>${total}</b> · Talla que más sale: ${tTop && tTop.u > 0 ? `<b>${esc(tTop.nombre)}</b> (${tTop.u})` : "—"}
          · Color que más sale: ${mejor(top(C, 1))} · Modelo que más sale: ${mejor(top(M, 1))}</div>
        <div class="card" style="margin-bottom:12px"><b>Ver un modelo</b>
          <input type="text" id="er-q" placeholder="Busca el modelo (ej.: casaca)" autocomplete="off" value="${esc(selNombre)}" style="margin-top:8px"
            oninput="estRopaBuscar(this.value)"
            onkeydown="if(event.key==='Enter'){const d=document.querySelector('#er-res [data-k]'); if(d) estRopaModelo(d.dataset.k)}">
          <div id="er-res"></div>
          <div id="er-det"></div></div>
        <div class="est-grid">
          ${hoja("er-talla", "Tallas que más salen", "Unidades vendidas por talla", tallas.filter(t => t.nombre !== "Sin talla" || t.u > 0), 230)}
          ${hoja("er-mod-top", "Modelos que más se venden", "", top(M, 8))}
          ${hoja("er-mod-low", "Modelos que menos se venden", "Con stock y pocas o ninguna venta", low(M, 8))}
          ${hoja("er-col-top", "Colores que más se venden", "", top(C, 8))}
          ${hoja("er-col-low", "Colores que menos se venden", "Con stock y pocas o ninguna venta", low(C, 8))}
          ${hoja("er-pre-top", "Prendas que más salen", "Modelo y color", top(P, 8))}
          ${hoja("er-pre-low", "Prendas que menos salen", "Modelo y color, con stock", low(P, 8))}
        </div>`;

      barras("er-talla", tallas.filter(t => t.nombre !== "Sin talla" || t.u > 0), false);
      barras("er-mod-top", top(M, 8), true);  barras("er-mod-low", low(M, 8), true);
      barras("er-col-top", top(C, 8), true);  barras("er-col-low", low(C, 8), true);
      barras("er-pre-top", top(P, 8), true);  barras("er-pre-low", low(P, 8), true);
      pintarDet();
    } catch (e) {
      box.innerHTML = `<h3 style="margin:0 0 6px">Estadísticas de ropa</h3><p class="msg">No se pudieron cargar: ${esc(e.message || e)}</p>`;
    }
  };
})();