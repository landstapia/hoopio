import type { GameEvent, Team, Player } from '../../../types';
import { secText, nm } from '../../../lib/format';
import { foulTag, staffLabel } from '../../../lib/stats';

export interface FormattedEvent {
  who: string;
  typeLabel: string;
  typeColor: string;
}

export function formatEventRow(
  e: GameEvent,
  team?: Team,
  player?: Player,
  outPlayer?: Player
): FormattedEvent {
  let who = '';
  let typeLabel = '';
  let typeColor = 'text-[#5eead4]';

  if (e.type === 'timeout') {
    who = `Timeout${e.secs ? ` ${secText(e.secs)}` : ''}`;
    typeLabel = 'T/O';
    typeColor = 'text-[#fde047]';
  } else if (e.type === 'tech') {
    who = 'Technical foul';
    typeLabel = 'TECH';
    typeColor = 'text-[#fca5a5]';
  } else if (e.type === 'sub') {
    const inNum = e.playerId != null ? `#${player?.number ?? '?'}` : '-';
    const outNum = e.outId != null ? `#${outPlayer?.number ?? '?'}` : '-';
    who = `Sub: in ${inNum}, out ${outNum}`;
    typeLabel = 'SUB';
    typeColor = 'text-[#c7d2fe]';
  } else if (e.type === 'foul' && e.staff) {
    who =
      e.staff === 'bench'
        ? staffLabel(team, 'bench')
        : `${e.staff === 'coach' ? 'Coach: ' : 'Asst. coach: '}${staffLabel(team, e.staff)}`;
    typeLabel = `FOUL${foulTag(e)}`;
    typeColor = 'text-[#fca5a5]';
  } else if (e.type === 'foul' && !e.playerId) {
    who = 'Team foul';
    typeLabel = 'FOUL';
    typeColor = 'text-[#fca5a5]';
  } else {
    who = `#${player?.number ?? '?'} ${nm(player)}`;
    typeLabel = e.type === 'pts' ? `+${e.pts}` : `${e.type.toUpperCase()}${foulTag(e)}`;
    typeColor =
      e.type === 'pts' ? 'text-[#93c5fd]' : e.type === 'foul' ? 'text-[#fca5a5]' : 'text-[#5eead4]';
  }

  return { who, typeLabel, typeColor };
}
