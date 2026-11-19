# DeskOps — Phase 1 Technical Design Document

- **Project:** DeskOps: Service Desk Platform with an SLA Engine
- **Phase:** 1 — Ticketing Core | **Release:** v1.0.0
- **Document Version:** 1.0 (Final / Approved)
- **Prepared Date:** 19 November 2026
- **Team:** Batch 1.1 — Team 2
- **Assigned Client:** **Lumen Hatch Workspaces** (Ananya Deshpande, Head of Facilities Operations)

---

## 1. Executive Summary

DeskOps is a secure, multi-tenant maintenance service desk used by facilities companies. A resident raises a maintenance request; staff triage and assign it; a technician performs the work; authorized users resolve and close the request. Every state transition is recorded as an immutable event. Ticket comments can be public or staff-only; attachments, inbound email, and real-time status updates are supported.

Phase 1 also implements duplicate-ticket merging (CR-1), verified tenant isolation, transaction-safe concurrent assignment, and the client-specific rule for **Lumen Hatch Workspaces**.

---

## 2. Scope & Requirement Traceability Matrix

| PRD ID | Requirement | Implementation & Verification Evidence |
| :--- | :--- | :--- |
| **FR-1.01** | **Organisation Model** | `Organisation`, `Property`, `Unit`, `MeetingRoom`, `RoomBooking`, `User`, `TechnicianProfile` models. All queries scoped by tenant middleware. |
| **FR-1.02** | **Strict Ticket Lifecycle** | Deterministic state machine (`NEW -> TRIAGED -> ASSIGNED -> IN_PROGRESS -> ON_HOLD -> RESOLVED -> CLOSED`, with reopen inside window). Enforced at API level (`POST /api/v1/tickets/:id/transitions`). Illegal transitions rejected with HTTP 400. |
| **FR-1.03** | **History** | Immutable `TicketEvent` records with actor, `fromStatus`, `toStatus`, and timestamp. Timeline served at `/api/v1/tickets/:id/events`. |
| **FR-1.04** | **Attachments** | Presigned S3/R2 uploads with 10MB limit and server-side MIME verification (`image/jpeg`, `image/png`, `application/pdf`). BullMQ worker thumbnail task with DLQ handling. |
| **FR-1.05** | **Email to Ticket** | Inbound webhook (`/api/v1/webhooks/email/inbound`) creates tickets or threads replies by subject token `[#ticketNumber]`. |
| **FR-1.06** | **Real-Time Updates** | Socket.io event broadcasting (`ticket:created`, `ticket:assigned`, `ticket:updated`, `comment:added`). |
| **FR-1.07** | **Comments** | Public comments vs staff-only internal comments (`isInternal: boolean`). Residents cannot see or post internal comments. |
| **FR-1.08** | **Client-Specific Rule** | **Lumen Hatch Workspaces:** Meeting rooms have fixed daily booking windows and member bookings. Repair tickets must be scheduled into open gaps that do not overlap member bookings. |
| **CR-1** | **Merge Duplicate Tickets** | Duplicate closes with `mergedIntoTicketId`, comments and watchers migrate to canonical ticket. |
| **NFR-01** | **Tenant Isolation** | Automated test: User in Org A requests Org B's ticket and receives HTTP 404. |
| **NFR-02** | **Access Control** | Role-based access control matrix in code (`requireRoles`) and tests for allowed vs denied actions. |
| **NFR-03** | **Data Integrity** | 20 parallel assignment requests on 1 ticket produce exactly 1 assignment and 19 409 conflicts. |
| **NFR-04** | **API Standards** | Versioned `/api/v1`, Zod validation, uniform error format, cursor pagination, live OpenAPI Swagger docs at `/docs`. |

---

## 3. Client-Specific Rule: Lumen Hatch Workspaces (Section 15 Resolution)

### Exact Client Rule
> *"Our members book desks and meeting rooms by the day, and each room has a fixed daily booking window. When a repair ticket is raised for a room, it must be scheduled into a gap that does not overlap any booking. Please make sure the system never places a repair on top of a member's booking. Our front desk team relies on this to keep sessions running smoothly."*  
> &mdash; **Ananya Deshpande**, Head of Facilities Operations, Lumen Hatch Workspaces

### Data Model & Flow Impact
1. **Schema Entities:**
   - `MeetingRoom`: specifies `dailyWindowStart` (e.g. `08:00`) and `dailyWindowEnd` (e.g. `20:00`).
   - `RoomBooking`: represents confirmed member bookings with `startTime` and `endTime`.
   - `Ticket`: optional `meetingRoomId`, `scheduledStart`, and `scheduledEnd`.
2. **Scheduling Algorithm (`BookingService.validateRepairSchedule`):**
   - Asserts repair window is strictly within `dailyWindowStart` and `dailyWindowEnd`.
   - Asserts `scheduledStart < booking.endTime && scheduledEnd > booking.startTime` evaluates false for all active bookings.
   - If conflict detected, returns HTTP 409 (`BOOKING_CONFLICT`) with details of the conflicting member reservation.
3. **Automated Verification:**
   - Covered in `api/test/client-rule-lumen-hatch.test.ts` (3 tests verifying overlap rejection, out-of-hours rejection, and successful gap scheduling).
