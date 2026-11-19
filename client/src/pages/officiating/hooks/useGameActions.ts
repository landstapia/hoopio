import { useCallback, useRef, useEffect, useState } from 'react';
import { useDb } from '../../../context/DbContext';
import { Buzzer, haptic } from '../../../lib/buzzer';
import { getUndoPatch, getStepPeriodPatch, getTimeoutPatch } from '../utils/gameRules';
import { per, fc, inLastTwo, rtActive } from '../../../lib/format';
import type { StatActionSpec } from '../components/PlayerPickerModal';

const BUZZ_MS = 2500;
const LONG_BUZZ_MS = 3000;

export function useGameActions(
  buzzHere: boolean,
  setStatAction: (spec: StatActionSpec | null) => void,
  setSubOpen: (v: boolean) => void,
  setBreakOpen: (v: boolean) => void,
  setTimeoutPickerOpen?: (v: boolean) => void
) {
  const { db, liveGame, getTeam, getPlayer, patch } = useDb();
  const buzzHeldRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMsg) return;
    const t = window.setTimeout(() => setErrorMsg(null), 3000);
    return () => window.clearTimeout(t);
  }, [errorMsg]);

  // Sync optional local buzzer audio
  useEffect(() => {
    if (!db) return;
    const l = db.live;
    const shouldSound = buzzHere && (l.buzzOn || l.buzzLeft > 0);
    const kind = !l.buzzOn && l.buzzKind === 'shot' ? 'shot' : 'game';
    Buzzer.sync(shouldSound, kind);
  }, [db, buzzHere]);

  // Stop held buzzer if pointer released anywhere
  useEffect(() => {
    const stopBuzz = () => {
      if (!buzzHeldRef.current) return;
      buzzHeldRef.current = false;
      patch({ live: { buzzOn: false } });
    };
    window.addEventListener('pointerup', stopBuzz);
    window.addEventListener('pointercancel', stopBuzz);
    window.addEventListener('blur', stopBuzz);
    return () => {
      window.removeEventListener('pointerup', stopBuzz);
      window.removeEventListener('pointercancel', stopBuzz);
      window.removeEventListener('blur', stopBuzz);
      Buzzer.stop();
    };
  }, [patch]);

  const undoLast = useCallback(async () => {
    if (!liveGame || !db) return;
    const res = getUndoPatch(liveGame.events, liveGame.active, db.live.timeouts, getTeam, getPlayer);
    if (!res) return;
    await patch({
      ...(res.gameUpdate ? { games: [{ ...liveGame, ...res.gameUpdate }] } : {}),
      ...res.patch,
    });
  }, [db, liveGame, getTeam, getPlayer, patch]);

  const stepPeriod = useCallback(
    async (direction: 1 | -1 = 1) => {
      if (!db || !liveGame) return;
      const p = getStepPeriodPatch(
        db.live.period,
        direction,
        db.live.periodLen,
        db.live.timeouts,
        liveGame.home,
        liveGame.away
      );
      await patch(p);
    },
    [db, liveGame, patch]
  );

  const startTimeout = useCallback(
    async (teamId: number, secs = db?.live.timeoutSecs || 30) => {
      if (!db || !liveGame) return;
      const { result, error } = getTimeoutPatch(teamId, secs, db.live, liveGame, getTeam);
      if (error) {
        setErrorMsg(error);
        return;
      }
      if (result) {
        Buzzer.unlock();
        const {
          buzzLeft: _ignoreBuzzLeft,
          buzzOn: _ignoreBuzzOn,
          buzzKind: _ignoreBuzzKind,
          ...cleanLivePatch
        } = result.patch.live ?? {};

        await patch({
          ...(result.gameUpdate ? { games: [{ ...liveGame, ...result.gameUpdate }] } : {}),
          ...result.patch,
          ...(result.patch.live ? { live: cleanLivePatch } : {}),
        });
      }
    },
    [db, liveGame, getTeam, patch]
  );

  const triggerStatAction = useCallback(
    async (spec: StatActionSpec) => {
      if (!db || !liveGame) return;
      const l = db.live;
      const logTime = `Q${per(l.period)} ${fc(l.clock)}`;

      if (spec.kind === 'foul') {
        if (rtActive(liveGame, l)) {
          await patch({ log: `${logTime} | FOUL pressed: RUNNING TIME - clocks keep running` });
        } else {
          await patch({ live: { running: false }, log: `${logTime} | FOUL pressed: game & shot clock paused` });
        }
      } else if (spec.kind === 'pts') {
        const stopAfterBasket =
          spec.pts >= 2 && !!liveGame.runningTime && liveGame.rtLast2 !== false && inLastTwo(l);
        await patch({
          live: { shot: 24000, ...(stopAfterBasket ? { running: false } : {}) },
          log: `${logTime} | +${spec.pts} pressed: shot clock reset to 24${
            stopAfterBasket ? ' · made field goal in the last 2:00: game clock stopped (FIBA)' : ''
          }`,
        });
      }
      setStatAction(spec);
    },
    [db, liveGame, patch, setStatAction]
  );

  const toggleGameClock = useCallback(() => {
    if (!db) return;
    haptic();
    const nextRunning = !db.live.running;
    patch({
      live: { running: nextRunning },
      log: `Game clock ${nextRunning ? 'started' : 'paused'}`,
    });
  }, [db, patch]);

  const toggleShotClock = useCallback(() => {
    if (!db) return;
    haptic();
    const nextHold = !db.live.shotHold;
    patch({
      live: { shotHold: nextHold },
      log: `Shot clock ${nextHold ? 'paused' : 'started'}`,
    });
  }, [db, patch]);

  const resetShotClock = useCallback(
    (seconds: 24 | 14) => {
      haptic();
      patch({
        live: { shot: seconds * 1000, shotOn: true },
        log: `Shot clock set to ${seconds}`,
      });
    },
    [patch]
  );

  const openSubstitutions = useCallback(async () => {
    if (!db || !liveGame) return;
    const l = db.live;
    const logTime = `Q${per(l.period)} ${fc(l.clock)}`;
    if (rtActive(liveGame, l)) {
      await patch({ log: `${logTime} | SUBSTITUTION pressed: RUNNING TIME - clocks keep running` });
    } else {
      await patch({ live: { running: false }, log: `${logTime} | SUBSTITUTION pressed: clocks paused` });
    }
    setSubOpen(true);
  }, [db, liveGame, patch, setSubOpen]);

  const handleTimeoutButton = useCallback(async () => {
    if (!db) return;
    const l = db.live;
    if (l.toKind === 'timeout') {
      await patch({
        live: { toKind: null, toTeam: null, toLeft: 0, toSuspended: false, buzzLeft: BUZZ_MS },
        log: 'timeout ended early',
      });
    } else if (!l.toKind) {
      setTimeoutPickerOpen?.(true);
    }
  }, [db, patch, setTimeoutPickerOpen]);

  const handleBreakButton = useCallback(async () => {
    if (!db) return;
    const l = db.live;
    if (l.toKind === 'break') {
      await patch({
        live: { toKind: null, toTeam: null, toLeft: 0, toSuspended: false, buzzLeft: BUZZ_MS },
        log: 'break ended early',
      });
    } else if (!l.toKind) {
      setBreakOpen(true);
    }
  }, [db, patch, setBreakOpen]);

  const startBreak = useCallback(
    async (minutes: number) => {
      if (!db) return;
      const l = db.live;
      await patch({
        live: {
          running: false,
          toKind: 'break',
          toTeam: null,
          toLeft: Math.round(minutes * 60000),
          toSuspended: false,
        },
        log: `Q${per(l.period)} ${fc(l.clock)} | BREAK started: ${minutes} min`,
      });
    },
    [db, patch]
  );

  const buzzStart = useCallback(() => {
    if (buzzHeldRef.current) return;
    buzzHeldRef.current = true;
    Buzzer.unlock();
    patch({ live: { buzzOn: true }, log: 'BUZZER pressed' });
  }, [patch]);

  const buzzStop = useCallback(() => {
    if (!buzzHeldRef.current) return;
    buzzHeldRef.current = false;
    patch({ live: { buzzOn: false } });
  }, [patch]);

  const buzzLong = useCallback(() => {
    Buzzer.unlock();
    patch({ live: { buzzLeft: LONG_BUZZ_MS }, log: 'LONG BUZZER' });
  }, [patch]);

  return {
    errorMsg,
    actions: {
      undoLast,
      stepPeriod,
      startTimeout,
      triggerStatAction,
      toggleGameClock,
      toggleShotClock,
      resetShotClock,
      openSubstitutions,
      handleTimeoutButton,
      handleBreakButton,
      startBreak,
      buzzStart,
      buzzStop,
      buzzLong,
    },
  };
}
