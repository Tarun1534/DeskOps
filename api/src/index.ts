import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { initSocket } from './realtime/socket.js';
import { logger } from './middleware/logger.middleware.js';

const app = createApp();
const server = http.createServer(app);

// Initialize Socket.io (FR-1.06)
initSocket(server);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  logger.info(`🚀 DeskOps Phase 1 API running on port ${PORT}`);
  logger.info(`📖 OpenAPI Docs available at http://localhost:${PORT}/docs`);
  logger.info(`⚡ Socket.io real-time engine active`);
});
