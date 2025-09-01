import winston from 'winston';
import path from 'path';
import fs from 'fs';
import os, { hostname } from 'os';
import { LoggerEventEmitter } from './LoggerEventEmitter';
import { DatabaseLogEntry, ErrorLogEntry, RequestLogEntry, ResponseLogEntry, SystemLogEntry } from './types';

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

  public info(message: string, meta?: Record<string, any>) {
    this.logger.info(message, meta);
  }

  public warn(message: string, meta?: Record<string, any>) {
    this.logger.warn(message, meta);
  }

  public error(message: string, error?: Error | any, meta?: Record<string, any>) {
    const errorData: Partial<ErrorLogEntry> = {
      type: 'error',
      service: this.serviceName,
      message,
      errorMessage: error?.message || String(error),
      stack: error?.stack,
      context: meta
    };

    this.eventEmitter.emitError(errorData as Omit<ErrorLogEntry, 'timestamp' | 'level'>);
  }

  public logRequest(req: any, correlationId?: string) {
    this.eventEmitter.emitRequest({
      type: 'request',
      service: this.serviceName,
      message: `${req.method} ${req.url}`,
      method: req.method,
      url: req.url,
      headers: req.headers || {},
      body: req.body,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
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
  public logDomainException(exception: any, context?: Record<string, any>) {
    const logFile = this.getLogFileName('exceptions', 'domain-exceptions');
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'domain-exception',
      service: this.serviceName,
      ...exception.toJSON(),
      context
    };
    
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    this.logger.error('Domain Exception', logEntry);
  }

  // Getter para usar event emitter externamente
  public get events() {
    return this.eventEmitter;
  }

  public child(metadata: Record<string, any>) {
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