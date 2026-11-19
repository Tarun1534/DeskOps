import { Router } from 'express';
import { handleInboundEmail } from './webhook.controller.js';

const router = Router();

router.post('/email/inbound', handleInboundEmail);

export default router;
