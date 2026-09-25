const request = require("supertest");
const app = require("../src/app");
const insumosDb = require("../src/data/insumos");
const usersDb = require("../src/data/users");

let adminToken;
let encargadoToken;

beforeEach(async () => {
  const adminLogin = await request(app)
    .post("/api/auth/login")
    .send({ username: "admin", password: "admin123" });
  adminToken = adminLogin.body.token;

  await request(app)
    .post("/api/auth/register")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ username: "encargado_sur", password: "clave123", role: "encargado", sucursal: "Sur" });

  const encargadoLogin = await request(app)
    .post("/api/auth/login")
    .send({ username: "encargado_sur", password: "clave123" });
  encargadoToken = encargadoLogin.body.token;
});

afterEach(() => {
  insumosDb._resetForTests();
  usersDb._resetForTests();
});

describe("GET /api/insumos", () => {
  test("rechaza la peticion sin token (401)", async () => {
    const res = await request(app).get("/api/insumos");
    expect(res.status).toBe(401);
  });

  test("un usuario autenticado puede listar los insumos", async () => {
    const res = await request(app).get("/api/insumos").set("Authorization", `Bearer ${encargadoToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe("GET /api/insumos/:id", () => {
  test("regresa un insumo existente", async () => {
    const res = await request(app).get("/api/insumos/1").set("Authorization", `Bearer ${encargadoToken}`);
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Camaron");
  });

  test("regresa 404 si el insumo no existe", async () => {
    const res = await request(app).get("/api/insumos/999").set("Authorization", `Bearer ${encargadoToken}`);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/insumos", () => {
  test("un admin puede crear un nuevo insumo", async () => {
    const res = await request(app)
      .post("/api/insumos")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Verduras mixtas", sucursal: "Centro", cantidad: 20, unidad: "kg", stockMinimo: 5 });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Verduras mixtas");
  });

  test("un encargado no puede crear insumos (403)", async () => {
    const res = await request(app)
      .post("/api/insumos")
      .set("Authorization", `Bearer ${encargadoToken}`)
      .send({ nombre: "Bebidas", sucursal: "Sur", cantidad: 50, unidad: "unidad" });

    expect(res.status).toBe(403);
  });

  test("regresa 400 si faltan campos requeridos", async () => {
    const res = await request(app)
      .post("/api/insumos")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Bebidas" });

    expect(res.status).toBe(400);
  });
});

describe("PUT /api/insumos/:id/stock", () => {
  test("un encargado puede actualizar el stock (registrar salida/entrada)", async () => {
    const res = await request(app)
      .put("/api/insumos/1/stock")
      .set("Authorization", `Bearer ${encargadoToken}`)
      .send({ cantidad: 18 });

    expect(res.status).toBe(200);
    expect(res.body.insumo.cantidad).toBe(18);
  });

  test("regresa alerta STOCK_BAJO cuando la cantidad queda igual o por debajo del minimo", async () => {
    const res = await request(app)
      .put("/api/insumos/1/stock")
      .set("Authorization", `Bearer ${encargadoToken}`)
      .send({ cantidad: 5 });

    expect(res.status).toBe(200);
    expect(res.body.alerta).toBe("STOCK_BAJO");
  });

  test("regresa 400 si la cantidad no es un numero valido", async () => {
    const res = await request(app)
      .put("/api/insumos/1/stock")
      .set("Authorization", `Bearer ${encargadoToken}`)
      .send({ cantidad: "no-es-numero" });

    expect(res.status).toBe(400);
  });

  test("regresa 404 si el insumo no existe", async () => {
    const res = await request(app)
      .put("/api/insumos/999/stock")
      .set("Authorization", `Bearer ${encargadoToken}`)
      .send({ cantidad: 10 });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/insumos/:id", () => {
  test("un admin puede eliminar un insumo", async () => {
    const res = await request(app).delete("/api/insumos/2").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  test("un encargado no puede eliminar insumos (403)", async () => {
    const res = await request(app).delete("/api/insumos/2").set("Authorization", `Bearer ${encargadoToken}`);
    expect(res.status).toBe(403);
  });

  test("regresa 404 al eliminar un insumo que no existe", async () => {
    const res = await request(app).delete("/api/insumos/999").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
