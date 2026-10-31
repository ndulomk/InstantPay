import type { AppError, Result } from '@instantpay/utils';
import type {
  ProxyRequestDTO,
  ProxyResponseDTO,
  UpstreamRequestDTO,
  UpstreamResponseDTO,
  UpstreamRouteDTO,
} from '../dtos/proxy.dto.js';

export interface IUpstreamClient {
  forward(
    route: UpstreamRouteDTO,
    request: UpstreamRequestDTO
  ): Promise<UpstreamResponseDTO>;
}

export interface IProxyService {
  forward(
    request: ProxyRequestDTO
  ): Promise<Result<ProxyResponseDTO, AppError>>;
}
