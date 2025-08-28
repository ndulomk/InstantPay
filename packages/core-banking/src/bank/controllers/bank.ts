import { CreateBankRequest, GetAllRequest } from "../types/bank";
import { BankService } from "../services/bank"
import { FastifyRequest, FastifyReply } from 'fastify';

export const bankController = {
  create: async (
    request: FastifyRequest<CreateBankRequest>, 
    reply: FastifyReply
  ) => {
    const bankId = await BankService.createBank(request.body)
    return reply.code(201).send({
      status: 'success',
      message:"Bank Created Successfully",
      data: bankId
    })
  },
  getById: async (
    request: FastifyRequest<{ Params: { id: number}}>,
    reply: FastifyReply 
  ) => {
    const bank = await BankService.getBankById(request.params.id)
    return reply.code(200).send({
      status:"success",
      data: bank
    })
  },
  getAll: async (
    request: FastifyRequest<{ Querystring: GetAllRequest }>,
    reply: FastifyReply 
  )=>{
    const { page = 1, limit = 10} = request.query 
    const result = await BankService.getAll({ page, limit })
    return reply.code(200).send({
      status: "success",
      data: result.data,
      pagination: result.pagination
    })
  }
}