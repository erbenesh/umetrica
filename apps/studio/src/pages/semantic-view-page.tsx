import type { SemanticViewDefinition } from '@sellerpool/core';
import { listJoinPathsForCube } from '@sellerpool/core';
import { ChevronRight, Loader2, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { MobilePageHeader } from '@/components/layout/mobile-page-header';
import { SemanticViewPublishDialog } from '@/components/semantic/semantic-view-publish-dialog';
import { SemanticViewYamlPanel } from '@/components/semantic/semantic-view-yaml-panel';
import { DocCallout } from '@/components/doc/doc-callout';
import { Button } from '@/components/ui/button';
import {
  useCubeJoinContext,
  useDiscardSemanticViewDraft,
  useSemanticView,
  useUpdateSemanticViewDraft,
} from '@/hooks/use-semantic';
import { useCanWriteDashboards } from '@/hooks/use-me';

type EditorTab = 'members' | 'yaml';

export function SemanticViewPage() {
  const { viewName = '' } = useParams<{ viewName: string }>();
  const canWrite = useCanWriteDashboards();
  const { data: view, isLoading, error } = useSemanticView(viewName);
  const { data: joinContext } = useCubeJoinContext();
  const updateDraft = useUpdateSemanticViewDraft(viewName);
  const discardDraft = useDiscardSemanticViewDraft(viewName);

  const [draft, setDraft] = useState<SemanticViewDefinition | null>(null);
  const [tab, setTab] = useState<EditorTab>('members');
  const [publishOpen, setPublishOpen] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!view) return;
    setDraft(view.draft);
  }, [view]);

  const cubeDefs = joinContext?.cubes ?? [];

  const joinPaths = useMemo(() => {
    const base = draft?.cubes[0]?.joinPath;
    if (!base) return [];
    return listJoinPathsForCube(base, cubeDefs);
  }, [draft?.cubes, cubeDefs]);

  const scheduleSave = useCallback(
    (nextDraft: SemanticViewDefinition) => {
      if (!canWrite) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        updateDraft.mutate({ draft: nextDraft });
      }, 700);
    },
    [canWrite, updateDraft]
  );

  const toggleMember = (joinPath: string, memberName: string) => {
    if (!draft) return;
    const nextDraft: SemanticViewDefinition = {
      ...draft,
      cubes: draft.cubes.map((cube) => {
        if (cube.joinPath !== joinPath) return cube;
        const has = cube.includes.includes(memberName);
        return {
          ...cube,
          includes: has
            ? cube.includes.filter((item) => item !== memberName)
            : [...cube.includes, memberName],
        };
      }),
    };
    setDraft(nextDraft);
    scheduleSave(nextDraft);
  };

  const addJoinPath = (joinPath: string) => {
    if (!draft) return;
    if (draft.cubes.some((cube) => cube.joinPath === joinPath)) return;
    const nextDraft = {
      ...draft,
      cubes: [...draft.cubes, { joinPath, includes: [] }],
    };
    setDraft(nextDraft);
    scheduleSave(nextDraft);
  };

  if (isLoading) {
    return (
      <div className="app-page flex items-center justify-center p-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Загрузка view...
      </div>
    );
  }

  if (error || !view || !draft) {
    return <Navigate to="/semantic" replace />;
  }

  return (
    <div className="app-page">
      <MobilePageHeader
        title={view.name}
        back={{ to: '/semantic', label: 'Семантика' }}
        actions={
          canWrite ? (
            <Button
              size="sm"
              type="button"
              onClick={() => setPublishOpen(true)}
            >
              Опубликовать
            </Button>
          ) : null
        }
      />

      <header className="editor-toolbar">
        <div className="editor-toolbar__crumb">
          <Link to="/semantic">Семантика</Link>
          <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={2} />
          <span>{view.name}</span>
        </div>
        <div className="editor-toolbar__actions">
          <div className="segmented segmented--dense">
            <button
              className={`segmented__btn ${tab === 'members' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setTab('members')}
            >
              Members
            </button>
            <button
              className={`segmented__btn ${tab === 'yaml' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setTab('yaml')}
            >
              YAML
            </button>
          </div>
          {canWrite ? (
            <>
              <Button variant="ghost" size="icon-sm" type="button" onClick={() => discardDraft.mutate()}>
                <Undo2 size={16} />
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setPublishOpen(true)}>
                Опубликовать
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {view.status === 'draft' ? (
        <DocCallout className="mx-4 mt-3">Черновик view — опубликуйте для использования в виджетах.</DocCallout>
      ) : null}

      {tab === 'yaml' ? (
        <SemanticViewYamlPanel viewName={viewName} canWrite={canWrite} />
      ) : (
        <div className="semantic-view-editor">
          <aside className="semantic-view-editor__paths">
            <h2>Join paths</h2>
            <ul className="m-0 list-none p-0">
              {draft.cubes.map((cube) => (
                <li key={cube.joinPath} className="semantic-view-editor__path">
                  {cube.joinPath}
                </li>
              ))}
            </ul>
            {canWrite ? (
              <select
                className="mt-3 flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) addJoinPath(event.target.value);
                  event.target.value = '';
                }}
              >
                <option value="">+ Добавить join path</option>
                {joinPaths
                  .filter((path) => !draft.cubes.some((cube) => cube.joinPath === path))
                  .map((path) => (
                    <option key={path} value={path}>
                      {path}
                    </option>
                  ))}
              </select>
            ) : null}
          </aside>

          <div className="semantic-view-editor__members">
            {draft.cubes.map((cubePath) => {
              const cubeDef = cubeDefs.find((item) => item.name === cubePath.joinPath.split('.')[0]);
              if (!cubeDef) {
                return (
                  <section key={cubePath.joinPath}>
                    <h3>{cubePath.joinPath}</h3>
                    <p className="text-sm text-muted-foreground">Куб не найден</p>
                  </section>
                );
              }

              const members = [
                ...cubeDef.measures.map((item) => ({
                  kind: 'measure',
                  name: item.name,
                  title: item.shortTitle ?? item.title,
                })),
                ...cubeDef.dimensions.map((item) => ({
                  kind: 'dimension',
                  name: item.name,
                  title: item.shortTitle ?? item.title,
                })),
              ];

              return (
                <section key={cubePath.joinPath} className="semantic-view-editor__section">
                  <h3>{cubePath.joinPath}</h3>
                  <ul className="semantic-view-editor__member-list">
                    {members.map((member) => {
                      const checked = cubePath.includes.includes(member.name);
                      return (
                        <li key={member.name}>
                          <label className="semantic-view-editor__member">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!canWrite}
                              onChange={() => toggleMember(cubePath.joinPath, member.name)}
                            />
                            <span>
                              {member.name}
                              <small>{member.kind}</small>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}
      <SemanticViewPublishDialog
        viewName={viewName}
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublished={() => setPublishOpen(false)}
      />
    </div>
  );
}
