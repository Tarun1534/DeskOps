import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/database/dataStore.js';

describe('NFR-01 & AC-1.1: Multi-Tenant Data Isolation', () => {
  const app = createApp();

  beforeEach(() => {
    db.reset();
  });

  it('Automated Test: User in Organisation A requests Organisation B ticket and receives 404', async () => {
    // 1. Login as Org 1 (Lumen Hatch) staff
    const loginRes1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@lumenhatch.com', password: 'Password@123' });

    expect(loginRes1.status).toBe(200);
    const tokenOrg1 = loginRes1.body.data.accessToken;

    // 2. Org 2 has a private ticket: 'tick-org2-999'
    const org2Ticket = db.tickets.get('tick-org2-999');
    expect(org2Ticket).toBeDefined();
    expect(org2Ticket?.organisationId).toBe('org-greenfield');

    // 3. User of Org 1 attempts to read Org 2's ticket directly by ID
    const crossTenantReadRes = await request(app)
      .get(`/api/v1/tickets/${org2Ticket?.id}`)
      .set('Authorization', `Bearer ${tokenOrg1}`);

    // Must return 404 Not Found (AC-1.1 / NFR-01) - NOT 200 and NOT leaking Org 2 data
    expect(crossTenantReadRes.status).toBe(404);
    expect(crossTenantReadRes.body.success).toBe(false);
    expect(crossTenantReadRes.body.error.code).toBe('TICKET_NOT_FOUND');
  });

  it('Automated Test: List tickets only returns tickets belonging to authenticated organisation', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@lumenhatch.com', password: 'Password@123' });

    const token = loginRes.body.data.accessToken;

    const listRes = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    const items = listRes.body.data;

    // All returned tickets must belong to org-lumen-hatch
    for (const ticket of items) {
      expect(ticket.organisationId).toBe('org-lumen-hatch');
      expect(ticket.id).not.toBe('tick-org2-999');
    }
  });
});
