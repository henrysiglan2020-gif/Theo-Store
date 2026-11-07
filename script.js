
// THEO STORE - Sistema inicial

// Atualizar ano automaticamente
const yearElement = document.getElementById("current-year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Pesquisa inicial
const searchInput = document.getElementById("product-search");
const emptyState = document.getElementById("empty-state");

if (searchInput && emptyState) {
  searchInput.addEventListener("input", () => {
    const search = searchInput.value.trim();

    const title = emptyState.querySelector("h3");
    const description = emptyState.querySelector("p");

    if (search.length > 0) {
      title.textContent = "Nenhum achadinho encontrado ainda.";
      description.textContent =
        `Não temos produtos cadastrados para "${search}". Volte em breve!`;
    } else {
      title.textContent = "Estamos preparando os achadinhos!";
      description.textContent =
        "Em breve você encontrará aqui produtos selecionados do Mercado Livre.";
    }
  });
}

console.log("THEO STORE inicializada com sucesso!");
