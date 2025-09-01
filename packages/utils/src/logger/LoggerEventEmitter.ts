import EventEmitter from 'events';
import { DatabaseLogEntry, ErrorLogEntry, RequestLogEntry, ResponseLogEntry, SystemLogEntry } from './types';

export class LoggerEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emitRequest(data: Omit<RequestLogEntry, 'timestamp' | 'level'>) {
    this.emit('request', { ...data, timestamp: new Date(), level: 'info' });
  }

  emitResponse(data: Omit<ResponseLogEntry, 'timestamp' | 'level'>) {
    this.emit('response', { ...data, timestamp: new Date(), level: 'info' });
  }

  emitError(data: Omit<ErrorLogEntry, 'timestamp' | 'level'>) {
    this.emit('error', { ...data, timestamp: new Date(), level: 'error' });
  }

  emitSystem(data: Omit<SystemLogEntry, 'timestamp' | 'level'>) {
    this.emit('system', { ...data, timestamp: new Date(), level: 'info' });
  }

  emitDatabase(data: Omit<DatabaseLogEntry, 'timestamp' | 'level'>) {
    this.emit('database', { ...data, timestamp: new Date(), level: 'info' });
  }
}
