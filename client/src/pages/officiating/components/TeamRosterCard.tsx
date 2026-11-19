import { useState, useMemo } from 'react';
import type { Game, Team, Player } from '../../../types';
import { teamColor, byNumber, nm } from '../../../lib/format';
import { KS, Z, type StatKey, getPlayerDisqualification, st } from '../../../lib/stats';

export type RosterSortKey = 'status' | 'number' | 'name' | StatKey;
export type RosterSortState = { key: RosterSortKey; dir: 1 | -1 } | null;

interface TeamRosterCardProps {
  teamId: number;
  game: Game;
  players: Player[];
  team: Team | undefined;
  sort?: RosterSortState;
  onSortChange?: (next: RosterSortState) => void;
}

export function TeamRosterCard({
  teamId,
  game,
  players,
  team,
  sort,
  onSortChange,
}: TeamRosterCardProps) {
  const c = teamColor(team);
  const onCourt = game.active[teamId] ?? [];
  const [localSort, setLocalSort] = useState<RosterSortState>(null);

  const activeSort = sort !== undefined ? sort : localSort;

  const toggleSort = (key: RosterSortKey) => {
    const initialDir: 1 | -1 = key === 'status' || KS.includes(key as StatKey) ? -1 : 1;
    let next: RosterSortState;

    if (!activeSort || activeSort.key !== key) {
      next = { key, dir: initialDir };
    } else if (activeSort.dir === initialDir) {
      next = { key, dir: (initialDir * -1) as 1 | -1 };
    } else {
      next = null;
    }

    if (onSortChange) {
      onSortChange(next);
    } else {
      setLocalSort(next);
    }
  };

  const gameStats = useMemo(() => st(game.events), [game.events]);

  const rows = useMemo(() => {
    return players
      .filter((p) => p.teamId === teamId && (!p.archived || game.played.includes(p.id)))
      .map((p) => {
        const active = onCourt.includes(p.id);
        const s = gameStats[p.id] || Z();
        const dq = getPlayerDisqualification(game.events, p.id);
        return { p, active, s, dq, mustSubOut: active && dq.disqualified };
      })
      .sort((u, v) => {
        const defaultCmp = Number(v.active) - Number(u.active) || byNumber(u.p.number, v.p.number);
        if (!activeSort) return defaultCmp;

        let cmp = 0;
        if (activeSort.key === 'status') cmp = Number(u.active) - Number(v.active);
        else if (activeSort.key === 'number') cmp = byNumber(u.p.number, v.p.number);
        else if (activeSort.key === 'name') cmp = nm(u.p).localeCompare(nm(v.p));
        else cmp = u.s[activeSort.key] - v.s[activeSort.key];

        return cmp !== 0 ? cmp * activeSort.dir : defaultCmp;
      });
  }, [players, teamId, game.played, game.events, onCourt, gameStats, activeSort]);

  const hasSubAlert = rows.some((r) => r.mustSubOut);

  const sortArrow = (k: RosterSortKey) =>
    activeSort?.key === k ? (activeSort.dir > 0 ? ' ▲' : ' ▼') : '';

  return (
    <div
      style={{ borderTopColor: c }}
      className="min-w-0 rounded-xl border border-[#1a2d6b] border-t-4 bg-[#0a1530] p-2.5"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 style={{ color: c }} className="text-sm font-bold">
          {team?.name}{' '}
          <small className="ml-1 font-normal text-[#8c9bc4]">{onCourt.length}/5 on court</small>
        </h3>
        {hasSubAlert && (
          <span className="animate-pulse rounded bg-red-600 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white">
            SUB REQUIRED
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#16224d] text-[10px] uppercase text-[#8c9bc4]">
              <th
                onClick={() => toggleSort('status')}
                className="w-[86px] cursor-pointer select-none px-1.5 py-1.5 text-left hover:text-white"
              >
                Status{sortArrow('status')}
              </th>
              <th
                onClick={() => toggleSort('number')}
                className="w-[38px] cursor-pointer select-none px-1 py-1.5 text-left hover:text-white"
              >
                #{sortArrow('number')}
              </th>
              <th
                onClick={() => toggleSort('name')}
                className="min-w-[14ch] cursor-pointer select-none px-1.5 py-1.5 text-left hover:text-white"
              >
                Player{sortArrow('name')}
              </th>
              {KS.map((k) => (
                <th
                  key={k}
                  onClick={() => toggleSort(k)}
                  className="w-[34px] cursor-pointer select-none px-0.5 py-1.5 text-center hover:text-white"
                >
                  {k.toUpperCase()}
                  {sortArrow(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, active, s, dq, mustSubOut }) => (
              <tr
                key={p.id}
                title={dq.reason ?? undefined}
                className={`h-[32px] border-b border-[#1a2d6b]/70 transition-colors ${
                  mustSubOut
                    ? 'bg-red-950/75 hover:bg-red-950/90'
                    : dq.disqualified
                      ? 'opacity-55 hover:bg-white/[0.03]'
                      : 'hover:bg-white/[0.03]'
                }`}
              >
                <td className="whitespace-nowrap px-1.5 text-[11px]">
                  {mustSubOut ? (
                    <span className="inline-block animate-pulse rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      SUB · {dq.badge}
                    </span>
                  ) : dq.disqualified ? (
                    <span className="font-bold text-[#fca5a5]">✕ {dq.badge}</span>
                  ) : active ? (
                    <b className="text-[#4ade80]">● ACTIVE</b>
                  ) : (
                    <span className="text-[#8c9bc4]">○ BENCH</span>
                  )}
                </td>
                <td className="px-1 font-semibold">{p.number}</td>
                <td className="max-w-[160px] truncate px-1.5 font-medium">{nm(p)}</td>
                {KS.map((k) => (
                  <td key={k} className="px-0.5 text-center">
                    {k === 'pf' && (dq.disqualified || s.pf >= 4) ? (
                      <b className="text-[#f87171]">{s.pf}</b>
                    ) : (
                      s[k] || '-'
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}