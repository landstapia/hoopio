import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { db } from '../src/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '..');
const repoRoot = path.resolve(serverDir, '..');

// Point to legacy/database.json (override with JSON_FILE=/path/to/database.json if needed)
const jsonPath = process.env.JSON_FILE ?? path.join(repoRoot, 'legacy', 'database.json');
const uploadsDir = path.join(serverDir, 'uploads');

const UPLOAD_FOLDERS = [
  'team-logos',
  'team-photos',
  'solo-photos',
  'event-photos',
  'event-videos',
] as const;

type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

if (!existsSync(jsonPath)) {
  console.error(`Legacy database not found at: ${jsonPath}`);
  process.exit(1);
}

// Create all 5 upload subdirectories up front
for (const folder of UPLOAD_FOLDERS) {
  mkdirSync(path.join(uploadsDir, folder), { recursive: true });
}

interface LegacyTeam {
  id: number;
  name: string;
  abbr?: string;
  alias?: string;
  color?: string;
  photo?: string;
  category?: string;
  archived?: boolean;
  coach?: string;
  assistant?: string;
  captainId?: number | null;
}

interface LegacyPlayer {
  id: number;
  teamId: number;
  first?: string;
  last?: string;
  nick?: string;
  number: string | number;
  locale?: string;
  photo?: string;
  archived?: boolean;
  verified?: boolean;
  verifiedAt?: string;
}

interface LegacyEvent {
  id?: number;
  period: number;
  clock: number;
  teamId?: number | null;
  playerId?: number | null;
  type: string;
  outId?: number | null;
  pts?: number | null;
  secs?: number | null;
  foulType?: string | null;
  teamFoul?: boolean;
  staff?: string | null;
}

interface LegacyGame {
  id: number;
  season: string;
  date: string;
  time?: string;
  no?: number;
  competition?: string;
  place?: string;
  home: number;
  away: number;
  status?: string;
  runningTime?: boolean;
  rtLast2?: boolean;
  lineupPeriod?: number;
  isDefault?: boolean;
  active?: Record<string, number[]>;
  played?: number[];
  adj?: Record<string, number>;
  events?: LegacyEvent[];
}

interface LegacyDb {
  teams?: LegacyTeam[];
  players?: LegacyPlayer[];
  games?: LegacyGame[];
  live?: Record<string, unknown>;
  custom?: Record<string, unknown>;
}

/**
 * Extracts a `data:image/<mime>;base64,...` string into `server/uploads/<folder>/<prefix>-<id>.<ext>`
 * and returns the public URL path `/uploads/<folder>/<prefix>-<id>.<ext>`.
 */
function extractPhoto(
  dataUrl: string | undefined,
  folder: UploadFolder,
  prefix: 'team' | 'player',
  id: number,
): string | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;

  // Already a relative upload path
  if (dataUrl.startsWith('/uploads/')) return dataUrl;

  const match = /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;

  const rawExt = match[1].toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;
  const filename = `${prefix}-${id}.${ext}`;
  const fullPath = path.join(uploadsDir, folder, filename);

  writeFileSync(fullPath, Buffer.from(match[2], 'base64'));
  return `/uploads/${folder}/${filename}`;
}

const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as LegacyDb;
const teams = raw.teams ?? [];
const players = raw.players ?? [];
const games = raw.games ?? [];

const validTeamIds = new Set(teams.map((t) => Number(t.id)));
const validPlayerIds = new Set(players.map((p) => Number(p.id)));

const insertTeam = db.prepare(`
  INSERT INTO teams (id, name, abbr, alias, color, photo_path, category, archived, coach, assistant, captain_id)
  VALUES (@id, @name, @abbr, @alias, @color, @photo_path, @category, @archived, @coach, @assistant, @captain_id)
`);

const insertPlayer = db.prepare(`
  INSERT INTO players (id, team_id, first, last, nick, number, locale, photo_path, archived, verified, verified_at)
  VALUES (@id, @team_id, @first, @last, @nick, @number, @locale, @photo_path, @archived, @verified, @verified_at)
`);

const insertGame = db.prepare(`
  INSERT INTO games (id, season, date, time, no, competition, place, home_id, away_id, status, running_time, rt_last2, lineup_period, is_default)
  VALUES (@id, @season, @date, @time, @no, @competition, @place, @home_id, @away_id, @status, @running_time, @rt_last2, @lineup_period, @is_default)
`);

