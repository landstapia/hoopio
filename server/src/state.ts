import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { db } from './db.js';
import type {
  CustomState,
  FullDbPayload,
  Game,
  GameEvent,
  LiveState,
  PatchChange,
  Player,
  Team,
  TeamCategory,
} from './types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const serverDir = path.resolve(here, '..');
export const uploadsDir = path.join(serverDir, 'uploads');
export const logFile = process.env.LOG_FILE ?? path.join(serverDir, 'game-log.txt');

const DEFAULT_PLACE = 'Rodriguez Village Basketball Court';
const TEAM_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6'];
const TEAM_CATEGORIES: TeamCategory[] = ['Senior', 'Junior', 'Free'];

export const defaultLiveState = (): LiveState => ({
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
  buzzOn: false,
  buzzLeft: 0,
  buzzKind: null,
  timeoutSecs: 30,
});

export const defaultCustomState = (): CustomState => ({
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
  buzzOn: false,
  buzzLeft: 0,
  buzzKind: null,
  timeoutSecs: 30,
});

// Ensure singleton rows exist on first boot
db.prepare('INSERT OR IGNORE INTO live_state (id, json) VALUES (1, ?)').run(JSON.stringify(defaultLiveState()));
db.prepare('INSERT OR IGNORE INTO custom_state (id, json) VALUES (1, ?)').run(JSON.stringify(defaultCustomState()));

export function writeLog(text: string): string {
  const line = `[${new Date().toISOString()}] ${text}`;
  appendFileSync(logFile, `${line}\n`);
  return line;
}

export function readLog(): string {
  return existsSync(logFile) ? readFileSync(logFile, 'utf8') : '';
}

export function getLiveState(): LiveState {
  const row = db.prepare('SELECT json FROM live_state WHERE id = 1').get() as { json: string } | undefined;
  return { ...defaultLiveState(), ...(row ? JSON.parse(row.json) : {}) };
}

export function saveLiveState(live: LiveState): void {
  db.prepare('INSERT INTO live_state (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json').run(
    JSON.stringify(live),
  );
}

export function getCustomState(): CustomState {
  const row = db.prepare('SELECT json FROM custom_state WHERE id = 1').get() as { json: string } | undefined;
  const parsed = row ? JSON.parse(row.json) : {};
  const base = defaultCustomState();
  return {
    ...base,
    ...parsed,
    a: { ...base.a, ...(parsed.a ?? {}) },
    b: { ...base.b, ...(parsed.b ?? {}) },
  };
}

export function saveCustomState(custom: CustomState): void {
  db.prepare('INSERT INTO custom_state (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json').run(
    JSON.stringify(custom),
  );
}

/**
 * If a base64 image string is passed via legacy-compatible patch payloads, save it to disk
 * inside uploads/team-logos or uploads/solo-photos and return its `/uploads/...` path.
 */
function persistInlinePhoto(
  photo: string | undefined,
  folder: 'team-logos' | 'solo-photos',
  prefix: 'team' | 'player',
  id: number,
): string | null {
  if (!photo) return null;
  if (photo.startsWith('/uploads/')) return photo;

  const match = /^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/.exec(photo);
  if (!match) return null;

  const rawExt = match[1].toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;
  const dir = path.join(uploadsDir, folder);
  mkdirSync(dir, { recursive: true });
  const filename = `${prefix}-${id}.${ext}`;
  writeFileSync(path.join(dir, filename), Buffer.from(match[2], 'base64'));
  return `/uploads/${folder}/${filename}`;
}

export function renumberGames(): void {
  const rows = db.prepare('SELECT id, date, time FROM games').all() as Array<{ id: number; date: string; time: string }>;
  rows.sort((x, y) => {
    const kx = `${x.date || ''} ${x.time || '00:00'}`;
    const ky = `${y.date || ''} ${y.time || '00:00'}`;
    return kx.localeCompare(ky) || x.id - y.id;
  });
  const stmt = db.prepare('UPDATE games SET no = ? WHERE id = ?');
  rows.forEach((r, idx) => stmt.run(idx + 1, r.id));
}

