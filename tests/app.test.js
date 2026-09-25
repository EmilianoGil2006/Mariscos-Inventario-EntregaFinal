const request = require("supertest");
const app = require("../src/app");

test("GET /api/health regresa status ok", async () => {
  const res = await request(app).get("/api/health");
  expect(res.status).toBe(200);
  expect(res.body.status).toBe("ok");
});

test("una ruta inexistente regresa 404", async () => {
  const res = await request(app).get("/api/no-existe");
  expect(res.status).toBe(404);
});
