import { useEffect, useState } from 'react';

interface UseOfficiatingGuardsOptions {
  isClockRunning: boolean;
  hasOpenModal: boolean;
  onUndo: () => void | Promise<void>;
}

export function useOfficiatingGuards({
  isClockRunning,
  hasOpenModal,
  onUndo,
}: UseOfficiatingGuardsOptions) {
  const [showHotkeys, setShowHotkeys] = useState(false);

  // Screen Wake Lock (keeps table device awake)
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const requestLock = async () => {
      if (released || !('wakeLock' in navigator)) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Ignore if battery saver or browser blocks wake lock
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void requestLock();
      }
    };

    void requestLock();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      void sentinel?.release();
    };
  }, []);

  // Prevent accidental refresh/tab close while clock is running
  useEffect(() => {
    if (!isClockRunning) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isClockRunning]);

  // Ctrl+Z / Cmd+Z Undo & '?' Hotkey Cheat-Sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if (isTyping) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (hasOpenModal || showHotkeys) return;
        e.preventDefault();
        void onUndo();
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (hasOpenModal && !showHotkeys) return;
        e.preventDefault();
        setShowHotkeys((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasOpenModal, showHotkeys, onUndo]);

  return { showHotkeys, setShowHotkeys };
}