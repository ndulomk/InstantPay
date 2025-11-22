import { BadRequestException, AppError, ErrorFactory, Ok, Err, type Result  } from "@instantpay/utils";

export function validatePaginationParams(
  page: number, 
  limit: number, 
  component?: string
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


export function validatePaginationParamsRP(
  page: number,
  limit: number,
  component?: string
): Result<{ page: number; limit: number }, AppError> {
  if (page < 1) {
    return Err(
      ErrorFactory.validation(
        "A página deve ser maior que 0.",
        [{ field: "page", message: "A página deve ser maior que 0." }],
        component
      )
    );
  }

  if (limit < 1 || limit > 100) {
    return Err(
      ErrorFactory.validation(
        "O limite deve estar entre 1 e 100.",
        [{ field: "limit", message: "O limite deve estar entre 1 e 100." }],
        component
      )
    );
  }

  return Ok({ page, limit });
}
