import { useEffect, useRef, useState } from 'react';
import { useDb } from '../../context/DbContext';
import { ab, byNumber, fc, ink, nm, per, sheetSides, teamColor } from '../../lib/format';
import { FOUL_TYPES, st, staffLabel } from '../../lib/stats';
import type { FoulType, Game, GameEvent, LiveState, Player } from '../../types';
import { ModalShell } from '../shared/ModalShell';

export type StatActionSpec =
  | { kind: 'pts'; pts: 1 | 2 | 3 }
  | { kind: 'foul' }
  | { kind: 'stat'; stat: 'reb' | 'ast' | 'stl' | 'blk' | 'to' };

export function PlayerPickerModal({
  action,
  game,
  live,
  onClose,
}: {
  action: StatActionSpec;
  game: Game;
  live: LiveState;
  onClose: () => void;
}) {
  const { db, getTeam, patch } = useDb();
  const [typed, setTyped] = useState('');
  const [showBench, setShowBench] = useState(() => localStorage.pickBench === '1');
  const [foulType, setFoulType] = useState<FoulType>('personal');
  const [teamFoul, setTeamFoul] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const teams = sheetSides(game, live);
  const title =
    action.kind === 'pts'
      ? `+${action.pts} points`
      : action.kind === 'foul'
        ? 'FOUL'
        : action.stat.toUpperCase();

  const toggleBench = (checked: boolean) => {
    setShowBench(checked);
    localStorage.pickBench = checked ? '1' : '0';
    inputRef.current?.focus();
  };

  const getTeamRows = (teamId: number) => {
    const activeIds = game.active[teamId] ?? [];
    const allPlayers = db?.players ?? [];
    const onCourt = activeIds
      .map((id) => allPlayers.find((p) => p.id === id))
      .filter((p): p is Player => !!p)
      .sort((a, b) => byNumber(a.number, b.number));

    const bench = allPlayers
      .filter((p) => p.teamId === teamId && !p.archived && !activeIds.includes(p.id))
      .sort((a, b) => byNumber(a.number, b.number));

    const match = (p: Player) => String(p.number).startsWith(typed.trim());
    const shown = [...onCourt.filter(match), ...(showBench ? bench.filter(match) : [])];
    const hiddenBenchCount = showBench ? 0 : bench.filter(match).length;
    return { shown, hiddenBenchCount, onCourtCount: activeIds.length };
  };

  const perTeam = teams.map((t) => ({ teamId: t, ...getTeamRows(t) }));
  const allVisible = perTeam.flatMap((x) => x.shown);
  const totalHiddenBench = perTeam.reduce((sum, x) => sum + x.hiddenBenchCount, 0);

  const pickPlayer = async (player: Player) => {
    onClose();
    const evType = action.kind === 'pts' ? 'pts' : action.kind === 'foul' ? 'foul' : action.stat;
    const event: GameEvent = {
      id: Date.now() + Math.random(),
      period: live.period,
      clock: live.clock,
      teamId: player.teamId,
      playerId: player.id,
      type: evType,
    };
    if (action.kind === 'pts') event.pts = action.pts;
    if (action.kind === 'foul') {
      event.foulType = foulType;
      event.teamFoul = teamFoul;
    }

    const updatedGame: Game = {
      ...game,
      events: [...game.events, event],
      status: game.status === 'scheduled' ? 'live' : game.status,
    };

    const homePts =
      updatedGame.events.filter((e) => e.teamId === game.home).reduce((s, e) => s + (e.pts || 0), 0) +
      (updatedGame.adj[game.home] || 0);
    const awayPts =
      updatedGame.events.filter((e) => e.teamId === game.away).reduce((s, e) => s + (e.pts || 0), 0) +
      (updatedGame.adj[game.away] || 0);

    const kindText =
      action.kind === 'foul' && foulType !== 'personal' ? ` ${foulType.toUpperCase()}` : '';
    const statLabel = action.kind === 'pts' ? `+${action.pts}` : `${evType.toUpperCase()}${kindText}`;

    await patch({
      games: [updatedGame],
      live: action.kind === 'foul' && foulType !== 'personal' ? { running: false } : undefined,
      log: `Q${per(live.period)} ${fc(live.clock)} | ${ab(getTeam(player.teamId))} #${player.number} ${nm(
        player,
      )} ${statLabel} | score ${homePts}-${awayPts}`,
    });

    if (action.kind === 'foul') {
      const nextStats = st(updatedGame.events);
      if ((nextStats[player.id]?.pf || 0) >= 5) {
        alert(`#${player.number} ${nm(player)} has 5 fouls — must be substituted`);
      }
    }
  };

  const pickStaff = async (teamId: number, who: 'coach' | 'assistant') => {
    onClose();
    const team = getTeam(teamId);
    const event: GameEvent = {
      id: Date.now() + Math.random(),
      period: live.period,
      clock: live.clock,
      teamId,
      playerId: null,
      type: 'foul',
      staff: who,
      foulType,
      teamFoul,
    };

    const updatedGame: Game = {
      ...game,
      events: [...game.events, event],
      status: game.status === 'scheduled' ? 'live' : game.status,
    };

    await patch({
      games: [updatedGame],
      live: foulType !== 'personal' ? { running: false } : undefined,
      log: `Q${per(live.period)} ${fc(live.clock)} | ${ab(team)} ${
        who === 'coach' ? 'COACH' : 'ASSISTANT COACH'
      } ${staffLabel(team, who)} FOUL ${foulType.toUpperCase()}${teamFoul ? '' : ' (not a team foul)'}`,
    });
  };

  const handleEnter = () => {
    const t = typed.trim();
    const exact = allVisible.filter((p) => String(p.number) === t);
    const chosen = exact.length === 1 ? exact[0] : allVisible.length === 1 ? allVisible[0] : null;
    if (chosen) pickPlayer(chosen);
  };

  return (
    <ModalShell maxWidth="max-w-[1000px]" onClose={onClose}>
      <h3 className="mb-2.5 pr-10 text-base font-bold text-[#eef2fb]">
        {title} — type the jersey number or tap a player
      </h3>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleEnter();
          }}
          placeholder="Type jersey number… (both teams)"
          inputMode="numeric"
          autoComplete="off"
          className="min-w-[240px] flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 py-2 text-white placeholder-[#94a5d4] focus:border-[#8ab4ff] focus:outline-none"
        />
        <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-[#eef2fb]">
          <input
            type="checkbox"
            checked={showBench}
            onChange={(e) => toggleBench(e.target.checked)}
            className="h-4 w-4 accent-[#4f7bff]"
          />
          show bench players
        </label>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {perTeam.map(({ teamId, shown, onCourtCount }) => {
          const team = getTeam(teamId);
          const c = teamColor(team);
          const activeIds = game.active[teamId] ?? [];

          return (
            <div
              key={teamId}
              style={{ borderTopColor: c }}
              className="rounded-xl border border-[#1a2d6b] border-t-4 bg-[#071233] p-2.5"
            >
              <h4 style={{ color: c }} className="mb-1.5 text-sm font-bold">
                {team?.name}{' '}
                <small className="font-normal text-[#8c9bc4]">{onCourtCount} on court</small>
              </h4>
              <div className="flex flex-col gap-1.5">
                {shown.length === 0 ? (
                  <small className="text-[#8c9bc4]">No match</small>
                ) : (
                  shown.map((p) => {
                    const onFloor = activeIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => pickPlayer(p)}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left font-bold transition hover:bg-[#354fa8] ${
                          onFloor
                            ? 'bg-[#2a3f87] text-white'
                            : 'border border-dashed border-[#3a4a8f] bg-[#2a3f87]/60 text-[#eef2fb]/85'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            style={{ backgroundColor: c, color: ink(c) }}
                            className="inline-flex h-8 min-w-[2.2rem] items-center justify-center rounded-full px-1.5 text-sm font-extrabold"
                          >
                            {p.number}
                          </span>
                          <span className="truncate">{nm(p)}</span>
                        </span>
                        <span
                          className={`whitespace-nowrap text-[11px] font-bold tracking-wider ${
                            onFloor ? 'text-[#4ade80]' : 'text-[#e1e8ff]'
                          }`}
                        >
                          {onFloor ? '● ON COURT' : 'BENCH'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

        {typed.trim() && allVisible.length === 0 && totalHiddenBench > 0 && (
          <div className="col-span-full text-xs text-[#8c9bc4]">
            No active player with that number — tick “show bench players” to include the bench.
          </div>
        )}
      </div>

      {action.kind === 'foul' && (
        <div className="mt-3 space-y-2.5 border-t border-[#1a2d6b] pt-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-[#eef2fb]">
              Foul type
              <select
                value={foulType}
                onChange={(e) => setFoulType(e.target.value as FoulType)}
                className="rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-2.5 py-1.5 text-sm text-white"
              >
                {FOUL_TYPES.map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#eef2fb]">
              <input
                type="checkbox"
                checked={teamFoul}
                onChange={(e) => setTeamFoul(e.target.checked)}
                className="h-4 w-4 accent-[#4f7bff]"
              />
              counts as a team foul
            </label>
          </div>

          <div className="text-xs text-[#8c9bc4]">
            <strong className="text-[#eef2fb]">Coach / assistant coach</strong> · tap to charge the foul to the
            coach (uses the foul type and team foul tick above)
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {teams.map((t) => {
              const team = getTeam(t);
              const c = teamColor(team);
              return (
                <div key={t} className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => pickStaff(t, 'coach')}
                    style={{ backgroundColor: c, color: ink(c) }}
                    className="truncate rounded-xl px-2.5 py-2 text-xs font-extrabold transition hover:opacity-90"
                  >
                    {ab(team)} · Coach: {staffLabel(team, 'coach')}
                  </button>
                  <button
                    type="button"
                    onClick={() => pickStaff(t, 'assistant')}
                    style={{ backgroundColor: c, color: ink(c) }}
                    className="truncate rounded-xl px-2.5 py-2 text-xs font-extrabold transition hover:opacity-90"
                  >
                    {ab(team)} · Asst: {staffLabel(team, 'assistant')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ModalShell>
  );
}