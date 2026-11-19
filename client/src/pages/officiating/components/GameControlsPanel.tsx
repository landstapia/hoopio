import { ArrowLeftRight, Settings, SkipForward } from 'lucide-react';
import type { LiveState, Team } from '../../../types';
import { ab, toText } from '../../../lib/format';

interface GameControlsPanelProps {
  live: LiveState;
  teams: number[];
  operatorMode?: boolean;
  getTeamFn: (id: number) => Team | undefined;
  handleTimeoutButton: () => void;
  handleBreakButton: () => void;
  buzzStart: () => void;
  buzzStop: () => void;
  buzzLong: () => void;
  openSubstitutions: () => void;
  onNextPeriod: () => void;
  openHotkeys: () => void;
  openGearGame: () => void;
}

export function GameControlsPanel({
  live,
  teams,
  operatorMode = false,
  getTeamFn,
  handleTimeoutButton,
  handleBreakButton,
  buzzStart,
  buzzStop,
  buzzLong,
  openSubstitutions,
  onNextPeriod,
  openHotkeys,
  openGearGame,
}: GameControlsPanelProps) {
  const isTimeoutActive = live.toKind === 'timeout';
  const isBreakActive = live.toKind === 'break';

  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col gap-2 rounded-xl border border-[#1a2d6b] bg-[#0a1530] p-2.5 ${
        operatorMode ? 'flex-1' : ''
      }`}
    >
      {!operatorMode && (
        <div className="flex shrink-0 items-center gap-2">
          <h5 className="text-xs font-bold tracking-widest text-[#8c9bc4]">GAME CONTROLS</h5>
          <span className="flex-1" />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onNextPeriod}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[#3a4a8f] bg-[#16224d] px-2.5 text-xs font-bold text-[#eef2fb] transition hover:bg-[#243675] active:scale-[0.98]"
            >
              <SkipForward className="h-3.5 w-3.5" />
              <span>Next Period</span>
            </button>
            <button
              type="button"
              onClick={openHotkeys}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3a4a8f] bg-[#16224d] text-sm font-bold text-[#cfd8ff] transition hover:bg-[#243675] active:scale-[0.98]"
            >
              ?
            </button>
            <button
              type="button"
              aria-label="Game settings"
              onClick={openGearGame}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3a4a8f] bg-[#16224d] text-[#cfd8ff] hover:bg-[#243675]"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Subheader Sections: Stoppages & Buzzer (3/4) + Lineup (1/4) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[3fr_1fr]">
        {/* Section 1: Timeout -> Break -> Stacked Buzzers */}
        <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
          {!operatorMode && (
            <h6 className="shrink-0 border-b border-[#1a2d6b] pb-1 text-[11px] font-bold uppercase tracking-wider text-[#94a5d4]">
              Stoppages &amp; Buzzer
            </h6>
          )}
          <div className="grid min-h-0 min-w-0 flex-1 grid-cols-3 gap-1.5">
            {/* 1. Timeout / End Timeout (disabled during Break) */}
            <button
              type="button"
              disabled={isBreakActive}
              onClick={handleTimeoutButton}
              className={`flex min-h-0 min-w-0 flex-col items-center justify-center rounded-xl bg-[#facc15] px-2 text-center font-extrabold text-[#1a1200] transition hover:bg-[#fde047] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#facc15] disabled:active:scale-100 ${
                operatorMode ? '' : 'min-h-[82px]'
              }`}
            >
              <span
                className={`max-w-full truncate ${
                  operatorMode ? 'text-sm sm:text-lg lg:text-xl' : 'text-xs sm:text-sm'
                }`}
              >
                {isTimeoutActive ? 'END TIMEOUT' : 'TIMEOUT'}
              </span>
              <small
                className={`mt-0.5 max-w-full truncate font-bold ${
                  operatorMode ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-[11px]'
                }`}
              >
                {isTimeoutActive
                  ? `${live.toTeam != null ? `${ab(getTeamFn(live.toTeam))} · ` : ''}${toText(live.toLeft)} LEFT${
                      live.toSuspended ? ' · SUSP' : ''
                    }`
                  : teams.map((t) => `${ab(getTeamFn(t))} ${live.timeouts[t] || 0}`).join(' · ')}
              </small>
            </button>

            {/* 2. Break / End Break (disabled during Timeout) */}
            <button
              type="button"
              disabled={isTimeoutActive}
              onClick={handleBreakButton}
              className={`flex min-h-0 min-w-0 flex-col items-center justify-center rounded-xl bg-[#6d28d9] px-2 text-center font-extrabold text-white transition hover:bg-[#5b21b6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#6d28d9] disabled:active:scale-100 ${
                operatorMode ? '' : 'min-h-[82px]'
              }`}
            >
              <span
                className={`max-w-full truncate ${
                  operatorMode ? 'text-sm sm:text-lg lg:text-xl' : 'text-xs sm:text-sm'
                }`}
              >
                {isBreakActive ? 'END BREAK' : 'BREAK'}
              </span>
              {isBreakActive && (
                <small
                  className={`mt-0.5 max-w-full truncate font-bold ${
                    operatorMode ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-[11px]'
                  }`}
                >
                  {toText(live.toLeft)} LEFT{live.toSuspended ? ' · SUSP' : ''}
                </small>
              )}
            </button>

            {/* 3. Stacked Buzzer (Hold) / Long Buzzer */}
            <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
              <button
                type="button"
                title="Hold button or Backspace key to sound"
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={buzzStart}
                onPointerUp={buzzStop}
                onPointerLeave={buzzStop}
                className={`relative flex min-h-[38px] min-w-0 flex-1 touch-none select-none flex-col items-center justify-center rounded-xl bg-[#854d0e] px-2 text-center font-extrabold leading-tight text-white transition hover:bg-[#713f12] ${
                  operatorMode ? 'text-sm sm:text-lg lg:text-xl' : 'text-xs sm:text-sm'
                }`}
              >
                <span>BUZZER</span>
                <small className="text-[9px] font-bold opacity-90 sm:text-[10px]">HOLD</small>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[9px] font-bold sm:inline-block">
                  BACKSPACE
                </kbd>
              </button>

              <button
                type="button"
                onClick={buzzLong}
                className={`flex min-h-[38px] min-w-0 flex-1 items-center justify-center rounded-xl bg-[#b45309] px-2 text-center font-extrabold leading-tight text-white transition hover:bg-[#92400e] active:scale-[0.98] ${
                  operatorMode ? 'text-sm sm:text-lg lg:text-xl' : 'text-xs sm:text-sm'
                }`}
              >
                <span>LONG BUZZER</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Lineup / Substitute */}
        <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
          {!operatorMode && (
            <h6 className="shrink-0 border-b border-[#1a2d6b] pb-1 text-[11px] font-bold uppercase tracking-wider text-[#94a5d4]">
              Lineup
            </h6>
          )}
          <button
            type="button"
            onClick={openSubstitutions}
            className={`flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-[#0e7490] px-3 text-center font-extrabold text-white transition hover:bg-[#155e75] active:scale-[0.98] ${
              operatorMode ? 'text-base sm:text-xl lg:text-2xl' : 'min-h-[82px] text-sm sm:text-base'
            }`}
          >
            <ArrowLeftRight className={operatorMode ? 'h-6 w-6' : 'h-5 w-5'} />
            <span>SUBSTITUTE</span>
            <small className="text-[10px] font-bold tracking-wider opacity-90 sm:text-xs">
              ON-COURT LINEUP
            </small>
          </button>
        </div>
      </div>
    </section>
  );
}