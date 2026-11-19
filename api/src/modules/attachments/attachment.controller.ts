import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { db, AttachmentEntity } from '../../database/dataStore.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { AppError } from '../../middleware/error.middleware.js';
import { ThumbnailWorker } from '../../workers/bullmq.worker.js';
import { TicketService } from '../tickets/ticket.service.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

const PresignSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export const getPresignedUploadUrl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const { id: ticketId } = req.params;
    const body = PresignSchema.parse(req.body);

    await TicketService.getTicketById(tenantId, ticketId, user);

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(body.mimeType.toLowerCase())) {
      throw new AppError(
        400,
        'INVALID_FILE_TYPE',
        `File type '${body.mimeType}' is not supported. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    // Validate size limit (10MB)
    if (body.sizeBytes > MAX_SIZE_BYTES) {
      throw new AppError(
        400,
        'FILE_TOO_LARGE',
        `File size exceeds maximum limit of 10 MB (${body.sizeBytes} bytes provided)`
      );
    }

    const fileId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const s3Key = `tenants/${tenantId}/tickets/${ticketId}/${fileId}-${body.filename}`;
    const uploadUrl = `https://storage.deskops.internal/${s3Key}?uploadToken=presigned_${Date.now()}`;
    const publicUrl = `https://cdn.deskops.internal/${s3Key}`;

    const attachment: AttachmentEntity = {
      id: fileId,
      organisationId: tenantId,
      ticketId,
      uploadedById: user.id,
      filename: body.filename,
      s3Key,
      url: publicUrl,
      thumbnailUrl: null,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      status: 'PENDING',
      createdAt: new Date(),
    };

    db.attachments.set(attachment.id, attachment);

    return res.status(200).json({
      success: true,
      data: {
        attachmentId: attachment.id,
        uploadUrl,
        publicUrl,
        expiresInSeconds: 900,
        headers: {
          'Content-Type': body.mimeType,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const verifyUpload = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const { id: ticketId, attachmentId } = req.params;

    await TicketService.getTicketById(tenantId, ticketId, user);

    const attachment = db.attachments.get(attachmentId);
    if (!attachment || attachment.organisationId !== tenantId || attachment.ticketId !== ticketId) {
      throw new AppError(404, 'ATTACHMENT_NOT_FOUND', 'Attachment not found');
    }

    attachment.status = 'VERIFIED';

    // Queue BullMQ thumbnail generation for images/PDFs
    await ThumbnailWorker.enqueueThumbnailJob({
      tenantId,
      attachmentId: attachment.id,
      ticketId: attachment.ticketId,
      filename: attachment.filename,
    });

    return res.json({
      success: true,
      data: attachment,
    });
  } catch (err) {
    next(err);
  }
};

export const listAttachments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const { id: ticketId } = req.params;

    await TicketService.getTicketById(tenantId, ticketId, user);

    const attachments = Array.from(db.attachments.values()).filter(
      (a) => a.ticketId === ticketId && a.organisationId === tenantId
    );

    return res.json({ success: true, data: attachments });
  } catch (err) {
    next(err);
  }
};
