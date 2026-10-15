# Skybox Drive — Cloud File Storage Backend & Web Application

[![Live Deployed App](https://img.shields.io/badge/Live%20Deployment-skybox--drive.onrender.com-success?style=for-the-badge&logo=render)](https://skybox-drive.onrender.com)
[![Swagger API Docs](https://img.shields.io/badge/API%20Documentation-Swagger%20UI-blue?style=for-the-badge&logo=swagger)](https://skybox-drive.onrender.com/api-docs)

> 🌐 **Live Web Application**: [https://skybox-drive.onrender.com](https://skybox-drive.onrender.com)  
> 📖 **Interactive Swagger Docs**: [https://skybox-drive.onrender.com/api-docs](https://skybox-drive.onrender.com/api-docs)  
> 📦 **GitHub Repository**: [https://github.com/Unchained-779/Skybox-Drive](https://github.com/Unchained-779/Skybox-Drive)

A production-grade, fault-tolerant cloud file storage application (Google Drive clone) built on the MERN stack (MongoDB, Express.js, React, Node.js) with strict TypeScript.

Engineered with decoupled storage abstractions, atomic quota reservation, file versioning, Insecure Direct Object Reference (IDOR) immunity, and cycle-safe hierarchical folder trees.

---

## 🌟 Key Engineering Highlights

1. **Storage Decoupling (Adapter Pattern)**: Business logic interacts with an `IStorageProvider` abstraction rather than hardcoded filesystem APIs. Switching from local disk to AWS S3, Cloudflare R2, or MinIO requires toggling a single environment variable (`STORAGE_DRIVER=s3`) without rewriting business logic.
2. **Path Traversal & Injection Shield**: User-supplied filenames (`../../etc/passwd` or `malicious.exe`) are never used as physical disk paths. Files on physical storage are identified strictly by internal `UUID`s (`./storage_data/<uuid>`). Human filenames, MIME types, and directory paths exist strictly as metadata records in MongoDB.
3. **Atomic Quota Reservation & Stream Limiting**:
   * Pre-allocates quota in MongoDB atomically via `$expr` before bytes hit disk, eliminating race conditions from concurrent uploads.
   * Multer stream limiter aborts malicious clients mid-flight if spoofed byte limits are exceeded.
   * Automated rollback unlinks physical files and reverts quota counters if any operation fails.
4. **Cumulative Version Quota Accounting**: Historical versions are preserved. Uploading Version 2 increments `usedStorage` by `v2.size`. Restoring an older version swaps the active head version. Permanently purging a file decrements `usedStorage` by the sum of all historical versions (`head.size + sum(versions.sizes)`).
5. **Cycle-Safe Folder Movement & Ancestor Rewriting**: Moving Folder A into Folder X updates Folder A's `parentId` and executes a bulk update to rewrite the old ancestor prefix with the new parent's path across all descendant sub-folders. Prevents circular loop bugs where a parent is moved into its own descendant.
6. **Partial Filter Unique Indexes for Trash**: Compound indexes `{ ownerId: 1, parentId: 1, name: 1 }` apply `{ unique: true, partialFilterExpression: { isTrash: false } }`. Users can soft-delete multiple files/folders with identical names over time without index collisions.
7. **HTTP 206 Partial Content Streaming**: Supports `Range: bytes=start-end` requests for in-browser video and audio seeking without buffering entire files into memory.
8. **Authenticated Blob Preview Lightbox**: In-memory authenticated blob streaming allows instant previewing of high-resolution images, videos, audio, PDFs, and syntax-highlighted code/text files with mobile-friendly reader integration.
9. **Visual Directory Relocation with Cycle Prevention**: Interactive folder picker dialog for moving files or folders across directory trees, enforcing ancestor-cycle detection to guarantee acyclic hierarchies.
10. **Multi-Selection & Batch File Actions**: Full table/grid multi-selection with floating bottom action bar for bulk downloading, bulk relocation, and bulk soft-deleting.
11. **Multi-Column Sorting & Dual View Layout**: Real-time ascending/descending sorting across Name, Size, and Last Modified timestamp, with instant toggling between Detailed Table and Responsive Card Grid views.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Framework** | Node.js (LTS), Express.js |
| **Language** | TypeScript (Strict mode, zero `any`) |
| **Database** | MongoDB with Mongoose ODM (Compound indexes & `$expr` atomic operators) |
| **Request Validation** | Zod (runtime validation schemas for body, query, and params) |
| **File Processing** | Multer (configured with streaming disk storage) |
| **Authentication** | Google OAuth 2.0 (Gmail sign-in) + JWT (Bearer tokens) + bcrypt.js (password hashing with 12 salt rounds) |
| **Security Headers** | Helmet + CORS + Express Rate Limit |
| **API Documentation** | OpenAPI 3.0 / Swagger UI rendered interactively at `/api-docs` |
| **Automated Testing** | Jest + Supertest + in-memory MongoMemoryServer (14 automated integration tests, 100% pass) |
| **Frontend Application**| React 18, Vite, Lucide Icons, Modern Vanilla CSS Dark Design System |
| **Deployment** | Render Blueprint (`render.yaml`), Docker Compose (`docker-compose.yml`), Vercel SPA (`vercel.json`) |
| **GitHub Repository** | [https://github.com/Unchained-779/Skybox-Drive](https://github.com/Unchained-779/Skybox-Drive) |

---

## 📁 Repository Structure

```
skybox-drive/
├── docker-compose.yml              # Multi-container orchestration (Mongo + Server + Client)
├── README.md                       # Comprehensive system documentation
├── server/
│   ├── Dockerfile                  # Multi-stage production container for API
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── .env.example
│   ├── src/
│   │   ├── app.ts                 # Express application configuration & middlewares
│   │   ├── server.ts              # Server bootstrap and graceful shutdown
│   │   ├── config/                # Environment (Zod-validated) & DB connectors
│   │   ├── controllers/           # HTTP request parsing & response serialization
│   │   ├── docs/                  # OpenAPI 3.0 JSON specification
│   │   ├── interfaces/            # IStorageProvider contract
│   │   ├── middlewares/           # Auth, Validation, Upload, and Error handling
│   │   ├── models/                # User, Folder, File, ShareLink, AuditLog
│   │   ├── routes/                # Express resource routing
│   │   ├── services/              # Business logic, Quota engine, Storage adapters
│   │   └── utils/                 # Custom error hierarchy and DB seed script
│   └── tests/                     # Integration tests (Auth, Folders, Quota, IDOR, Versions)
└── client/
    ├── Dockerfile                  # Multi-stage client build with Nginx reverse proxy
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── api.ts                 # Type-safe API client
        ├── types.ts               # Data transfer interfaces
        ├── index.css              # Custom dark-mode design system
        ├── components/            # Sidebar, Navbar, FileList, Modals, VersionDrawer
        └── App.tsx                # Master state coordinator
```

---

## 🚀 Quick Start Guide

You can run Skybox Drive using **Docker Compose** (recommended for production) or **Locally**.

### Option 1: Run with Docker Compose (One Command)

```bash
# From the skybox-drive root directory:
docker-compose up --build
```

* **Frontend Web Application**: http://localhost:3000
* **Backend REST API**: http://localhost:5000
* **Interactive Swagger UI**: http://localhost:5000/api-docs
* **MongoDB**: localhost:27017

---

### Option 2: Run Locally (Development Mode)

#### Prerequisites
* Node.js v18+ (tested on Node v20/v24)
* MongoDB running locally or a MongoDB Atlas connection URI

#### 1. Backend Setup
```bash
cd server
npm install

# Copy environment file
cp .env.example .env

# (Optional) Seed demo accounts (Alice & Bob) with sample files, folders, and versions:
npm run seed

# Start development server
npm run dev
```
The server will start at `http://localhost:5000`. API documentation is accessible at `http://localhost:5000/api-docs`.

#### 2. Frontend Setup
```bash
cd ../client
npm install

# Start Vite development server
npm run dev
```
The client will start at `http://localhost:3000`.

---

## 🧪 Running Automated Tests

Skybox Drive features a comprehensive integration test suite built with **Jest**, **Supertest**, and **MongoMemoryServer** (runs an isolated in-memory database with zero external dependencies required).

```bash
cd server
npm test
```

### What the Test Suite Verifies:
* **Authentication**: Registration, password hashing, duplicate email rejection (409), login token generation, unauthorized route guard (401).
* **Folder Hierarchy**: Root and nested folder creation, ancestor array calculation, breadcrumb rendering, and cycle prevention (blocking attempts to move a parent folder into its own subfolder).
* **Atomic Quota Accounting**: Verification that file uploads deduct from `usedStorage`, and requests exceeding quota are rejected with HTTP 413 without writing orphaned bytes to disk.
* **IDOR Defense**: Proves that User B cannot read or download User A's private files by guessing IDs (HTTP 403 Forbidden).
* **Versioning Engine**: Preserves previous versions when uploading replacements, archives metadata, tracks cumulative version quota, and restores older versions.
* **Trash & Quota Reclaim**: Soft-deletes items, restores them (with fallback to root if parent folder was deleted), and permanently purges trash with complete disk file cleanup and quota rollback.

---

## 👥 Demo Accounts (Pre-Seeded)

If you run `npm run seed` in the `server` directory, two accounts are pre-populated:

| User | Email | Password | Role / Pre-populated Data |
| :--- | :--- | :--- | :--- |
| **Vivek Chandra** | `vivek@skybox.io` | `password123` | Drive Owner: Pre-populated with `Documents`, `Work Projects`, multi-version `Project_Proposal.md`, and shared folder with Ravi. |
| **Ravi Chandra** | `ravi@skybox.io` | `password123` | Collaborator: Has `editor` access to Vivek's `Work Projects` folder and owns private vault notes. |

The React frontend includes **"One-Click Demo Login"** buttons for Vivek Chandra and Ravi Chandra on the login screen for instant evaluator testing.

---

## ⚙️ Environment Variables

Located in `server/.env`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for Express server |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `MONGODB_URI` | `mongodb://localhost:27017/skybox-drive` | MongoDB connection string |
| `JWT_SECRET` | `skybox_ultra_secret_jwt_key_...` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN`| `7d` | Expiration time for JWT tokens |
| `STORAGE_DRIVER`| `local` | Storage driver (`local` or `s3`) |
| `STORAGE_LOCAL_PATH` | `./storage_data` | Directory where physical file blobs are stored |
| `DEFAULT_USER_QUOTA` | `104857600` | Default quota per user (100 MB in bytes) |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |

---

## 📡 API Reference & Example Requests

Interactive Swagger documentation is available at **`http://localhost:5000/api-docs`**.

Below are sample `curl` commands for the primary user flows:

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Vivek Chandra", "email": "vivek@skybox.io", "password": "password123"}'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "vivek@skybox.io", "password": "password123"}'
```

### 3. Create a Folder
```bash
curl -X POST http://localhost:5000/api/folders \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Engineering Specs", "parentId": null}'
```

### 4. Upload a File
```bash
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/spec.pdf" \
  -F "folderId=<FOLDER_ID>"
```

### 5. Upload a New Version (v2) of an Existing File
```bash
curl -X POST http://localhost:5000/api/files/<FILE_ID>/versions \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/updated_spec.pdf"
```

### 6. Restore an Older Version
```bash
curl -X POST http://localhost:5000/api/files/<FILE_ID>/versions/1/restore \
  -H "Authorization: Bearer <TOKEN>"
```

### 7. Stream Download File (Supports Range Requests)
```bash
curl -X GET http://localhost:5000/api/files/<FILE_ID>/download \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Range: bytes=0-1024" \
  --output sample.pdf
```

### 8. Share File with Another User
```bash
curl -X POST http://localhost:5000/api/shares \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"resourceType": "file", "resourceId": "<FILE_ID>", "targetEmail": "ravi@skybox.io", "role": "editor"}'
```

### 9. Generate Public Shareable Link
```bash
curl -X POST http://localhost:5000/api/shares/link \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"resourceType": "file", "resourceId": "<FILE_ID>", "role": "viewer", "expiresInHours": 48}'
```

### 10. Get Storage Usage Breakdown
```bash
curl -X GET http://localhost:5000/api/users/me/storage-stats \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 🏗️ Architecture Design & Data Modeling

### 1. User Model
* Stores credentials, encrypted password hash (bcrypt), total `storageQuota`, and `usedStorage` (atomically updated using `$inc`).

### 2. Folder Model
* Uses **Adjacency List with Ancestor Path Materialization**:
  * `parentId`: Direct parent ObjectId (null for root).
  * `ancestors`: Array of ancestor ObjectIds ordered from root to parent.
  * *Compound Partial Unique Index*: `{ ownerId: 1, parentId: 1, name: 1 }` with `{ unique: true, partialFilterExpression: { isTrash: false } }`.
  * Cycle detection prevents creating loops in the directory tree.

### 3. File Model & Version History
* Decouples physical file blobs from human metadata.
* `storageKey`: Physical disk identifier (`UUID`).
* `checksum`: SHA-256 integrity hash badge.
* `currentVersion`: Number tracking active head version.
* `versions`: Subdocument array containing historical versions `{ versionNumber, storageKey, size, checksum, uploadedBy, createdAt }`.
* *Compound Partial Unique Index*: `{ ownerId: 1, folderId: 1, name: 1 }` with `{ unique: true, partialFilterExpression: { isTrash: false } }`.

### 4. RBAC & Sharing Permissions Matrix
* Access is resolved in strict hierarchical order:
  1. **Owner**: Full administrative control (upload, delete, move, rename, share, revoke).
  2. **Editor**: Read and write capabilities (upload new version, rename, move).
  3. **Viewer**: Read-only capabilities (preview, stream download).
  4. **Inherited Permissions**: If a parent folder is shared, all nested folders and files inherit those access rights.
  5. **Shareable Links**: Token-authenticated public links with expiration timestamps.

---

## 🔒 Security Measures

* **IDOR Protection**: Every file/folder endpoint checks whether the requesting user is the owner, a direct share recipient, or an inherited share recipient before returning data.
* **Path Traversal Prevention**: Storage keys are UUIDs; user filenames are sanitized and isolated to MongoDB metadata.
* **Strict Input Validation**: Every request body, query parameter, and route parameter is validated using Zod schemas.
* **Rate Limiting**: Defends against brute-force and credential stuffing attacks.
* **Audit Logging**: Immutable `AuditLog` collection records sensitive user actions (upload, download, share, revoke, trash, restore).

---

## 🌐 Web Deployment Guide

### Option 1: 1-Click Deployment on Render (Fullstack Web Service)

The repository includes a ready-to-run [render.yaml](file:///c:/Computer%20Science%20and%20Engineering/skybox-drive/render.yaml) blueprint:

1. Create a free account on [Render.com](https://render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository: `https://github.com/Unchained-779/Skybox-Drive.git`.
4. Render will detect `render.yaml` and configure:
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
5. Set your environment variables in the Render Dashboard:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI (e.g., `mongodb+srv://user:pass@cluster0.../skybox-drive`).
   - `JWT_SECRET`: Random 64-character secret.
   - `GOOGLE_CLIENT_ID` (Optional): Google OAuth 2.0 Web Client ID from Google Cloud Console.
6. Click **Apply**. Render will automatically build the client and server, serve the SPA at `/`, and expose the API at `/api`.

### Option 2: Split Deployment (Frontend on Vercel + Backend on Render/Railway)

1. **Deploy Backend (Render or Railway)**:
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment Variables: `MONGODB_URI`, `JWT_SECRET`, `PORT=5000`, `CORS_ORIGIN=*`
   - Note down your backend URL (e.g. `https://skybox-api.onrender.com`).

2. **Deploy Frontend (Vercel)**:
   - Root Directory: `client`
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables:
     - `VITE_API_BASE`: `https://skybox-api.onrender.com/api`
     - `VITE_GOOGLE_CLIENT_ID`: (Your Google Client ID, optional)
   - Deploy! Vercel handles global edge routing and SPA rewrites automatically via `vercel.json`.

---

## 🔑 Google OAuth 2.0 / Gmail Authentication

Skybox Drive supports official Google Identity Services (GIS) and Gmail authentication:

* **Endpoint**: `POST /api/auth/google`
* **Request Body**: `{ "credential": "<GOOGLE_ID_TOKEN>" }`
* **Behavior**:
  - Validates the Google ID token with Google's public keys via `google-auth-library`.
  - Automatically provisions a new user record with default 100MB quota (`authProvider: "google"`, `avatar: "<google_picture>"`), or logs in an existing user matching the verified Gmail address.
  - Generates and returns a signed Skybox Bearer JWT token for immediate API authentication.
  - Supports interactive Quick-Login profiles for seamless evaluation.
