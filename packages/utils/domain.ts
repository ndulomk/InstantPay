class DomainException extends Error {
  code: string;
  component: string;
  timestamp: string;
  constructor(message: string, code: string = "DOMAIN_ERROR", component?: string) {
    super(message);
    this.name = "DomainException";
    this.code = code;
    this.component = component || 'Unknown';
    this.timestamp = new Date().toISOString()
  }

  toJSON(){
    return {
      statusCode: this.getStatusCode(),
      error: this.name,
      message: this.message,
      code: this.code,
      component: this.component,
      timestamp: this.timestamp
    }
  }
  getStatusCode():number{
    return 500
  }
}

export class ValidationException extends DomainException {
  constructor(message: string, component?: string){
    super(message, "VALIDATION_ERROR", component);
    this.name = "ValidationException"
  }

  getStatusCode():number{
    return 400
  }
}