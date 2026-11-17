import { useState } from 'react';
import { useDb } from '../../context/DbContext';
import { ab, byNumber, ink, nm, per, sheetSides, teamColor } from '../../lib/format';
import { st } from '../../lib/stats';
import type { Game, LiveState, Player } from '../../types';
import { ModalShell } from '../shared/ModalShell';

export function LineupModal({ game, live }: { game: Game; live: LiveState }) {
  const { db, getTeam, patch } = useDb();
  const teams = sheetSides(game, live);
  const stats = st(game.events);

  const poolFor = (teamId: number): Player[] =>
    (db?.players ?? [])
      .filter((p) => p.teamId === teamId && !p.archived && (stats[p.id]?.pf || 0) < 5)
      .sort((a, b) => byNumber(a.number, b.number));

  const [chosen, setChosen] = useState<Record<number, Set<number>>>(() => {
    const init: Record<number, Set<number>> = {};
    for (const t of teams) {
      const eligible = new Set(poolFor(t).map((p) => p.id));
      init[t] = new Set((game.active[t] ?? []).filter((id) => eligible.has(id)));
    }
    return init;
  });

  const togglePlayer = (teamId: number, playerId: number) => {
    setChosen((prev) => {
      const next = new Set(prev[teamId] ?? []);
      if (next.has(playerId)) next.delete(playerId);
      else if (next.size < 5) next.add(playerId);
      return { ...prev, [teamId]: next };
    });
  };

  const clearTeam = (teamId: number) => {
    setChosen((prev) => ({ ...prev, [teamId]: new Set() }));
  };

  const ready = teams.every((t) => {
    const need = Math.min(5, poolFor(t).length);
    return (chosen[t]?.size ?? 0) === need;
  });

  const confirmLineup = async () => {
    const nextActive = { ...game.active };
    const nextPlayed = new Set(game.played);
    const logParts: string[] = [];

    for (const t of teams) {
      const ids = [...(chosen[t] ?? [])];
      nextActive[t] = ids;
      ids.forEach((id) => nextPlayed.add(id));
      const nums = ids
        .map((id) => `#${db?.players.find((p) => p.id === id)?.number ?? '?'}`)
        .join(',');
      logParts.push(`${ab(getTeam(t))} ${nums}`);
    }

    const updatedGame: Game = {
      ...game,
      active: nextActive,
      played: [...nextPlayed],
      lineupPeriod: live.period,
      status: game.status === 'scheduled' ? 'live' : game.status,
    };

    await patch({
      games: [updatedGame],
      log: `LINEUP period ${per(live.period)}: ${logParts.join(' | ')}`,
    });
  };

  return (
    <ModalShell maxWidth="max-w-[1400px]" dismissable={false}>
      <h3 className="mb-3 text-lg font-bold text-[#eef2fb]">
        Select the active players ·{' '}
        <span className="text-sm font-normal text-[#8c9bc4]">
          {live.period > 1 || game.lineupPeriod ? `period ${per(live.period)}` : 'start of game'}
        </span>
      </h3>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {teams.map((t) => {
          const team = getTeam(t);
          const c = teamColor(team);
          const players = poolFor(t);
          const need = Math.min(5, players.length);
          const sel = chosen[t] ?? new Set();

          return (
            <div
              key={t}
              style={{ borderTopColor: c }}
              className="rounded-xl border border-[#1a2d6b] border-t-4 bg-[#071233] p-3"
            >
              <h4 style={{ color: c }} className="mb-2 text-base font-bold">
                {team?.name}{' '}
                <small className="font-normal text-[#8c9bc4]">
                  {sel.size}/{need} selected
                </small>
              </h4>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {players.length === 0 ? (
                  <small className="text-[#8c9bc4]">No players on this team</small>
                ) : (
                  players.map((p) => {
                    const isSelected = sel.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlayer(t, p.id)}
                        className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left font-bold transition ${
                          isSelected
                            ? 'border-[#f2a501] bg-[#1a3690] text-white'
                            : 'border-[#1a2d6b] bg-[#2a3f87]/70 text-[#eef2fb] hover:bg-[#2a3f87]'
                        }`}
                      >
                        <span
                          style={{ backgroundColor: c, color: ink(c) }}
                          className="inline-flex h-8 min-w-[2.2rem] items-center justify-center rounded-full px-1.5 text-sm font-extrabold"
                        >
                          {p.number}
                        </span>
                        <span className="truncate">{nm(p)}</span>
                      </button>
                    );
                  })
                )}
              </div>
              <button
                type="button"
                onClick={() => clearTeam(t)}
                className="mt-2.5 rounded-lg bg-[#2a3f87] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#354fa8]"
              >
                Clear selection
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end border-t border-[#1a2d6b] pt-3">
        <button
          type="button"
          disabled={!ready}
          onClick={confirmLineup}
          className="rounded-xl bg-[#15803d] px-5 py-2.5 font-bold text-white transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm players &amp; continue
        </button>
      </div>
    </ModalShell>
  );
}