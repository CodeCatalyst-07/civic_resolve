import { createContext, useContext } from 'react';
import { z } from 'zod';
import {
  type SystemStats,
  systemStatsSchema,
  type SystemMeta,
  systemMetaSchema,
  type PublicTicketSummary,
  publicTicketSummarySchema,
  type AnalyzeResult,
  analyzeResultSchema,
  type SubmitResult,
  submitResultSchema,
  type PublicTicketView,
  publicTicketViewSchema,
  type AuthorityTicketView,
  authorityTicketViewSchema,
  type AnalyzeReportInput,
  type SubmitReportInput,
  type StatusUpdateInput,
  type OverrideInput,
  type TicketQuery,
  type Department,
  departmentSchema,
  CLIENT_AI_TIMEOUT_MS,
} from '@civicresolve/shared';

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface WardInfo {
  name: string;
  number: number;
  default_department?: Department;
}

export const wardInfoSchema = z.object({
  name: z.string(),
  number: z.number(),
  default_department: departmentSchema.optional(),
});

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
}

export const geocodeResultSchema = z.object({
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
});

export interface ApiClientConfig {
  baseUrl?: string;
  getAuthHeaders?: () => Record<string, string>;
}

export interface ApiClient {
  getStats(): Promise<SystemStats>;
  getMeta(): Promise<SystemMeta>;
  getRecentReports(limit?: number): Promise<readonly PublicTicketSummary[]>;
  getWards(): Promise<readonly WardInfo[]>;
  geocode(address: string): Promise<GeocodeResult>;
  analyzeReport(input: AnalyzeReportInput): Promise<AnalyzeResult>;
  submitReport(input: SubmitReportInput): Promise<SubmitResult>;
  getTicket(id: string): Promise<PublicTicketView>;
  supportTicket(id: string): Promise<PublicTicketView>;
  reopenTicket(id: string, note?: string): Promise<PublicTicketView>;
  getAuthorityQueue(query?: Partial<TicketQuery>): Promise<{
    tickets: readonly AuthorityTicketView[];
    next_cursor?: string;
  }>;
  getAuthorityTicket(id: string): Promise<AuthorityTicketView>;
  updateAuthorityStatus(id: string, input: StatusUpdateInput): Promise<AuthorityTicketView>;
  overrideAuthorityTriage(id: string, input: OverrideInput): Promise<AuthorityTicketView>;
}

export class FetchApiClient implements ApiClient {
  private readonly baseUrl: string;
  private readonly getAuthHeaders: () => Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    this.getAuthHeaders = config.getAuthHeaders || (() => ({}));
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = new Headers(init?.headers);

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const authHeaders = this.getAuthHeaders();
    for (const [key, value] of Object.entries(authHeaders)) {
      if (value) {
        headers.set(key, value);
      }
    }

    const res = await fetch(url, {
      ...init,
      headers,
    });

    let json: unknown = null;
    let parseFailed = false;

    if (typeof res.text === 'function') {
      try {
        const text = await res.text();
        json = text ? JSON.parse(text) : {};
      } catch {
        parseFailed = true;
      }
    } else if (typeof res.json === 'function') {
      try {
        json = await res.json();
      } catch {
        parseFailed = true;
      }
    }

    if (!res.ok) {
      if (json && typeof json === 'object') {
        const errPayload = json as { error?: { code?: string; message?: string } };
        const code = errPayload?.error?.code || 'unknown_error';
        const message = errPayload?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        throw new ApiError(res.status, code, message);
      }
      if (res.status === 502 || res.status === 503 || res.status === 504 || res.status === 500) {
        throw new ApiError(
          res.status,
          'service_unavailable',
          `API server is starting up or temporarily unreachable (HTTP ${res.status}). Please try again in a moment.`
        );
      }
      throw new ApiError(res.status, 'http_error', `HTTP ${res.status}: ${res.statusText}`);
    }

    if (parseFailed || !json) {
      throw new ApiError(
        res.status,
        'parse_error',
        `Invalid JSON response from ${path}. Ensure the CivicResolve API backend is running on port 3001.`
      );
    }

    const envelope = json as { data?: unknown };
    if (!envelope || envelope.data === undefined) {
      throw new ApiError(500, 'invalid_envelope', 'Response envelope missing "data" field');
    }

    const parsed = schema.safeParse(envelope.data);
    if (!parsed.success) {
      throw new ApiError(
        500,
        'schema_validation_failed',
        `Response failed schema validation: ${parsed.error.message}`
      );
    }

