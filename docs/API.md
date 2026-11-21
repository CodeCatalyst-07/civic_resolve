# CivicResolve REST API Reference

The CivicResolve HTTP API powers citizen grievance reporting, AI-assisted triage, transparent tracking, community support aggregation, and municipal authority queue dispatching.

Built with Express 4, Zod schema validation, strict DTO allowlist projections, and defensive rate limiting.

---

## 1. Architectural Foundations

### Envelope Pattern
All API endpoints return a uniform JSON envelope:

#### Successful Response (`200 OK`, `201 Created`)
```json
{
  "ok": true,
  "data": { ... }
}
```

#### Error Response (`400`, `403`, `404`, `409`, `413`, `429`, `500`, `502`)
```json
{
  "ok": false,
  "error": {
    "code": "validation_failed | not_found | forbidden | rate_limited | conflict | ai_unavailable | internal_error",
    "message": "Human-readable plain English error explanation"
  }
}
```

### Security & Demo Role Gate
In this hackathon architecture, authentication is simulated via request headers.

| Header | Description | Allowed Values | Default |
| :--- | :--- | :--- | :--- |
| `X-Demo-Role` | Declares actor role context | `citizen` \| `authority` | `citizen` |
| `X-Demo-Authority-Code` | Required when `DEMO_AUTHORITY_CODE` is set on server | Configured secret code | None |

> [!IMPORTANT]
> The authority role gate uses SHA-256 constant-time comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.

### Caching Semantics
- **Public Aggregated Stats (`GET /api/stats`)**: `Cache-Control: public, max-age=30`
- **Wards & Taxonomy (`GET /api/wards`, `GET /api/meta`)**: `Cache-Control: public, max-age=3600`
- **Ticket Queries & Views (`/api/tickets/*`, `/api/authority/*`)**: `Cache-Control: no-store`

---

## 2. Route Table

| Method | Path | Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System status, AI provider, driver, and demo gate mode |
| `GET` | `/api/meta` | Public | Civic categories, urgencies, departments with SLA hours |
| `GET` | `/api/wards` | Public | Synthetic municipal wards with landmarks and bounding boxes |
| `GET` | `/api/geocode` | Public | Server-side address geocoding via Google Maps API |
| `POST` | `/api/reports/analyze` | Public | Real-time AI triage analysis preview without persistence |
| `POST` | `/api/reports` | Public | Submits a grievance; persists ticket if actionable |
| `GET` | `/api/tickets/:id` | Citizen | Anonymized public ticket view (allowlist projection) |
| `POST` | `/api/tickets/:id/support`| Citizen | Increments community support; re-evaluates urgency |
| `POST` | `/api/tickets/:id/reopen` | Citizen | Reopens a resolved ticket (permitted once) |
| `GET` | `/api/stats` | Public | Anonymized city-wide resolution and queue metrics |
| `GET` | `/api/authority/tickets` | Authority | Prioritized investigation queue with cursor pagination |
| `GET` | `/api/authority/tickets/:id` | Authority | Comprehensive investigation ticket view |
| `PATCH` | `/api/authority/tickets/:id/status` | Authority | Lifecycle status transition (notes required on resolve) |
| `POST` | `/api/authority/tickets/:id/override` | Authority | Manual override of triage urgency/dept with audit log |

---

## 3. Endpoint Specifications & Examples

### Health & Metadata

#### `GET /api/health`
Returns system operational state, loaded AI provider, persistence driver, and authority gate mode without leaking sensitive keys.

```bash
curl -X GET http://localhost:3001/api/health
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-11-21T12:00:00.000Z",
    "version": "1.0.0",
    "aiProvider": "mock",
    "aiModel": "mock-triage-v1",
    "repoDriver": "memory",
    "geocodingConfigured": false,
    "authorityGate": "code"
  }
}
```

---

#### `GET /api/meta`
Exposes core municipal taxonomies, display labels, and target resolution SLA hours.

```bash
curl -X GET http://localhost:3001/api/meta
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "categories": ["pothole", "garbage", "streetlight", "water_leakage", "sewer_overflow", "fallen_tree", "public_hazard", "other_civic", "not_civic"],
    "urgencies": ["low", "medium", "high", "critical"],
    "statuses": ["submitted", "under_review", "assigned", "in_progress", "resolved", "closed", "rejected", "reopened"],
    "departments": [
      { "id": "roads", "displayName": "Roads & Bridges Department", "slaHours": { "low": 168, "medium": 72, "high": 24, "critical": 6 } },
      { "id": "sanitation", "displayName": "Solid Waste & Sanitation Department", "slaHours": { "low": 72, "medium": 48, "high": 12, "critical": 4 } },
      { "id": "public_lighting", "displayName": "Public Lighting & Electrical Wing", "slaHours": { "low": 96, "medium": 48, "high": 24, "critical": 6 } },
      { "id": "water_sewerage", "displayName": "Water Supply & Sewerage Board", "slaHours": { "low": 72, "medium": 36, "high": 12, "critical": 4 } },
      { "id": "ward_office", "displayName": "General Ward Grievance Office", "slaHours": { "low": 120, "medium": 72, "high": 24, "critical": 8 } }
    ]
  }
}
```

