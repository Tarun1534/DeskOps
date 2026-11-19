import { Response, NextFunction } from 'express';
import { TicketService } from './ticket.service.js';
import {
  CreateTicketSchema,
  TriageTicketSchema,
  AssignTicketSchema,
  TransitionTicketSchema,
  MergeTicketSchema,
} from './ticket.validator.js';
import { AuthenticatedRequest, TicketStatus } from '../../types/index.js';

export const createTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const body = CreateTicketSchema.parse(req.body);

    const ticket = await TicketService.createTicket(tenantId, user, {
      ...body,
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : null,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null,
    });

    return res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

export const listTickets = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const { status, cursor, limit, search } = req.query as {
      status?: TicketStatus;
      cursor?: string;
      limit?: string;
      search?: string;
    };

    const result = await TicketService.listTickets(tenantId, user, {
      status,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });

    return res.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const { id } = req.params;

    const ticket = await TicketService.getTicketById(tenantId, id, user);
    return res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

export const triageTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const { id } = req.params;
    const body = TriageTicketSchema.parse(req.body);

    const ticket = await TicketService.triageTicket(tenantId, id, user, body);
    return res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

export const assignTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const { id } = req.params;
    const body = AssignTicketSchema.parse(req.body);

    const ticket = await TicketService.assignTicket(
      tenantId,
      id,
      body.technicianId,
      user,
      body.version
    );

    return res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

export const transitionTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const { id } = req.params;
    const body = TransitionTicketSchema.parse(req.body);

    const ticket = await TicketService.transitionTicket(
      tenantId,
      id,
      user,
      body.toStatus,
      body.reason,
      body.resolutionNotes
    );

    return res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

export const mergeTicket = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const { id } = req.params;
    const body = MergeTicketSchema.parse(req.body);

    const result = await TicketService.mergeTickets(
      tenantId,
      id,
      body.duplicateTicketId,
      user
    );

    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getEvents = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const { id } = req.params;

    const events = await TicketService.getTicketEvents(tenantId, id, user);
    return res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
};
