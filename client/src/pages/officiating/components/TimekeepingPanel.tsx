import { Settings } from 'lucide-react';
import type { LiveState } from '../../../types';
import { fc } from '../../../lib/format';

interface TimekeepingPanelProps {
  live: LiveState;
  operatorMode: boolean;
  toggleGameClock: () => void;
  toggleShotClock: () => void;
  resetShotClock: (seconds: 24 | 14) => void;
  openGearTime: () => void;
}

export function TimekeepingPanel({
  live,
  operatorMode,
  toggleGameClock,
  toggleShotClock,
  resetShotClock,
  openGearTime,
}: TimekeepingPanelProps) {
  const shotRunning = live.running && !live.shotHold && live.shotOn;
  const shotClockText = live.shotOn ? Math.ceil(live.shot / 1000) : 'OFF';

  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col gap-2 rounded-xl border border-[#1a2d6b] bg-[#0a1530] ${
        operatorMode ? 'flex-1 p-2 sm:p-2.5' : 'flex-[1.25] p-2.5'
      }`}
    >
      {!operatorMode && (
        <div className="flex shrink-0 items-center gap-2">
          <h5 className="text-xs font-bold tracking-widest text-[#8c9bc4]">TIMEKEEPING CONTROLS</h5>
          <span className="flex-1" />
          <button
            type="button"
            aria-label="Timekeeping settings"
            onClick={openGearTime}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3a4a8f] bg-[#16224d] text-[#cfd8ff] hover:bg-[#243675]"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Subheader Sections: Game Clock (1/3) + Shot Clock (2/3) */}
      <div
        className={`grid min-h-0 min-w-0 flex-1 grid-cols-1 sm:grid-cols-[1fr_2fr] ${
          operatorMode ? 'gap-2 sm:gap-3' : 'gap-3'
        }`}
      >
        {/* Section 1: Game Clock */}
        <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
          {!operatorMode && (
            <h6 className="shrink-0 border-b border-[#1a2d6b] pb-1 text-[11px] font-bold uppercase tracking-wider text-[#94a5d4]">
              Game Clock
            </h6>
          )}
          <button
            type="button"
            title="Shortcut: press Shift + Spacebar"
            onClick={toggleGameClock}
            className={`relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-2 font-extrabold text-white transition active:scale-[0.98] ${
              operatorMode
                ? 'text-2xl sm:text-4xl lg:text-5xl'
                : 'min-h-[88px] text-lg sm:text-xl'
            } ${live.running ? 'bg-[#b91c1c] hover:bg-[#991b1b]' : 'bg-[#15803d] hover:bg-[#166534]'}`}
          >
            <span>{live.running ? 'PAUSE' : 'START'}</span>
            <small
              className={`mt-0.5 max-w-full truncate font-bold tracking-wider opacity-90 ${
                operatorMode ? 'text-xs sm:text-sm lg:text-base' : 'text-[10px] sm:text-xs'
              }`}
            >
              GAME CLOCK {fc(live.clock)}
            </small>
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold sm:inline-block">
              SHIFT+SPACE
            </kbd>
          </button>
        </div>

        {/* Section 2: Shot Clock + Stacked +24 / +14 */}
        <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
          {!operatorMode && (
            <h6 className="shrink-0 border-b border-[#1a2d6b] pb-1 text-[11px] font-bold uppercase tracking-wider text-[#94a5d4]">
              Shot Clock
            </h6>
          )}
          <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 gap-1.5 sm:gap-2">
            <button
              type="button"
              title="Shortcut: press Spacebar"
              onClick={toggleShotClock}
              className={`relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-2 font-extrabold text-white transition active:scale-[0.98] ${
                operatorMode
                  ? 'text-2xl sm:text-4xl lg:text-5xl'
                  : 'min-h-[88px] text-lg sm:text-xl'
              } ${
                shotRunning
                  ? 'bg-[#b91c1c] hover:bg-[#991b1b]'
                  : live.shotHold
                    ? 'bg-[#15803d] hover:bg-[#166534]'
                    : 'bg-[#1e2a6b] hover:bg-[#29398f]'
              }`}
            >
              <span>{shotRunning ? 'PAUSE' : live.shotHold ? 'START' : 'READY'}</span>
              <small
                className={`mt-0.5 max-w-full truncate font-bold tracking-wider opacity-90 ${
                  operatorMode ? 'text-xs sm:text-sm lg:text-base' : 'text-[10px] sm:text-xs'
                }`}
              >
                {shotRunning
                  ? `SHOT ${shotClockText}`
                  : live.shotHold
                    ? `SHOT ${shotClockText} · PAUSED`
                    : `SHOT ${shotClockText} · WITH GAME`}
              </small>
              <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold sm:inline-block">
                SPACE
              </kbd>
            </button>

            <div className="flex min-h-0 min-w-0 flex-col gap-1.5 sm:gap-2">
              <button
                type="button"
                title="Shortcut: press 9"
                onClick={() => resetShotClock(24)}
                className={`relative flex min-h-0 flex-1 items-center justify-center rounded-xl bg-[#1d4ed8] font-extrabold text-white transition hover:bg-[#1e40af] active:scale-[0.98] ${
                  operatorMode ? 'text-2xl sm:text-4xl lg:text-5xl' : 'min-h-[41px] text-xl sm:text-2xl'
                }`}
              >
                +24
                <kbd className="pointer-events-none absolute right-1.5 top-1 rounded border border-white/70 bg-black/30 px-1 text-[9px] font-bold">
                  9
                </kbd>
              </button>

              <button
                type="button"
                title="Shortcut: press 0"
                onClick={() => resetShotClock(14)}
                className={`relative flex min-h-0 flex-1 items-center justify-center rounded-xl bg-[#1d4ed8] font-extrabold text-white transition hover:bg-[#1e40af] active:scale-[0.98] ${
                  operatorMode ? 'text-2xl sm:text-4xl lg:text-5xl' : 'min-h-[41px] text-xl sm:text-2xl'
                }`}
              >
                +14
                <kbd className="pointer-events-none absolute right-1.5 top-1 rounded border border-white/70 bg-black/30 px-1 text-[9px] font-bold">
                  0
                </kbd>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}