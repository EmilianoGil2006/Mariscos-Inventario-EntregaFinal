const request = require("supertest");
const app = require("../src/app");
const insumosDb = require("../src/data/insumos");
const usersDb = require("../src/data/users");
const transferenciasDb = require("../src/data/transferencias");

let adminToken;
let encargadoCentroToken;
let encargadoNorteToken;

async function login(username, password) {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  return res.body.token;
}

beforeEach(async () => {
  adminToken = await login("admin", "admin123");
  encargadoCentroToken = await login("encargado_centro", "clave123");
  encargadoNorteToken = await login("encargado_norte", "clave123");
});

afterEach(() => {
  insumosDb._resetForTests();
  usersDb._resetForTests();
  transferenciasDb._resetForTests();
});

describe("POST /api/transferencias", () => {
  test("el admin puede transferir de CEDIS a una sucursal", async () => {
    const res = await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Camaron", categoria: "proteinas", cantidadKg: 20, destino: "Norte" });

    expect(res.status).toBe(201);
    expect(res.body.destino).toBe("Norte");
    expect(res.body.cantidadKg).toBe(20);
    expect(res.body.origen).toBe("CEDIS");
  });

  test("un encargado no puede crear transferencias directas (403)", async () => {
    const res = await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ nombre: "Camaron", categoria: "proteinas", cantidadKg: 20, destino: "Centro" });

    expect(res.status).toBe(403);
  });

  test("regresa 400 si faltan campos requeridos", async () => {
    const res = await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Camaron" });

    expect(res.status).toBe(400);
  });

  test("regresa 400 si la categoria es invalida", async () => {
    const res = await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Camaron", categoria: "postres", cantidadKg: 10, destino: "Norte" });

    expect(res.status).toBe(400);
  });

  test("regresa 409 si el insumo no existe en CEDIS", async () => {
    const res = await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Langosta", categoria: "proteinas", cantidadKg: 5, destino: "Norte" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("INSUMO_NO_ENCONTRADO");
  });

  test("regresa 409 si no hay suficiente stock en CEDIS", async () => {
    const res = await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Pulpo", categoria: "proteinas", cantidadKg: 9999, destino: "Sur" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("STOCK_INSUFICIENTE");
  });

  test("regresa 400 si la sucursal destino es invalida (ej. CEDIS a si mismo)", async () => {
    const res = await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Camaron", categoria: "proteinas", cantidadKg: 5, destino: "CEDIS" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("SUCURSAL_INVALIDA");
  });

  test("si la sucursal ya tenia ese insumo, suma en lugar de duplicar la fila", async () => {
    // Centro ya tiene Camaron en el seed (25kg)
    await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Camaron", categoria: "proteinas", cantidadKg: 10, destino: "Centro" });

    const insumosCentro = await request(app).get("/api/insumos").set("Authorization", `Bearer ${adminToken}`);
    const camaronCentro = insumosCentro.body.filter((i) => i.sucursal === "Centro" && i.nombre === "Camaron");
    expect(camaronCentro.length).toBe(1);
    expect(camaronCentro[0].cantidadKg).toBe(35); // 25 + 10
  });

  test("si la sucursal no tenia ese insumo, se crea uno nuevo", async () => {
    const res = await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Refrescos", categoria: "bebidas", cantidadKg: 15, destino: "Sur" });

    expect(res.status).toBe(201);

    const insumosSur = await request(app).get("/api/insumos").set("Authorization", `Bearer ${adminToken}`);
    const refrescoSur = insumosSur.body.find((i) => i.sucursal === "Sur" && i.nombre === "Refrescos");
    expect(refrescoSur).toBeDefined();
    expect(refrescoSur.cantidadKg).toBe(15);
  });
});

describe("GET /api/transferencias", () => {
  test("un encargado solo ve las transferencias que llegaron a su sucursal", async () => {
    await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Camaron", categoria: "proteinas", cantidadKg: 5, destino: "Centro" });
    await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Pescado", categoria: "proteinas", cantidadKg: 5, destino: "Norte" });

    const res = await request(app)
      .get("/api/transferencias")
      .set("Authorization", `Bearer ${encargadoCentroToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].destino).toBe("Centro");
  });

  test("el admin ve todas las transferencias", async () => {
    await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Camaron", categoria: "proteinas", cantidadKg: 5, destino: "Centro" });
    await request(app)
      .post("/api/transferencias")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Pescado", categoria: "proteinas", cantidadKg: 5, destino: "Norte" });

    const res = await request(app).get("/api/transferencias").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});
