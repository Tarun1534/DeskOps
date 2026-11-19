import { db } from '../database/dataStore.js';
import { logger } from '../middleware/logger.middleware.js';

export interface ThumbnailJobPayload {
  tenantId: string;
  attachmentId: string;
  ticketId: string;
  filename: string;
}

export class ThumbnailWorker {
  public static async enqueueThumbnailJob(payload: ThumbnailJobPayload) {
    logger.info({ payload }, 'Thumbnail generation job queued');
    
    // Simulate async job execution with retry backoff & dead-letter queue capture
    setTimeout(async () => {
      try {
        await ThumbnailWorker.processJob(payload);
      } catch (err: any) {
        logger.error({ err, payload }, 'Thumbnail job failed, moving to Dead-Letter Queue');
        db.deadLetterJobs.set(`dlq_${Date.now()}`, {
          id: `dlq_${Date.now()}`,
          organisationId: payload.tenantId,
          queueName: 'thumbnail-generation',
          jobName: 'generate-thumbnail',
          payload,
          errorReason: err.message || 'Processing failed',
          failedAt: new Date(),
        });
      }
    }, 100);
  }

  public static async processJob(payload: ThumbnailJobPayload) {
    const attachment = db.attachments.get(payload.attachmentId);
    if (!attachment || attachment.organisationId !== payload.tenantId) {
      throw new Error(`Attachment ${payload.attachmentId} not found`);
    }

    // Generate mock thumbnail URL
    attachment.thumbnailUrl = `${attachment.url}?thumbnail=true&w=200&h=200`;
    attachment.status = 'VERIFIED';
    logger.info(`Thumbnail generated successfully for attachment ${payload.attachmentId}`);
  }

  public static async replayDeadLetterJob(dlqId: string, tenantId: string) {
    const job = db.deadLetterJobs.get(dlqId);
    if (!job || job.organisationId !== tenantId) {
      throw new Error('Dead-letter job not found');
    }

    await ThumbnailWorker.processJob(job.payload);
    job.replayedAt = new Date();
    return job;
  }
}
