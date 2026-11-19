import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { requestLogger } from './middleware/logger.middleware.js';
import { tenantMiddleware } from './middleware/tenant.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { swaggerDocument } from './swagger.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import ticketRoutes from './modules/tickets/ticket.routes.js';
import commentRoutes from './modules/comments/comment.routes.js';
import attachmentRoutes from './modules/attachments/attachment.routes.js';
import bookingRoutes from './modules/bookings/booking.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import webhookRoutes from './modules/webhooks/webhook.routes.js';

export const createApp = () => {
  const app = express();

  // Security & standard middleware
  app.use(helmet({
    contentSecurityPolicy: false, // allow Swagger UI and local development
  }));
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-organisation-id', 'x-request-id', 'Idempotency-Key'],
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);
  app.use(tenantMiddleware);

  // Probes (NFR-06)
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.get('/ready', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ready', database: 'connected', redis: 'connected' });
  });

  // OpenAPI Swagger Documentation (NFR-04)
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // API v1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);
  app.use('/api/v1/tickets', ticketRoutes);
  app.use('/api/v1/tickets/:id/comments', commentRoutes);
  app.use('/api/v1/tickets/:id/attachments', attachmentRoutes);
  app.use('/api/v1', bookingRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // Fallback 404
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route '${req.originalUrl}' not found on this server`,
      },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
