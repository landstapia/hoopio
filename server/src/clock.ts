import type { Server } from 'socket.io';
import { db } from './db.js';
import {
  getCustomState,
  getFullState,
  getLiveState,
  saveCustomState,
  saveLiveState,
  writeLog,
} from './state.js';
import type { ClientToServerEvents, ServerToClientEvents } from './types.js';

const BUZZ_MS = 2500;
const SHOT_BUZZ_MS = 1500;

export function startClockLoop(io: Server<ClientToServerEvents, ServerToClientEvents>): NodeJS.Timeout {
  let lastTick = Date.now();

  return setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastTick;
    lastTick = now;

    const live = getLiveState();
    const custom = getCustomState();

    let liveChanged = false;
    let customChanged = false;
    let structuralBroadcast = false;
    const logs: string[] = [];

    // 1. Live buzzer countdown
    if (live.buzzLeft > 0) {
      live.buzzLeft = Math.max(0, live.buzzLeft - elapsed);
      if (live.buzzLeft === 0) live.buzzKind = null;
      liveChanged = true;
    }

    // 2. Live timeout / break countdown
    if (live.toKind && !live.toSuspended) {
      live.toLeft = Math.max(0, live.toLeft - elapsed);
      liveChanged = true;
      if (live.toLeft === 0) {
        logs.push(`${live.toKind} ended`);
        live.toKind = null;
        live.toTeam = null;
        live.buzzLeft = BUZZ_MS;
        live.buzzKind = null;
        structuralBroadcast = true;
      }
    }

    // 3. Custom scoreboard clocks
    if (custom.buzzLeft > 0) {
      custom.buzzLeft = Math.max(0, custom.buzzLeft - elapsed);
      if (custom.buzzLeft === 0) custom.buzzKind = null;
      customChanged = true;
    }
    if (custom.toKind && !custom.toSuspended) {
      custom.toLeft = Math.max(0, custom.toLeft - elapsed);
      customChanged = true;
      if (custom.toLeft === 0) {
        logs.push(`CUSTOM ${custom.toKind} ended`);
        custom.toKind = null;
        custom.toTeam = null;
        custom.buzzLeft = BUZZ_MS;
        custom.buzzKind = null;
        structuralBroadcast = true;
      }
    }
    if (custom.running) {
      custom.clock = Math.max(0, custom.clock - elapsed);
      if (custom.shotOn && !custom.shotHold) {
        custom.shot = Math.max(0, custom.shot - elapsed);
      }
      customChanged = true;

      if (custom.clock === 0) {
        custom.running = false;
        custom.buzzLeft = BUZZ_MS;
        custom.buzzKind = null;
        logs.push(`CUSTOM period ${custom.period} ended (clock expired)`);
        structuralBroadcast = true;
      } else if (custom.shotOn && !custom.shotHold && custom.shot === 0 && custom.shot <= custom.clock) {
        custom.running = false;
        custom.buzzLeft = SHOT_BUZZ_MS;
        custom.buzzKind = 'shot';
        logs.push('CUSTOM shot clock violation');
        structuralBroadcast = true;
      }
    }

    // 4. Live game clock & shot clock
    if (live.running) {
      live.clock = Math.max(0, live.clock - elapsed);
      if (live.shotOn && !live.shotHold) {
        live.shot = Math.max(0, live.shot - elapsed);
      }
      liveChanged = true;

      if (live.clock === 0) {
        live.running = false;
        live.buzzLeft = BUZZ_MS;
        live.buzzKind = null;
        logs.push(`Period ${live.period} ended (clock expired)`);
        structuralBroadcast = true;
      } else if (live.shotOn && live.shot > 0) {
        live.shotViol = false;
      } else if (live.shotOn && !live.shotHold && live.shot === 0 && live.shot <= live.clock) {
        const game = live.gameId
          ? (db.prepare('SELECT running_time, rt_last2 FROM games WHERE id = ?').get(live.gameId) as
              | { running_time: number; rt_last2: number }
              | undefined)
          : undefined;
        const rtNow =
          !!game && Boolean(game.running_time) && !(Boolean(game.rt_last2) && live.period >= 4 && live.clock <= 120000);

        if (rtNow) {
          if (!live.shotViol) {
            live.shotViol = true;
            live.buzzLeft = SHOT_BUZZ_MS;
            live.buzzKind = 'shot';
            logs.push('Shot clock violation (24s expired) - running time: game clock keeps running');
            structuralBroadcast = true;
          }
        } else {
          live.running = false;
          live.buzzLeft = SHOT_BUZZ_MS;
          live.buzzKind = 'shot';
          logs.push('Shot clock violation (24s expired)');
          structuralBroadcast = true;
        }
      }
    }

    if (liveChanged) saveLiveState(live);
    if (customChanged) saveCustomState(custom);

    for (const msg of logs) {
      const line = writeLog(msg);
      io.emit('log:line', line);
    }

    if (liveChanged || customChanged) {
      io.emit('clock:tick', {
        live: {
          clock: live.clock,
          shot: live.shot,
          running: live.running,
          toKind: live.toKind,
          toTeam: live.toTeam,
          toLeft: live.toLeft,
          toSuspended: live.toSuspended,
          buzzOn: live.buzzOn,
          buzzLeft: live.buzzLeft,
          buzzKind: live.buzzKind,
        },
        custom: {
          clock: custom.clock,
          shot: custom.shot,
          running: custom.running,
          toKind: custom.toKind,
          toTeam: custom.toTeam,
          toLeft: custom.toLeft,
          toSuspended: custom.toSuspended,
          buzzOn: custom.buzzOn,
          buzzLeft: custom.buzzLeft,
          buzzKind: custom.buzzKind,
        },
      });
    }

    if (structuralBroadcast) {
      io.emit('db:state', getFullState());
    }
  }, 100);
}