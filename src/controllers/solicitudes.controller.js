const insumosDb = require("../data/insumos");
const solicitudesDb = require("../data/solicitudes");
const { transferirDeCedisASucursal, TransferError } = require("../services/inventoryTransfer");

// Un encargado solicita un insumo para SU sucursal. Se ignora cualquier
// "sucursal" que venga en el body: siempre se usa la del usuario autenticado.
function crearSolicitud(req, res) {
  const { categoria, nombre, cantidadKg } = req.body;

  if (req.user.role !== "encargado") {
    return res.status(403).json({ error: "Solo un encargado de sucursal puede generar solicitudes a CEDIS" });
  }
  if (!categoria || !nombre || cantidadKg === undefined) {
    return res.status(400).json({ error: "categoria, nombre y cantidadKg son requeridos" });
  }
  if (!insumosDb.CATEGORIAS.includes(categoria)) {
    return res.status(400).json({ error: `categoria invalida. Validas: ${insumosDb.CATEGORIAS.join(", ")}` });
  }
  if (Number(cantidadKg) <= 0) {
    return res.status(400).json({ error: "cantidadKg debe ser mayor a 0" });
  }

  const solicitud = solicitudesDb.create({
    sucursal: req.user.sucursal,
    categoria,
    nombre,
    cantidadKg,
    solicitadoPor: req.user.username,
  });
  return res.status(201).json(solicitud);
}

// Admin ve todas las solicitudes (para poder atenderlas).
// Un encargado solo ve las de su propia sucursal.
function listarSolicitudes(req, res) {
  const todas = solicitudesDb.findAll();
  const visibles =
    req.user.role === "admin" ? todas : todas.filter((s) => s.sucursal === req.user.sucursal);
  return res.status(200).json(visibles);
}

// Solo el admin atiende solicitudes: al atenderla se dispara la transferencia
// real de CEDIS hacia la sucursal que la pidio.
function atenderSolicitud(req, res) {
  const solicitud = solicitudesDb.findById(req.params.id);
  if (!solicitud) {
    return res.status(404).json({ error: "Solicitud no encontrada" });
  }
  if (solicitud.estado !== "pendiente") {
    return res.status(409).json({ error: `La solicitud ya fue ${solicitud.estado}` });
  }

  const cantidadAEnviar = req.body.cantidadKg !== undefined ? req.body.cantidadKg : solicitud.cantidadKg;

  try {
    const { transferencia } = transferirDeCedisASucursal({
      nombre: solicitud.nombre,
      categoria: solicitud.categoria,
      cantidadKg: cantidadAEnviar,
      destino: solicitud.sucursal,
      realizadaPor: req.user.username,
      solicitudId: solicitud.id,
    });
    const solicitudActualizada = solicitudesDb.marcarAtendida(solicitud.id, transferencia.id);
    return res.status(200).json({ solicitud: solicitudActualizada, transferencia });
  } catch (err) {
    if (err instanceof TransferError) {
      const status = err.code === "STOCK_INSUFICIENTE" || err.code === "INSUMO_NO_ENCONTRADO" ? 409 : 400;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
}

function rechazarSolicitud(req, res) {
  const solicitud = solicitudesDb.findById(req.params.id);
  if (!solicitud) {
    return res.status(404).json({ error: "Solicitud no encontrada" });
  }
  if (solicitud.estado !== "pendiente") {
    return res.status(409).json({ error: `La solicitud ya fue ${solicitud.estado}` });
  }
  const actualizada = solicitudesDb.marcarRechazada(solicitud.id);
  return res.status(200).json(actualizada);
}

module.exports = { crearSolicitud, listarSolicitudes, atenderSolicitud, rechazarSolicitud };
