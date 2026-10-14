import path from "path";
import fs from "fs";
import { connectDB, disconnectDB } from "../config/db";
import { User } from "../models/User.model";
import { Folder } from "../models/Folder.model";
import { File } from "../models/File.model";
import { ShareLink } from "../models/ShareLink.model";
import { AuditLog } from "../models/AuditLog.model";
import { storageService } from "../services/storage/LocalStorageProvider";
import { FileService } from "../services/file.service";

const runSeed = async () => {
  try {
    console.log("🌱 Starting Skybox Drive database seeding...");
    await connectDB();

    // Clean existing seed users and their items
    const existingAlice = await User.findOne({ email: "alice@skybox.io" });
    const existingBob = await User.findOne({ email: "bob@skybox.io" });

    const userIdsToClean = [existingAlice?._id, existingBob?._id].filter(Boolean);

    if (userIdsToClean.length > 0) {
      await Folder.deleteMany({ ownerId: { $in: userIdsToClean } });
      const filesToDelete = await File.find({ ownerId: { $in: userIdsToClean } });
      for (const f of filesToDelete) {
        await storageService.deleteFile(f.storageKey);
        for (const v of f.versions) {
          await storageService.deleteFile(v.storageKey);
        }
      }
      await File.deleteMany({ ownerId: { $in: userIdsToClean } });
      await ShareLink.deleteMany({ createdBy: { $in: userIdsToClean } });
      await AuditLog.deleteMany({ userId: { $in: userIdsToClean } });
      await User.deleteMany({ _id: { $in: userIdsToClean } });
    }

    // 1. Create Alice & Bob
    const alice = await User.create({
      name: "Alice Walker",
      email: "alice@skybox.io",
      password: "password123",
      storageQuota: 104857600, // 100 MB
      usedStorage: 0
    });

    const bob = await User.create({
      name: "Bob Stone",
      email: "bob@skybox.io",
      password: "password123",
      storageQuota: 104857600, // 100 MB
      usedStorage: 0
    });

    console.log(`👤 Created Demo User: ${alice.name} (${alice.email})`);
    console.log(`👤 Created Demo User: ${bob.name} (${bob.email})`);

    // 2. Create Alice's folders
    const documentsFolder = await Folder.create({
      name: "Documents",
      parentId: null,
      ownerId: alice._id,
      ancestors: [],
      isTrash: false,
      sharedWith: []
    });

    const workProjectsFolder = await Folder.create({
      name: "Work Projects",
      parentId: documentsFolder._id,
      ownerId: alice._id,
      ancestors: [documentsFolder._id],
      isTrash: false,
      // Share this folder with Bob as editor
      sharedWith: [{ userId: bob._id, role: "editor" }]
    });

    const photosFolder = await Folder.create({
      name: "Photos",
      parentId: null,
      ownerId: alice._id,
      ancestors: [],
      isTrash: false,
      sharedWith: []
    });

    console.log("📁 Created folder hierarchy (Documents -> Work Projects [Shared with Bob], Photos)");

    // 3. Create Sample files using FileService for authentic storage
    const tempDir = path.resolve(__dirname, "../../storage_temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // File 1: Project_Proposal.md
    const tempProposalV1 = path.join(tempDir, "temp_proposal_v1.txt");
    fs.writeFileSync(tempProposalV1, "# Skybox Drive Architecture Proposal v1\nInitial draft of system features.");

    const proposalFile = await FileService.uploadFile({
      tempFilePath: tempProposalV1,
      originalName: "Project_Proposal.md",
      mimeType: "text/markdown",
      size: fs.statSync(tempProposalV1).size,
      folderId: workProjectsFolder._id.toString(),
      ownerId: alice._id
    });

    // Upload Version 2 of Project_Proposal.md to demonstrate versioning
    const tempProposalV2 = path.join(tempDir, "temp_proposal_v2.txt");
    fs.writeFileSync(
      tempProposalV2,
      "# Skybox Drive Architecture Proposal v2\nUpdated with IDOR defense and atomic quota reservation."
    );

    await FileService.uploadNewVersion({
      fileId: proposalFile._id.toString(),
      tempFilePath: tempProposalV2,
      size: fs.statSync(tempProposalV2).size,
      userId: alice._id
    });

    console.log("📄 Created multi-version file: Project_Proposal.md (v1 & v2)");

    // File 2: Budget_2026.csv
    const tempBudget = path.join(tempDir, "temp_budget.csv");
    fs.writeFileSync(tempBudget, "Department,Q1,Q2,Q3,Q4\nEngineering,50000,60000,55000,70000\nMarketing,20000,25000,22000,30000");

    await FileService.uploadFile({
      tempFilePath: tempBudget,
      originalName: "Budget_2026.csv",
      mimeType: "text/csv",
      size: fs.statSync(tempBudget).size,
      folderId: documentsFolder._id.toString(),
      ownerId: alice._id
    });

    // File 3: Logo.svg inside photosFolder
    const tempSvg = path.join(tempDir, "temp_logo.svg");
    fs.writeFileSync(tempSvg, `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#3b82f6"/></svg>`);

    await FileService.uploadFile({
      tempFilePath: tempSvg,
      originalName: "Skybox_Logo.svg",
      mimeType: "image/svg+xml",
      size: fs.statSync(tempSvg).size,
      folderId: photosFolder._id.toString(),
      ownerId: alice._id
    });

    // File 3: Bob's private notes
    const bobFolder = await Folder.create({
      name: "Bob Private Vault",
      parentId: null,
      ownerId: bob._id,
      ancestors: [],
      isTrash: false,
      sharedWith: []
    });

    const tempBobNotes = path.join(tempDir, "temp_bob_notes.txt");
    fs.writeFileSync(tempBobNotes, "Confidential notes belonging strictly to Bob. Alice cannot view this without permission.");

    await FileService.uploadFile({
      tempFilePath: tempBobNotes,
      originalName: "Confidential_Notes.txt",
      mimeType: "text/plain",
      size: fs.statSync(tempBobNotes).size,
      folderId: bobFolder._id.toString(),
      ownerId: bob._id
    });

    console.log("🔒 Created Bob's private folder & file for IDOR verification testing");

    console.log("\n=======================================================");
    console.log("🎉 Database seeding complete!");
    console.log("Demo Accounts:");
    console.log("1. Email: alice@skybox.io | Password: password123");
    console.log("2. Email: bob@skybox.io   | Password: password123");
    console.log("=======================================================\n");

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

runSeed();
