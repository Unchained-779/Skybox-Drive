import request from "supertest";
import path from "path";
import fs from "fs";
import { app } from "../src/app";
import { setupTestDB } from "./setup";
import { User } from "../src/models/User.model";

setupTestDB();

describe("File Operations, Atomic Quota, IDOR & Versioning", () => {
  let userAToken: string;
  let userAId: string;
  let userBToken: string;

  const sampleFile1 = path.resolve(__dirname, "temp_sample_1.txt");
  const sampleFile2 = path.resolve(__dirname, "temp_sample_2.txt");

  beforeAll(() => {
    fs.writeFileSync(sampleFile1, "Hello from Alice! Content of file 1.");
    fs.writeFileSync(sampleFile2, "Updated version with more details for version 2.");
  });

  afterAll(() => {
    if (fs.existsSync(sampleFile1)) fs.unlinkSync(sampleFile1);
    if (fs.existsSync(sampleFile2)) fs.unlinkSync(sampleFile2);
  });

  beforeEach(async () => {
    // Register User A
    const resA = await request(app).post("/api/auth/register").send({
      name: "Alice",
      email: "alice@test.com",
      password: "password123"
    });
    userAToken = resA.body.data.token;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post("/api/auth/register").send({
      name: "Bob",
      email: "bob@test.com",
      password: "password123"
    });
    userBToken = resB.body.data.token;
  });

  it("should upload file and accurately increment usedStorage quota", async () => {
    const fileSize = fs.statSync(sampleFile1).size;

    const res = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${userAToken}`)
      .attach("file", sampleFile1);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("temp_sample_1.txt");
    expect(res.body.data.size).toBe(fileSize);

    // Verify user usedStorage updated in DB
    const userInDb = await User.findById(userAId);
    expect(userInDb?.usedStorage).toBe(fileSize);
  });

  it("should block upload when storage quota is exceeded", async () => {
    // Set Alice's quota to a tiny 10 bytes
    await User.findByIdAndUpdate(userAId, { storageQuota: 10, usedStorage: 0 });

    const res = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${userAToken}`)
      .attach("file", sampleFile1);

    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);

    // Verify quota was NOT modified (atomic compensation)
    const userInDb = await User.findById(userAId);
    expect(userInDb?.usedStorage).toBe(0);
  });

  it("IDOR Defense: should block User B from downloading User A's private file", async () => {
    // User A uploads a private file
    const uploadRes = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${userAToken}`)
      .attach("file", sampleFile1);

    const fileId = uploadRes.body.data._id;

    // User B attempts to access User A's file
    const idorRes = await request(app)
      .get(`/api/files/${fileId}/download`)
      .set("Authorization", `Bearer ${userBToken}`);

    expect(idorRes.status).toBe(403);
    expect(idorRes.body.success).toBe(false);
  });

  it("should upload a new version (v2), archive v1, and adjust cumulative quota", async () => {
    const uploadV1 = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${userAToken}`)
      .attach("file", sampleFile1);

    const fileId = uploadV1.body.data._id;
    const v1Size = fs.statSync(sampleFile1).size;
    const v2Size = fs.statSync(sampleFile2).size;

    // Upload Version 2
    const uploadV2 = await request(app)
      .post(`/api/files/${fileId}/versions`)
      .set("Authorization", `Bearer ${userAToken}`)
      .attach("file", sampleFile2);

    expect(uploadV2.status).toBe(201);
    expect(uploadV2.body.data.currentVersion).toBe(2);
    expect(uploadV2.body.data.versions.length).toBe(1);
    expect(uploadV2.body.data.versions[0].versionNumber).toBe(1);

    // Verify cumulative quota is sum of both versions
    const userInDb = await User.findById(userAId);
    expect(userInDb?.usedStorage).toBe(v1Size + v2Size);
  });

  it("should soft delete to trash, restore, and then permanently empty trash", async () => {
    const uploadRes = await request(app)
      .post("/api/files/upload")
      .set("Authorization", `Bearer ${userAToken}`)
      .attach("file", sampleFile1);

    const fileId = uploadRes.body.data._id;

    // 1. Move to Trash
    const trashRes = await request(app)
      .delete(`/api/files/${fileId}`)
      .set("Authorization", `Bearer ${userAToken}`);
    expect(trashRes.status).toBe(200);

    // 2. Verify file is in trash list
    const trashListRes = await request(app)
      .get("/api/trash")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(trashListRes.body.data.files.length).toBe(1);

    // 3. Restore from trash
    const restoreRes = await request(app)
      .post("/api/trash/restore")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({ resourceType: "file", resourceId: fileId });
    expect(restoreRes.status).toBe(200);

    // 4. Move to trash again and permanently empty trash
    await request(app).delete(`/api/files/${fileId}`).set("Authorization", `Bearer ${userAToken}`);
    const emptyRes = await request(app)
      .delete("/api/trash/empty")
      .set("Authorization", `Bearer ${userAToken}`);
    expect(emptyRes.status).toBe(200);

    // 5. Verify user quota is reclaimed back to 0
    const userInDb = await User.findById(userAId);
    expect(userInDb?.usedStorage).toBe(0);
  });
});
