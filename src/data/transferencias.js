// Bitacora de transferencias de insumos de CEDIS hacia una sucursal.
// Cada transferencia queda registrada aqui como historial (quien recibio que, cuanto y cuando).

let transferencias = [];
let nextId = 1;

function findAll() {
  return transferencias;
}

function findBySucursalDestino(sucursal) {
  return transferencias.filter((t) => t.destino === sucursal);
}

function create({ nombre, categoria, cantidadKg, destino, realizadaPor, solicitudId = null }) {
  const transferencia = {
    id: nextId++,
    nombre,
    categoria,
    cantidadKg: Number(cantidadKg),
    origen: "CEDIS",
    destino,
    realizadaPor,
    solicitudId,
    fecha: new Date().toISOString(),
  };
  transferencias.push(transferencia);
  return transferencia;
}

function _resetForTests() {
  transferencias = [];
  nextId = 1;
}

module.exports = { findAll, findBySucursalDestino, create, _resetForTests };
