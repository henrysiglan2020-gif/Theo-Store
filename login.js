
const form = document.getElementById("login-form");
const message = document.getElementById("message");

form.addEventListener("submit", async event => {
  event.preventDefault();

  message.textContent = "Verificando senha...";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        password: document.getElementById("password").value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      message.textContent = result.error || "Senha incorreta.";
      return;
    }

    window.location.href = "/central";
  } catch {
    message.textContent = "Erro de conexão com o servidor.";
  }
});
