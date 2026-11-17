import { useEffect, useRef, useState } from 'react';
import { useDb } from '../../context/DbContext';
import { ab, byNumber, fc, ink, nm, per, sheetSides, teamColor } from '../../lib/format';
import { st } from '../../lib/stats';
import type { Game, LiveState, Player } from '../../types';
import { ModalShell } from '../shared/ModalShell';

export function SubModal({
  game,
  live,
  onClose,
}: {
  game: Game;
  live: LiveState;
  onClose: () => void;
}) {
  const { db, getTeam, getPlayer, patch } = useDb();
  const teams = sheetSides(game, live);
  const stats = st(game.events);
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [start] = useState<Record<number, Set<number>>>(() => {
    const s: Record<number, Set<number>> = {};
    for (const t of teams) s[t] = new Set(game.active[t] ?? []);
    return s;
  });

  const [chosen, setChosen] = useState<Record<number, Set<number>>>(() => {
    const c: Record<number, Set<number>> = {};
    for (const t of teams) c[t] = new Set(game.active[t] ?? []);
    return c;
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const poolFor = (teamId: number): Player[] =>
    (db?.players ?? [])
      .filter((p) => p.teamId === teamId && (!p.archived || start[teamId]?.has(p.id)))
      .sort((a, b) => byNumber(a.number, b.number));

  const fouledOut = (p: Player) => (stats[p.id]?.pf || 0) >= 5;

  const diffFor = (teamId: number) => {
    const s = start[teamId] ?? new Set();
    const c = chosen[teamId] ?? new Set();
    return {
      out: [...s].filter((id) => !c.has(id)),
      inn: [...c].filter((id) => !s.has(id)),
    };
  };

  let totalChanges = 0;
  const warnings: string[] = [];
  for (const t of teams) {
    const d = diffFor(t);
    totalChanges += d.out.length + d.inn.length;
    const eligibleCount = poolFor(t).filter((p) => !fouledOut(p)).length;
    if ((chosen[t]?.size ?? 0) < Math.min(5, eligibleCount)) {
      warnings.push(`${ab(getTeam(t))} has only ${chosen[t]?.size ?? 0} on court`);
    }
  }

  const toggleSub = (teamId: number, playerId: number) => {
    setChosen((prev) => {
      const next = new Set(prev[teamId] ?? []);
      if (next.has(playerId)) next.delete(playerId);
      else if (next.size < 5) next.add(playerId);
      return { ...prev, [teamId]: next };
    });
  };

  const confirmSub = async () => {
    const nextEvents = [...game.events];
    const nextActive = { ...game.active };
    const nextPlayed = new Set(game.played);
    const lines: string[] = [];

    for (const t of teams) {
      const d = diffFor(t);
      const pairs = Math.min(d.out.length, d.inn.length);

      d.out.forEach((outId, i) => {
        nextEvents.push({
          id: Date.now() + Math.random(),
          period: live.period,
          clock: live.clock,
          teamId: t,
          playerId: d.inn[i] ?? null,
          outId,
          type: 'sub',
        });
      });

      d.inn.slice(pairs).forEach((inId) => {
        nextEvents.push({
          id: Date.now() + Math.random(),
          period: live.period,
          clock: live.clock,
          teamId: t,
          playerId: inId,
          outId: null,
          type: 'sub',
        });
      });

      let list = [...(nextActive[t] ?? [])];
      d.out.forEach((outId, i) => {
        list = d.inn[i] ? list.map((x) => (x === outId ? d.inn[i] : x)) : list.filter((x) => x !== outId);
      });
      nextActive[t] = list.concat(d.inn.slice(pairs));
      d.inn.forEach((id) => nextPlayed.add(id));

      if (d.out.length || d.inn.length) {
        const outStr = d.out.map((id) => `#${getPlayer(id)?.number ?? '?'}`).join(',') || '-';
        const inStr = d.inn.map((id) => `#${getPlayer(id)?.number ?? '?'}`).join(',') || '-';
        lines.push(`${ab(getTeam(t))} out ${outStr} / in ${inStr}`);
      }
    }

    onClose();
    await patch({
      games: [{ ...game, events: nextEvents, active: nextActive, played: [...nextPlayed] }],
      log: `Q${per(live.period)} ${fc(live.clock)} | SUBSTITUTION ${lines.join(' | ') || 'no change'}`,
    });
  };

  return (
    <ModalShell maxWidth="max-w-[1400px]" onClose={onClose}>
      <h3 className="mb-2 pr-10 text-lg font-bold text-[#eef2fb]">
        Substitution{' '}
        <small className="block text-xs font-normal text-[#8c9bc4]">
          tap an active player to take him off · tap a bench player to put him on (max 5) · confirm when finished
        </small>
      </h3>

      <input
        ref={inputRef}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="Type a number to find a player (both teams)…"
        inputMode="numeric"
        autoComplete="off"
        className="mb-2.5 w-full rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 py-2 text-white placeholder-[#94a5d4] focus:border-[#8ab4ff] focus:outline-none"
      />

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {teams.map((t) => {
          const team = getTeam(t);
          const c = teamColor(team);
          const d = diffFor(t);
          const shown = poolFor(t).filter((p) => String(p.number).startsWith(typed.trim()));

          return (
            <div
              key={t}
              style={{ borderTopColor: c }}
              className="rounded-xl border border-[#1a2d6b] border-t-4 bg-[#071233] p-3"
            >
              <h4 style={{ color: c }} className="mb-2 text-base font-bold">
                {team?.name}{' '}
                <small className="font-normal text-[#8c9bc4]">
                  {chosen[t]?.size ?? 0}/5 on court
                  {d.out.length + d.inn.length > 0 ? ` · ${d.out.length + d.inn.length} change(s)` : ''}
                </small>
              </h4>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {shown.length === 0 ? (
                  <small className="text-[#8c9bc4]">No match</small>
                ) : (
                  shown.map((p) => {
                    const on = chosen[t]?.has(p.id) ?? false;
                    const was = start[t]?.has(p.id) ?? false;
                    const blocked = !on && (fouledOut(p) || (chosen[t]?.size ?? 0) >= 5);
                    const tag = on ? (was ? '✓ ON' : '✓ IN') : was ? 'OFF' : fouledOut(p) ? '5 FOULS' : 'BENCH';

                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={blocked}
                        onClick={() => toggleSub(t, p.id)}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left font-bold transition disabled:opacity-40 ${
                          on
                            ? 'border-[#16a34a] bg-[#0b3b24] text-white'
                            : 'border-[#1a2d6b] bg-[#0c1738] text-[#8c9bc4]'
                        } ${on !== was ? 'ring-2 ring-[#f2a501]' : ''}`}
                      >
                        <span
                          style={{ backgroundColor: c, color: ink(c) }}
                          className={`inline-flex h-8 min-w-[2.2rem] items-center justify-center rounded-full px-1.5 text-sm font-extrabold ${
                            !on ? 'brightness-90 grayscale-[0.6]' : ''
                          }`}
                        >
                          {p.number}
                        </span>
                        <span className="flex-1 truncate">{nm(p)}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                            on
                              ? on !== was
                                ? 'bg-[#22c55e] text-[#052e16]'
                                : 'bg-[#15803d] text-white'
                              : on !== was
                                ? 'bg-[#7f1d1d] text-[#fecaca]'
                                : 'bg-[#1f2a4d] text-[#8c9bc4]'
                          }`}
                        >
                          {tag}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <button
                type="button"
                onClick={() => setChosen((prev) => ({ ...prev, [t]: new Set() }))}
                className="mt-2.5 rounded-lg bg-[#2a3f87] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#354fa8]"
              >
                Clear selection
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-[#1a2d6b] pt-3">
        {warnings.length > 0 && (
          <span className="mr-auto text-sm font-semibold text-[#fbbf24]">⚠ {warnings.join(' · ')}</span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-[#2a3f87] px-4 py-2 font-bold text-white hover:bg-[#354fa8]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!totalChanges}
          onClick={confirmSub}
          className="rounded-xl bg-[#15803d] px-5 py-2 font-bold text-white hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {totalChanges ? `Confirm substitution (${totalChanges})` : 'Confirm substitution'}
        </button>
      </div>
    </ModalShell>
  );
}