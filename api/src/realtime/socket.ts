import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../middleware/logger.middleware.js';

let io: SocketIOServer | null = null;

export const initSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id}`);

    socket.on('join:tenant', (tenantId: string) => {
      socket.join(`tenant:${tenantId}`);
      logger.info(`Socket ${socket.id} joined room tenant:${tenantId}`);
    });

    socket.on('join:ticket', (ticketId: string) => {
      socket.join(`ticket:${ticketId}`);
      logger.info(`Socket ${socket.id} joined room ticket:${ticketId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => io;

export const emitTicketEvent = (tenantId: string, eventName: string, payload: any) => {
  if (!io) return;
  io.to(`tenant:${tenantId}`).emit(eventName, payload);
  if (payload.ticketId) {
    io.to(`ticket:${payload.ticketId}`).emit(eventName, payload);
  }
};
