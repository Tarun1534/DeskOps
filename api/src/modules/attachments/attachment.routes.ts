import { Router } from 'express';
import {
  getPresignedUploadUrl,
  verifyUpload,
  listAttachments,
} from './attachment.controller.js';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticateToken, requireTenant);

router.post('/presign', getPresignedUploadUrl);
router.post('/:attachmentId/verify', verifyUpload);
router.get('/', listAttachments);

export default router;
