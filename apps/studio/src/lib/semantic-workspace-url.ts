import type { SemanticCubeEditorTab } from '@/components/semantic/semantic-cube-editor-header';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const CUBE_TABS: SemanticCubeEditorTab[] = [
  'visual',
  'relationships',
  'segments',
  'hierarchies',
  'rollups',
  'yaml',
];

function parseCubeTab(value: string | null): SemanticCubeEditorTab {
  if (value && CUBE_TABS.includes(value as SemanticCubeEditorTab)) {
    return value as SemanticCubeEditorTab;
  }
  return 'visual';
}

export function useSemanticWorkspaceUrl() {
  const [searchParams, setSearchParams] = useSearchParams();

  const cube = searchParams.get('cube') ?? undefined;
  const view = searchParams.get('view') ?? undefined;
  const tab = parseCubeTab(searchParams.get('tab'));
  const joinTarget = searchParams.get('joinTarget') ?? undefined;

  const patchParams = useCallback(
    (patch: (params: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          patch(next);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setCube = useCallback(
    (name: string, options?: { tab?: SemanticCubeEditorTab; joinTarget?: string }) => {
      patchParams((params) => {
        params.set('cube', name);
        params.delete('view');
        if (options?.tab) params.set('tab', options.tab);
        else if (!params.get('tab')) params.set('tab', 'visual');
        if (options?.joinTarget) params.set('joinTarget', options.joinTarget);
        else params.delete('joinTarget');
      });
    },
    [patchParams]
  );

  const setView = useCallback(
    (name: string) => {
      patchParams((params) => {
        params.set('view', name);
        params.delete('cube');
        params.delete('tab');
        params.delete('joinTarget');
      });
    },
    [patchParams]
  );

  const setTab = useCallback(
    (nextTab: SemanticCubeEditorTab) => {
      patchParams((params) => {
        params.set('tab', nextTab);
        if (nextTab !== 'relationships') params.delete('joinTarget');
      });
    },
    [patchParams]
  );

  const clearFocus = useCallback(() => {
    patchParams((params) => {
      params.delete('cube');
      params.delete('view');
      params.delete('tab');
      params.delete('joinTarget');
    });
  }, [patchParams]);

  const workspaceTab = useMemo<'cubes' | 'views'>(() => (view ? 'views' : 'cubes'), [view]);

  return {
    cube,
    view,
    tab,
    joinTarget,
    workspaceTab,
    setCube,
    setView,
    setTab,
    clearFocus,
    isFocused: Boolean(cube || view),
  };
}
