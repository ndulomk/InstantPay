import z from "zod"
import { BANKSTATUS } from "../types/bank.types";
export const CreateBankSchema = z.object({
  bankName: z.string().min(1, "name is mandatory"),
  bankCode: z.string().min(1, "Code is mandatory"),
  status: z.nativeEnum(BANKSTATUS).default(BANKSTATUS.ATIVO),
  reservePercentage: z.number().default(5),  
})


export type CreateBankInput = z.infer<typeof CreateBankSchema>

export const updateBankSchema = CreateBankSchema.partial()
.refine((data)=> Object.keys(data).length > 0, {
  message: "Deve fornecer pelo menos um campo para atualizar."
})
export type UpdateBankInput = z.infer<typeof updateBankSchema>;

