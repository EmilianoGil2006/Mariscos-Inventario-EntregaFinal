const express = require("express");
const path = require("path");
const helmet = require("helmet");
const authRoutes = require("./routes/auth.routes");
const insumosRoutes = require("./routes/insumos.routes");
const transferenciasRoutes = require("./routes/transferencias.routes");
const solicitudesRoutes = require("./routes/solicitudes.routes");

const app = express();

// Cabeceras de seguridad. Se relaja crossOriginEmbedderPolicy y se define una
// CSP explicita para permitir el frontend estatico (HTML/CSS/JS) servido
// desde este mismo servidor, incluyendo la tipografia de Google Fonts.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/insumos", insumosRoutes);
app.use("/api/transferencias", transferenciasRoutes);
app.use("/api/solicitudes", solicitudesRoutes);

// Frontend estatico (login + dashboard de inventario)
app.use(express.static(path.join(__dirname, "..", "public")));

// Manejo simple de rutas de API no encontradas
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Cualquier otra ruta (navegacion del lado del cliente) regresa el index
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

module.exports = app;
