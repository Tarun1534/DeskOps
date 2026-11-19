import { Router } from 'express';
import {
  getRooms,
  getBookings,
  createBooking,
  checkGap,
  getAvailableGaps,
} from './booking.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';

const router = Router();

router.get('/rooms', authenticateToken, requireTenant, getRooms);
router.get('/rooms/:roomId/bookings', authenticateToken, requireTenant, getBookings);
router.post(
  '/rooms/:roomId/bookings',
  authenticateToken,
  requireTenant,
  requireRoles('ORG_ADMIN', 'DESK_STAFF'),
  createBooking
);
router.post('/rooms/:roomId/check-gap', authenticateToken, requireTenant, checkGap);
router.get('/rooms/:roomId/gaps', authenticateToken, requireTenant, getAvailableGaps);

export default router;
