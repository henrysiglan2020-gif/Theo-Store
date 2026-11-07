
let products = [];
let categories = [];
let currentAdmin = null;
let currentPage = "dashboard";
let refreshing = false;

const PRODUCT_KEY = "theo_store_products";
const CATEGORY_KEY = "theo_store_categories";

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.body ? { "Content-Type": "application/json" } : {})
    }
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Não foi possível concluir a operação.");
  }

  return result;
}

// CARREGAR DADOS DO BANCO
async function refreshData() {
  const [newProducts, newCategories] = await Promise.all([
    apiRequest("/api/products"),
    apiRequest("/api/categories")
  ]);

  products = newProducts;
  categories = newCategories;

  renderCurrentPage();
}

function renderCurrentPage() {
  if (currentPage === "dashboard") renderDashboard();
  if (currentPage === "products") renderProducts();
  if (currentPage === "categories") renderCategories();
  if (currentPage === "new") renderCategoryOptions();
}

// MIGRAR OS DADOS ANTIGOS DO NAVEGADOR
async function migrateOldData() {
  const oldProducts = JSON.parse(
    localStorage.getItem(PRODUCT_KEY) || "[]"
  );

  const oldCategories = JSON.parse(
    localStorage.getItem(CATEGORY_KEY) ||
    '["Tecnologia","Games","Casa","Moda","Beleza","Outros"]'
  );

  await apiRequest("/api/migrate-local", {
    method: "POST",
    body: JSON.stringify({
      products: oldProducts,
      categories: oldCategories
    })
  });
}

// VERIFICAR ACESSO
async function checkAccess() {
  try {
    const result = await apiRequest("/api/me");

    if (!result.authenticated) {
      window.location.href = "/login";
      return false;
    }

    currentAdmin = result.admin;

    if (currentAdmin.role === "owner") {
      document.getElementById("admins-nav").hidden = false;
    }

    return true;
  } catch {
    window.location.href = "/login";
    return false;
  }
}

function showPage(page) {
  if (page === "admins" && currentAdmin?.role !== "owner") {
    alert("Somente o dono pode gerenciar administradores.");
    return;
  }

  currentPage = page;

  document.querySelectorAll(".page").forEach(el => {
    el.classList.add("hidden");
  });

  document.getElementById(page).classList.remove("hidden");

  document.querySelectorAll(".nav[data-page]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  const titles = {
    dashboard: "Visão geral",
    products: "Produtos",
    categories: "Categorias",
    new: "Novo achadinho",
    admins: "Administradores"
  };

  document.getElementById("page-title").textContent = titles[page];

  renderCurrentPage();

  if (page === "admins") renderAdmins();
}

document.querySelectorAll(".nav[data-page]").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

// SAIR
document.getElementById("logout-button").addEventListener("click", async () => {
  try {
    await apiRequest("/api/logout", { method: "POST" });
    window.location.href = "/login";
  } catch (error) {
    alert(error.message);
  }
});

// PRODUTOS
function productHTML(p) {
  return `
    <div class="product-row">
      <img src="${escapeHTML(p.image || "")}" alt=""
        onerror="this.style.display='none'">
      <div class="product-info">
        <strong>${escapeHTML(p.name)}</strong>
        <small>
          ${money(p.price)} · ${escapeHTML(p.category)} · ${escapeHTML(p.status)}
        </small>
      </div>
      <div class="product-actions">
        <button onclick="editProduct('${escapeHTML(p.id)}')">Editar</button>
        <button onclick="toggleStatus('${escapeHTML(p.id)}')">
          ${p.status === "Publicado" ? "Rascunho" : "Publicar"}
        </button>
        <button class="delete-button" onclick="deleteProduct('${escapeHTML(p.id)}')">
          Excluir
        </button>
      </div>
    </div>
  `;
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
    String(p.name || "").toLowerCase().includes(search) ||
    String(p.category || "").toLowerCase().includes(search)
  );

  document.getElementById("all-products").innerHTML = filtered.length
    ? filtered.map(productHTML).join("")
    : '<p class="empty">Nenhum produto encontrado.</p>';
}

// CATEGORIAS
function renderCategories() {
  document.getElementById("category-list").innerHTML =
    categories.map(cat => `
      <div class="category-row">
        <strong>${escapeHTML(cat)}</strong>
        <button class="delete-button"
          onclick="deleteCategory('${encodeURIComponent(cat)}')">
          Excluir
        </button>
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

// ADICIONAR CATEGORIA
document.getElementById("category-form").addEventListener("submit", async event => {
  event.preventDefault();

  const input = document.getElementById("category-name");
  const name = input.value.trim();

  if (!name) return;

  try {
    await apiRequest("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name })
    });

    input.value = "";
    await refreshData();
    alert("Categoria cadastrada!");
  } catch (error) {
    alert(error.message);
  }
});

// EXCLUIR CATEGORIA
async function deleteCategory(encodedName) {
  const name = decodeURIComponent(encodedName);

  if (!confirm(`Excluir a categoria ${name}?`)) return;

  try {
    await apiRequest(`/api/categories/${encodeURIComponent(name)}`, {
      method: "DELETE"
    });

    await refreshData();
    alert("Categoria excluída!");
  } catch (error) {
    alert(error.message);
  }
}

// CADASTRAR PRODUTO
document.getElementById("product-form").addEventListener("submit", async event => {
  event.preventDefault();
  await saveProduct("Publicado");
});

async function saveProduct(status) {
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

  try {
    await apiRequest(
      id ? `/api/products/${encodeURIComponent(id)}` : "/api/products",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(product)
      }
    );

    await refreshData();
    resetForm();
    showPage("products");

    alert(status === "Publicado"
      ? "Produto cadastrado como publicado!"
      : "Rascunho salvo!");
  } catch (error) {
    alert(error.message);
  }
}

// EDITAR PRODUTO
function editProduct(id) {
  const p = products.find(p => p.id === id);
  if (!p) return;

  showPage("new");

  document.getElementById("form-title").textContent = "Editar achadinho";
  document.getElementById("edit-id").value = p.id;
  document.getElementById("product-url").value = p.url || "";
  document.getElementById("product-name").value = p.name || "";
  document.getElementById("product-price").value = p.price || "";
  document.getElementById("product-old-price").value = p.oldPrice || "";

  renderCategoryOptions();
  document.getElementById("product-category").value = p.category || "";

  document.getElementById("product-image").value = p.image || "";
  document.getElementById("product-description").value = p.description || "";
}

// EXCLUIR PRODUTO
async function deleteProduct(id) {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return;

  try {
    await apiRequest(`/api/products/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    await refreshData();
    alert("Produto excluído!");
  } catch (error) {
    alert(error.message);
  }
}

