import type { GameEvent, Game, LiveState, PatchChange, Team, Player } from '../../../types';
import { per, fc, ab, secText } from '../../../lib/format';

export interface RulePatchResult {
  patch: Omit<PatchChange, 'games'>;
  gameUpdate?: Partial<Game>;
}

export function getUndoPatch(
  events: GameEvent[],
  active: Record<number, number[]>,
  timeouts: Record<number, number>,
  getTeamFn: (id: number) => Team | undefined,
  getPlayerFn: (id: number) => Player | undefined
): RulePatchResult | null {
  const nextEvents = [...events];
  const ev = nextEvents.pop();
  if (!ev) return null;

  const nextActive = { ...active };
  const nextTimeouts = { ...timeouts };
  const livePatch: Partial<LiveState> = { timeouts: nextTimeouts };

  if (ev.type === 'sub' && ev.teamId != null) {
    const on = nextActive[ev.teamId] ?? [];
    if (ev.playerId && ev.outId) {
      nextActive[ev.teamId] = on.map((id) => (id === ev.playerId ? ev.outId! : id));
    } else if (ev.playerId) {
      nextActive[ev.teamId] = on.filter((id) => id !== ev.playerId);
    } else if (ev.outId) {
      nextActive[ev.teamId] = [...on, ev.outId];
    }
  }

  if (ev.type === 'timeout' && ev.teamId != null) {
    nextTimeouts[ev.teamId] = (nextTimeouts[ev.teamId] || 0) + 1;
    livePatch.toKind = null;
    livePatch.toTeam = null;
    livePatch.toLeft = 0;
  }

  const who = ev.playerId
    ? getPlayerFn(ev.playerId)?.last || ''
    : ev.teamId != null
      ? ab(getTeamFn(ev.teamId))
      : '';

  return {
    patch: {
      live: livePatch,
      log: `UNDO ${ev.type} ${ev.pts || ''} by ${who}`,
    },
    gameUpdate: { events: nextEvents, active: nextActive },
  };
}

export function getStepPeriodPatch(
  currentPeriod: number,
  direction: 1 | -1,
  periodLen: number,
  timeouts: Record<number, number>,
  homeId: number,
  awayId: number
): Omit<PatchChange, 'games'> {
  const period = Math.max(1, currentPeriod + direction);
  const length = period > 4 ? 300000 : periodLen;
  const nextTimeouts = { ...timeouts };

  for (const t of [homeId, awayId]) {
    if (period === 1) nextTimeouts[t] = 2;
    if (period === 3) nextTimeouts[t] = 3;
    if (period > 4) nextTimeouts[t] = 1;
  }

  return {
    live: { period, clock: length, running: false, shot: 24000, timeouts: nextTimeouts },
    log: `Period set to ${per(period)}`,
  };
}

export function getTimeoutPatch(
  teamId: number,
  secs: number,
  live: LiveState,
  game: Game,
  getTeamFn: (id: number) => Team | undefined
): { result?: RulePatchResult; error?: string } {
  const left = live.timeouts[teamId] || 0;
  if (!left) return { error: 'No timeouts left' };
  if (live.toKind) return { error: 'A timeout or break is already running' };

  const nextTimeouts = { ...live.timeouts, [teamId]: left - 1 };
  const event: GameEvent = {
    id: Date.now() + Math.random(),
    period: live.period,
    clock: live.clock,
    teamId,
    playerId: null,
    type: 'timeout',
    secs,
  };

  return {
    result: {
      patch: {
        live: {
          timeouts: nextTimeouts,
          running: false,
          toKind: 'timeout',
          toTeam: teamId,
          toLeft: secs * 1000,
          toSuspended: false,
        },
        log: `Q${per(live.period)} ${fc(live.clock)} | ${ab(getTeamFn(teamId))} TIMEOUT ${secText(secs)} (${left - 1} left)`,
      },
      gameUpdate: { events: [...game.events, event] },
    },
  };
}