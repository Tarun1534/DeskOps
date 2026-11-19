# Release Notes: DeskOps Phase 1 (v1.0.0)

**Release Date:** 19 November 2026  
**Document ID:** LV-WD-DESKOPS-P1-RN-v1.0.0  
**Team:** LogicVeda Web Development Batch 1.1 Team 2  
**Assigned Client:** Lumen Hatch Workspaces (Ananya Deshpande, Head of Facilities)

---

## 1. Executive Summary
DeskOps Phase 1 delivers a complete multi-tenant service desk platform featuring a strict ticket state machine, transaction-safe concurrent assignment, immutable ticket timeline events, inbound email processing, presigned attachment uploads, real-time Socket.io updates, duplicate ticket merging (CR-1), and custom meeting room booking gap conflict enforcement for **Lumen Hatch Workspaces**.

---

## 2. Functional Requirements Delivered

| ID | Feature | Status | Verification & Evidence |
| :--- | :--- | :--- | :--- |
| **FR-1.01** | **Organisation Model** | Complete | Multi-tenant schema with `Organisation`, `Property`, `Unit`, `MeetingRoom`, `RoomBooking`, and `User`. Every table carries `organisationId`. Scoped by middleware. |
| **FR-1.02** | **Strict Ticket Lifecycle** | Complete | Strict state machine (`NEW -> TRIAGED -> ASSIGNED -> IN_PROGRESS -> ON_HOLD -> RESOLVED -> CLOSED`, with reopen within window to `TRIAGED`). Rejects illegal transitions with HTTP 400. |
| **FR-1.03** | **Ticket History** | Complete | Every transition is recorded as an immutable `TicketEvent` with `actorId`, timestamp, `fromStatus`, `toStatus`, and metadata. Timeline available at `GET /api/v1/tickets/:id/events`. |
| **FR-1.04** | **Attachments** | Complete | Presigned S3/R2 upload flow (`POST /tickets/:id/attachments/presign`) enforcing 10MB size limit and MIME validation (`image/jpeg`, `image/png`, `application/pdf`). Post-upload verification and BullMQ thumbnail queueing. |
| **FR-1.05** | **Email to Ticket** | Complete | Inbound email webhook (`POST /api/v1/webhooks/email/inbound`) creates tickets or threads replies onto existing tickets via subject reply token (e.g. `[#1001]`). |
| **FR-1.06** | **Real-Time Updates** | Complete | Socket.io event broadcasting on ticket creation, triage, assignment, status change, and comments. |
| **FR-1.07** | **Comments** | Complete | Public comments vs internal staff-only comments (`isInternal: true`). Enforced visibility: residents cannot view or post internal comments. |
| **FR-1.08** | **Client-Specific Rule (Lumen Hatch Workspaces)** | Complete | Fixed daily room booking windows and overlap protection. Repair tickets scheduled during member bookings are rejected with HTTP 409 conflict. Verified by automated tests. |

---

## 3. Change Request CR-1: Merge Duplicate Tickets

### Impact Estimate
- **Requirement:** Merge duplicate tickets into a canonical original; the duplicate closes, its comments and watchers move to the original.
- **Effort:** Medium (Database transaction, state transition to `CLOSED`, pointer `mergedIntoTicketId`, moving comments with provenance tag `[Merged from #...]`, deduplicating watchers, appending dual `TicketEvent` history records).
- **Risk:** Concurrency race conditions or cyclic merges (addressed via ID validation and locking).

### Outcome
Implemented via `POST /api/v1/tickets/:id/merge`. Duplicate is closed with `mergedIntoTicketId`, comments/watchers migrated, and history recorded. Verified by automated test `api/test/cr1-merge.test.ts`.

---

## 4. Non-Functional Requirements & Acceptance Criteria Verification

- **AC-1.1 / NFR-01 (Tenant Isolation):** Automated test verifies Org 1 user receives HTTP 404 when requesting Org 2's ticket by ID.
- **AC-1.2 / NFR-03 (Concurrent Assignment):** 20 parallel assignment requests on a single ticket produce exactly 1 winner (200) and 19 conflicts (409) with exactly 1 assignment event recorded.
- **AC-1.4 (CR-1 Live):** Fully integrated into API and UI.
- **AC-1.5 (Client-Specific Rule):** Tested against room operating hours and member booking overlap.
- **NFR-04 (API Standards):** OpenAPI Swagger specification published at `/docs`. Idempotency keys on create endpoints.
- **NFR-06 (Reliability):** Dead-Letter Queue (DLQ) with `/api/v1/admin/dlq` view and replay API.
- **NFR-08 (Observability):** Structured JSON logs with `requestId`.
