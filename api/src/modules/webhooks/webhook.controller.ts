import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db, TicketEntity, CommentEntity } from '../../database/dataStore.js';
import { AppError } from '../../middleware/error.middleware.js';
import { emitTicketEvent } from '../../realtime/socket.js';

const InboundEmailSchema = z.object({
  from: z.string().email(),
  to: z.string().optional(),
  subject: z.string().min(1),
  textBody: z.string().min(1),
  htmlBody: z.string().optional(),
  messageId: z.string().optional(),
});

export const handleInboundEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = (req.headers['x-organisation-id'] as string) || 'org-lumen-hatch';
    const body = InboundEmailSchema.parse(req.body);

    // Find sender user in tenant
    const sender = Array.from(db.users.values()).find(
      (u) => u.organisationId === tenantId && u.email.toLowerCase() === body.from.toLowerCase()
    );

    if (!sender) {
      return next(
        new AppError(
          404,
          'SENDER_NOT_FOUND',
          `Inbound email sender '${body.from}' not registered in organisation`
        )
      );
    }

    // Check if subject has reply token, e.g. [#1001] or [#TICK-1001]
    const tokenMatch = body.subject.match(/\[#(?:TICK-)?(\d+)\]/i);

    if (tokenMatch) {
      const ticketNum = parseInt(tokenMatch[1], 10);
      const ticket = Array.from(db.tickets.values()).find(
        (t) => t.organisationId === tenantId && t.ticketNumber === ticketNum
      );

      if (ticket) {
        // Thread as comment (FR-1.05)
        const comment: CommentEntity = {
          id: `comm_email_${Date.now()}`,
          organisationId: tenantId,
          ticketId: ticket.id,
          authorId: sender.id,
          content: `[Inbound Email]: ${body.textBody}`,
          isInternal: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        db.comments.set(comment.id, comment);

        db.ticketEvents.push({
          id: `evt_email_${Date.now()}`,
          organisationId: tenantId,
          ticketId: ticket.id,
          actorId: sender.id,
          action: 'EMAIL_REPLY_THREADED',
          fromStatus: ticket.status,
          toStatus: ticket.status,
          metadata: { subject: body.subject, from: body.from },
          createdAt: new Date(),
        });

        emitTicketEvent(tenantId, 'comment:added', {
          ticketId: ticket.id,
          comment: { ...comment, authorName: sender.name },
        });

        return res.status(200).json({
          success: true,
          action: 'THREADED_COMMENT',
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
        });
      }
    }

    // Otherwise create new ticket from email
    const property = Array.from(db.properties.values()).find(
      (p) => p.organisationId === tenantId
    );

    const newTicket: TicketEntity = {
      id: `tick_email_${Date.now()}`,
      organisationId: tenantId,
      ticketNumber: db.nextTicketNumber(),
      title: body.subject,
      description: body.textBody,
      category: 'GENERAL',
      priority: 'MEDIUM',
      status: 'NEW',
      propertyId: property ? property.id : 'prop-1',
      unitId: sender.unitId || null,
      createdById: sender.id,
      assignedTechnicianId: null,
      version: 1,
      isDuplicate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.tickets.set(newTicket.id, newTicket);

    db.ticketEvents.push({
      id: `evt_email_${Date.now()}`,
      organisationId: tenantId,
      ticketId: newTicket.id,
      actorId: sender.id,
      action: 'EMAIL_TICKET_CREATED',
      fromStatus: null,
      toStatus: 'NEW',
      metadata: { from: body.from, subject: body.subject },
      createdAt: new Date(),
    });

    emitTicketEvent(tenantId, 'ticket:created', newTicket);

    return res.status(201).json({
      success: true,
      action: 'CREATED_TICKET',
      ticket: newTicket,
    });
  } catch (err) {
    next(err);
  }
};
