# DeskOps Phase 1: Operations Runbook

## 1. Local Development & Startup

### Prerequisites
- Node.js 22+ / 24+
- Docker & Docker Compose (optional for containerized PostgreSQL/Redis)

### Running Locally
```bash
# 1. Install dependencies
cd api && npm install
cd ../web && npm install

# 2. Run API Tests (100% passing)
cd api && npm test

# 3. Start API (Port 4000)
cd api && npm run dev

# 4. Start Web (Port 5173)
cd web && npm run dev
```

### Docker Compose
```bash
docker compose up --build -d
```
Access endpoints:
- Web App: `http://localhost:5173`
- API Health Check: `http://localhost:4000/health`
- OpenAPI Swagger Docs: `http://localhost:4000/docs`

---

## 2. Seed Accounts & Test Logins (Labelled Sample Data)

All test accounts use password: `Password@123`

| Role | Name | Email | Organization |
| :--- | :--- | :--- | :--- |
| **Org Admin** | Ananya Deshpande | `admin@lumenhatch.com` | Lumen Hatch Workspaces |
| **Desk Staff** | Devin DeskStaff | `staff@lumenhatch.com` | Lumen Hatch Workspaces |
| **Technician 1**| Alex Technician | `tech1@lumenhatch.com` | Lumen Hatch Workspaces |
| **Technician 2**| Sam Technician | `tech2@lumenhatch.com` | Lumen Hatch Workspaces |
| **Resident** | Rohan Member (Suite 101) | `resident@lumenhatch.com` | Lumen Hatch Workspaces |
| **Org 2 Admin** | Greenfield Admin | `admin@greenfield.com` | Greenfield Facilities (Isolation Test) |

---

## 3. Operations Procedures

### A. Secret Rotation
1. Update `JWT_SECRET` and `JWT_REFRESH_SECRET` in environment / secrets manager.
2. Existing access tokens expire within 15 minutes.
3. Users refresh tokens against the new secret upon subsequent requests.

### B. Replaying a Dead-Letter Job (DLQ)
When background tasks fail repeatedly, they land in the Dead-Letter Queue.
1. Authenticate as `ORG_ADMIN`.
2. Inspect failed jobs at `GET /api/v1/admin/dlq`.
3. Replay failed job via:
   ```bash
   curl -X POST http://localhost:4000/api/v1/admin/dlq/<dlqId>/replay \
     -H "Authorization: Bearer <ADMIN_TOKEN>"
   ```

### C. Health & Readiness Verification
- Health probe: `GET /health` -> `200 OK`
- Readiness probe: `GET /ready` -> `200 OK`
