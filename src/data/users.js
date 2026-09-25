const bcrypt = require("bcryptjs");

// Almacen en memoria (simple, para fines academicos).
// En produccion esto se reemplazaria por una base de datos real (PostgreSQL, etc.)
const users = [
  {
    id: 1,
    username: "admin",
    // password: admin123
    passwordHash: bcrypt.hashSync("admin123", 8),
    role: "admin",
    sucursal: "Centro",
  },
];

let nextId = 2;

function findByUsername(username) {
  return users.find((u) => u.username === username);
}

function findById(id) {
  return users.find((u) => u.id === Number(id));
}

function createUser({ username, passwordHash, role, sucursal }) {
  const user = { id: nextId++, username, passwordHash, role, sucursal };
  users.push(user);
  return user;
}

function _resetForTests() {
  users.length = 1;
  nextId = 2;
}

module.exports = { users, findByUsername, findById, createUser, _resetForTests };
