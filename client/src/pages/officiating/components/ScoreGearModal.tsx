import { useState } from 'react';
import { useDb } from '../../../context/DbContext';
import { ab, per, sheetSides } from '../../../lib/format';
import { isTeamFoul, sc, tf } from '../../../lib/stats';
import type { Game, GameEvent, LiveState } from '../../../types';
import { ModalShell } from '../../../shared/ModalShell';

export function ScoreGearModal({
  game,
  live,
  onClose,
}: {
  game: Game;
  live: LiveState;
  onClose: () => void;
}) {
  const { getTeam, patch } = useDb();
  const teams = sheetSides(game, live);
  const [pickBench, setPickBench] = useState(() => localStorage.pickBench === '1');

  const togglePickBench = (next: boolean) => {
    setPickBench(next);
    localStorage.pickBench = next ? '1' : '0';
  };

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

  const adjustTeamFoul = async (teamId: number, delta: 1 | -1) => {
    const team = getTeam(teamId);
    let updatedEvents: GameEvent[];

    if (delta === 1) {
      const event: GameEvent = {
        id: Date.now() + Math.random(),
        period: live.period,
        clock: live.clock,
        teamId,
        playerId: null,
        type: 'foul',
      };
      updatedEvents = [...game.events, event];
    } else {
      // 1. Prefer removing the most recent unattributed manual team foul in this period
      const manualIdx = [...game.events]
        .map((e, i) => ({ e, i }))
        .reverse()
        .find(
          ({ e }) =>
            e.teamId === teamId &&
            e.period === live.period &&
            !e.playerId &&
            !e.staff &&
            isTeamFoul(e),
        )?.i;

      if (manualIdx !== undefined) {
        updatedEvents = game.events.filter((_, i) => i !== manualIdx);
      } else {
        // 2. Otherwise unmark the latest player/staff foul from counting as a team foul
        const foulIdx = [...game.events]
          .map((e, i) => ({ e, i }))
          .reverse()
          .find(({ e }) => e.teamId === teamId && e.period === live.period && isTeamFoul(e))?.i;

        if (foulIdx === undefined) return;
        updatedEvents = game.events.map((e, i) => (i === foulIdx ? { ...e, teamFoul: false } : e));
      }
    }

    const updatedGame: Game = { ...game, events: updatedEvents };
    await patch({
      games: [updatedGame],
      log: `Controls: team foul ${ab(team)} ${delta > 0 ? '+1' : '−1'} (period ${per(live.period)}: ${tf(
        updatedGame,
        teamId,
        live.period,
      )})`,
    });
  };

  const adjustScore = async (teamId: number, delta: number) => {
    const team = getTeam(teamId);
    const currentScore = sc(game, teamId);
    const nextScore = Math.max(0, currentScore + delta);
    const actualDelta = nextScore - currentScore;
    if (actualDelta === 0) return;

    const nextAdj = { ...game.adj, [teamId]: (game.adj[teamId] || 0) + actualDelta };
    const updatedGame: Game = { ...game, adj: nextAdj };
    await patch({
      games: [updatedGame],
      log: `Controls: score ${ab(team)} ${actualDelta > 0 ? '+' : ''}${actualDelta} | score ${sc(
        updatedGame,
        game.home,
      )}-${sc(updatedGame, game.away)}`,
    });
  };

  return (
    <ModalShell
      maxWidth="max-w-[560px]"
      title="Score controls"
      subtitle="Custom functions"
      onClose={onClose}
    >
      <div className="space-y-3">
        {/* Section 1: Manual Team Foul Correction */}
        <div className="space-y-2.5 rounded-xl border border-[#1a2d6b] bg-[#0a1530]/70 p-3">
          <div className="border-b border-[#1a2d6b] pb-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#eef2fb]">
              Manual Team Foul Correction
            </h4>
            <p className="text-[11px] text-[#8c9bc4]">Adjust period team fouls directly</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {teams.map((t) => {
              const { initials, shortName } = getTeamLabels(t);
              const periodFouls = tf(game, t, live.period);

              return (
                <div key={t} className="flex flex-col gap-1.5">
                  <div className="flex flex-col text-center">
                    <span className="text-[13px] font-bold text-[#eef2fb]">{initials}</span>
                    {shortName && (
                      <span className="truncate text-[10px] font-medium text-[#8c9bc4]">{shortName}</span>
                    )}
                    <b className="mt-0.5 text-base text-white">{periodFouls} fouls</b>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={periodFouls === 0}
                      onClick={() => adjustTeamFoul(t, -1)}
                      className="min-h-[42px] rounded-xl bg-[#7f1d1d] text-sm font-bold text-white transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustTeamFoul(t, 1)}
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

        {/* Section 2: Manual Score Correction */}
        <div className="space-y-2.5 rounded-xl border border-[#1a2d6b] bg-[#0a1530]/70 p-3">
          <div className="border-b border-[#1a2d6b] pb-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#eef2fb]">Manual Score Correction</h4>
            <p className="text-[11px] text-[#8c9bc4]">Adjust team totals directly</p>
          </div>
          {teams.map((t) => {
            const { initials, shortName } = getTeamLabels(t);
            const currentScore = sc(game, t);

            return (
              <div key={t} className="space-y-1.5">
                <span className="flex items-center justify-between text-xs font-semibold text-[#c7d2fe]">
                  <span>
                    {initials}
                    {shortName && <span className="ml-1.5 font-normal text-[#8c9bc4]">· {shortName}</span>}
                  </span>
                  <b className="text-base text-white">{currentScore} pts</b>
                </span>
                <div className="grid grid-cols-6 gap-1">
                  {[-3, -2, -1, 1, 2, 3].map((d) => (
                    <button
                      key={d}
                      type="button"
                      disabled={d < 0 && currentScore === 0}
                      onClick={() => adjustScore(t, d)}
                      className={`min-h-[42px] rounded-xl text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        d < 0 ? 'bg-[#7f1d1d] hover:bg-[#991b1b]' : 'bg-[#166534] hover:bg-[#15803d]'
                      }`}
                    >
                      {d < 0 ? `−${Math.abs(d)}` : `+${d}`}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Section 3: Player Picker Display */}
        <div className="space-y-2 rounded-xl border border-[#1a2d6b] bg-[#0a1530]/70 p-3">
          <h4 className="border-b border-[#1a2d6b] pb-1.5 text-xs font-bold uppercase tracking-wider text-[#eef2fb]">
            Player Picker Options
          </h4>
          <div
            onClick={() => togglePickBench(!pickBench)}
            className="flex cursor-pointer select-none items-center justify-between gap-3 py-0.5"
          >
            <span id="pick-bench-label" className="text-sm text-[#eef2fb]">
              Show bench players in the player list
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={pickBench}
              aria-labelledby="pick-bench-label"
              onClick={(e) => {
                e.stopPropagation();
                togglePickBench(!pickBench);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4f7bff] focus:ring-offset-2 focus:ring-offset-[#0a1530] ${
                pickBench ? 'bg-[#2563eb]' : 'bg-[#1e2d63]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  pickBench ? 'translate-x-5' : 'translate-x-0'
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