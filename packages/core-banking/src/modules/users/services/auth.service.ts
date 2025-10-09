import { FastifyRequest } from "fastify";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import { ConflictException, DomainException, UnauthorizedException, ValidationException } from "@instantpay/utils";
import { formatZodError } from "../../../utils/formatZodError";
import { CreateUserInput, CreateUserSchema } from "../schemas/user.schema";
import { UserResponse } from "../types/user.types";

export class AuthService{
  constructor(private repo: UserRepository){}

  async register(data: CreateUserInput){
    const parseResult = CreateUserSchema.safeParse(data)
    if(!parseResult.success){
      throw new ValidationException(
        formatZodError(parseResult.error)
      )
    }

    if(await this.repo.findByUsername(data.username)){
      throw new ConflictException(
        "username has already been taken"
      )
    }

    if(await this.repo.findByEmail(data.email)){
      throw new ConflictException(
        "Email has already been taken"
      )
    }

    const hashedPassword = await bcrypt.hash(data.passwordHash, 12)

    const userId = await this.repo.create({
      ...parseResult.data,
      passwordHash: hashedPassword
    })

    const user = await this.repo.findById(userId)
    if (!user) {
      throw new DomainException(
        "Falha ao registrar o usuário.",
        "AuthService.register"
      );
    }

    const token = this.generateToken(user)
    return { success: true, user, token }
  }

  async login(email: string, password: string){
    if (!email || !password) {
      throw new ValidationException(
        "Email e senha são obrigatórios."
      );
    }

    const userWithPassword = await this.repo.findByEmailWithPassword(email)
    if (!userWithPassword) {
      throw new UnauthorizedException(
        "Credenciais inválidas."
      );
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      userWithPassword.passwordHash
    )

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        "Credenciais inválidas."
      );
    }

    await this.repo.updateLastLogin(userWithPassword.id)

    const user = userWithPassword
    const token = this.generateToken(user)
    return { success: true, user, token }
  }

  async getProfile(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new DomainException(
        "Usuário não encontrado."
      );
    }
    return { success: true, user };
  }

  generateToken(user: UserResponse): string {
    const jwtSecret = process.env.JWT_SECRET || "";
    return jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      jwtSecret,
      { expiresIn: "1d" }
    )
  }
}