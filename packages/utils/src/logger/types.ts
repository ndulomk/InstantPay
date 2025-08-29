export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  service: string;
  correlationId?:string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorLogEntry extends LogEntry {
  type: 'error';
  errorMessage: string;
  stack?: string;
  errorCode?: string;
  context?: Record<string, any>;
}

export interface RequestLogEntry extends LogEntry {
  type: 'request';
  method: string;
  url: string;
  headers: Record<string, string>
  body?:any;
  ip: string;
  userAgent?: string;
}

export interface ResponseLogEntry extends LogEntry {
  type: 'response';
  statusCode: number;
  responseTime: number;
  contentLength?: number;
  headers: Record<string, string>
}

export interface ErrorLogEntry extends LogEntry {
  type: 'error';
  errorMessage: string;
  stack?: string;
  errorCode?: string;
  context?: Record<string, any>;
}

export interface SystemLogEntry extends LogEntry {
  type: 'system';
  cpuUsage: NodeJS.CpuUsage;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  loadAverage: number[];
  freeMemory: number;
  totalMemory: number;
}

export interface DatabaseLogEntry extends LogEntry {
  type: 'database';
  query?: string;
  queryTime: number;
  rowCount?:number;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CONNECT' | 'DISCONNECT';
  database: string;
}

