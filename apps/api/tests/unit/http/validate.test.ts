import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { validateBody, validateQuery, validateParams } from '../../../src/http/middleware/validate.js';

describe('Validation Middleware (validate.ts)', () => {
  it('validates and replaces valid params, body, and query', () => {
    const paramsSchema = z.object({ id: z.string().min(5) });
    const bodySchema = z.object({ name: z.string().trim() });
    const querySchema = z.object({ page: z.coerce.number() });

    const paramsMid = validateParams(paramsSchema);
    const bodyMid = validateBody(bodySchema);
    const queryMid = validateQuery(querySchema);

    const req = {
      params: { id: 'valid-id' },
      body: { name: '  Civic Grievance  ' },
      query: { page: '2' },
    } as unknown as Request;

    const res = {} as unknown as Response;

    let pNext = false;
    paramsMid(req, res, () => {
      pNext = true;
    });
    expect(pNext).toBe(true);

    let bNext = false;
    bodyMid(req, res, () => {
      bNext = true;
    });
    expect(bNext).toBe(true);
    expect(req.body.name).toBe('Civic Grievance');

    let qNext = false;
    queryMid(req, res, () => {
      qNext = true;
    });
    expect(qNext).toBe(true);
    expect(req.query.page).toBe(2);
  });

  it('rejects invalid params with 400', () => {
    const schema = z.object({ id: z.string().min(5) });
    const middleware = validateParams(schema);

    const req = { params: { id: 'sh' } } as unknown as Request;
    let statusCode = 200;
    let jsonBody: unknown;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: unknown) => {
        jsonBody = data;
        return res;
      },
    } as unknown as Response;

    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(statusCode).toBe(400);
    expect(jsonBody).toHaveProperty('error');
  });
});
