import z from "zod";
import { ACCOUNTSTATUS, ACCOUNTTYPE } from "../types/account.types";

export const CreateAccountSchema = z.object({
  userId: z.string().uuid({ message:"Invalid uuid" }),
  bankId: z.string().uuid({ message:"Invalid uuid" }),
  accountNumber: z.string().min(3, "AccountNumber is Mandatory"),
  accountType: z.nativeEnum(ACCOUNTTYPE).default(ACCOUNTTYPE.CORRENTE),
  balance: z.number().nonnegative(),
  availableBalance: z.number().nonnegative(),
  blockedAmount: z.number().nonnegative(),
  currencyCode: z.enum(["AO", "USD"]).default("AO"),
  status: z.nativeEnum(ACCOUNTSTATUS).default(ACCOUNTSTATUS.BLOCKED),
  lastTransactionDate: z.string().datetime().optional(),
})

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>

export const UpdateAccountSchema = CreateAccountSchema.partial().refine((data)=> Object.keys(data).length > 0, {
  message: "Deve fornecer pelo um campo para atualizar."
})

export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>