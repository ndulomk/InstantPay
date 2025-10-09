import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { UserRepository } from "../repositories/user.repository";
import { AuthService } from "../services/auth.service";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../../../middleware/auth.middleware";

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const userRepo = new UserRepository()
  const authService = new AuthService(userRepo)
  const authController = new AuthController(authService)


  fastify.post("/register", authController.register);
  fastify.post("/login", authController.login);
  
  fastify.register(async (authenticatedRoutes) => {
    authenticatedRoutes.addHook("preHandler", authMiddleware);
    
    authenticatedRoutes.get("/me", authController.me);
  });
};

export default authRoutes;
