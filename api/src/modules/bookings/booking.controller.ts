import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { BookingService } from './booking.service.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { AppError } from '../../middleware/error.middleware.js';

const CreateBookingSchema = z.object({
  memberName: z.string().min(1),
  memberEmail: z.string().email(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

const CheckGapSchema = z.object({
  repairStart: z.string().datetime(),
  repairEnd: z.string().datetime(),
});

export const getRooms = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const rooms = BookingService.getRooms(tenantId);
    return res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
};

export const getBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { roomId } = req.params;
    const { date } = req.query as { date?: string };
    const bookings = BookingService.getBookingsForRoom(tenantId, roomId, date);
    return res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
};

export const createBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { roomId } = req.params;
    const body = CreateBookingSchema.parse(req.body);

    const booking = BookingService.createBooking(
      tenantId,
      roomId,
      body.memberName,
      body.memberEmail,
      new Date(body.startTime),
      new Date(body.endTime)
    );

    return res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

export const checkGap = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { roomId } = req.params;
    const body = CheckGapSchema.parse(req.body);

    const result = BookingService.validateRepairSchedule(
      tenantId,
      roomId,
      new Date(body.repairStart),
      new Date(body.repairEnd)
    );

    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getAvailableGaps = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { roomId } = req.params;
    const dateStr = (req.query.date as string) || new Date().toISOString();
    const gaps = BookingService.getAvailableGaps(tenantId, roomId, new Date(dateStr));
    return res.json({ success: true, data: gaps });
  } catch (err) {
    next(err);
  }
};
