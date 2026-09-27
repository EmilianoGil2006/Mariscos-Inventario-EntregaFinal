const insumosDb = require("../data/insumos");
const transferenciasDb = require("../data/transferencias");

class TransferError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // "INSUMO_NO_ENCONTRADO" | "STOCK_INSUFICIENTE" | "SUCURSAL_INVALIDA"
  }
}

// Mueve `cantidadKg` de un insumo (nombre + categoria) de CEDIS hacia una
// sucursal destino: resta del CEDIS y suma (o crea) el insumo en la sucursal.
// Si algo falla (no hay suficiente stock, no existe en CEDIS), no modifica nada.
function transferirDeCedisASucursal({ nombre, categoria, cantidadKg, destino, realizadaPor, solicitudId = null }) {
  const cantidad = Number(cantidadKg);

  if (!insumosDb.SUCURSALES_DESTINO.includes(destino)) {
    throw new TransferError("SUCURSAL_INVALIDA", `Sucursal destino invalida: ${destino}`);
  }
  if (!cantidad || cantidad <= 0) {
    throw new TransferError("CANTIDAD_INVALIDA", "La cantidad a transferir debe ser mayor a 0");
  }

  const origenCedis = insumosDb.findByNombreCategoriaSucursal(nombre, categoria, insumosDb.SUCURSAL_CEDIS);
  if (!origenCedis) {
    throw new TransferError("INSUMO_NO_ENCONTRADO", `"${nombre}" (${categoria}) no existe en CEDIS`);
  }
  if (origenCedis.cantidadKg < cantidad) {
    throw new TransferError(
      "STOCK_INSUFICIENTE",
      `Stock insuficiente en CEDIS: hay ${origenCedis.cantidadKg} kg de ${origenCedis.nombre}, se pidieron ${cantidad} kg`
    );
  }

  // Resta de CEDIS
  insumosDb.adjustStock(origenCedis.id, -cantidad);

  // Suma en la sucursal destino (o crea el insumo si es la primera vez que llega ahi)
  let destinoInsumo = insumosDb.findByNombreCategoriaSucursal(nombre, categoria, destino);
  if (destinoInsumo) {
    insumosDb.adjustStock(destinoInsumo.id, cantidad);
  } else {
    destinoInsumo = insumosDb.create({
      nombre: origenCedis.nombre,
      categoria,
      sucursal: destino,
      cantidadKg: cantidad,
      stockMinimo: origenCedis.stockMinimo > 0 ? Math.min(origenCedis.stockMinimo, cantidad) : 0,
      caducidad: origenCedis.caducidad,
    });
  }

  const transferencia = transferenciasDb.create({
    nombre: origenCedis.nombre,
    categoria,
    cantidadKg: cantidad,
    destino,
    realizadaPor,
    solicitudId,
  });

  return { transferencia, origenCedis, destinoInsumo };
}

module.exports = { transferirDeCedisASucursal, TransferError };
