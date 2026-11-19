# ADR-004: Client-Specific Rule Integration — Lumen Hatch Workspaces

## Status
Accepted

## Context
FR-1.08 and AC-1.5 require the implementation of the team's assigned client rule.
Client: Lumen Hatch Workspaces
Stakeholder: Ananya Deshpande, Head of Facilities Operations
Rule:
"Our members book desks and meeting rooms by the day, and each room has a fixed daily booking window. When a repair ticket is raised for a room, it must be scheduled into a gap that does not overlap any booking. Please make sure the system never places a repair on top of a member's booking. Our front desk team relies on this to keep sessions running smoothly."

## Decision
1. Introduce `MeetingRoom` and `RoomBooking` models scoped under `Organisation`. Each room specifies `dailyWindowStart` (e.g. `08:00`) and `dailyWindowEnd` (e.g. `20:00`).
2. When creating or scheduling a repair ticket associated with a `meetingRoomId`, `BookingService.validateRepairSchedule(...)` enforces:
   - Operating Window Check: Proposed repair times must fall within the room's daily hours.
   - Member Booking Overlap Check: Mathematical interval overlap check (`repairStart < booking.endTime && repairEnd > booking.startTime`). If an overlap occurs, the API returns HTTP 409 (`BOOKING_CONFLICT`) with details of the conflicting member reservation.
   - Other Scheduled Repairs Check: Prevents overlapping repairs in the same room.
3. Expose `/api/v1/rooms/:roomId/gaps` endpoint and UI view to calculate and display available maintenance gaps.

## Consequences
- Member sessions run without maintenance interruption.
- Verified by automated tests in `api/test/client-rule-lumen-hatch.test.ts`.
