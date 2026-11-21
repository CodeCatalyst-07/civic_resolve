import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { apiError, apiSuccess } from '@civicresolve/shared';
import { isValidTicketId } from '../../domain/index.js';
import type { AppContainer } from '../../compose.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const reopenBodySchema = z.object({
  note: z.string().max(300).optional(),
});

export function createTicketsRouter(container: AppContainer): Router {
  const router = Router();

  const supportLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: apiError('rate_limited', 'Too many support requests. Please wait a minute.'),
  });

  /**
   * Retrieves public ticket view with lazy SLA escalation.
   */
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = req.params.id ?? '';
      if (!isValidTicketId(id)) {
        res.status(404).json(apiError('not_found', `Ticket "${id}" not found.`));
        return;
      }

      res.setHeader('Cache-Control', 'no-store');
      const result = await container.ticketService.getPublicTicket(id);

      if (!result.ok) {
        res.status(404).json(apiError('not_found', result.error.message));
        return;
      }

      res.status(200).json(apiSuccess(result.value));
    })
  );

  /**
   * Citizen "Add your voice" support action. Increments duplicate counter.
   */
  router.post(
    '/:id/support',
    supportLimiter,
    asyncHandler(async (req, res) => {
      const id = req.params.id ?? '';
      if (!isValidTicketId(id)) {
        res.status(404).json(apiError('not_found', `Ticket "${id}" not found.`));
        return;
      }

      const result = await container.ticketService.supportReport(id);

      if (!result.ok) {
        if (result.error.code === 'not_found') {
          res.status(404).json(apiError('not_found', result.error.message));
          return;
        }
        if (result.error.code === 'conflict') {
          res.status(409).json(apiError('conflict', result.error.message));
          return;
        }
        res.status(500).json(apiError('internal_error', result.error.message));
        return;
      }

      res.status(200).json(apiSuccess(result.value));
    })
  );

  /**
   * Citizen reopening of an unresolved grievance (permitted only once from resolved status).
   */
  router.post(
    '/:id/reopen',
    validateBody(reopenBodySchema),
    asyncHandler(async (req, res) => {
      const id = req.params.id ?? '';
      if (!isValidTicketId(id)) {
        res.status(404).json(apiError('not_found', `Ticket "${id}" not found.`));
        return;
      }

      const result = await container.ticketService.reopenTicket(id, req.body.note);

      if (!result.ok) {
        if (result.error.code === 'not_found') {
          res.status(404).json(apiError('not_found', result.error.message));
          return;
        }
        if (result.error.code === 'forbidden') {
          res.status(403).json(apiError('forbidden', result.error.message));
          return;
        }
        if (result.error.code === 'conflict') {
          res.status(409).json(apiError('conflict', result.error.message));
          return;
        }
        res.status(500).json(apiError('internal_error', result.error.message));
        return;
      }

      res.status(200).json(apiSuccess(result.value));
    })
  );

  return router;
}
