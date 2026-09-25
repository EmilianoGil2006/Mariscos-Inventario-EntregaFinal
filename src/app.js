const express = require("express");
const helmet = require("helmet");
const authRoutes = require("./routes/auth.routes");
const insumosRoutes = require("./routes/insumos.routes");

const app = express();
app.use(helmet()); // cabeceras de seguridad (mitiga XSS, sniffing, clickjacking, etc.)
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/insumos", insumosRoutes);

// Manejo simple de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

module.exports = app;
