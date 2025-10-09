import z from "zod";
import { KYCSTATUS } from "../types/user.types.js";

export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must have at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  fullName: z.string().min(3, "Full name is mandatory"),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(8, "Phone number is mandatory"),
  biNumber: z.string().min(1, "BI number is mandatory"),
  nif: z.string().min(6, "NIF is mandatory"),
  dateOfBirth: z.string().datetime().optional(),
  kycStatus: z.nativeEnum(KYCSTATUS).default(KYCSTATUS.PENDING),
  passwordHash: z.string().min(6, "Password must have at least 6 characters"),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>

export const UpdateUserSchema = CreateUserSchema.partial()
.refine((data)=> Object.keys(data).length > 0, {
  message: "Deve fornecer pelo um campo para atualizar."
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>