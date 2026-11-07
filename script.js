
// THEO STORE - Página inicial conectada ao banco de dados

const yearElement = document.getElementById("current-year");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

const searchInput = document.getElementById("product-search");
const emptyState = document.getElementById("empty-state");
const categoryGrid = document.querySelector(".category-grid");
const dealsContainer = document.querySelector("#ofertas .container");

let publicProducts = [];
let publicCategories = [];
let activeCategory = "";

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeURL(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function formatPrice(value) {
  const number = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) {
    return "";
  }

  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function categoryIcon(name) {
  const text = String(name).toLowerCase();

  if (/tecnologia|eletr|inform|celular|comput/.test(text)) return "🎧";
  if (/game|jogo|console/.test(text)) return "🎮";
  if (/casa|cozinha|decora/.test(text)) return "🏠";
  if (/moda|roupa|vestu/.test(text)) return "👕";
  if (/beleza|maqui|perfume/.test(text)) return "✨";
  if (/esporte|fitness/.test(text)) return "⚽";
  if (/brinquedo|infantil/.test(text)) return "🧸";

  return "🛍️";
}

function renderPublicCategories() {
  if (!categoryGrid) return;

  categoryGrid.innerHTML = publicCategories.map(category => `
    <a href="#ofertas"
       class="category-card"
       data-category="${escapeHTML(category)}">
      <span class="category-icon">${categoryIcon(category)}</span>
      <strong>${escapeHTML(category)}</strong>
      <small>Ver achadinhos</small>
    </a>
  `).join("");

  categoryGrid.querySelectorAll(".category-card").forEach(card => {
    card.addEventListener("click", () => {
      activeCategory = card.dataset.category || "";
      renderPublicProducts();
    });
  });
}

function ensureProductGrid() {
  let grid = document.getElementById("public-product-grid");

  if (!grid && dealsContainer && emptyState) {
    grid = document.createElement("div");
    grid.id = "public-product-grid";
    grid.className = "public-product-grid";
    emptyState.insertAdjacentElement("afterend", grid);
  }

  return grid;
}

function productCard(product) {
  const image = safeURL(product.image);
  const url = safeURL(product.url);
  const price = formatPrice(product.price);
  const oldPrice = formatPrice(product.oldPrice);

  return `
    <article class="public-product-card">
      <a class="public-product-image"
         href="${url || "#ofertas"}"
         ${url ? 'target="_blank" rel="noopener noreferrer"' : ""}>
        ${image
          ? `<img src="${image}" alt="${escapeHTML(product.name)}" loading="lazy">`
          : `<span>🛍️</span>`}
      </a>

      <div class="public-product-info">
        <small class="public-product-category">
          ${escapeHTML(product.category || "Achadinhos")}
        </small>

        <h3>${escapeHTML(product.name)}</h3>

        ${product.description
          ? `<p>${escapeHTML(product.description)}</p>`
          : ""}

        <div class="public-product-prices">
          ${oldPrice && oldPrice !== price
            ? `<del>${oldPrice}</del>`
            : ""}
          ${price ? `<strong>${price}</strong>` : ""}
        </div>

        ${url
          ? `<a class="public-buy-button"
               href="${url}"
               target="_blank"
               rel="noopener noreferrer">
               CONFERIR NO MERCADO LIVRE →
             </a>`
          : ""}
      </div>
    </article>
  `;
}

function renderPublicProducts() {
  const grid = ensureProductGrid();
  if (!grid || !emptyState) return;

  const search = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  const filtered = publicProducts.filter(product => {
    const matchesSearch =
      String(product.name || "").toLowerCase().includes(search) ||
      String(product.category || "").toLowerCase().includes(search) ||
      String(product.description || "").toLowerCase().includes(search);

    const matchesCategory =
      !activeCategory || product.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  if (filtered.length) {
    emptyState.hidden = true;
    grid.innerHTML = filtered.map(productCard).join("");
    return;
  }

  grid.innerHTML = "";
  emptyState.hidden = false;

  const title = emptyState.querySelector("h3");
  const description = emptyState.querySelector("p");

  if (title && description) {
    if (search || activeCategory) {
      title.textContent = "Nenhum achadinho encontrado.";
      description.textContent = activeCategory
        ? `Ainda não temos produtos publicados em ${activeCategory}.`
        : `Não encontramos produtos para "${search}".`;
    } else {
      title.textContent = "Estamos preparando os achadinhos!";
      description.textContent =
        "Em breve você encontrará aqui produtos selecionados do Mercado Livre.";
    }
  }
}

async function loadPublicData() {
  try {
    const [productsResponse, categoriesResponse] = await Promise.all([
      fetch("/api/public/products", { cache: "no-store" }),
      fetch("/api/public/categories", { cache: "no-store" })
    ]);

    if (!productsResponse.ok || !categoriesResponse.ok) {
      throw new Error("O servidor não conseguiu carregar os dados.");
    }

    publicProducts = await productsResponse.json();
    publicCategories = await categoriesResponse.json();

    renderPublicCategories();
    renderPublicProducts();
  } catch (error) {
    console.error("Erro ao carregar a loja:", error);

    if (emptyState) {
      emptyState.hidden = false;
      const title = emptyState.querySelector("h3");
      const description = emptyState.querySelector("p");

      if (title) title.textContent = "Não foi possível carregar os achadinhos.";
      if (description) description.textContent =
        "Atualize a página em alguns instantes.";
    }
  }
}

if (searchInput) {
  searchInput.addEventListener("input", renderPublicProducts);
}

loadPublicData();

// Atualiza a vitrine quando novos produtos forem publicados.
setInterval(loadPublicData, 15000);

console.log("THEO STORE conectada ao banco de dados.");
