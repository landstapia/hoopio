import { useState } from 'react';
import { useDb } from '../../context/DbContext';
import { ab, fc, per, sheetSides } from '../../lib/format';
import { sc } from '../../lib/stats';
import type { Game, GameEvent, LiveState } from '../../types';
import { ModalShell } from '../shared/ModalShell';

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
  const [techCountsAsTeamFoul, setTechCountsAsTeamFoul] = useState(false);
  const [pickBench, setPickBench] = useState(() => localStorage.pickBench === '1');

  const recordTechnical = async (teamId: number) => {
    const team = getTeam(teamId);
    const event: GameEvent = {
      id: Date.now() + Math.random(),
      period: live.period,
      clock: live.clock,
      teamId,
      playerId: null,
      type: 'tech',
      ...(techCountsAsTeamFoul ? { teamFoul: true } : {}),
    };
    const updatedGame: Game = {
      ...game,
      events: [...game.events, event],
      status: game.status === 'scheduled' ? 'live' : game.status,
    };
    const techCount = updatedGame.events.filter(
      (e) => e.teamId === teamId && (e.type === 'tech' || (e.type === 'foul' && e.foulType === 'technical')),
    ).length;

    await patch({
      games: [updatedGame],
      live: { running: false },
      log: `Q${per(live.period)} ${fc(live.clock)} | ${ab(team)} TECHNICAL FOUL${
        techCountsAsTeamFoul ? ' (counts as team foul)' : ''
      }: clocks paused | tech ${techCount}`,
    });
  };

  const addTeamFoul = async (teamId: number) => {
    const team = getTeam(teamId);
    const event: GameEvent = {
      id: Date.now() + Math.random(),
      period: live.period,
      clock: live.clock,
      teamId,
      playerId: null,
      type: 'foul',
    };
    await patch({
      games: [{ ...game, events: [...game.events, event] }],
      log: `Controls: team foul ${ab(team)} +1`,
    });
  };

  const adjustScore = async (teamId: number, delta: number) => {
    const team = getTeam(teamId);
    const nextAdj = { ...game.adj, [teamId]: (game.adj[teamId] || 0) + delta };
    const updatedGame: Game = { ...game, adj: nextAdj };
    await patch({
      games: [updatedGame],
      log: `Controls: score ${ab(team)} ${delta > 0 ? '+' : ''}${delta} | score ${sc(updatedGame, game.home)}-${sc(
        updatedGame,
        game.away,
      )}`,
    });
  };

  return (
    <ModalShell maxWidth="max-w-[560px]" onClose={onClose}>
      <h3 className="mb-3 pr-10 text-lg font-bold text-[#eef2fb]">
        Score controls <small className="block text-xs font-normal text-[#8c9bc4]">custom functions</small>
      </h3>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">Technical foul (no player needed)</span>
          <div className="grid grid-cols-2 gap-1.5">
            {teams.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => recordTechnical(t)}
                className="min-h-[44px] rounded-xl bg-[#7f1d1d] font-bold text-white hover:bg-[#991b1b]"
              >
                {ab(getTeam(t))}
              </button>
            ))}
          </div>
          <label className="ml-2 flex cursor-pointer items-center gap-2 text-xs text-[#8c9bc4]">
            <input
              type="checkbox"
              checked={techCountsAsTeamFoul}
              onChange={(e) => setTechCountsAsTeamFoul(e.target.checked)}
              className="h-4 w-4 accent-[#4f7bff]"
            />
            counts as a team foul (technical foul by a player)
          </label>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">Team foul without a player</span>
          <div className="grid grid-cols-2 gap-1.5">
            {teams.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addTeamFoul(t)}
                className="min-h-[44px] rounded-xl bg-[#2a3f87] font-bold text-white hover:bg-[#354fa8]"
              >
                {ab(getTeam(t))} +1
              </button>
            ))}
          </div>
        </div>

        {teams.map((t) => (
          <div key={t} className="space-y-1.5">
            <span className="text-xs text-[#8c9bc4]">
              Manual score correction · {ab(getTeam(t))} <b className="text-base text-white">{sc(game, t)}</b>
            </span>
            <div className="grid grid-cols-6 gap-1">
              {[-3, -2, -1, 1, 2, 3].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => adjustScore(t, d)}
                  className={`min-h-[44px] rounded-xl text-sm font-bold text-white ${
                    d < 0 ? 'bg-[#7f1d1d] hover:bg-[#991b1b]' : 'bg-[#166534] hover:bg-[#15803d]'
                  }`}
                >
                  {d < 0 ? `−${Math.abs(d)}` : `+${d}`}
                </button>
              ))}
            </div>
          </div>
        ))}

        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#eef2fb]">
          <input
            type="checkbox"
            checked={pickBench}
            onChange={(e) => {
              setPickBench(e.target.checked);
              localStorage.pickBench = e.target.checked ? '1' : '0';
            }}
            className="h-5 w-5 accent-[#4f7bff]"
          />
          show bench players in the player list
        </label>
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