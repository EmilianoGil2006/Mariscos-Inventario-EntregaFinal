const express = require("express");
const { login, register } = require("../controllers/auth.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/login", login);
// Solo un admin autenticado puede crear nuevos usuarios (encargados de sucursal)
router.post("/register", authenticate, authorize("admin"), register);

module.exports = router;
