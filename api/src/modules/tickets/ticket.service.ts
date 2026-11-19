import { db, TicketEntity, TicketEventEntity } from '../../database/dataStore.js';
import { AppError } from '../../middleware/error.middleware.js';
import { BookingService } from '../bookings/booking.service.js';
import { emitTicketEvent } from '../../realtime/socket.js';
import { AuthUser, TicketStatus, TicketPriority } from '../../types/index.js';

export class TicketService {
  /**
   * Allowed state machine transitions (FR-1.02)
   */
  private static readonly ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    NEW: ['TRIAGED'],
    TRIAGED: ['ASSIGNED'],
    ASSIGNED: ['IN_PROGRESS', 'ON_HOLD'],
    IN_PROGRESS: ['ON_HOLD', 'RESOLVED'],
    ON_HOLD: ['IN_PROGRESS', 'ASSIGNED'],
    RESOLVED: ['CLOSED', 'TRIAGED'], // Reopen goes to TRIAGED
    CLOSED: ['TRIAGED'],             // Reopen goes to TRIAGED
  };

  public static async createTicket(
    tenantId: string,
    user: AuthUser,
    data: {
      title: string;
      description: string;
      category?: string;
      priority?: TicketPriority;
      propertyId: string;
      unitId?: string | null;
      meetingRoomId?: string | null;
      scheduledStart?: Date | null;
      scheduledEnd?: Date | null;
    }
  ): Promise<TicketEntity> {
    // If ticket is for a meeting room with scheduled times (Lumen Hatch client rule FR-1.08)
    if (data.meetingRoomId && data.scheduledStart && data.scheduledEnd) {
      const gapValidation = BookingService.validateRepairSchedule(
        tenantId,
        data.meetingRoomId,
        data.scheduledStart,
        data.scheduledEnd
      );
      if (!gapValidation.valid) {
        throw new AppError(
          409,
          'BOOKING_CONFLICT',
          `Client Rule Violation (Lumen Hatch Workspaces): ${gapValidation.reason}`,
          { conflictingBooking: gapValidation.conflictingBooking }
        );
      }
    }

    const ticketId = `tick_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ticketNumber = db.nextTicketNumber();

    const ticket: TicketEntity = {
      id: ticketId,
      organisationId: tenantId,
      ticketNumber,
      title: data.title,
      description: data.description,
      category: data.category || 'GENERAL',
      priority: data.priority || 'MEDIUM',
      status: 'NEW',
      propertyId: data.propertyId,
      unitId: data.unitId || user.unitId || null,
      meetingRoomId: data.meetingRoomId || null,
      createdById: user.id,
      assignedTechnicianId: null,
      scheduledStart: data.scheduledStart || null,
      scheduledEnd: data.scheduledEnd || null,
      version: 1,
      isDuplicate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.tickets.set(ticket.id, ticket);

    // Initial event
    const event: TicketEventEntity = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organisationId: tenantId,
      ticketId: ticket.id,
      actorId: user.id,
      action: 'CREATED',
      fromStatus: null,
      toStatus: 'NEW',
      metadata: { priority: ticket.priority, category: ticket.category },
      createdAt: new Date(),
    };
    db.ticketEvents.push(event);

    emitTicketEvent(tenantId, 'ticket:created', ticket);
    return ticket;
  }

  public static async getTicketById(tenantId: string, ticketId: string, user: AuthUser): Promise<TicketEntity> {
    const ticket = db.tickets.get(ticketId);
    // Strict tenant isolation (NFR-01, AC-1.1): if ticket doesn't exist or belongs to another org, return 404!
    if (!ticket || ticket.organisationId !== tenantId) {
      throw new AppError(404, 'TICKET_NOT_FOUND', `Ticket with ID ${ticketId} not found`);
    }

    // Role-based visibility check: Residents can only access their own unit's or created tickets
    if (user.role === 'RESIDENT' && ticket.createdById !== user.id && ticket.unitId !== user.unitId) {
      throw new AppError(403, 'FORBIDDEN', 'Residents can only view tickets raised by or for their unit');
    }

    return ticket;
  }

  public static async listTickets(
    tenantId: string,
    user: AuthUser,
    options: {
      status?: TicketStatus;
      cursor?: string;
      limit?: number;
      search?: string;
    }
  ) {
    const limit = Math.min(options.limit || 20, 100);
    let all = Array.from(db.tickets.values()).filter((t) => t.organisationId === tenantId);

    // Filter for resident
    if (user.role === 'RESIDENT') {
      all = all.filter((t) => t.createdById === user.id || t.unitId === user.unitId);
    } else if (user.role === 'TECHNICIAN') {
      // Technicians see tickets assigned to them or unassigned in progress
      // (or all tenant tickets for desk visibility)
    }

    if (options.status) {
      all = all.filter((t) => t.status === options.status);
    }

    if (options.search) {
      const q = options.search.toLowerCase();
      all = all.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          String(t.ticketNumber).includes(q)
      );
    }

    // Sort by createdAt descending
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Cursor pagination (NFR-04)
    let startIndex = 0;
    if (options.cursor) {
      const cursorIndex = all.findIndex((t) => t.id === options.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const items = all.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < all.length;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return {
      items,
      pagination: {
        nextCursor,
        hasMore,
        total: all.length,
      },
    };
  }

  public static async triageTicket(
    tenantId: string,
    ticketId: string,
    actor: AuthUser,
    data: { category?: string; priority?: TicketPriority }
  ): Promise<TicketEntity> {
    const ticket = await this.getTicketById(tenantId, ticketId, actor);

    if (ticket.status !== 'NEW') {
      throw new AppError(
        400,
        'ILLEGAL_STATE_TRANSITION',
        `Cannot triage ticket from status '${ticket.status}'. Must be NEW.`
      );
    }

    const prevStatus = ticket.status;
    ticket.status = 'TRIAGED';
    if (data.category) ticket.category = data.category;
    if (data.priority) ticket.priority = data.priority;
    ticket.version += 1;
    ticket.updatedAt = new Date();

    const event: TicketEventEntity = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organisationId: tenantId,
      ticketId: ticket.id,
      actorId: actor.id,
      action: 'TRIAGED',
      fromStatus: prevStatus,
      toStatus: 'TRIAGED',
      metadata: { priority: ticket.priority, category: ticket.category },
      createdAt: new Date(),
    };
    db.ticketEvents.push(event);

    emitTicketEvent(tenantId, 'ticket:updated', ticket);
    return ticket;
  }

  public static async assignTicket(
    tenantId: string,
    ticketId: string,
    technicianId: string,
    actor: AuthUser,
    expectedVersion?: number
  ): Promise<TicketEntity> {
    // Atomic assign with optimistic lock / mutex lock (NFR-03, AC-1.2)
    const result = await db.atomicAssignTicket(
      tenantId,
      ticketId,
      technicianId,
      actor.id,
      expectedVersion
    );

    if (!result.success || !result.ticket) {
      throw new AppError(409, 'ASSIGNMENT_CONFLICT', result.conflictReason || 'Assignment conflict');
    }

    emitTicketEvent(tenantId, 'ticket:assigned', result.ticket);
    return result.ticket;
  }

  public static async transitionTicket(
    tenantId: string,
    ticketId: string,
    actor: AuthUser,
    toStatus: TicketStatus,
    reason?: string,
    resolutionNotes?: string
  ): Promise<TicketEntity> {
    const ticket = await this.getTicketById(tenantId, ticketId, actor);
    const fromStatus = ticket.status;

    // Check legality against strict state machine (FR-1.02)
    const allowed = this.ALLOWED_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      throw new AppError(
        400,
        'ILLEGAL_STATE_TRANSITION',
        `Illegal transition from '${fromStatus}' to '${toStatus}'. Allowed: [${allowed.join(', ')}]`
      );
    }

    // Configurable Reopen Window Check
    if (toStatus === 'TRIAGED' && (fromStatus === 'RESOLVED' || fromStatus === 'CLOSED')) {
      const org = db.organisations.get(tenantId);
      const windowDays = org?.reopenWindowDays ?? 7;
      const baseDate = ticket.closedAt || ticket.resolvedAt || ticket.updatedAt;
      const daysSince = (Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince > windowDays) {
        throw new AppError(
          400,
          'REOPEN_WINDOW_EXPIRED',
          `Cannot reopen ticket after ${windowDays} days. Closed ${Math.floor(daysSince)} days ago.`
        );
      }
      ticket.reopenedAt = new Date();
    }

    if (toStatus === 'ON_HOLD') {
      ticket.holdReason = reason || 'Awaiting materials / resident response';
    } else if (fromStatus === 'ON_HOLD') {
      ticket.holdReason = null;
    }

    if (toStatus === 'RESOLVED') {
      ticket.resolvedAt = new Date();
      ticket.resolutionNotes = resolutionNotes || 'Work completed successfully';
    }

    if (toStatus === 'CLOSED') {
      ticket.closedAt = new Date();
    }

    ticket.status = toStatus;
    ticket.version += 1;
    ticket.updatedAt = new Date();

    const event: TicketEventEntity = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organisationId: tenantId,
      ticketId: ticket.id,
      actorId: actor.id,
      action: toStatus === 'TRIAGED' && (fromStatus === 'RESOLVED' || fromStatus === 'CLOSED') ? 'REOPENED' : 'STATUS_CHANGED',
      fromStatus,
      toStatus,
      metadata: { reason, resolutionNotes },
      createdAt: new Date(),
    };
    db.ticketEvents.push(event);

    emitTicketEvent(tenantId, 'ticket:updated', ticket);
    return ticket;
  }

  /**
   * Change Request CR-1: Merge duplicate tickets (Section 4.2, AC-1.4)
   * The duplicate closes, its comments and watchers move to the original.
   */
  public static async mergeTickets(
    tenantId: string,
    originalTicketId: string,
    duplicateTicketId: string,
    actor: AuthUser
  ): Promise<{ original: TicketEntity; duplicate: TicketEntity }> {
    if (originalTicketId === duplicateTicketId) {
      throw new AppError(400, 'INVALID_MERGE', 'A ticket cannot be merged into itself');
    }

    const original = await this.getTicketById(tenantId, originalTicketId, actor);
    const duplicate = await this.getTicketById(tenantId, duplicateTicketId, actor);

    if (duplicate.isDuplicate || duplicate.status === 'CLOSED') {
      throw new AppError(400, 'INVALID_MERGE', 'Duplicate ticket is already closed or merged');
    }

    // Move comments from duplicate to original
    for (const comment of db.comments.values()) {
      if (comment.ticketId === duplicate.id && comment.organisationId === tenantId) {
        comment.ticketId = original.id;
        comment.content = `[Merged from #${duplicate.ticketNumber}]: ${comment.content}`;
      }
    }

    // Move watchers from duplicate to original
    for (const watcher of db.watchers.values()) {
      if (watcher.ticketId === duplicate.id && watcher.organisationId === tenantId) {
        const key = `${original.id}_${watcher.userId}`;
        const alreadyWatching = Array.from(db.watchers.values()).some(
          (w) => w.ticketId === original.id && w.userId === watcher.userId
        );
        if (!alreadyWatching) {
          watcher.ticketId = original.id;
        }
      }
    }

    // Close duplicate and set merge pointers
    const duplicatePrevStatus = duplicate.status;
    duplicate.status = 'CLOSED';
    duplicate.isDuplicate = true;
    duplicate.mergedIntoTicketId = original.id;
    duplicate.closedAt = new Date();
    duplicate.version += 1;
    duplicate.updatedAt = new Date();

    original.version += 1;
    original.updatedAt = new Date();

    // Record events on both tickets
    db.ticketEvents.push({
      id: `evt_${Date.now()}_dup`,
      organisationId: tenantId,
      ticketId: duplicate.id,
      actorId: actor.id,
      action: 'MERGED_INTO',
      fromStatus: duplicatePrevStatus,
      toStatus: 'CLOSED',
      metadata: { mergedIntoTicketId: original.id, originalNumber: original.ticketNumber },
      createdAt: new Date(),
    });

    db.ticketEvents.push({
      id: `evt_${Date.now()}_orig`,
      organisationId: tenantId,
      ticketId: original.id,
      actorId: actor.id,
      action: 'MERGED_SOURCE',
      fromStatus: original.status,
      toStatus: original.status,
      metadata: { mergedFromTicketId: duplicate.id, duplicateNumber: duplicate.ticketNumber },
      createdAt: new Date(),
    });

    emitTicketEvent(tenantId, 'ticket:updated', original);
    emitTicketEvent(tenantId, 'ticket:updated', duplicate);

    return { original, duplicate };
  }

  public static async getTicketEvents(tenantId: string, ticketId: string, user: AuthUser): Promise<TicketEventEntity[]> {
    await this.getTicketById(tenantId, ticketId, user);
    return db.ticketEvents
      .filter((e) => e.ticketId === ticketId && e.organisationId === tenantId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
