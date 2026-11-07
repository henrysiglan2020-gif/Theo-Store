const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const registerTab = document.getElementById("tab-register");
const loginTab = document.getElementById("tab-login");
const message = document.getElementById("message");

function showTab(tab) {
  const registering = tab === "register";

  registerForm.hidden = !registering;
  loginForm.hidden = registering;

  registerTab.classList.toggle("active", registering);
  loginTab.classList.toggle("active", !registering);

  message.textContent = "";
}

registerTab.addEventListener("click", () => showTab("register"));
loginTab.addEventListener("click", () => showTab("login"));

async function sendAccountRequest(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(data)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Não foi possível concluir.");
  }

  return result;
}

registerForm.addEventListener("submit", async event => {
  event.preventDefault();

  const form = new FormData(registerForm);
  const button = registerForm.querySelector(".submit");

  button.disabled = true;
  button.textContent = "CRIANDO CONTA...";
  message.textContent = "";

  try {
    await sendAccountRequest("/api/register", {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password")
    });

    message.textContent = "Conta criada! Redirecionando...";
    window.location.href = "/";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "CRIAR CONTA";
  }
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const form = new FormData(loginForm);
  const button = loginForm.querySelector(".submit");

  button.disabled = true;
  button.textContent = "ENTRANDO...";
  message.textContent = "";

  try {
    await sendAccountRequest("/api/customer/login", {
      email: form.get("email"),
      password: form.get("password")
    });

    window.location.href = "/";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "ENTRAR";
  }
});

(async () => {
  try {
    const response = await fetch("/api/customer/me");
    const result = await response.json();

    if (result.authenticated) {
      window.location.href = "/";
    }
  } catch {}
})();
