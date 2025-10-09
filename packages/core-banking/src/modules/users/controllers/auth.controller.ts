import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "../services/auth.service";
import { CreateUserInput } from "../schemas/user.schema";
import { LoginDTO } from "../types/user.types";

export interface RequestUser {
  id: string;
  email: string;
  username: string;
}

export class AuthController{
  constructor(private service: AuthService){}

  async register(
    request: FastifyRequest<{ Body: CreateUserInput }>,
    reply: FastifyReply
  ){
    const result = await this.service.register(request.body)
    return reply.code(201).send({
      status: "success",
      message: "Conta criada com sucesso",
      data: {
        access_token: result.token,
        user: result.user,
      },
    });
  }

  async login(
    request: FastifyRequest<{ Body: LoginDTO }>,
    reply: FastifyReply
  ){
    const { email, password } = request.body
    const result = await this.service.login(email, password)
    return reply.code(200).send({
      status: "success",
      message: "Login realizado com sucesso",
      data: {
        access_token: result.token,
        user: result.user,
      },
    });
  }

  async me(
    request: FastifyRequest, 
    reply: FastifyReply
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.code(401).send({
        status: "error",
        message: "Não autenticado",
      });
    }
    const result = await this.service.getProfile(userId);
    return reply.code(200).send({
      status: "success",
      data: result.user,
    });
  }

}