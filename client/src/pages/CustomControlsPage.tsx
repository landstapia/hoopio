import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Maximize2,
  Minimize2,
  Settings,
  Volume2,
} from 'lucide-react';
import { useDb } from '../context/DbContext';
import { Buzzer, haptic } from '../lib/buzzer';
import { customSheet, fc, per, readable, secText, toText } from '../lib/format';
import { ModalShell } from '../shared/ModalShell';
import { CustomGearModal } from './custom/CustomGearModal';
import { BreakModal } from './officiating/components/BreakModal';
import { TimeoutPickerModal } from './officiating/components/TimeoutPickerModal';

const BUZZ_MS = 2500;
const LONG_BUZZ_MS = 3000;

export function CustomControlsPage() {
  const { db, patch } = useDb();

  const [buzzHere, setBuzzHere] = useState(() => localStorage.buzzHere === '1');
  const [gearOpen, setGearOpen] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toPickerSide, setToPickerSide] = useState<'a' | 'b' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const toHoldTimer = useRef<number | null>(null);
  const toHoldFired = useRef(false);
  const buzzHeldRef = useRef(false);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(id);
  }, [notice]);

  // Track browser fullscreen state
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore if fullscreen is blocked by browser
    }
  };

  // Sync optional local buzzer audio
  useEffect(() => {
    if (!db) return;
    const c = db.custom;
    const shouldSound = buzzHere && (c.buzzOn || c.buzzLeft > 0);
    const kind = !c.buzzOn && c.buzzKind === 'shot' ? 'shot' : 'game';
    Buzzer.sync(shouldSound, kind);
  }, [db, buzzHere]);

  // Keep screen awake while custom clock is running
  useEffect(() => {
    if (!db?.custom.running || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    navigator.wakeLock
      .request('screen')
      .then((sentinel) => {
        if (cancelled) {
          void sentinel.release();
        } else {
          lock = sentinel;
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (lock) void lock.release().catch(() => {});
    };
  }, [db?.custom.running]);

  // Warn before accidental page reload while clock is running
  useEffect(() => {
    if (!db?.custom.running) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [db?.custom.running]);

  const buzzStart = useCallback(() => {
    if (buzzHeldRef.current) return;
    buzzHeldRef.current = true;
    Buzzer.unlock();
    patch({ custom: { buzzOn: true }, log: 'Custom BUZZER pressed' });
  }, [patch]);

  const buzzStop = useCallback(() => {
    if (!buzzHeldRef.current) return;
    buzzHeldRef.current = false;
    patch({ custom: { buzzOn: false } });
  }, [patch]);

  // Stop held buzzer on pointer release or window blur anywhere
  useEffect(() => {
    window.addEventListener('pointerup', buzzStop);
    window.addEventListener('pointercancel', buzzStop);
    window.addEventListener('blur', buzzStop);
    return () => {
      window.removeEventListener('pointerup', buzzStop);
      window.removeEventListener('pointercancel', buzzStop);
      window.removeEventListener('blur', buzzStop);
      Buzzer.stop();
    };
  }, [buzzStop]);

  const toggleGameClock = useCallback(() => {
    if (!db) return;
    haptic();
    const nextRunning = !db.custom.running;
    patch({
      custom: { running: nextRunning },
      log: `Custom game clock ${nextRunning ? 'started' : 'paused'}`,
    });
  }, [db, patch]);

  const toggleShotClock = useCallback(() => {
    if (!db) return;
    haptic();
    const nextHold = !db.custom.shotHold;
    patch({
      custom: { shotHold: nextHold },
      log: `Custom shot clock ${nextHold ? 'paused' : 'started'}`,
    });
  }, [db, patch]);

  const resetShotClock = useCallback(
    (seconds: 24 | 14) => {
      haptic();
      patch({
        custom: { shot: seconds * 1000, shotOn: true },
        log: `Custom shot clock set to ${seconds}`,
      });
    },
    [patch],
  );

  const togglePossession = useCallback(
    (side: 'a' | 'b') => {
      if (!db) return;
      haptic();
      const nextArrow = db.custom.arrow === side ? null : side;
      patch({
        custom: { arrow: nextArrow },
        log: nextArrow ? `Custom possession: ${db.custom[side].name}` : 'Custom possession cleared',
      });
    },
    [db, patch],
  );

  // Keyboard shortcuts: Shift+Space (game clock), Space (shot clock), 9 (+24), 0 (+14), ArrowLeft/Right (possession), Backspace (buzzer), ? (help)
  useEffect(() => {
    const anyModalOpen = gearOpen || breakOpen || shortcutsOpen || toPickerSide !== null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || anyModalOpen || !db) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (!e.repeat) buzzStart();
        return;
      }

      if (e.repeat) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (el && el.tagName === 'BUTTON') el.blur();
        if (e.shiftKey) {
          toggleGameClock();
        } else {
          toggleShotClock();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const [leftSide] = customSheet(db.custom);
        togglePossession(leftSide);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const [, rightSide] = customSheet(db.custom);
        togglePossession(rightSide);
      } else if (e.key === '9') {
        e.preventDefault();
        resetShotClock(24);
      } else if (e.key === '0') {
        e.preventDefault();
        resetShotClock(14);
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        buzzStop();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    gearOpen,
    breakOpen,
    shortcutsOpen,
    toPickerSide,
    db,
    buzzStart,
    buzzStop,
    toggleGameClock,
    toggleShotClock,
    togglePossession,
    resetShotClock,
  ]);

  if (!db) {
    return <div className="p-4 text-sm text-[#8c9bc4]">Loading custom controls…</div>;
  }

  const c = db.custom;
  const sides = customSheet(c);

  const stepPeriod = async (dir: 1 | -1) => {
    const period = Math.max(1, c.period + dir);
    const len = period > 4 ? 300000 : c.periodLen;
    await patch({
      custom: {
        period,
        clock: len,
        running: false,
        shot: 24000,
        ...(period === 1 ? { a: { timeouts: 2 }, b: { timeouts: 2 } } : {}),
        ...(period === 3 ? { a: { timeouts: 3 }, b: { timeouts: 3 } } : {}),
        ...(period > 4 ? { a: { timeouts: 1 }, b: { timeouts: 1 } } : {}),
      },
      log: `Custom period set to ${per(period)}`,
    });
  };

  const adjustScore = (side: 'a' | 'b', delta: number) => {
    haptic();
    const nextScore = Math.max(0, c[side].score + delta);
    patch({
      custom: {
        [side]: { score: nextScore },
        ...(delta > 0 ? { shot: 24000 } : {}),
      },
      log: `Custom ${c[side].name}: ${delta > 0 ? `+${delta}` : delta} (${nextScore})`,
    });
  };

  const adjustFouls = (side: 'a' | 'b', delta: number) => {
    haptic();
    const nextFouls = Math.max(0, c[side].fouls + delta);
    patch({
      custom: { [side]: { fouls: nextFouls } },
      log: `Custom ${c[side].name} fouls: ${nextFouls}`,
    });
  };

  const adjustTimeouts = (side: 'a' | 'b', delta: number) => {
    haptic();
    const nextTo = Math.max(0, c[side].timeouts + delta);
    patch({
      custom: { [side]: { timeouts: nextTo } },
      log: `Custom ${c[side].name} timeouts: ${nextTo}`,
    });
  };

  const startTimeout = async (side: 'a' | 'b', secs = c.timeoutSecs || 30) => {
    const left = c[side].timeouts;
    if (!left) {
      showNotice(`No timeouts left for ${c[side].name}.`);
      return;
    }
    if (c.toKind) {
      showNotice('A timeout or break is already running.');
      return;
    }

    await patch({
      custom: {
        [side]: { timeouts: left - 1 },
        running: false,
        toKind: 'timeout',
        toTeam: side,
        toLeft: secs * 1000,
        toSuspended: false,
        buzzLeft: BUZZ_MS,
      },
      log: `Custom ${c[side].name} TIMEOUT ${secText(secs)} (${left - 1} left)`,
    });
  };

  const handleTeamTimeoutClick = async (side: 'a' | 'b') => {
    haptic();
    if (c.toKind === 'timeout' && c.toTeam === side) {
      await patch({
        custom: {
          toKind: null,
          toTeam: null,
          toLeft: 0,
          toSuspended: false,
          buzzLeft: BUZZ_MS,
        },
        log: `Custom ${c[side].name} TIMEOUT ended`,
      });
      return;
    }
    await startTimeout(side);
  };

  const handleBreakButton = async () => {
    if (c.toKind) {
      await patch({
        custom: { toKind: null, toTeam: null, toLeft: 0, toSuspended: false, buzzLeft: BUZZ_MS },
        log: `Custom ${c.toKind} ended early`,
      });
    } else {
      setBreakOpen(true);
    }
  };

  const startBreak = async (minutes: number) => {
    await patch({
      custom: {
        running: false,
        toKind: 'break',
        toTeam: null,
        toLeft: Math.round(minutes * 60000),
        toSuspended: false,
      },
      log: `Custom BREAK started: ${minutes} min`,
    });
  };

  const buzzLong = () => {
    Buzzer.unlock();
    patch({ custom: { buzzLeft: LONG_BUZZ_MS }, log: 'Custom LONG BUZZER' });
  };

  const shotDisplay = !c.shotOn || c.clock < c.shot ? '--' : Math.ceil(c.shot / 1000);
  const shotRunning = c.running && !c.shotHold && c.shotOn;
  const shotClockText = c.shotOn ? Math.ceil(c.shot / 1000) : 'OFF';

  const renderScoreboardSide = (side: 'a' | 'b', rightSide: boolean) => {
    const info = c[side];
    const color = readable(info.color, '#0a1530');
    const hasPoss = c.arrow === side;

    return (
      <div
        key={side}
        style={{ borderTopColor: color }}
        className={`flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[#1a2d6b] border-t-4 bg-[#0a1530] px-4 py-3 ${
          rightSide ? 'flex-row-reverse text-right' : ''
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className={`flex items-center gap-2 ${rightSide ? 'justify-end' : ''}`}>
            {!rightSide && hasPoss && (
              <span className="rounded bg-[#f2a501] px-2 py-0.5 text-xs font-extrabold text-black">
                ◀ POSS
              </span>
            )}
            <div style={{ color }} className="truncate text-2xl font-extrabold leading-tight sm:text-3xl">
              {info.name}
            </div>
            {rightSide && hasPoss && (
              <span className="rounded bg-[#f2a501] px-2 py-0.5 text-xs font-extrabold text-black">
                POSS ▶
              </span>
            )}
          </div>

          <div className="truncate text-xs text-[#8c9bc4]">{info.full || '\u00A0'}</div>

          <div
            className={`mt-1.5 flex flex-wrap items-center gap-2 text-xs font-bold ${
              rightSide ? 'justify-end' : ''
            }`}
          >
            <span className="rounded-md bg-[#16224d] px-2.5 py-0.5 text-[#c7d2fe]">
              FOULS <b className="text-white">{info.fouls}</b>
              {info.fouls >= 5 && <span className="ml-1 text-[#fde68a]">BONUS</span>}
            </span>
            <span className="rounded-md bg-[#16224d] px-2.5 py-0.5 text-[#c7d2fe]">
              T/O <b className="text-white">{info.timeouts}</b>
            </span>
          </div>
        </div>

        <div
          style={{ fontFamily: 'Arial, sans-serif' }}
          className="shrink-0 text-5xl font-extrabold leading-none tabular-nums text-white sm:text-6xl"
        >
          {info.score}
        </div>
      </div>
    );
  };

  const renderTeamControlsCard = (side: 'a' | 'b', rightSide: boolean) => {
    const info = c[side];
    const color = readable(info.color, '#0a1530');
    const hasPoss = c.arrow === side;
    const isTimeoutActive = c.toKind === 'timeout' && c.toTeam === side;

    return (
      <section
        key={side}
        style={{ borderTopColor: color }}
        className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[#1a2d6b] border-t-4 bg-[#0a1530] p-3.5"
      >
        {/* Card Header + Possession Toggle (tap twice or press Left/Right arrow to toggle/clear) */}
        <div
          className={`flex items-center justify-between gap-2 ${
            rightSide ? 'flex-row-reverse' : ''
          }`}
        >
          <div className={`flex min-w-0 items-center gap-2.5 ${rightSide ? 'flex-row-reverse text-right' : ''}`}>
            <span
              style={{ backgroundColor: color }}
              className="h-4 w-4 shrink-0 rounded-full"
            />
            <span style={{ color }} className="truncate text-lg font-extrabold">
              {info.name}
            </span>
          </div>

          <button
            type="button"
            title={`Shortcut: press ${rightSide ? 'Right Arrow (→)' : 'Left Arrow (←)'}. Tap again to clear.`}
            onClick={() => togglePossession(side)}
            className={`inline-flex min-h-[46px] items-center gap-2 rounded-xl px-4 text-sm font-extrabold transition active:scale-[0.97] ${
              hasPoss
                ? 'bg-[#f2a501] text-black shadow-sm'
                : 'border border-[#3a4a8f] bg-[#16224d] text-[#c7d2fe] hover:bg-[#243675]'
            }`}
          >
            <span>{rightSide ? 'POSSESSION ▶' : '◀ POSSESSION'}</span>
            <kbd
              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                hasPoss
                  ? 'border-black/40 bg-black/15 text-black'
                  : 'border-white/40 bg-black/30 text-white'
              }`}
            >
              {rightSide ? '→' : '←'}
            </kbd>
          </button>
        </div>

        {/* Group A: Score Controls */}
        <div className="rounded-xl border border-[#1a2d6b] bg-[#071233] p-2.5">
          <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
            Score
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3].map((pts) => (
              <button
                key={pts}
                type="button"
                onClick={() => adjustScore(side, pts)}
                className="min-h-[64px] rounded-xl bg-[#1d4ed8] text-2xl font-black text-white transition hover:bg-[#1e40af] active:scale-[0.97]"
              >
                +{pts}
              </button>
            ))}
            <button
              type="button"
              onClick={() => adjustScore(side, -1)}
              className="min-h-[64px] rounded-xl bg-[#7f1d1d] text-2xl font-black text-white transition hover:bg-[#991b1b] active:scale-[0.97]"
            >
              −1
            </button>
          </div>
        </div>

        {/* Group B: Fouls & Timeouts */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* Team Fouls */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#1a2d6b] bg-[#071233] px-3 py-2.5">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
                Team Fouls
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-2xl font-extrabold leading-none text-white">{info.fouls}</span>
                {info.fouls >= 5 && (
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-[#fde68a]">
                    BONUS
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Decrease ${info.name} fouls`}
                onClick={() => adjustFouls(side, -1)}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2a3f87] text-2xl font-black leading-none text-white transition hover:bg-[#354fa8] active:scale-[0.96]"
              >
                −
              </button>
              <button
                type="button"
                aria-label={`Increase ${info.name} fouls`}
                onClick={() => adjustFouls(side, 1)}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2a3f87] text-2xl font-black leading-none text-white transition hover:bg-[#354fa8] active:scale-[0.96]"
              >
                +
              </button>
            </div>
          </div>

          {/* Timeouts */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#1a2d6b] bg-[#071233] px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
                  Timeouts
                </div>
                <div className="mt-0.5 text-2xl font-extrabold leading-none text-white">
                  {info.timeouts}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`Decrease ${info.name} timeouts`}
                  onClick={() => adjustTimeouts(side, -1)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2a3f87] text-2xl font-black leading-none text-white transition hover:bg-[#354fa8] active:scale-[0.96]"
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label={`Increase ${info.name} timeouts`}
                  onClick={() => adjustTimeouts(side, 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2a3f87] text-2xl font-black leading-none text-white transition hover:bg-[#354fa8] active:scale-[0.96]"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              title={
                isTimeoutActive
                  ? 'Tap to end this timeout'
                  : 'Tap: start default timeout. Hold: choose another length.'
              }
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={() => {
                toHoldFired.current = false;
                if (toHoldTimer.current) window.clearTimeout(toHoldTimer.current);
                if (isTimeoutActive) return;
                toHoldTimer.current = window.setTimeout(() => {
                  toHoldFired.current = true;
                  setToPickerSide(side);
                }, 550);
              }}
              onPointerUp={() => {
                if (toHoldTimer.current) window.clearTimeout(toHoldTimer.current);
              }}
              onPointerLeave={() => {
                if (toHoldTimer.current) window.clearTimeout(toHoldTimer.current);
              }}
              onClick={() => {
                if (toHoldFired.current) {
                  toHoldFired.current = false;
                  return;
                }
                void handleTeamTimeoutClick(side);
              }}
              className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl px-3.5 text-xs font-extrabold transition active:scale-[0.97] ${
                isTimeoutActive
                  ? 'bg-[#b91c1c] text-white ring-2 ring-[#facc15] hover:bg-[#991b1b]'
                  : 'bg-[#facc15] text-[#1a1200] hover:bg-[#fde047]'
              }`}
            >
              <span>{isTimeoutActive ? 'END TIMEOUT' : 'TIMEOUT'}</span>
              <span className="text-[11px] font-bold opacity-90">
                {isTimeoutActive ? `${toText(c.toLeft)} LEFT` : secText(c.timeoutSecs || 30)}
              </span>
            </button>
          </div>
        </div>
      </section>
    );
  };

  return (
    <>
      {gearOpen && (
        <CustomGearModal
          custom={c}
          buzzHere={buzzHere}
          onToggleBuzzHere={(val) => {
            setBuzzHere(val);
            localStorage.buzzHere = val ? '1' : '0';
          }}
          onClose={() => setGearOpen(false)}
        />
      )}
      {breakOpen && <BreakModal onStart={startBreak} onClose={() => setBreakOpen(false)} />}
      {toPickerSide !== null && (
        <TimeoutPickerModal
          teamName={c[toPickerSide].name}
          teamColorHex={readable(c[toPickerSide].color, '#11204f')}
          timeoutsLeft={c[toPickerSide].timeouts}
          onStart={(secs) => startTimeout(toPickerSide, secs)}
          onClose={() => setToPickerSide(null)}
        />
      )}
      {shortcutsOpen && (
        <ModalShell
          maxWidth="max-w-[440px]"
          title="Keyboard Shortcuts"
          subtitle="Quick controls for clocks, possession & buzzer"
          onClose={() => setShortcutsOpen(false)}
        >
          <div className="space-y-2 text-xs text-[#c7d2fe]">
            <div className="flex items-center justify-between rounded-xl border border-[#1a2d6b] bg-[#071233] px-3 py-2">
              <span>Start / Pause Game Clock</span>
              <kbd className="rounded border border-[#3a4a8f] bg-[#16224d] px-2 py-0.5 font-bold text-white">
                Shift + Space
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#1a2d6b] bg-[#071233] px-3 py-2">
              <span>Hold / Resume Shot Clock</span>
              <kbd className="rounded border border-[#3a4a8f] bg-[#16224d] px-2 py-0.5 font-bold text-white">
                Space
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#1a2d6b] bg-[#071233] px-3 py-2">
              <span>Reset Shot Clock to 24s</span>
              <kbd className="rounded border border-[#3a4a8f] bg-[#16224d] px-2 py-0.5 font-bold text-white">
                9
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#1a2d6b] bg-[#071233] px-3 py-2">
              <span>Reset Shot Clock to 14s</span>
              <kbd className="rounded border border-[#3a4a8f] bg-[#16224d] px-2 py-0.5 font-bold text-white">
                0
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#1a2d6b] bg-[#071233] px-3 py-2">
              <span>Toggle Left / Right Possession</span>
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-[#3a4a8f] bg-[#16224d] px-2 py-0.5 font-bold text-white">
                  ←
                </kbd>
                <kbd className="rounded border border-[#3a4a8f] bg-[#16224d] px-2 py-0.5 font-bold text-white">
                  →
                </kbd>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#1a2d6b] bg-[#071233] px-3 py-2">
              <span>Sound Buzzer (Hold)</span>
              <kbd className="rounded border border-[#3a4a8f] bg-[#16224d] px-2 py-0.5 font-bold text-white">
                Backspace
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#1a2d6b] bg-[#071233] px-3 py-2">
              <span>Open Shortcuts Help</span>
              <kbd className="rounded border border-[#3a4a8f] bg-[#16224d] px-2 py-0.5 font-bold text-white">
                ?
              </kbd>
            </div>
          </div>
        </ModalShell>
      )}

      <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-[1400px] flex-col gap-3 p-2.5 sm:p-3">
        {/* Top Utility Bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] px-3 py-2.5">
          <span className="rounded-xl bg-[#16224d] px-3 py-2 text-xs font-extrabold tracking-wider text-[#f2a501]">
            CUSTOM SCOREBOARD
          </span>

          <div className="inline-flex overflow-hidden rounded-xl border border-[#3a4a8f]">
            <button
              type="button"
              onClick={() => stepPeriod(-1)}
              className="inline-flex min-h-[46px] items-center gap-1 bg-[#2a3f87] px-3.5 text-sm font-extrabold text-white hover:bg-[#354fa8] active:scale-[0.98]"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="flex items-center bg-[#0f1a44] px-3.5 text-sm font-extrabold text-[#eef2fb]">
              {per(c.period)}
            </span>
            <button
              type="button"
              onClick={() => stepPeriod(1)}
              className="inline-flex min-h-[46px] items-center gap-1 bg-[#2a3f87] px-3.5 text-sm font-extrabold text-white hover:bg-[#354fa8] active:scale-[0.98]"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => patch({ custom: { swap: !c.swap }, log: 'Custom scoreboard sides swapped' })}
            className="inline-flex min-h-[46px] items-center gap-1.5 rounded-xl bg-[#2a3f87] px-4 text-sm font-extrabold text-white hover:bg-[#354fa8] active:scale-[0.98]"
          >
            <ArrowLeftRight className="h-4 w-4" /> Swap Sides
          </button>

          <span className="flex-1" />

          <button
            type="button"
            title="Keyboard shortcuts (?)"
            onClick={() => setShortcutsOpen(true)}
            className="flex min-h-[46px] min-w-[46px] items-center justify-center rounded-xl border border-[#3a4a8f] bg-[#16224d] px-3 text-sm font-extrabold text-[#cfd8ff] hover:bg-[#243675]"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          <button
            type="button"
            title="Toggle fullscreen operator mode"
            onClick={() => void toggleFullscreen()}
            className="flex min-h-[46px] items-center gap-1.5 rounded-xl border border-[#3a4a8f] bg-[#16224d] px-3.5 text-sm font-extrabold text-[#cfd8ff] hover:bg-[#243675]"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Full' : 'Full Screen'}</span>
          </button>

          <Link
            to="/custom-scoreboard"
            target="_blank"
            className="flex min-h-[46px] items-center rounded-xl border border-[#3a4a8f] bg-[#16224d] px-3.5 text-sm font-extrabold text-[#cfd8ff] hover:bg-[#243675]"
          >
            Open Display ↗
          </Link>

          <button
            type="button"
            onClick={() => setGearOpen(true)}
            className="flex min-h-[46px] items-center gap-1.5 rounded-xl border border-[#3a4a8f] bg-[#16224d] px-3.5 text-sm font-extrabold text-[#cfd8ff] hover:bg-[#243675]"
          >
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>

        {notice && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/70 px-3.5 py-2.5 text-xs font-bold text-[#fde68a]">
            {notice}
          </div>
        )}

        {/* Group 1: Unified Scoreboard Banner */}
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_250px_1fr]">
          {renderScoreboardSide(sides[0], false)}

          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-[#f2a501] bg-black px-3 py-2.5 text-center">
            <small className="text-xs font-bold tracking-wider text-[#c7d2fe]">
              PERIOD {per(c.period)} ·{' '}
              {c.running ? <span className="text-[#4ade80]">● RUNNING</span> : '■ STOPPED'}
            </small>
            <div
              style={{ fontFamily: 'Arial, sans-serif' }}
              className="text-5xl font-extrabold leading-tight tabular-nums text-[#f2a501] sm:text-6xl"
            >
              {fc(c.clock)}
            </div>
            <div
              style={{ fontFamily: 'Arial, sans-serif' }}
              className="text-3xl font-extrabold leading-none tabular-nums text-[#f87171]"
            >
              <small className="mr-1.5 text-[11px] font-bold tracking-wider text-[#c7d2fe]">SHOT</small>
              {shotDisplay}
            </div>
            {c.toKind && (
              <small className="mt-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-[#fbbf24]">
                {c.toKind === 'break'
                  ? `BREAK ${toText(c.toLeft)}`
                  : `TIMEOUT ${c.toTeam ? c[c.toTeam].name : ''} ${toText(c.toLeft)}`}
                {c.toSuspended ? ' (suspended)' : ''}
              </small>
            )}
          </div>

          {renderScoreboardSide(sides[1], true)}
        </div>

        {/* Group 2: Timekeeping (Game Clock & Shot Clock) */}
        <section className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
            <span>Timekeeping</span>
            <span>Clocks &amp; Shot Reset</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[2.2fr_2.2fr_1fr_1fr]">
            <button
              type="button"
              title="Shortcut: press Shift + Spacebar"
              onClick={toggleGameClock}
              className={`relative flex min-h-[104px] flex-col items-center justify-center rounded-2xl text-2xl font-extrabold text-white transition active:scale-[0.98] sm:min-h-[112px] sm:text-3xl ${
                c.running ? 'bg-[#b91c1c] hover:bg-[#991b1b]' : 'bg-[#15803d] hover:bg-[#166534]'
              }`}
            >
              <span>{c.running ? 'PAUSE' : 'START'}</span>
              <small className="mt-1 text-xs font-bold tracking-wider opacity-90">
                GAME CLOCK {fc(c.clock)}
              </small>
              <kbd className="pointer-events-none absolute right-2 top-2 rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                SHIFT+SPACE
              </kbd>
            </button>

            <button
              type="button"
              title="Shortcut: press Spacebar"
              onClick={toggleShotClock}
              className={`relative flex min-h-[104px] flex-col items-center justify-center rounded-2xl text-2xl font-extrabold text-white transition active:scale-[0.98] sm:min-h-[112px] sm:text-3xl ${
                shotRunning
                  ? 'bg-[#b91c1c] hover:bg-[#991b1b]'
                  : c.shotHold
                    ? 'bg-[#15803d] hover:bg-[#166534]'
                    : 'bg-[#1e2a6b] hover:bg-[#29398f]'
              }`}
            >
              <span>{shotRunning ? 'PAUSE' : c.shotHold ? 'START' : 'READY'}</span>
              <small className="mt-1 text-xs font-bold tracking-wider opacity-90">
                {shotRunning
                  ? `SHOT CLOCK ${shotClockText}`
                  : c.shotHold
                    ? `SHOT CLOCK ${shotClockText} · PAUSED`
                    : `SHOT CLOCK ${shotClockText} · WITH GAME CLOCK`}
              </small>
              <kbd className="pointer-events-none absolute right-2 top-2 rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                SPACE
              </kbd>
            </button>

            <button
              type="button"
              title="Shortcut: press 9"
              onClick={() => resetShotClock(24)}
              className="relative flex min-h-[104px] items-center justify-center rounded-2xl bg-[#1d4ed8] text-3xl font-extrabold text-white transition hover:bg-[#1e40af] active:scale-[0.98] sm:min-h-[112px] sm:text-4xl"
            >
              +24
              <kbd className="pointer-events-none absolute right-2 top-2 rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                9
              </kbd>
            </button>

            <button
              type="button"
              title="Shortcut: press 0"
              onClick={() => resetShotClock(14)}
              className="relative flex min-h-[104px] items-center justify-center rounded-2xl bg-[#1d4ed8] text-3xl font-extrabold text-white transition hover:bg-[#1e40af] active:scale-[0.98] sm:min-h-[112px] sm:text-4xl"
            >
              +14
              <kbd className="pointer-events-none absolute right-2 top-2 rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                0
              </kbd>
            </button>
          </div>
        </section>

        {/* Group 3: Team Score, Fouls, Timeouts & Possession Cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {renderTeamControlsCard(sides[0], false)}
          {renderTeamControlsCard(sides[1], true)}
        </div>

        {/* Group 4: Game Flow & Buzzer Controls */}
        <section className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-3">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
            Game Flow &amp; Buzzer
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleBreakButton}
              className="flex min-h-[76px] flex-col items-center justify-center rounded-2xl bg-[#6d28d9] px-3 text-base font-extrabold text-white transition hover:bg-[#5b21b6] active:scale-[0.98] sm:text-lg"
            >
              <span>{c.toKind ? `END ${c.toKind === 'break' ? 'BREAK' : 'TIMEOUT'}` : 'BREAK'}</span>
              {c.toKind && (
                <small className="text-xs font-bold">
                  {toText(c.toLeft)} LEFT{c.toSuspended ? ' · SUSPENDED' : ''}
                </small>
              )}
            </button>

            <button
              type="button"
              title="Hold button or Backspace key to sound"
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={buzzStart}
              onPointerUp={buzzStop}
              onPointerLeave={buzzStop}
              className="relative flex min-h-[76px] touch-none select-none flex-col items-center justify-center rounded-2xl bg-[#854d0e] px-3 text-base font-extrabold text-white transition hover:bg-[#713f12] sm:text-lg"
            >
              <span className="inline-flex items-center gap-2">
                <Volume2 className="h-5 w-5" /> BUZZER
              </span>
              <small className="text-xs font-bold">HOLD</small>
              <kbd className="pointer-events-none absolute right-2 top-2 rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                BACKSPACE
              </kbd>
            </button>

            <button
              type="button"
              onClick={buzzLong}
              className="flex min-h-[76px] items-center justify-center gap-2 rounded-2xl bg-[#b45309] px-3 text-base font-extrabold text-white transition hover:bg-[#92400e] active:scale-[0.98] sm:text-lg"
            >
              <Volume2 className="h-5 w-5" /> LONG BUZZER
            </button>
          </div>
        </section>
      </div>
    </>
  );
}