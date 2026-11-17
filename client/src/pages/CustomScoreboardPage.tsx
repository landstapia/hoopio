import { useEffect, useState } from 'react';
import { BigScoreboard, type ScoreboardModel } from '../components/BigScoreboard';
import { useDb } from '../context/DbContext';
import { Buzzer } from '../lib/buzzer';
import { customSides, readable, shotSeg, toText } from '../lib/format';

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

export function CustomScoreboardPage() {
  const { db } = useDb();
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
    const c = db.custom;
    const shouldSound = c.buzzOn || c.buzzLeft > 0;
    const kind = !c.buzzOn && c.buzzKind === 'shot' ? 'shot' : 'game';
    Buzzer.sync(shouldSound, kind);
  }, [db]);

  if (!db) return <BigScoreboard model={{ idle: 'LOADING...' }} />;

  const c = db.custom;
  const [leftKey, rightKey] = customSides(c);

  const buildSide = (k: 'a' | 'b') => ({
    name: c[k].name.slice(0, 10),
    full: c[k].full,
    color: readable(c[k].color, '#000000'),
    score: c[k].score,
    fouls: c[k].fouls,
    timeouts: c[k].timeouts,
  });

  const model: ScoreboardModel = {
    pause: c.toKind
      ? {
          isBreak: c.toKind === 'break',
          name: c.toTeam ? c[c.toTeam].name.slice(0, 10) : '',
          color: c.toTeam ? readable(c[c.toTeam].color, '#000000') : '#f2a501',
          suspended: c.toSuspended,
          time: toText(c.toLeft),
        }
      : null,
    left: buildSide(leftKey),
    right: buildSide(rightKey),
    period: c.period,
    clock: c.clock,
    shotText: shotSeg(c),
    arrowLeft: c.arrow === leftKey,
    arrowRight: c.arrow === rightKey,
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