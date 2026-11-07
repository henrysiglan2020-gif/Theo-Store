const form = document.getElementById("login-form");
const message = document.getElementById("message");

form.addEventListener("submit", async event => {
  event.preventDefault();

  message.textContent = "Verificando acesso...";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value,
        password: document.getElementById("password").value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      message.textContent = result.error || "Não foi possível entrar.";
      return;
    }

    window.location.href = "/central";
  } catch {
    message.textContent = "Erro de conexão com o servidor.";
  }
});