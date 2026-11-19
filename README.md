# DeskOps Phase 1: Ticketing Core & SLA Platform

[![DeskOps CI](https://github.com/logicveda/deskops/actions/workflows/ci.yml/badge.svg)](https://github.com/logicveda/deskops/actions/workflows/ci.yml)
![Node Version](https://img.shields.io/badge/node-22%2B-blue.svg)
![React Version](https://img.shields.io/badge/react-18-cyan.svg)
![Prisma](https://img.shields.io/badge/prisma-PostgreSQL-indigo.svg)
![License](https://img.shields.io/badge/license-UNLICENSED-green.svg)

> **LogicVeda Web Development Internship Programme (Batch 1.1 — Team 2)**  
> **PRD Document ID:** `LV-WD-DESKOPS-P1` | **Release:** `v1.0.0`  
> **Assigned Client:** **Lumen Hatch Workspaces** (Ananya Deshpande, Head of Facilities Operations)

---

## 1. Project Overview

**DeskOps** is a multi-tenant service desk platform designed for modern facilities operations. Phase 1 provides the core ticketing foundation:
- **Strict Multi-Tenancy (NFR-01, AC-1.1):** Every database table carries `organisationId`, and all queries are strictly scoped by middleware. Cross-tenant access attempts return HTTP 404.
- **Strict Ticket State Machine (FR-1.02):** Enforces a deterministic lifecycle: `NEW` &rarr; `TRIAGED` &rarr; `ASSIGNED` &rarr; `IN_PROGRESS` &rarr; `ON_HOLD` &rarr; `RESOLVED` &rarr; `CLOSED`, with guarded reopen inside a configurable window.
- **Immutable Ticket History (FR-1.03):** Every state change, assignment, and comment writes a timestamped `TicketEvent` with actor provenance.
- **Concurrent Assignment Safety (NFR-03, AC-1.2):** Transactional atomic locking guarantees that 20 parallel assignment requests on a single ticket produce exactly one successful assignment and 19 conflicts.
- **Client-Specific Rule — Lumen Hatch Workspaces (FR-1.08, AC-1.5):** Meeting rooms have daily operating hours and member reservations. Repair tickets are conflict-checked to ensure maintenance is scheduled only into open gaps, never overlapping member bookings.
- **Change Request CR-1 (AC-1.4):** Merge duplicate tickets into a canonical ticket; closes the duplicate and migrates comments and watchers.
- **Presigned Uploads & Background Worker (FR-1.04, NFR-06):** Presigned S3/R2 upload flow with 10MB limit and MIME checks, with BullMQ thumbnail worker and Dead-Letter Queue (DLQ).
- **Inbound Email Webhook (FR-1.05):** Creates tickets from incoming emails or threads replies onto existing tickets via subject tokens (e.g. `[#1001]`).
- **Real-Time Updates (FR-1.06):** Socket.io events keep UI state synchronised across staff and residents.
- **Public & Internal Comments (FR-1.07):** Granular visibility separating public resident notes from staff-only internal memos.

---

## 2. Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Socket.io-client
- **Backend:** Node.js 22/24, TypeScript, Express, Zod, Socket.io, Pino structured logging
- **Database:** PostgreSQL with Prisma ORM
- **Async Workers & Queues:** Redis, BullMQ
- **Quality & Operations:** Vitest, Supertest, Docker, GitHub Actions CI

---

## 3. Project Structure

```
DeskOps Phase 1/
├── .github/workflows/ci.yml       # GitHub Actions CI pipeline
├── api/
│   ├── prisma/
│   │   └── schema.prisma          # Multi-tenant Prisma schema with organisationId
│   ├── src/
│   │   ├── database/
│   │   │   └── dataStore.ts       # Domain data store, atomic concurrency locks
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts       # JWT & role permission checks
│   │   │   ├── tenant.middleware.ts     # Multi-tenant scoping
│   │   │   ├── idempotency.middleware.ts
│   │   │   ├── logger.middleware.ts     # Pino JSON logs with requestId
│   │   │   └── error.middleware.ts      # Uniform error format
│   │   ├── modules/
│   │   │   ├── auth/              # Login, token rotation, profile
│   │   │   ├── tickets/           # Ticket lifecycle, triage, assign, transitions, merge
│   │   │   ├── bookings/          # Lumen Hatch room booking gap & conflict engine
│   │   │   ├── comments/          # Public vs internal staff comments
│   │   │   ├── attachments/       # Presigned S3 uploads & verification
│   │   │   ├── admin/             # Audit events, Dead-Letter Queue (DLQ) replay
│   │   │   └── webhooks/          # Inbound email webhook
│   │   ├── realtime/
│   │   │   └── socket.ts          # Socket.io live event broadcasting
│   │   ├── workers/
│   │   │   └── bullmq.worker.ts   # BullMQ thumbnail generator & DLQ
│   │   ├── swagger.ts             # OpenAPI 3.0 specification
│   │   ├── app.ts                 # Express application configuration
│   │   └── index.ts               # Server entry point
│   └── test/                      # 100% Passing Vitest Integration Suites
│       ├── tenant-isolation.test.ts        # Org A receives 404 for Org B ticket
│       ├── state-machine.test.ts           # Rejection of illegal transitions
│       ├── concurrency.test.ts             # 20 parallel assign requests -> 1 winner
│       ├── client-rule-lumen-hatch.test.ts # Room booking conflict prevention
│       ├── cr1-merge.test.ts               # Merge duplicate tickets
│       ├── rbac-permissions.test.ts        # Role permission matrix
│       └── email-webhook.test.ts           # Inbound email parsing & reply threading
├── web/                           # React 18 + TypeScript + Vite UI
│   ├── src/
│   │   ├── App.tsx                # Role switcher, tickets inbox, room gap viewer
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   └── vite.config.ts
├── docs/
│   ├── adr/                       # Architectural Decision Records (ADR-001 - 006)
│   ├── runbook.md                 # Operations & deployment runbook
│   └── release-notes-v1.0.0.md    # Formal release notes & CR-1 impact estimate
├── docker-compose.yml             # Postgres 16, Redis 7, API, Web
├── .env.example
└── README.md
```

---

## 4. Quick Start & Setup

### Running Locally
```bash
# 1. Install dependencies
cd api && npm install
cd ../web && npm install

# 2. Run the automated test suite (100% passing)
cd api && npm test

# 3. Start the Backend API (Port 4000)
cd api && npm run dev

# 4. In a separate terminal, start the Frontend (Port 5173)
cd web && npm run dev
```

### Running with Docker Compose
```bash
docker compose up --build -d
```
- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:4000`
- OpenAPI Swagger Documentation: `http://localhost:4000/docs`
- Health Probe: `http://localhost:4000/health`

---

## 5. Demo Accounts & Role Simulator

The frontend includes a built-in role simulator in the top navigation bar to test all user perspectives:

| Role | User Name | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Org Admin** | Ananya Deshpande | `admin@lumenhatch.com` | `Password@123` | Full access, audit logs, DLQ replay, user management |
| **Desk Staff** | Devin DeskStaff | `staff@lumenhatch.com` | `Password@123` | Triage, assign technicians, close, CR-1 merge, internal notes |
| **Technician** | Alex Technician | `tech1@lumenhatch.com` | `Password@123` | In progress, on hold, resolve tickets, view assigned work |
| **Resident** | Rohan Member (101) | `resident@lumenhatch.com` | `Password@123` | Create ticket, view own unit tickets, public comments, reopen |

---

## 6. Verification & Automated Test Results

Run all automated tests with:
```bash
cd api && npm test
```

### Test Suite Execution Output:
```
 Test Files  7 passed (7)
      Tests  14 passed (14)

 ✓ test/tenant-isolation.test.ts (2 tests)
   ✓ User in Organisation A requests Organisation B ticket and receives 404 (NFR-01 / AC-1.1)
   ✓ List tickets only returns tickets belonging to authenticated organisation

 ✓ test/concurrency.test.ts (1 test)
   ✓ 20 parallel assign requests on one ticket produce exactly one assignment (NFR-03 / AC-1.2)

 ✓ test/state-machine.test.ts (2 tests)
   ✓ Rejects illegal transition in the API (FR-1.02)
   ✓ Allows legal transitions and records an immutable TicketEvent row with actor and timestamp (FR-1.03)

 ✓ test/client-rule-lumen-hatch.test.ts (3 tests)
   ✓ Rejects repair ticket if scheduled start/end overlaps existing member booking (FR-1.08 / AC-1.5)
   ✓ Rejects repair ticket if scheduled outside room daily operating window
   ✓ Successfully creates repair ticket when placed in an open gap between bookings

 ✓ test/cr1-merge.test.ts (1 test)
   ✓ Merges duplicate ticket into canonical ticket, moves comments and watchers, closes duplicate (CR-1 / AC-1.4)

 ✓ test/rbac-permissions.test.ts (3 tests)
   ✓ Protected Action [Triage]: Staff permitted (200), Resident denied (403) (NFR-02)
   ✓ Protected Action [Internal Comment]: Staff permitted (201), Resident denied (403)
   ✓ Protected Action [Assign]: Staff permitted (200), Resident denied (403)

 ✓ test/email-webhook.test.ts (2 tests)
   ✓ Creates new ticket when email has no ticket token in subject (FR-1.05)
   ✓ Threads email onto existing ticket when subject contains [#ticketNumber]
```
