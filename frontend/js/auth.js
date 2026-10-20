// Registro, inicio y cierre de sesión

async function registrar(){
  const email = $("r-email").value.trim(), pass = $("r-pass").value,
        pass2 = $("r-pass2").value, wsp = $("r-wsp").value.trim(), msg = $("r-msg");
  msg.textContent = "";
  if (!email) return msg.textContent = "Escribe tu correo.";
  if (pass.length < 6) return msg.textContent = "La contraseña debe tener al menos 6 caracteres.";
  if (pass !== pass2) return msg.textContent = "Las contraseñas no coinciden.";
  if (!/^[0-9]{9}$/.test(wsp)) return msg.textContent = "El WhatsApp debe tener 9 dígitos.";
  const { error } = await sb.auth.signUp({ email, password: pass, options: { data: { whatsapp: wsp } } });
  if (error) return msg.textContent = "No se pudo crear la cuenta: " + error.message;
  show("pendiente");
}

async function acceder(){
  const msg = $("l-msg"); msg.textContent = "";
  const { error } = await sb.auth.signInWithPassword({ email: $("l-email").value.trim(), password: $("l-pass").value });
  if (error) return msg.textContent = "Correo o contraseña incorrectos, o falta confirmar tu correo.";
  irSegunNegocio();
}

async function salir(){ await sb.auth.signOut(); nav(false); show("home"); }
