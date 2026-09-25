const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "clave-secreta-de-desarrollo";
const EXPIRES_IN = "2h";

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken, SECRET };
