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

  constructor(serviceName: string, logsDir: string = './logs') {
    this.serviceName = serviceName;
    this.logsDir = logsDir;
    this.eventEmitter = new LoggerEventEmitter();

    this.ensureLogsDirectory()
    this.createLogger();
    this.setupEventListeners();
    this.startSystemMonitoring();
  }

  private ensureLogsDirectory() {
    const today = new Date().toISOString().split('T')[0];
    const dailyDir = path.join(this.logsDir, today)

    if(!fs.existsSync(dailyDir)){
      fs.mkdirSync(dailyDir, { recursive: true });
    }
  }

  private getLogFileName(type: string): string {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.logsDir, today, `${this.serviceName}-${type}-${timestamp}.json`);
  }

  private createLogger() {
    const today = new Date().toISOString().split('T')[0];

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

        new winston.transports.File({
          filename: path.join(this.logsDir, today, `${this.serviceName}-combined-${today}.json`),
          level: 'info'
        }),

        new winston.transports.File({
          filename: path.join(this.logsDir, today, `${this.serviceName}-errors-${today}.json`),
          level: 'error'
        })
      ],
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logsDir, today, `${this.serviceName}-exceptions-${today}.json`)
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(this.logsDir, today, `${this.serviceName}-rejections-${today}.json`)
        })
      ]
    })
  }

  private setupEventListeners(){
    this.eventEmitter.on('request', (data:RequestLogEntry)=> {
      const logFile = this.getLogFileName('requests');
      fs.appendFileSync(logFile, JSON.stringify(data) + '\n');
      this.logger.info('HTTP Request', data);
    })

    this.eventEmitter.on('response', (data:ResponseLogEntry)=> {
      const logFile = this.getLogFileName('responses');
      fs.appendFileSync(logFile, JSON.stringify(data) + '\n');

      if(data.statusCode >= 400){
        this.logger.warn('HTTP Response Error', data);
      } else {
        this.logger.info('HTTP Response', data)
      }
    })

    this.eventEmitter.on('error', (data: ErrorLogEntry)=> {
      const logFile = this.getLogFileName('errors');
      fs.appendFileSync(logFile, JSON.stringify(data) + '\n');
      this.logger.error('Application Error', data);
    });

    this.eventEmitter.on('system', (data: SystemLogEntry)=> {
      const logFile = this.getLogFileName('system');
      fs.appendFileSync(logFile, JSON.stringify(data) + '\n');
      this.logger.info('System Metrics', data);
    })

    this.eventEmitter.on('database', (data:DatabaseLogEntry)=> {
      const logFile = this.getLogFileName('database');
      fs.appendFileSync(logFile, JSON.stringify(data) + '\n');

      if(data.queryTime > 1000){
        this.logger.warn('Slow Database Query', data);
      } else {
        this.logger.info('Database Operation', data);
      }
    })
  }

  private startSystemMonitoring(){
    setInterval(()=> {
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
      })
    }, 60000);
  }

  public info(message: string, meta?: Record<string, any>){
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