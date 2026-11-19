import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/database/dataStore.js';

describe('NFR-02: Role-Based Access Control (RBAC) Permission Matrix', () => {
  const app = createApp();
  let staffToken: string;
  let residentToken: string;

  beforeEach(async () => {
    db.reset();

    const staffLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@lumenhatch.com', password: 'Password@123' });
    staffToken = staffLogin.body.data.accessToken;

    const residentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'resident@lumenhatch.com', password: 'Password@123' });
    residentToken = residentLogin.body.data.accessToken;
  });

  it('Protected Action [Triage]: Staff permitted (200), Resident denied (403)', async () => {
    // Resident attempts triage -> 403 Forbidden
    const resDenied = await request(app)
      .post('/api/v1/tickets/tick-1001/triage')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ priority: 'HIGH' });
    expect(resDenied.status).toBe(403);
    expect(resDenied.body.error.code).toBe('FORBIDDEN');

    // Staff attempts triage -> 200 OK
    const staffAllowed = await request(app)
      .post('/api/v1/tickets/tick-1001/triage')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ priority: 'HIGH' });
    expect(staffAllowed.status).toBe(200);
  });

  it('Protected Action [Internal Comment]: Staff permitted (201), Resident denied (403)', async () => {
    // Resident attempts internal comment -> 403 Forbidden
    const resDenied = await request(app)
      .post('/api/v1/tickets/tick-1001/comments')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ content: 'Secret resident memo', isInternal: true });
    expect(resDenied.status).toBe(403);
    expect(resDenied.body.error.code).toBe('FORBIDDEN');

    // Staff attempts internal comment -> 201 Created
    const staffAllowed = await request(app)
      .post('/api/v1/tickets/tick-1001/comments')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ content: 'Technician dispatched with extra tools', isInternal: true });
    expect(staffAllowed.status).toBe(201);
  });

  it('Protected Action [Assign]: Staff permitted (200), Resident denied (403)', async () => {
    // Triage first
    await request(app)
      .post('/api/v1/tickets/tick-1001/triage')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ priority: 'HIGH' });

    // Resident attempts assign -> 403 Forbidden
    const resDenied = await request(app)
      .post('/api/v1/tickets/tick-1001/assign')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ technicianId: 'usr-tech-1' });
    expect(resDenied.status).toBe(403);

    // Staff attempts assign -> 200 OK
    const staffAllowed = await request(app)
      .post('/api/v1/tickets/tick-1001/assign')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ technicianId: 'usr-tech-1' });
    expect(staffAllowed.status).toBe(200);
  });
});
