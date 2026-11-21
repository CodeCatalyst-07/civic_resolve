import { Router } from 'express';
import {
  analyzeReportInputSchema,
  submitReportInputSchema,
  apiSuccess,
  apiError,
} from '@civicresolve/shared';
import type { AppContainer } from '../../compose.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createReportsRouter(container: AppContainer): Router {
  const router = Router();

  /**
   * Previews AI triage and checks for duplicates without persisting anything.
   */
  router.post(
    '/analyze',
    validateBody(analyzeReportInputSchema),
    asyncHandler(async (req, res) => {
      const result = await container.ticketService.analyzeReport(req.body);

      if (!result.ok) {
        res.status(500).json(apiError('internal_error', result.error.message));
        return;
      }

      res.status(200).json(apiSuccess(result.value));
    })
  );

  /**
   * Submits a civic grievance. Re-evaluates triage on the server and creates a ticket if valid.
   */
  router.post(
    '/',
    validateBody(submitReportInputSchema),
    asyncHandler(async (req, res) => {
      const result = await container.ticketService.submitReport(req.body);

      if (!result.ok) {
        res.status(500).json(apiError('internal_error', result.error.message));
        return;
      }

      const statusCode = result.value.outcome.kind === 'ticket' ? 201 : 200;
      res.status(statusCode).json(apiSuccess(result.value));
    })
  );

  /**
   * Public feed of recent municipal grievances for home page awareness.
   */
  router.get(
    '/recent',
    asyncHandler(async (req, res) => {
      const limitRaw = req.query.limit;
      const limit =
        typeof limitRaw === 'string'
          ? Math.min(Math.max(parseInt(limitRaw, 10) || 6, 1), 20)
          : 6;

      const result = await container.repo.query({ limit });
      if (!result.ok) {
        res.status(500).json(apiError('internal_error', result.error.message));
        return;
      }

      const summaries = result.value.tickets.map((t) => ({
        id: t.id,
        category: t.category,
        urgency: t.urgency,
        status: t.status,
        summary: t.description.slice(0, 100),
        duplicate_count: t.duplicate_count ?? 0,
        created_at: t.created_at,
      }));

      res.setHeader('Cache-Control', 'public, max-age=15');
      res.status(200).json(apiSuccess(summaries));
    })
  );

  return router;
}
