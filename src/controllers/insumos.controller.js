const insumosDb = require("../data/insumos");

// Un encargado solo puede ver/tocar los insumos de SU sucursal.
// El admin ve y controla todo (incluyendo CEDIS).
function puedeVer(user, insumo) {
  if (user.role === "admin") return true;
  return insumo.sucursal === user.sucursal;
}

function listInsumos(req, res) {
  const todos = insumosDb.findAll();
  const visibles = todos.filter((i) => puedeVer(req.user, i));
  return res.status(200).json(visibles);
}

function getInsumo(req, res) {
  const insumo = insumosDb.findById(req.params.id);
  if (!insumo) {
    return res.status(404).json({ error: "Insumo no encontrado" });
  }
  if (!puedeVer(req.user, insumo)) {
    return res.status(403).json({ error: "No tienes acceso a este insumo" });
  }
  return res.status(200).json(insumo);
}

// Solo el administrador puede dar de alta nuevos insumos (en CEDIS o en una sucursal)
function createInsumo(req, res) {
  const { nombre, categoria, sucursal, cantidadKg, stockMinimo, caducidad } = req.body;

  if (!nombre || !categoria || !sucursal || cantidadKg === undefined) {
    return res.status(400).json({ error: "nombre, categoria, sucursal y cantidadKg son requeridos" });
  }

  if (!insumosDb.CATEGORIAS.includes(categoria)) {
    return res.status(400).json({ error: `categoria invalida. Validas: ${insumosDb.CATEGORIAS.join(", ")}` });
  }

  const sucursalesValidas = [insumosDb.SUCURSAL_CEDIS, ...insumosDb.SUCURSALES_DESTINO];
  if (!sucursalesValidas.includes(sucursal)) {
    return res.status(400).json({ error: `sucursal invalida. Validas: ${sucursalesValidas.join(", ")}` });
  }

  const insumo = insumosDb.create({
    nombre,
    categoria,
    sucursal,
    cantidadKg,
    stockMinimo: stockMinimo || 0,
    caducidad,
  });
  return res.status(201).json(insumo);
}

// El admin puede actualizar cualquier stock (incluyendo CEDIS).
// Un encargado solo puede actualizar stock de insumos de SU propia sucursal
// (esto representa el consumo/uso del insumo en su cocina).
function updateStock(req, res) {
  const { cantidadKg } = req.body;

  if (cantidadKg === undefined || Number.isNaN(Number(cantidadKg)) || Number(cantidadKg) < 0) {
    return res.status(400).json({ error: "cantidadKg debe ser un numero valido mayor o igual a 0" });
  }

  const insumo = insumosDb.findById(req.params.id);
  if (!insumo) {
    return res.status(404).json({ error: "Insumo no encontrado" });
  }
  if (!puedeVer(req.user, insumo)) {
    return res.status(403).json({ error: "No puedes modificar el stock de otra sucursal" });
  }

  const actualizado = insumosDb.updateStock(req.params.id, cantidadKg);
  const alerta = actualizado.cantidadKg <= actualizado.stockMinimo ? "STOCK_BAJO" : null;
  return res.status(200).json({ insumo: actualizado, alerta });
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
