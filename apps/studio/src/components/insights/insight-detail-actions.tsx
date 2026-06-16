import { Archive, ExternalLink, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useInsightFeedback } from '@/hooks/use-insight-feedback';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function InsightDetailActions({
  insightId,
  dashboardHref,
  onArchive,
  isArchiving = false,
}: {
  insightId: string;
  dashboardHref: string;
  onArchive: () => void;
  isArchiving?: boolean;
}) {
  const { feedback, setFeedback } = useInsightFeedback(insightId);

  return (
    <div className="insight-detail__actions">
      <Button
        size="sm"
        type="button"
        className={cn(feedback === 'useful' && 'ring-1 ring-primary/30')}
        onClick={() => setFeedback('useful')}
      >
        <ThumbsUp size={14} />
        Полезно
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        className={cn(feedback === 'not_relevant' && 'ring-1 ring-border')}
        onClick={() => setFeedback('not_relevant')}
      >
        <ThumbsDown size={14} />
        Не актуально
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        disabled={isArchiving}
        onClick={onArchive}
      >
        {isArchiving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
        В архив
      </Button>
      <Link to={dashboardHref}>
        <Button variant="ghost" size="sm" type="button">
          <ExternalLink size={14} />
          Открыть дашборд
        </Button>
      </Link>
    </div>
  );
}
