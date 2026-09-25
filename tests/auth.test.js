const request = require("supertest");
const app = require("../src/app");
const usersDb = require("../src/data/users");

describe("POST /api/auth/login", () => {
  afterEach(() => {
    usersDb._resetForTests();
  });

  test("regresa un token con credenciales validas del admin sembrado", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("admin");
  });

  test("regresa 401 con contrasena incorrecta", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "incorrecta" });

    expect(res.status).toBe(401);
  });

  test("regresa 401 con usuario que no existe", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "no-existe", password: "algo" });

    expect(res.status).toBe(401);
  });

  test("regresa 400 si faltan username o password", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "admin" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/register", () => {
  let adminToken;

  beforeEach(async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });
    adminToken = login.body.token;
  });

  afterEach(() => {
    usersDb._resetForTests();
  });

  test("un admin autenticado puede registrar un nuevo encargado", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "encargado_centro", password: "clave123", role: "encargado", sucursal: "Centro" });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("encargado");
  });

  test("rechaza registro sin token (401)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "otro", password: "clave123", role: "encargado" });

    expect(res.status).toBe(401);
  });

  test("rechaza registro con rol invalido (400)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "otro", password: "clave123", role: "super-usuario" });

    expect(res.status).toBe(400);
  });

  test("rechaza username duplicado (409)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "admin", password: "clave123", role: "encargado" });

    expect(res.status).toBe(409);
  });

  test("rechaza registro con token invalido (403)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", "Bearer token-invalido")
      .send({ username: "otro", password: "clave123", role: "encargado" });

    expect(res.status).toBe(403);
  });

  test("un encargado (no admin) no puede registrar usuarios (403)", async () => {
    await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "encargado_norte", password: "clave123", role: "encargado", sucursal: "Norte" });

    const loginEncargado = await request(app)
      .post("/api/auth/login")
      .send({ username: "encargado_norte", password: "clave123" });

    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${loginEncargado.body.token}`)
      .send({ username: "otro_mas", password: "clave123", role: "encargado" });

    expect(res.status).toBe(403);
  });
});
