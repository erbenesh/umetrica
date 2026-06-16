import type { SemanticCubeListItem, SemanticViewListItem, SemanticWorkspaceLayout } from '@sellerpool/core';
import { semanticCubeLabel } from '@sellerpool/core';
import { computeWorkspaceBounds } from '@sellerpool/core';
import { Box, Eye, Loader2, Maximize2, Minus, Monitor, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CANVAS_DRAG_THRESHOLD_PX,
  clientToCanvasSpace,
  isToggleSelectPointer,
  normalizeRect,
  rectsIntersect,
  toggleSetMember,
  type CanvasRect,
} from '@/lib/canvas-graph-utils';
import { cn } from '@/lib/utils';
import { useCubeJoinContext, useUpdateSemanticWorkspace } from '@/hooks/use-semantic';

const CARD_W = 220;
const CARD_H = 100;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;

type WorkspaceCardKey = `cube:${string}` | `view:${string}`;

function workspaceCardKey(kind: 'cube' | 'view', name: string): WorkspaceCardKey {
  return `${kind}:${name}`;
}

function parseWorkspaceCardKey(key: WorkspaceCardKey) {
  const [kind, name] = key.split(':') as ['cube' | 'view', string];
  return { kind, name };
}

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value.toFixed(2))));
}

interface SemanticWorkspaceCanvasProps {
  tab: 'cubes' | 'views';
  cubes: SemanticCubeListItem[];
  views: SemanticViewListItem[];
  layout: SemanticWorkspaceLayout;
  canWrite: boolean;
  onJoinCubes?: (sourceCube: string, targetCube: string) => void;
}

