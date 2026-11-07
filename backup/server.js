
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

const DATA_DIR = path.join(__dirname, "data");
const ADMINS_FILE = path.join(DATA_DIR, "admins.json");
const DB_FILE = path.join(DATA_DIR, "theostore.db");

if (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD) {
  throw new Error("Configure SESSION_SECRET e ADMIN_PASSWORD no .env");
}

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY
  );
`);

const defaultCategories = [
  "Tecnologia",
  "Games",
  "Casa",
  "Moda",
  "Beleza",
  "Outros"
];

const insertCategory = db.prepare(
  "INSERT OR IGNORE INTO categories (name) VALUES (?)"
);

for (const category of defaultCategories) {
  insertCategory.run(category);
}

function readAdmins() {
  if (!fs.existsSync(ADMINS_FILE)) {
    const owner = {
      username: "Dono",
      password: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12),
      role: "owner"
    };

    fs.writeFileSync(ADMINS_FILE, JSON.stringify([owner], null, 2));
  }

  return JSON.parse(fs.readFileSync(ADMINS_FILE, "utf8"));
}

function saveAdmins(admins) {
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
}

app.use(express.json({ limit: "2mb" }));

app.use(session({
  name: "theostore.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Acesso não autorizado." });
  }
  next();
}

function requireOwner(req, res, next) {
  if (!req.session.admin || req.session.admin.role !== "owner") {
    return res.status(403).json({
      error: "Somente o dono pode fazer isso."
    });
  }
  next();
}

// LOGIN DO DONO E DOS ADMINISTRADORES
app.post("/api/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = req.body.password;

  if (typeof password !== "string" || !password) {
    return res.status(400).json({ error: "Digite a senha." });
  }

  let account = null;

  if (password === process.env.ADMIN_PASSWORD) {
    account = {
      username: "Dono",
      role: "owner"
    };
  } else if (username) {
    const admins = readAdmins();
    const found = admins.find(
      admin => admin.username === username && admin.role !== "owner"
    );

    if (found && await bcrypt.compare(password, found.password)) {
      account = {
        username: found.username,
        role: "admin"
      };
    }
  }

  if (!account) {
    return res.status(401).json({
      error: "Usuário ou senha incorretos."
    });
  }

  req.session.regenerate(err => {
    if (err) {
      return res.status(500).json({ error: "Erro ao entrar." });
    }

    req.session.admin = account;
    res.json({ success: true, admin: account });
  });
});

// VERIFICAR SESSÃO
app.get("/api/me", (req, res) => {
  res.json({
    authenticated: !!req.session.admin,
    admin: req.session.admin || null
  });
});

// SAIR
app.post("/api/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("theostore.sid");
    res.json({ success: true });
  });
});

// ADMINISTRADORES
app.get("/api/admins", requireOwner, (req, res) => {
  const admins = readAdmins().map(admin => ({
    username: admin.username,
    role: admin.role
  }));

  res.json(admins);
});

app.post("/api/admins", requireOwner, async (req, res) => {
  const { username, password } = req.body;

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !/^[a-zA-Z0-9_-]{3,24}$/.test(username) ||
    username.toLowerCase() === "dono" ||
    password.length < 10
  ) {
    return res.status(400).json({
      error: "Use um usuário válido e senha com pelo menos 10 caracteres."
    });
  }

  const admins = readAdmins();

  if (admins.some(a => a.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: "Esse usuário já existe." });
  }

  admins.push({
    username,
    password: await bcrypt.hash(password, 12),
    role: "admin"
  });

  saveAdmins(admins);
  res.json({ success: true });
});

app.delete("/api/admins/:username", requireOwner, (req, res) => {
  const admins = readAdmins();
  const target = admins.find(a => a.username === req.params.username);

  if (!target) {
    return res.status(404).json({
      error: "Administrador não encontrado."
    });
  }

  if (target.role === "owner") {
    return res.status(403).json({
      error: "O dono não pode ser removido."
    });
  }

  saveAdmins(admins.filter(a => a.username !== target.username));
  res.json({ success: true });
});

// PRODUTOS
app.get("/api/products", requireAdmin, (req, res) => {
  const rows = db.prepare(
    "SELECT data FROM products ORDER BY rowid DESC"
  ).all();

  res.json(rows.map(row => JSON.parse(row.data)));
});

app.post("/api/products", requireAdmin, (req, res) => {
  const product = req.body;

  if (!product || !product.id || !product.name || !product.category) {
    return res.status(400).json({
      error: "Preencha os dados obrigatórios do produto."
    });
  }

  db.prepare(`
    INSERT INTO products (id, data, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      data = excluded.data,
      updated_at = CURRENT_TIMESTAMP
  `).run(String(product.id), JSON.stringify(product));

  res.json({ success: true });
});

app.put("/api/products/:id", requireAdmin, (req, res) => {
  const product = req.body;

  if (
    !product ||
    String(product.id) !== req.params.id ||
    !product.name ||
    !product.category
  ) {
    return res.status(400).json({
      error: "Dados inválidos para atualizar o produto."
    });
  }

  const result = db.prepare(`
    UPDATE products
    SET data = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(JSON.stringify(product), req.params.id);

  if (!result.changes) {
    return res.status(404).json({ error: "Produto não encontrado." });
  }

  res.json({ success: true });
});

