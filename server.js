require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const ADMINS_FILE = path.join(DATA_DIR, "admins.json");

if (!process.env.SESSION_SECRET ||
    !process.env.OWNER_USERNAME ||
    !process.env.OWNER_PASSWORD) {
  throw new Error("Configure SESSION_SECRET, OWNER_USERNAME e OWNER_PASSWORD no .env");
}

fs.mkdirSync(DATA_DIR, { recursive: true });

function readAdmins() {
  if (!fs.existsSync(ADMINS_FILE)) {
    const owner = {
      username: process.env.OWNER_USERNAME,
      password: bcrypt.hashSync(process.env.OWNER_PASSWORD, 12),
      role: "owner"
    };

    fs.writeFileSync(ADMINS_FILE, JSON.stringify([owner], null, 2));
  }

  return JSON.parse(fs.readFileSync(ADMINS_FILE, "utf8"));
}

function saveAdmins(admins) {
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
}

app.use(express.json());

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
    return res.status(403).json({ error: "Somente o dono pode fazer isso." });
  }
  next();
}

// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Preencha os dados." });
  }

  const admins = readAdmins();
  const admin = admins.find(a => a.username === username);

  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    return res.status(401).json({ error: "Usuário ou senha incorretos." });
  }

  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Erro ao entrar." });

    req.session.admin = {
      username: admin.username,
      role: admin.role
    };

    res.json({ success: true });
  });
});

// Verificar sessão
app.get("/api/me", (req, res) => {
  res.json({
    authenticated: !!req.session.admin,
    admin: req.session.admin || null
  });
});

// Sair
app.post("/api/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("theostore.sid");
    res.json({ success: true });
  });
});

// Listar administradores
app.get("/api/admins", requireOwner, (req, res) => {
  const admins = readAdmins().map(a => ({
    username: a.username,
    role: a.role
  }));

  res.json(admins);
});

// Adicionar administrador
app.post("/api/admins", requireOwner, async (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== "string" ||
      typeof password !== "string" ||
      !/^[a-zA-Z0-9_-]{3,24}$/.test(username) ||
      password.length < 10) {
    return res.status(400).json({
      error: "Use um usuário válido e senha com pelo menos 10 caracteres."
    });
  }

  const admins = readAdmins();

  if (admins.some(a => a.username === username)) {
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

// Remover administrador
app.delete("/api/admins/:username", requireOwner, (req, res) => {
  const admins = readAdmins();
  const target = admins.find(a => a.username === req.params.username);

  if (!target) {
    return res.status(404).json({ error: "Administrador não encontrado." });
  }

  if (target.role === "owner") {
    return res.status(403).json({ error: "O dono não pode ser removido." });
  }

  saveAdmins(admins.filter(a => a.username !== target.username));
  res.json({ success: true });
});

// Proteger a central
app.get(["/central", "/central.html"], requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "central.html"));
});

// Página de login
app.get("/login", (req, res) => {
  if (req.session.admin) return res.redirect("/central");
  res.sendFile(path.join(__dirname, "login.html"));
});

// Arquivos públicos do site
app.use(express.static(__dirname, { index: "index.html" }));

app.listen(PORT, () => {
  console.log(`THEO STORE funcionando na porta ${PORT}`);
});