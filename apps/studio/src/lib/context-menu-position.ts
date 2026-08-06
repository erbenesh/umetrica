import { useLayoutEffect, useRef, useState } from 'react';

export function useFixedMenuPosition(x: number, y: number, open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    if (!open) return;

    const menu = ref.current;
    if (!menu) {
      setPosition({ left: x, top: y });
      return;
    }

    const rect = menu.getBoundingClientRect();
    const padding = 8;
    setPosition({
      left: Math.min(Math.max(padding, x), window.innerWidth - rect.width - padding),
      top: Math.min(Math.max(padding, y), window.innerHeight - rect.height - padding),
    });
  }, [open, x, y]);

  return { ref, position };
}
