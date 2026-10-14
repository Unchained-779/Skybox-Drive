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

    // Clean existing seed users (including previous Alice/Bob and Vivek/Ravi)
    const existingUsers = await User.find({
      email: { $in: ["alice@skybox.io", "bob@skybox.io", "vivek@skybox.io", "ravi@skybox.io"] }
    });

    const userIdsToClean = existingUsers.map((u) => u._id);

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

    // 1. Create Vivek Chandra & Ravi Chandra
    const vivek = await User.create({
      name: "Vivek Chandra",
      email: "vivek@skybox.io",
      password: "password123",
      storageQuota: 104857600, // 100 MB
      usedStorage: 0
    });

    const ravi = await User.create({
      name: "Ravi Chandra",
      email: "ravi@skybox.io",
      password: "password123",
      storageQuota: 104857600, // 100 MB
      usedStorage: 0
    });

    console.log(`👤 Created Demo User: ${vivek.name} (${vivek.email})`);
    console.log(`👤 Created Demo User: ${ravi.name} (${ravi.email})`);

    // 2. Create Vivek's folders
    const documentsFolder = await Folder.create({
      name: "Documents",
      parentId: null,
      ownerId: vivek._id,
      ancestors: [],
      isTrash: false,
      sharedWith: []
    });

    const workProjectsFolder = await Folder.create({
      name: "Work Projects",
      parentId: documentsFolder._id,
      ownerId: vivek._id,
      ancestors: [documentsFolder._id],
      isTrash: false,
      // Share this folder with Ravi as editor
      sharedWith: [{ userId: ravi._id, role: "editor" }]
    });

    const photosFolder = await Folder.create({
      name: "Photos",
      parentId: null,
      ownerId: vivek._id,
      ancestors: [],
      isTrash: false,
      sharedWith: []
    });

    console.log("📁 Created folder hierarchy (Documents -> Work Projects [Shared with Ravi], Photos)");

    // 3. Create Sample files using FileService for authentic storage
    const tempDir = path.resolve(__dirname, "../../storage_temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // File 1: Project_Proposal.md
    const tempProposalV1 = path.join(tempDir, "temp_proposal_v1.txt");
    fs.writeFileSync(tempProposalV1, "# Skybox Drive Architecture Proposal v1\nInitial draft of system features by Vivek Chandra.");

    const proposalFile = await FileService.uploadFile({
      tempFilePath: tempProposalV1,
      originalName: "Project_Proposal.md",
      mimeType: "text/markdown",
      size: fs.statSync(tempProposalV1).size,
      folderId: workProjectsFolder._id.toString(),
      ownerId: vivek._id
    });

    // Upload Version 2 of Project_Proposal.md to demonstrate versioning
    const tempProposalV2 = path.join(tempDir, "temp_proposal_v2.txt");
    fs.writeFileSync(
      tempProposalV2,
      "# Skybox Drive Architecture Proposal v2\nUpdated with IDOR defense and atomic quota reservation by Vivek Chandra."
    );

    await FileService.uploadNewVersion({
      fileId: proposalFile._id.toString(),
      tempFilePath: tempProposalV2,
      size: fs.statSync(tempProposalV2).size,
      userId: vivek._id
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
      ownerId: vivek._id
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
      ownerId: vivek._id
    });

    // File 4: Ravi's private notes
    const raviFolder = await Folder.create({
      name: "Ravi Private Vault",
      parentId: null,
      ownerId: ravi._id,
      ancestors: [],
      isTrash: false,
      sharedWith: []
    });

    const tempRaviNotes = path.join(tempDir, "temp_ravi_notes.txt");
    fs.writeFileSync(tempRaviNotes, "Confidential notes belonging strictly to Ravi. Vivek cannot view this without permission.");

    await FileService.uploadFile({
      tempFilePath: tempRaviNotes,
      originalName: "Confidential_Notes.txt",
      mimeType: "text/plain",
      size: fs.statSync(tempRaviNotes).size,
      folderId: raviFolder._id.toString(),
      ownerId: ravi._id
    });

    console.log("🔒 Created Ravi's private folder & file for IDOR verification testing");

    console.log("\n=======================================================");
    console.log("🎉 Database seeding complete!");
    console.log("Demo Accounts:");
    console.log("1. Email: vivek@skybox.io | Password: password123 (Drive Owner)");
    console.log("2. Email: ravi@skybox.io  | Password: password123 (Collaborator)");
    console.log("=======================================================\n");

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

runSeed();
