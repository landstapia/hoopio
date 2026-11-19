import type { GameEvent, Game, LiveState, Team } from '../../../types';
import type { StatActionSpec } from './PlayerPickerModal';
import { LineupModal } from './LineupModal';
import { PlayerPickerModal } from './PlayerPickerModal';
import { SubModal } from './SubstitutionModal';
import { BreakModal } from './BreakModal';
import { ScoreGearModal } from './ScoreGearModal';
import { GameGearModal } from './GameGearModal';
import { EventEditModal } from './EventEditModal';
import { EventDeleteModal } from './EventDeleteModal';
import { TeamTimeoutModal } from './TeamTimeoutModal';
import { TimeGearModal } from './TimeGearModal';

export type ActiveModal =
  | { type: 'none' }
  | { type: 'lineup' }
  | { type: 'statAction'; spec: StatActionSpec }
  | { type: 'sub' }
  | { type: 'break' }
  | { type: 'gearScore' }
  | { type: 'gearGame' }
  | { type: 'gearTime' }
  | { type: 'timeoutPicker' }
  | { type: 'editEvent'; event: GameEvent }
  | { type: 'deleteEvent'; event: GameEvent };

export interface OfficiatingModalsProps {
  activeModal: ActiveModal;
  setActiveModal: (m: ActiveModal) => void;
  game: Game;
  live: LiveState;
  buzzHere: boolean;
  setBuzzHere: (v: boolean) => void;
  getTeamFn: (id: number) => Team | undefined;
  startTimeout: (teamId: number, secs: number) => void;
  startBreak: (mins: number) => void;
  stepPeriod: (dir?: 1 | -1) => void;
  onOpenLineup: () => void;
}

export function OfficiatingModals({
  activeModal,
  setActiveModal,
  game,
  live,
  buzzHere,
  setBuzzHere,
  getTeamFn,
  startTimeout,
  startBreak,
  stepPeriod,
  onOpenLineup,
}: OfficiatingModalsProps) {
  const close = () => setActiveModal({ type: 'none' });

  return (
    <>
      {activeModal.type === 'lineup' && <LineupModal game={game} live={live} />}
      {activeModal.type === 'statAction' && (
        <PlayerPickerModal action={activeModal.spec} game={game} live={live} onClose={close} />
      )}
      {activeModal.type === 'sub' && (
        <SubModal game={game} live={live} onClose={close} />
      )}
      {activeModal.type === 'break' && (
        <BreakModal
          onStart={(mins) => {
            startBreak(mins);
            close();
          }}
          onClose={close}
        />
      )}
      {activeModal.type === 'gearScore' && (
        <ScoreGearModal game={game} live={live} onClose={close} />
      )}
      {activeModal.type === 'gearGame' && (
        <GameGearModal
          game={game}
          live={live}
          buzzHere={buzzHere}
          setBuzzHere={setBuzzHere}
          onOpenLineup={onOpenLineup}
          onStepPeriod={stepPeriod}
          onClose={close}
        />
      )}
      {activeModal.type === 'gearTime' && (
        <TimeGearModal
          game={game}
          live={live}
          buzzHere={buzzHere}
          onToggleBuzzHere={setBuzzHere}
          onClose={close}
        />
      )}
      {activeModal.type === 'timeoutPicker' && (
        <TeamTimeoutModal
          game={game}
          live={live}
          getTeamFn={getTeamFn}
          onStart={(teamId, secs) => {
            startTimeout(teamId, secs);
            close();
          }}
          onClose={close}
        />
      )}
      {activeModal.type === 'editEvent' && (
        <EventEditModal
          game={game}
          event={activeModal.event}
          livePeriod={live.period}
          onDeleteRequest={(ev) => setActiveModal({ type: 'deleteEvent', event: ev })}
          onClose={close}
        />
      )}
      {activeModal.type === 'deleteEvent' && (
        <EventDeleteModal game={game} event={activeModal.event} onClose={close} />
      )}
    </>
  );
}