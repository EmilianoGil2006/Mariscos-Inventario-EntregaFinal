const request = require("supertest");
const app = require("../src/app");
const usersDb = require("../src/data/users");

afterEach(() => {
  usersDb._resetForTests();
});

describe("POST /api/auth/login", () => {
  test("regresa un token con credenciales validas del admin sembrado", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("admin");
  });

  test("regresa un token con credenciales validas de un encargado sembrado, con su sucursal", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "encargado_norte", password: "clave123" });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("encargado");
    expect(res.body.user.sucursal).toBe("Norte");
  });

  test("regresa 401 con contrasena incorrecta", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "incorrecta" });
    expect(res.status).toBe(401);
  });

  test("regresa 401 con usuario que no existe", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "no-existe", password: "algo" });
    expect(res.status).toBe(401);
  });

  test("regresa 400 si faltan username o password", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "admin" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/register", () => {
  let adminToken;
  let encargadoToken;

  beforeEach(async () => {
    const adminLogin = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin123" });
    adminToken = adminLogin.body.token;

    const encargadoLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "encargado_sur", password: "clave123" });
    encargadoToken = encargadoLogin.body.token;
  });

  test("un admin autenticado puede registrar un nuevo encargado", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ username: "encargado_test", password: "clave123", role: "encargado", sucursal: "Centro" });

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
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${encargadoToken}`)
      .send({ username: "otro_mas", password: "clave123", role: "encargado" });

    expect(res.status).toBe(403);
  });
});
