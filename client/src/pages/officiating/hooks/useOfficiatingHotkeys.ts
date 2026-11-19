import { useEffect } from 'react';
import type { Game } from '../../../types';
import type { StatActionSpec } from '../components/PlayerPickerModal';

interface UseOfficiatingHotkeysOptions {
  anyModalOpen: boolean;
  liveGame: Game | undefined;
  operatorMode: boolean;
  toggleGameClock: () => void;
  toggleShotClock: () => void;
  resetShotClock: (seconds: 24 | 14) => void;
  triggerStatAction: (spec: StatActionSpec) => void;
  togglePossession: (side: 'left' | 'right') => void;
}

export function useOfficiatingHotkeys({
  anyModalOpen,
  liveGame,
  toggleGameClock,
  toggleShotClock,
  resetShotClock,
  triggerStatAction,
  togglePossession,
}: UseOfficiatingHotkeysOptions) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!liveGame || anyModalOpen || e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (e.shiftKey) {
          toggleGameClock();
        } else {
          toggleShotClock();
        }
        return;
      }

      switch (e.key) {
        case '9':
          e.preventDefault();
          resetShotClock(24);
          break;
        case '0':
          e.preventDefault();
          resetShotClock(14);
          break;
        case '1':
          e.preventDefault();
          triggerStatAction({ kind: 'pts', pts: 1 });
          break;
        case '2':
          e.preventDefault();
          triggerStatAction({ kind: 'pts', pts: 2 });
          break;
        case '3':
          e.preventDefault();
          triggerStatAction({ kind: 'pts', pts: 3 });
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          triggerStatAction({ kind: 'foul' });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          togglePossession('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          togglePossession('right');
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    anyModalOpen,
    liveGame,
    toggleGameClock,
    toggleShotClock,
    resetShotClock,
    triggerStatAction,
    togglePossession,
  ]);
}