export function useDefaultGame(live: LiveState): boolean {
  const defaults = db.prepare('SELECT id FROM games WHERE is_default = 1 ORDER BY id ASC').all() as Array<{ id: number }>;
  if (defaults.length > 1) {
    const keepId = defaults[defaults.length - 1].id;
    db.prepare('UPDATE games SET is_default = 0 WHERE is_default = 1 AND id != ?').run(keepId);
  }
  const def = defaults[defaults.length - 1];
  if (!def) return false;

  const currentExists =
    live.gameId != null && !!(db.prepare('SELECT 1 FROM games WHERE id = ?').get(live.gameId) as unknown);
  if (!currentExists) {
    live.gameId = def.id;
    return true;
  }
  return false;
}

function sameCategory(homeId: number, awayId: number): boolean {
  if (homeId === awayId) return false;
  const h = db.prepare('SELECT category FROM teams WHERE id = ?').get(homeId) as { category: string } | undefined;
  const a = db.prepare('SELECT category FROM teams WHERE id = ?').get(awayId) as { category: string } | undefined;
  return !!h && !!a && (h.category || 'Free') === (a.category || 'Free');
}

function addTime(target: { clock: number; shot: number }, delta: { clock?: number; shot?: number }): void {
  if (typeof delta.clock === 'number') target.clock = Math.max(0, target.clock + delta.clock);
  if (typeof delta.shot === 'number') target.shot = Math.max(0, target.shot + delta.shot);
}

export function getFullState(): FullDbPayload {
  const teamRows = db.prepare('SELECT * FROM teams ORDER BY id ASC').all() as Array<Record<string, unknown>>;
  const teams: Team[] = teamRows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    abbr: String(r.abbr ?? ''),
    alias: String(r.alias ?? ''),
    color: String(r.color ?? '#3b82f6'),
    photo: r.photo_path ? String(r.photo_path) : '',
    category: (TEAM_CATEGORIES.includes(r.category as TeamCategory) ? r.category : 'Free') as TeamCategory,
    archived: Boolean(r.archived),
    coach: String(r.coach ?? ''),
    assistant: String(r.assistant ?? ''),
    captainId: r.captain_id != null ? Number(r.captain_id) : null,
  }));

  const playerRows = db.prepare('SELECT * FROM players ORDER BY id ASC').all() as Array<Record<string, unknown>>;
  const players: Player[] = playerRows.map((r) => ({
    id: Number(r.id),
    teamId: Number(r.team_id),
    first: String(r.first ?? ''),
    last: String(r.last ?? ''),
    nick: String(r.nick ?? ''),
    number: String(r.number ?? ''),
    locale: String(r.locale ?? ''),
    photo: r.photo_path ? String(r.photo_path) : '',
    archived: Boolean(r.archived),
    verified: Boolean(r.verified),
    ...(r.verified && r.verified_at ? { verifiedAt: String(r.verified_at) } : {}),
  }));

  const gameRows = db.prepare('SELECT * FROM games ORDER BY id ASC').all() as Array<Record<string, unknown>>;
  const activeRows = db.prepare('SELECT game_id, team_id, player_id FROM game_active').all() as Array<{
    game_id: number;
    team_id: number;
    player_id: number;
  }>;
  const playedRows = db.prepare('SELECT game_id, player_id FROM game_played').all() as Array<{
    game_id: number;
    player_id: number;
  }>;
  const adjRows = db.prepare('SELECT game_id, team_id, pts FROM game_adj').all() as Array<{
    game_id: number;
    team_id: number;
    pts: number;
  }>;
  const eventRows = db.prepare('SELECT * FROM events ORDER BY game_id ASC, seq ASC').all() as Array<
    Record<string, unknown>
  >;

  const activeByGame = new Map<number, Record<number, number[]>>();
  for (const r of activeRows) {
    let map = activeByGame.get(r.game_id);
    if (!map) {
      map = {};
      activeByGame.set(r.game_id, map);
    }
    (map[r.team_id] ??= []).push(r.player_id);
  }

  const playedByGame = new Map<number, number[]>();
  for (const r of playedRows) {
    let list = playedByGame.get(r.game_id);
    if (!list) {
      list = [];
      playedByGame.set(r.game_id, list);
    }
    list.push(r.player_id);
  }

  const adjByGame = new Map<number, Record<number, number>>();
  for (const r of adjRows) {
    let map = adjByGame.get(r.game_id);
    if (!map) {
      map = {};
      adjByGame.set(r.game_id, map);
    }
    map[r.team_id] = r.pts;
  }

  const eventsByGame = new Map<number, GameEvent[]>();
  for (const r of eventRows) {
    const gid = Number(r.game_id);
    let list = eventsByGame.get(gid);
    if (!list) {
      list = [];
      eventsByGame.set(gid, list);
    }
    const ev: GameEvent = {
      id: Number(r.id),
      period: Number(r.period),
      clock: Number(r.clock),
      teamId: r.team_id != null ? Number(r.team_id) : null,
      playerId: r.player_id != null ? Number(r.player_id) : null,
      type: String(r.type),
    };
    if (r.out_id != null) ev.outId = Number(r.out_id);
    if (r.pts != null) ev.pts = Number(r.pts);
    if (r.secs != null) ev.secs = Number(r.secs);
    if (r.foul_type != null) ev.foulType = String(r.foul_type) as GameEvent['foulType'];
    if (r.team_foul !== null && r.team_foul !== undefined) ev.teamFoul = Boolean(r.team_foul);
    if (r.staff != null) ev.staff = String(r.staff) as GameEvent['staff'];
    list.push(ev);
  }

  const games: Game[] = gameRows.map((r) => {
    const id = Number(r.id);
    const home = Number(r.home_id);
    const away = Number(r.away_id);
    const active = activeByGame.get(id) ?? {};
    active[home] ??= [];
    active[away] ??= [];
    return {
      id,
      season: String(r.season),
      date: String(r.date),
      time: String(r.time ?? ''),
      no: Number(r.no ?? 0),
      competition: String(r.competition ?? 'BCBL'),
      place: String(r.place ?? DEFAULT_PLACE),
      home,
      away,
      status: String(r.status ?? 'scheduled') as Game['status'],
      runningTime: Boolean(r.running_time),
      rtLast2: Boolean(r.rt_last2),
      lineupPeriod: Number(r.lineup_period ?? 0),
      isDefault: Boolean(r.is_default),
      events: eventsByGame.get(id) ?? [],
      adj: adjByGame.get(id) ?? {},
      active,
      played: playedByGame.get(id) ?? [],
    };
  });

  return {
    teams,
    players,
    games,
    live: getLiveState(),
    custom: getCustomState(),
  };
}

