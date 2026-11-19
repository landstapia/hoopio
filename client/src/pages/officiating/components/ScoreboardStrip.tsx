import type { Game, LiveState, Team } from '../../../types';
import { per, fc, teamColor, ab, toText, rtActive } from '../../../lib/format';
import { sc, tf } from '../../../lib/stats';

interface ScoreboardStripProps {
  game: Game;
  live: LiveState;
  teams: number[];
  operatorMode: boolean;
  getTeamFn: (id: number) => Team | undefined;
}

export function ScoreboardStrip({
  game,
  live,
  teams,
  operatorMode,
  getTeamFn,
}: ScoreboardStripProps) {
  const shotDisplay = !live.shotOn || live.clock < live.shot ? '--' : Math.ceil(live.shot / 1000);

  const renderSummaryTeam = (teamId: number, rightSide: boolean) => {
    const team = getTeamFn(teamId);
    const c = teamColor(team);
    const fouls = tf(game, teamId, live.period);
    const toLeft = live.timeouts[teamId] || 0;
    const label = (live.names[teamId] || ab(team)).slice(0, 10);

    const info = (
      <div className={`min-w-0 flex-1 ${rightSide ? 'text-right' : 'text-left'}`}>
        <b style={{ color: c }} className="block truncate text-lg leading-tight tracking-wide sm:text-2xl">
          {label}
        </b>
        <small className="block truncate text-[11px] font-semibold text-[#c7d2fe] sm:text-xs">
          {team?.name}
        </small>
        <div className={`mt-1.5 flex gap-1 sm:gap-1.5 ${rightSide ? 'justify-end' : 'justify-start'}`}>
          <span
            className={`flex min-w-[3.4rem] flex-col items-center whitespace-nowrap rounded-lg px-1.5 py-1 text-[9px] font-bold tracking-wider sm:min-w-[4.6rem] sm:px-2 sm:text-[10px] ${
              fouls >= 5 ? 'bg-[#92400e] text-white' : 'bg-[#16224d] text-[#c7d2fe]'
            }`}
          >
            FOULS
            <strong className="text-base leading-none text-white sm:text-xl">{fouls}</strong>
            {fouls >= 5 && <em className="not-italic text-[8px] text-[#fde68a] sm:text-[9px]">BONUS</em>}
          </span>
          <span className="flex min-w-[3.4rem] flex-col items-center whitespace-nowrap rounded-lg bg-[#16224d] px-1.5 py-1 text-[9px] font-bold tracking-wider text-[#c7d2fe] sm:min-w-[4.6rem] sm:px-2 sm:text-[10px]">
            TIMEOUTS
            <strong className="text-base leading-none text-white sm:text-xl">{toLeft}</strong>
          </span>
        </div>
        <small className="mt-1 block min-h-[16px] truncate whitespace-nowrap text-[10px] text-[#8c9bc4] sm:text-[11px]">
          {live.arrow === teamId && (
            <b className="text-[#fbbf24]">{rightSide ? 'POSSESSION ▶' : '◀ POSSESSION'}</b>
          )}
        </small>
      </div>
    );

    const scoreEl = (
      <span
        style={{ fontFamily: 'Arial, sans-serif' }}
        className={`shrink-0 font-extrabold leading-none tabular-nums text-white ${
          operatorMode ? 'text-4xl sm:text-6xl md:text-7xl' : 'text-3xl sm:text-5xl md:text-6xl'
        }`}
      >
        {sc(game, teamId)}
      </span>
    );

    return (
      <div
        key={teamId}
        style={{ borderTopColor: c }}
        className="flex min-w-0 items-center justify-between gap-1.5 rounded-xl border border-[#1a2d6b] border-t-4 bg-[#0a1530] px-2.5 py-2 sm:gap-2 sm:px-3.5 sm:py-2.5"
      >
        {rightSide ? (
          <>
            {scoreEl}
            {info}
          </>
        ) : (
          <>
            {info}
            {scoreEl}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className={`grid gap-1.5 sm:gap-2 ${
        operatorMode
          ? 'grid-cols-[minmax(0,1fr)_175px_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_240px_minmax(0,1fr)]'
          : 'grid-cols-[minmax(0,1fr)_155px_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_210px_minmax(0,1fr)]'
      }`}
    >
      {renderSummaryTeam(teams[0], false)}

      <div className="flex min-w-0 flex-col items-center justify-center rounded-xl border-2 border-[#f2a501] bg-black px-1.5 py-2 text-center sm:px-2">
        <small className="max-w-full truncate whitespace-nowrap text-[10px] font-bold tracking-wider text-[#c7d2fe] sm:text-[11px]">
          PERIOD {per(live.period)}
          <br />
          {live.running ? <span className="text-[#4ade80]">● RUNNING</span> : <span className="text-[#ef4444]">■ STOPPED</span>}
        </small>
        <span
          style={{ fontFamily: 'Arial, sans-serif' }}
          className={`whitespace-nowrap font-extrabold leading-tight tabular-nums text-[#f2a501] ${
            operatorMode ? 'text-3xl sm:text-5xl md:text-6xl' : 'text-2xl sm:text-4xl md:text-5xl'
          }`}
        >
          {fc(live.clock)}
        </span>
        <span
          style={{ fontFamily: 'Arial, sans-serif' }}
          className={`whitespace-nowrap font-extrabold leading-none tabular-nums text-[#f87171] ${
            operatorMode ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl'
          }`}
        >
          {shotDisplay}
        </span>
        {game.runningTime && (
          <small
            className={`mt-0.5 max-w-full truncate whitespace-nowrap text-[9px] font-bold sm:text-[10px] ${
              rtActive(game, live) ? 'text-[#4ade80]' : 'text-[#fbbf24]'
            }`}
          >
            {rtActive(game, live) ? '⏱ RUNNING TIME' : '⏱ STOP TIME (last 2:00)'}
          </small>
        )}
        {live.toKind && (
          <small className="mt-0.5 max-w-full truncate whitespace-nowrap text-[10px] font-bold text-[#fbbf24] sm:text-[11px]">
            {live.toKind === 'break'
              ? `BREAK ${toText(live.toLeft)}`
              : `TIMEOUT ${live.toTeam != null ? ab(getTeamFn(live.toTeam)) : ''} ${toText(live.toLeft)}`}
            {live.toSuspended ? ' (suspended)' : ''}
          </small>
        )}
      </div>

      {renderSummaryTeam(teams[1], true)}
    </div>
  );
}
