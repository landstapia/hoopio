import { useEffect, useState } from 'react';
import { BigScoreboard, type ScoreboardModel } from '../components/BigScoreboard';
import { useDb } from '../context/DbContext';
import { Buzzer } from '../lib/buzzer';
import { ab, boardSides, colRaw, readable, shotSeg, toText } from '../lib/format';
import { sc, tf } from '../lib/stats';

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

export function ScoreboardPage() {
  const { db, liveGame, getTeam } = useDb();
  const [audioReady, setAudioReady] = useState(Buzzer.ready);

  useEffect(() => {
    const unlock = () => {
      Buzzer.unlock();
      setAudioReady(Buzzer.ready);
    };
    const onKey = (e: KeyboardEvent) => {
      unlock();
      if (e.key.toLowerCase() === 'f') toggleFullscreen();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', onKey);
    window.addEventListener('dblclick', toggleFullscreen);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('dblclick', toggleFullscreen);
      Buzzer.stop();
    };
  }, []);

  useEffect(() => {
    if (!db) return;
    const l = db.live;
    const shouldSound = l.buzzOn || l.buzzLeft > 0;
    const kind = !l.buzzOn && l.buzzKind === 'shot' ? 'shot' : 'game';
    Buzzer.sync(shouldSound, kind);
  }, [db]);

  if (!db) return <BigScoreboard model={{ idle: 'LOADING...' }} />;
  if (!liveGame) return <BigScoreboard model={{ idle: 'NO LIVE GAME' }} />;

  const l = db.live;
  const [leftId, rightId] = boardSides(liveGame, l);

  const buildSide = (teamId: number) => {
    const team = getTeam(teamId);
    return {
      name: (l.names[teamId] || ab(team)).slice(0, 10),
      full: team?.name || '',
      logo: team?.photo || '',
      color: readable(colRaw(team, teamId), '#000000'),
      score: sc(liveGame, teamId),
      fouls: tf(liveGame, teamId, l.period),
      timeouts: l.timeouts[teamId] || 0,
    };
  };

  const pauseTeam = l.toTeam != null ? getTeam(l.toTeam) : undefined;
  const model: ScoreboardModel = {
    pause: l.toKind
      ? {
          isBreak: l.toKind === 'break',
          name: l.toTeam != null ? (l.names[l.toTeam] || ab(pauseTeam)).slice(0, 10) : '',
          color: l.toTeam != null ? readable(colRaw(pauseTeam, l.toTeam), '#000000') : '#f2a501',
          suspended: l.toSuspended,
          time: toText(l.toLeft),
        }
      : null,
    left: buildSide(leftId),
    right: buildSide(rightId),
    period: l.period,
    clock: l.clock,
    shotText: shotSeg(l),
    arrowLeft: l.arrow === leftId,
    arrowRight: l.arrow === rightId,
  };

  return (
    <>
      <BigScoreboard model={model} />
      {!audioReady && (
        <div className="fixed bottom-[1vh] left-1/2 z-10 -translate-x-1/2 rounded-lg bg-black/80 px-3 py-1.5 text-sm text-gray-400">
          🔊 Click once to enable sound · press F or double-click for full screen
        </div>
      )}
    </>
  );
}