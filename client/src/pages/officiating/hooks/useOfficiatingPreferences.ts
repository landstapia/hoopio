import { useCallback, useEffect, useState } from 'react';

export type SectionKey = 'score' | 'time' | 'game' | 'stats' | 'log';
export type OperatorSection = 'score' | 'time' | 'game';

const ALL_SECTIONS: Record<SectionKey, boolean> = {
  score: true,
  time: true,
  game: true,
  stats: true,
  log: true,
};

const BUZZ_STORAGE_KEY = 'hoopio_buzz_here';

export function useOfficiatingPreferences() {
  const [operatorMode, setOperatorMode] = useState(false);
  const [operatorSection, setOperatorSection] = useState<OperatorSection>('time');

  const [buzzHere, setBuzzHereState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(BUZZ_STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [visibleSections, setVisibleSections] = useState<Record<SectionKey, boolean>>(ALL_SECTIONS);

  const setBuzzHere = useCallback((value: boolean) => {
    setBuzzHereState(value);
    try {
      localStorage.setItem(BUZZ_STORAGE_KEY, String(value));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Hide top <header> and <nav> while Operator Mode is active
  useEffect(() => {
    document.documentElement.classList.toggle('operator-mode', operatorMode);
    const navElements = document.querySelectorAll<HTMLElement>('header, nav');

    navElements.forEach((el) => {
      if (el.closest('[role="dialog"]')) return;
      el.style.display = operatorMode ? 'none' : '';
    });

    return () => {
      document.documentElement.classList.remove('operator-mode');
      document.querySelectorAll<HTMLElement>('header, nav').forEach((el) => {
        el.style.display = '';
      });
    };
  }, [operatorMode]);

  // Exit Operator Mode automatically if the user presses Escape to leave fullscreen
  useEffect(() => {
    let wasFullscreen = Boolean(document.fullscreenElement);

    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      if (wasFullscreen && !isFullscreen) {
        setOperatorMode(false);
      }
      wasFullscreen = isFullscreen;
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const toggleOperatorMode = useCallback(() => {
    setOperatorMode((prev) => {
      const next = !prev;
      if (next) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      return next;
    });
  }, []);

  const isAllSelected =
    visibleSections.score &&
    visibleSections.time &&
    visibleSections.game &&
    visibleSections.stats &&
    visibleSections.log;

  const toggleSection = useCallback(
    (key: SectionKey) => {
      setVisibleSections((prev) => {
        if (isAllSelected) {
          return {
            score: key === 'score',
            time: key === 'time',
            game: key === 'game',
            stats: key === 'stats',
            log: key === 'log',
          };
        }
        const next = { ...prev, [key]: !prev[key] };
        const anySelected = Object.values(next).some(Boolean);
        return anySelected ? next : ALL_SECTIONS;
      });
    },
    [isAllSelected]
  );

  const selectAllSections = useCallback(() => {
    setVisibleSections(ALL_SECTIONS);
  }, []);

  return {
    operatorMode,
    toggleOperatorMode,
    operatorSection,
    setOperatorSection,
    buzzHere,
    setBuzzHere,
    visibleSections,
    toggleSection,
    isAllSelected,
    selectAllSections,
    showScore: operatorMode ? operatorSection === 'score' : visibleSections.score,
    showTime: operatorMode ? operatorSection === 'time' : visibleSections.time,
    showGame: operatorMode ? operatorSection === 'game' : visibleSections.game,
    showStats: !operatorMode && visibleSections.stats,
    showLog: !operatorMode && visibleSections.log,
  };
}