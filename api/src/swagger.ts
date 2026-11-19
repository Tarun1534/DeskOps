export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'DeskOps Phase 1: Ticketing Core API',
    version: '1.0.0',
    description:
      'Multi-tenant service desk platform with SLA support, strict ticket state machine, concurrent atomic assignment, and client-specific scheduling rules (Lumen Hatch Workspaces).',
    contact: {
      name: 'LogicVeda Batch 1.1 Team 2',
      email: 'team2@logicveda.internal',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 root',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      tenantHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-organisation-id',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
      tenantHeader: [],
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check probe',
        responses: { '200': { description: 'Server healthy' } },
      },
    },
    '/ready': {
      get: {
        summary: 'Readiness check probe',
        responses: { '200': { description: 'Dependencies ready' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user and obtain JWT tokens',
        responses: { '200': { description: 'Authentication successful' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile and tenant information',
        responses: { '200': { description: 'Profile retrieved' } },
      },
    },
    '/tickets': {
      get: {
        summary: 'List tickets with cursor pagination and role filtering',
        responses: { '200': { description: 'List of tickets' } },
      },
      post: {
        summary: 'Create a new ticket (validates Lumen Hatch room gaps if room scheduled)',
        responses: { '201': { description: 'Ticket created' }, '409': { description: 'Booking conflict' } },
      },
    },
    '/tickets/{id}': {
      get: {
        summary: 'Get ticket detail by ID (tenant scoped, returns 404 across tenants)',
        responses: { '200': { description: 'Ticket details' }, '404': { description: 'Not found' } },
      },
    },
    '/tickets/{id}/triage': {
      post: {
        summary: 'Triage ticket (NEW -> TRIAGED)',
        responses: { '200': { description: 'Ticket triaged' } },
      },
    },
    '/tickets/{id}/assign': {
      post: {
        summary: 'Assign technician (atomic concurrency safe, rejects racing assigns with 409)',
        responses: { '200': { description: 'Assigned successfully' }, '409': { description: 'Assignment conflict' } },
      },
    },
    '/tickets/{id}/transitions': {
      post: {
        summary: 'Strict state transition (rejects illegal transitions with 400)',
        responses: { '200': { description: 'Transition successful' }, '400': { description: 'Illegal transition' } },
      },
    },
    '/tickets/{id}/merge': {
      post: {
        summary: 'CR-1: Merge duplicate ticket into this ticket (closes duplicate, moves comments/watchers)',
        responses: { '200': { description: 'Merged successfully' } },
      },
    },
    '/tickets/{id}/events': {
      get: {
        summary: 'Immutable ticket event history timeline',
        responses: { '200': { description: 'Event timeline' } },
      },
    },
    '/tickets/{id}/comments': {
      get: {
        summary: 'List ticket comments (filters internal comments for residents)',
        responses: { '200': { description: 'Comments list' } },
      },
      post: {
        summary: 'Add a comment (public or internal)',
        responses: { '201': { description: 'Comment created' } },
      },
    },
    '/tickets/{id}/attachments/presign': {
      post: {
        summary: 'Generate presigned S3 upload URL (validates size limit 10MB and MIME type)',
        responses: { '200': { description: 'Presigned URL generated' } },
      },
    },
    '/rooms': {
      get: {
        summary: 'Lumen Hatch: List meeting rooms and operating daily windows',
        responses: { '200': { description: 'Rooms list' } },
      },
    },
    '/rooms/{roomId}/check-gap': {
      post: {
        summary: 'Lumen Hatch: Check if proposed repair overlaps member bookings',
        responses: { '200': { description: 'Conflict evaluation result' } },
      },
    },
    '/webhooks/email/inbound': {
      post: {
        summary: 'Inbound email webhook (creates new ticket or threads reply by subject token)',
        responses: { '200': { description: 'Processed' }, '201': { description: 'Created' } },
      },
    },
  },
};
