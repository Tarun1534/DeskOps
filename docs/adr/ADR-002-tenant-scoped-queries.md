# ADR-002: Tenant-Scoped Queries and Middleware Enforcement

## Status
Accepted

## Context
NFR-01 and AC-1.1 mandate strict multi-tenancy: every table must carry `organisationId`, and every query must be scoped by middleware rather than relying on manual developer discipline. An automated test must verify that an authenticated user of Organisation A requesting a record of Organisation B by ID receives HTTP 404 (Not Found) rather than 403 or data leakage.

## Decision
1. All application models carry `organisationId`.
2. Middleware derives `organisationId` directly from the cryptographically verified JWT access token (`req.user.organisationId`).
3. Services and repositories enforce tenant boundary checking at the query/filter level. If a requested entity does not exist or has a mismatched `organisationId`, the system returns HTTP 404 (`TICKET_NOT_FOUND`).

## Consequences
- Guaranteed cross-tenant isolation with zero tenant data cross-contamination.
- Fully verified by automated test `api/test/tenant-isolation.test.ts`.