app.patch("/api/products/:id/status", requireAdmin, (req, res) => {
  const row = db.prepare(
    "SELECT data FROM products WHERE id = ?"
  ).get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: "Produto não encontrado." });
  }

  const product = JSON.parse(row.data);
  product.status = product.status === "Publicado" ? "Rascunho" : "Publicado";

  db.prepare(`
    UPDATE products
    SET data = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(JSON.stringify(product), req.params.id);

  res.json({ success: true });
});

app.delete("/api/products/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// CATEGORIAS
app.get("/api/categories", requireAdmin, (req, res) => {
  const rows = db.prepare(
    "SELECT name FROM categories ORDER BY rowid ASC"
  ).all();

  res.json(rows.map(row => row.name));
});

app.post("/api/categories", requireAdmin, (req, res) => {
  const name = String(req.body.name || "").trim();

  if (!name || name.length > 40) {
    return res.status(400).json({
      error: "Digite um nome de categoria válido."
    });
  }

  try {
    db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
    res.json({ success: true });
  } catch {
    res.status(409).json({ error: "Essa categoria já existe." });
  }
});

app.delete("/api/categories/:name", requireAdmin, (req, res) => {
  const name = decodeURIComponent(req.params.name);

  const product = db.prepare(
    "SELECT id FROM products WHERE json_extract(data, '$.category') = ? LIMIT 1"
  ).get(name);

  if (product) {
    return res.status(400).json({
      error: "Essa categoria possui produtos. Mude a categoria desses produtos antes de excluí-la."
    });
  }

  db.prepare("DELETE FROM categories WHERE name = ?").run(name);
  res.json({ success: true });
});

// MIGRAÇÃO DOS DADOS ANTIGOS DO NAVEGADOR
app.post("/api/migrate-local", requireAdmin, (req, res) => {
  const products = Array.isArray(req.body.products)
    ? req.body.products
    : [];

  const categories = Array.isArray(req.body.categories)
    ? req.body.categories
    : [];

  const migrate = db.transaction(() => {
    const productCount = db.prepare(
      "SELECT COUNT(*) AS total FROM products"
    ).get().total;

    if (productCount === 0) {
      const insertProduct = db.prepare(`
        INSERT OR IGNORE INTO products (id, data)
        VALUES (?, ?)
      `);

      for (const product of products) {
        if (product && product.id && product.name) {
          insertProduct.run(String(product.id), JSON.stringify(product));
        }
      }
    }

    for (const category of categories) {
      if (typeof category === "string" && category.trim()) {
        insertCategory.run(category.trim());
      }
    }
  });

  migrate();
  res.json({ success: true });
});

// PROTEGER A CENTRAL
app.get(["/central", "/central.html"], requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "central.html"));
});

// LOGIN
app.get("/login", (req, res) => {
  if (req.session.admin) return res.redirect("/central");
  res.sendFile(path.join(__dirname, "login.html"));
});

// BLOQUEAR ACESSO AOS ARQUIVOS INTERNOS
app.use("/data", (req, res) => {
  res.sendStatus(404);
});

// ARQUIVOS PÚBLICOS DO SITE
app.use(express.static(__dirname, {
  index: "index.html",
  dotfiles: "deny"
}));

app.listen(PORT, () => {
  console.log(`THEO STORE funcionando na porta ${PORT}`);
  console.log(`Banco de dados: ${DB_FILE}`);
});
