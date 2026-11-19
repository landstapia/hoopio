import { RotateCcw, Settings } from 'lucide-react';
import type { Team } from '../../../types';
import { ab } from '../../../lib/format';
import type { StatActionSpec } from './PlayerPickerModal';

interface ScoreControlsPanelProps {
  teams: number[];
  currentArrow: number | null;
  canUndo: boolean;
  operatorMode?: boolean;
  getTeamFn: (id: number) => Team | undefined;
  setArrow: (teamId: number | null) => void;
  triggerStatAction: (spec: StatActionSpec) => void;
  undoLast: () => void;
  openGearScore: () => void;
}

export function ScoreControlsPanel({
  teams,
  currentArrow,
  canUndo,
  operatorMode = false,
  getTeamFn,
  setArrow,
  triggerStatAction,
  undoLast,
  openGearScore,
}: ScoreControlsPanelProps) {
  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col gap-2 rounded-xl border border-[#1a2d6b] bg-[#0a1530] p-2.5 ${
        operatorMode ? 'flex-1' : 'flex-[2.2]'
      }`}
    >
      {!operatorMode && (
        <div className="flex shrink-0 items-center gap-2">
          <h5 className="text-xs font-bold tracking-widest text-[#8c9bc4]">SCORE CONTROLS</h5>
          <span className="flex-1" />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!canUndo}
              onClick={undoLast}
              title="Undo last recorded score, foul, stat, sub, or timeout"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[#3a4a8f] bg-[#16224d] px-2.5 text-xs font-bold text-[#eef2fb] transition hover:bg-[#243675] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Undo Last</span>
            </button>
            <button
              type="button"
              aria-label="Score settings"
              onClick={openGearScore}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3a4a8f] bg-[#16224d] text-[#cfd8ff] hover:bg-[#243675]"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[2.3fr_1.25fr_1.15fr]">
        {/* Section 1: Points & Fouls */}
        <div className="flex min-h-0 flex-col gap-1.5">
          {!operatorMode && (
            <h6 className="shrink-0 border-b border-[#1a2d6b] pb-1 text-[11px] font-bold uppercase tracking-wider text-[#94a5d4]">
              Points &amp; Fouls
            </h6>
          )}
          <div className="grid min-h-0 flex-1 grid-cols-4 gap-1.5">
            {(
              [
                [{ kind: 'pts', pts: 1 }, '+1', 'bg-[#1d4ed8] hover:bg-[#1e40af]', '1'],
                [{ kind: 'pts', pts: 2 }, '+2', 'bg-[#1d4ed8] hover:bg-[#1e40af]', '2'],
                [{ kind: 'pts', pts: 3 }, '+3', 'bg-[#1d4ed8] hover:bg-[#1e40af]', '3'],
                [{ kind: 'foul' }, 'FOUL', 'bg-[#b91c1c] hover:bg-[#991b1b]', 'F'],
              ] as Array<[StatActionSpec, string, string, string]>
            ).map(([spec, label, bgCls, shortcut]) => (
              <button
                key={label}
                type="button"
                title={`Shortcut: press ${shortcut}`}
                onClick={() => triggerStatAction(spec)}
                className={`relative flex min-w-0 items-center justify-center rounded-xl font-extrabold text-white transition active:scale-[0.97] ${
                  operatorMode
                    ? 'min-h-0 text-3xl sm:text-4xl lg:text-5xl'
                    : 'min-h-[84px] text-2xl sm:min-h-[88px] sm:text-3xl'
                } ${bgCls}`}
              >
                {label}
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold sm:inline-block">
                  {shortcut}
                </kbd>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Player Stats */}
        <div className="flex min-h-0 flex-col gap-1.5">
          {!operatorMode && (
            <h6 className="shrink-0 border-b border-[#1a2d6b] pb-1 text-[11px] font-bold uppercase tracking-wider text-[#94a5d4]">
              Player Stats
            </h6>
          )}
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-1.5">
            {(['reb', 'ast', 'stl', 'blk', 'to'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => triggerStatAction({ kind: 'stat', stat: k })}
                className={`rounded-xl bg-[#0f766e] font-extrabold text-white transition hover:bg-[#115e59] active:scale-[0.97] ${
                  operatorMode
                    ? 'min-h-0 text-base sm:text-xl lg:text-2xl'
                    : 'min-h-[40px] text-sm'
                }`}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Possession (tap active team again to clear) */}
        <div className="flex min-h-0 flex-col gap-1.5">
          {!operatorMode && (
            <h6 className="shrink-0 border-b border-[#1a2d6b] pb-1 text-[11px] font-bold uppercase tracking-wider text-[#94a5d4]">
              Possession
            </h6>
          )}
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
            {teams.map((t, idx) => {
              const active = currentArrow === t;
              const isLeft = idx === 0;
              const arrowKey = isLeft ? '←' : '→';
              const shortcutTitle = isLeft
                ? 'Shortcut: press Left Arrow'
                : 'Shortcut: press Right Arrow';
              const label = isLeft ? `◀ ${ab(getTeamFn(t))}` : `${ab(getTeamFn(t))} ▶`;

              return (
                <button
                  key={t}
                  type="button"
                  title={shortcutTitle}
                  aria-pressed={active}
                  onClick={() => setArrow(active ? null : t)}
                  className={`relative flex items-center justify-center truncate rounded-xl px-2 font-extrabold transition active:scale-[0.97] ${
                    operatorMode
                      ? 'min-h-0 text-sm sm:text-lg lg:text-xl'
                      : 'min-h-[56px] text-xs sm:text-sm'
                  } ${
                    active
                      ? 'bg-[#29398f] text-white ring-2 ring-inset ring-[#f2a501]'
                      : 'bg-[#1e2a6b] text-[#eef2fb] hover:bg-[#29398f]'
                  }`}
                >
                  {label}
                  <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold sm:inline-block">
                    {arrowKey}
                  </kbd>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
