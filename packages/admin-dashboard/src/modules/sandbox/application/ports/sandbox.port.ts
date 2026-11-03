import type { AppError, Result } from '@instantpay/utils';
import type {
  SandboxDemoDTO,
  SandboxGatewayRequestDTO,
  SandboxGatewayResponseDTO,
  SandboxRequestDTO,
  SandboxResponseDTO,
  SandboxSmokeResultDTO,
} from '../dtos/sandbox.dto.js';

export interface ISandboxService {
  createDemo(): Promise<Result<SandboxDemoDTO, AppError>>;
  request(
    data: SandboxRequestDTO
  ): Promise<Result<SandboxResponseDTO, AppError>>;
  gateway(
    data: SandboxGatewayRequestDTO
  ): Promise<Result<SandboxGatewayResponseDTO, AppError>>;
  smoke(): Promise<Result<SandboxSmokeResultDTO, AppError>>;
}
