// Almacen en memoria de insumos por sucursal (simple, para fines academicos).
let insumos = [
  { id: 1, nombre: "Camaron", sucursal: "Centro", cantidad: 25, unidad: "kg", stockMinimo: 10, caducidad: "2026-10-05" },
  { id: 2, nombre: "Pescado", sucursal: "Norte", cantidad: 8, unidad: "kg", stockMinimo: 10, caducidad: "2026-09-28" },
  { id: 3, nombre: "Pulpo", sucursal: "Sur", cantidad: 15, unidad: "kg", stockMinimo: 5, caducidad: "2026-10-10" },
];

let nextId = 4;

function findAll() {
  return insumos;
}

function findById(id) {
  return insumos.find((i) => i.id === Number(id));
}

function create({ nombre, sucursal, cantidad, unidad, stockMinimo, caducidad }) {
  const insumo = {
    id: nextId++,
    nombre,
    sucursal,
    cantidad: Number(cantidad),
    unidad,
    stockMinimo: Number(stockMinimo),
    caducidad,
  };
  insumos.push(insumo);
  return insumo;
}

function updateStock(id, cantidad) {
  const insumo = findById(id);
  if (!insumo) return null;
  insumo.cantidad = Number(cantidad);
  return insumo;
}

function remove(id) {
  const index = insumos.findIndex((i) => i.id === Number(id));
  if (index === -1) return false;
  insumos.splice(index, 1);
  return true;
}

function _resetForTests() {
  insumos = [
    { id: 1, nombre: "Camaron", sucursal: "Centro", cantidad: 25, unidad: "kg", stockMinimo: 10, caducidad: "2026-10-05" },
    { id: 2, nombre: "Pescado", sucursal: "Norte", cantidad: 8, unidad: "kg", stockMinimo: 10, caducidad: "2026-09-28" },
    { id: 3, nombre: "Pulpo", sucursal: "Sur", cantidad: 15, unidad: "kg", stockMinimo: 5, caducidad: "2026-10-10" },
  ];
  nextId = 4;
}

module.exports = { findAll, findById, create, updateStock, remove, _resetForTests };
