import { useState } from 'react';
import { errorMessage } from '@/lib/api-client';
import { createActivityId } from '../lab.api';
import type { LabActionResult, LabActivity } from '../types';

type ActionOutcome = {
  summary: string;
  details?: unknown;
};

export const useLabAction = (onActivity: (activity: LabActivity) => void) => {
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<LabActionResult | null>(null);

  const run = async (
    key: string,
    label: string,
    action: () => Promise<ActionOutcome>
  ): Promise<LabActionResult> => {
    setPending(key);
    setResult(null);

    try {
      const outcome = await action();
      const activity: LabActivity = {
        id: createActivityId(),
        at: new Date().toISOString(),
        label,
        status: 'success',
        summary: outcome.summary,
        details: outcome.details,
      };
      setResult({ status: 'success', ...outcome });
      onActivity(activity);
      return { status: 'success', ...outcome };
    } catch (error) {
      const message = errorMessage(error);
      const activity: LabActivity = {
        id: createActivityId(),
        at: new Date().toISOString(),
        label,
        status: 'error',
        summary: message,
      };
      setResult({ status: 'error', summary: message });
      onActivity(activity);
      return { status: 'error', summary: message };
    } finally {
      setPending(null);
    }
  };

  return { pending, result, setResult, run };
};
