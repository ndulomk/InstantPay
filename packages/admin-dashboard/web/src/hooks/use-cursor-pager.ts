import { useCallback, useEffect, useMemo, useState } from 'react';

type CursorPagerState = {
  cursors: (string | null)[];
  index: number;
};

export type CursorPager = {
  cursor: string | null;
  page: number;
  hasPrevious: boolean;
  goNext: (nextCursor: string | null) => void;
  goPrevious: () => void;
  reset: () => void;
};

const initialState: CursorPagerState = { cursors: [null], index: 0 };

export const useCursorPager = (resetKey: string): CursorPager => {
  const [state, setState] = useState<CursorPagerState>(initialState);

  useEffect(() => {
    setState(initialState);
  }, [resetKey]);

  const reset = useCallback(() => setState(initialState), []);

  const goNext = useCallback((nextCursor: string | null) => {
    if (!nextCursor) return;

    setState((current) => ({
      cursors: [...current.cursors.slice(0, current.index + 1), nextCursor],
      index: current.index + 1,
    }));
  }, []);

  const goPrevious = useCallback(() => {
    setState((current) => ({
      ...current,
      index: Math.max(0, current.index - 1),
    }));
  }, []);

  return useMemo(
    () => ({
      cursor: state.cursors[state.index] ?? null,
      page: state.index + 1,
      hasPrevious: state.index > 0,
      goNext,
      goPrevious,
      reset,
    }),
    [goNext, goPrevious, reset, state]
  );
};
