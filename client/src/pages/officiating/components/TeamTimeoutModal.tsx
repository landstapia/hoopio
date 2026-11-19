import { ab, secText, sheetSides, teamColor } from '../../../lib/format';
import type { Game, LiveState, Team } from '../../../types';
import { ModalShell } from '../../../shared/ModalShell';

interface TeamTimeoutModalProps {
  game: Game;
  live: LiveState;
  getTeamFn: (id: number) => Team | undefined;
  onStart: (teamId: number, secs: number) => void;
  onClose: () => void;
}

export function TeamTimeoutModal({
  game,
  live,
  getTeamFn,
  onStart,
  onClose,
}: TeamTimeoutModalProps) {
  const teams = sheetSides(game, live);
  const defaultSecs = live.timeoutSecs || 30;

  const getTeamLabels = (teamId: number) => {
    const team = getTeamFn(teamId);
    const initials = ab(team);
    const customShort = live.names[teamId]?.trim();
    const shortName =
      customShort && customShort !== initials ? customShort : team?.name || '';
    return {
      initials,
      shortName: shortName !== initials ? shortName : '',
      color: teamColor(team),
    };
  };

  const handleSelectTeam = (teamId: number) => {
    onClose();
    onStart(teamId, defaultSecs);
  };

  return (
    <ModalShell
      maxWidth="max-w-[460px]"
      title="Timeout"
      subtitle={`Select a team to start a ${secText(defaultSecs)} timeout`}
      onClose={onClose}
    >
      <div className="space-y-3">
        {live.toKind && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/60 px-3 py-2 text-xs font-semibold text-amber-200">
            A {live.toKind} is already running. End it first before starting a new timeout.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {teams.map((t) => {
            const { initials, shortName, color } = getTeamLabels(t);
            const left = live.timeouts[t] || 0;
            const disabled = left <= 0 || !!live.toKind;

            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectTeam(t)}
                style={{ borderTopColor: color }}
                className="flex min-h-[88px] flex-col items-center justify-center rounded-xl border border-[#2f4690] border-t-4 bg-[#16224d] px-3 py-3 text-center transition hover:bg-[#223575] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="text-lg font-extrabold leading-tight text-white">{initials}</span>
                {shortName && (
                  <span className="mt-0.5 max-w-full truncate text-xs font-medium text-[#c7d2fe]">
                    {shortName}
                  </span>
                )}
                <span
                  className={`mt-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                    left > 0
                      ? 'bg-[#facc15] text-[#1a1200]'
                      : 'bg-[#7f1d1d] text-red-200'
                  }`}
                >
                  {left} left
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}