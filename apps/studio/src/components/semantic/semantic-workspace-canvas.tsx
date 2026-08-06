import type {
  SemanticCubeDefinition,
  SemanticCubeListItem,
  SemanticGraphLayout,
  SemanticViewDefinition,
  SemanticViewListItem,
  SemanticWorkspaceLayout,
} from '@sellerpool/core';
import { semanticCubeLabel, semanticCubeNodeId, semanticMemberLabel } from '@sellerpool/core';
import { computeWorkspaceBounds } from '@sellerpool/core';
import { Box, Eye, FileCode2, Filter, GitBranch, Hash, Layers, Link2, Loader2, Maximize2, Minus, Monitor, Plus, Search, Text } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import {
  buildCanvasAuxNodes,
  CANVAS_LAYER_COLUMN_LABELS,
  computeAuxNodePositions,
  computeExpandedMemberBounds,
  computeExpandedMemberPositions,
  computeLayerBounds,
  type CanvasAuxNode,
  type CubeCanvasLayer,
  MEMBER_CHIP_H,
  MEMBER_CHIP_W,
  MEMBER_COLUMN_GAP,
  MEMBER_HEADER_H,
  MEMBER_OFFSET_X,
  WORKSPACE_CARD_H,
  WORKSPACE_CARD_W,
} from '@/lib/semantic-cube-draft';
import type { SemanticCubeEditorTab } from '@/components/semantic/semantic-cube-editor-header';

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
import { useFixedMenuPosition } from '@/lib/context-menu-position';
import { cn } from '@/lib/utils';
import { useCubeJoinContext, useUpdateSemanticWorkspace } from '@/hooks/use-semantic';
import { joinIdForTargetCube } from '@/lib/semantic-cube-selection';

const CARD_W = WORKSPACE_CARD_W;
const CARD_H = WORKSPACE_CARD_H;
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

function auxNodeIcon(kind: CanvasAuxNode['kind']) {
  switch (kind) {
    case 'join':
      return Link2;
    case 'segment':
      return Filter;
    case 'hierarchy':
      return GitBranch;
    case 'rollup':
      return Layers;
    case 'yaml':
      return FileCode2;
    default:
      return Box;
  }
}

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value.toFixed(2))));
}

export type SemanticUnifiedCanvasHandle = {
  centerTourTarget: (selector: string) => Promise<void>;
};

interface SemanticUnifiedCanvasProps {
  tab: 'cubes' | 'views';
  cubes: SemanticCubeListItem[];
  views: SemanticViewListItem[];
  layout: SemanticWorkspaceLayout;
  canWrite: boolean;
  focusCube?: string;
  focusView?: string;
  cubeEditorTab?: SemanticCubeEditorTab;
  expandedCubeDraft?: SemanticCubeDefinition;
  expandedCubeLayout?: SemanticGraphLayout;
  inspectorNodeId?: string;
  onInspectorNodeId?: (id: string) => void;
  onFocusCube: (name: string) => void;
  onFocusView: (name: string) => void;
  onOpenRelationships?: (cubeName: string) => void;
  onJoinCubes?: (sourceCube: string, targetCube: string) => void;
  viewDraft?: SemanticViewDefinition;
  viewCubeDefs?: SemanticCubeDefinition[];
  onToggleViewMember?: (joinPath: string, memberName: string) => void;
  onClearFocus?: () => void;
}

