import { Router } from 'express';
import { addComment, listComments } from './comment.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticateToken, requireTenant);

router.post('/', addComment);
router.get('/', listComments);

export default router;
