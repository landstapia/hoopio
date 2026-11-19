import { useState } from 'react';
import { useDb } from '../../../context/DbContext';
import { ab, byNumber, fc, ink, nm, per, sheetSides, teamColor } from '../../../lib/format';
import { isPlayerDisqualified } from '../../../lib/stats';
import type { Game, LiveState, Player } from '../../../types';
import { ModalShell } from '../../../shared/ModalShell';

export function LineupModal({
  game,
  live,
  onClose,
}: {
  game: Game;
  live: LiveState;
  onClose?: () => void;
}) {
  const { db, getTeam, patch } = useDb();
  const teams = sheetSides(game, live);
  const [saving, setSaving] = useState(false);

  // Always start with no players selected
  const [chosen, setChosen] = useState<Record<number, Set<number>>>(() => {
    const initial: Record<number, Set<number>> = {};
    for (const t of teams) {
      initial[t] = new Set();
    }
    return initial;
  });

  const poolFor = (teamId: number): Player[] =>
    (db?.players ?? [])
      .filter((p) => p.teamId === teamId && (!p.archived || game.active?.[teamId]?.includes(p.id)))
      .sort((a, b) => byNumber(a.number, b.number));

  const fouledOut = (p: Player) => isPlayerDisqualified(game.events, p.id);

  const togglePlayer = (teamId: number, playerId: number) => {
    setChosen((prev) => {
      const next = new Set(prev[teamId] ?? []);
      if (next.has(playerId)) next.delete(playerId);
      else if (next.size < 5) next.add(playerId);
      return { ...prev, [teamId]: next };
    });
  };

  const noActiveTeams = teams.filter((t) => (chosen[t]?.size ?? 0) === 0);
  const hasEmptyLineup = noActiveTeams.length > 0;

  const incompleteTeams = teams.filter((t) => {
    const count = chosen[t]?.size ?? 0;
    const eligible = poolFor(t).filter((p) => !fouledOut(p)).length;
    return count > 0 && count < Math.min(5, eligible);
  });

  const saveLineup = async (skipped = false) => {
    if (saving) return;
    setSaving(true);

    try {
      const nextActive: Record<number, number[]> = { ...(game.active ?? {}) };
      const nextPlayed = new Set(game.played ?? []);

      for (const t of teams) {
        const ids = [...(chosen[t] ?? [])];
        nextActive[t] = ids;
        ids.forEach((id) => nextPlayed.add(id));
      }

      await patch({
        games: [
          {
            ...game,
            active: nextActive,
            played: [...nextPlayed],
            lineupPeriod: live.period,
          },
        ],
        log: skipped
          ? `Q${per(live.period)} ${fc(live.clock)} | LINEUP SKIPPED${
              noActiveTeams.length > 0 ? ' (no active players selected)' : ''
            }`
          : `Q${per(live.period)} ${fc(live.clock)} | LINEUP CONFIRMED`,
      });

      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      maxWidth="max-w-[1400px]"
      title={`Q${per(live.period)} On-Court Lineup`}
      subtitle="Select up to 5 active players per team, or skip to continue without selecting active players"
      onClose={() => void saveLineup(true)}
    >
      {hasEmptyLineup && (
        <div className="mb-3 rounded-xl border border-amber-500/60 bg-amber-950/50 px-3.5 py-2.5 text-sm font-semibold text-[#fbbf24]">
          ⚠ No active players selected for{' '}
          <span className="font-extrabold text-white">
            {noActiveTeams.map((t) => ab(getTeam(t))).join(' & ')}
          </span>
          . Select players to confirm, or click Skip to continue without active players.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {teams.map((t) => {
          const team = getTeam(t);
          const c = teamColor(team);
          const pool = poolFor(t);
          const count = chosen[t]?.size ?? 0;

          return (
            <div
              key={t}
              style={{ borderTopColor: c }}
              className="rounded-xl border border-[#1a2d6b] border-t-4 bg-[#071233] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 style={{ color: c }} className="text-base font-bold">
                  {team?.name}{' '}
                  <small className="font-normal text-[#8c9bc4]">{count}/5 selected</small>
                </h4>
                {count > 0 && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setChosen((prev) => ({ ...prev, [t]: new Set() }))}
                    className="rounded-lg bg-[#2a3f87] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#354fa8] disabled:opacity-40"
                  >
                    Clear
                  </button>
                )}
              </div>

              {pool.length === 0 ? (
                <p className="py-4 text-xs text-[#8c9bc4]">No players on roster</p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {pool.map((p) => {
                    const selected = chosen[t]?.has(p.id) ?? false;
                    const blocked = saving || (!selected && (fouledOut(p) || count >= 5));

                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={blocked}
                        onClick={() => togglePlayer(t, p.id)}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left font-bold transition disabled:opacity-40 ${
                          selected
                            ? 'border-[#16a34a] bg-[#0b3b24] text-white'
                            : 'border-[#1a2d6b] bg-[#0c1738] text-[#8c9bc4] hover:bg-[#13224f]'
                        }`}
                      >
                        <span
                          style={{ backgroundColor: c, color: ink(c) }}
                          className={`inline-flex h-8 min-w-[2.2rem] items-center justify-center rounded-full px-1.5 text-sm font-extrabold ${
                            !selected ? 'brightness-90 grayscale-[0.6]' : ''
                          }`}
                        >
                          {p.number}
                        </span>
                        <span className="flex-1 truncate">{nm(p)}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                            selected
                              ? 'bg-[#15803d] text-white'
                              : fouledOut(p)
                                ? 'bg-[#7f1d1d] text-[#fecaca]'
                                : 'bg-[#1f2a4d] text-[#8c9bc4]'
                          }`}
                        >
                          {selected ? '✓ ON' : fouledOut(p) ? '5 FOULS' : 'BENCH'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-[#1a2d6b] pt-3">
        {incompleteTeams.length > 0 && (
          <span className="mr-auto text-sm font-semibold text-[#fbbf24]">
            ⚠{' '}
            {incompleteTeams
              .map((t) => `${ab(getTeam(t))} has ${chosen[t]?.size ?? 0}/5 selected`)
              .join(' · ')}
          </span>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={() => void saveLineup(true)}
          className="rounded-xl border border-[#3a4a8f] bg-[#16224d] px-4 py-2 font-bold text-[#eef2fb] transition hover:bg-[#243675] disabled:opacity-40"
        >
          {saving ? 'Skipping…' : 'Skip'}
        </button>

        <button
          type="button"
          disabled={saving || hasEmptyLineup}
          onClick={() => void saveLineup(false)}
          className="rounded-xl bg-[#15803d] px-5 py-2 font-bold text-white transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm lineup
        </button>
      </div>
    </ModalShell>
  );
}