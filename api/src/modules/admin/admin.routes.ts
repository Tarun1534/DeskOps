import { Router } from 'express';
import {
  getAuditLogs,
  getDeadLetterJobs,
  replayDeadLetterJob,
  getTechnicians,
  getProperties,
  getUsers,
} from './admin.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';

const router = Router();

router.use(authenticateToken, requireTenant);

router.get('/technicians', getTechnicians);
router.get('/properties', getProperties);
router.get('/users', getUsers);
router.get('/audit-logs', requireRoles('ORG_ADMIN'), getAuditLogs);
router.get('/dlq', requireRoles('ORG_ADMIN'), getDeadLetterJobs);
router.post('/dlq/:id/replay', requireRoles('ORG_ADMIN'), replayDeadLetterJob);

export default router;
