import { describe, it, expect } from 'vitest';
import type { Request, Response } from 'express';
import { errorHandler } from '../../../src/http/middleware/errorHandler.js';

describe('Error Handler Middleware (errorHandler.ts)', () => {
  it('returns 500 for generic unhandled exceptions', () => {
    let statusCode = 200;
    let jsonBody: unknown;
    const req = { path: '/test', method: 'GET', id: 'req-1' } as Request;
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

    errorHandler(new Error('Unexpected database failure'), req, res, () => {});

    expect(statusCode).toBe(500);
    expect(jsonBody).toHaveProperty('error', 'Internal Server Error');
  });
});
