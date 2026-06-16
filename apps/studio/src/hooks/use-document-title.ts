import { useEffect } from 'react';

import { BRAND_NAME } from '@/lib/brand';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — ${BRAND_NAME}` : BRAND_NAME;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
