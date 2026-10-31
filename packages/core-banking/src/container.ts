import type { Database } from '@instantpay/config';
import { database } from '@instantpay/config';
import type { preHandlerHookHandler } from 'fastify';

import {
  createEventBus,
  type EventBus,
} from './shared/events/event-bus.js';
import {
  createTransactionRunner,
  type TransactionRunner,
} from './shared/db/transaction.js';
import { createAuthGuard } from './shared/auth/auth.guard.js';

import { createUserRepository } from './modules/users/infrastructure/persistence/user.repository.js';
import { createUserService } from './modules/users/application/services/user.service.js';
import type { IUserService } from './modules/users/application/ports/user.port.js';

import { createSessionRepository } from './modules/auth/infrastructure/persistence/session.repository.js';
import { createSessionService } from './modules/auth/application/services/session.service.js';
import { createAuthService } from './modules/auth/application/services/auth.service.js';
import type { IAuthService, ISessionService } from './modules/auth/application/ports/auth.port.js';

import { createBankRepository } from './modules/banks/infrastructure/persistence/bank.repository.js';
import { createBankService } from './modules/banks/application/services/bank.service.js';
import type { IBankService } from './modules/banks/application/ports/bank.port.js';

import { createAccountRepository } from './modules/accounts/infrastructure/persistence/account.repository.js';
import { createAccountService } from './modules/accounts/application/services/account.service.js';
import type { IAccountService } from './modules/accounts/application/ports/account.port.js';

import { createTransactionLimitRepository } from './modules/limits/infrastructure/persistence/limit.repository.js';
import { createTransactionLimitService } from './modules/limits/application/services/limit.service.js';
import type { ITransactionLimitService } from './modules/limits/application/ports/limit.port.js';

import { createLedgerRepository } from './modules/ledger/infrastructure/persistence/ledger.repository.js';
import { createLedgerService } from './modules/ledger/application/services/ledger.service.js';
import type { ILedgerService } from './modules/ledger/application/ports/ledger.port.js';

import { createTransactionRepository } from './modules/transactions/infrastructure/persistence/transaction.repository.js';
import { createTransactionService } from './modules/transactions/application/services/transaction.service.js';
import type { ITransactionService } from './modules/transactions/application/ports/transaction.port.js';

import { createHoldRepository } from './modules/holds/infrastructure/persistence/hold.repository.js';
import { createHoldService } from './modules/holds/application/services/hold.service.js';
import type { IHoldService } from './modules/holds/application/ports/hold.port.js';

import { createReserveRepository } from './modules/reserves/infrastructure/persistence/reserve.repository.js';
import { createReserveService } from './modules/reserves/application/services/reserve.service.js';
import type { IReserveService } from './modules/reserves/application/ports/reserve.port.js';

import { createAuditRepository } from './modules/audit/infrastructure/persistence/audit.repository.js';
import { createAuditService } from './modules/audit/application/services/audit.service.js';
import { registerAuditListener } from './modules/audit/events/audit.listener.js';
import type { IAuditService } from './modules/audit/application/ports/audit.port.js';

export type Container = {
  eventBus: EventBus;
  withTransaction: TransactionRunner;
  guard: preHandlerHookHandler;
  userService: IUserService;
  sessionService: ISessionService;
  authService: IAuthService;
  bankService: IBankService;
  accountService: IAccountService;
  transactionService: ITransactionService;
  ledgerService: ILedgerService;
  holdService: IHoldService;
  limitService: ITransactionLimitService;
  reserveService: IReserveService;
  auditService: IAuditService;
};

export const buildContainer = (db: Database): Container => {
  const eventBus = createEventBus({
    onError: (error, event) => {
      console.error(`[event-bus] falha no evento ${event.type}`, error);
    },
  });

  const withTransaction = createTransactionRunner(db);

  // ── Repositórios ──────────────────────────────────────────────────────────
  const userRepository = createUserRepository(db);
  const sessionRepository = createSessionRepository(db);
  const bankRepository = createBankRepository(db);
  const accountRepository = createAccountRepository(db);
  const limitRepository = createTransactionLimitRepository(db);
  const ledgerRepository = createLedgerRepository(db);
  const transactionRepository = createTransactionRepository(db);
  const holdRepository = createHoldRepository(db);
  const reserveRepository = createReserveRepository(db);
  const auditRepository = createAuditRepository(db);

  // ── Serviços ──────────────────────────────────────────────────────────────
  const auditService = createAuditService(auditRepository);
  registerAuditListener(eventBus, auditService);

  const userService = createUserService(userRepository, eventBus);
  const sessionService = createSessionService(sessionRepository);
  const authService = createAuthService(
    userRepository,
    userService,
    sessionService,
    eventBus
  );

  const bankService = createBankService(bankRepository, eventBus);
  const accountService = createAccountService(
    accountRepository,
    userRepository,
    bankRepository,
    eventBus
  );
  const limitService = createTransactionLimitService(
    limitRepository,
    accountRepository,
    eventBus
  );
  const transactionService = createTransactionService(
    transactionRepository,
    accountRepository,
    limitRepository,
    ledgerRepository,
    eventBus,
    withTransaction
  );
  const ledgerService = createLedgerService(
    ledgerRepository,
    accountRepository,
    transactionRepository
  );
  const holdService = createHoldService(
    holdRepository,
    accountRepository,
    eventBus,
    withTransaction
  );
  const reserveService = createReserveService(
    reserveRepository,
    bankRepository,
    eventBus
  );

  return {
    eventBus,
    withTransaction,
    guard: createAuthGuard(userRepository, sessionRepository),
    userService,
    sessionService,
    authService,
    bankService,
    accountService,
    transactionService,
    ledgerService,
    holdService,
    limitService,
    reserveService,
    auditService,
  };
};

export const container = buildContainer(database);
