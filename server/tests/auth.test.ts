import request from "supertest";
import { app } from "../src/app";
import { setupTestDB } from "./setup";

setupTestDB();

describe("Authentication & User API", () => {
  const testUser = {
    name: "Test Developer",
    email: "dev@skybox.io",
    password: "Password123!"
  };

  it("should register a new user successfully", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.storageQuota).toBe(104857600); // 100MB
    expect(res.body.data.user.usedStorage).toBe(0);
  });

  it("should reject registration with duplicate email", async () => {
    await request(app).post("/api/auth/register").send(testUser);
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("should login registered user and return JWT", async () => {
    await request(app).post("/api/auth/register").send(testUser);

    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it("should reject login with wrong password", async () => {
    await request(app).post("/api/auth/register").send(testUser);

    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: "WrongPassword"
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should block unauthenticated access to /api/auth/me", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
