export const CANVAS_STAGE_MARGIN = 24;
export const CANVAS_DRAG_THRESHOLD_PX = 4;

export interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function isMultiSelectPointer(event: {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}) {
  return event.ctrlKey || event.metaKey || event.shiftKey;
}

export function isToggleSelectPointer(event: { ctrlKey: boolean; metaKey: boolean }) {
  return event.ctrlKey || event.metaKey;
}

export function clientToCanvasSpace(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  pan: { x: number; y: number },
  zoom: number
) {
  const stageX = (clientX - canvasRect.left - pan.x) / zoom;
  const stageY = (clientY - canvasRect.top - pan.y) / zoom;
  return {
    x: stageX - CANVAS_STAGE_MARGIN,
    y: stageY - CANVAS_STAGE_MARGIN,
  };
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): CanvasRect {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  return {
    left,
    top,
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export function rectsIntersect(a: CanvasRect, b: CanvasRect) {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

export function toggleSetMember<T>(set: Set<T>, item: T) {
  const next = new Set(set);
  if (next.has(item)) {
    next.delete(item);
  } else {
    next.add(item);
  }
  return next;
}
