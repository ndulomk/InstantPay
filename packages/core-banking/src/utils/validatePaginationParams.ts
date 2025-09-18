import { BadRequestException } from "@instantpay/utils";

export function validatePaginationParams(
  page: number, 
  limit: number, 
  component: string
): void {
  if (page < 1) {
    throw new BadRequestException(
      "A página deve ser maior que 0.",
      component
    );
  }
  if (limit < 1 || limit > 100) {
    throw new BadRequestException(
      "O limite deve estar entre 1 e 100.",
      component
    );
  }
}