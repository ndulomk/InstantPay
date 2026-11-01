import type { FastifyPluginAsync } from 'fastify';
import type { IAssessmentService } from '../../../application/ports/assessment.port.js';
import { createAssessmentController } from '../controllers/assessment.controller.js';

export type AssessmentRoutesOptions = {
  service: IAssessmentService;
};

export const assessmentRoutes: FastifyPluginAsync<
  AssessmentRoutesOptions
> = async (fastify, { service }) => {
  const controller = createAssessmentController(service);

  fastify.post('/fraud/assessments', controller.evaluate);
  fastify.get('/fraud/assessments', controller.list);
  fastify.get('/fraud/assessments/:id', controller.getById);
};
