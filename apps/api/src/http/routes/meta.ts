import { Router } from 'express';
import {
  CATEGORIES,
  URGENCIES,
  STATUSES,
  ROLES,
  DEPARTMENTS,
} from '@civicresolve/shared';
import { DEPARTMENT_METADATA, DOMAIN_CONFIG } from '../../domain/index.js';

export function createMetaRouter(): Router {
  const router = Router();

  /**
   * Metadata endpoint exposing domain taxonomies, department display names, and SLA deadlines.
   */
  router.get('/', (_req, res) => {
    const departments = DEPARTMENTS.map((id) => ({
      id,
      displayName: DEPARTMENT_METADATA[id]?.displayName || id,
      localAuthority: DEPARTMENT_METADATA[id]?.indianEquivalent || id,
    }));

    res.status(200).json({
      categories: CATEGORIES,
      urgencies: URGENCIES,
      statuses: STATUSES,
      roles: ROLES,
      departments,
      slaHours: DOMAIN_CONFIG.slaHours,
    });
  });

  return router;
}
