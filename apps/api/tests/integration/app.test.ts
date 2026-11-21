import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Status, Urgency, Category } from '@civicresolve/shared';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { buildContainer } from '../../src/compose.js';
import { InMemoryTicketRepository } from '../../src/repo/memory.js';

describe('API Integration Tests', () => {
  const baseConfig = loadConfig({
    AI_PROVIDER: 'mock',
    REPO_DRIVER: 'memory',
    ALLOWED_ORIGINS: 'http://localhost:5173',
    DEMO_AUTHORITY_CODE: 'secret-authority-pass-99',
    AUTO_SEED: 'false',
  });

  // Isolated in-memory repository for predictable tests
  const repo = new InMemoryTicketRepository();
  const container = buildContainer(baseConfig, { repo });
  const app = createApp(baseConfig, container);

  const VALID_POTHOLE_TEXT =
    'Deep dangerous pothole right outside National Public School on 100ft Road, Ward 12. School buses and children are getting stuck.';

  // 1. Health & Meta
  it('GET /api/health returns 200, system status, and contains no secrets', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('aiProvider', 'mock');
    expect(res.body).toHaveProperty('repoDriver', 'memory');
    expect(res.body).toHaveProperty('authorityGate', 'code');
    expect(res.body).toHaveProperty('geocoding', false);
    expect(res.headers).toHaveProperty('x-request-id');

    // Ensure no secrets or credentials leaked
    expect(res.body).not.toHaveProperty('JARVISLABS_API_KEY');
    expect(res.body).not.toHaveProperty('GEMINI_API_KEY');
    expect(res.body).not.toHaveProperty('DEMO_AUTHORITY_CODE');
    expect(res.text).not.toContain('secret-authority-pass');
  });

  it('GET /api/meta returns taxonomy enums from packages/shared', async () => {
    const res = await request(app).get('/api/meta');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('categories');
    expect(res.body).toHaveProperty('urgencies');
    expect(res.body).toHaveProperty('statuses');
    expect(res.body).toHaveProperty('roles');
    expect(res.body).toHaveProperty('departments');
    expect(res.body).toHaveProperty('slaHours');

    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories).toContain('pothole');
    expect(res.body.urgencies).toContain('critical');
    expect(res.body.statuses).toContain('submitted');
    expect(res.body.roles).toContain('citizen');
  });

  // 2. Wards & Geocoding
  it('GET /api/wards returns 8 synthetic municipal wards and cache headers', async () => {
    const res = await request(app).get('/api/wards');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('public, max-age=3600');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(8);
    expect(res.body.data[0]).toHaveProperty('landmarks');
  });

  it('GET /api/geocode handles missing address and unavailable provider cleanly', async () => {
    // Missing address
    const badRes = await request(app).get('/api/geocode');
    expect(badRes.status).toBe(400);
    expect(badRes.body.error.code).toBe('validation_failed');

    // With address but NullGeocodingProvider active
    const res = await request(app).get('/api/geocode?address=100ft+Road+Indiranagar');
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(false);
  });

  // 3. Citizen Reports Workflow (Analyze & Submit)
  it('POST /api/reports/analyze previews triage without persisting anything', async () => {
    const res = await request(app)
      .post('/api/reports/analyze')
      .send({
        description: VALID_POTHOLE_TEXT,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.outcome.kind).toBe('ticket');
    expect(res.body.data.outcome.decision.category).toBe(Category.POTHOLE);
    expect(Array.isArray(res.body.data.similar_reports)).toBe(true);

    // Verify nothing persisted in repository
    const openRes = await repo.listOpen();
    expect(openRes.ok && openRes.value.length).toBe(0);
  });

  it('POST /api/reports creates a new ticket and returns 201 for valid grievance', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({
        description: VALID_POTHOLE_TEXT,
        location: {
          lat: 12.9716,
          lng: 77.6412,
          address: '100ft Road Signal, Indiranagar',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.outcome.kind).toBe('ticket');
    expect(res.body.data.ticket).toBeDefined();

    const ticketId = res.body.data.ticket.id;
    expect(ticketId).toMatch(/^CR-[0-9A-HJKMNP-TV-Z]{8}$/);

    // Verify it was stored in repo
    const stored = await repo.getById(ticketId);
    expect(stored.ok && stored.value?.id).toBe(ticketId);
  });

  it('POST /api/reports returns 200 with follow_up outcome for vague complaint text', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({
        description: 'road is bad',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.outcome.kind).toBe('follow_up');
    expect(res.body.data.ticket).toBeFalsy();
    expect(res.body.data.outcome.question).toBeTruthy();
  });

  // 4. Public Ticket Operations
  it('GET /api/tickets/:id returns PublicTicketView DTO with no-store cache header', async () => {
    // Create a ticket first
    const createRes = await request(app)
      .post('/api/reports')
      .send({ description: VALID_POTHOLE_TEXT });
    const ticketId = createRes.body.data.ticket.id;

    const res = await request(app).get(`/api/tickets/${ticketId}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.data.id).toBe(ticketId);
    expect(res.body.data.category).toBe(Category.POTHOLE);

    // Verify allowlist DTO strictly excludes internal metadata
    expect(res.body.data).not.toHaveProperty('description');
    expect(res.body.data).not.toHaveProperty('version');
    expect(res.body.data).not.toHaveProperty('ai_suggestion');
    expect(res.body.data).not.toHaveProperty('needs_manual_triage');
  });

  it('GET /api/tickets/:id returns 404 for invalid or nonexistent ticket ID', async () => {
    const notFoundRes = await request(app).get('/api/tickets/CR-99999999');
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error.code).toBe('not_found');

    const invalidRes = await request(app).get('/api/tickets/invalid-id-xyz');
    expect(invalidRes.status).toBe(404);
  });

  it('POST /api/tickets/:id/support increments community duplicate count', async () => {
    const createRes = await request(app)
      .post('/api/reports')
      .send({ description: VALID_POTHOLE_TEXT });
    const ticketId = createRes.body.data.ticket.id;

    const res = await request(app).post(`/api/tickets/${ticketId}/support`);
    expect(res.status).toBe(200);
    expect(res.body.data.duplicate_count).toBe(1);
  });

  // 5. Public Statistics
  it('GET /api/stats returns system metrics with 30s public cache header', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=30, s-maxage=30');
    expect(res.body.data).toHaveProperty('open');
    expect(res.body.data).toHaveProperty('resolved');
    expect(res.body.data).toHaveProperty('critical_open');
    expect(res.body.data).toHaveProperty('median_resolution_hours');
  });

  // 6. Authority Role & Security Gate
  it('rejects authority endpoints when X-Demo-Role is not authority (403)', async () => {
    const res = await request(app)
      .get('/api/authority/tickets')
      .set('X-Demo-Role', 'citizen');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden');
  });

  it('rejects authority access when X-Demo-Authority-Code is missing or invalid (403)', async () => {
    // Missing code header
    const noCodeRes = await request(app)
      .get('/api/authority/tickets')
      .set('X-Demo-Role', 'authority');
    expect(noCodeRes.status).toBe(403);

    // Wrong code header
    const wrongCodeRes = await request(app)
      .get('/api/authority/tickets')
      .set('X-Demo-Role', 'authority')
      .set('X-Demo-Authority-Code', 'incorrect-code');
    expect(wrongCodeRes.status).toBe(403);
  });

  it('allows authority operations when role and authority code are valid', async () => {
    const createRes = await request(app)
      .post('/api/reports')
      .send({ description: VALID_POTHOLE_TEXT });
    const ticketId = createRes.body.data.ticket.id;

    const authHeaders = {
      'X-Demo-Role': 'authority',
      'X-Demo-Authority-Code': 'secret-authority-pass-99',
    };

    // 1. List queue
    const listRes = await request(app)
      .get('/api/authority/tickets?limit=10')
      .set(authHeaders);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data.tickets)).toBe(true);

    // 2. Get authority ticket view (contains internal description and version)
    const detailRes = await request(app)
      .get(`/api/authority/tickets/${ticketId}`)
      .set(authHeaders);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.id).toBe(ticketId);
    expect(detailRes.body.data.description).toBeDefined();
    expect(detailRes.body.data.version).toBe(1);

    // 3. Update status step-by-step
    await request(app)
      .patch(`/api/authority/tickets/${ticketId}/status`)
      .set(authHeaders)
      .send({ status: Status.UNDER_REVIEW });

    await request(app)
      .patch(`/api/authority/tickets/${ticketId}/status`)
      .set(authHeaders)
      .send({ status: Status.ASSIGNED });

    await request(app)
      .patch(`/api/authority/tickets/${ticketId}/status`)
      .set(authHeaders)
      .send({ status: Status.IN_PROGRESS });

    // Resolving without note fails validation
    const failResolve = await request(app)
      .patch(`/api/authority/tickets/${ticketId}/status`)
      .set(authHeaders)
      .send({ status: Status.RESOLVED });
    expect(failResolve.status).toBe(400);

    // Resolving with explanatory note succeeds
    const resolveRes = await request(app)
      .patch(`/api/authority/tickets/${ticketId}/status`)
      .set(authHeaders)
      .send({
        status: Status.RESOLVED,
        note: 'Pothole filled with cold mix asphalt and rolled by road unit.',
      });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe(Status.RESOLVED);

    // 4. Citizen can now reopen ticket
    const reopenRes = await request(app)
      .post(`/api/tickets/${ticketId}/reopen`)
      .send({ note: 'Asphalt surface sunken again after rain.' });
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.data.status).toBe(Status.REOPENED);

    // 5. Authority triage override
    const overrideRes = await request(app)
      .post(`/api/authority/tickets/${ticketId}/override`)
      .set(authHeaders)
      .send({
        urgency: Urgency.CRITICAL,
        reason: 'Repeated subsidence on active school bus route.',
      });
    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.data.urgency).toBe(Urgency.CRITICAL);
    expect(
      overrideRes.body.data.applied_rules.some((r: { id: string }) => r.id === 'authority-override')
    ).toBe(true);

    // 6. Test illegal transition (409 conflict)
    const illegalTransition = await request(app)
      .patch(`/api/authority/tickets/${ticketId}/status`)
      .set(authHeaders)
      .send({ status: Status.CLOSED });
    expect(illegalTransition.status).toBe(409);

    // 7. Resolve again and verify second reopen is rejected (403 forbidden)
    await request(app)
      .patch(`/api/authority/tickets/${ticketId}/status`)
      .set(authHeaders)
      .send({ status: Status.IN_PROGRESS });

    await request(app)
      .patch(`/api/authority/tickets/${ticketId}/status`)
      .set(authHeaders)
      .send({
        status: Status.RESOLVED,
        note: 'Reinforced concrete bedding applied.',
      });

    const secondReopen = await request(app)
      .post(`/api/tickets/${ticketId}/reopen`)
      .send({ note: 'Still problematic.' });
    expect(secondReopen.status).toBe(403);
    expect(secondReopen.body.error.code).toBe('forbidden');

    // 8. Filters on authority queue list
    const filteredRes = await request(app)
      .get(`/api/authority/tickets?status=${Status.RESOLVED}&category=${Category.POTHOLE}&urgency=${Urgency.CRITICAL}`)
      .set(authHeaders);
    expect(filteredRes.status).toBe(200);
    expect(Array.isArray(filteredRes.body.data.tickets)).toBe(true);
  });

  it('GET /api/geocode returns coordinates when geocoding provider is available', async () => {
    const mockGeocoding = {
      isAvailable: () => true,
      geocode: async (addr: string) => {
        if (addr.includes('notfound')) {
          return { ok: false as const, error: { kind: 'not_found' as const, message: 'Address not found' } };
        }
        return {
          ok: true as const,
          value: { lat: 12.9716, lng: 77.6412, formatted_address: '100ft Road, Indiranagar' },
        };
      },
    };
    const geoContainer = buildContainer(baseConfig, { repo, geocoding: mockGeocoding });
    const geoApp = createApp(baseConfig, geoContainer);

    const successRes = await request(geoApp).get('/api/geocode?address=100ft+Road');
    expect(successRes.status).toBe(200);
    expect(successRes.body.data.available).toBe(true);
    expect(successRes.body.data.location.lat).toBe(12.9716);

    const notFoundRes = await request(geoApp).get('/api/geocode?address=notfound');
    expect(notFoundRes.status).toBe(404);
  });

  // 7. Security, Error Envelopes & Limits
  it('returns 404 with generic JSON error on undefined routes', async () => {
    const res = await request(app).get('/api/undefined-endpoint-xyz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'Not Found',
      message: 'The requested resource was not found.',
    });
  });

  it('rejects oversized JSON payload (>20kb) with 413', async () => {
    const largePayload = {
      content: 'x'.repeat(25 * 1024), // 25kb
    };

    const res = await request(app)
      .post('/api/health')
      .send(largePayload)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(413);
    expect(res.body).toHaveProperty('error', 'Payload Too Large');
    expect(res.body.message).toContain('20kb limit');
  });

  it('enforces rate limit when threshold is exceeded', async () => {
    const rateLimitedConfig = loadConfig({
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX: '2',
    });
    const rateLimitedApp = createApp(rateLimitedConfig);

    const res1 = await request(rateLimitedApp).get('/api/health');
    expect(res1.status).toBe(200);

    const res2 = await request(rateLimitedApp).get('/api/health');
    expect(res2.status).toBe(200);

    const res3 = await request(rateLimitedApp).get('/api/health');
    expect(res3.status).toBe(429);
    expect(res3.body).toHaveProperty('error', 'Too Many Requests');
  });

  it('handles malformed JSON body with 400', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Content-Type', 'application/json')
      .send('{"invalid-json: true');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Bad Request');
  });

  it('returns 404 for nonexistent tickets across operations', async () => {
    const authHeaders = {
      'X-Demo-Role': 'authority',
      'X-Demo-Authority-Code': 'secret-authority-pass-99',
    };

    // Support nonexistent
    const supRes = await request(app).post('/api/tickets/CR-NONEXIST/support');
    expect(supRes.status).toBe(404);

    // Reopen nonexistent
    const reRes = await request(app).post('/api/tickets/CR-NONEXIST/reopen').send({});
    expect(reRes.status).toBe(404);

    // Authority get nonexistent
    const authGet = await request(app).get('/api/authority/tickets/CR-NONEXIST').set(authHeaders);
    expect(authGet.status).toBe(404);

    // Authority patch nonexistent
    const authPatch = await request(app)
      .patch('/api/authority/tickets/CR-NONEXIST/status')
      .set(authHeaders)
      .send({ status: Status.UNDER_REVIEW });
    expect(authPatch.status).toBe(404);

    // Authority override nonexistent
    const authOverride = await request(app)
      .post('/api/authority/tickets/CR-NONEXIST/override')
      .set(authHeaders)
      .send({ urgency: Urgency.HIGH, reason: 'Inspection confirmed' });
    expect(authOverride.status).toBe(404);

    // Authority override invalid reason
    const authBadOverride = await request(app)
      .post('/api/authority/tickets/CR-NONEXIST/override')
      .set(authHeaders)
      .send({ urgency: Urgency.HIGH, reason: 'bad' });
    expect(authBadOverride.status).toBe(400);
  });
});
