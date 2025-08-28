import { BankEvent } from "@/core-banking/events/bankEvent"
import { bankRepository } from "../repositories/bank"
import { BankInterface, GetAllRequest, Pagination } from "../types/bank"
import { NotFoundException } from '@instantpay/utils';

export const BankService = {
  async createBank(data: BankInterface): Promise<number>{
    const bankId = await bankRepository.create(data)
    BankEvent.emit("BANK_CREATED")
    return bankId
  },
  async getBankById(id: number): Promise<BankInterface | null>{
    const result = await bankRepository.findById(id)
    if(!result){
      throw new NotFoundException("Bank", "bankService")
    }
    return result
  },
  async getAll({page, limit}: GetAllRequest): Promise<{data:BankInterface, pagination:Pagination}>{
    const { data, total } = await bankRepository.findAll({page, limit})
    const pages = Math.ceil(total / limit)
    return {
      data: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: pages
      }
    }
  }


}