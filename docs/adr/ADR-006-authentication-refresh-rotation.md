# ADR-006: JWT Authentication, Refresh Token Rotation, and Role-Based Access Control

## Status
Accepted

## Context
NFR-02 and NFR-07 mandate hashed passwords (bcrypt), refresh-token rotation, Helmet, CORS allow-lists, and role-based permissions (`ORG_ADMIN`, `DESK_STAFF`, `TECHNICIAN`, `RESIDENT`).

## Decision
1. Passwords hashed using bcrypt with salt rounds = 10.
2. Short-lived JWT access tokens (15 minutes) paired with rotated refresh tokens (7 days).
3. Role-based access control middleware (`requireRoles(...)`) verifies role permissions for protected routes (e.g. resident denied staff actions like triage/assign with HTTP 403).

## Consequences
- Protects against credential theft and unauthorized actions.
- Verified by automated tests in `api/test/rbac-permissions.test.ts`.
