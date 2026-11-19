import { useState } from 'react';
import { useDb } from '../../../context/DbContext';
import { byNumber, fc, nm, parseClock, per } from '../../../lib/format';
import type { Game, GameEvent } from '../../../types';
import { ModalShell } from '../../../shared/ModalShell';

const EV_TYPES: Array<[string, string]> = [
  ['pts1', '+1'],
  ['pts2', '+2'],
  ['pts3', '+3'],
  ['reb', 'REB'],
  ['ast', 'AST'],
  ['stl', 'STL'],
  ['blk', 'BLK'],
  ['to', 'TO'],
  ['foul', 'FOUL'],
];

const evKind = (e: GameEvent) => (e.type === 'pts' ? `pts${e.pts}` : e.type);

export function EventEditModal({
  game,
  event,
  livePeriod,
  onDeleteRequest,
  onClose,
}: {
  game: Game;
  event: GameEvent;
  livePeriod: number;
  onDeleteRequest: (ev: GameEvent) => void;
  onClose: () => void;
}) {
  const { db, getTeam, patch } = useDb();
  const kind = evKind(event);
  const typeEditable = !!event.playerId && EV_TYPES.some((t) => t[0] === kind);

  const [period, setPeriod] = useState(event.period);
  const [clockText, setClockText] = useState(fc(event.clock));
  const [playerId, setPlayerId] = useState<number>(event.playerId || 0);
  const [kindVal, setKindVal] = useState(kind);

  const roster = (db?.players ?? [])
    .filter((p) => p.teamId === event.teamId && (!p.archived || p.id === event.playerId))
    .sort((a, b) => byNumber(a.number, b.number));

  const periods = [...new Set([1, 2, 3, 4, event.period, livePeriod])].sort((a, b) => a - b);

  const saveEdit = async () => {
    const ms = parseClock(clockText);
    if (ms === null) return alert('Clock must look like 7:45 or 9.4');

    const updatedEvents = game.events.map((ev) => {
      if (ev.id !== event.id) return ev;
      const next: GameEvent = { ...ev, period, clock: ms };
      if (typeEditable) {
        next.playerId = playerId;
        if (kindVal.startsWith('pts')) {
          next.type = 'pts';
          next.pts = Number(kindVal[3]);
        } else {
          next.type = kindVal;
          delete next.pts;
        }
      }
      return next;
    });

    onClose();
    await patch({
      games: [{ ...game, events: updatedEvents }],
      log: `EDIT game ${game.id}: event updated (${per(period)} ${fc(ms)} ${kindVal})`,
    });
  };

  return (
    <ModalShell
      maxWidth="max-w-[430px]"
      dismissable={false}
      title="Edit event"
      subtitle={`${event.teamId != null ? `${getTeam(event.teamId)?.name} · ` : ''}Saved when you press Save`}
      onClose={onClose}
    >

      <div className="my-4 grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1 text-xs text-[#b4c0ea]">
          Period
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="h-11 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-3 text-base text-white"
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {per(p)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-[#b4c0ea]">
          Clock (e.g. 7:45)
          <input
            value={clockText}
            onChange={(e) => setClockText(e.target.value)}
            className="h-11 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-base text-white"
          />
        </label>

        {typeEditable ? (
          <>
            <label className="col-span-2 flex flex-col gap-1 text-xs text-[#b4c0ea]">
              Player
              <select
                value={playerId}
                onChange={(e) => setPlayerId(Number(e.target.value))}
                className="h-11 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-3 text-base text-white"
              >
                {roster.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.number} {nm(p)}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-xs text-[#b4c0ea]">
              Type
              <select
                value={kindVal}
                onChange={(e) => setKindVal(e.target.value)}
                className="h-11 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-3 text-base text-white"
              >
                {EV_TYPES.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <p className="col-span-2 text-sm text-[#c7d2fe]">
            This kind of event ({event.type}) can change its period and clock, or be deleted.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            onDeleteRequest(event);
          }}
          className="min-h-[44px] rounded-full px-4 font-bold text-[#fca5a5] hover:bg-white/5"
        >
          Delete
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-full px-4 font-bold text-[#cfd8ff] hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={saveEdit}
          className="min-h-[44px] rounded-full bg-[#1d4ed8] px-5 font-bold text-white hover:bg-[#1e40af]"
        >
          Save
        </button>
      </div>
    </ModalShell>
  );
}