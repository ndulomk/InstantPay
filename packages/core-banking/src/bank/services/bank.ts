import { BankEvent } from "@/core-banking/events/bankEvent"
import { bankRepository } from "../repositories/bank"
import { Bank } from "../types/bank"

export const BankService = {
  async createBank(data: Bank): Promise<number>{
    const bankId = await bankRepository.create(data)
    BankEvent.emit("BANK_CREATED")
    return bankId
  }
}