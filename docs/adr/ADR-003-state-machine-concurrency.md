# ADR-003: Strict Ticket State Machine, Event History, and Atomic Assignment Concurrency

## Status
Accepted

## Context
FR-1.02 and FR-1.03 mandate a strict ticket lifecycle (`NEW -> TRIAGED -> ASSIGNED -> IN_PROGRESS -> ON_HOLD -> RESOLVED -> CLOSED`, with reopen within a configurable window to `TRIAGED`). AC-1.2 and NFR-03 require that 20 parallel assignment requests on a single ticket produce exactly one successful assignment and 19 conflict rejections without race conditions or corrupt history.

## Decision
1. Explicit state transition map in `TicketService`. Any invalid transition is rejected with HTTP 400 (`ILLEGAL_STATE_TRANSITION`).
2. Every legal transition writes an immutable `TicketEvent` row with `actorId`, `timestamp`, `fromStatus`, `toStatus`, and metadata.
3. Assignment uses atomic locking with optimistic concurrency check (`version` field) and mutex reservation. When 20 concurrent requests hit the assign endpoint, the first acquiring thread validates eligibility and sets `status = ASSIGNED`, while the remaining 19 threads receive HTTP 409 (`ASSIGNMENT_CONFLICT`).

## Consequences
- Prevents double-assignment of technicians.
- Verified by automated tests `api/test/state-machine.test.ts` and `api/test/concurrency.test.ts`.
