import { useEffect, useRef, useState } from 'react';
import { useDb } from '../../../context/DbContext';
import { ab, byNumber, fc, ink, nm, per, sheetSides, teamColor } from '../../../lib/format';
import {
  FOUL_TYPES,
  getCoachDisqualification,
  getPlayerDisqualification,
  st,
  staffLabel,
} from '../../../lib/stats';
import type { FoulType, Game, GameEvent, LiveState, Player } from '../../../types';
import { ModalShell } from '../../../shared/ModalShell';

const SHOW_BENCH_STORAGE_KEY = 'officiating:showBenchPlayers';

export type StatActionSpec =
  | { kind: 'pts'; pts: 1 | 2 | 3 }
  | { kind: 'foul' }
  | { kind: 'stat'; stat: string };

interface PlayerPickerModalProps {
  spec?: StatActionSpec;
  action?: StatActionSpec;
  statAction?: StatActionSpec;
  game: Game;
  live: LiveState;
  onClose: () => void;
}

export function PlayerPickerModal({
  spec,
  action,
  statAction,
  game,
  live,
  onClose,
}: PlayerPickerModalProps) {
  const activeSpec = spec ?? action ?? statAction;
  const { db, getTeam, patch } = useDb();
  const teams = sheetSides(game, live);
  const events = game.events ?? [];
  const stats = st(events);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasAnyActive = teams.some((t) => (game.active?.[t]?.length ?? 0) > 0);
  const [typed, setTyped] = useState('');
  const [showBench, setShowBench] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem(SHOW_BENCH_STORAGE_KEY);
      if (saved !== null) return saved === 'true';
    } catch {
      // Ignore storage access errors
    }
    return !hasAnyActive;
  });
  const [foulType, setFoulType] = useState<FoulType>('personal');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!activeSpec) return null;

  const toggleShowBench = () => {
    setShowBench((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SHOW_BENCH_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage access errors
      }
      return next;
    });
  };

  const playersFor = (teamId: number): Player[] => {
    const activeIds = new Set(game.active?.[teamId] ?? []);
    return (db?.players ?? [])
      .filter((p) => {
        if (p.teamId !== teamId) return false;
        if (p.archived && !activeIds.has(p.id)) return false;
        if (!showBench && activeIds.size > 0 && !activeIds.has(p.id)) return false;
        if (typed.trim() && !String(p.number).startsWith(typed.trim())) return false;
        return true;
      })
      .sort((a, b) => {
        const aOn = activeIds.has(a.id) ? 1 : 0;
        const bOn = activeIds.has(b.id) ? 1 : 0;
        return bOn - aOn || byNumber(a.number, b.number);
      });
  };

  const recordPlayerAction = async (player: Player) => {
    const team = getTeam(player.teamId);
    const logTime = `Q${per(live.period)} ${fc(live.clock)}`;
    const nextPlayed = new Set(game.played ?? []);
    nextPlayed.add(player.id);

    if (activeSpec.kind === 'pts') {
      const event: GameEvent = {
        id: Date.now() + Math.random(),
        period: live.period,
        clock: live.clock,
        teamId: player.teamId,
        playerId: player.id,
        type: 'pts',
        pts: activeSpec.pts,
      };

      onClose();
      await patch({
        games: [{ ...game, events: [...events, event], played: [...nextPlayed] }],
        log: `${logTime} | +${activeSpec.pts} ${ab(team)} #${player.number} ${nm(player)}`,
      });
      return;
    }

    if (activeSpec.kind === 'foul') {
      const foulLabel =
        FOUL_TYPES.find(([code]) => code === foulType)?.[1] ?? foulType;
      const dqCheck = getPlayerDisqualification(events, player.id, foulType);

      const event: GameEvent = {
        id: Date.now() + Math.random(),
        period: live.period,
        clock: live.clock,
        teamId: player.teamId,
        playerId: player.id,
        type: 'foul',
        foulType,
        teamFoul: true,
      };

      const dqSuffix =
        dqCheck.disqualified && dqCheck.badge === 'GD'
          ? ` — DISQUALIFIED (${dqCheck.reason})`
          : dqCheck.disqualified
            ? ' — FOULED OUT (5F)'
            : '';

      onClose();
      await patch({
        games: [{ ...game, events: [...events, event], played: [...nextPlayed] }],
        log: `${logTime} | FOUL (${foulLabel}) ${ab(team)} #${player.number} ${nm(player)}${dqSuffix}`,
      });
      return;
    }

    const event: GameEvent = {
      id: Date.now() + Math.random(),
      period: live.period,
      clock: live.clock,
      teamId: player.teamId,
      playerId: player.id,
      type: activeSpec.stat as GameEvent['type'],
    };

    onClose();
    await patch({
      games: [{ ...game, events: [...events, event], played: [...nextPlayed] }],
      log: `${logTime} | ${activeSpec.stat.toUpperCase()} ${ab(team)} #${player.number} ${nm(player)}`,
    });
  };

  const recordStaffOrBenchFoul = async (
    teamId: number,
    who: 'coach' | 'assistant' | 'bench'
  ) => {
    const team = getTeam(teamId);
    const logTime = `Q${per(live.period)} ${fc(live.clock)}`;
    const label = who === 'bench' ? 'Bench' : staffLabel(team, who);
    const prevCoachStatus = getCoachDisqualification(events, teamId);
    const nextCoachStatus = getCoachDisqualification(events, teamId, who);

    const event = {
      id: Date.now() + Math.random(),
      period: live.period,
      clock: live.clock,
      teamId,
      playerId: null,
      type: 'foul',
      foulType: 'technical',
      staff: who,
      teamFoul: false,
    } as GameEvent;

    const ejectionSuffix =
      !prevCoachStatus.ejected && nextCoachStatus.ejected
        ? ` — HEAD COACH DISQUALIFIED (${nextCoachStatus.reason})`
        : '';

    onClose();
    await patch({
      games: [{ ...game, events: [...events, event] }],
      log: `${logTime} | ${label.toUpperCase()} FOUL (T) ${ab(team)} (no team foul)${ejectionSuffix}`,
    });
  };

  const title =
    activeSpec.kind === 'pts'
      ? `Add +${activeSpec.pts} Points`
      : activeSpec.kind === 'foul'
        ? 'Record Foul'
        : `Record ${String(activeSpec.stat ?? 'Stat').toUpperCase()}`;

  return (
    <ModalShell maxWidth="max-w-[1150px]" title={title} onClose={onClose}>
      {/* Jersey Number Input + Foul Type Dropdown + Show Bench Switch */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <input
          ref={inputRef}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && typed.trim()) {
              const matches = teams.flatMap((t) =>
                playersFor(t).filter(
                  (p) =>
                    !(
                      activeSpec.kind === 'foul' &&
                      getPlayerDisqualification(events, p.id).disqualified
                    )
                )
              );
              if (matches.length === 1) {
                e.preventDefault();
                void recordPlayerAction(matches[0]);
              }
            }
          }}
          placeholder="Type jersey number…"
          inputMode="numeric"
          autoComplete="off"
          className="min-w-[180px] flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 py-2 text-white placeholder-[#94a5d4] focus:border-[#8ab4ff] focus:outline-none"
        />

        {activeSpec.kind === 'foul' && (
          <select
            aria-label="Foul type"
            value={foulType}
            onChange={(e) => setFoulType(e.target.value as FoulType)}
            className="h-[42px] rounded-lg border border-[#f2a501]/80 bg-[#0f1a44] px-3 text-sm font-bold text-white focus:border-[#f2a501] focus:outline-none"
          >
            {FOUL_TYPES.map(([code, label]) => (
              <option key={code} value={code} className="bg-[#0a1530] text-white">
                {label}
              </option>
            ))}
          </select>
        )}

        <div
          onClick={toggleShowBench}
          className="flex cursor-pointer select-none items-center gap-2.5 pl-1"
        >
          <button
            type="button"
            role="switch"
            aria-checked={showBench}
            aria-labelledby="show-bench-label"
            onClick={(e) => {
              e.stopPropagation();
              toggleShowBench();
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4f7bff] focus:ring-offset-2 focus:ring-offset-[#0a1530] ${
              showBench ? 'bg-[#2563eb]' : 'bg-[#1e2d63]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                showBench ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span id="show-bench-label" className="text-sm font-semibold text-[#eef2fb]">
            Show bench players
          </span>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {teams.map((t) => {
          const team = getTeam(t);
          const c = teamColor(team);
          const list = playersFor(t);
          const activeSet = new Set(game.active?.[t] ?? []);
          const coachStatus = getCoachDisqualification(events, t);

          return (
            <div
              key={t}
              style={{ borderTopColor: c }}
              className="flex flex-col justify-between rounded-xl border border-[#1a2d6b] border-t-4 bg-[#071233] p-3"
            >
              <div>
                <h4 style={{ color: c }} className="mb-2 text-base font-bold">
                  {team?.name}
                </h4>

                {list.length === 0 ? (
                  <p className="py-4 text-xs text-[#8c9bc4]">No matching players</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {list.map((p) => {
                      const isOnCourt = activeSet.has(p.id);
                      const pfCount = stats[p.id]?.pf || 0;
                      const dq = getPlayerDisqualification(events, p.id);
                      const disabled = activeSpec.kind === 'foul' && dq.disqualified;

                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={disabled}
                          title={dq.reason ?? undefined}
                          onClick={() => void recordPlayerAction(p)}
                          className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            isOnCourt
                              ? 'border-[#16a34a] bg-[#0b3b24] text-white hover:bg-[#0f4d2f]'
                              : 'border-[#1a2d6b] bg-[#0c1738] text-[#cfd8ff] hover:bg-[#13224f]'
                          }`}
                        >
                          <span
                            style={{ backgroundColor: c, color: ink(c) }}
                            className={`inline-flex h-8 min-w-[2.2rem] shrink-0 items-center justify-center rounded-full px-1.5 text-sm font-extrabold ${
                              !isOnCourt ? 'brightness-90 grayscale-[0.6]' : ''
                            }`}
                          >
                            {p.number}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{nm(p)}</span>
                          {(dq.badge || pfCount > 0) && (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                                dq.disqualified
                                  ? 'bg-[#7f1d1d] text-[#fecaca]'
                                  : pfCount === 4
                                    ? 'bg-amber-500 text-black'
                                    : 'bg-[#1f2a4d] text-[#94a5d4]'
                              }`}
                            >
                              {dq.badge === 'GD' ? 'GD' : `${pfCount}F`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Coach / Assistant Coach / Bench Foul Buttons */}
              {activeSpec.kind === 'foul' && (
                <div className="mt-3 border-t border-[#1a2d6b] pt-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#94a5d4]">
                      Coach / Bench Technical
                    </span>
                    {coachStatus.ejected ? (
                      <span
                        title={coachStatus.reason ?? undefined}
                        className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white"
                      >
                        COACH EJECTED (GD)
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#8c9bc4]">
                        {coachStatus.totalBenchTechs > 0
                          ? `${coachStatus.directCoachTechs}/2 C · ${coachStatus.totalBenchTechs}/3 Total`
                          : 'No team foul'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={coachStatus.ejected}
                      title={
                        coachStatus.ejected
                          ? coachStatus.reason ?? 'Head coach ejected'
                          : undefined
                      }
                      onClick={() => void recordStaffOrBenchFoul(t, 'coach')}
                      className="flex-1 rounded-lg border border-amber-500/50 bg-amber-950/60 px-2.5 py-2 text-xs font-bold text-[#fbbf24] transition hover:bg-amber-900/70 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {staffLabel(team, 'coach')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void recordStaffOrBenchFoul(t, 'assistant')}
                      className="flex-1 rounded-lg border border-amber-500/50 bg-amber-950/60 px-2.5 py-2 text-xs font-bold text-[#fbbf24] transition hover:bg-amber-900/70"
                    >
                      {staffLabel(team, 'assistant')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void recordStaffOrBenchFoul(t, 'bench')}
                      className="flex-1 rounded-lg border border-amber-500/50 bg-amber-950/60 px-2.5 py-2 text-xs font-bold text-[#fbbf24] transition hover:bg-amber-900/70"
                    >
                      Bench
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
