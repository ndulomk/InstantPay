import type { Result } from '@instantpay/utils';
import type { AppError } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type {
  CreateUserDTO,
  KycStatus,
  UpdateUserDTO,
  UserResponseDTO,
  UserWithPasswordDTO,
} from '../dtos/user.dto.js';

export type CreateUserRecord = Omit<CreateUserDTO, 'password'> & {
  passwordHash: string;
};

export type UpdateUserRecord = Omit<UpdateUserDTO, 'password'> & {
  passwordHash?: string;
  email?: string;
};

export type UserListFilters = {
  search?: string;
  kycStatus?: KycStatus;
  isActive?: boolean;
};

export interface IUserRepository {
  create(data: CreateUserRecord): Promise<UserResponseDTO>;
  findById(id: string): Promise<UserResponseDTO | null>;
  findByEmail(email: string): Promise<UserResponseDTO | null>;
  findByUsername(username: string): Promise<UserResponseDTO | null>;
  findByPhone(phone: string): Promise<UserResponseDTO | null>;
  findByBiNumber(biNumber: string): Promise<UserResponseDTO | null>;
  findByNif(nif: string): Promise<UserResponseDTO | null>;
  findAuthByEmail(email: string): Promise<UserWithPasswordDTO | null>;
  list(
    params: PaginationParams,
    filters?: UserListFilters
  ): Promise<ListResponse<UserResponseDTO>>;
  update(id: string, data: UpdateUserRecord): Promise<UserResponseDTO | null>;
  setActive(id: string, isActive: boolean): Promise<UserResponseDTO | null>;
  count(): Promise<number>;
}

export interface IUserService {
  create(
    data: CreateUserDTO,
    actorId?: string | null
  ): Promise<Result<UserResponseDTO, AppError>>;
  getById(id: string): Promise<Result<UserResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: UserListFilters
  ): Promise<Result<ListResponse<UserResponseDTO>, AppError>>;
  update(
    id: string,
    data: UpdateUserDTO,
    actorId?: string | null
  ): Promise<Result<UserResponseDTO, AppError>>;
  deactivate(
    id: string,
    actorId?: string | null
  ): Promise<Result<UserResponseDTO, AppError>>;
  activate(
    id: string,
    actorId?: string | null
  ): Promise<Result<UserResponseDTO, AppError>>;
}
