import { useEffect, useRef, useState } from 'react';
import { useDb } from '../../../context/DbContext';
import { ab, byNumber, fc, ink, nm, per, sheetSides, teamColor } from '../../../lib/format';
import { isPlayerDisqualified } from '../../../lib/stats';
import type { Game, LiveState, Player } from '../../../types';
import { ModalShell } from '../../../shared/ModalShell';

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

  const fouledOut = (p: Player) => isPlayerDisqualified(game.events, p.id);

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
    if ((chosen[t]?.size ?? 0) === 0) {
      warnings.push(`No active players selected for ${ab(getTeam(t))}`);
    } else if ((chosen[t]?.size ?? 0) < Math.min(5, eligibleCount)) {
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
    <ModalShell
      maxWidth="max-w-[1400px]"
      title="Substitution"
      subtitle="Tap an active player (left) to move to bench · tap a bench player (right) to put on court (max 5) · confirm when finished"
      onClose={onClose}
    >
      <input
        ref={inputRef}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="Type a number to find a player (both teams)…"
        inputMode="numeric"
        autoComplete="off"
        className="mb-2.5 w-full rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 py-2 text-white placeholder-[#94a5d4] focus:border-[#8ab4ff] focus:outline-none"
      />

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        {teams.map((t) => {
          const team = getTeam(t);
          const c = teamColor(team);
          const d = diffFor(t);
          const shown = poolFor(t).filter((p) => String(p.number).startsWith(typed.trim()));
          const activePlayers = shown.filter((p) => chosen[t]?.has(p.id));
          const benchPlayers = shown.filter((p) => !chosen[t]?.has(p.id));

          return (
            <div
              key={t}
              style={{ borderTopColor: c }}
              className="rounded-xl border border-[#1a2d6b] border-t-4 bg-[#071233] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 style={{ color: c }} className="text-base font-bold">
                  {team?.name}{' '}
                  <small className="font-normal text-[#8c9bc4]">
                    {chosen[t]?.size ?? 0}/5 on court
                    {d.out.length + d.inn.length > 0 ? ` · ${d.out.length + d.inn.length} change(s)` : ''}
                  </small>
                </h4>
                <button
                  type="button"
                  onClick={() => setChosen((prev) => ({ ...prev, [t]: new Set() }))}
                  className="rounded-lg bg-[#2a3f87] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#354fa8]"
                >
                  Clear selection
                </button>
              </div>

              {/* Two Columns per Team: Left = Active (On Court), Right = Benched */}
              <div className="grid grid-cols-2 gap-2">
                {/* Left Column: Active Players */}
                <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-[#162963] bg-[#0a1530]/70 p-2">
                  <div className="border-b border-[#1a2d6b] pb-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                    Active ({activePlayers.length}/5)
                  </div>

                  {activePlayers.length === 0 ? (
                    <small className="py-3 text-center text-[#8c9bc4]">
                      {typed.trim() ? 'No match' : 'No active players'}
                    </small>
                  ) : (
                    activePlayers.map((p) => {
                      const was = start[t]?.has(p.id) ?? false;
                      const tag = was ? '✓ ON' : '✓ IN';

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleSub(t, p.id)}
                          className={`flex min-w-0 items-center gap-1.5 rounded-xl border-2 border-[#16a34a] bg-[#0b3b24] px-2 py-1.5 text-left font-bold text-white transition hover:bg-[#0f4d2f] sm:gap-2 sm:px-2.5 sm:py-2 ${
                            !was ? 'ring-2 ring-[#f2a501]' : ''
                          }`}
                        >
                          <span
                            style={{ backgroundColor: c, color: ink(c) }}
                            className="inline-flex h-7 min-w-[2rem] shrink-0 items-center justify-center rounded-full px-1 text-xs font-extrabold sm:h-8 sm:min-w-[2.2rem] sm:px-1.5 sm:text-sm"
                          >
                            {p.number}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs sm:text-sm">{nm(p)}</span>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold sm:px-2 sm:text-[11px] ${
                              !was ? 'bg-[#22c55e] text-[#052e16]' : 'bg-[#15803d] text-white'
                            }`}
                          >
                            {tag}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Right Column: Benched Players */}
                <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-[#162963] bg-[#0a1530]/40 p-2">
                  <div className="border-b border-[#1a2d6b] pb-1 text-[11px] font-extrabold uppercase tracking-wider text-[#94a5d4]">
                    Bench ({benchPlayers.length})
                  </div>

                  {benchPlayers.length === 0 ? (
                    <small className="py-3 text-center text-[#8c9bc4]">
                      {typed.trim() ? 'No match' : 'No benched players'}
                    </small>
                  ) : (
                    benchPlayers.map((p) => {
                      const was = start[t]?.has(p.id) ?? false;
                      const blocked = fouledOut(p) || (chosen[t]?.size ?? 0) >= 5;
                      const tag = was ? 'OFF' : fouledOut(p) ? '5 FOULS' : 'BENCH';

                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={blocked}
                          onClick={() => toggleSub(t, p.id)}
                          className={`flex min-w-0 items-center gap-1.5 rounded-xl border-2 border-[#1a2d6b] bg-[#0c1738] px-2 py-1.5 text-left font-bold text-[#8c9bc4] transition hover:bg-[#13224f] disabled:opacity-40 sm:gap-2 sm:px-2.5 sm:py-2 ${
                            was ? 'ring-2 ring-[#f2a501]' : ''
                          }`}
                        >
                          <span
                            style={{ backgroundColor: c, color: ink(c) }}
                            className="inline-flex h-7 min-w-[2rem] shrink-0 items-center justify-center rounded-full px-1 text-xs font-extrabold brightness-90 grayscale-[0.6] sm:h-8 sm:min-w-[2.2rem] sm:px-1.5 sm:text-sm"
                          >
                            {p.number}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs sm:text-sm">{nm(p)}</span>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold sm:px-2 sm:text-[11px] ${
                              was ? 'bg-[#7f1d1d] text-[#fecaca]' : 'bg-[#1f2a4d] text-[#8c9bc4]'
                            }`}
                          >
                            {tag}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
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