import { Router } from 'express';
import {
  ticketQuerySchema,
  statusUpdateInputSchema,
  overrideInputSchema,
  apiSuccess,
  apiError,
  type TicketQuery,
} from '@civicresolve/shared';
import { isValidTicketId } from '../../domain/index.js';
import type { AppContainer } from '../../compose.js';
import { requireAuthority } from '../middleware/role.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createAuthorityRouter(container: AppContainer): Router {
  const router = Router();

  // Protect all authority routes with role verification
  router.use(requireAuthority(container.config));

  /**
   * Authority queue list with filters, pagination, and lazy SLA escalation.
   */
  router.get(
    '/tickets',
    validateQuery(ticketQuerySchema),
    asyncHandler(async (req, res) => {
      const result = await container.ticketService.listQueue(
        req.query as unknown as TicketQuery
      );

      if (!result.ok) {
        res.status(500).json(apiError('internal_error', result.error.message));
        return;
      }

      res.status(200).json(apiSuccess(result.value));
    })
  );

  /**
   * Authority detailed ticket view with full investigation metadata.
   */
  router.get(
    '/tickets/:id',
    asyncHandler(async (req, res) => {
      const id = req.params.id ?? '';
      if (!isValidTicketId(id)) {
        res.status(404).json(apiError('not_found', `Ticket "${id}" not found.`));
        return;
      }

      const result = await container.ticketService.getAuthorityTicket(id);

      if (!result.ok) {
        res.status(404).json(apiError('not_found', result.error.message));
        return;
      }

      res.status(200).json(apiSuccess(result.value));
    })
  );

  /**
   * Authority lifecycle status update. Resolving requires an explanatory note.
   */
  router.patch(
    '/tickets/:id/status',
    validateBody(statusUpdateInputSchema),
    asyncHandler(async (req, res) => {
      const id = req.params.id ?? '';
      if (!isValidTicketId(id)) {
        res.status(404).json(apiError('not_found', `Ticket "${id}" not found.`));
        return;
      }

      const result = await container.ticketService.updateStatus(id, req.body);

      if (!result.ok) {
        if (result.error.code === 'not_found') {
          res.status(404).json(apiError('not_found', result.error.message));
          return;
        }
        if (result.error.code === 'validation_failed') {
          res.status(400).json(apiError('validation_failed', result.error.message));
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
   * Authority manual triage override: allows adjusting urgency up or down with required reason.
   */
  router.post(
    '/tickets/:id/override',
    validateBody(overrideInputSchema),
    asyncHandler(async (req, res) => {
      const id = req.params.id ?? '';
      if (!isValidTicketId(id)) {
        res.status(404).json(apiError('not_found', `Ticket "${id}" not found.`));
        return;
      }

      const result = await container.ticketService.overrideTriage(id, req.body);

      if (!result.ok) {
        if (result.error.code === 'not_found') {
          res.status(404).json(apiError('not_found', result.error.message));
          return;
        }
        if (result.error.code === 'validation_failed') {
          res.status(400).json(apiError('validation_failed', result.error.message));
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
