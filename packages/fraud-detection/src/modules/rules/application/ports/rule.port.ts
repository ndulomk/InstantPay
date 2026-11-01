import type { AppError, Result } from '@instantpay/utils';
import type {
  ListResponse,
  PaginationParams,
} from '../../../../shared/pagination/pagination.js';
import type {
  CreateRuleDTO,
  ListRulesQueryDTO,
  RuleResponseDTO,
  UpdateRuleDTO,
} from '../dtos/rule.dto.js';

export type RuleListFilters = {
  isActive?: boolean;
  field?: ListRulesQueryDTO['field'];
  severity?: ListRulesQueryDTO['severity'];
  search?: string;
};

export interface IRuleRepository {
  create(data: CreateRuleDTO): Promise<RuleResponseDTO>;
  findById(id: string): Promise<RuleResponseDTO | null>;
  findByCode(code: string): Promise<RuleResponseDTO | null>;
  findActive(): Promise<RuleResponseDTO[]>;
  list(
    params: PaginationParams,
    filters?: RuleListFilters
  ): Promise<ListResponse<RuleResponseDTO>>;
  update(id: string, data: CreateRuleDTO): Promise<RuleResponseDTO | null>;
}

export interface IRuleService {
  create(data: CreateRuleDTO): Promise<Result<RuleResponseDTO, AppError>>;
  getById(id: string): Promise<Result<RuleResponseDTO, AppError>>;
  list(
    params: PaginationParams,
    filters?: RuleListFilters
  ): Promise<Result<ListResponse<RuleResponseDTO>, AppError>>;
  update(
    id: string,
    data: UpdateRuleDTO
  ): Promise<Result<RuleResponseDTO, AppError>>;
  setActive(
    id: string,
    isActive: boolean
  ): Promise<Result<RuleResponseDTO, AppError>>;
}
