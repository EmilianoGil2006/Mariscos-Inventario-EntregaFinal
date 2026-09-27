// Solicitud que una sucursal manda a CEDIS pidiendo un insumo.
// Estados posibles: "pendiente" -> "atendida" | "rechazada"

let solicitudes = [];
let nextId = 1;

function findAll() {
  return solicitudes;
}

function findById(id) {
  return solicitudes.find((s) => s.id === Number(id));
}

function findBySucursal(sucursal) {
  return solicitudes.filter((s) => s.sucursal === sucursal);
}

function create({ sucursal, categoria, nombre, cantidadKg, solicitadoPor }) {
  const solicitud = {
    id: nextId++,
    sucursal,
    categoria,
    nombre,
    cantidadKg: Number(cantidadKg),
    estado: "pendiente",
    solicitadoPor,
    fechaSolicitud: new Date().toISOString(),
    fechaAtencion: null,
    transferenciaId: null,
  };
  solicitudes.push(solicitud);
  return solicitud;
}

function marcarAtendida(id, transferenciaId) {
  const solicitud = findById(id);
  if (!solicitud) return null;
  solicitud.estado = "atendida";
  solicitud.fechaAtencion = new Date().toISOString();
  solicitud.transferenciaId = transferenciaId;
  return solicitud;
}

function marcarRechazada(id) {
  const solicitud = findById(id);
  if (!solicitud) return null;
  solicitud.estado = "rechazada";
  solicitud.fechaAtencion = new Date().toISOString();
  return solicitud;
}

function _resetForTests() {
  solicitudes = [];
  nextId = 1;
}

module.exports = {
  findAll,
  findById,
  findBySucursal,
  create,
  marcarAtendida,
  marcarRechazada,
  _resetForTests,
};
