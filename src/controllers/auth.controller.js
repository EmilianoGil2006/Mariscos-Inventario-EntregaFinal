const bcrypt = require("bcryptjs");
const usersDb = require("../data/users");
const { signToken } = require("../utils/jwt");

const VALID_ROLES = ["admin", "encargado"];

function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Usuario y contrasena son requeridos" });
  }

  const user = usersDb.findByUsername(username);
  if (!user) {
    return res.status(401).json({ error: "Credenciales invalidas" });
  }

  const passwordMatches = bcrypt.compareSync(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Credenciales invalidas" });
  }

  const token = signToken({ id: user.id, username: user.username, role: user.role });
  return res.status(200).json({
    token,
    user: { id: user.id, username: user.username, role: user.role, sucursal: user.sucursal },
  });
}

// Solo un administrador puede registrar nuevos usuarios (encargados de sucursal, etc.)
function register(req, res) {
  const { username, password, role, sucursal } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: "username, password y role son requeridos" });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Rol invalido. Roles permitidos: ${VALID_ROLES.join(", ")}` });
  }

  if (usersDb.findByUsername(username)) {
    return res.status(409).json({ error: "El nombre de usuario ya existe" });
  }

  const passwordHash = bcrypt.hashSync(password, 8);
  const user = usersDb.createUser({ username, passwordHash, role, sucursal });

  return res.status(201).json({
    user: { id: user.id, username: user.username, role: user.role, sucursal: user.sucursal },
  });
}

module.exports = { login, register };
