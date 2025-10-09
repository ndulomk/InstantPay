import { NotFoundException, UnauthorizedException } from "@instantpay/utils";
import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../utils/env";
import jwt from "jsonwebtoken";
import { UserRepository } from "../modules/users/repositories/user.repository";

interface DecodedToken {
  userId: string;
  email: string;
  username: string;
}

const userRepo = new UserRepository()

export const authMiddleware = async(
  request: FastifyRequest,
  reply: FastifyReply
) =>{
  const authHeader = request.headers['authorization']
  if(!authHeader || !authHeader.startsWith('Bearer ')){
    throw new UnauthorizedException("Token not provided")
  }

  const token = authHeader.replace('Bearer ', '')
  const jwtSecret = env.JWT_SECRET

  let decoded: DecodedToken;

  try {
    decoded = jwt.verify(token, jwtSecret) as DecodedToken
  } catch (error) {
    throw new UnauthorizedException('Token inválido ou expirado');
  }

  const user = await userRepo.findById(decoded.userId);
  if (!user) {
    throw new NotFoundException('Usuário não encontrado ou inativo');
  }

  (request).user = {
    userId: decoded.userId,
    email: decoded.email,
    username: decoded.username
  };
}