---

### Grievance Reporting & Citizen Portal

#### `POST /api/reports/analyze`
Simulates server-side AI triage and checks for duplicates without writing to the database.

```bash
curl -X POST http://localhost:3001/api/reports/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Deep dangerous pothole right outside National Public School on 100ft Road, Ward 12.",
    "location": {
      "address": "100ft Road, Ward 12",
      "ward": "Ward 12",
      "coordinates": { "latitude": 12.9716, "longitude": 77.5946 }
    }
  }'
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "outcome": {
      "kind": "ticket",
      "decision": {
        "category": "pothole",
        "urgency": "high",
        "department": "roads",
        "emergency_notice": false,
        "ai_source": "mock"
      },
      "summary": "Deep dangerous pothole near school",
      "reasons": ["Hazard located near school zone"]
    },
    "duplicateCandidates": []
  }
}
```

---

#### `POST /api/reports`
Submits a civic grievance. Evaluates triage on the server and creates a ticket if actionable.

```bash
curl -X POST http://localhost:3001/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Deep dangerous pothole right outside National Public School on 100ft Road, Ward 12. School buses and children are getting stuck.",
    "location": {
      "ward": "Ward 12"
    }
  }'
```

**Response (201 Created):**
```json
{
  "ok": true,
  "data": {
    "outcome": {
      "kind": "ticket",
      "decision": {
        "category": "pothole",
        "urgency": "high",
        "department": "roads",
        "emergency_notice": false,
        "ai_source": "mock"
      },
      "summary": "Dangerous pothole near school zone",
      "reasons": ["Risk to children and heavy vehicles near school"]
    },
    "ticket": {
      "id": "CR-7K9M-2P4Q-X8V1",
      "status": "submitted",
      "category": "pothole",
      "urgency": "high",
      "department": "roads",
      "summary": "Dangerous pothole near school zone",
      "ward": "Ward 12",
      "created_at": "2026-11-21T12:00:00.000Z",
      "due_at": "2026-11-22T12:00:00.000Z",
      "overdue": false,
      "duplicate_count": 0,
      "reasons": ["Risk to children and heavy vehicles near school"],
      "applied_rules": [
        { "id": "school-zone-high", "title": "School zone priority", "reason": "Pothole near school upgraded to high urgency" }
      ],
      "timeline": [
        { "id": "evt-1", "status": "submitted", "actor_role": "citizen", "at": "2026-11-21T12:00:00.000Z", "note": "Grievance submitted by citizen" }
      ],
      "emergency_notice": false
    },
    "duplicateCandidates": []
  }
}
```

---

#### `GET /api/tickets/:id`
Retrieves an anonymized public ticket view. Never exposes raw complainant descriptions, contact details, or exact GPS coordinates.

```bash
curl -X GET http://localhost:3001/api/tickets/CR-7K9M-2P4Q-X8V1
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "CR-7K9M-2P4Q-X8V1",
    "status": "submitted",
    "category": "pothole",
    "urgency": "high",
    "department": "roads",
    "summary": "Dangerous pothole near school zone",
    "ward": "Ward 12",
    "created_at": "2026-11-21T12:00:00.000Z",
    "due_at": "2026-11-22T12:00:00.000Z",
    "overdue": false,
    "duplicate_count": 0,
    "reasons": ["Risk to children and heavy vehicles near school"],
    "applied_rules": [
      { "id": "school-zone-high", "title": "School zone priority", "reason": "Pothole near school upgraded to high urgency" }
    ],
    "timeline": [
      { "id": "evt-1", "status": "submitted", "actor_role": "citizen", "at": "2026-11-21T12:00:00.000Z", "note": "Grievance submitted by citizen" }
    ],
    "emergency_notice": false
  }
}
```

---

#### `POST /api/tickets/:id/support`
Allows nearby citizens to add their voice to an existing grievance. Increments `duplicate_count` and re-evaluates triage rules (urgency can only increase, never decrease).

```bash
curl -X POST http://localhost:3001/api/tickets/CR-7K9M-2P4Q-X8V1/support
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "CR-7K9M-2P4Q-X8V1",
    "status": "submitted",
    "category": "pothole",
    "urgency": "critical",
    "department": "roads",
    "summary": "Dangerous pothole near school zone",
    "ward": "Ward 12",
    "created_at": "2026-11-21T12:00:00.000Z",
    "due_at": "2026-11-21T18:00:00.000Z",
    "overdue": false,
    "duplicate_count": 3,
    "reasons": ["Community duplicate escalation triggered (3+ reports)"],
    "applied_rules": [
      { "id": "dup-3-critical", "title": "Frequent complaint cluster", "reason": "Elevated to critical urgency" }
    ],
    "timeline": [
      { "id": "evt-1", "status": "submitted", "actor_role": "citizen", "at": "2026-11-21T12:00:00.000Z", "note": "Grievance submitted by citizen" },
      { "id": "evt-2", "status": "submitted", "actor_role": "citizen", "at": "2026-11-21T12:05:00.000Z", "note": "Additional citizen added support (\"Add your voice\")" }
    ],
    "emergency_notice": false
  }
}
```

