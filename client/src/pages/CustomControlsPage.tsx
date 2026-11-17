import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { Buzzer, haptic } from '../lib/buzzer';
import { customSheet, fc, per, readable, secText, toText } from '../lib/format';
import { BreakModal } from '../components/controls/BreakModal';
import { CustomGearModal } from '../components/controls/CustomGearModal';
import { TimeoutPickerModal } from '../components/controls/TimeoutPickerModal';

const BUZZ_MS = 2500;
const LONG_BUZZ_MS = 3000;

export function CustomControlsPage() {
  const { db, patch } = useDb();

  const [buzzHere, setBuzzHere] = useState(() => localStorage.buzzHere === '1');
  const [gearOpen, setGearOpen] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const [toPickerSide, setToPickerSide] = useState<'a' | 'b' | null>(null);

  const toHoldTimer = useRef<number | null>(null);
  const toHoldFired = useRef(false);
  const buzzHeldRef = useRef(false);

  // Sync optional local buzzer audio
  useEffect(() => {
    if (!db) return;
    const c = db.custom;
    const shouldSound = buzzHere && (c.buzzOn || c.buzzLeft > 0);
    const kind = !c.buzzOn && c.buzzKind === 'shot' ? 'shot' : 'game';
    Buzzer.sync(shouldSound, kind);
  }, [db, buzzHere]);

  // Stop held buzzer on release anywhere
  useEffect(() => {
    const stopBuzz = () => {
      if (!buzzHeldRef.current) return;
      buzzHeldRef.current = false;
      patch({ custom: { buzzOn: false } });
    };
    window.addEventListener('pointerup', stopBuzz);
    window.addEventListener('pointercancel', stopBuzz);
    window.addEventListener('blur', stopBuzz);
    return () => {
      window.removeEventListener('pointerup', stopBuzz);
      window.removeEventListener('pointercancel', stopBuzz);
      window.removeEventListener('blur', stopBuzz);
      Buzzer.stop();
    };
  }, [patch]);

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

  // Keyboard shortcuts: Shift+Space (game clock), Space (shot clock), 9 (+24), 0 (+14)
  useEffect(() => {
    const anyModalOpen = gearOpen || breakOpen || toPickerSide !== null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || anyModalOpen || !db) return;
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

      if (e.key === '9') {
        e.preventDefault();
        resetShotClock(24);
      } else if (e.key === '0') {
        e.preventDefault();
        resetShotClock(14);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gearOpen, breakOpen, toPickerSide, db, toggleGameClock, toggleShotClock, resetShotClock]);

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
    const nextFouls = Math.max(0, c[side].fouls + delta);
    patch({
      custom: { [side]: { fouls: nextFouls } },
      log: `Custom ${c[side].name} fouls: ${nextFouls}`,
    });
  };

  const adjustTimeouts = (side: 'a' | 'b', delta: number) => {
    const nextTo = Math.max(0, c[side].timeouts + delta);
    patch({
      custom: { [side]: { timeouts: nextTo } },
      log: `Custom ${c[side].name} timeouts: ${nextTo}`,
    });
  };

  const startTimeout = async (side: 'a' | 'b', secs = c.timeoutSecs || 30) => {
    const left = c[side].timeouts;
    if (!left) return alert('No timeouts left');
    if (c.toKind) return alert('A timeout or break is already running');

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

  const buzzStart = () => {
    if (buzzHeldRef.current) return;
    buzzHeldRef.current = true;
    Buzzer.unlock();
    patch({ custom: { buzzOn: true }, log: 'Custom BUZZER pressed' });
  };

  const buzzStop = () => {
    if (!buzzHeldRef.current) return;
    buzzHeldRef.current = false;
    patch({ custom: { buzzOn: false } });
  };

  const buzzLong = () => {
    Buzzer.unlock();
    patch({ custom: { buzzLeft: LONG_BUZZ_MS }, log: 'Custom LONG BUZZER' });
  };

  const shotDisplay = !c.shotOn || c.clock < c.shot ? '--' : Math.ceil(c.shot / 1000);
  const shotRunning = c.running && !c.shotHold && c.shotOn;
  const shotClockText = c.shotOn ? Math.ceil(c.shot / 1000) : 'OFF';

  const renderSidePanel = (side: 'a' | 'b', rightSide: boolean) => {
    const info = c[side];
    const color = readable(info.color, '#0a1530');

    return (
      <div
        key={side}
        style={{ borderTopColor: color }}
        className="flex min-w-0 flex-col gap-2.5 rounded-2xl border border-[#1a2d6b] border-t-4 bg-[#0a1530] p-3"
      >
        <div className={`flex items-center justify-between gap-2 ${rightSide ? 'flex-row-reverse text-right' : ''}`}>
          <div className="min-w-0">
            <div style={{ color }} className="truncate text-2xl font-extrabold leading-tight">
              {info.name}
            </div>
            <div className="truncate text-xs text-[#8c9bc4]">{info.full || '\u00A0'}</div>
          </div>
          <div
            style={{ fontFamily: 'Arial, sans-serif' }}
            className="text-5xl font-extrabold leading-none text-white sm:text-6xl"
          >
            {info.score}
          </div>
        </div>

        {/* Score buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3].map((pts) => (
            <button
              key={pts}
              type="button"
              onClick={() => adjustScore(side, pts)}
              className="min-h-[48px] rounded-xl bg-[#1d4ed8] text-lg font-extrabold text-white transition hover:bg-[#1e40af] active:scale-[0.97]"
            >
              +{pts}
            </button>
          ))}
          <button
            type="button"
            onClick={() => adjustScore(side, -1)}
            className="min-h-[48px] rounded-xl bg-[#7f1d1d] text-base font-extrabold text-white transition hover:bg-[#991b1b] active:scale-[0.97]"
          >
            −1
          </button>
        </div>

        {/* Fouls & Timeouts adjusters */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between rounded-xl bg-[#16224d] px-2.5 py-1.5">
            <div className="text-xs font-bold text-[#c7d2fe]">
              FOULS{' '}
              <b className="ml-1 text-base text-white">{info.fouls}</b>
              {info.fouls >= 5 && <span className="ml-1 text-[10px] text-[#fde68a]">BONUS</span>}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => adjustFouls(side, -1)}
                className="h-8 w-8 rounded-lg bg-[#2a3f87] font-extrabold text-white hover:bg-[#354fa8]"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => adjustFouls(side, 1)}
                className="h-8 w-8 rounded-lg bg-[#2a3f87] font-extrabold text-white hover:bg-[#354fa8]"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#16224d] px-2.5 py-1.5">
            <div className="text-xs font-bold text-[#c7d2fe]">
              T/O <b className="ml-1 text-base text-white">{info.timeouts}</b>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => adjustTimeouts(side, -1)}
                className="h-8 w-8 rounded-lg bg-[#2a3f87] font-extrabold text-white hover:bg-[#354fa8]"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => adjustTimeouts(side, 1)}
                className="h-8 w-8 rounded-lg bg-[#2a3f87] font-extrabold text-white hover:bg-[#354fa8]"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
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

      <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-[1400px] flex-col gap-2.5 p-2.5">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-lg bg-[#16224d] px-2.5 py-1.5 text-xs font-extrabold tracking-wider text-[#f2a501]">
            CUSTOM SCOREBOARD
          </span>
          <button
            type="button"
            onClick={() => stepPeriod(-1)}
            className="min-h-[38px] rounded-xl bg-[#2a3f87] px-3 text-sm font-extrabold text-white hover:bg-[#354fa8]"
          >
            &#9666; Prev period
          </button>
          <button
            type="button"
            onClick={() => stepPeriod(1)}
            className="min-h-[38px] rounded-xl bg-[#2a3f87] px-3 text-sm font-extrabold text-white hover:bg-[#354fa8]"
          >
            Next period &#9656;
          </button>
          <button
            type="button"
            onClick={() => patch({ custom: { swap: !c.swap }, log: 'Custom scoreboard sides swapped' })}
            className="min-h-[38px] rounded-xl bg-[#2a3f87] px-3.5 text-sm font-extrabold text-white hover:bg-[#354fa8]"
          >
            Swap sides
          </button>

          <span className="flex-1" />

          <Link
            to="/custom-scoreboard"
            target="_blank"
            className="flex min-h-[38px] items-center rounded-xl border border-[#3a4a8f] bg-[#16224d] px-3 text-xs font-extrabold text-[#cfd8ff] hover:bg-[#243675]"
          >
            Open Display ↗
          </Link>
          <button
            type="button"
            onClick={() => setGearOpen(true)}
            className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#3a4a8f] bg-[#16224d] px-3 text-xs font-extrabold text-[#cfd8ff] hover:bg-[#243675]"
          >
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>

        {/* Team Score / Foul / Timeout Panels + Center Clock */}
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_240px_1fr]">
          {renderSidePanel(sides[0], false)}

          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-[#f2a501] bg-black px-3 py-2 text-center">
            <small className="text-xs font-bold tracking-wider text-[#c7d2fe]">
              PERIOD {per(c.period)} ·{' '}
              {c.running ? <span className="text-[#4ade80]">● RUNNING</span> : '■ STOPPED'}
            </small>
            <div
              style={{ fontFamily: 'Arial, sans-serif' }}
              className="text-5xl font-extrabold leading-tight text-[#f2a501] sm:text-6xl"
            >
              {fc(c.clock)}
            </div>
            <div
              style={{ fontFamily: 'Arial, sans-serif' }}
              className="text-3xl font-extrabold leading-none text-[#f87171]"
            >
              <small className="mr-1.5 text-[11px] font-bold tracking-wider text-[#c7d2fe]">SHOT</small>
              {shotDisplay}
            </div>
            {c.toKind && (
              <small className="mt-1 text-xs font-bold text-[#fbbf24]">
                {c.toKind === 'break'
                  ? `BREAK ${toText(c.toLeft)}`
                  : `TIMEOUT ${c.toTeam ? c[c.toTeam].name : ''} ${toText(c.toLeft)}`}
                {c.toSuspended ? ' (suspended)' : ''}
              </small>
            )}
          </div>

          {renderSidePanel(sides[1], true)}
        </div>

        {/* Game Clock & Shot Clock Controls */}
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-[2.2fr_2.2fr_1fr_1fr]">
          <button
            type="button"
            title="Shortcut: press Shift + Spacebar"
            onClick={toggleGameClock}
            className={`relative flex min-h-[100px] flex-col items-center justify-center rounded-2xl text-2xl font-extrabold text-white transition active:scale-[0.98] sm:text-3xl ${
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
            className={`relative flex min-h-[100px] flex-col items-center justify-center rounded-2xl text-2xl font-extrabold text-white transition active:scale-[0.98] sm:text-3xl ${
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
            className="relative flex min-h-[100px] items-center justify-center rounded-2xl bg-[#1d4ed8] text-3xl font-extrabold text-white transition hover:bg-[#1e40af] active:scale-[0.98] sm:text-4xl"
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
            className="relative flex min-h-[100px] items-center justify-center rounded-2xl bg-[#1d4ed8] text-3xl font-extrabold text-white transition hover:bg-[#1e40af] active:scale-[0.98] sm:text-4xl"
          >
            +14
            <kbd className="pointer-events-none absolute right-2 top-2 rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
              0
            </kbd>
          </button>
        </div>

        {/* Possession Bar */}
        <div className="grid grid-cols-3 gap-2">
          {sides.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => patch({ custom: { arrow: s }, log: `Custom possession: ${c[s].name}` })}
              className={`min-h-[52px] truncate rounded-2xl bg-[#1e2a6b] px-3 text-base font-extrabold text-white transition hover:bg-[#29398f] ${
                c.arrow === s ? 'ring-2 ring-inset ring-[#f2a501]' : ''
              }`}
            >
              ◀ POSSESSION {c[s].name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => patch({ custom: { arrow: null }, log: 'Custom possession cleared' })}
            className="min-h-[52px] rounded-2xl bg-[#2a3f87] px-3 text-base font-extrabold text-white hover:bg-[#354fa8]"
          >
            Clear Possession
          </button>
        </div>

        {/* Timeouts, Break & Buzzer */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {sides.map((s) => (
            <button
              key={s}
              type="button"
              title="Tap: start default timeout. Hold: choose another length."
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={() => {
                toHoldFired.current = false;
                if (toHoldTimer.current) window.clearTimeout(toHoldTimer.current);
                toHoldTimer.current = window.setTimeout(() => {
                  toHoldFired.current = true;
                  setToPickerSide(s);
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
                startTimeout(s);
              }}
              className="flex min-h-[68px] flex-col items-center justify-center rounded-2xl bg-[#facc15] px-2 text-base font-extrabold text-[#1a1200] transition hover:bg-[#fde047] active:scale-[0.98]"
            >
              <span>TIMEOUT {c[s].name}</span>
              <small className="text-xs font-bold">
                {c[s].timeouts} left · {secText(c.timeoutSecs || 30)}
              </small>
            </button>
          ))}

          <button
            type="button"
            onClick={handleBreakButton}
            className="flex min-h-[68px] flex-col items-center justify-center rounded-2xl bg-[#6d28d9] px-2 text-base font-extrabold text-white transition hover:bg-[#5b21b6] active:scale-[0.98]"
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
            title="Hold to sound"
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={buzzStart}
            onPointerUp={buzzStop}
            onPointerLeave={buzzStop}
            className="flex min-h-[68px] touch-none select-none flex-col items-center justify-center rounded-2xl bg-[#854d0e] px-2 text-base font-extrabold text-white transition hover:bg-[#713f12]"
          >
            <span>BUZZER</span>
            <small className="text-[11px] font-bold">HOLD</small>
          </button>

          <button
            type="button"
            onClick={buzzLong}
            className="flex min-h-[68px] flex-col items-center justify-center rounded-2xl bg-[#b45309] px-2 text-base font-extrabold text-white transition hover:bg-[#92400e] active:scale-[0.98]"
          >
            <span>LONG BUZZER</span>
          </button>
        </div>
      </div>
    </>
  );
}