# ADR-005: Presigned Object Storage Uploads and Thumbnail Generation

## Status
Accepted

## Context
FR-1.04 requires images and PDFs to upload through presigned URLs, enforcing a 10MB size limit and server-side type checks, followed by background thumbnail generation.

## Decision
1. Direct S3/R2 presigned URL generation: client requests presign (`POST /tickets/:id/attachments/presign`), which verifies declared MIME (`image/jpeg`, `image/png`, `application/pdf`) and maximum size (`10MB`).
2. Verification endpoint (`POST /tickets/:id/attachments/:attachmentId/verify`) verifies the upload and queues a BullMQ background job for thumbnail generation.
3. Failed background jobs land in a Dead-Letter Queue (DLQ) with retry and admin replay capabilities.

## Consequences
- Protects API server bandwidth from handling heavy binary uploads.
- Ensures fast response times.
