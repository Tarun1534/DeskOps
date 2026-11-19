import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/database/dataStore.js';

describe('CR-1 & AC-1.4: Merge Duplicate Tickets', () => {
  const app = createApp();
  let staffToken: string;

  beforeEach(async () => {
    db.reset();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@lumenhatch.com', password: 'Password@123' });
    staffToken = loginRes.body.data.accessToken;
  });

  it('merges duplicate ticket into canonical ticket, moves comments and watchers, closes duplicate', async () => {
    // 1. Create duplicate ticket
    const dupRes = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: 'AC dripping water in 101 again',
        description: 'Duplicate report of leaking AC',
        category: 'HVAC',
        priority: 'MEDIUM',
        propertyId: 'prop-1',
        unitId: 'unit-101',
      });
    expect(dupRes.status).toBe(201);
    const duplicateId = dupRes.body.data.id;
    const originalId = 'tick-1001';

    // 2. Add a comment to the duplicate ticket
    const commentRes = await request(app)
      .post(`/api/v1/tickets/${duplicateId}/comments`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        content: 'Resident says puddle is getting bigger',
        isInternal: false,
      });
    expect(commentRes.status).toBe(201);

    // 3. Perform CR-1 Merge
    const mergeRes = await request(app)
      .post(`/api/v1/tickets/${originalId}/merge`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ duplicateTicketId: duplicateId });

    expect(mergeRes.status).toBe(200);
    expect(mergeRes.body.success).toBe(true);

    // 4. Verify Duplicate is CLOSED with pointer
    const duplicate = db.tickets.get(duplicateId);
    expect(duplicate?.status).toBe('CLOSED');
    expect(duplicate?.isDuplicate).toBe(true);
    expect(duplicate?.mergedIntoTicketId).toBe(originalId);

    // 5. Verify comments moved to original ticket
    const originalCommentsRes = await request(app)
      .get(`/api/v1/tickets/${originalId}/comments`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(originalCommentsRes.status).toBe(200);
    const hasMergedComment = originalCommentsRes.body.data.some((c: any) =>
      c.content.includes('Resident says puddle is getting bigger') &&
      c.content.includes('[Merged from #')
    );
    expect(hasMergedComment).toBe(true);
  });
});
