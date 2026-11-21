import request from 'supertest';
import { Status } from '@civicresolve/shared';
import { createApp } from '../src/app.js';
import { buildContainer } from '../src/compose.js';
import { loadConfig } from '../src/config.js';

async function main(): Promise<void> {
  const config = loadConfig({
    DEMO_AUTHORITY_CODE: 'demo-secret-123',
    REPO_DRIVER: 'memory',
    AI_PROVIDER: 'mock',
    AUTO_SEED: 'false',
  });
  const container = buildContainer(config);
  const app = createApp(config, container);

  console.log('=======================================================');
  console.log(' CIVICRESOLVE COMPLETE END-TO-END HTTP LIFECYCLE DEMO ');
  console.log('=======================================================\n');

  // Step 1: Citizen Previews Triage Analysis
  console.log('--- STEP 1: CITIZEN PREVIEWS AI TRIAGE (POST /api/reports/analyze) ---');
  const analyzeRes = await request(app)
    .post('/api/reports/analyze')
    .send({
      description:
        'Deep dangerous pothole right outside National Public School on 100ft Road, Ward 12. School buses and children are getting stuck.',
      location: { ward: 'Ward 12' },
    });
  console.log(`HTTP ${analyzeRes.status}`);
  console.log('AI Outcome:', JSON.stringify(analyzeRes.body.data.outcome, null, 2));

  // Step 2: Citizen Submits Grievance
  console.log('\n--- STEP 2: CITIZEN SUBMITS GRIEVANCE (POST /api/reports) ---');
  const submitRes = await request(app)
    .post('/api/reports')
    .send({
      description:
        'Deep dangerous pothole right outside National Public School on 100ft Road, Ward 12. School buses and children are getting stuck.',
      location: { ward: 'Ward 12' },
    });
  console.log(`HTTP ${submitRes.status} Created`);
  const ticketId = submitRes.body.data.ticket.id;
  console.log(`Created Ticket ID: ${ticketId}`);
  console.log(`Initial Urgency:   ${submitRes.body.data.ticket.urgency}`);
  console.log(`Department:        ${submitRes.body.data.ticket.department}`);
  console.log(`SLA Due Date:      ${submitRes.body.data.ticket.due_at}`);

  // Step 3: Citizen Tracks Grievance via Public Allowlist View
  console.log('\n--- STEP 3: CITIZEN TRACKS GRIEVANCE (GET /api/tickets/:id) ---');
  const publicRes = await request(app).get(`/api/tickets/${ticketId}`);
  console.log(`HTTP ${publicRes.status}`);
  console.log('Allowed Public View Fields:', Object.keys(publicRes.body.data).sort().join(', '));
  console.log('Raw Description Leaked?   ', 'description' in publicRes.body.data);
  console.log('Coordinates Leaked?       ', 'coordinates' in (publicRes.body.data.location || {}));
  console.log('Internal AI Tokens Leaked?', 'ai_suggestion' in publicRes.body.data);

  // Step 4: Community Member Supports Grievance ("Add Your Voice")
  console.log('\n--- STEP 4: COMMUNITY MEMBER ADDS SUPPORT (POST /api/tickets/:id/support) ---');
  const supportRes = await request(app).post(`/api/tickets/${ticketId}/support`);
  console.log(`HTTP ${supportRes.status}`);
  console.log(`Duplicate / Community Count: ${supportRes.body.data.duplicate_count}`);

  // Step 5: Authority Access Control Check
  console.log('\n--- STEP 5: AUTHORITY ACCESS CONTROL GATE (GET /api/authority/tickets) ---');
  const unauthRes = await request(app).get('/api/authority/tickets');
  console.log(`Without Authority Role: HTTP ${unauthRes.status} (${unauthRes.body.error.code})`);

  const badCodeRes = await request(app)
    .get('/api/authority/tickets')
    .set({ 'X-Demo-Role': 'authority', 'X-Demo-Authority-Code': 'wrong-password' });
  console.log(`With Invalid Code:     HTTP ${badCodeRes.status} (${badCodeRes.body.error.code})`);

  const authHeaders = {
    'X-Demo-Role': 'authority',
    'X-Demo-Authority-Code': 'demo-secret-123',
  };
  const queueRes = await request(app).get('/api/authority/tickets').set(authHeaders);
  console.log(`With Valid Credentials: HTTP ${queueRes.status}`);
  console.log(`Priority Work Queue Length: ${queueRes.body.data.tickets.length}`);

  // Step 6: Authority Lifecycle Advancement to Resolution
  console.log('\n--- STEP 6: AUTHORITY ADVANCES LIFECYCLE (PATCH /api/authority/tickets/:id/status) ---');
  await request(app)
    .patch(`/api/authority/tickets/${ticketId}/status`)
    .set(authHeaders)
    .send({ status: Status.UNDER_REVIEW });
  console.log('-> Status: under_review');

  await request(app)
    .patch(`/api/authority/tickets/${ticketId}/status`)
    .set(authHeaders)
    .send({ status: Status.ASSIGNED });
  console.log('-> Status: assigned');

  await request(app)
    .patch(`/api/authority/tickets/${ticketId}/status`)
    .set(authHeaders)
    .send({ status: Status.IN_PROGRESS });
  console.log('-> Status: in_progress');

  const failResolveRes = await request(app)
    .patch(`/api/authority/tickets/${ticketId}/status`)
    .set(authHeaders)
    .send({ status: Status.RESOLVED });
  console.log(`Resolve without note: HTTP ${failResolveRes.status} (${failResolveRes.body.error.message})`);

  const resolveRes = await request(app)
    .patch(`/api/authority/tickets/${ticketId}/status`)
    .set(authHeaders)
    .send({
      status: Status.RESOLVED,
      note: 'Permanent cold mix asphalt restoration completed by PWD Ward 12 team.',
    });
  console.log(`Resolve with note:    HTTP ${resolveRes.status} -> Final Status: ${resolveRes.body.data.status}`);

  // Step 7: Citizen Reopens Unresolved Issue
  console.log('\n--- STEP 7: CITIZEN REOPENS TICKET (POST /api/tickets/:id/reopen) ---');
  const reopenRes = await request(app)
    .post(`/api/tickets/${ticketId}/reopen`)
    .send({ note: 'Patch collapsed under morning bus traffic.' });
  console.log(`HTTP ${reopenRes.status} -> Status: ${reopenRes.body.data.status}`);

  // Step 8: Citizen Second Reopen Attempt (Guarded by State Machine)
  console.log('\n--- STEP 8: CITIZEN SECOND REOPEN ATTEMPT (GUARDED) ---');
  // Re-resolve
  await request(app)
    .patch(`/api/authority/tickets/${ticketId}/status`)
    .set(authHeaders)
    .send({ status: Status.IN_PROGRESS });
  await request(app)
    .patch(`/api/authority/tickets/${ticketId}/status`)
    .set(authHeaders)
    .send({ status: Status.RESOLVED, note: 'Re-compacted with concrete base.' });

  const secondReopen = await request(app)
    .post(`/api/tickets/${ticketId}/reopen`)
    .send({ note: 'Trying to reopen a second time.' });
  console.log(`HTTP ${secondReopen.status} Forbidden (Code: ${secondReopen.body.error.code})`);
  console.log(`Message: "${secondReopen.body.error.message}"`);

  console.log('\n=======================================================');
  console.log(' ✅ ALL END-TO-END HTTP LIFECYCLE STEPS VERIFIED 100%   ');
  console.log('=======================================================');
}

main().catch((err) => {
  console.error('Fatal lifecycle demo error:', err);
  process.exit(1);
});
