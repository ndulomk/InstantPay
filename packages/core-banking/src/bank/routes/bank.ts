import { FastifyInstance } from "fastify"
import { bankController } from "../controllers/bank"

export async function bankRoutes(fastify: FastifyInstance){
  fastify.post("/", bankController.create)
  fastify.get("/", bankController.getAll)
  fastify.get("/:id", bankController.getById)
  
}