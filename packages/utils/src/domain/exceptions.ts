export class DomainException extends Error {
  code: string;
  component: string;
  timestamp: string;

  constructor(message: string, code: string = "DOMAIN_ERROR", component?: string) {
    super(message);
    this.name = "DomainException";
    this.code = code;
    this.component = component || 'Unknown';
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      statusCode: this.getStatusCode(),
      error: this.name,
      message: this.message,
      code: this.code,
      component: this.component,
      timestamp: this.timestamp
    };
  }

  getStatusCode(): number {
    return 500;
  }
}

export class ValidationException extends DomainException {
  constructor(message: string, component?: string) {
    super(message, "VALIDATION_ERROR", component);
    this.name = "ValidationException";
  }

  getStatusCode(): number {
    return 422; 
  }
}

export class NotFoundException extends DomainException {
  constructor(message: string, component?: string) {
    super(message, "NOTFOUND_ERROR", component);
    this.name = "NotFoundException";
  }

  getStatusCode(): number {
    return 404;
  }
}

export class UnauthorizedException extends DomainException {
  constructor(message: string = "Unauthorized", component?: string) {
    super(message, "UNAUTHORIZED_ERROR", component);
    this.name = "UnauthorizedException";
  }

  getStatusCode(): number {
    return 401;
  }
}

export class ForbiddenException extends DomainException {
  constructor(message: string = "Forbidden", component?: string) {
    super(message, "FORBIDDEN_ERROR", component);
    this.name = "ForbiddenException";
  }

  getStatusCode(): number {
    return 403;
  }
}

export class BadRequestException extends DomainException {
  constructor(message: string, component?: string) {
    super(message, "BAD_REQUEST_ERROR", component);
    this.name = "BadRequestException";
  }

  getStatusCode(): number {
    return 400;
  }
}

export class ConflictException extends DomainException {
  constructor(message: string, component?: string) {
    super(message, "CONFLICT_ERROR", component);
    this.name = "ConflictException";
  }

  getStatusCode(): number {
    return 409;
  }
}

export class DatabaseException extends DomainException {
  nativeCode?: string;

  constructor(
    message: string,
    component?: string,
    nativeCode?: string | null
  ) {
    super(message, "DATABASE_ERROR", component);
    this.name = "DatabaseException";
    this.nativeCode = nativeCode || undefined;
  }

  getStatusCode(): number {
    return 500;
  }
}