export function SemanticWorkspaceCanvas({
  tab,
  cubes,
  views,
  layout,
  canWrite,
  onJoinCubes,
}: SemanticWorkspaceCanvasProps) {
  const navigate = useNavigate();
  const updateWorkspace = useUpdateSemanticWorkspace();
  const { data: joinContext } = useCubeJoinContext();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggingKeys, setDraggingKeys] = useState<Set<WorkspaceCardKey>>(new Set());
  const [selectedCards, setSelectedCards] = useState<Set<WorkspaceCardKey>>(new Set());
  const [marqueeRect, setMarqueeRect] = useState<CanvasRect | null>(null);
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    keys: Set<WorkspaceCardKey>;
    anchorKey: WorkspaceCardKey;
  } | null>(null);
  const canvasPointerRef = useRef<{
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
    mode: 'pending' | 'pan' | 'marquee';
    additive: boolean;
    baseSelection: Set<WorkspaceCardKey>;
  } | null>(null);
  const cardDragRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    origins: Map<WorkspaceCardKey, { x: number; y: number }>;
    openPath: string | null;
    selectionOnly: boolean;
  } | null>(null);
  const skipOpenRef = useRef(false);
  const zoomRef = useRef(zoom);
  const panStateRef = useRef(pan);
  zoomRef.current = zoom;
  panStateRef.current = pan;

  const [localLayout, setLocalLayout] = useState(layout);

  useEffect(() => {
    setLocalLayout(layout);
  }, [layout]);

  useEffect(() => {
    setSelectedCards(new Set());
  }, [tab]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedCards(new Set());
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  const filteredCubes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return cubes;
    return cubes.filter(
      (cube) =>
        cube.name.toLowerCase().includes(query) ||
        cube.title.toLowerCase().includes(query) ||
        (cube.shortTitle?.toLowerCase().includes(query) ?? false) ||
        cube.subtitle.toLowerCase().includes(query)
    );
  }, [cubes, search]);

  const filteredViews = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return views;
    return views.filter(
      (view) => view.name.toLowerCase().includes(query) || view.title.toLowerCase().includes(query)
    );
  }, [views, search]);

  const cubeNames = cubes.map((cube) => cube.name);
  const viewNames = views.map((view) => view.name);
  const bounds = useMemo(
    () => computeWorkspaceBounds(localLayout, cubeNames, viewNames),
    [localLayout, cubeNames, viewNames]
  );

  const visibleCardItems = useMemo(() => {
    if (tab === 'cubes') {
      return filteredCubes.map((cube) => ({
        kind: 'cube' as const,
        name: cube.name,
        key: workspaceCardKey('cube', cube.name),
        pos: localLayout.cubes[cube.name] ?? { x: 48, y: 48 },
        cube,
      }));
    }
    return filteredViews.map((view) => ({
      kind: 'view' as const,
      name: view.name,
      key: workspaceCardKey('view', view.name),
      pos: localLayout.views[view.name] ?? { x: 48, y: 400 },
      view,
    }));
  }, [tab, filteredCubes, filteredViews, localLayout]);

  const joinEdges = useMemo(() => {
    const defs = joinContext?.cubes ?? [];
    const positions = localLayout.cubes;
    const edges: Array<{ id: string; d: string }> = [];

    for (const cube of defs) {
      const from = positions[cube.name];
      if (!from) continue;

      for (const join of cube.joins ?? []) {
        const to = positions[join.targetCube];
        if (!to) continue;

        const x1 = from.x - bounds.originX + CARD_W;
        const y1 = from.y - bounds.originY + CARD_H / 2;
        const x2 = to.x - bounds.originX;
        const y2 = to.y - bounds.originY + CARD_H / 2;

        edges.push({
          id: `${cube.name}->${join.targetCube}`,
          d: `M ${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}`,
        });
      }
    }

    return edges;
  }, [joinContext?.cubes, localLayout.cubes, bounds.originX, bounds.originY]);

  const scheduleLayoutSave = useCallback(
    (nextLayout: SemanticWorkspaceLayout) => {
      if (!canWrite) return;
      window.setTimeout(() => {
        updateWorkspace.mutate(nextLayout);
      }, 500);
    },
    [canWrite, updateWorkspace]
  );

  const getCardRect = useCallback(
    (key: WorkspaceCardKey): CanvasRect => {
      const { kind, name } = parseWorkspaceCardKey(key);
      const pos = localLayout[kind === 'cube' ? 'cubes' : 'views'][name] ?? { x: 48, y: 48 };
      return {
        left: pos.x - bounds.originX,
        top: pos.y - bounds.originY,
        width: CARD_W,
        height: CARD_H,
      };
    },
    [bounds.originX, bounds.originY, localLayout]
  );

  const collectMarqueeSelection = useCallback(
    (rect: CanvasRect) => {
      const hits = visibleCardItems
        .filter((item) => rectsIntersect(rect, getCardRect(item.key)))
        .map((item) => item.key);
      return hits;
    },
    [getCardRect, visibleCardItems]
  );

  const applyBulkPositions = useCallback(
    (origins: Map<WorkspaceCardKey, { x: number; y: number }>, dx: number, dy: number) => {
      setLocalLayout((prev) => {
        const nextCubes = { ...prev.cubes };
        const nextViews = { ...prev.views };

        for (const [key, origin] of origins) {
          const { kind, name } = parseWorkspaceCardKey(key);
          const position = { x: origin.x + dx, y: origin.y + dy };
          if (kind === 'cube') nextCubes[name] = position;
          else nextViews[name] = position;
        }

        return { cubes: nextCubes, views: nextViews };
      });
    },
    []
  );

  const beginCanvasPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest('.workspace-card')) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvasPointerRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originPanX: panStateRef.current.x,
      originPanY: panStateRef.current.y,
      mode: event.shiftKey ? 'marquee' : 'pending',
      additive: isToggleSelectPointer(event),
      baseSelection: new Set(selectedCards),
    };
    if (event.shiftKey) {
      setMarqueeRect({ left: 0, top: 0, width: 0, height: 0 });
    }
    canvas.setPointerCapture(event.pointerId);
  };

  const moveCanvasPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (cardDragRef.current) {
      const dx = event.clientX - cardDragRef.current.startX;
      const dy = event.clientY - cardDragRef.current.startY;
      if (!cardDragRef.current.moved && Math.hypot(dx, dy) < CANVAS_DRAG_THRESHOLD_PX) return;

      cardDragRef.current.moved = true;
      skipOpenRef.current = true;
      applyBulkPositions(
        cardDragRef.current.origins,
        dx / zoomRef.current,
        dy / zoomRef.current
      );
      return;
    }

    const ptr = canvasPointerRef.current;
    const canvas = canvasRef.current;
    if (!ptr || !canvas) return;

    const dx = event.clientX - ptr.startX;
    const dy = event.clientY - ptr.startY;

    if (ptr.mode === 'pending' && Math.hypot(dx, dy) >= CANVAS_DRAG_THRESHOLD_PX) {
      ptr.mode = 'pan';
      setIsPanning(true);
    }

    if (ptr.mode === 'pan') {
      setPan({
        x: ptr.originPanX + dx,
        y: ptr.originPanY + dy,
      });
      return;
    }

    if (ptr.mode === 'marquee') {
      const rect = canvas.getBoundingClientRect();
      const start = clientToCanvasSpace(
        ptr.startX,
        ptr.startY,
        rect,
        panStateRef.current,
        zoomRef.current
      );
      const current = clientToCanvasSpace(
        event.clientX,
        event.clientY,
        rect,
        panStateRef.current,
        zoomRef.current
      );
      const nextRect = normalizeRect(start.x, start.y, current.x, current.y);
      setMarqueeRect(nextRect);
      const hits = collectMarqueeSelection(nextRect);
      setSelectedCards(
        ptr.additive ? new Set([...ptr.baseSelection, ...hits]) : new Set(hits)
      );
    }
  };

  const endCanvasPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (cardDragRef.current) {
      const drag = cardDragRef.current;
      cardDragRef.current = null;
      setDraggingKeys(new Set());
      canvasRef.current?.releasePointerCapture(event.pointerId);

      if (event.button !== 0) {
        skipOpenRef.current = false;
        return;
      }

      if (drag.moved) {
        const dx = (event.clientX - drag.startX) / zoomRef.current;
        const dy = (event.clientY - drag.startY) / zoomRef.current;

        setLocalLayout((prev) => {
          const nextCubes = { ...prev.cubes };
          const nextViews = { ...prev.views };

          for (const [key, origin] of drag.origins) {
            const { kind, name } = parseWorkspaceCardKey(key);
            const position = { x: origin.x + dx, y: origin.y + dy };
            if (kind === 'cube') nextCubes[name] = position;
            else nextViews[name] = position;
          }

          const next = { cubes: nextCubes, views: nextViews };
          scheduleLayoutSave(next);
          return next;
        });
      }
      if (!drag.moved && drag.openPath && !drag.selectionOnly && !skipOpenRef.current) {
        navigate(drag.openPath);
      }
      skipOpenRef.current = false;
      return;
    }

    const ptr = canvasPointerRef.current;
    if (!ptr) return;

    if (ptr.mode === 'pending') {
      setSelectedCards(new Set());
    }

    canvasPointerRef.current = null;
    setIsPanning(false);
    setMarqueeRect(null);
    canvasRef.current?.releasePointerCapture(event.pointerId);
  };

  const beginCardPointer = (
    key: WorkspaceCardKey,
    openPath: string,
    event: PointerEvent<HTMLElement>
  ) => {
    if (event.button !== 0) return;
    skipOpenRef.current = false;

    const target = event.target as HTMLElement;
    if (target.closest('button')) return;

    event.stopPropagation();

    let selectionOnly = false;
    let activeSelection = selectedCards;

    if (isToggleSelectPointer(event)) {
      event.preventDefault();
      activeSelection = toggleSetMember(selectedCards, key);
      setSelectedCards(activeSelection);
      if (!activeSelection.has(key)) return;
      selectionOnly = true;
    } else if (event.shiftKey) {
      activeSelection = new Set([...selectedCards, key]);
      setSelectedCards(activeSelection);
      selectionOnly = true;
    }

    const moveKeys =
      activeSelection.has(key) && activeSelection.size > 0 ? activeSelection : new Set([key]);

    const origins = new Map<WorkspaceCardKey, { x: number; y: number }>();
    for (const moveKey of moveKeys) {
      const { kind, name } = parseWorkspaceCardKey(moveKey);
      origins.set(
        moveKey,
        localLayout[kind === 'cube' ? 'cubes' : 'views'][name] ?? { x: 48, y: 48 }
      );
    }

    cardDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      origins,
      openPath: selectionOnly ? null : openPath,
      selectionOnly,
    };

    if (canWrite) {
      setDraggingKeys(new Set(moveKeys));
    }

    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const openCardPath = (path: string) => {
    setContextMenu(null);
    navigate(path);
  };

  const handleCardContextMenu = (key: WorkspaceCardKey, event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    cardDragRef.current = null;
    setDraggingKeys(new Set());

    const keys = selectedCards.has(key) ? new Set(selectedCards) : new Set([key]);
    if (!selectedCards.has(key)) {
      setSelectedCards(keys);
    }

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      keys,
      anchorKey: key,
    });
  };

  const applyZoomAtPoint = useCallback((nextZoom: number, clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const currentZoom = zoomRef.current;
    const clamped = clampZoom(nextZoom);
    if (clamped === currentZoom) return;

    if (!canvas) {
      setZoom(clamped);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    const { x: panX, y: panY } = panStateRef.current;
    const stageX = (offsetX - panX) / currentZoom;
    const stageY = (offsetY - panY) / currentZoom;

    setZoom(clamped);
    setPan({
      x: offsetX - stageX * clamped,
      y: offsetY - stageY * clamped,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const intensity = event.ctrlKey || event.metaKey ? 0.002 : 0.0012;
      const nextZoom = zoomRef.current * (1 - event.deltaY * intensity);
      applyZoomAtPoint(nextZoom, event.clientX, event.clientY);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [applyZoomAtPoint]);

  const toStagePos = (x: number, y: number) => ({
    left: x - bounds.originX,
    top: y - bounds.originY,
  });

  const cardPointerProps = (key: WorkspaceCardKey, openPath: string) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => beginCardPointer(key, openPath, event),
    onContextMenu: (event: MouseEvent<HTMLElement>) => handleCardContextMenu(key, event),
  });

  const contextMenuActions = useMemo(() => {
    if (!contextMenu) return null;

    const { keys, anchorKey } = contextMenu;
    const { kind: anchorKind, name: anchorName } = parseWorkspaceCardKey(anchorKey);
    const anchorPath =
      anchorKind === 'cube'
        ? `/semantic/cubes/${encodeURIComponent(anchorName)}`
        : `/semantic/views/${encodeURIComponent(anchorName)}`;
    const selectedCubeNames = [...keys]
      .filter((key) => key.startsWith('cube:'))
      .map((key) => parseWorkspaceCardKey(key).name);

    return {
      anchorPath,
      anchorName,
      anchorKind,
      selectionCount: keys.size,
      canJoin:
        canWrite &&
        tab === 'cubes' &&
        anchorKind === 'cube' &&
        selectedCubeNames.length === 1 &&
        onJoinCubes,
    };
  }, [canWrite, contextMenu, onJoinCubes, tab]);

  const selectionCount = selectedCards.size;

  return (
    <div className="semantic-workspace">
      <div className={cn('node-canvas-wrap', canWrite && 'node-canvas-wrap--writable')}>
        <div className="node-canvas-mobile">
          <Monitor className="size-5 shrink-0" strokeWidth={1.75} />
          <span>
            ЛКМ — открыть · Ctrl+ЛКМ — выделить · Shift+drag — рамка · ПКМ — действия · Esc — сброс
          </span>
        </div>

        <div className="node-canvas-toolbar">
          <div className="relative min-w-[180px] max-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8"
              placeholder={tab === 'cubes' ? 'Поиск кубов…' : 'Поиск views…'}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {selectionCount > 0 ? (
            <span className="node-canvas-toolbar__selection">
              {selectionCount} выбрано
              <button
                type="button"
                className="node-canvas-toolbar__selection-clear"
                onClick={() => setSelectedCards(new Set())}
              >
                Сбросить
              </button>
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label="Уменьшить"
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) {
                setZoom((value) => clampZoom(value - 0.1));
                return;
              }
              const rect = canvas.getBoundingClientRect();
              applyZoomAtPoint(zoom - 0.1, rect.left + rect.width / 2, rect.top + rect.height / 2);
            }}
          >
            <Minus size={16} />
          </Button>
          <span className="node-canvas-toolbar__zoom">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label="Увеличить"
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) {
                setZoom((value) => clampZoom(value + 0.1));
                return;
              }
              const rect = canvas.getBoundingClientRect();
              applyZoomAtPoint(zoom + 0.1, rect.left + rect.width / 2, rect.top + rect.height / 2);
            }}
          >
            <Plus size={16} />
          </Button>
          <span className="node-canvas-toolbar__spacer" />
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Maximize2 size={14} />
            Вписать
          </Button>
          {updateWorkspace.isPending ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div
          ref={canvasRef}
          className={cn('node-canvas semantic-workspace__canvas', isPanning && 'is-panning')}
          onPointerDown={beginCanvasPointer}
          onPointerMove={moveCanvasPointer}
          onPointerUp={endCanvasPointer}
          onPointerCancel={endCanvasPointer}
        >
          <div
            className="node-canvas__stage"
            style={{
              width: bounds.width,
              height: bounds.height,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            {tab === 'cubes' ? (
              <svg className="node-edges" aria-hidden="true" width={bounds.width} height={bounds.height}>
                {joinEdges.map((edge) => (
                  <path key={edge.id} d={edge.d} />
                ))}
              </svg>
            ) : null}

            {marqueeRect ? (
              <div
                className="canvas-marquee"
                style={{
                  left: marqueeRect.left,
                  top: marqueeRect.top,
                  width: marqueeRect.width,
                  height: marqueeRect.height,
                }}
              />
            ) : null}

            {tab === 'cubes'
              ? filteredCubes.map((cube) => {
                  const key = workspaceCardKey('cube', cube.name);
                  const openPath = `/semantic/cubes/${encodeURIComponent(cube.name)}`;
                  const pos = localLayout.cubes[cube.name] ?? { x: 48, y: 48 };
                  const stagePos = toStagePos(pos.x, pos.y);

                  return (
                    <article
                      key={cube.name}
                      className={cn(
                        'workspace-card workspace-card--cube',
                        canWrite && 'is-draggable',
                        selectedCards.has(key) && 'is-canvas-selected',
                        draggingKeys.has(key) && 'is-dragging'
                      )}
                      style={stagePos}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          openCardPath(openPath);
                        }
                      }}
                      {...cardPointerProps(key, openPath)}
                    >
                      <header className="workspace-card__head">
                        <span className="workspace-card__icon">
                          <Box size={14} />
                        </span>
                        <div>
                          <h3 className="workspace-card__title">{semanticCubeLabel(cube)}</h3>
                          <p className="workspace-card__meta">{cube.subtitle}</p>
                        </div>
                      </header>
                      <p className="workspace-card__stats">
                        {cube.measureCount} мер · {cube.dimensionCount} изм.
                      </p>
                    </article>
                  );
                })
              : null}

            {tab === 'views'
              ? filteredViews.map((view) => {
                  const key = workspaceCardKey('view', view.name);
                  const openPath = `/semantic/views/${encodeURIComponent(view.name)}`;
                  const pos = localLayout.views[view.name] ?? { x: 48, y: 400 };
                  const stagePos = toStagePos(pos.x, pos.y);

                  return (
                    <article
                      key={view.name}
                      className={cn(
                        'workspace-card workspace-card--view',
                        canWrite && 'is-draggable',
                        selectedCards.has(key) && 'is-canvas-selected',
                        draggingKeys.has(key) && 'is-dragging'
                      )}
                      style={stagePos}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          openCardPath(openPath);
                        }
                      }}
                      {...cardPointerProps(key, openPath)}
                    >
                      <header className="workspace-card__head">
                        <span className="workspace-card__icon">
                          <Eye size={14} />
                        </span>
                        <div>
                          <h3 className="workspace-card__title">{view.title}</h3>
                          <p className="workspace-card__meta">{view.name}</p>
                        </div>
                      </header>
                      <p className="workspace-card__stats">
                        {view.cubePathCount} путей · {view.memberCount} members
                      </p>
                    </article>
                  );
                })
              : null}
          </div>
        </div>
      </div>

      {contextMenu && contextMenuActions ? (
        <div
          className="workspace-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="workspace-context-menu__item"
            role="menuitem"
            onClick={() => openCardPath(contextMenuActions.anchorPath)}
          >
            {contextMenuActions.selectionCount > 1
              ? `Открыть «${contextMenuActions.anchorName}»`
              : 'Открыть'}
          </button>
          {contextMenuActions.canJoin ? (
            <button
              type="button"
              className="workspace-context-menu__item"
              role="menuitem"
              onClick={() => {
                setContextMenu(null);
                navigate(
                  `/semantic/cubes/${encodeURIComponent(contextMenuActions.anchorName)}?tab=relationships`
                );
              }}
            >
              Создать join…
            </button>
          ) : null}
          {contextMenuActions.selectionCount > 1 ? (
            <p className="workspace-context-menu__hint">
              Выделено: {contextMenuActions.selectionCount}
            </p>
          ) : null}
          <button
            type="button"
            className="workspace-context-menu__item workspace-context-menu__item--muted"
            role="menuitem"
            onClick={() => {
              setSelectedCards(new Set());
              setContextMenu(null);
            }}
          >
            Снять выделение
          </button>
        </div>
      ) : null}
    </div>
  );
}
