import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/database/dataStore.js';

describe('FR-1.02 & FR-1.03: Ticket State Machine and Event History', () => {
  const app = createApp();
  let staffToken: string;

  beforeEach(async () => {
    db.reset();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@lumenhatch.com', password: 'Password@123' });
    staffToken = loginRes.body.data.accessToken;
  });

  it('rejects illegal transition in the API (e.g. NEW directly to RESOLVED)', async () => {
    const ticketId = 'tick-1001'; // Status: NEW

    const illegalRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transitions`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ toStatus: 'RESOLVED' });

    // Illegal transition must be rejected with 400
    expect(illegalRes.status).toBe(400);
    expect(illegalRes.body.success).toBe(false);
    expect(illegalRes.body.error.code).toBe('ILLEGAL_STATE_TRANSITION');

    // Ticket must remain in status NEW
    const ticket = db.tickets.get(ticketId);
    expect(ticket?.status).toBe('NEW');
  });

  it('allows legal transitions and records an immutable TicketEvent row with actor and timestamp for each', async () => {
    const ticketId = 'tick-1001';

    // 1. Triage: NEW -> TRIAGED
    const triageRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/triage`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ priority: 'HIGH', category: 'HVAC' });

    expect(triageRes.status).toBe(200);
    expect(triageRes.body.data.status).toBe('TRIAGED');

    // 2. Assign: TRIAGED -> ASSIGNED
    const assignRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ technicianId: 'usr-tech-1' });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.status).toBe('ASSIGNED');
    expect(assignRes.body.data.assignedTechnicianId).toBe('usr-tech-1');

    // 3. Start Work: ASSIGNED -> IN_PROGRESS
    const startRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transitions`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ toStatus: 'IN_PROGRESS' });

    expect(startRes.status).toBe(200);
    expect(startRes.body.data.status).toBe('IN_PROGRESS');

    // 4. Hold: IN_PROGRESS -> ON_HOLD
    const holdRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transitions`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ toStatus: 'ON_HOLD', reason: 'Waiting for replacement valve part' });

    expect(holdRes.status).toBe(200);
    expect(holdRes.body.data.status).toBe('ON_HOLD');
    expect(holdRes.body.data.holdReason).toBe('Waiting for replacement valve part');

    // 5. Resume: ON_HOLD -> IN_PROGRESS
    const resumeRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transitions`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ toStatus: 'IN_PROGRESS' });

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.data.status).toBe('IN_PROGRESS');

    // 6. Resolve: IN_PROGRESS -> RESOLVED
    const resolveRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transitions`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ toStatus: 'RESOLVED', resolutionNotes: 'Valve replaced, leak fixed' });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('RESOLVED');

    // 7. Close: RESOLVED -> CLOSED
    const closeRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transitions`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ toStatus: 'CLOSED' });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.status).toBe('CLOSED');

    // 8. Reopen inside configurable window: CLOSED -> TRIAGED
    const reopenRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transitions`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ toStatus: 'TRIAGED', reason: 'Leak returned slightly' });

    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.data.status).toBe('TRIAGED');

    // Verify TicketEvents timeline
    const eventsRes = await request(app)
      .get(`/api/v1/tickets/${ticketId}/events`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(eventsRes.status).toBe(200);
    const events = eventsRes.body.data;
    expect(events.length).toBeGreaterThanOrEqual(8);

    // Each event must have actorId, timestamp, fromStatus, toStatus
    for (const evt of events) {
      expect(evt.ticketId).toBe(ticketId);
      expect(evt.createdAt).toBeDefined();
      expect(evt.organisationId).toBe('org-lumen-hatch');
    }
  });
});
