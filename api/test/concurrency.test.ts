import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/database/dataStore.js';

describe('NFR-03 & AC-1.2: Concurrency & Atomic Assignment', () => {
  const app = createApp();
  let staffToken: string;

  beforeEach(async () => {
    db.reset();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@lumenhatch.com', password: 'Password@123' });
    staffToken = loginRes.body.data.accessToken;

    // Put ticket into TRIAGED state so it is eligible for assignment
    await request(app)
      .post('/api/v1/tickets/tick-1001/triage')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ priority: 'HIGH' });
  });

  it('20 parallel assign requests on one ticket produce exactly one assignment', async () => {
    const ticketId = 'tick-1001';

    // Prepare 20 simultaneous parallel assignment requests with different technicians
    const technicianIds = [
      'usr-tech-1',
      'usr-tech-2',
      'usr-tech-1',
      'usr-tech-2',
      'usr-tech-1',
      'usr-tech-2',
      'usr-tech-1',
      'usr-tech-2',
      'usr-tech-1',
      'usr-tech-2',
      'usr-tech-1',
      'usr-tech-2',
      'usr-tech-1',
      'usr-tech-2',
      'usr-tech-1',
      'usr-tech-2',
      'usr-tech-1',
      'usr-tech-2',
      'usr-tech-1',
      'usr-tech-2',
    ];

    expect(technicianIds.length).toBe(20);

    const promises = technicianIds.map((techId) =>
      request(app)
        .post(`/api/v1/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ technicianId: techId })
    );

    const responses = await Promise.all(promises);

    const successes = responses.filter((r) => r.status === 200);
    const conflicts = responses.filter((r) => r.status === 409);

    // EXACTLY ONE assignment succeeds!
    expect(successes.length).toBe(1);
    // EXACTLY 19 parallel attempts are rejected with 409 conflict!
    expect(conflicts.length).toBe(19);

    // Verify ticket state
    const ticket = db.tickets.get(ticketId);
    expect(ticket?.status).toBe('ASSIGNED');
    expect(ticket?.assignedTechnicianId).toBeDefined();

    // Verify that only 1 ASSIGNED event is recorded in the event history
    const assignEvents = db.ticketEvents.filter(
      (e) => e.ticketId === ticketId && e.action === 'ASSIGNED'
    );
    expect(assignEvents.length).toBe(1);
  });
});
