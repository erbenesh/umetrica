import type { SemanticCubeEditorTab } from '@/components/semantic/semantic-cube-editor-header';
import { driver } from 'driver.js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { markSemanticCubeOnboardingSeen, readSemanticCubeOnboardingSeen } from '@/lib/semantic-guide';
import { buildSemanticCubeTourSteps, type SemanticCubeTourRuntime } from '@/lib/semantic-cube-tour-steps';

import 'driver.js/dist/driver.css';

interface UseSemanticCubeTourOptions {
  ready: boolean;
  editorTab: SemanticCubeEditorTab;
  runtime: SemanticCubeTourRuntime;
  onTourStart?: () => void;
  onTourEnd?: () => void;
}

export function useSemanticCubeTour({
  ready,
  editorTab,
  runtime,
  onTourStart,
  onTourEnd,
}: UseSemanticCubeTourOptions) {
  const [tourActive, setTourActive] = useState(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const autoStartedRef = useRef(false);
  const pendingStartRef = useRef(false);
  const runtimeRef = useRef(runtime);

  runtimeRef.current = runtime;

  const destroyTour = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
    setTourActive(false);
  }, []);

  const runTour = useCallback(() => {
    destroyTour();
    onTourStart?.();
    setTourActive(true);

    const driverObj = driver({
      showProgress: true,
      progressText: '{{current}} из {{total}}',
      nextBtnText: 'Далее',
      prevBtnText: 'Назад',
      doneBtnText: 'Готово',
      popoverClass: 'sellerpool-tour',
      steps: buildSemanticCubeTourSteps(runtimeRef.current),
      onDestroyed: () => {
        driverRef.current = null;
        setTourActive(false);
        onTourEnd?.();
        markSemanticCubeOnboardingSeen();
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();
  }, [destroyTour, onTourEnd, onTourStart]);

  const startTour = useCallback(() => {
    if (editorTab !== 'visual') {
      pendingStartRef.current = true;
      runtimeRef.current.switchTab('visual');
      return;
    }

    window.requestAnimationFrame(() => {
      window.setTimeout(() => runTour(), 80);
    });
  }, [editorTab, runTour]);

  useEffect(() => {
    if (!pendingStartRef.current || editorTab !== 'visual' || !ready) return;
    pendingStartRef.current = false;
    window.requestAnimationFrame(() => {
      window.setTimeout(() => runTour(), 80);
    });
  }, [editorTab, ready, runTour]);

  useEffect(() => {
    if (!ready || autoStartedRef.current || readSemanticCubeOnboardingSeen() || editorTab !== 'visual') {
      return;
    }

    autoStartedRef.current = true;
    const timer = window.setTimeout(() => startTour(), 500);
    return () => window.clearTimeout(timer);
  }, [ready, editorTab, startTour]);

  useEffect(() => () => destroyTour(), [destroyTour]);

  return { tourActive, startTour };
}
