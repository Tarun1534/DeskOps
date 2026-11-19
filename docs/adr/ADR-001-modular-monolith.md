# ADR-001: Modular Monolith Architecture

## Status
Accepted

## Context
DeskOps Phase 1 delivers the core ticketing service desk engine, multi-tenancy, real-time ticket state transitions, and background jobs. In order to maximize engineering velocity, avoid distributed transaction failures, and maintain atomic database consistency under strict concurrency constraints (e.g. 20 parallel assignments), an architecture must be selected.

## Decision
Adopt a modular monolith architecture with Express / Node.js 22 + TypeScript, PostgreSQL with Prisma, Redis with BullMQ for asynchronous workers, and React 18 + Vite on the frontend. The backend is organized by distinct business modules (`tickets`, `bookings`, `auth`, `admin`, `comments`, `attachments`, `webhooks`) sharing a single data store.

## Consequences
- Single deployable backend artifact.
- Eliminates network overhead between services and simplifies Docker / CI deployment.
- Strict module separation allows easy extraction of services in later phases if scale requires.
