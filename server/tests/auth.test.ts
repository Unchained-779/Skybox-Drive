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

  it("should register and login user via Google OAuth ID token", async () => {
    // Generate base64 mock Google ID token payload
    const mockPayload = Buffer.from(
      JSON.stringify({
        email: "googledev@gmail.com",
        name: "Google Developer",
        sub: "google-sub-987654",
        picture: "https://lh3.googleusercontent.com/a/sample"
      })
    ).toString("base64");
    const mockGoogleToken = `header.${mockPayload}.signature`;

    // 1. Initial Google sign up
    const res1 = await request(app).post("/api/auth/google").send({ credential: mockGoogleToken });
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.user.email).toBe("googledev@gmail.com");
    expect(res1.body.data.user.name).toBe("Google Developer");
    expect(res1.body.data.user.storageQuota).toBe(104857600);
    expect(res1.body.data.token).toBeDefined();

    // 2. Subsequent Google login for existing user
    const res2 = await request(app).post("/api/auth/google").send({ credential: mockGoogleToken });
    expect(res2.status).toBe(200);
    expect(res2.body.data.user.id).toBe(res1.body.data.user.id);
  });
});
