// Utilidades: pantallas, menú y texto seguro
 
const $ = id => document.getElementById(id);
 
function show(v){
  document.querySelectorAll(".v").forEach(s => s.classList.add("hide"));
  $("v-" + v).classList.remove("hide");
  window.scrollTo(0, 0);
}
 
function nav(logueado){
  $("nav-out").classList.toggle("hide", logueado);
  $("nav-in").classList.toggle("hide", !logueado);
}
 
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 