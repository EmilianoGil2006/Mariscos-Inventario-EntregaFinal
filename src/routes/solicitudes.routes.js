const express = require("express");
const {
  crearSolicitud,
  listarSolicitudes,
  atenderSolicitud,
  rechazarSolicitud,
} = require("../controllers/solicitudes.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", listarSolicitudes); // admin: todas / encargado: solo las de su sucursal
router.post("/", authorize("encargado"), crearSolicitud); // solo un encargado pide a CEDIS
router.put("/:id/atender", authorize("admin"), atenderSolicitud); // solo admin atiende (dispara la transferencia)
router.put("/:id/rechazar", authorize("admin"), rechazarSolicitud);

module.exports = router;
