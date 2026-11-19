import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/database/dataStore.js';

describe('FR-1.05: Inbound Email to Ticket Webhook', () => {
  const app = createApp();

  beforeEach(() => {
    db.reset();
  });

  it('creates a new ticket when email has no ticket token in subject', async () => {
    const emailRes = await request(app)
      .post('/api/v1/webhooks/email/inbound')
      .set('x-organisation-id', 'org-lumen-hatch')
      .send({
        from: 'resident@lumenhatch.com',
        subject: 'Heater not working in room',
        textBody: 'It is quite cold today and the heating switch does not turn on.',
      });

    expect(emailRes.status).toBe(201);
    expect(emailRes.body.success).toBe(true);
    expect(emailRes.body.action).toBe('CREATED_TICKET');
    expect(emailRes.body.ticket.title).toBe('Heater not working in room');
  });

  it('threads email onto existing ticket when subject contains [#ticketNumber]', async () => {
    const existingTicket = db.tickets.get('tick-1001');
    expect(existingTicket).toBeDefined();

    const threadRes = await request(app)
      .post('/api/v1/webhooks/email/inbound')
      .set('x-organisation-id', 'org-lumen-hatch')
      .send({
        from: 'resident@lumenhatch.com',
        subject: `Re: [#${existingTicket?.ticketNumber}] AC leaking update`,
        textBody: 'Technician can come between 2pm and 4pm today.',
      });

    expect(threadRes.status).toBe(200);
    expect(threadRes.body.success).toBe(true);
    expect(threadRes.body.action).toBe('THREADED_COMMENT');
    expect(threadRes.body.ticketId).toBe(existingTicket?.id);

    // Verify comment in database
    const comments = Array.from(db.comments.values()).filter(
      (c) => c.ticketId === existingTicket?.id
    );
    const hasThreaded = comments.some((c) =>
      c.content.includes('Technician can come between 2pm and 4pm today.')
    );
    expect(hasThreaded).toBe(true);
  });
});