const insertActive = db.prepare(`
  INSERT OR IGNORE INTO game_active (game_id, team_id, player_id)
  VALUES (?, ?, ?)
`);

const insertPlayed = db.prepare(`
  INSERT OR IGNORE INTO game_played (game_id, player_id)
  VALUES (?, ?)
`);

const insertAdj = db.prepare(`
  INSERT INTO game_adj (game_id, team_id, pts)
  VALUES (?, ?, ?)
`);

const insertEvent = db.prepare(`
  INSERT INTO events (id, game_id, seq, period, clock, team_id, player_id, type, out_id, pts, secs, foul_type, team_foul, staff)
  VALUES (@id, @game_id, @seq, @period, @clock, @team_id, @player_id, @type, @out_id, @pts, @secs, @foul_type, @team_foul, @staff)
`);

const upsertLiveState = db.prepare(`
  INSERT INTO live_state (id, json) VALUES (1, ?)
  ON CONFLICT(id) DO UPDATE SET json = excluded.json
`);

const upsertCustomState = db.prepare(`
  INSERT INTO custom_state (id, json) VALUES (1, ?)
  ON CONFLICT(id) DO UPDATE SET json = excluded.json
`);

let teamLogosExtracted = 0;
let soloPhotosExtracted = 0;
let totalEvents = 0;

