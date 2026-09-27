const request = require("supertest");
const app = require("../src/app");
const insumosDb = require("../src/data/insumos");
const usersDb = require("../src/data/users");
const solicitudesDb = require("../src/data/solicitudes");
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
  solicitudesDb._resetForTests();
  transferenciasDb._resetForTests();
});

describe("POST /api/solicitudes", () => {
  test("un encargado puede crear una solicitud para su sucursal", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 30 });

    expect(res.status).toBe(201);
    expect(res.body.sucursal).toBe("Centro");
    expect(res.body.estado).toBe("pendiente");
  });

  test("ignora la sucursal que venga en el body y usa la del usuario autenticado", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 30, sucursal: "Sur" });

    expect(res.status).toBe(201);
    expect(res.body.sucursal).toBe("Centro");
  });

  test("un admin no puede crear solicitudes (403) — solo encargados piden a CEDIS", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 30 });

    expect(res.status).toBe(403);
  });

  test("regresa 400 si faltan campos requeridos", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas" });

    expect(res.status).toBe(400);
  });

  test("regresa 400 si la categoria es invalida", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "postres", nombre: "Pastel", cantidadKg: 5 });

    expect(res.status).toBe(400);
  });

  test("regresa 400 si cantidadKg es 0 o negativo", async () => {
    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 0 });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/solicitudes", () => {
  test("un encargado solo ve las solicitudes de su sucursal", async () => {
    await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 10 });
    await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoNorteToken}`)
      .send({ categoria: "proteinas", nombre: "Pescado", cantidadKg: 10 });

    const res = await request(app).get("/api/solicitudes").set("Authorization", `Bearer ${encargadoCentroToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].sucursal).toBe("Centro");
  });

  test("el admin ve todas las solicitudes", async () => {
    await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 10 });
    await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoNorteToken}`)
      .send({ categoria: "proteinas", nombre: "Pescado", cantidadKg: 10 });

    const res = await request(app).get("/api/solicitudes").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});

describe("PUT /api/solicitudes/:id/atender", () => {
  test("el admin puede atender una solicitud y se genera la transferencia", async () => {
    const solicitud = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 30 });

    const res = await request(app)
      .put(`/api/solicitudes/${solicitud.body.id}/atender`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.solicitud.estado).toBe("atendida");
    expect(res.body.transferencia.cantidadKg).toBe(30);
    expect(res.body.transferencia.destino).toBe("Centro");

    // El stock de CEDIS debe haber bajado (200 - 30 = 170)
    const cedis = await request(app).get("/api/insumos/1").set("Authorization", `Bearer ${adminToken}`);
    expect(cedis.body.cantidadKg).toBe(170);
  });

  test("un encargado no puede atender solicitudes (403)", async () => {
    const solicitud = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 10 });

    const res = await request(app)
      .put(`/api/solicitudes/${solicitud.body.id}/atender`)
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({});

    expect(res.status).toBe(403);
  });

  test("regresa 409 si no hay suficiente stock en CEDIS", async () => {
    const solicitud = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 9999 });

    const res = await request(app)
      .put(`/api/solicitudes/${solicitud.body.id}/atender`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("STOCK_INSUFICIENTE");
  });

  test("regresa 404 si la solicitud no existe", async () => {
    const res = await request(app)
      .put("/api/solicitudes/999/atender")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(404);
  });

  test("regresa 409 si la solicitud ya fue atendida", async () => {
    const solicitud = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 10 });

    await request(app)
      .put(`/api/solicitudes/${solicitud.body.id}/atender`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    const res = await request(app)
      .put(`/api/solicitudes/${solicitud.body.id}/atender`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(409);
  });

  test("se puede atender con una cantidad distinta a la solicitada", async () => {
    const solicitud = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 30 });

    const res = await request(app)
      .put(`/api/solicitudes/${solicitud.body.id}/atender`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ cantidadKg: 15 });

    expect(res.status).toBe(200);
    expect(res.body.transferencia.cantidadKg).toBe(15);
  });
});

describe("PUT /api/solicitudes/:id/rechazar", () => {
  test("el admin puede rechazar una solicitud", async () => {
    const solicitud = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 10 });

    const res = await request(app)
      .put(`/api/solicitudes/${solicitud.body.id}/rechazar`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("rechazada");
  });

  test("regresa 404 si la solicitud no existe", async () => {
    const res = await request(app)
      .put("/api/solicitudes/999/rechazar")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test("regresa 409 si la solicitud ya no esta pendiente", async () => {
    const solicitud = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${encargadoCentroToken}`)
      .send({ categoria: "proteinas", nombre: "Camaron", cantidadKg: 10 });

    await request(app)
      .put(`/api/solicitudes/${solicitud.body.id}/rechazar`)
      .set("Authorization", `Bearer ${adminToken}`);

    const res = await request(app)
      .put(`/api/solicitudes/${solicitud.body.id}/rechazar`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
  });
});
