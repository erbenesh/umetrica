import { useCallback, useState } from 'react';

export type InsightFeedback = 'useful' | 'not_relevant';

function storageKey(insightId: string) {
  return `umetrica-insight-feedback:${insightId}`;
}

function readFeedback(insightId: string): InsightFeedback | null {
  const stored = localStorage.getItem(storageKey(insightId));
  return stored === 'useful' || stored === 'not_relevant' ? stored : null;
}

export function useInsightFeedback(insightId: string) {
  const [feedback, setFeedbackState] = useState<InsightFeedback | null>(() =>
    readFeedback(insightId)
  );

  const setFeedback = useCallback(
    (value: InsightFeedback) => {
      setFeedbackState(value);
      localStorage.setItem(storageKey(insightId), value);
    },
    [insightId]
  );

  return { feedback, setFeedback };
}
