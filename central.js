
const PRODUCT_KEY = "theo_store_products";
const CATEGORY_KEY = "theo_store_categories";

let products = JSON.parse(localStorage.getItem(PRODUCT_KEY) || "[]");
let categories = JSON.parse(localStorage.getItem(CATEGORY_KEY) ||
  '["Tecnologia","Games","Casa","Moda","Beleza","Outros"]');

function persist() {
  localStorage.setItem(PRODUCT_KEY, JSON.stringify(products));
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
  document.getElementById(page).classList.remove("hidden");

  document.querySelectorAll(".nav").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.page === page)
  );

  const titles = {
    dashboard: "Visão geral",
    products: "Produtos",
    categories: "Categorias",
    new: "Novo achadinho"
  };
  document.getElementById("page-title").textContent = titles[page];

  if (page === "dashboard") renderDashboard();
  if (page === "products") renderProducts();
  if (page === "categories") renderCategories();
  if (page === "new") renderCategoryOptions();
}

document.querySelectorAll(".nav").forEach(btn =>
  btn.addEventListener("click", () => showPage(btn.dataset.page))
);

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL"
  });
}

function productHTML(p) {
  const image = p.image || "";
  return `
    <div class="product-row">
      <img src="${escapeHTML(image)}" alt="" onerror="this.style.display='none'">
      <div class="product-info">
        <strong>${escapeHTML(p.name)}</strong>
        <small>${money(p.price)} · ${escapeHTML(p.category)} · ${p.status}</small>
      </div>
      <div class="product-actions">
        <button onclick="editProduct('${p.id}')">Editar</button>
        <button onclick="toggleStatus('${p.id}')">${p.status === "Publicado" ? "Rascunho" : "Publicar"}</button>
        <button class="delete-button" onclick="deleteProduct('${p.id}')">Excluir</button>
      </div>
    </div>`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderDashboard() {
  document.getElementById("total-products").textContent = products.length;
  document.getElementById("published-products").textContent =
    products.filter(p => p.status === "Publicado").length;
  document.getElementById("draft-products").textContent =
    products.filter(p => p.status === "Rascunho").length;
  document.getElementById("total-categories").textContent = categories.length;

  const recent = document.getElementById("recent-products");
  const latest = [...products].reverse().slice(0, 5);
  recent.innerHTML = latest.length
    ? latest.map(productHTML).join("")
    : '<p class="empty">Nenhum produto cadastrado.</p>';
}

function renderProducts() {
  const search = document.getElementById("product-search").value.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search) ||
    p.category.toLowerCase().includes(search)
  );

  document.getElementById("all-products").innerHTML = filtered.length
    ? filtered.map(productHTML).join("")
    : '<p class="empty">Nenhum produto encontrado.</p>';
}

function renderCategories() {
  document.getElementById("category-list").innerHTML = categories.map(cat => `
    <div class="category-row">
      <strong>${escapeHTML(cat)}</strong>
      <button class="delete-button" onclick="deleteCategory('${encodeURIComponent(cat)}')">Excluir</button>
    </div>
  `).join("") || '<p class="empty">Nenhuma categoria.</p>';
}

function renderCategoryOptions() {
  document.getElementById("product-category").innerHTML =
    '<option value="">Selecione uma categoria</option>' +
    categories.map(cat =>
      `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`
    ).join("");
}

document.getElementById("category-form").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("category-name");
  const name = input.value.trim();

  if (!name) return;
  if (categories.some(cat => cat.toLowerCase() === name.toLowerCase())) {
    alert("Essa categoria já existe.");
    return;
  }

  categories.push(name);
  persist();
  input.value = "";
  renderCategories();
  renderDashboard();
});

function deleteCategory(encodedName) {
  const name = decodeURIComponent(encodedName);
  if (products.some(p => p.category === name)) {
    alert("Essa categoria possui produtos. Mude a categoria desses produtos antes de excluí-la.");
    return;
  }
  if (!confirm(`Excluir a categoria ${name}?`)) return;

  categories = categories.filter(cat => cat !== name);
  persist();
  renderCategories();
  renderDashboard();
}

document.getElementById("product-form").addEventListener("submit", event => {
  event.preventDefault();
  saveProduct("Publicado");
});

function saveProduct(status) {
  const id = document.getElementById("edit-id").value;
  const product = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    url: document.getElementById("product-url").value.trim(),
    name: document.getElementById("product-name").value.trim(),
    price: document.getElementById("product-price").value,
    oldPrice: document.getElementById("product-old-price").value,
    category: document.getElementById("product-category").value,
    image: document.getElementById("product-image").value.trim(),
    description: document.getElementById("product-description").value.trim(),
    status
  };

  if (!product.name || !product.url || !product.category) {
    alert("Preencha o link, nome e categoria.");
    return;
  }

  if (id) {
    products = products.map(p => p.id === id ? product : p);
  } else {
    products.push(product);
  }

  persist();
  resetForm();
  showPage("products");
  alert(status === "Publicado" ? "Produto cadastrado como publicado no painel!" : "Rascunho salvo!");
}

function editProduct(id) {
  const p = products.find(p => p.id === id);
  if (!p) return;

  showPage("new");
  document.getElementById("form-title").textContent = "Editar achadinho";
  document.getElementById("edit-id").value = p.id;
  document.getElementById("product-url").value = p.url;
  document.getElementById("product-name").value = p.name;
  document.getElementById("product-price").value = p.price;
  document.getElementById("product-old-price").value = p.oldPrice;
  document.getElementById("product-category").value = p.category;
  document.getElementById("product-image").value = p.image;
  document.getElementById("product-description").value = p.description;
}

function deleteProduct(id) {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return;
  products = products.filter(p => p.id !== id);
  persist();
  renderProducts();
  renderDashboard();
}

function toggleStatus(id) {
  products = products.map(p => {
    if (p.id === id) {
      p.status = p.status === "Publicado" ? "Rascunho" : "Publicado";
    }
    return p;
  });
  persist();
  renderProducts();
  renderDashboard();
}

function resetForm() {
  document.getElementById("product-form").reset();
  document.getElementById("edit-id").value = "";
  document.getElementById("form-title").textContent = "Novo achadinho";
  document.getElementById("lookup-status").textContent = "Cole o link para começar.";
  renderCategoryOptions();
}

async function lookupProduct() {
  const url = document.getElementById("product-url").value.trim();
  const status = document.getElementById("lookup-status");

  if (!url.includes("mercadolivre.com.br") && !url.includes("mercadolibre.com")) {
    alert("Cole um link válido do Mercado Livre.");
    return;
  }

  status.textContent = "A consulta automática ainda precisa ser conectada ao servidor do Mercado Livre.";
}

function generateDescription() {
  const name = document.getElementById("product-name").value.trim();
  const price = document.getElementById("product-price").value;
  const category = document.getElementById("product-category").value;

  if (!name) {
    alert("Informe o nome do produto primeiro.");
    return;
  }

  document.getElementById("product-description").value =
    `✨ Conheça ${name}!\n\n` +
    `Uma ótima opção na categoria ${category || "achadinhos"} para quem procura praticidade e qualidade.\n\n` +
    (price ? `💰 Preço informado: ${money(price)}.\n\n` : "") +
    `🛒 Confira os detalhes e aproveite no Mercado Livre!\n\n` +
    `#TheoStore #Achadinhos #MercadoLivre`;
  alert("Descrição inicial criada. A geração com IA será conectada ao servidor posteriormente.");
}

renderDashboard();
