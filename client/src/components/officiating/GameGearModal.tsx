import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDb } from '../../context/DbContext';
import { ab, colRaw, sheetSides } from '../../lib/format';
import type { Game, LiveState } from '../../types';
import { ModalShell } from '../shared/ModalShell';

export function GameGearModal({
  game,
  live,
  onOpenLineup,
  onStepPeriod,
  onClose,
}: {
  game: Game;
  live: LiveState;
  onOpenLineup: () => void;
  onStepPeriod: (dir: 1 | -1) => void;
  onClose: () => void;
}) {
  const { getTeam, patch } = useDb();
  const navigate = useNavigate();
  const teams = sheetSides(game, live);

  const [names, setNames] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const t of teams) init[t] = live.names[t] || ab(getTeam(t));
    return init;
  });

  const [colors, setColors] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const t of teams) init[t] = colRaw(getTeam(t), t);
    return init;
  });

  const [timeoutInput, setTimeoutInput] = useState(String(live.timeoutSecs || 30));
  const [periodLenInput, setPeriodLenInput] = useState(String(live.periodLen / 60000));

  const applyNamesAndColors = async () => {
    const nextNames = { ...live.names };
    const updatedTeams = [];
    for (const t of teams) {
      const team = getTeam(t);
      nextNames[t] = (names[t]?.trim() || ab(team)).slice(0, 10);
      if (team && colors[t] && colors[t].toLowerCase() !== colRaw(team, t).toLowerCase()) {
        updatedTeams.push({ ...team, color: colors[t] });
      }
    }
    await patch({
      live: { names: nextNames },
      ...(updatedTeams.length ? { teams: updatedTeams } : {}),
      log: 'Team names / colors set',
    });
  };

  const saveTimeoutLen = async () => {
    const n = parseInt(timeoutInput, 10);
    if (!(n >= 5 && n <= 600)) return alert('Enter 5 to 600 seconds');
    await patch({ live: { timeoutSecs: n }, log: `Default timeout length set to ${n}s` });
  };

  const savePeriodLen = async () => {
    const m = parseFloat(periodLenInput);
    if (!(m > 0)) return alert('Enter period length in minutes');
    await patch({ live: { periodLen: Math.round(m * 60000) }, log: 'Period length changed' });
  };

  return (
    <ModalShell maxWidth="max-w-[560px]" onClose={onClose}>
      <h3 className="mb-3 pr-10 text-lg font-bold text-[#eef2fb]">
        Game controls <small className="block text-xs font-normal text-[#8c9bc4]">custom functions</small>
      </h3>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">Starting players for this period</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenLineup();
            }}
            className="min-h-[44px] w-full rounded-xl bg-[#2a3f87] font-bold text-white hover:bg-[#354fa8]"
          >
            Choose starting players…
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">Team names (scoreboard, max 10) &amp; colors</span>
          {teams.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <input
                maxLength={10}
                value={names[t] ?? ''}
                onChange={(e) => setNames((prev) => ({ ...prev, [t]: e.target.value }))}
                className="h-11 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-white"
              />
              <input
                type="color"
                value={colors[t] ?? '#3b82f6'}
                onChange={(e) => setColors((prev) => ({ ...prev, [t]: e.target.value }))}
                className="h-11 w-14 cursor-pointer rounded-lg border border-[#3a4a8f] bg-[#0f1a44] p-1"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={applyNamesAndColors}
            className="min-h-[44px] w-full rounded-xl bg-[#2a3f87] font-bold text-white hover:bg-[#354fa8]"
          >
            Apply names &amp; colors
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">Period</span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onStepPeriod(-1)}
              className="min-h-[44px] rounded-xl bg-[#2a3f87] font-bold text-white hover:bg-[#354fa8]"
            >
              &#9666; Prev
            </button>
            <button
              type="button"
              onClick={() => onStepPeriod(1)}
              className="min-h-[44px] rounded-xl bg-[#2a3f87] font-bold text-white hover:bg-[#354fa8]"
            >
              Next &#9656;
            </button>
            <button
              type="button"
              onClick={() => patch({ live: { swap: !live.swap }, log: 'Team sides swapped on the scoreboard' })}
              className="min-h-[44px] rounded-xl bg-[#2a3f87] font-bold text-white hover:bg-[#354fa8]"
            >
              Swap sides
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">
            Default timeout length (seconds). Tap TIMEOUT to start it; hold TIMEOUT to pick another length.
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              min="5"
              max="600"
              value={timeoutInput}
              onChange={(e) => setTimeoutInput(e.target.value)}
              className="h-11 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-white"
            />
            <button
              type="button"
              onClick={saveTimeoutLen}
              className="min-h-[44px] rounded-xl bg-[#2a3f87] px-4 font-bold text-white hover:bg-[#354fa8]"
            >
              Save
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">Period length (min)</span>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={periodLenInput}
              onChange={(e) => setPeriodLenInput(e.target.value)}
              className="h-11 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-white"
            />
            <button
              type="button"
              onClick={savePeriodLen}
              className="min-h-[44px] rounded-xl bg-[#2a3f87] px-4 font-bold text-white hover:bg-[#354fa8]"
            >
              Save
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/games');
          }}
          className="min-h-[44px] w-full rounded-xl bg-[#7f1d1d] font-bold text-white hover:bg-[#991b1b]"
        >
          New game… (Games page)
        </button>
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