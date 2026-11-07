document.addEventListener("click", function (event) {
  const elemento = event.target.closest("a, button");

  if (!elemento) return;

  const texto = (elemento.textContent || "").trim().toLowerCase();
  const destino = (elemento.getAttribute("href") || "").toLowerCase();

  const bloqueado =
    /cadastro|criar-loja|minha-loja|nova-loja|abrir-loja/.test(destino) ||
    /minha loja|criar loja|abrir loja|nova loja/.test(texto);

  if (bloqueado) {
    event.preventDefault();
    event.stopPropagation();

    alert("🚧 Essa função está em desenvolvimento!\n\nEm breve você poderá criar sua própria loja aqui.");
  }
}, true);
