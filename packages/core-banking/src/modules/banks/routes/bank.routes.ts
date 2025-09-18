import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { BankController } from "../controllers/bank.controller";

export const BankRoutes: FastifyPluginAsync = async(fastify: FastifyInstance)=>{
  fastify.post("/", BankController.create)
  fastify.get("/", BankController.findAll)
  fastify.get("/:id", BankController.findById)
  fastify.put("/:id", BankController.update)
  fastify.delete("/:id", BankController.delete)
}