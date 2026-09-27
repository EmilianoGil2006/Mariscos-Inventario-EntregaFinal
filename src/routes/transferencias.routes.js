const express = require("express");
const { crearTransferencia, listarTransferencias } = require("../controllers/transferencias.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", listarTransferencias); // admin: todas / encargado: solo las de su sucursal
router.post("/", authorize("admin"), crearTransferencia); // solo admin mueve de CEDIS a una sucursal

module.exports = router;
