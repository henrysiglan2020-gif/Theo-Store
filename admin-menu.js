cat > admin-menu.js <<'EOF'
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("admin-menu-button");
  const sidebar = document.getElementById("admin-sidebar");
  const overlay = document.getElementById("admin-menu-overlay");
  const closeButton = document.getElementById("admin-menu-close");

  if (!button || !sidebar || !overlay) {
    console.error("Elementos do menu não encontrados.");
    return;
  }

  button.hidden = false;

  function openMenu() {
    sidebar.classList.add("open");
    overlay.classList.add("open");
    sidebar.setAttribute("aria-hidden", "false");
    button.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
    sidebar.setAttribute("aria-hidden", "true");
    button.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  button.addEventListener("click", openMenu);

  if (closeButton) {
    closeButton.addEventListener("click", closeMenu);
  }

  overlay.addEventListener("click", closeMenu);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  sidebar.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });
});
EOF