const bcrypt = require("bcryptjs");

// Almacen en memoria (simple, para fines academicos).
// En produccion esto se reemplazaria por una base de datos real (PostgreSQL, etc.)
const seed = () => [
  {
    id: 1,
    username: "admin",
    passwordHash: bcrypt.hashSync("admin123", 8), // password: admin123
    role: "admin",
    sucursal: null, // el admin no pertenece a una sola sucursal, controla CEDIS y todas las sucursales
  },
  {
    id: 2,
    username: "encargado_centro",
    passwordHash: bcrypt.hashSync("clave123", 8), // password: clave123
    role: "encargado",
    sucursal: "Centro",
  },
  {
    id: 3,
    username: "encargado_norte",
    passwordHash: bcrypt.hashSync("clave123", 8),
    role: "encargado",
    sucursal: "Norte",
  },
  {
    id: 4,
    username: "encargado_sur",
    passwordHash: bcrypt.hashSync("clave123", 8),
    role: "encargado",
    sucursal: "Sur",
  },
];

let users = seed();
let nextId = 5;

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
  users = seed();
  nextId = 5;
}

module.exports = { findByUsername, findById, createUser, _resetForTests };
