const list = document.getElementById("stores-list");
const search = document.getElementById("store-search");
let stores = [];

function safe(value) {
  return String(value || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[c]);
}

function renderStores() {
  const term = search.value.trim().toLowerCase();
  const filtered = stores.filter(s =>
    String(s.name || "").toLowerCase().includes(term) ||
    String(s.description || "").toLowerCase().includes(term)
  );

  if (!filtered.length) {
    list.innerHTML = '<p class="stores-message">Nenhuma loja publicada por enquanto.</p>';
    return;
  }

  list.innerHTML = filtered.map(s => `
    <a class="store-card" href="/loja/${encodeURIComponent(s.slug)}">
      <img class="store-logo" src="${safe(s.logo || "")}"
        onerror="this.style.display='none'" alt="">
      <h2>${safe(s.name)}</h2>
      <p>${safe(s.description || "Confira os produtos desta loja.")}</p>
      <small>VISITAR LOJA →</small>
    </a>
  `).join("");
}

async function loadStores() {
  try {
    const response = await fetch("/api/stores/public");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erro ao carregar lojas.");
    stores = data;
    renderStores();
  } catch (error) {
    list.innerHTML = `<p class="stores-message">${safe(error.message)}</p>`;
  }
}

search.addEventListener("input", renderStores);
document.getElementById("year").textContent = new Date().getFullYear();
loadStores();
