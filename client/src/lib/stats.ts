import type { FoulType, Game, GameEvent, Player, Team } from '../types';

export const KS = ['pts', 'reb', 'ast', 'stl', 'blk', 'to', 'pf'] as const;
export type StatKey = (typeof KS)[number];

export type StatLine = Record<StatKey, number>;
export type PlayerTotalLine = StatLine & { gp: number };

export const Z = (): StatLine => ({ pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 });

export const FOUL_TYPES: Array<[FoulType, string]> = [
  ['personal', 'Personal'],
  ['technical_c1', 'Technical (C1)'],
  ['technical_c2', 'Technical (C2)'],
  ['disruptive', 'Disruptive'],
  ['flagrant', 'Flagrant'],
  ['disqualifying', 'Disqualifying'],
];

export function sc(game: Game, teamId: number): number {
  const eventPts = game.events
    .filter((e) => e.teamId === teamId)
    .reduce((sum, e) => sum + (e.pts || 0), 0);
  return Math.max(0, eventPts + (game.adj?.[teamId] || 0));
}

export function isTeamFoul(e: GameEvent): boolean {
  if (e.staff) return false;
  if (e.type === 'foul') return e.teamFoul !== false;
  return e.type === 'tech' && !!e.teamFoul;
}

export function tf(game: Game, teamId: number, period: number): number {
  return game.events.filter(
    (e) =>
      isTeamFoul(e) &&
      e.teamId === teamId &&
      (period >= 4 ? e.period >= 4 : e.period === period)
  ).length;
}

export function gameFouls(game: Game, teamId: number): number {
  return game.events.filter((e) => isTeamFoul(e) && e.teamId === teamId).length;
}

export function techFouls(game: Game, teamId: number): number {
  return game.events.filter(
    (e) =>
      e.teamId === teamId &&
      (e.type === 'tech' ||
        (e.type === 'foul' &&
          (e.foulType === 'technical' ||
            e.foulType === 'technical_c1' ||
            e.foulType === 'technical_c2'))),
  ).length;
}

export function foulKind(e: GameEvent): FoulType {
  return e.foulType || 'personal';
}

export function foulTag(e: GameEvent): string {
  if (e.type === 'foul' && (e.playerId || e.staff) && foulKind(e) !== 'personal') {
    if (e.staff) return ' (T)';
    const kind = foulKind(e);
    if (kind === 'technical_c1' || kind === 'technical') return ' (T1)';
    if (kind === 'technical_c2') return ' (T2)';
    if (kind === 'disruptive') return ' (DR)';
    if (kind === 'flagrant') return ' (FL)';
    if (kind === 'disqualifying') return ' (GD)';
  }
  return '';
}

/**
 * Evaluates whether a player is disqualified / fouled out:
 * - 5 total fouls
 * - Direct Disqualifying foul (GD)
 * - 2 Category 1 Technical fouls (T + T + GD) — Category 2 technicals do not count
 * - 2 Flagrant fouls (FL + FL + GD)
 * - 1 Category 1 Technical + 1 Flagrant foul in either order (T + FL + GD / FL + T + GD)
 */
export function getPlayerDisqualification(
  events: GameEvent[],
  playerId: number,
  pendingFoul?: FoulType
): { disqualified: boolean; badge: string | null; reason: string | null } {
  let totalFouls = 0;
  let c1Techs = 0;
  let flagrants = 0;
  let directGD = false;

  const tally = (kind: FoulType) => {
    totalFouls++;
    if (kind === 'technical_c1' || kind === 'technical') c1Techs++;
    else if (kind === 'flagrant') flagrants++;
    else if (kind === 'disqualifying') directGD = true;
  };

  for (const e of events) {
    if (e.playerId === playerId && e.type === 'foul') {
      tally(foulKind(e));
    }
  }

  if (pendingFoul) {
    tally(pendingFoul);
  }

  if (directGD) {
    return { disqualified: true, badge: 'GD', reason: 'Disqualifying foul (GD)' };
  }
  if (c1Techs >= 2) {
    return { disqualified: true, badge: 'GD', reason: '2 Category 1 technical fouls (T + T + GD)' };
  }
  if (flagrants >= 2) {
    return { disqualified: true, badge: 'GD', reason: '2 flagrant fouls (FL + FL + GD)' };
  }
  if (c1Techs >= 1 && flagrants >= 1) {
    return {
      disqualified: true,
      badge: 'GD',
      reason: 'Category 1 technical + flagrant foul (T + FL + GD)',
    };
  }
  if (totalFouls >= 5) {
    return { disqualified: true, badge: '5F', reason: '5 fouls' };
  }

  return { disqualified: false, badge: null, reason: null };
}

