document.addEventListener("DOMContentLoaded", async () => {
  const headerButton = document.getElementById("my-store-button");
  if (!headerButton) return;

  try {
    const response = await fetch("/api/customer/me");
    const data = await response.json();

    if (!response.ok || !data.authenticated || !data.customer) return;

    const wrap = document.createElement("div");
    wrap.className = "customer-account";
    wrap.innerHTML = `
      <button type="button" class="customer-account-button" id="customer-account-button">
        ${String(data.customer.name || "Minha conta").replace(/[&<>"']/g, "")} ▾
      </button>
      <div class="customer-account-menu" id="customer-account-menu" hidden>
        <a href="/cadastro.html">Minha conta</a>
        <a href="/cadastro.html">Minha loja</a>
        <button type="button" id="customer-logout">Sair da conta</button>
      </div>
    `;

    headerButton.replaceWith(wrap);

    const toggle = wrap.querySelector("#customer-account-button");
    const menu = wrap.querySelector("#customer-account-menu");

    toggle.addEventListener("click", () => {
      menu.hidden = !menu.hidden;
    });

    wrap.querySelector("#customer-logout").addEventListener("click", async () => {
      await fetch("/api/customer/logout", {method:"POST"});
      location.reload();
    });

    document.addEventListener("click", event => {
      if (!wrap.contains(event.target)) menu.hidden = true;
    });
  } catch (error) {
    console.error("Não foi possível carregar a conta:", error);
  }
});