---

#### `POST /api/tickets/:id/reopen`
Enables a citizen to reopen a resolved grievance if the issue persists on the ground. Allowed strictly once per ticket lifecycle.

```bash
curl -X POST http://localhost:3001/api/tickets/CR-7K9M-2P4Q-X8V1/reopen \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Patch washed away during first morning rain."
  }'
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "CR-7K9M-2P4Q-X8V1",
    "status": "reopened",
    "category": "pothole",
    "urgency": "critical",
    "department": "roads",
    "summary": "Dangerous pothole near school zone",
    "ward": "Ward 12",
    "created_at": "2026-11-21T12:00:00.000Z",
    "due_at": "2026-11-21T18:00:00.000Z",
    "overdue": false,
    "duplicate_count": 3,
    "timeline": [
      ...
      { "id": "evt-5", "status": "reopened", "actor_role": "citizen", "at": "2026-11-21T16:00:00.000Z", "note": "Patch washed away during first morning rain." }
    ],
    "emergency_notice": false
  }
}
```

---

### Municipal Authority Workflows

#### `GET /api/authority/tickets`
Fetches prioritized municipal work queue, sorted by urgency descending (`critical > high > medium > low`), then by `due_at` ascending. Supports multi-field filtering and cursor pagination.

```bash
curl -X GET "http://localhost:3001/api/authority/tickets?ward=Ward+12&status=submitted&limit=10" \
  -H "X-Demo-Role: authority" \
  -H "X-Demo-Authority-Code: demo-admin-key"
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "tickets": [
      {
        "id": "CR-7K9M-2P4Q-X8V1",
        "description": "Deep dangerous pothole right outside National Public School on 100ft Road, Ward 12.",
        "status": "submitted",
        "category": "pothole",
        "urgency": "critical",
        "department": "roads",
        "summary": "Dangerous pothole near school zone",
        "ward": "Ward 12",
        "location": { "ward": "Ward 12" },
        "ai_suggestion": { "category": "pothole", "urgency": "high", "confidence": 0.95 },
        "ai_source": "mock",
        "needs_manual_triage": false,
        "escalated": false,
        "reopen_count": 0,
        "version": 2,
        "created_at": "2026-11-21T12:00:00.000Z",
        "due_at": "2026-11-21T18:00:00.000Z",
        "overdue": false,
        "duplicate_count": 3,
        "timeline": [ ... ],
        "emergency_notice": false
      }
    ],
    "nextCursor": "Q1ItN0s5TS0yUDRRLVg4VjE="
  }
}
```

---

#### `PATCH /api/authority/tickets/:id/status`
Advances ticket lifecycle. Moving to `resolved` strictly requires an explanatory `note`.

```bash
curl -X PATCH http://localhost:3001/api/authority/tickets/CR-7K9M-2P4Q-X8V1/status \
  -H "X-Demo-Role: authority" \
  -H "X-Demo-Authority-Code: demo-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "note": "Permanent cold mix asphalt restoration completed by PWD division 4."
  }'
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "CR-7K9M-2P4Q-X8V1",
    "status": "resolved",
    "category": "pothole",
    "urgency": "critical",
    "department": "roads",
    "version": 3,
    "timeline": [
      ...
      { "id": "evt-6", "status": "resolved", "actor_role": "authority", "at": "2026-11-21T17:30:00.000Z", "note": "Permanent cold mix asphalt restoration completed by PWD division 4." }
    ]
  }
}
```

---

#### `POST /api/authority/tickets/:id/override`
Enables an authorized official to adjust category, department, or urgency (up or down). Requires a mandatory explanation that is permanently recorded in the audit trail.

```bash
curl -X POST http://localhost:3001/api/authority/tickets/CR-7K9M-2P4Q-X8V1/override \
  -H "X-Demo-Role: authority" \
  -H "X-Demo-Authority-Code: demo-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "urgency": "high",
    "reason": "Traffic redirected to parallel arterial; safety hazard alleviated."
  }'
```

**Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "id": "CR-7K9M-2P4Q-X8V1",
    "urgency": "high",
    "version": 4,
    "applied_rules": [
      ...
      { "id": "authority-override", "title": "Authority manual override", "reason": "Traffic redirected to parallel arterial; safety hazard alleviated." }
    ]
  }
}
```

---

## 4. Error Codes & HTTP Status Mapping

| HTTP Code | Error Code | Trigger Condition |
| :--- | :--- | :--- |
| `400` | `validation_failed` | Zod schema validation failure, missing resolution note, malformed JSON |
| `403` | `forbidden` | Missing authority credentials, exceeding max reopen limit (1) |
| `404` | `not_found` | Ticket ID not found or malformed ticket format |
| `409` | `conflict` | Invalid state machine transition or optimistic concurrency version mismatch |
| `413` | `validation_failed` | JSON body exceeds maximum allowed 20KB cap |
| `429` | `rate_limited` | Exceeded route-specific or global sliding-window rate limit |
| `500` | `internal_error` | Unexpected unhandled exception (safely masked, no stack traces leaked) |
| `502` | `internal_error` | External geocoding provider network failure |
