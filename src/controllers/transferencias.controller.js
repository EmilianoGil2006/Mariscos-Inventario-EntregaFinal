const insumosDb = require("../data/insumos");
const transferenciasDb = require("../data/transferencias");
const { transferirDeCedisASucursal, TransferError } = require("../services/inventoryTransfer");

// Solo el admin puede mover insumos de CEDIS a una sucursal "de golpe"
// (sin que exista una solicitud de por medio).
function crearTransferencia(req, res) {
  const { nombre, categoria, cantidadKg, destino } = req.body;

  if (!nombre || !categoria || !destino || cantidadKg === undefined) {
    return res.status(400).json({ error: "nombre, categoria, cantidadKg y destino son requeridos" });
  }
  if (!insumosDb.CATEGORIAS.includes(categoria)) {
    return res.status(400).json({ error: `categoria invalida. Validas: ${insumosDb.CATEGORIAS.join(", ")}` });
  }

  try {
    const { transferencia } = transferirDeCedisASucursal({
      nombre,
      categoria,
      cantidadKg,
      destino,
      realizadaPor: req.user.username,
    });
    return res.status(201).json(transferencia);
  } catch (err) {
    if (err instanceof TransferError) {
      const status = err.code === "STOCK_INSUFICIENTE" || err.code === "INSUMO_NO_ENCONTRADO" ? 409 : 400;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    throw err;
  }
}

// Admin ve todas las transferencias. Un encargado solo ve las que llegaron a su sucursal
// (esto es el "registro de insumos llegados a la sucursal").
function listarTransferencias(req, res) {
  const todas = transferenciasDb.findAll();
  const visibles = req.user.role === "admin" ? todas : todas.filter((t) => t.destino === req.user.sucursal);
  return res.status(200).json(visibles);
}

module.exports = { crearTransferencia, listarTransferencias };
