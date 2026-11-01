import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type {
  CreateTemplateDTO,
  ListTemplatesQueryDTO,
  NotificationChannel,
  TemplateResponseDTO,
  UpdateTemplateDTO,
} from '../dtos/template.dto.js';

export type TemplateListFilters = {
  channel?: NotificationChannel;
  isActive?: boolean;
  search?: string;
};

export interface ITemplateRepository {
  create(data: CreateTemplateDTO): Promise<TemplateResponseDTO>;
  findById(id: string): Promise<TemplateResponseDTO | null>;
  findByCode(code: string): Promise<TemplateResponseDTO | null>;
  list(
    params: PaginationParams,
    filters?: TemplateListFilters
  ): Promise<ListResponse<TemplateResponseDTO>>;
  update(
    id: string,
    data: UpdateTemplateDTO
  ): Promise<TemplateResponseDTO | null>;
}

export interface ITemplateService {
  create(
    data: CreateTemplateDTO
  ): Promise<Result<TemplateResponseDTO, AppError>>;
  getById(id: string): Promise<Result<TemplateResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: TemplateListFilters
  ): Promise<Result<ListResponse<TemplateResponseDTO>, AppError>>;
  update(
    id: string,
    data: UpdateTemplateDTO
  ): Promise<Result<TemplateResponseDTO, AppError>>;
  setActive(
    id: string,
    isActive: boolean
  ): Promise<Result<TemplateResponseDTO, AppError>>;
}

export type ListTemplatesQuery = ListTemplatesQueryDTO;