    return parsed.data;
  }

  public async getStats(): Promise<SystemStats> {
    return this.request('/api/stats', systemStatsSchema);
  }

  public async getMeta(): Promise<SystemMeta> {
    return this.request('/api/meta', systemMetaSchema);
  }

  public async getRecentReports(limit = 10): Promise<readonly PublicTicketSummary[]> {
    return this.request(`/api/reports/recent?limit=${limit}`, z.array(publicTicketSummarySchema));
  }

  public async getWards(): Promise<readonly WardInfo[]> {
    return this.request('/api/wards', z.array(wardInfoSchema));
  }

  public async geocode(address: string): Promise<GeocodeResult> {
    const encoded = encodeURIComponent(address.trim());
    return this.request(`/api/geocode?address=${encoded}`, geocodeResultSchema);
  }

  public async analyzeReport(input: AnalyzeReportInput): Promise<AnalyzeResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_AI_TIMEOUT_MS);
    try {
      return await this.request('/api/reports/analyze', analyzeResultSchema, {
        method: 'POST',
        body: JSON.stringify(input),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  public async submitReport(input: SubmitReportInput): Promise<SubmitResult> {
    return this.request('/api/reports', submitResultSchema, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async getTicket(id: string): Promise<PublicTicketView> {
    return this.request(`/api/tickets/${encodeURIComponent(id)}`, publicTicketViewSchema);
  }

  public async supportTicket(id: string): Promise<PublicTicketView> {
    return this.request(`/api/tickets/${encodeURIComponent(id)}/support`, publicTicketViewSchema, {
      method: 'POST',
    });
  }

  public async reopenTicket(id: string, note?: string): Promise<PublicTicketView> {
    return this.request(`/api/tickets/${encodeURIComponent(id)}/reopen`, publicTicketViewSchema, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  public async getAuthorityQueue(query?: Partial<TicketQuery>): Promise<{
    tickets: readonly AuthorityTicketView[];
    next_cursor?: string;
  }> {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.urgency) params.set('urgency', query.urgency);
    if (query?.category) params.set('category', query.category);
    if (query?.ward) params.set('ward', query.ward);
    if (query?.overdue !== undefined) params.set('overdue', String(query.overdue));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.cursor) params.set('cursor', query.cursor);

    const qs = params.toString();
    const path = `/api/authority/tickets${qs ? `?${qs}` : ''}`;

    const queueSchema = z.object({
      tickets: z.array(authorityTicketViewSchema),
      next_cursor: z.string().optional(),
    });

    return this.request(path, queueSchema);
  }

  public async getAuthorityTicket(id: string): Promise<AuthorityTicketView> {
    return this.request(`/api/authority/tickets/${encodeURIComponent(id)}`, authorityTicketViewSchema);
  }

  public async updateAuthorityStatus(
    id: string,
    input: StatusUpdateInput
  ): Promise<AuthorityTicketView> {
    return this.request(
      `/api/authority/tickets/${encodeURIComponent(id)}/status`,
      authorityTicketViewSchema,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    );
  }

  public async overrideAuthorityTriage(
    id: string,
    input: OverrideInput
  ): Promise<AuthorityTicketView> {
    return this.request(
      `/api/authority/tickets/${encodeURIComponent(id)}/override`,
      authorityTicketViewSchema,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  }
}

let defaultClient: ApiClient | null = null;

let inMemoryAuth = {
  role: 'citizen',
  authorityCode: '',
};

export function setMemoryAuth(role: string, authorityCode: string): void {
  inMemoryAuth = { role, authorityCode };
}

export function getApiClient(): ApiClient {
  if (!defaultClient) {
    defaultClient = new FetchApiClient({
      getAuthHeaders: () => {
        const headers: Record<string, string> = {
          'X-Demo-Role': inMemoryAuth.role,
        };
        if (inMemoryAuth.authorityCode) {
          headers['X-Demo-Authority-Code'] = inMemoryAuth.authorityCode;
        }
        return headers;
      },
    });
  }
  return defaultClient;
}

export function setApiClient(client: ApiClient | null): void {
  defaultClient = client;
}

export const ApiClientContext = createContext<ApiClient>(getApiClient());

export function useApiClient(): ApiClient {
  const contextClient = useContext(ApiClientContext);
  return defaultClient || contextClient;
}
