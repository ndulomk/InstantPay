import winston from 'winston';
import path from 'path';
import fs from 'fs';
import os, { hostname } from 'os';
import type { FastifyRequest } from 'fastify';
import { LoggerEventEmitter } from './LoggerEventEmitter.js';
import { DatabaseLogEntry, ErrorLogEntry, RequestLogEntry, ResponseLogEntry, SystemLogEntry } from './types.js';

type SerializableException = { toJSON(): Record<string, unknown> };

const normalizeHeaders = (
  headers: FastifyRequest['headers']
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    result[key] = Array.isArray(value) ? value.join(', ') : value;
  }
  return result;
};

const isSerializableException = (
  value: unknown
): value is SerializableException =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { toJSON?: unknown }).toJSON === 'function';

export class InstantPayLogger {
  private logger!: winston.Logger;
  private eventEmitter: LoggerEventEmitter;
  private serviceName: string;
  private logsDir: string;

  constructor(serviceName: string, logsDir: string = '../../../../logs') {
    this.serviceName = serviceName;
    this.logsDir = logsDir;
    this.eventEmitter = new LoggerEventEmitter();

    this.ensureLogsDirectories();
    this.createLogger();
    this.setupEventListeners();
    this.startSystemMonitoring();
  }

  private ensureLogsDirectories() {
    const categories = ['http', 'error', 'exceptions', 'system', 'database'];
    
    categories.forEach(category => {
      const categoryDir = path.join(this.logsDir, category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }
    });
  }

  private getLogFileName(category: string, type?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = type 
      ? `${this.serviceName}-${type}-${timestamp}.json`
      : `${this.serviceName}-${category}-${timestamp}.json`;
    
    return path.join(this.logsDir, category, fileName);
  }

  private createLogger() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.metadata()
      ),
      defaultMeta: {
        service: this.serviceName,
        hostname: os.hostname(),
        pid: process.pid
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),

        // Combined logs in http directory
        new winston.transports.File({
          filename: path.join(this.logsDir, 'http', `${this.serviceName}-combined-${timestamp}.json`),
          level: 'info'
        }),

        // Error logs in error directory
        new winston.transports.File({
          filename: path.join(this.logsDir, 'error', `${this.serviceName}-errors-${timestamp}.json`),
          level: 'error'
        })
      ],
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logsDir, 'exceptions', `${this.serviceName}-exceptions-${timestamp}.json`)
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logsDir, 'exceptions', `${this.serviceName}-rejections-${timestamp}.json`)
        })
      ]
    });
  }

  private setupEventListeners() {
    this.eventEmitter.on('request', (data: RequestLogEntry) => {
      const logFile = this.getLogFileName('http', 'requests');
      fs.appendFileSync(logFile, JSON.stringify(data) + '\n');
      this.logger.info('HTTP Request', data);
    });

    this.eventEmitter.on('response', (data: ResponseLogEntry) => {
      const logFile = this.getLogFileName('http', 'responses');
      fs.appendFileSync(logFile, JSON.stringify(data) + '\n');

      if (data.statusCode >= 400) {
        this.logger.warn('HTTP Response Error', data);
      } else {
        this.logger.info('HTTP Response', data);
      }
    });

    this.eventEmitter.on('error', (data: ErrorLogEntry) => {
      const logFile = this.getLogFileName('error', 'errors');
      fs.appendFileSync(logFile, JSON.stringify(data) + '\n');
      this.logger.error('Application Error', data);
    });

    this.eventEmitter.on('system', (data: SystemLogEntry) => {
      const logFile = this.getLogFileName('system', 'metrics');
      fs.appendFileSync(logFile, JSON.stringify(data) + '\n');
      this.logger.info('System Metrics', data);
    });

    this.eventEmitter.on('database', (data: DatabaseLogEntry) => {
      const logFile = this.getLogFileName('database', 'operations');
      fs.appendFileSync(logFile, JSON.stringify(data) + '\n');

      if (data.queryTime > 1000) {
        this.logger.warn('Slow Database Query', data);
      } else {
        this.logger.info('Database Operation', data);
      }
    });
  }

  private startSystemMonitoring() {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.eventEmitter.emitSystem({
        type: 'system',
        service: this.serviceName,
        message: 'System metrics collected',
        cpuUsage,
        memoryUsage,
        uptime: process.uptime(),
        loadAverage: os.loadavg(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem()
      });
    }, 60000);
  }

  public info(message: string, meta?: Record<string, unknown>) {
    this.logger.info(message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>) {
    this.logger.warn(message, meta);
  }

  public error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    const errorData: Partial<ErrorLogEntry> = {
      type: 'error',
      service: this.serviceName,
      message,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: meta
    };

    this.eventEmitter.emitError(errorData as Omit<ErrorLogEntry, 'timestamp' | 'level'>);
  }

  public logRequest(req: FastifyRequest, correlationId?: string) {
    const userAgent = req.headers['user-agent'];
    this.eventEmitter.emitRequest({
      type: 'request',
      service: this.serviceName,
      message: `${req.method} ${req.url}`,
      method: req.method,
      url: req.url,
      headers: normalizeHeaders(req.headers),
      body: req.body,
      ip: req.ip || req.socket.remoteAddress || '',
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
      correlationId
    });
  }

  public logResponse(statusCode: number, responseTime: number, headers: Record<string, string> = {}, correlationId?: string) {
    this.eventEmitter.emitResponse({
      type: 'response',
      service: this.serviceName,
      message: `Response sent with status ${statusCode}`,
      statusCode,
      responseTime,
      headers,
      correlationId
    });
  }

  public logDatabase(operation: DatabaseLogEntry['operation'], queryTime: number, database: string, query?: string, rowCount?: number) {
    this.eventEmitter.emitDatabase({
      type: 'database',
      service: this.serviceName,
      message: `Database ${operation} operation`,
      operation,
      queryTime,
      database,
      query,
      rowCount
    });
  }

  // Method to log domain exceptions specifically
  public logDomainException(exception: unknown, context?: Record<string, unknown>) {
    const logFile = this.getLogFileName('exceptions', 'domain-exceptions');
    const serialized = isSerializableException(exception)
      ? exception.toJSON()
      : { message: exception instanceof Error ? exception.message : String(exception) };
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'domain-exception',
      service: this.serviceName,
      ...serialized,
      context
    };
    
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    this.logger.error('Domain Exception', logEntry);
  }

  // Getter para usar event emitter externamente
  public get events() {
    return this.eventEmitter;
  }

  public child(metadata: Record<string, unknown>) {
    return this.logger.child(metadata);
  }

  public async close() {
    await new Promise<void>((resolve) => {
      this.logger.close();
      this.eventEmitter.removeAllListeners();
      resolve();
    });
  }
}

export const createLogger = (serviceName: string, logsDir?: string) => {
  return new InstantPayLogger(serviceName, logsDir);
};