const express = require("express");
const {
  listInsumos,
  getInsumo,
  createInsumo,
  updateStock,
  deleteInsumo,
} = require("../controllers/insumos.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate); // todas las rutas de insumos requieren estar autenticado

router.get("/", listInsumos);
router.get("/:id", getInsumo);
router.post("/", authorize("admin"), createInsumo);
router.put("/:id/stock", updateStock); // admin o encargado
router.delete("/:id", authorize("admin"), deleteInsumo);

module.exports = router;
