import { CalendarClock } from 'lucide-react';
import { useState } from 'react';

const GRANULARITIES = ['День', 'Неделя', 'Месяц'] as const;

export function DashboardToolbar() {
  const [granularity, setGranularity] = useState<(typeof GRANULARITIES)[number]>('День');

  return (
    <div className="dashboard-toolbar" role="toolbar" aria-label="Фильтры дашборда">
      <div className="dashboard-toolbar__group">
        <span className="dashboard-toolbar__label">
          <CalendarClock size={14} />
          Детализация
        </span>
        <div className="segmented segmented--dense" role="group" aria-label="Детализация времени">
          {GRANULARITIES.map((item) => (
            <button
              key={item}
              type="button"
              className={granularity === item ? 'segmented__btn is-active' : 'segmented__btn'}
              onClick={() => setGranularity(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
