import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/database/dataStore.js';

describe('FR-1.08 & AC-1.5: Client-Specific Rule — Lumen Hatch Workspaces', () => {
  const app = createApp();
  let staffToken: string;

  beforeEach(async () => {
    db.reset();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@lumenhatch.com', password: 'Password@123' });
    staffToken = loginRes.body.data.accessToken;
  });

  it('rejects a repair ticket if scheduled start/end overlaps an existing member booking', async () => {
    // Room A (Apollo Boardroom) has existing member booking from 09:00 to 11:30 today
    const today = new Date();
    const repairStart = new Date(today);
    repairStart.setHours(9, 30, 0, 0); // overlaps with 09:00 - 11:30
    const repairEnd = new Date(today);
    repairEnd.setHours(10, 30, 0, 0);

    const conflictRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: 'Projector repair in Boardroom A',
        description: 'HDMI port loose, requires soldering',
        category: 'ROOM_REPAIR',
        priority: 'HIGH',
        propertyId: 'prop-1',
        meetingRoomId: 'room-alpha',
        scheduledStart: repairStart.toISOString(),
        scheduledEnd: repairEnd.toISOString(),
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.error.code).toBe('BOOKING_CONFLICT');
    expect(conflictRes.body.error.message).toContain('Lumen Hatch Policy Violation');
    expect(conflictRes.body.error.message).toContain('overlaps with member booking');
  });

  it('rejects a repair ticket if scheduled outside the room daily operating window', async () => {
    // Room A operates 08:00 to 20:00. Attempt 06:00 to 07:30
    const today = new Date();
    const earlyStart = new Date(today);
    earlyStart.setHours(6, 0, 0, 0);
    const earlyEnd = new Date(today);
    earlyEnd.setHours(7, 30, 0, 0);

    const earlyRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: 'Dawn light fixture inspection',
        description: 'Early morning ceiling light replacement',
        category: 'ROOM_REPAIR',
        priority: 'MEDIUM',
        propertyId: 'prop-1',
        meetingRoomId: 'room-alpha',
        scheduledStart: earlyStart.toISOString(),
        scheduledEnd: earlyEnd.toISOString(),
      });

    expect(earlyRes.status).toBe(409);
    expect(earlyRes.body.error.code).toBe('BOOKING_CONFLICT');
    expect(earlyRes.body.error.message).toContain('outside room daily operating window');
  });

  it('successfully creates a repair ticket when placed in an open gap between bookings', async () => {
    // Member booking 1 ends at 11:30. Member booking 2 starts at 14:00.
    // 12:00 to 13:30 is an open gap!
    const today = new Date();
    const gapStart = new Date(today);
    gapStart.setHours(12, 0, 0, 0);
    const gapEnd = new Date(today);
    gapEnd.setHours(13, 30, 0, 0);

    const gapRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: 'Projector bulb replacement in Boardroom A',
        description: 'Scheduled strictly during afternoon booking gap',
        category: 'ROOM_REPAIR',
        priority: 'HIGH',
        propertyId: 'prop-1',
        meetingRoomId: 'room-alpha',
        scheduledStart: gapStart.toISOString(),
        scheduledEnd: gapEnd.toISOString(),
      });

    expect(gapRes.status).toBe(201);
    expect(gapRes.body.success).toBe(true);
    expect(gapRes.body.data.id).toBeDefined();
    expect(gapRes.body.data.meetingRoomId).toBe('room-alpha');
  });
});
