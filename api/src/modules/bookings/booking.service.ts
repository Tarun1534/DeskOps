import { db, MeetingRoomEntity, RoomBookingEntity } from '../../database/dataStore.js';
import { AppError } from '../../middleware/error.middleware.js';

export class BookingService {
  public static getRooms(tenantId: string): MeetingRoomEntity[] {
    return Array.from(db.meetingRooms.values()).filter(
      (r) => r.organisationId === tenantId
    );
  }

  public static getRoom(tenantId: string, roomId: string): MeetingRoomEntity | undefined {
    const room = db.meetingRooms.get(roomId);
    if (!room || room.organisationId !== tenantId) return undefined;
    return room;
  }

  public static getBookingsForRoom(
    tenantId: string,
    roomId: string,
    date?: string
  ): RoomBookingEntity[] {
    return Array.from(db.roomBookings.values()).filter((b) => {
      if (b.organisationId !== tenantId || b.meetingRoomId !== roomId || b.status !== 'CONFIRMED') {
        return false;
      }
      if (date) {
        const bookingDate = b.startTime.toISOString().split('T')[0];
        return bookingDate === date;
      }
      return true;
    });
  }

  public static createBooking(
    tenantId: string,
    roomId: string,
    memberName: string,
    memberEmail: string,
    startTime: Date,
    endTime: Date
  ): RoomBookingEntity {
    const room = this.getRoom(tenantId, roomId);
    if (!room) {
      throw new AppError(404, 'ROOM_NOT_FOUND', 'Meeting room not found');
    }

    if (startTime >= endTime) {
      throw new AppError(400, 'INVALID_TIME_RANGE', 'Start time must be before end time');
    }

    // Check overlap with existing bookings
    const existing = this.getBookingsForRoom(tenantId, roomId);
    for (const b of existing) {
      if (startTime < b.endTime && endTime > b.startTime) {
        throw new AppError(
          409,
          'BOOKING_CONFLICT',
          `Cannot create booking: overlaps with existing booking by ${b.memberName} (${b.startTime.toISOString()} - ${b.endTime.toISOString()})`
        );
      }
    }

    const newBooking: RoomBookingEntity = {
      id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organisationId: tenantId,
      meetingRoomId: roomId,
      memberName,
      memberEmail,
      startTime,
      endTime,
      status: 'CONFIRMED',
      createdAt: new Date(),
    };

    db.roomBookings.set(newBooking.id, newBooking);
    return newBooking;
  }

  /**
   * Client-Specific Rule Validation: Lumen Hatch Workspaces (FR-1.08 / AC-1.5)
   * Verifies that a scheduled repair for a meeting room falls strictly into an
   * open gap and never overlaps any member booking or outside operating hours.
   */
  public static validateRepairSchedule(
    tenantId: string,
    roomId: string,
    repairStart: Date,
    repairEnd: Date
  ): { valid: boolean; reason?: string; conflictingBooking?: RoomBookingEntity } {
    const room = this.getRoom(tenantId, roomId);
    if (!room) {
      return { valid: false, reason: 'Meeting room not found in this organisation' };
    }

    if (repairStart >= repairEnd) {
      return { valid: false, reason: 'Repair start time must be before end time' };
    }

    // 1. Operating Window Check (e.g. 08:00 to 20:00)
    const [startH, startM] = room.dailyWindowStart.split(':').map(Number);
    const [endH, endM] = room.dailyWindowEnd.split(':').map(Number);

    const repairStartMins = repairStart.getHours() * 60 + repairStart.getMinutes();
    const repairEndMins = repairEnd.getHours() * 60 + repairEnd.getMinutes();
    const windowStartMins = startH * 60 + startM;
    const windowEndMins = endH * 60 + endM;

    if (repairStartMins < windowStartMins || repairEndMins > windowEndMins) {
      return {
        valid: false,
        reason: `Repair time (${repairStart.toTimeString().substring(0, 5)} - ${repairEnd.toTimeString().substring(0, 5)}) is outside room daily operating window (${room.dailyWindowStart} - ${room.dailyWindowEnd})`,
      };
    }

    // 2. Member Booking Overlap Check
    const bookings = this.getBookingsForRoom(tenantId, roomId);
    for (const booking of bookings) {
      // Overlap condition: startA < endB && endA > startB
      if (repairStart < booking.endTime && repairEnd > booking.startTime) {
        return {
          valid: false,
          reason: `Lumen Hatch Policy Violation: Repair overlaps with member booking for '${booking.memberName}' from ${booking.startTime.toLocaleTimeString()} to ${booking.endTime.toLocaleTimeString()}`,
          conflictingBooking: booking,
        };
      }
    }

    // 3. Other scheduled room repairs overlap check
    const otherRepairs = Array.from(db.tickets.values()).filter(
      (t) =>
        t.organisationId === tenantId &&
        t.meetingRoomId === roomId &&
        t.status !== 'CLOSED' &&
        t.scheduledStart &&
        t.scheduledEnd
    );

    for (const repair of otherRepairs) {
      if (
        repair.scheduledStart &&
        repair.scheduledEnd &&
        repairStart < repair.scheduledEnd &&
        repairEnd > repair.scheduledStart
      ) {
        return {
          valid: false,
          reason: `Repair overlaps with an already scheduled ticket #${repair.ticketNumber} (${repair.title})`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Find available open gaps for a room on a given day
   */
  public static getAvailableGaps(tenantId: string, roomId: string, date: Date) {
    const room = this.getRoom(tenantId, roomId);
    if (!room) throw new AppError(404, 'ROOM_NOT_FOUND', 'Room not found');

    const dateStr = date.toISOString().split('T')[0];
    const bookings = this.getBookingsForRoom(tenantId, roomId, dateStr).sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    const [startH, startM] = room.dailyWindowStart.split(':').map(Number);
    const [endH, endM] = room.dailyWindowEnd.split(':').map(Number);

    const windowStart = new Date(date);
    windowStart.setHours(startH, startM, 0, 0);

    const windowEnd = new Date(date);
    windowEnd.setHours(endH, endM, 0, 0);

    const gaps: { start: string; end: string; durationMinutes: number }[] = [];
    let currentCursor = new Date(windowStart);

    for (const b of bookings) {
      if (b.startTime > currentCursor) {
        gaps.push({
          start: currentCursor.toISOString(),
          end: b.startTime.toISOString(),
          durationMinutes: Math.round((b.startTime.getTime() - currentCursor.getTime()) / 60000),
        });
      }
      if (b.endTime > currentCursor) {
        currentCursor = new Date(b.endTime);
      }
    }

    if (currentCursor < windowEnd) {
      gaps.push({
        start: currentCursor.toISOString(),
        end: windowEnd.toISOString(),
        durationMinutes: Math.round((windowEnd.getTime() - currentCursor.getTime()) / 60000),
      });
    }

    return gaps;
  }
}