export function applyChange(change: PatchChange): { state: FullDbPayload; logLine?: string } {
  let logLine: string | undefined;

  const runTx = db.transaction(() => {
    const live = getLiveState();
    const custom = getCustomState();
    let liveDirty = false;
    let customDirty = false;

    if (change.live) {
      if (('buzzLeft' in change.live || 'buzzOn' in change.live) && !('buzzKind' in change.live)) {
        live.buzzKind = null;
      }
      Object.assign(live, change.live);
      liveDirty = true;
    }
    if (change.liveAdd) {
      addTime(live, change.liveAdd);
      liveDirty = true;
    }
    if (change.customAdd) {
      addTime(custom, change.customAdd);
      customDirty = true;
    }
    if (change.custom) {
      const { a, b, ...rest } = change.custom;
      if (('buzzLeft' in rest || 'buzzOn' in rest) && !('buzzKind' in rest)) {
        custom.buzzKind = null;
      }
      Object.assign(custom, rest);
      if (a) Object.assign(custom.a, a);
      if (b) Object.assign(custom.b, b);
      customDirty = true;
    }

    // Upsert teams
    for (const t of change.teams ?? []) {
      const category = TEAM_CATEGORIES.includes(t.category as TeamCategory) ? t.category! : 'Free';
      if (t.id) {
        const photoPath =
          t.photo === ''
            ? null
            : persistInlinePhoto(t.photo, 'team-logos', 'team', t.id) ??
              ((db.prepare('SELECT photo_path FROM teams WHERE id = ?').get(t.id) as { photo_path: string | null } | undefined)
                ?.photo_path ?? null);

        db.prepare(`
          UPDATE teams
          SET name = @name, abbr = @abbr, alias = @alias, color = @color, photo_path = @photo_path,
              category = @category, archived = @archived, coach = @coach, assistant = @assistant, captain_id = @captain_id
          WHERE id = @id
        `).run({
          id: t.id,
          name: t.name ?? '',
          abbr: t.abbr ?? '',
          alias: t.alias ?? '',
          color: t.color || '#3b82f6',
          photo_path: photoPath,
          category,
          archived: t.archived ? 1 : 0,
          coach: t.coach ?? '',
          assistant: t.assistant ?? '',
          captain_id: t.captainId ?? null,
        });
      } else {
        const nextId = ((db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM teams').get() as { nextId: number }).nextId);
        const photoPath = persistInlinePhoto(t.photo, 'team-logos', 'team', nextId);
        db.prepare(`
          INSERT INTO teams (id, name, abbr, alias, color, photo_path, category, archived, coach, assistant, captain_id)
          VALUES (@id, @name, @abbr, @alias, @color, @photo_path, @category, @archived, @coach, @assistant, @captain_id)
        `).run({
          id: nextId,
          name: t.name ?? '',
          abbr: t.abbr ?? '',
          alias: t.alias ?? '',
          color: t.color || TEAM_COLORS[(nextId - 1) % TEAM_COLORS.length],
          photo_path: photoPath,
          category,
          archived: t.archived ? 1 : 0,
          coach: t.coach ?? '',
          assistant: t.assistant ?? '',
          captain_id: t.captainId ?? null,
        });
      }
    }

    // Upsert players (server-side verifiedAt timestamping)
    for (const p of change.players ?? []) {
      const old = p.id
        ? (db.prepare('SELECT verified, verified_at, photo_path FROM players WHERE id = ?').get(p.id) as
            | { verified: number; verified_at: string | null; photo_path: string | null }
            | undefined)
        : undefined;

      const verified = p.verified ? 1 : 0;
      const verifiedAt = verified ? (old?.verified && old.verified_at ? old.verified_at : new Date().toISOString()) : null;

      if (p.id) {
        const photoPath =
          p.photo === ''
            ? null
            : persistInlinePhoto(p.photo, 'solo-photos', 'player', p.id) ?? (old?.photo_path ?? null);

        db.prepare(`
          UPDATE players
          SET team_id = @team_id, first = @first, last = @last, nick = @nick, number = @number,
              locale = @locale, photo_path = @photo_path, archived = @archived, verified = @verified, verified_at = @verified_at
          WHERE id = @id
        `).run({
          id: p.id,
          team_id: Number(p.teamId),
          first: p.first ?? '',
          last: p.last ?? '',
          nick: p.nick ?? '',
          number: String(p.number ?? ''),
          locale: p.locale ?? '',
          photo_path: photoPath,
          archived: p.archived ? 1 : 0,
          verified,
          verified_at: verifiedAt,
        });
      } else {
        const nextId = ((db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM players').get() as { nextId: number }).nextId);
        const photoPath = persistInlinePhoto(p.photo, 'solo-photos', 'player', nextId);
        db.prepare(`
          INSERT INTO players (id, team_id, first, last, nick, number, locale, photo_path, archived, verified, verified_at)
          VALUES (@id, @team_id, @first, @last, @nick, @number, @locale, @photo_path, @archived, @verified, @verified_at)
        `).run({
          id: nextId,
          team_id: Number(p.teamId),
          first: p.first ?? '',
          last: p.last ?? '',
          nick: p.nick ?? '',
          number: String(p.number ?? ''),
          locale: p.locale ?? '',
          photo_path: photoPath,
          archived: p.archived ? 1 : 0,
          verified,
          verified_at: verifiedAt,
        });
      }
    }

    // Replace edited games (metadata, active lineups, played list, adj, events)
    for (const g of change.games ?? []) {
      const exists = db.prepare('SELECT 1 FROM games WHERE id = ?').get(g.id);
      if (!exists) continue;

      db.prepare(`
        UPDATE games
        SET season = @season, date = @date, time = @time, competition = @competition, place = @place,
            home_id = @home_id, away_id = @away_id, status = @status, running_time = @running_time,
            rt_last2 = @rt_last2, lineup_period = @lineup_period, is_default = @is_default
        WHERE id = @id
      `).run({
        id: g.id,
        season: String(g.season),
        date: g.date,
        time: g.time ?? '',
        competition: g.competition || 'BCBL',
        place: g.place || DEFAULT_PLACE,
        home_id: Number(g.home),
        away_id: Number(g.away),
        status: g.status || 'scheduled',
        running_time: g.runningTime ? 1 : 0,
        rt_last2: g.rtLast2 === false ? 0 : 1,
        lineup_period: Number(g.lineupPeriod ?? 0),
        is_default: g.isDefault ? 1 : 0,
      });

      db.prepare('DELETE FROM game_active WHERE game_id = ?').run(g.id);
      const insAct = db.prepare('INSERT OR IGNORE INTO game_active (game_id, team_id, player_id) VALUES (?, ?, ?)');
      for (const [teamKey, pids] of Object.entries(g.active ?? {})) {
        const tid = Number(teamKey);
        for (const pid of pids ?? []) insAct.run(g.id, tid, Number(pid));
      }

      db.prepare('DELETE FROM game_played WHERE game_id = ?').run(g.id);
      const insPl = db.prepare('INSERT OR IGNORE INTO game_played (game_id, player_id) VALUES (?, ?)');
      for (const pid of g.played ?? []) insPl.run(g.id, Number(pid));

      db.prepare('DELETE FROM game_adj WHERE game_id = ?').run(g.id);
      const insAdj = db.prepare('INSERT INTO game_adj (game_id, team_id, pts) VALUES (?, ?, ?)');
      for (const [teamKey, pts] of Object.entries(g.adj ?? {})) {
        const delta = Number(pts);
        if (delta !== 0) insAdj.run(g.id, Number(teamKey), delta);
      }

      db.prepare('DELETE FROM events WHERE game_id = ?').run(g.id);
      const insEv = db.prepare(`
        INSERT INTO events (game_id, seq, period, clock, team_id, player_id, type, out_id, pts, secs, foul_type, team_foul, staff)
        VALUES (@game_id, @seq, @period, @clock, @team_id, @player_id, @type, @out_id, @pts, @secs, @foul_type, @team_foul, @staff)
      `);
      (g.events ?? []).forEach((ev, seq) => {
        insEv.run({
          game_id: g.id,
          seq,
          period: Number(ev.period ?? 1),
          clock: Number(ev.clock ?? 0),
          team_id: ev.teamId != null ? Number(ev.teamId) : null,
          player_id: ev.playerId != null ? Number(ev.playerId) : null,
          type: ev.type,
          out_id: ev.outId != null ? Number(ev.outId) : null,
          pts: ev.pts != null ? Number(ev.pts) : null,
          secs: ev.secs != null ? Number(ev.secs) : null,
          foul_type: ev.foulType ?? null,
          team_foul: ev.teamFoul === undefined ? null : ev.teamFoul ? 1 : 0,
          staff: ev.staff ?? null,
        });
      });
    }

    // Create new game (same-category enforcement)
    if (change.newGame) {
      const home = Number(change.newGame.home);
      const away = Number(change.newGame.away);
      if (sameCategory(home, away)) {
        const nextGameId = ((db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM games').get() as { nextId: number }).nextId);
        db.prepare(`
          INSERT INTO games (id, season, date, time, no, competition, place, home_id, away_id, status, running_time, rt_last2, lineup_period, is_default)
          VALUES (@id, @season, @date, @time, 0, @competition, @place, @home_id, @away_id, 'scheduled', @running_time, 1, 0, 0)
        `).run({
          id: nextGameId,
          season: String(change.newGame.season),
          date: change.newGame.date,
          time: change.newGame.time ?? '',
          competition: change.newGame.competition || 'BCBL',
          place: change.newGame.place || DEFAULT_PLACE,
          home_id: home,
          away_id: away,
          running_time: change.newGame.runningTime ? 1 : 0,
        });

        const insAct = db.prepare('INSERT OR IGNORE INTO game_active (game_id, team_id, player_id) VALUES (?, ?, ?)');
        const insPl = db.prepare('INSERT OR IGNORE INTO game_played (game_id, player_id) VALUES (?, ?)');
        for (const tid of [home, away]) {
          const starters = db
            .prepare('SELECT id FROM players WHERE team_id = ? AND archived = 0 ORDER BY id ASC LIMIT 5')
            .all(tid) as Array<{ id: number }>;
          for (const s of starters) {
            insAct.run(nextGameId, tid, s.id);
            insPl.run(nextGameId, s.id);
          }
        }
      } else {
        logLine = writeLog('New game REFUSED: teams must be in the same category (Senior, Junior or Free) and different');
      }
    }

    // Delete game / team / player (ON DELETE CASCADE handles child tables)
    if (change.delGame) {
      db.prepare('DELETE FROM games WHERE id = ?').run(change.delGame);
      if (live.gameId === change.delGame) {
        live.gameId = null;
        liveDirty = true;
      }
    }

    if (change.delTeam) {
      const tid = change.delTeam;
      const liveGame = live.gameId
        ? (db.prepare('SELECT home_id, away_id FROM games WHERE id = ?').get(live.gameId) as
            | { home_id: number; away_id: number }
            | undefined)
        : undefined;
      db.prepare('DELETE FROM teams WHERE id = ?').run(tid);
      if (liveGame && (liveGame.home_id === tid || liveGame.away_id === tid)) {
        live.gameId = null;
        live.toKind = null;
        live.toTeam = null;
        liveDirty = true;
      }
    }

    if (change.delPlayer) {
      db.prepare('DELETE FROM players WHERE id = ?').run(change.delPlayer);
    }

    renumberGames();
    if (useDefaultGame(live)) liveDirty = true;

    if (liveDirty) saveLiveState(live);
    if (customDirty) saveCustomState(custom);
    if (change.log) logLine = writeLog(change.log);
  });

  runTx();
  return { state: getFullState(), logLine };
}

export function replaceFullState(incoming: Partial<FullDbPayload>): { state: FullDbPayload; logLine: string } {
  let logLine = '';

  const runTx = db.transaction(() => {
    // Clear child tables first, then parent tables
    db.prepare('DELETE FROM events').run();
    db.prepare('DELETE FROM game_adj').run();
    db.prepare('DELETE FROM game_played').run();
    db.prepare('DELETE FROM game_active').run();
    db.prepare('DELETE FROM games').run();
    db.prepare('DELETE FROM players').run();
    db.prepare('DELETE FROM teams').run();

    // Restore teams
    const insTeam = db.prepare(`
      INSERT INTO teams (id, name, abbr, alias, color, photo_path, category, archived, coach, assistant, captain_id)
      VALUES (@id, @name, @abbr, @alias, @color, @photo_path, @category, @archived, @coach, @assistant, @captain_id)
    `);
    for (const t of incoming.teams ?? []) {
      const id = Number(t.id);
      const category = TEAM_CATEGORIES.includes(t.category as TeamCategory) ? t.category : 'Free';
      const photoPath = persistInlinePhoto(t.photo, 'team-logos', 'team', id);
      insTeam.run({
        id,
        name: t.name ?? '',
        abbr: t.abbr ?? '',
        alias: t.alias ?? '',
        color: t.color || TEAM_COLORS[(id - 1) % TEAM_COLORS.length],
        photo_path: photoPath,
        category,
        archived: t.archived ? 1 : 0,
        coach: t.coach ?? '',
        assistant: t.assistant ?? '',
        captain_id: t.captainId ?? null,
      });
    }

    // Restore players
    const insPlayer = db.prepare(`
      INSERT INTO players (id, team_id, first, last, nick, number, locale, photo_path, archived, verified, verified_at)
      VALUES (@id, @team_id, @first, @last, @nick, @number, @locale, @photo_path, @archived, @verified, @verified_at)
    `);
    for (const p of incoming.players ?? []) {
      const id = Number(p.id);
      const photoPath = persistInlinePhoto(p.photo, 'solo-photos', 'player', id);
      insPlayer.run({
        id,
        team_id: Number(p.teamId),
        first: p.first ?? '',
        last: p.last ?? '',
        nick: p.nick ?? '',
        number: String(p.number ?? ''),
        locale: p.locale ?? '',
        photo_path: photoPath,
        archived: p.archived ? 1 : 0,
        verified: p.verified ? 1 : 0,
        verified_at: p.verified ? (p.verifiedAt ?? new Date().toISOString()) : null,
      });
    }

    // Restore games and child tables
    const insGame = db.prepare(`
      INSERT INTO games (id, season, date, time, no, competition, place, home_id, away_id, status, running_time, rt_last2, lineup_period, is_default)
      VALUES (@id, @season, @date, @time, @no, @competition, @place, @home_id, @away_id, @status, @running_time, @rt_last2, @lineup_period, @is_default)
    `);
    const insAct = db.prepare('INSERT OR IGNORE INTO game_active (game_id, team_id, player_id) VALUES (?, ?, ?)');
    const insPl = db.prepare('INSERT OR IGNORE INTO game_played (game_id, player_id) VALUES (?, ?)');
    const insAdj = db.prepare('INSERT INTO game_adj (game_id, team_id, pts) VALUES (?, ?, ?)');
    const insEv = db.prepare(`
      INSERT INTO events (game_id, seq, period, clock, team_id, player_id, type, out_id, pts, secs, foul_type, team_foul, staff)
      VALUES (@game_id, @seq, @period, @clock, @team_id, @player_id, @type, @out_id, @pts, @secs, @foul_type, @team_foul, @staff)
    `);

    for (const g of incoming.games ?? []) {
      const gid = Number(g.id);
      insGame.run({
        id: gid,
        season: String(g.season),
        date: g.date,
        time: g.time ?? '',
        no: Number(g.no ?? 0),
        competition: g.competition || 'BCBL',
        place: g.place || DEFAULT_PLACE,
        home_id: Number(g.home),
        away_id: Number(g.away),
        status: g.status || 'scheduled',
        running_time: g.runningTime ? 1 : 0,
        rt_last2: g.rtLast2 === false ? 0 : 1,
        lineup_period: Number(g.lineupPeriod ?? 0),
        is_default: g.isDefault ? 1 : 0,
      });

      for (const [teamKey, pids] of Object.entries(g.active ?? {})) {
        const tid = Number(teamKey);
        for (const pid of pids ?? []) insAct.run(gid, tid, Number(pid));
      }

      for (const pid of g.played ?? []) {
        insPl.run(gid, Number(pid));
      }

      for (const [teamKey, pts] of Object.entries(g.adj ?? {})) {
        const delta = Number(pts);
        if (delta !== 0) insAdj.run(gid, Number(teamKey), delta);
      }

      (g.events ?? []).forEach((ev, seq) => {
        insEv.run({
          game_id: gid,
          seq,
          period: Number(ev.period ?? 1),
          clock: Number(ev.clock ?? 0),
          team_id: ev.teamId != null ? Number(ev.teamId) : null,
          player_id: ev.playerId != null ? Number(ev.playerId) : null,
          type: ev.type,
          out_id: ev.outId != null ? Number(ev.outId) : null,
          pts: ev.pts != null ? Number(ev.pts) : null,
          secs: ev.secs != null ? Number(ev.secs) : null,
          foul_type: ev.foulType ?? null,
          team_foul: ev.teamFoul === undefined ? null : ev.teamFoul ? 1 : 0,
          staff: ev.staff ?? null,
        });
      });
    }

    // Restore singleton states
    const baseLive = defaultLiveState();
    saveLiveState({ ...baseLive, ...(incoming.live ?? {}) });

    const baseCustom = defaultCustomState();
    saveCustomState({
      ...baseCustom,
      ...(incoming.custom ?? {}),
      a: { ...baseCustom.a, ...(incoming.custom?.a ?? {}) },
      b: { ...baseCustom.b, ...(incoming.custom?.b ?? {}) },
    });

    renumberGames();
    logLine = writeLog(
      `Restored full database backup (${incoming.teams?.length ?? 0} teams, ${incoming.players?.length ?? 0} players, ${incoming.games?.length ?? 0} games)`,
    );
  });

  runTx();
  return { state: getFullState(), logLine };
}