import { useState } from 'react';
import { useDb } from '../../../context/DbContext';
import { ab, per, sheetSides } from '../../../lib/format';
import type { Game, LiveState } from '../../../types';
import { ModalShell } from '../../../shared/ModalShell';

interface GameGearModalProps {
  game: Game;
  live: LiveState;
  buzzHere: boolean;
  setBuzzHere: (value: boolean) => void;
  onOpenLineup: () => void;
  onStepPeriod: (dir?: 1 | -1) => void;
  onClose: () => void;
}

export function GameGearModal({
  game,
  live,
  buzzHere,
  setBuzzHere,
  onOpenLineup,
  onStepPeriod,
  onClose,
}: GameGearModalProps) {
  const { getTeam, patch } = useDb();
  const teams = sheetSides(game, live);

  const [nameDrafts, setNameDrafts] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const t of teams) {
      initial[t] = live.names[t] || '';
    }
    return initial;
  });

  const getTeamLabels = (teamId: number) => {
    const team = getTeam(teamId);
    const initials = ab(team);
    const customShort = live.names[teamId]?.trim();
    const shortName =
      customShort && customShort !== initials ? customShort : team?.name || '';
    return {
      initials,
      shortName: shortName !== initials ? shortName : '',
    };
  };

  const adjustTimeout = async (teamId: number, delta: 1 | -1) => {
    const team = getTeam(teamId);
    const current = live.timeouts[teamId] || 0;
    const next = Math.max(0, current + delta);
    if (next === current) return;

    await patch({
      live: {
        timeouts: {
          ...live.timeouts,
          [teamId]: next,
        },
      },
      log: `Controls: timeouts ${ab(team)} ${delta > 0 ? '+1' : '−1'} (${next} left)`,
    });
  };

  const handleSaveTeamName = async (teamId: number) => {
    const team = getTeam(teamId);
    const trimmed = (nameDrafts[teamId] || '').trim().slice(0, 10);
    setNameDrafts((prev) => ({ ...prev, [teamId]: trimmed }));
    await patch({
      live: {
        names: {
          ...live.names,
          [teamId]: trimmed,
        },
      },
      log: trimmed
        ? `Controls: ${ab(team)} scoreboard label set to "${trimmed}"`
        : `Controls: ${ab(team)} scoreboard label reset`,
    });
  };

  const toggleSwapSides = async () => {
    const nextSwap = !live.swap;
    await patch({
      live: { swap: nextSwap },
      log: 'Team sides swapped on the scoreboard',
    });
  };

  const toggleFinalStatus = async () => {
    const isFinal = game.status === 'final';
    const nextStatus = isFinal ? 'live' : 'final';
    await patch({
      games: [{ ...game, status: nextStatus }],
      ...(nextStatus === 'final' ? { live: { running: false } } : {}),
      log: `Controls: game marked as ${nextStatus.toUpperCase()}`,
    });
  };

  const isFinal = game.status === 'final';

  return (
    <ModalShell
      maxWidth="max-w-[560px]"
      title="Game controls"
      subtitle="Custom functions"
      onClose={onClose}
    >
      <div className="space-y-3">
        {/* Section 1: Manual Timeout Correction */}
        <div className="space-y-2.5 rounded-xl border border-[#1a2d6b] bg-[#0a1530]/70 p-3">
          <div className="border-b border-[#1a2d6b] pb-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#eef2fb]">
              Manual Timeout Correction
            </h4>
            <p className="text-[11px] text-[#8c9bc4]">Adjust remaining team timeouts directly</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {teams.map((t) => {
              const { initials, shortName } = getTeamLabels(t);
              const timeoutsLeft = live.timeouts[t] || 0;

              return (
                <div key={t} className="flex flex-col gap-1.5">
                  <div className="flex flex-col text-center">
                    <span className="text-[13px] font-bold text-[#eef2fb]">{initials}</span>
                    {shortName && (
                      <span className="truncate text-[10px] font-medium text-[#8c9bc4]">{shortName}</span>
                    )}
                    <b className="mt-0.5 text-base text-white">{timeoutsLeft} left</b>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={timeoutsLeft === 0}
                      onClick={() => adjustTimeout(t, -1)}
                      className="min-h-[42px] rounded-xl bg-[#7f1d1d] text-sm font-bold text-white transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustTimeout(t, 1)}
                      className="min-h-[42px] rounded-xl bg-[#166534] text-sm font-bold text-white transition hover:bg-[#15803d]"
                    >
                      +1
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Period & Lineup */}
        <div className="space-y-2.5 rounded-xl border border-[#1a2d6b] bg-[#0a1530]/70 p-3">
          <div className="flex items-center justify-between border-b border-[#1a2d6b] pb-1.5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#eef2fb]">
                Period &amp; Lineup
              </h4>
              <p className="text-[11px] text-[#8c9bc4]">
                Step game periods or update on-court starters
              </p>
            </div>
            <b className="text-sm font-extrabold text-[#f2a501]">Period {per(live.period)}</b>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={live.period <= 1}
              onClick={() => onStepPeriod(-1)}
              className="min-h-[42px] rounded-xl bg-[#2a3f87] px-2 text-xs font-extrabold text-white transition hover:bg-[#354fa8] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
            >
              −1 Period
            </button>
            <button
              type="button"
              onClick={() => onStepPeriod(1)}
              className="min-h-[42px] rounded-xl bg-[#2a3f87] px-2 text-xs font-extrabold text-white transition hover:bg-[#354fa8] sm:text-sm"
            >
              +1 Period
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLineup();
              }}
              className="min-h-[42px] rounded-xl bg-[#0e7490] px-2 text-xs font-extrabold text-white transition hover:bg-[#155e75] sm:text-sm"
            >
              Edit Lineup
            </button>
          </div>
        </div>

        {/* Section 3: Scoreboard Display & Game State */}
        <div className="space-y-2.5 rounded-xl border border-[#1a2d6b] bg-[#0a1530]/70 p-3">
          <h4 className="border-b border-[#1a2d6b] pb-1.5 text-xs font-bold uppercase tracking-wider text-[#eef2fb]">
            Scoreboard &amp; Game Status
          </h4>

          {/* Scoreboard Short Labels */}
          <div className="grid grid-cols-2 gap-2.5">
            {teams.map((t) => {
              const team = getTeam(t);
              const fallback = ab(team);
              return (
                <div key={t} className="space-y-1">
                  <label className="block text-[11px] font-semibold text-[#c7d2fe]">
                    {fallback} scoreboard label
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      maxLength={10}
                      value={nameDrafts[t] ?? ''}
                      onChange={(e) =>
                        setNameDrafts((prev) => ({ ...prev, [t]: e.target.value }))
                      }
                      placeholder={fallback}
                      className="h-[40px] min-w-0 flex-1 rounded-l-xl border border-r-0 border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm font-bold text-white placeholder-[#94a5d4] focus:border-[#4f7bff] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveTeamName(t)}
                      className="h-[40px] shrink-0 rounded-r-xl bg-[#2563eb] px-3 text-xs font-bold text-white transition hover:bg-[#1d4ed8]"
                    >
                      Set
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Swap Sides Switch */}
          <div
            onClick={toggleSwapSides}
            className="flex cursor-pointer select-none items-center justify-between gap-3 pt-0.5"
          >
            <span id="swap-sides-label" className="text-sm text-[#eef2fb]">
              Swap team sides on scoreboard
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={!!live.swap}
              aria-labelledby="swap-sides-label"
              onClick={(e) => {
                e.stopPropagation();
                toggleSwapSides();
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4f7bff] focus:ring-offset-2 focus:ring-offset-[#0a1530] ${
                live.swap ? 'bg-[#2563eb]' : 'bg-[#1e2d63]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  live.swap ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Final Game Status Switch */}
          <div
            onClick={toggleFinalStatus}
            className="flex cursor-pointer select-none items-center justify-between gap-3 py-0.5"
          >
            <span id="game-final-label" className="text-sm text-[#eef2fb]">
              Mark game as final
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isFinal}
              aria-labelledby="game-final-label"
              onClick={(e) => {
                e.stopPropagation();
                toggleFinalStatus();
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4f7bff] focus:ring-offset-2 focus:ring-offset-[#0a1530] ${
                isFinal ? 'bg-[#2563eb]' : 'bg-[#1e2d63]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  isFinal ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section 4: Device Audio */}
        <div className="space-y-2.5 rounded-xl border border-[#1a2d6b] bg-[#0a1530]/70 p-3">
          <h4 className="border-b border-[#1a2d6b] pb-1.5 text-xs font-bold uppercase tracking-wider text-[#eef2fb]">
            Device Audio
          </h4>

          <div
            onClick={() => setBuzzHere(!buzzHere)}
            className="flex cursor-pointer select-none items-center justify-between gap-3 py-0.5"
          >
            <div className="min-w-0">
              <span id="buzz-here-label" className="block text-sm text-[#eef2fb]">
                Buzzer sound on this device
              </span>
              <span className="block text-[11px] text-[#8c9bc4]">
                Play horn and shot-clock buzzer locally on this device
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={buzzHere}
              aria-labelledby="buzz-here-label"
              onClick={(e) => {
                e.stopPropagation();
                setBuzzHere(!buzzHere);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4f7bff] focus:ring-offset-2 focus:ring-offset-[#0a1530] ${
                buzzHere ? 'bg-[#2563eb]' : 'bg-[#1e2d63]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  buzzHere ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end border-t border-[#1a2d6b] pt-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-[#15803d] px-5 py-2.5 font-bold text-white hover:bg-[#166534]"
        >
          Done
        </button>
      </div>
    </ModalShell>
  );
}