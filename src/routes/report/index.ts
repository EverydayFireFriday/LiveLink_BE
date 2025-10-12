// src/routes/report/index.ts

import express from 'express';
import { createReportRouter } from './reportRoutes';
import { ReportController } from '../../report/reportController';
import { ReportService } from '../../report/reportService';

/**
 * Report Routes Integration
 *
 * This factory function creates and configures the report router
 * with the provided ReportService instance.
 */
export const createReportRouterWithService = (
  reportService: ReportService,
): express.Router => {
  const router = express.Router();
  const reportController = new ReportController(reportService);
  const reportRouter = createReportRouter(reportController);

  router.use('/', reportRouter);

  return router;
};
