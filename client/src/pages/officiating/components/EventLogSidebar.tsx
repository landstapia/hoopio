import { useState, useMemo } from 'react';
import type { Game, GameEvent, Team, Player } from '../../../types';
import { Pencil, Trash2 } from 'lucide-react';
import { per, fc, teamColor, ab } from '../../../lib/format';
import { formatEventRow } from '../utils/formatEventRow';

interface EventLogSidebarProps {
  game: Game;
  teams: number[];
  getTeamFn: (id: number) => Team | undefined;
  getPlayerFn: (id: number) => Player | undefined;
  setEditingEvent: (e: GameEvent) => void;
  setDeletingEvent: (e: GameEvent) => void;
}

export function EventLogSidebar({
  game,
  teams,
  getTeamFn,
  getPlayerFn,
  setEditingEvent,
  setDeletingEvent,
}: EventLogSidebarProps) {
  const [logTeamFilter, setLogTeamFilter] = useState<number | ''>('');

  const filteredEvents = useMemo(() => {
    return game.events
      .slice()
      .reverse()
      .filter((e) => logTeamFilter === '' || e.teamId === logTeamFilter);
  }, [game.events, logTeamFilter]);

  return (
    <aside
      aria-label="Event log"
      className="flex h-[24rem] w-full flex-none flex-col overflow-hidden rounded-2xl border border-[#2f4690] bg-[#0a1530] xl:sticky xl:top-16 xl:h-[calc(100vh-80px)] xl:w-[390px]"
    >
      <div className="flex items-baseline gap-2 px-3 pt-2.5 pb-1">
        <h4 className="text-base font-bold text-white">Event log</h4>
        <span className="text-xs text-[#8c9bc4]">newest first</span>
        <span className="flex-1" />
        <b className="rounded-full bg-[#4ade80] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[#052e16]">
          LIVE
        </b>
      </div>

      <div className="flex gap-1.5 px-3 pb-2">
        {(
          [
            ['', 'All'],
            [teams[0], ab(getTeamFn(teams[0]))],
            [teams[1], ab(getTeamFn(teams[1]))],
          ] as Array<[number | '', string]>
        ).map(([val, label]) => (
          <button
            key={String(val)}
            type="button"
            onClick={() => setLogTeamFilter(val)}
            className={`max-w-[110px] truncate rounded-full border px-3 py-1 text-xs font-bold transition ${
              logTeamFilter === val
                ? 'border-[#2a3f87] bg-[#2a3f87] text-white'
                : 'border-[#3a4a8f] bg-transparent text-[#c7d2fe] hover:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#1a2d6b]">
        {filteredEvents.length === 0 ? (
          <p className="p-4 text-sm text-[#8c9bc4]">No events yet.</p>
        ) : (
          filteredEvents.map((e, idx) => {
            const p = e.playerId != null ? getPlayerFn(e.playerId) : undefined;
            const outP = e.outId != null ? getPlayerFn(e.outId) : undefined;
            const team = e.teamId != null ? getTeamFn(e.teamId) : undefined;
            const c = teamColor(team);
            const { who, typeLabel, typeColor } = formatEventRow(e, team, p, outP);

            const prev = idx > 0 ? filteredEvents[idx - 1] : null;
            const periodBreak = prev && prev.period !== e.period;

            return (
              <div
                key={e.id}
                style={{ borderLeftColor: c }}
                className={`grid h-10 grid-cols-[74px_56px_minmax(0,1fr)_44px_30px_30px] items-center border-b border-[#16224d] border-l-4 pl-2 pr-1 text-xs ${
                  periodBreak ? 'border-t-2 border-t-[#3a4a8f]' : ''
                }`}
              >
                <span className="text-[#8c9bc4]">
                  {per(e.period)} · {fc(e.clock)}
                </span>
                <span style={{ color: c }} className="truncate font-extrabold">
                  {ab(team)}
                </span>
                <span title={who} className="truncate text-[#eef2fb]">
                  {who}
                </span>
                <span className={`text-center font-extrabold ${typeColor}`}>{typeLabel}</span>
                <button
                  type="button"
                  aria-label="Edit event"
                  onClick={() => setEditingEvent(e)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#cfd8ff] hover:bg-white/10"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete event"
                  onClick={() => setDeletingEvent(e)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[#fca5a5] hover:bg-white/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
