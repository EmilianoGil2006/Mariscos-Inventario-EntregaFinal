// Almacen en memoria de insumos (simple, para fines academicos).
// CEDIS = almacen central del que salen los insumos hacia las sucursales.
// Todo se maneja en kilogramos (kg).

const CATEGORIAS = ["proteinas", "verduras", "bebidas"];
const SUCURSALES_DESTINO = ["Centro", "Norte", "Sur"]; // sucursales de venta (sin contar CEDIS)
const SUCURSAL_CEDIS = "CEDIS";

const seed = () => [
  // ---- CEDIS (almacen central) ----
  { id: 1, nombre: "Camaron", categoria: "proteinas", sucursal: "CEDIS", cantidadKg: 200, stockMinimo: 50, caducidad: "2026-10-15" },
  { id: 2, nombre: "Pescado", categoria: "proteinas", sucursal: "CEDIS", cantidadKg: 150, stockMinimo: 40, caducidad: "2026-10-08" },
  { id: 3, nombre: "Pulpo", categoria: "proteinas", sucursal: "CEDIS", cantidadKg: 80, stockMinimo: 20, caducidad: "2026-10-20" },
  { id: 4, nombre: "Verduras mixtas", categoria: "verduras", sucursal: "CEDIS", cantidadKg: 120, stockMinimo: 30, caducidad: "2026-10-05" },
  { id: 5, nombre: "Refrescos", categoria: "bebidas", sucursal: "CEDIS", cantidadKg: 300, stockMinimo: 50, caducidad: null },

  // ---- Sucursales (ya con algo de inventario) ----
  { id: 6, nombre: "Camaron", categoria: "proteinas", sucursal: "Centro", cantidadKg: 25, stockMinimo: 10, caducidad: "2026-10-05" },
  { id: 7, nombre: "Pescado", categoria: "proteinas", sucursal: "Norte", cantidadKg: 8, stockMinimo: 10, caducidad: "2026-09-28" },
  { id: 8, nombre: "Pulpo", categoria: "proteinas", sucursal: "Sur", cantidadKg: 15, stockMinimo: 5, caducidad: "2026-10-10" },
  { id: 9, nombre: "Verduras mixtas", categoria: "verduras", sucursal: "Centro", cantidadKg: 12, stockMinimo: 5, caducidad: "2026-10-01" },
  { id: 10, nombre: "Refrescos", categoria: "bebidas", sucursal: "Norte", cantidadKg: 30, stockMinimo: 10, caducidad: null },
];

let insumos = seed();
let nextId = 11;

function findAll() {
  return insumos;
}

function findById(id) {
  return insumos.find((i) => i.id === Number(id));
}

// Busca un insumo por nombre+categoria dentro de una sucursal especifica
// (usado para saber si ya existe stock de "Camaron/proteinas" en una sucursal
// al recibir una transferencia, o para localizarlo en CEDIS).
function findByNombreCategoriaSucursal(nombre, categoria, sucursal) {
  const nombreNorm = nombre.trim().toLowerCase();
  return insumos.find(
    (i) =>
      i.nombre.trim().toLowerCase() === nombreNorm &&
      i.categoria === categoria &&
      i.sucursal === sucursal
  );
}

function create({ nombre, categoria, sucursal, cantidadKg, stockMinimo, caducidad }) {
  const insumo = {
    id: nextId++,
    nombre,
    categoria,
    sucursal,
    cantidadKg: Number(cantidadKg),
    stockMinimo: Number(stockMinimo) || 0,
    caducidad: caducidad || null,
  };
  insumos.push(insumo);
  return insumo;
}

function updateStock(id, cantidadKg) {
  const insumo = findById(id);
  if (!insumo) return null;
  insumo.cantidadKg = Number(cantidadKg);
  return insumo;
}

// Ajusta (suma o resta) la cantidad de un insumo ya existente por su id.
// Se usa internamente al mover stock entre CEDIS y sucursales.
function adjustStock(id, deltaKg) {
  const insumo = findById(id);
  if (!insumo) return null;
  insumo.cantidadKg = Number((insumo.cantidadKg + deltaKg).toFixed(2));
  return insumo;
}

function remove(id) {
  const index = insumos.findIndex((i) => i.id === Number(id));
  if (index === -1) return false;
  insumos.splice(index, 1);
  return true;
}

function _resetForTests() {
  insumos = seed();
  nextId = 11;
}

module.exports = {
  CATEGORIAS,
  SUCURSALES_DESTINO,
  SUCURSAL_CEDIS,
  findAll,
  findById,
  findByNombreCategoriaSucursal,
  create,
  updateStock,
  adjustStock,
  remove,
  _resetForTests,
};
