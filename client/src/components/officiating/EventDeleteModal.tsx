import { useDb } from '../../context/DbContext';
import { ab, fc, nm, per, secText } from '../../lib/format';
import { foulTag, staffLabel } from '../../lib/stats';
import type { Game, GameEvent } from '../../types';
import { ModalShell } from '../shared/ModalShell';

export function EventDeleteModal({
  game,
  event,
  onClose,
}: {
  game: Game;
  event: GameEvent;
  onClose: () => void;
}) {
  const { getTeam, getPlayer, patch } = useDb();
  const team = event.teamId != null ? getTeam(event.teamId) : undefined;
  const p = event.playerId != null ? getPlayer(event.playerId) : undefined;

  const what =
    event.type === 'timeout'
      ? `Timeout${event.secs ? ` ${secText(event.secs)}` : ''}`
      : event.type === 'tech'
        ? 'Technical foul'
        : event.type === 'sub'
          ? 'Substitution'
          : p
            ? `#${p.number} ${nm(p)} · ${event.type === 'pts' ? `+${event.pts} points` : event.type.toUpperCase()}${foulTag(
                event,
              )}`
            : event.staff
              ? `${event.staff === 'coach' ? 'Coach' : 'Asst. coach'} ${staffLabel(team, event.staff)} · FOUL${foulTag(
                  event,
                )}`
              : 'Team foul';

  const confirmDelete = async () => {
    onClose();
    await patch({
      games: [{ ...game, events: game.events.filter((e) => e.id !== event.id) }],
      log: `EDIT game ${game.id}: event deleted`,
    });
  };

  return (
    <ModalShell maxWidth="max-w-[430px]" dismissable={false} onClose={onClose}>
      <h3 className="text-xl font-bold text-[#eef2fb]">Delete this event?</h3>
      <p className="mt-1 text-sm text-[#c7d2fe]">The score and statistics update at once.</p>
      <div className="my-4 rounded-xl border-l-4 border-[#f87171] bg-[#0a1530] px-3.5 py-2.5 font-bold text-white">
        {per(event.period)} · {fc(event.clock)} · {ab(team)}
        <small className="mt-0.5 block font-normal text-[#8c9bc4]">{what}</small>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-full px-4 font-bold text-[#cfd8ff] hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirmDelete}
          className="min-h-[44px] rounded-full bg-[#b91c1c] px-5 font-bold text-white hover:bg-[#991b1b]"
        >
          Delete
        </button>
      </div>
    </ModalShell>
  );
}