import type { FoulType, Game, GameEvent, Player, Team } from '../types';

export const KS = ['pts', 'reb', 'ast', 'stl', 'blk', 'to', 'pf'] as const;
export type StatKey = (typeof KS)[number];

export type StatLine = Record<StatKey, number>;
export type PlayerTotalLine = StatLine & { gp: number };

export const Z = (): StatLine => ({ pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 });

export const FOUL_TYPES: Array<[FoulType, string]> = [
  ['personal', 'Personal'],
  ['technical', 'Technical'],
  ['flagrant', 'Flagrant'],
];

export function sc(game: Game, teamId: number): number {
  const eventPts = game.events
    .filter((e) => e.teamId === teamId)
    .reduce((sum, e) => sum + (e.pts || 0), 0);
  return eventPts + (game.adj?.[teamId] || 0);
}

export function isTeamFoul(e: GameEvent): boolean {
  if (e.type === 'foul') return e.teamFoul !== false;
  return e.type === 'tech' && !!e.teamFoul;
}

export function tf(game: Game, teamId: number, period: number): number {
  return game.events.filter((e) => isTeamFoul(e) && e.teamId === teamId && e.period === period).length;
}

export function gameFouls(game: Game, teamId: number): number {
  return game.events.filter((e) => isTeamFoul(e) && e.teamId === teamId).length;
}

export function techFouls(game: Game, teamId: number): number {
  return game.events.filter(
    (e) => e.teamId === teamId && (e.type === 'tech' || (e.type === 'foul' && e.foulType === 'technical')),
  ).length;
}

export function foulKind(e: GameEvent): FoulType {
  return e.foulType || 'personal';
}

export function foulTag(e: GameEvent): string {
  if (e.type === 'foul' && (e.playerId || e.staff) && foulKind(e) !== 'personal') {
    return foulKind(e) === 'technical' ? ' (T)' : ' (F)';
  }
  return '';
}

export function captainOf(team: Team | undefined, players: Player[]): Player | null {
  if (!team || !team.captainId) return null;
  const p = players.find((x) => x.id === team.captainId);
  return p && p.teamId === team.id && !p.archived ? p : null;
}

export function staffLabel(team: Team | undefined, who: 'coach' | 'assistant'): string {
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