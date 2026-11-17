import { useEffect, useState } from 'react';
import { useDb } from '../context/DbContext';
import { ab, boardSides, BRAND, byNumber, colRaw, nm, readable } from '../lib/format';
import { st, Z } from '../lib/stats';

const PB_MAX_ROWS = 15;

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function FoulDots({ count, right }: { count: number; right: boolean }) {
  return (
    <span className={`flex gap-2 ${right ? 'flex-row-reverse' : ''}`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= count;
        const fouledOut = active && i === 5;
        return (
          <i
            key={i}
            className={`inline-block h-[min(22px,calc(var(--rh)*0.55))] w-[min(22px,calc(var(--rh)*0.55))] rounded-full border-[3px] ${
              fouledOut
                ? 'border-[#ff2d2d] bg-[#ff2d2d]'
                : active
                  ? 'border-[#1fb34a] bg-[#1fb34a]'
                  : 'border-[#cfcfd6] bg-transparent'
            }`}
          />
        );
      })}
    </span>
  );
}

export function PlayerboardPage() {
  const { db, liveGame, getTeam } = useDb();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900));
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') toggleFullscreen();
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('keydown', onKey);
    window.addEventListener('dblclick', toggleFullscreen);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('dblclick', toggleFullscreen);
    };
  }, []);

  const frameStyle = {
    boxShadow: 'inset 0 0.7vh 0 #01247c, inset 0 -0.7vh 0 #f2a501',
    fontFamily: 'Arial, Helvetica, sans-serif',
  };

  if (!db || !liveGame) {
    return (
      <div
        style={frameStyle}
        className="fixed inset-0 flex flex-col items-center justify-center gap-[3vh] bg-black text-[8vh] font-bold text-white"
      >
        <img src={BRAND.logo} alt={BRAND.name} className="h-[34vh] w-[34vh] object-contain" />
        <div>{!db ? 'LOADING...' : 'NO LIVE GAME'}</div>
      </div>
    );
  }

  const l = db.live;
  const stats = st(liveGame.events);
  const [leftId, rightId] = boardSides(liveGame, l);

  const rosterFor = (teamId: number) =>
    db.players
      .filter((p) => p.teamId === teamId && (!p.archived || liveGame.played.includes(p.id)))
      .sort((a, b) => byNumber(a.number, b.number));

  const leftPlayers = rosterFor(leftId);
  const rightPlayers = rosterFor(rightId);
  const maxRows = Math.max(leftPlayers.length, rightPlayers.length, 1);
  const rh = Math.max(24, Math.min(40, Math.floor((PB_MAX_ROWS * 40) / Math.max(maxRows, PB_MAX_ROWS))));

  const renderSide = (teamId: number, players: typeof leftPlayers, right: boolean) => {
    const team = getTeam(teamId);
    const color = readable(colRaw(team, teamId), '#000000');
    const abbr = (l.names[teamId] || ab(team)).slice(0, 10);

    return (
      <div className="flex min-w-0 flex-col items-center">
        <div className="mb-[14px] flex max-w-full items-center justify-center gap-[24px]">
          {team?.photo && right && (
            <img src={team.photo} alt="" className="h-[120px] w-[120px] flex-none rounded-full object-cover" />
          )}
          <div className="flex min-w-0 flex-col items-center">
            <div style={{ color }} className="whitespace-nowrap text-[80px] font-bold uppercase leading-[0.8]">
              {abbr}
            </div>
            <div className="-mt-[4px] max-w-[560px] overflow-hidden text-ellipsis whitespace-nowrap text-[30px]">
              {team?.name}
            </div>
          </div>
          {team?.photo && !right && (
            <img src={team.photo} alt="" className="h-[120px] w-[120px] flex-none rounded-full object-cover" />
          )}
        </div>

        <div
          style={{ fontSize: `calc(${rh}px * 0.65)` }}
          className="flex w-full flex-col gap-[3px] font-bold"
        >
          <div
            className={`mb-[4px] grid h-[28px] items-center border-b border-[#333] text-[16px] font-normal tracking-[4px] text-[#8a8a99] ${
              right
                ? 'grid-cols-[70px_150px_1fr_70px] gap-x-[18px]'
                : 'grid-cols-[70px_1fr_150px_70px] gap-x-[18px]'
            }`}
          >
            {right ? (
              <>
                <span className="text-left">PTS</span>
                <span>FOULS</span>
                <span className="text-right">PLAYER</span>
                <span className="text-left">#</span>
              </>
            ) : (
              <>
                <span className="text-right">#</span>
                <span>PLAYER</span>
                <span>FOULS</span>
                <span className="text-right">PTS</span>
              </>
            )}
          </div>

          {players.length === 0 ? (
            <div className="mt-[30px] text-center text-[24px] font-normal text-[#8a8a99]">
              No players on this team
            </div>
          ) : (
            players.map((p) => {
              const x = stats[p.id] || Z();
              const numEl = (
                <span className={right ? 'text-left' : 'text-right'}>{p.number}</span>
              );
              const nameEl = (
                <span className={`overflow-hidden text-ellipsis whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
                  {nm(p).toUpperCase()}
                </span>
              );
              const ptsEl = (
                <span
                  style={{ fontSize: `calc(${rh}px * 0.75)` }}
                  className={`text-[#f2a501] ${right ? 'text-left' : 'text-right'}`}
                >
                  {x.pts}
                </span>
              );

              return (
                <div
                  key={p.id}
                  style={{ height: `${rh}px` }}
                  className={`grid items-center whitespace-nowrap ${
                    right
                      ? 'grid-cols-[70px_150px_1fr_70px] gap-x-[18px]'
                      : 'grid-cols-[70px_1fr_150px_70px] gap-x-[18px]'
                  }`}
                >
                  {right ? (
                    <>
                      {ptsEl}
                      <FoulDots count={x.pf} right />
                      {nameEl}
                      {numEl}
                    </>
                  ) : (
                    <>
                      {numEl}
                      {nameEl}
                      <FoulDots count={x.pf} right={false} />
                      {ptsEl}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={frameStyle}
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black"
    >
      <div
        style={{
          width: '1600px',
          height: '900px',
          transform: `scale(${scale})`,
          '--rh': `${rh}px`,
        } as React.CSSProperties}
        className="grid flex-none origin-center grid-cols-2 gap-x-[120px] bg-black px-[50px] py-[24px] text-[#e8e8ee]"
      >
        {renderSide(leftId, leftPlayers, false)}
        {renderSide(rightId, rightPlayers, true)}
      </div>
    </div>
  );
}