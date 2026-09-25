const insumosDb = require("../data/insumos");

function listInsumos(req, res) {
  return res.status(200).json(insumosDb.findAll());
}

function getInsumo(req, res) {
  const insumo = insumosDb.findById(req.params.id);
  if (!insumo) {
    return res.status(404).json({ error: "Insumo no encontrado" });
  }
  return res.status(200).json(insumo);
}

// Solo el administrador puede dar de alta nuevos insumos en el catalogo
function createInsumo(req, res) {
  const { nombre, sucursal, cantidad, unidad, stockMinimo, caducidad } = req.body;

  if (!nombre || !sucursal || cantidad === undefined || !unidad) {
    return res.status(400).json({ error: "nombre, sucursal, cantidad y unidad son requeridos" });
  }

  const insumo = insumosDb.create({ nombre, sucursal, cantidad, unidad, stockMinimo: stockMinimo || 0, caducidad });
  return res.status(201).json(insumo);
}

// Cualquier usuario autenticado (admin o encargado) puede actualizar el stock
// al registrar entradas/salidas de inventario
function updateStock(req, res) {
  const { cantidad } = req.body;

  if (cantidad === undefined || Number.isNaN(Number(cantidad)) || Number(cantidad) < 0) {
    return res.status(400).json({ error: "cantidad debe ser un numero valido mayor o igual a 0" });
  }

  const insumo = insumosDb.updateStock(req.params.id, cantidad);
  if (!insumo) {
    return res.status(404).json({ error: "Insumo no encontrado" });
  }

  const alerta = insumo.cantidad <= insumo.stockMinimo ? "STOCK_BAJO" : null;
  return res.status(200).json({ insumo, alerta });
}

// Solo el administrador puede eliminar un insumo del catalogo
function deleteInsumo(req, res) {
  const deleted = insumosDb.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: "Insumo no encontrado" });
  }
  return res.status(204).send();
}

module.exports = { listInsumos, getInsumo, createInsumo, updateStock, deleteInsumo };
