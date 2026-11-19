import { Router } from 'express';
import {
  createTicket,
  listTickets,
  getTicket,
  triageTicket,
  assignTicket,
  transitionTicket,
  mergeTicket,
  getEvents,
} from './ticket.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware.js';

const router = Router();

router.use(authenticateToken, requireTenant);

router.post('/', idempotencyMiddleware, createTicket);
router.get('/', listTickets);
router.get('/:id', getTicket);
router.post('/:id/triage', requireRoles('ORG_ADMIN', 'DESK_STAFF'), triageTicket);
router.post('/:id/assign', requireRoles('ORG_ADMIN', 'DESK_STAFF'), assignTicket);
router.post('/:id/transitions', transitionTicket);
router.post('/:id/merge', requireRoles('ORG_ADMIN', 'DESK_STAFF'), mergeTicket);
router.get('/:id/events', getEvents);

export default router;
