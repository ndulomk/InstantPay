import type { FastifyPluginAsync } from 'fastify';
import type { IFeedbackService } from '../../../application/ports/feedback.port.js';
import { createFeedbackController } from '../controllers/feedback.controller.js';

export type FeedbackRoutesOptions = {
  service: IFeedbackService;
};

export const feedbackRoutes: FastifyPluginAsync<
  FeedbackRoutesOptions
> = async (fastify, { service }) => {
  const controller = createFeedbackController(service);

  fastify.post('/fraud/assessments/:id/feedback', controller.create);
  fastify.get('/fraud/assessments/:id/feedback', controller.list);
};