export const SemanticUnifiedCanvas = forwardRef<SemanticUnifiedCanvasHandle, SemanticUnifiedCanvasProps>(
  function SemanticUnifiedCanvas(
    {
      tab,
      cubes,
      views,
      layout,
      canWrite,
      focusCube,
      focusView,
      cubeEditorTab = 'visual',
      expandedCubeDraft,
      expandedCubeLayout,
      inspectorNodeId,
      onInspectorNodeId,
      onFocusCube,
      onFocusView,
      onOpenRelationships,
      onJoinCubes,
      viewDraft,
      viewCubeDefs,
      onToggleViewMember,
      onClearFocus,
    },
    ref
  ) {
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
    openTarget: { kind: 'cube' | 'view'; name: string } | null;
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
        if (focusCube || focusView) {
          onClearFocus?.();
          return;
        }
        setSelectedCards(new Set());
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusCube, focusView, onClearFocus]);

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
  const baseBounds = useMemo(
    () => computeWorkspaceBounds(localLayout, cubeNames, viewNames),
    [localLayout, cubeNames, viewNames]
  );

  const canvasLayer: CubeCanvasLayer = cubeEditorTab;

  const expandedMemberPositions = useMemo(() => {
    if (!focusCube || !expandedCubeDraft || canvasLayer !== 'visual') return {};
    const cubePos = localLayout.cubes[focusCube] ?? { x: 48, y: 48 };
    return computeExpandedMemberPositions(cubePos, expandedCubeDraft);
  }, [canvasLayer, expandedCubeDraft, focusCube, localLayout.cubes]);

  const joinTargetNames = useMemo(() => {
    if (!expandedCubeDraft || canvasLayer !== 'relationships') return new Set<string>();
    return new Set((expandedCubeDraft.joins ?? []).map((join) => join.targetCube));
  }, [canvasLayer, expandedCubeDraft]);

  const auxNodes = useMemo(() => {
    if (!expandedCubeDraft || !focusCube || canvasLayer === 'visual' || canvasLayer === 'relationships') {
      return [] as CanvasAuxNode[];
    }
    return buildCanvasAuxNodes(expandedCubeDraft, canvasLayer);
  }, [canvasLayer, expandedCubeDraft, focusCube]);

  const auxPositions = useMemo(() => {
    if (!focusCube || auxNodes.length === 0) return {};
    const cubePos = localLayout.cubes[focusCube] ?? { x: 48, y: 48 };
    return computeAuxNodePositions(cubePos, auxNodes);
  }, [auxNodes, focusCube, localLayout.cubes]);

  const bounds = useMemo(() => {
    if (!focusCube || !expandedCubeDraft) return baseBounds;

    const cubePos = localLayout.cubes[focusCube] ?? { x: 48, y: 48 };
    const layerBox = computeLayerBounds(
      cubePos,
      expandedCubeDraft,
      canvasLayer,
      localLayout.cubes,
      canvasLayer === 'visual' ? expandedMemberPositions : auxPositions
    );

    const pad = 0;
    return {
      originX: layerBox.minX - pad,
      originY: layerBox.minY - pad,
      width: layerBox.maxX - layerBox.minX + pad * 2,
      height: layerBox.maxY - layerBox.minY + pad * 2,
    };
  }, [
    auxPositions,
    baseBounds,
    canvasLayer,
    expandedCubeDraft,
    expandedMemberPositions,
    focusCube,
    localLayout.cubes,
  ]);

  const centerTourTarget = useCallback(async (selector: string) => {
    const canvas = canvasRef.current;
    const target = canvas?.querySelector(selector) ?? document.querySelector(selector);
    if (!(target instanceof HTMLElement) || !canvas) {
      target?.scrollIntoView({ block: 'center', inline: 'nearest' });
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const deltaX = canvasRect.left + canvasRect.width / 2 - (targetRect.left + targetRect.width / 2);
    const deltaY = canvasRect.top + canvasRect.height / 2 - (targetRect.top + targetRect.height / 2);
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      setPan((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    }
  }, []);

  useImperativeHandle(ref, () => ({ centerTourTarget }), [centerTourTarget]);

  const lastAutoFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusCube || !expandedCubeDraft) {
      lastAutoFocusRef.current = null;
      return;
    }
    const focusKey = `${focusCube}:${canvasLayer}`;
    if (lastAutoFocusRef.current === focusKey) return;
    lastAutoFocusRef.current = focusKey;
    const cubePos = localLayout.cubes[focusCube];
    if (!cubePos) return;
    const box = computeLayerBounds(
      cubePos,
      expandedCubeDraft,
      canvasLayer,
      localLayout.cubes,
      canvasLayer === 'visual' ? expandedMemberPositions : auxPositions
    );
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const contentW = box.maxX - box.minX;
    const contentH = box.maxY - box.minY;
    const fitZoom = clampZoom(Math.min(rect.width / contentW, rect.height / contentH, 1) * 0.9);
    const centerX = (box.minX + box.maxX) / 2 - bounds.originX;
    const centerY = (box.minY + box.maxY) / 2 - bounds.originY;
    setZoom(fitZoom);
    setPan({
      x: rect.width / 2 - centerX * fitZoom,
      y: rect.height / 2 - centerY * fitZoom,
    });
  }, [
    auxPositions,
    bounds.originX,
    bounds.originY,
    canvasLayer,
    expandedCubeDraft,
    expandedMemberPositions,
    focusCube,
    localLayout.cubes,
  ]);

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

  const memberEdges = useMemo(() => {
    if (!focusCube || !expandedCubeDraft || canvasLayer !== 'visual') return [];
    const cubePos = localLayout.cubes[focusCube] ?? { x: 48, y: 48 };
    const fromX = cubePos.x - bounds.originX + CARD_W;
    const fromY = cubePos.y - bounds.originY + CARD_H / 2;
    return Object.entries(expandedMemberPositions).map(([id, pos]) => {
      const toX = pos.x - bounds.originX;
      const toY = pos.y - bounds.originY + MEMBER_CHIP_H / 2;
      return {
        id,
        d: `M ${fromX} ${fromY} C ${fromX + 36} ${fromY}, ${toX - 36} ${toY}, ${toX} ${toY}`,
      };
    });
  }, [bounds.originX, bounds.originY, canvasLayer, expandedCubeDraft, expandedMemberPositions, focusCube, localLayout.cubes]);

  const auxEdges = useMemo(() => {
    if (!focusCube || auxNodes.length === 0) return [];
    const cubePos = localLayout.cubes[focusCube] ?? { x: 48, y: 48 };
    const fromX = cubePos.x - bounds.originX + CARD_W;
    const fromY = cubePos.y - bounds.originY + CARD_H / 2;
    return auxNodes
      .map((node) => {
        const pos = auxPositions[node.id];
        if (!pos) return null;
        const toX = pos.x - bounds.originX;
        const toY = pos.y - bounds.originY + MEMBER_CHIP_H / 2;
        return {
          id: node.id,
          d: `M ${fromX} ${fromY} C ${fromX + 36} ${fromY}, ${toX - 36} ${toY}, ${toX} ${toY}`,
        };
      })
      .filter((edge): edge is { id: string; d: string } => edge !== null);
  }, [auxNodes, auxPositions, bounds.originX, bounds.originY, focusCube, localLayout.cubes]);

  const focusJoinEdges = useMemo(() => {
    if (!focusCube || !expandedCubeDraft || canvasLayer !== 'relationships') return [];
    const from = localLayout.cubes[focusCube];
    if (!from) return [];

    return (expandedCubeDraft.joins ?? [])
      .map((join) => {
        const to = localLayout.cubes[join.targetCube];
        if (!to) return null;
        const x1 = from.x - bounds.originX + CARD_W;
        const y1 = from.y - bounds.originY + CARD_H / 2;
        const x2 = to.x - bounds.originX;
        const y2 = to.y - bounds.originY + CARD_H / 2;
        return {
          id: join.id,
          d: `M ${x1} ${y1} C ${x1 + 48} ${y1}, ${x2 - 48} ${y2}, ${x2} ${y2}`,
        };
      })
      .filter((edge): edge is { id: string; d: string } => edge !== null);
  }, [bounds.originX, bounds.originY, canvasLayer, expandedCubeDraft, focusCube, localLayout.cubes]);

  const viewEdges = useMemo(() => {
    if (!focusView || !viewDraft) return [];
    const viewPos = localLayout.views[focusView];
    if (!viewPos) return [];
    const toX = viewPos.x - bounds.originX;
    const toY = viewPos.y - bounds.originY + CARD_H / 2;
    const seen = new Set<string>();
    const edges: Array<{ id: string; d: string }> = [];
    for (const cubePath of viewDraft.cubes) {
      const cubeName = cubePath.joinPath.split('.')[0] ?? '';
      if (!cubeName || seen.has(cubeName)) continue;
      seen.add(cubeName);
      const cubePos = localLayout.cubes[cubeName];
      if (!cubePos) continue;
      const fromX = cubePos.x - bounds.originX + CARD_W;
      const fromY = cubePos.y - bounds.originY + CARD_H / 2;
      edges.push({
        id: `${cubeName}->${focusView}`,
        d: `M ${fromX} ${fromY} C ${fromX + 48} ${fromY}, ${toX - 48} ${toY}, ${toX} ${toY}`,
      });
    }
    return edges;
  }, [bounds.originX, bounds.originY, focusView, localLayout.cubes, localLayout.views, viewDraft]);

  const participatingCubeNames = useMemo(() => {
    if (!viewDraft) return new Set<string>();
    return new Set(
      viewDraft.cubes
        .map((item) => item.joinPath.split('.')[0] ?? '')
        .filter((name) => name.length > 0)
    );
  }, [viewDraft]);

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
    if (target.closest('.workspace-card') || target.closest('.workspace-member')) return;

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
      if (!drag.moved && drag.openTarget && !drag.selectionOnly && !skipOpenRef.current) {
        openCardTarget(drag.openTarget);
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
    openTarget: { kind: 'cube' | 'view'; name: string },
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
      openTarget: selectionOnly ? null : openTarget,
      selectionOnly,
    };

    if (canWrite) {
      setDraggingKeys(new Set(moveKeys));
    }

    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const openCardTarget = (target: { kind: 'cube' | 'view'; name: string }) => {
    setContextMenu(null);
    if (target.kind === 'cube') {
      if (
        focusCube &&
        canvasLayer === 'relationships' &&
        joinTargetNames.has(target.name) &&
        expandedCubeDraft
      ) {
        const joinId = joinIdForTargetCube(expandedCubeDraft, target.name);
        if (joinId) {
          onInspectorNodeId?.(joinId);
          return;
        }
      }
      onFocusCube(target.name);
      onInspectorNodeId?.(semanticCubeNodeId(target.name));
    } else {
      onFocusView(target.name);
    }
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

  const cardPointerProps = (
    key: WorkspaceCardKey,
    openTarget: { kind: 'cube' | 'view'; name: string }
  ) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => beginCardPointer(key, openTarget, event),
    onContextMenu: (event: MouseEvent<HTMLElement>) => handleCardContextMenu(key, event),
  });

  const contextMenuActions = useMemo(() => {
    if (!contextMenu) return null;

    const { keys, anchorKey } = contextMenu;
    const { kind: anchorKind, name: anchorName } = parseWorkspaceCardKey(anchorKey);
    const selectedCubeNames = [...keys]
      .filter((key) => key.startsWith('cube:'))
      .map((key) => parseWorkspaceCardKey(key).name);

    return {
      anchorKind,
      anchorName,
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
  const contextMenuPosition = useFixedMenuPosition(
    contextMenu?.x ?? 0,
    contextMenu?.y ?? 0,
    Boolean(contextMenu)
  );

  return (
    <div className="semantic-workspace">
      <div className={cn('node-canvas-wrap', canWrite && 'node-canvas-wrap--writable')}>
        <div className="node-canvas-mobile">
          <Monitor className="size-5 shrink-0" strokeWidth={1.75} />
          <span>
            ЛКМ — выбрать · Куб — показатели и разрезы на графе · Инспектор справа
          </span>
        </div>

        <div className="node-canvas-toolbar">
          <div className="relative min-w-[180px] max-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8"
              placeholder={tab === 'cubes' ? 'Поиск кубов…' : 'Поиск представлений…'}
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
            <svg className="node-edges" aria-hidden="true" width={bounds.width} height={bounds.height}>
              {tab === 'cubes' && !focusCube
                ? joinEdges.map((edge) => <path key={edge.id} d={edge.d} />)
                : null}
              {focusJoinEdges.map((edge) => (
                <path
                  key={edge.id}
                  d={edge.d}
                  className={cn('is-join-edge', inspectorNodeId === edge.id && 'is-active')}
                />
              ))}
              {memberEdges.map((edge) => (
                <path key={edge.id} d={edge.d} className="is-member-edge" />
              ))}
              {auxEdges.map((edge) => (
                <path key={edge.id} d={edge.d} className="is-aux-edge" />
              ))}
              {focusView
                ? viewEdges.map((edge) => <path key={edge.id} d={edge.d} className="is-view-edge" />)
                : null}
            </svg>

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
                  const openTarget = { kind: 'cube' as const, name: cube.name };
                  const pos = localLayout.cubes[cube.name] ?? { x: 48, y: 48 };
                  const stagePos = toStagePos(pos.x, pos.y);
                  const isFocused = focusCube === cube.name;
                  const isRelatedCube = joinTargetNames.has(cube.name);
                  const activeJoinId =
                    inspectorNodeId?.startsWith('join:') &&
                    expandedCubeDraft?.joins?.some(
                      (join) => join.id === inspectorNodeId && join.targetCube === cube.name
                    );
                  const isViewParticipant =
                    Boolean(focusView) && participatingCubeNames.has(cube.name);
                  const isDimmed =
                    (Boolean(focusCube) &&
                      !isFocused &&
                      !(canvasLayer === 'relationships' && isRelatedCube)) ||
                    (Boolean(focusView) && !isViewParticipant);

                  return (
                    <article
                      key={cube.name}
                      data-tour={isFocused ? 'cube-cube' : undefined}
                      className={cn(
                        'workspace-card workspace-card--cube',
                        canWrite && 'is-draggable',
                        selectedCards.has(key) && 'is-canvas-selected',
                        isFocused && 'is-workspace-active',
                        isRelatedCube && canvasLayer === 'relationships' && 'is-workspace-linked',
                        activeJoinId && 'is-workspace-active',
                        isDimmed && 'is-workspace-dimmed',
                        draggingKeys.has(key) && 'is-dragging'
                      )}
                      style={stagePos}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          openCardTarget(openTarget);
                        }
                      }}
                      {...cardPointerProps(key, openTarget)}
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
                  const openTarget = { kind: 'view' as const, name: view.name };
                  const pos = localLayout.views[view.name] ?? { x: 48, y: 400 };
                  const stagePos = toStagePos(pos.x, pos.y);
                  const isFocused = focusView === view.name;
                  const isDimmed = Boolean(focusView && focusView !== view.name);

                  return (
                    <article
                      key={view.name}
                      className={cn(
                        'workspace-card workspace-card--view',
                        canWrite && 'is-draggable',
                        selectedCards.has(key) && 'is-canvas-selected',
                        isFocused && 'is-workspace-active',
                        isDimmed && 'is-workspace-dimmed',
                        draggingKeys.has(key) && 'is-dragging'
                      )}
                      style={stagePos}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          openCardTarget(openTarget);
                        }
                      }}
                      {...cardPointerProps(key, openTarget)}
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
                        {view.cubePathCount} путей · {view.memberCount} полей
                      </p>
                    </article>
                  );
                })
              : null}

            {tab === 'views' && focusView
              ? filteredCubes
                  .filter((cube) => participatingCubeNames.has(cube.name))
                  .map((cube) => {
                    const key = workspaceCardKey('cube', cube.name);
                    const pos = localLayout.cubes[cube.name] ?? { x: 48, y: 48 };
                    const stagePos = toStagePos(pos.x, pos.y);
                    return (
                      <article
                        key={`view-cube-${cube.name}`}
                        className={cn(
                          'workspace-card workspace-card--cube workspace-card--view-linked',
                          canWrite && 'is-draggable',
                          draggingKeys.has(key) && 'is-dragging'
                        )}
                        style={stagePos}
                        {...cardPointerProps(key, { kind: 'cube', name: cube.name })}
                      >
                        <header className="workspace-card__head">
                          <span className="workspace-card__icon">
                            <Box size={14} />
                          </span>
                          <div>
                            <h3 className="workspace-card__title">{semanticCubeLabel(cube)}</h3>
                            <p className="workspace-card__meta">Куб в представлении</p>
                          </div>
                        </header>
                      </article>
                    );
                  })
              : null}

            {focusCube && expandedCubeDraft && canvasLayer === 'visual' ? (
              <>
                {(() => {
                  const cubePos = localLayout.cubes[focusCube] ?? { x: 48, y: 48 };
                  const measureLabelPos = toStagePos(
                    cubePos.x + CARD_W + MEMBER_OFFSET_X,
                    cubePos.y
                  );
                  const dimLabelPos = toStagePos(
                    cubePos.x + CARD_W + MEMBER_OFFSET_X + MEMBER_CHIP_W + MEMBER_COLUMN_GAP,
                    cubePos.y
                  );
                  return (
                    <>
                      <div className="workspace-member-col-label" style={measureLabelPos}>
                        Показатели
                      </div>
                      <div className="workspace-member-col-label" style={dimLabelPos}>
                        Разрезы
                      </div>
                    </>
                  );
                })()}
                {expandedCubeDraft.measures.map((measure, measureIndex) => {
                  const pos = expandedMemberPositions[measure.id];
                  if (!pos) return null;
                  const stagePos = toStagePos(pos.x, pos.y);
                  return (
                    <article
                      key={measure.id}
                      data-tour={measureIndex === 0 ? 'cube-measure' : undefined}
                      className={cn(
                        'workspace-member workspace-member--measure',
                        inspectorNodeId === measure.id && 'is-workspace-active'
                      )}
                      style={stagePos}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        onInspectorNodeId?.(measure.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          onInspectorNodeId?.(measure.id);
                        }
                      }}
                    >
                      <Hash size={12} />
                      <span>{semanticMemberLabel(measure)}</span>
                    </article>
                  );
                })}
                {expandedCubeDraft.dimensions.map((dimension) => {
                  const pos = expandedMemberPositions[dimension.id];
                  if (!pos) return null;
                  const stagePos = toStagePos(pos.x, pos.y);
                  return (
                    <article
                      key={dimension.id}
                      className={cn(
                        'workspace-member workspace-member--dimension',
                        inspectorNodeId === dimension.id && 'is-workspace-active'
                      )}
                      style={stagePos}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        onInspectorNodeId?.(dimension.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          onInspectorNodeId?.(dimension.id);
                        }
                      }}
                    >
                      <Text size={12} />
                      <span>{semanticMemberLabel(dimension)}</span>
                    </article>
                  );
                })}
              </>
            ) : null}

            {focusCube && expandedCubeDraft && canvasLayer === 'relationships' && focusJoinEdges.length === 0 ? (
              <div
                className="workspace-canvas-hint"
                style={toStagePos(
                  (localLayout.cubes[focusCube]?.x ?? 48) + CARD_W + MEMBER_OFFSET_X,
                  (localLayout.cubes[focusCube]?.y ?? 48) + MEMBER_HEADER_H
                )}
              >
                Нет связей — добавьте в панели справа
              </div>
            ) : null}

            {focusCube &&
            expandedCubeDraft &&
            (canvasLayer === 'segments' ||
              canvasLayer === 'hierarchies' ||
              canvasLayer === 'rollups') &&
            auxNodes.length === 0 ? (
              <div
                className="workspace-canvas-hint"
                style={toStagePos(
                  (localLayout.cubes[focusCube]?.x ?? 48) + CARD_W + MEMBER_OFFSET_X,
                  (localLayout.cubes[focusCube]?.y ?? 48) + MEMBER_HEADER_H
                )}
              >
                {canvasLayer === 'segments'
                  ? 'Нет сегментов — добавьте в панели справа'
                  : canvasLayer === 'hierarchies'
                    ? 'Нет иерархий — добавьте в панели справа'
                    : 'Нет предагрегаций — добавьте в панели справа'}
              </div>
            ) : null}

            {focusCube && expandedCubeDraft && auxNodes.length > 0 ? (
              <>
                {canvasLayer !== 'yaml' ? (
                  <div
                    className="workspace-member-col-label"
                    style={toStagePos(
                      (localLayout.cubes[focusCube]?.x ?? 48) + CARD_W + MEMBER_OFFSET_X,
                      (localLayout.cubes[focusCube]?.y ?? 48)
                    )}
                  >
                    {CANVAS_LAYER_COLUMN_LABELS[canvasLayer as keyof typeof CANVAS_LAYER_COLUMN_LABELS]}
                  </div>
                ) : null}
                {auxNodes.map((node) => {
                  const pos = auxPositions[node.id];
                  if (!pos) return null;
                  const stagePos = toStagePos(pos.x, pos.y);
                  const Icon = auxNodeIcon(node.kind);
                  return (
                    <article
                      key={node.id}
                      className={cn(
                        'workspace-member',
                        `workspace-member--${node.kind}`,
                        inspectorNodeId === node.id && 'is-workspace-active'
                      )}
                      style={stagePos}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        onInspectorNodeId?.(node.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          onInspectorNodeId?.(node.id);
                        }
                      }}
                    >
                      <Icon size={12} />
                      <span className="workspace-member__stack">
                        <span className="workspace-member__label">{node.label}</span>
                        {node.subtitle ? (
                          <small className="workspace-member__meta">{node.subtitle}</small>
                        ) : null}
                      </span>
                    </article>
                  );
                })}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {contextMenu && contextMenuActions ? (
        <div
          ref={contextMenuPosition.ref}
          className="workspace-context-menu"
          style={contextMenuPosition.position}
          role="menu"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="workspace-context-menu__item"
            role="menuitem"
            onClick={() =>
              openCardTarget({
                kind: contextMenuActions.anchorKind,
                name: contextMenuActions.anchorName,
              })
            }
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
                onOpenRelationships?.(contextMenuActions.anchorName);
              }}
            >
              Создать связь…
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
});

export { SemanticUnifiedCanvas as SemanticWorkspaceCanvas };