// ALTERAR STATUS
async function toggleStatus(id) {
  try {
    await apiRequest(`/api/products/${encodeURIComponent(id)}/status`, {
      method: "PATCH"
    });

    await refreshData();
  } catch (error) {
    alert(error.message);
  }
}

// LIMPAR FORMULÁRIO
function resetForm() {
  document.getElementById("product-form").reset();
  document.getElementById("edit-id").value = "";
  document.getElementById("form-title").textContent = "Novo achadinho";
  document.getElementById("lookup-status").textContent =
    "Cole o link para começar.";

  renderCategoryOptions();
}

// CONSULTA DO MERCADO LIVRE
async function lookupProduct() {
  const url = document.getElementById("product-url").value.trim();
  const status = document.getElementById("lookup-status");

  if (!url.includes("mercadolivre.com.br") &&
      !url.includes("mercadolibre.com")) {
    alert("Cole um link válido do Mercado Livre.");
    return;
  }

  status.textContent =
    "A consulta automática ainda precisa ser conectada ao servidor do Mercado Livre.";
}

// GERAR DESCRIÇÃO
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
    `Uma opção na categoria ${category || "achadinhos"}.\n\n` +
    (price ? `💰 Preço informado: ${money(price)}.\n\n` : "") +
    `🛒 Confira os detalhes no Mercado Livre!\n\n` +
    `#TheoStore #Achadinhos #MercadoLivre`;

  alert("Descrição inicial criada. A geração com IA será conectada posteriormente.");
}

// ADMINISTRADORES
async function renderAdmins() {
  if (currentAdmin?.role !== "owner") return;

  const list = document.getElementById("admin-list");
  list.innerHTML = "<p>Carregando...</p>";

  try {
    const admins = await apiRequest("/api/admins");

    list.innerHTML = admins.map(admin => {
      const isOwner = admin.role === "owner";

      return `
        <div class="category-row">
          <div>
            <strong>${escapeHTML(admin.username)}</strong>
            <small>${isOwner ? "Dono principal" : "Administrador"}</small>
          </div>
          ${
            isOwner
              ? '<span class="admin">● DONO</span>'
              : `<button class="delete-button"
                  onclick="removeAdmin('${encodeURIComponent(admin.username)}')">
                  Remover acesso
                </button>`
          }
        </div>
      `;
    }).join("") || '<p class="empty">Nenhum administrador cadastrado.</p>';
  } catch (error) {
    list.innerHTML = `<p class="empty">${escapeHTML(error.message)}</p>`;
  }
}

document.getElementById("admin-form").addEventListener("submit", async event => {
  event.preventDefault();

  if (currentAdmin?.role !== "owner") {
    alert("Somente o dono pode adicionar administradores.");
    return;
  }

  const username = document.getElementById("admin-username").value.trim();
  const password = document.getElementById("admin-password").value;
  const message = document.getElementById("admin-message");

  message.textContent = "Cadastrando administrador...";

  try {
    await apiRequest("/api/admins", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    message.textContent = "Administrador cadastrado com sucesso!";
    document.getElementById("admin-form").reset();
    await renderAdmins();
  } catch (error) {
    message.textContent = error.message;
  }
});

async function removeAdmin(encodedUsername) {
  if (currentAdmin?.role !== "owner") return;

  const username = decodeURIComponent(encodedUsername);

  if (!confirm(`Tem certeza que deseja remover o acesso de ${username}?`)) {
    return;
  }

  try {
    await apiRequest(`/api/admins/${encodeURIComponent(username)}`, {
      method: "DELETE"
    });

    alert("Acesso do administrador removido.");
    await renderAdmins();
  } catch (error) {
    alert(error.message);
  }
}

// ATUALIZAÇÃO AUTOMÁTICA PARA TODOS
async function automaticRefresh() {
  if (refreshing || document.hidden) return;

  refreshing = true;

  try {
    await refreshData();
  } catch (error) {
    console.error("Erro ao sincronizar dados:", error);
  } finally {
    refreshing = false;
  }
}

// INICIALIZAÇÃO
(async function init() {
  const allowed = await checkAccess();
  if (!allowed) return;

  try {
    await migrateOldData();
    await refreshData();

    renderAdmins();

    // Atualiza os dados compartilhados a cada 5 segundos.
    setInterval(automaticRefresh, 5000);
  } catch (error) {
    alert("Erro ao carregar o banco de dados: " + error.message);
  }
})();
