import { useCallback, useState } from 'react';

export type InsightFeedback = 'useful' | 'not_relevant';

const LEGACY_FEEDBACK_PREFIX = 'umetrica-insight-feedback:';
const FEEDBACK_PREFIX = 'sellerpool-insight-feedback:';

function storageKey(insightId: string) {
  return `${FEEDBACK_PREFIX}${insightId}`;
}

function readFeedback(insightId: string): InsightFeedback | null {
  const stored =
    localStorage.getItem(storageKey(insightId)) ??
    localStorage.getItem(`${LEGACY_FEEDBACK_PREFIX}${insightId}`);
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
