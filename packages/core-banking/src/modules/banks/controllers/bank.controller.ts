import { FastifyReply, FastifyRequest } from "fastify";
import { CreateBankInput, UpdateBankInput } from "../schemas/bank.schema";
import { BankService } from "../services/bank.service";
import { IdParam, QueryRequest } from "../../../types/types";

export const BankController = {
  create: async(
    request: FastifyRequest<{ Body: CreateBankInput }>,
    reply: FastifyReply
  ) => {
    const result = await BankService.create(request.body)
    return reply.code(201).send({
      status:"success",
      message: "Bank created successfully",
      data: result
    })
  },

  findAll: async(
    request: FastifyRequest<{ Querystring: QueryRequest }>,
    reply: FastifyReply
  ) => {
    const { page, limit, search } = request.query
    const pageNumber = page ? Number(page) : 1
    const limitNumber = limit ? Number(limit) : 10
    const response = await BankService.findAll({
      page: pageNumber,
      limit: limitNumber,
      search
    })
    return reply.code(200).send({
      status:"success",
      ...response
    })
  },

  findById: async(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const result = await BankService.findById(request.params.id)
    return reply.code(200).send({
      status:"success",
      data: result
    })
  },

  update: async(
    request: FastifyRequest<{ Params: IdParam; Body: UpdateBankInput }>,
    reply: FastifyReply
  ) => {
    const result = await BankService.update({
      id: request.params.id,
      data: request.body
    })
    return reply.code(200).send({
      status:"success",
      message:"Bank Updated Successfully",
      data: result
    })
  },

  delete: async(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ) => {
    const result = await BankService.delete(request.params.id)
    return reply.code(204).send({})
  }
}