const migrate = db.transaction(() => {
  // Clear existing data in child -> parent order so re-running the script is safe
  db.exec(`
    DELETE FROM events;
    DELETE FROM game_adj;
    DELETE FROM game_played;
    DELETE FROM game_active;
    DELETE FROM games;
    DELETE FROM players;
    DELETE FROM teams;
  `);

  // 1. Teams -> uploads/team-logos/
  for (const t of teams) {
    const id = Number(t.id);
    const photoPath = extractPhoto(t.photo, 'team-logos', 'team', id);
    if (photoPath) teamLogosExtracted++;

    const validCategories = ['Senior', 'Junior', 'Free'];
    const category = validCategories.includes(t.category ?? '')
      ? t.category!
      : /junior/i.test(t.name)
        ? 'Junior'
        : /senior/i.test(t.name)
          ? 'Senior'
          : 'Free';

    insertTeam.run({
      id,
      name: t.name,
      abbr: t.abbr ?? '',
      alias: t.alias ?? '',
      color: t.color || '#3b82f6',
      photo_path: photoPath,
      category,
      archived: t.archived ? 1 : 0,
      coach: t.coach ?? '',
      assistant: t.assistant ?? '',
      captain_id: t.captainId && validPlayerIds.has(Number(t.captainId)) ? Number(t.captainId) : null,
    });
  }

  // 2. Players -> uploads/solo-photos/
  for (const p of players) {
    const id = Number(p.id);
    const teamId = Number(p.teamId);
    if (!validTeamIds.has(teamId)) continue;

    const photoPath = extractPhoto(p.photo, 'solo-photos', 'player', id);
    if (photoPath) soloPhotosExtracted++;

    insertPlayer.run({
      id,
      team_id: teamId,
      first: p.first ?? '',
      last: p.last ?? '',
      nick: p.nick ?? '',
      number: String(p.number ?? ''),
      locale: p.locale ?? '',
      photo_path: photoPath,
      archived: p.archived ? 1 : 0,
      verified: p.verified ? 1 : 0,
      verified_at: p.verified && p.verifiedAt ? p.verifiedAt : null,
    });
  }

  // 3. Games (sorted by date + time so `no` is guaranteed sequential if missing)
  const sortedGames = [...games].sort((x, y) => {
    const kx = `${x.date || ''} ${x.time || '00:00'}`;
    const ky = `${y.date || ''} ${y.time || '00:00'}`;
    return kx.localeCompare(ky) || Number(x.id) - Number(y.id);
  });

  let nextEventId = 1;

  sortedGames.forEach((g, idx) => {
    const gameId = Number(g.id);
    const homeId = Number(g.home);
    const awayId = Number(g.away);
    if (!validTeamIds.has(homeId) || !validTeamIds.has(awayId)) return;

    insertGame.run({
      id: gameId,
      season: String(g.season),
      date: g.date,
      time: g.time ?? '',
      no: g.no && g.no > 0 ? Number(g.no) : idx + 1,
      competition: g.competition || 'BCBL',
      place: g.place || 'Rodriguez Village Basketball Court',
      home_id: homeId,
      away_id: awayId,
      status: g.status || 'scheduled',
      running_time: g.runningTime ? 1 : 0,
      rt_last2: g.rtLast2 === false ? 0 : 1,
      lineup_period: Number(g.lineupPeriod ?? 0),
      is_default: g.isDefault ? 1 : 0,
    });

    if (g.active) {
      for (const [teamKey, playerIds] of Object.entries(g.active)) {
        const teamId = Number(teamKey);
        if (!validTeamIds.has(teamId)) continue;
        for (const pid of playerIds ?? []) {
          if (validPlayerIds.has(Number(pid))) {
            insertActive.run(gameId, teamId, Number(pid));
          }
        }
      }
    }

    for (const pid of g.played ?? []) {
      if (validPlayerIds.has(Number(pid))) {
        insertPlayed.run(gameId, Number(pid));
      }
    }

    if (g.adj) {
      for (const [teamKey, pts] of Object.entries(g.adj)) {
        const teamId = Number(teamKey);
        const delta = Number(pts);
        if (validTeamIds.has(teamId) && delta !== 0) {
          insertAdj.run(gameId, teamId, delta);
        }
      }
    }

    (g.events ?? []).forEach((ev, seq) => {
      const playerId = ev.playerId != null && validPlayerIds.has(Number(ev.playerId)) ? Number(ev.playerId) : null;
      const outId = ev.outId != null && validPlayerIds.has(Number(ev.outId)) ? Number(ev.outId) : null;

      insertEvent.run({
        id: nextEventId++,
        game_id: gameId,
        seq,
        period: Number(ev.period ?? 1),
        clock: Number(ev.clock ?? 0),
        team_id: ev.teamId != null ? Number(ev.teamId) : null,
        player_id: playerId,
        type: ev.type,
        out_id: outId,
        pts: ev.pts != null ? Number(ev.pts) : null,
        secs: ev.secs != null ? Number(ev.secs) : null,
        foul_type: ev.foulType ?? null,
        team_foul: ev.teamFoul === undefined ? null : ev.teamFoul ? 1 : 0,
        staff: ev.staff ?? null,
      });
      totalEvents++;
    });
  });

  // 4. Live & Custom state singletons (reset transient buzzer state)
  const liveState = {
    gameId: null,
    period: 1,
    clock: 600000,
    periodLen: 600000,
    running: false,
    shot: 24000,
    shotOn: true,
    shotHold: false,
    arrow: null,
    timeouts: {},
    names: {},
    toKind: null,
    toTeam: null,
    toLeft: 0,
    toSuspended: false,
    swap: false,
    timeoutSecs: 30,
    ...(raw.live ?? {}),
    buzzOn: false,
    buzzLeft: 0,
    buzzKind: null,
  };

  const customState = {
    a: { name: 'HOME', full: 'Home', color: '#ef4444', score: 0, fouls: 0, timeouts: 2 },
    b: { name: 'GUEST', full: 'Guest', color: '#3b82f6', score: 0, fouls: 0, timeouts: 2 },
    period: 1,
    clock: 600000,
    periodLen: 600000,
    running: false,
    shot: 24000,
    shotOn: true,
    shotHold: false,
    arrow: null,
    swap: false,
    toKind: null,
    toTeam: null,
    toLeft: 0,
    toSuspended: false,
    timeoutSecs: 30,
    ...(raw.custom ?? {}),
    buzzOn: false,
    buzzLeft: 0,
    buzzKind: null,
  };

  upsertLiveState.run(JSON.stringify(liveState));
  upsertCustomState.run(JSON.stringify(customState));
});

migrate();

const counts = {
  teams: (db.prepare('SELECT COUNT(*) AS c FROM teams').get() as { c: number }).c,
  players: (db.prepare('SELECT COUNT(*) AS c FROM players').get() as { c: number }).c,
  games: (db.prepare('SELECT COUNT(*) AS c FROM games').get() as { c: number }).c,
  events: (db.prepare('SELECT COUNT(*) AS c FROM events').get() as { c: number }).c,
};

console.log('Migration complete:');
console.log(`  Teams:        ${counts.teams} (${teamLogosExtracted} logos -> uploads/team-logos/)`);
console.log(`  Players:      ${counts.players} (${soloPhotosExtracted} photos -> uploads/solo-photos/)`);
console.log(`  Games:        ${counts.games}`);
console.log(`  Events:       ${counts.events}`);
console.log(`  Ready dirs:   ${UPLOAD_FOLDERS.join(', ')}`);