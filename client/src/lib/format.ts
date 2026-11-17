import type { CustomState, Game, LiveState, Player, Team } from '../types';

export const BRAND = {
  name: 'BCBL',
  fullName: 'Laguna West Brethren Charity Basketball League',
  tagline: 'Game day management: scoreboard, scorekeeping and statistics',
  logo: '/img/logo.png',
};

export const DEFAULT_PLACE = 'Rodriguez Village Basketball Court';
export const TEAM_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6'];
export const TEAM_CATEGORIES = ['Senior', 'Junior', 'Free'] as const;
export const MIRROR_OPERATOR_VIEW = true;
export const RT_LAST_MS = 120000;

export function colRaw(team: Team | undefined, fallbackId = 1): string {
  return team?.color || TEAM_COLORS[(Math.max(1, fallbackId) - 1) % TEAM_COLORS.length];
}

function lum(hex: string): number {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrastRatio(a: string, b: string): number {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function readable(hex: string, bg = '#0a1530', min = 4.5): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
  let t = 0;
  let c = hex;
  while (contrastRatio(c, bg) < min && t < 1) {
    t += 0.05;
    c =
      '#' +
      [1, 3, 5]
        .map((i) =>
          Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + 255 * t)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('');
  }
  return c;
}

export function teamColor(team: Team | undefined, bg = '#0a1530', min = 5.5): string {
  return readable(colRaw(team, team?.id), bg, min);
}

export function ink(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(String(hex))) return '#fff';
  return contrastRatio(hex, '#000000') >= contrastRatio(hex, '#ffffff') ? '#000' : '#fff';
}

export function nm(p: Player | undefined): string {
  if (!p || !p.id) return 'Removed player';
  return p.first ? `${p.last}, ${p.first[0]}.` : p.last;
}

export function fullName(p: Player | undefined): string {
  if (!p || !p.id) return 'Removed player';
  return p.first ? `${p.last}, ${p.first}` : p.last;
}

export function ab(team: Team | undefined): string {
  if (!team) return '?';
  return team.abbr || (team.name || '?').slice(0, 10);
}

export function fc(ms: number): string {
  if (ms < 60000) return (ms / 1000).toFixed(1);
  return Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0');
}

export function secText(n: number): string {
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}

export function toText(toLeft: number): string {
  const s = Math.ceil(toLeft / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export function shotSeg(l: { shotOn: boolean; clock: number; shot: number }): string {
  return !l.shotOn || l.clock < l.shot ? '  ' : String(Math.ceil(l.shot / 1000)).padStart(2, ' ');
}

export function per(p: number): string {
  return p > 4 ? `OT${p - 4}` : String(p);
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
}

export function byNumber(x: string | number, y: string | number): number {
  return String(x).localeCompare(String(y), undefined, { numeric: true }) || (String(x) < String(y) ? -1 : 1);
}

export function boardSides(g: Game, live: LiveState): [number, number] {
  return live.swap ? [g.away, g.home] : [g.home, g.away];
}

export function sheetSides(g: Game, live: LiveState): [number, number] {
  const sides = boardSides(g, live);
  return MIRROR_OPERATOR_VIEW ? [sides[1], sides[0]] : sides;
}

export function customSides(c: CustomState): ['a' | 'b', 'a' | 'b'] {
  return c.swap ? ['b', 'a'] : ['a', 'b'];
}

export function customSheet(c: CustomState): ['a' | 'b', 'a' | 'b'] {
  const sides = customSides(c);
  return MIRROR_OPERATOR_VIEW ? [sides[1], sides[0]] : sides;
}

export function inLastTwo(l: Pick<LiveState, 'period' | 'clock'>): boolean {
  return l.period >= 4 && l.clock <= RT_LAST_MS;
}

export function rtActive(g: Game | undefined, l: Pick<LiveState, 'period' | 'clock'>): boolean {
  return !!g && !!g.runningTime && !(g.rtLast2 !== false && inLastTwo(l));
}

export function parseClock(text: string): number | null {
  const t = String(text).trim();
  if (!t) return null;
  let sec: number;
  if (t.includes(':')) {
    const [m, s] = t.split(':');
    sec = parseInt(m, 10) * 60 + parseFloat(s);
  } else {
    sec = parseFloat(t);
  }
  return Number.isNaN(sec) || sec < 0 ? null : Math.round(sec * 1000);
}