export function isPlayerDisqualified(events: GameEvent[], playerId: number): boolean {
  return getPlayerDisqualification(events, playerId).disqualified;
}

export function getCoachDisqualification(
  events: GameEvent[],
  teamId: number,
  pendingStaff?: 'coach' | 'assistant' | 'bench'
): {
  ejected: boolean;
  directCoachTechs: number;
  totalBenchTechs: number;
  reason: string | null;
} {
  let directCoachTechs = 0;
  let totalBenchTechs = 0;

  const tally = (who: 'coach' | 'assistant' | 'bench') => {
    totalBenchTechs++;
    if (who === 'coach') directCoachTechs++;
  };

  for (const e of events) {
    if (e.teamId === teamId && e.type === 'foul' && e.staff) {
      tally(e.staff);
    }
  }

  if (pendingStaff) {
    tally(pendingStaff);
  }

  if (directCoachTechs >= 2) {
    return {
      ejected: true,
      directCoachTechs,
      totalBenchTechs,
      reason: '2 direct coach technical fouls (GD)',
    };
  }

  if (totalBenchTechs >= 3) {
    return {
      ejected: true,
      directCoachTechs,
      totalBenchTechs,
      reason: '3 combined coach/bench technical fouls (GD)',
    };
  }

  return { ejected: false, directCoachTechs, totalBenchTechs, reason: null };
}

export function captainOf(team: Team | undefined, players: Player[]): Player | null {
  if (!team || !team.captainId) return null;
  const p = players.find((x) => x.id === team.captainId);
  return p && p.teamId === team.id && !p.archived ? p : null;
}

export function staffLabel(team: Team | undefined, who: 'coach' | 'assistant' | 'bench'): string {
  if (who === 'bench') return 'Bench';
  return who === 'coach' ? team?.coach || 'Head coach' : team?.assistant || 'Assistant coach';
}

export function st(events: GameEvent[]): Record<number, StatLine> {
  const result: Record<number, StatLine> = {};
  for (const e of events) {
    if (!e.playerId || e.type === 'sub') continue;
    const line = (result[e.playerId] ??= Z());
    if (e.type === 'pts') line.pts += e.pts || 0;
    else if (e.type === 'foul') line.pf++;
    else if (e.type in line) line[e.type as StatKey]++;
  }
  return result;
}

export function tot(playerId: number, games: Game[], season?: string): PlayerTotalLine {
  const total: PlayerTotalLine = { gp: 0, ...Z() };
  for (const g of games) {
    if (g.status === 'scheduled') continue;
    if (season && g.season !== season) continue;
    const line = st(g.events)[playerId];
    if ((g.played || []).includes(playerId) || line) {
      total.gp++;
      for (const k of KS) total[k] += line ? line[k] : 0;
    }
  }
  return total;
}

export function avg(total: PlayerTotalLine, key: StatKey): string {
  return total.gp ? (total[key] / total.gp).toFixed(1) : '0.0';
}

export function rk<T extends StatLine>(rows: T[], key: StatKey): (row: T) => number {
  const sorted = [...rows].sort((x, y) => y[key] - x[key]);
  return (row: T) => 1 + sorted.findIndex((x) => x[key] === row[key]);
}