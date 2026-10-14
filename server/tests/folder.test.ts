import request from "supertest";
import { app } from "../src/app";
import { setupTestDB } from "./setup";

setupTestDB();

describe("Folder Management & Tree Integrity", () => {
  let token: string;

  beforeEach(async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Folder Tester",
      email: "folder@skybox.io",
      password: "password123"
    });
    token = res.body.data.token;
  });

  it("should create a root folder and a nested child folder", async () => {
    // 1. Create root folder
    const rootRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Projects" });

    expect(rootRes.status).toBe(201);
    expect(rootRes.body.data.name).toBe("Projects");
    expect(rootRes.body.data.parentId).toBeNull();
    expect(rootRes.body.data.ancestors).toEqual([]);

    const rootId = rootRes.body.data._id;

    // 2. Create nested child folder
    const childRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Frontend", parentId: rootId });

    expect(childRes.status).toBe(201);
    expect(childRes.body.data.name).toBe("Frontend");
    expect(childRes.body.data.parentId).toBe(rootId);
    expect(childRes.body.data.ancestors).toContain(rootId);
  });

  it("Cycle Prevention: should block moving a folder into one of its own subfolders", async () => {
    // Create Folder A
    const resA = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Folder A" });
    const idA = resA.body.data._id;

    // Create Subfolder B inside A
    const resB = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Folder B", parentId: idA });
    const idB = resB.body.data._id;

    // Attempt to move A into B (Circular dependency)
    const moveRes = await request(app)
      .patch(`/api/folders/${idA}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetParentId: idB });

    expect(moveRes.status).toBe(400);
    expect(moveRes.body.error.message).toContain("circular loop");
  });

  it("should return breadcrumbs when listing contents of a nested folder", async () => {
    const resA = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Level 1" });
    const idA = resA.body.data._id;

    const resB = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Level 2", parentId: idA });
    const idB = resB.body.data._id;

    const listRes = await request(app)
      .get(`/api/folders?folderId=${idB}`)
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.breadcrumbs.length).toBe(3); // My Drive -> Level 1 -> Level 2
    expect(listRes.body.data.breadcrumbs[1].name).toBe("Level 1");
    expect(listRes.body.data.breadcrumbs[2].name).toBe("Level 2");
  });
});
