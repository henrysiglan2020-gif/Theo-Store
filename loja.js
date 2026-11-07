const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "");

function safe(value) {
  return String(value || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[c]);
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0
    ? n.toLocaleString("pt-BR", {style:"currency",currency:"BRL"})
    : "Confira o preço";
}

async function loadStore() {
  const header = document.getElementById("store-header");
  const productsBox = document.getElementById("store-products");

  try {
    const response = await fetch(`/api/stores/public/${encodeURIComponent(slug)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Loja não encontrada.");

    document.title = `${data.store.name} | THEO STORE`;
    header.innerHTML = `
      ${data.store.logo ? `<img src="${safe(data.store.logo)}" alt="">` : ""}
      <div><h1>${safe(data.store.name)}</h1>
      <p>${safe(data.store.description || "Bem-vindo à nossa loja!")}</p></div>
    `;

    const products = data.products || [];
    productsBox.innerHTML = products.length ? products.map(p => `
      <article class="store-product">
        ${p.image ? `<img src="${safe(p.image)}" alt="">` : ""}
        <h3>${safe(p.name)}</h3>
        <p>${money(p.price)}</p>
        ${p.url ? `<a href="${safe(p.url)}" target="_blank" rel="noopener noreferrer">VER NO MERCADO LIVRE ↗</a>` : ""}
      </article>
    `).join("") : "<p>Nenhum produto publicado nesta loja ainda.</p>";
  } catch (error) {
    header.innerHTML = `<h1>${safe(error.message)}</h1>`;
    productsBox.innerHTML = "";
  }
}

loadStore();
