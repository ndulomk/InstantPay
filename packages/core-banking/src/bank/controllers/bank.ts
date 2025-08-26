import { CreateBankRequest } from "../types/bank";
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
  }
}