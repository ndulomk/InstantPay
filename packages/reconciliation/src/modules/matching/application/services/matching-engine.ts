import type {
  ReconciliationDirection,
} from '../../../statements/application/dtos/statement.dto.js';
import type {
  DiscrepancyType,
  MatchType,
} from '../dtos/matching.dto.js';

export type MatchingEntry = {
  id: string;
  externalReference: string;
  direction: ReconciliationDirection;
  amount: number;
  valueDate: Date;
};

export type MatchingInternal = {
  id: string;
  sourceReference: string;
  direction: ReconciliationDirection;
  amount: number;
  valueDate: Date;
};

export type MatchAssignment = {
  entryId: string;
  internalRecordId: string;
  amount: number;
  matchType: MatchType;
};

export type DiscrepancyCandidate = {
  entryId: string | null;
  internalRecordId: string | null;
  type: DiscrepancyType;
  expectedAmount: number | null;
  actualAmount: number | null;
  difference: number | null;
  description: string;
};

export type MatchingResult = {
  assignments: MatchAssignment[];
  discrepancies: DiscrepancyCandidate[];
};

export type MatchingOptions = {
  dateWindowDays: number;
  openingBalance: number | null;
  closingBalance: number | null;
};

const DAY_MS = 86_400_000;

const toUtcDay = (value: Date): number =>
  Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate()
  );

const daysBetween = (a: Date, b: Date): number =>
  Math.round(Math.abs(toUtcDay(a) - toUtcDay(b)) / DAY_MS);

const round = (value: number): number =>
  Math.round(value * 100) / 100;

const amountsEqual = (a: number, b: number): boolean =>
  Math.abs(a - b) < 0.005;

const netAmount = (entries: MatchingEntry[]): number =>
  round(
    entries.reduce(
      (total, entry) =>
        entry.direction === 'credit'
          ? total + entry.amount
          : total - entry.amount,
      0
    )
  );

export const reconcileEntries = (
  entries: MatchingEntry[],
  internals: MatchingInternal[],
  options: MatchingOptions
): MatchingResult => {
  const assignments: MatchAssignment[] = [];
  const discrepancies: DiscrepancyCandidate[] = [];
  const usedInternalIds = new Set<string>();

  // 1. Referências externas repetidas são uma anomalia por si só.
  const entriesByReference = new Map<string, MatchingEntry[]>();
  for (const entry of entries) {
    const group = entriesByReference.get(entry.externalReference) ?? [];
    group.push(entry);
    entriesByReference.set(entry.externalReference, group);
  }

  const duplicateIds = new Set<string>();
  for (const [reference, group] of entriesByReference) {
    for (const duplicate of group.slice(1)) {
      duplicateIds.add(duplicate.id);
      discrepancies.push({
        entryId: duplicate.id,
        internalRecordId: null,
        type: 'duplicate',
        expectedAmount: group[0]?.amount ?? null,
        actualAmount: duplicate.amount,
        difference: 0,
        description: `Referência externa duplicada no extracto: ${reference}`,
      });
    }
  }

  const findInternalByReference = (
    entry: MatchingEntry
  ): MatchingInternal | null => {
    const candidates = internals.filter(
      (internal) =>
        !usedInternalIds.has(internal.id) &&
        internal.sourceReference === entry.externalReference
    );

    if (candidates.length === 0) return null;

    return (
      candidates.find(
        (internal) =>
          internal.direction === entry.direction &&
          amountsEqual(internal.amount, entry.amount)
      ) ??
      candidates[0] ??
      null
    );
  };

  // 2. Correspondência por referência.
  for (const entry of entries) {
    if (duplicateIds.has(entry.id)) continue;

    const internal = findInternalByReference(entry);
    if (!internal) continue;

    usedInternalIds.add(internal.id);

    if (
      internal.direction === entry.direction &&
      amountsEqual(internal.amount, entry.amount)
    ) {
      assignments.push({
        entryId: entry.id,
        internalRecordId: internal.id,
        amount: entry.amount,
        matchType: 'reference',
      });
      continue;
    }

    discrepancies.push({
      entryId: entry.id,
      internalRecordId: internal.id,
      type: 'amount_mismatch',
      expectedAmount: internal.amount,
      actualAmount: entry.amount,
      difference: round(entry.amount - internal.amount),
      description: `Referência ${entry.externalReference} com valor ou direcção diferente`,
    });
  }

  const matchedEntryIds = new Set(
    assignments.map((assignment) => assignment.entryId)
  );
  const discrepancyEntryIds = new Set(
    discrepancies.flatMap((item) =>
      item.entryId ? [item.entryId] : []
    )
  );

  // 3. Correspondência por valor e data, com janela configurável.
  for (const entry of entries) {
    if (
      matchedEntryIds.has(entry.id) ||
      discrepancyEntryIds.has(entry.id) ||
      duplicateIds.has(entry.id)
    ) {
      continue;
    }

    const available = internals.filter(
      (internal) =>
        !usedInternalIds.has(internal.id) &&
        internal.direction === entry.direction &&
        amountsEqual(internal.amount, entry.amount)
    );

    const sameDate = available.find(
      (internal) => daysBetween(internal.valueDate, entry.valueDate) === 0
    );
    if (sameDate) {
      usedInternalIds.add(sameDate.id);
      assignments.push({
        entryId: entry.id,
        internalRecordId: sameDate.id,
        amount: entry.amount,
        matchType: 'amount_date',
      });
      matchedEntryIds.add(entry.id);
      continue;
    }

    const withinWindow = available
      .map((internal) => ({
        internal,
        distance: daysBetween(internal.valueDate, entry.valueDate),
      }))
      .filter((item) => item.distance <= options.dateWindowDays)
      .sort((a, b) => a.distance - b.distance)[0];

    if (withinWindow) {
      usedInternalIds.add(withinWindow.internal.id);
      assignments.push({
        entryId: entry.id,
        internalRecordId: withinWindow.internal.id,
        amount: entry.amount,
        matchType: 'amount_window',
      });
      matchedEntryIds.add(entry.id);
      continue;
    }

    discrepancies.push({
      entryId: entry.id,
      internalRecordId: null,
      type: 'missing_internal',
      expectedAmount: null,
      actualAmount: entry.amount,
      difference: entry.amount,
      description: `Linha do extracto sem registo interno: ${entry.externalReference}`,
    });
    discrepancyEntryIds.add(entry.id);
  }

  // 4. Registos internos sem linha no extracto.
  for (const internal of internals) {
    if (usedInternalIds.has(internal.id)) continue;

    discrepancies.push({
      entryId: null,
      internalRecordId: internal.id,
      type: 'missing_external',
      expectedAmount: internal.amount,
      actualAmount: null,
      difference: internal.amount,
      description: `Registo interno sem linha no extracto: ${internal.sourceReference}`,
    });
  }

  // 5. Conferência dos saldos do extracto.
  if (
    options.openingBalance !== null &&
    options.closingBalance !== null
  ) {
    const expectedClosing = round(
      options.openingBalance + netAmount(entries)
    );
    const difference = round(
      options.closingBalance - expectedClosing
    );

    if (Math.abs(difference) >= 0.01) {
      discrepancies.push({
        entryId: null,
        internalRecordId: null,
        type: 'balance_mismatch',
        expectedAmount: expectedClosing,
        actualAmount: options.closingBalance,
        difference,
        description:
          'O saldo de fecho não corresponde ao saldo inicial acrescido das linhas do extracto',
      });
    }
  }

  return { assignments, discrepancies };
};
