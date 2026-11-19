import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { db, CommentEntity } from '../../database/dataStore.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { AppError } from '../../middleware/error.middleware.js';
import { emitTicketEvent } from '../../realtime/socket.js';
import { TicketService } from '../tickets/ticket.service.js';

const CreateCommentSchema = z.object({
  content: z.string().min(1).max(3000),
  isInternal: z.boolean().default(false),
});

export const addComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const ticketId = req.params.id as string;
    const body = CreateCommentSchema.parse(req.body);

    // Verify ticket access
    const ticket = await TicketService.getTicketById(tenantId, ticketId, user);

    // Residents cannot create internal comments
    if (user.role === 'RESIDENT' && body.isInternal) {
      throw new AppError(403, 'FORBIDDEN', 'Residents cannot post internal staff-only comments');
    }

    const comment: CommentEntity = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organisationId: tenantId,
      ticketId: ticket.id,
      authorId: user.id,
      content: body.content,
      isInternal: body.isInternal,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.comments.set(comment.id, comment);

    // Add ticket event
    db.ticketEvents.push({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organisationId: tenantId,
      ticketId: ticket.id,
      actorId: user.id,
      action: 'COMMENT_ADDED',
      fromStatus: ticket.status,
      toStatus: ticket.status,
      metadata: { isInternal: comment.isInternal, authorName: user.name },
      createdAt: new Date(),
    });

    emitTicketEvent(tenantId, 'comment:added', {
      ticketId: ticket.id,
      comment: { ...comment, authorName: user.name },
    });

    return res.status(201).json({
      success: true,
      data: { ...comment, authorName: user.name },
    });
  } catch (err) {
    next(err);
  }
};

export const listComments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const ticketId = req.params.id as string;

    // Verify ticket access
    await TicketService.getTicketById(tenantId, ticketId, user);

    let comments = Array.from(db.comments.values()).filter(
      (c) => c.ticketId === ticketId && c.organisationId === tenantId
    );

    // Filter out internal comments for residents (FR-1.07)
    if (user.role === 'RESIDENT') {
      comments = comments.filter((c) => !c.isInternal);
    }

    // Attach author names
    const enriched = comments.map((c) => {
      const author = db.users.get(c.authorId);
      return {
        ...c,
        authorName: author?.name || 'Unknown',
        authorRole: author?.role || 'RESIDENT',
      };
    });

    enriched.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};
