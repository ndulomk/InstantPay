import { NotFoundException, ValidationException } from "@instantpay/utils";
import { BankRepository } from "../repositories/bank.repository";
import { CreateBankInput, CreateBankSchema, UpdateBankInput, updateBankSchema } from "../schemas/bank.schema";
import { BankType } from "../types/bank.types";
import { QueryRequest } from "../../../types/types";
import { QueryResponse } from "../../../types/types";
import { validatePaginationParams } from "../../../utils/validatePaginationParams";
import { formatZodError } from "../../../utils/formatZodError";

const COMPONENT = "BankService"

export const BankService = {
  async create(data: CreateBankInput): Promise<string>{
    const parseResult = CreateBankSchema.safeParse(data)
    if(!parseResult.success){
      const errorMessage = formatZodError(parseResult.error)
      throw new ValidationException(errorMessage, COMPONENT)
    }
    const result = await BankRepository.create(parseResult.data)
    return result 
  },
  
  async findById(id: string): Promise<BankType | null>{
    const bank = await BankRepository.findById(id);
    if(!bank){
      throw new NotFoundException("Bank Not Found", COMPONENT)
    }
    return bank
  },

  async findAll({
    page,
    limit,
    search
  }: QueryRequest): Promise<QueryResponse<BankType>> {
    validatePaginationParams(page, limit, COMPONENT)
    const { data, total } = await BankRepository.findAll({ page, limit, search })
    const totalPages = Math.ceil(total / limit)
    return { 
      data: data,
      pagination: {
        page,
        limit,
        totalPages,
        total
      }
    }
  },

  async update({ id, data }: { id: string; data: UpdateBankInput }): Promise<BankType>{
    const parseResult = updateBankSchema.safeParse(data)
    if(!parseResult.success){
      const errorMessage = formatZodError(parseResult.error)
      throw new ValidationException(errorMessage, COMPONENT)
    }
    const result = await BankRepository.update({
      id, 
      data: parseResult.data 
    })
    return result
  },

  async delete(id: string): Promise<{ deleted: boolean }>{
    await this.findById(id)
    const result = await BankRepository.delete(id)
    return result
  }
}