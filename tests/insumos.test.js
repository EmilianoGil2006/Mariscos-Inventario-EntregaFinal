const request = require("supertest");
const app = require("../src/app");
const insumosDb = require("../src/data/insumos");
const usersDb = require("../src/data/users");

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
});

describe("GET /api/insumos", () => {
  test("rechaza la peticion sin token (401)", async () => {
    const res = await request(app).get("/api/insumos");
    expect(res.status).toBe(401);
  });

  test("el admin ve todos los insumos, incluido CEDIS", async () => {
    const res = await request(app).get("/api/insumos").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(10);
    expect(res.body.some((i) => i.sucursal === "CEDIS")).toBe(true);
  });

  test("un encargado solo ve los insumos de su propia sucursal", async () => {
    const res = await request(app).get("/api/insumos").set("Authorization", `Bearer ${encargadoCentroToken}`);
    expect(res.status).toBe(200);
    expect(res.body.every((i) => i.sucursal === "Centro")).toBe(true);
    expect(res.body.length).toBe(2); // Camaron y Verduras mixtas (seed)
  });
});

describe("GET /api/insumos/:id", () => {
  test("el admin puede consultar un insumo de CEDIS", async () => {
    const res = await request(app).get("/api/insumos/1").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.sucursal).toBe("CEDIS");
  });

  test("un encargado puede consultar un insumo de su sucursal", async () => {
    const res = await request(app).get("/api/insumos/6").set("Authorization", `Bearer ${encargadoCentroToken}`);
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Camaron");
  });

  test("un encargado NO puede consultar un insumo de otra sucursal (403)", async () => {
    const res = await request(app).get("/api/insumos/7").set("Authorization", `Bearer ${encargadoCentroToken}`); // insumo de Norte
    expect(res.status).toBe(403);
  });

  test("un encargado NO puede consultar un insumo de CEDIS (403)", async () => {
    const res = await request(app).get("/api/insumos/1").set("Authorization", `Bearer ${encargadoCentroToken}`);
    expect(res.status).toBe(403);
  });

  test("regresa 404 si el insumo no existe", async () => {
    const res = await request(app).get("/api/insumos/999").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/insumos", () => {
  test("el admin puede crear un insumo en CEDIS", async () => {
    const res = await request(app)
      .post("/api/insumos")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Filete de robalo", categoria: "proteinas", sucursal: "CEDIS", cantidadKg: 50, stockMinimo: 10 });

    expect(res.status).toBe(201);
    expect(res.body.sucursal).toBe("CEDIS");
    expect(res.body.categoria).toBe("proteinas");
  });

  test("un encargado no puede crear insumos (403)", async () => {
    const res = await request(app)
      .post("/api/insumos")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ nombre: "Bebidas", categoria: "bebidas", sucursal: "Centro", cantidadKg: 20 });

    expect(res.status).toBe(403);
  });

  test("regresa 400 si faltan campos requeridos", async () => {
    const res = await request(app)
      .post("/api/insumos")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Bebidas" });

    expect(res.status).toBe(400);
  });

  test("regresa 400 si la categoria es invalida", async () => {
    const res = await request(app)
      .post("/api/insumos")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Algo", categoria: "postres", sucursal: "CEDIS", cantidadKg: 10 });

    expect(res.status).toBe(400);
  });

  test("regresa 400 si la sucursal es invalida", async () => {
    const res = await request(app)
      .post("/api/insumos")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Algo", categoria: "verduras", sucursal: "Poniente", cantidadKg: 10 });

    expect(res.status).toBe(400);
  });
});

describe("PUT /api/insumos/:id/stock", () => {
  test("el admin puede actualizar el stock de CEDIS", async () => {
    const res = await request(app)
      .put("/api/insumos/1/stock")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ cantidadKg: 180 });

    expect(res.status).toBe(200);
    expect(res.body.insumo.cantidadKg).toBe(180);
  });

  test("un encargado puede actualizar el stock de SU sucursal", async () => {
    const res = await request(app)
      .put("/api/insumos/6/stock")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ cantidadKg: 18 });

    expect(res.status).toBe(200);
    expect(res.body.insumo.cantidadKg).toBe(18);
  });

  test("regresa alerta STOCK_BAJO cuando la cantidad queda igual o por debajo del minimo", async () => {
    const res = await request(app)
      .put("/api/insumos/6/stock")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ cantidadKg: 5 });

    expect(res.status).toBe(200);
    expect(res.body.alerta).toBe("STOCK_BAJO");
  });

  test("un encargado NO puede actualizar el stock de otra sucursal (403)", async () => {
    const res = await request(app)
      .put("/api/insumos/7/stock") // insumo de Norte
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ cantidadKg: 3 });

    expect(res.status).toBe(403);
  });

  test("un encargado NO puede actualizar el stock de CEDIS (403)", async () => {
    const res = await request(app)
      .put("/api/insumos/1/stock")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ cantidadKg: 100 });

    expect(res.status).toBe(403);
  });

  test("regresa 400 si la cantidad no es un numero valido", async () => {
    const res = await request(app)
      .put("/api/insumos/6/stock")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ cantidadKg: "no-es-numero" });

    expect(res.status).toBe(400);
  });

  test("regresa 404 si el insumo no existe", async () => {
    const res = await request(app)
      .put("/api/insumos/999/stock")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ cantidadKg: 10 });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/insumos/:id", () => {
  test("el admin puede eliminar un insumo", async () => {
    const res = await request(app).delete("/api/insumos/9").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  test("un encargado no puede eliminar insumos (403)", async () => {
    const res = await request(app).delete("/api/insumos/6").set("Authorization", `Bearer ${encargadoCentroToken}`);
    expect(res.status).toBe(403);
  });

  test("regresa 404 al eliminar un insumo que no existe", async () => {
    const res = await request(app).delete("/api/insumos/999").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
