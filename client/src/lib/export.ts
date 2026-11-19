import type {
  CustomState,
  FullDbPayload,
  Game,
  GameEvent,
  GameStatus,
  LiveState,
  PatchChange,
  Player,
  Team,
  TeamCategory,
} from '../types';
import { ab, byNumber } from './format';
import { KS, Z, sc, tf } from './stats';

const brandInfo = {
  name: 'HoopIO',
  fullName: 'HoopIO Basketball Management',
  logo: '', // Set to '/logo.png' if you place a logo file in client/public/
};

const VALID_CATEGORIES = new Set<TeamCategory>(['Senior', 'Junior', 'Free']);
const VALID_STATUSES = new Set<GameStatus>(['scheduled', 'live', 'final']);

export interface TransferProgress {
  percent: number;
  label: string;
}

export type ProgressCallback = (progress: TransferProgress) => void;

// --- Time stamp utilities ---
const pad2 = (n: number) => String(n).padStart(2, '0');
function nowInfo() {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return {
    date,
    time,
    file: `${date}_${pad2(d.getHours())}${pad2(d.getMinutes())}`,
    tz: `UTC${sign}${pad2(Math.floor(Math.abs(off) / 60))}:${pad2(Math.abs(off) % 60)}`,
    long: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

// --- HTML & CSV Escaping ---
function escHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// --- File download helper ---
export function downloadFile(name: string, content: string, mimeType: string, extension: string) {
  const text = extension === 'csv' ? '\ufeff' + content + '\r\n' : content;
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}_${nowInfo().file}.${extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// --- Image Data URL Helpers ---
async function urlToDataUrl(photo: string): Promise<string> {
  if (!photo || photo.startsWith('data:image/')) return photo;
  try {
    const res = await fetch(photo);
    if (!res.ok) return photo;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return photo;
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : photo);
      };
      reader.onerror = () => resolve(photo);
      reader.readAsDataURL(blob);
    });
  } catch {
    return photo;
  }
}

async function uploadDataUrlIfNeeded(
  photo: string,
  endpoint: '/api/upload/team-logos' | '/api/upload/solo-photos',
  filenamePrefix: string,
): Promise<string> {
  if (!photo || !photo.startsWith('data:image/')) return photo;

  const match = /^data:(image\/([a-zA-Z0-9+.-]+));base64,(.+)$/.exec(photo);
  if (!match) return '';

  const mime = match[1];
  const rawExt = match[2].toLowerCase();
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;

  const byteChars = atob(match[3]);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i);
  }

  const formData = new FormData();
  formData.append('photo', new Blob([bytes], { type: mime }), `${filenamePrefix}.${ext}`);

  const res = await fetch(endpoint, { method: 'POST', body: formData });
  if (!res.ok) return '';

  const data = (await res.json()) as { url?: string; path?: string };
  return data.url || data.path || '';
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// --- Portable JSON Backup Export & Restore ---
export async function exportDatabaseBackup(
  db: FullDbPayload,
  onProgress?: ProgressCallback,
): Promise<void> {
  const totalMedia = db.teams.length + db.players.length;
  let processed = 0;

  const report = (label: string) => {
    if (!onProgress) return;
    const pct = totalMedia > 0 ? Math.min(95, Math.round((processed / totalMedia) * 95)) : 50;
    onProgress({ percent: pct, label });
  };

  report('Preparing backup…');

  const teamsWithEmbeddedPhotos: Team[] = [];
  for (const t of db.teams) {
    report(`Encoding team logos (${processed + 1}/${totalMedia})…`);
    const photo = await urlToDataUrl(t.photo);
    teamsWithEmbeddedPhotos.push({ ...t, photo });
    processed++;
  }

  const playersWithEmbeddedPhotos: Player[] = [];
  for (const p of db.players) {
    report(`Encoding player photos (${processed + 1}/${totalMedia})…`);
    const photo = await urlToDataUrl(p.photo);
    playersWithEmbeddedPhotos.push({ ...p, photo });
    processed++;
  }

  onProgress?.({ percent: 98, label: 'Packaging JSON file…' });

  const portablePayload: FullDbPayload = {
    ...db,
    teams: teamsWithEmbeddedPhotos,
    players: playersWithEmbeddedPhotos,
  };

  downloadFile(
    'hoopio-backup',
    JSON.stringify(portablePayload, null, 2),
    'application/json;charset=utf-8',
    'json',
  );

  onProgress?.({ percent: 100, label: 'Backup downloaded' });
}

export function normalizeBackupPayload(raw: unknown): FullDbPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid JSON file: expected an object at the root.');
  }

  const src = raw as Record<string, unknown>;
  if (!Array.isArray(src.teams) || !Array.isArray(src.players) || !Array.isArray(src.games)) {
    throw new Error('Invalid backup structure: missing teams, players, or games arrays.');
  }

  const teams: Team[] = src.teams.map((item, idx) => {
    const t = (item ?? {}) as Record<string, unknown>;
    const rawCat = String(t.category || 'Senior') as TeamCategory;
    return {
      id: Number(t.id ?? idx + 1),
      name: String(t.name || `Team ${idx + 1}`),
      abbr: String(t.abbr || String(t.name || 'TM').slice(0, 3)).toUpperCase().slice(0, 5),
      alias: String(t.alias || ''),
      color: String(t.color || '#3b82f6'),
      photo: String(t.photo || ''),
      category: VALID_CATEGORIES.has(rawCat) ? rawCat : 'Senior',
      archived: Boolean(t.archived),
      coach: String(t.coach || ''),
      assistant: String(t.assistant || ''),
      captainId: t.captainId != null && t.captainId !== '' ? Number(t.captainId) : null,
    };
  });

  const players: Player[] = src.players.map((item, idx) => {
    const p = (item ?? {}) as Record<string, unknown>;
    return {
      id: Number(p.id ?? idx + 1),
      teamId: Number(p.teamId ?? 0),
      first: String(p.first || ''),
      last: String(p.last || ''),
      nick: String(p.nick || ''),
      number: String(p.number ?? '0'),
      locale: String(p.locale || ''),
      photo: String(p.photo || ''),
      archived: Boolean(p.archived),
      verified: Boolean(p.verified),
      ...(p.verifiedAt ? { verifiedAt: String(p.verifiedAt) } : {}),
    };
  });

  const games: Game[] = src.games.map((item, idx) => {
    const g = (item ?? {}) as Record<string, unknown>;
    const rawStatus = String(g.status || 'scheduled') as GameStatus;
    const rawEvents = Array.isArray(g.events) ? g.events : [];

    const events: GameEvent[] = rawEvents.map((evItem, evIdx) => {
      const ev = (evItem ?? {}) as Record<string, unknown>;
      return {
        id: Number(ev.id ?? evIdx + 1),
        period: Number(ev.period ?? 1),
        clock: Number(ev.clock ?? 0),
        teamId: ev.teamId != null ? Number(ev.teamId) : null,
        playerId: ev.playerId != null ? Number(ev.playerId) : null,
        type: String(ev.type || ''),
        ...(ev.outId !== undefined ? { outId: ev.outId != null ? Number(ev.outId) : null } : {}),
        ...(ev.pts !== undefined ? { pts: Number(ev.pts) } : {}),
        ...(ev.secs !== undefined ? { secs: Number(ev.secs) } : {}),
        ...(ev.foulType !== undefined ? { foulType: ev.foulType as GameEvent['foulType'] } : {}),
        ...(ev.teamFoul !== undefined ? { teamFoul: Boolean(ev.teamFoul) } : {}),
        ...(ev.staff !== undefined ? { staff: ev.staff as GameEvent['staff'] } : {}),
      };
    });

    return {
      id: Number(g.id ?? idx + 1),
      season: String(g.season || new Date().getFullYear()),
      date: String(g.date || ''),
      time: String(g.time || ''),
      no: Number(g.no ?? idx + 1),
      competition: String(g.competition || ''),
      place: String(g.place || ''),
      home: Number(g.home ?? 0),
      away: Number(g.away ?? 0),
      status: VALID_STATUSES.has(rawStatus) ? rawStatus : 'scheduled',
      runningTime: Boolean(g.runningTime),
      rtLast2: Boolean(g.rtLast2),
      lineupPeriod: Number(g.lineupPeriod ?? 0),
      isDefault: Boolean(g.isDefault),
      events,
      adj: g.adj && typeof g.adj === 'object' ? (g.adj as Record<number, number>) : {},
      active: g.active && typeof g.active === 'object' ? (g.active as Record<number, number[]>) : {},
      played: Array.isArray(g.played) ? g.played.map(Number) : [],
    };
  });

  const rawLive = (src.live && typeof src.live === 'object' ? src.live : {}) as Partial<LiveState>;
  const periodLen = Number(rawLive.periodLen || 600000);
  const live: LiveState = {
    gameId: rawLive.gameId != null ? Number(rawLive.gameId) : null,
    period: Number(rawLive.period || 1),
    clock: Number(rawLive.clock ?? periodLen),
    periodLen,
    running: false,
    shot: Number(rawLive.shot ?? 24000),
    shotOn: rawLive.shotOn !== undefined ? Boolean(rawLive.shotOn) : true,
    shotHold: Boolean(rawLive.shotHold),
    shotViol: Boolean(rawLive.shotViol),
    arrow: rawLive.arrow != null ? Number(rawLive.arrow) : null,
    timeouts: rawLive.timeouts && typeof rawLive.timeouts === 'object' ? rawLive.timeouts : {},
    names: rawLive.names && typeof rawLive.names === 'object' ? rawLive.names : {},
    toKind: rawLive.toKind === 'timeout' || rawLive.toKind === 'break' ? rawLive.toKind : null,
    toTeam: rawLive.toTeam != null ? Number(rawLive.toTeam) : null,
    toLeft: Number(rawLive.toLeft || 0),
    toSuspended: Boolean(rawLive.toSuspended),
    swap: Boolean(rawLive.swap),
    buzzOn: false,
    buzzLeft: 0,
    buzzKind: null,
    timeoutSecs: Number(rawLive.timeoutSecs || 60),
  };

  const rawCustom = (src.custom && typeof src.custom === 'object' ? src.custom : {}) as Partial<CustomState>;
  const customPeriodLen = Number(rawCustom.periodLen || 600000);
  const custom: CustomState = {
    a: {
      name: String(rawCustom.a?.name || 'TEAM A'),
      full: String(rawCustom.a?.full || ''),
      color: String(rawCustom.a?.color || '#3b82f6'),
      score: Number(rawCustom.a?.score || 0),
      fouls: Number(rawCustom.a?.fouls || 0),
      timeouts: Number(rawCustom.a?.timeouts ?? 2),
    },
    b: {
      name: String(rawCustom.b?.name || 'TEAM B'),
      full: String(rawCustom.b?.full || ''),
      color: String(rawCustom.b?.color || '#ef4444'),
      score: Number(rawCustom.b?.score || 0),
      fouls: Number(rawCustom.b?.fouls || 0),
      timeouts: Number(rawCustom.b?.timeouts ?? 2),
    },
    period: Number(rawCustom.period || 1),
    clock: Number(rawCustom.clock ?? customPeriodLen),
    periodLen: customPeriodLen,
    running: false,
    shot: Number(rawCustom.shot ?? 24000),
    shotOn: rawCustom.shotOn !== undefined ? Boolean(rawCustom.shotOn) : true,
    shotHold: Boolean(rawCustom.shotHold),
    arrow: rawCustom.arrow === 'a' || rawCustom.arrow === 'b' ? rawCustom.arrow : null,
    swap: Boolean(rawCustom.swap),
    toKind: rawCustom.toKind === 'timeout' || rawCustom.toKind === 'break' ? rawCustom.toKind : null,
    toTeam: rawCustom.toTeam === 'a' || rawCustom.toTeam === 'b' ? rawCustom.toTeam : null,
    toLeft: Number(rawCustom.toLeft || 0),
    toSuspended: Boolean(rawCustom.toSuspended),
    buzzOn: false,
    buzzLeft: 0,
    buzzKind: null,
    timeoutSecs: Number(rawCustom.timeoutSecs || 30),
  };

  return { teams, players, games, live, custom };
}

export async function restoreDatabaseBackup(
  currentDb: FullDbPayload | null,
  patch: (change: PatchChange) => Promise<FullDbPayload>,
  rawData: unknown,
  onProgress?: ProgressCallback,
): Promise<FullDbPayload> {
  const payload = normalizeBackupPayload(rawData);

  const teamBatches = chunkArray(payload.teams, 10);
  const playerBatches = chunkArray(payload.players, 25);
  const gameBatches = chunkArray(payload.games, 5);

  const nextGameIds = new Set(payload.games.map((g) => g.id));
  const nextPlayerIds = new Set(payload.players.map((p) => p.id));
  const nextTeamIds = new Set(payload.teams.map((t) => t.id));

  const staleGames = currentDb ? currentDb.games.filter((g) => !nextGameIds.has(g.id)) : [];
  const stalePlayers = currentDb ? currentDb.players.filter((p) => !nextPlayerIds.has(p.id)) : [];
  const staleTeams = currentDb ? currentDb.teams.filter((t) => !nextTeamIds.has(t.id)) : [];

  const totalSteps =
    payload.teams.length +
    payload.players.length +
    staleGames.length +
    stalePlayers.length +
    staleTeams.length +
    teamBatches.length +
    playerBatches.length +
    gameBatches.length +
    1;

  let completedSteps = 0;
  const advance = (label: string) => {
    completedSteps++;
    if (!onProgress) return;
    const pct = totalSteps > 0 ? Math.min(99, Math.round((completedSteps / totalSteps) * 100)) : 50;
    onProgress({ percent: pct, label });
  };

  onProgress?.({ percent: 2, label: 'Preparing backup data…' });

  // 1. Extract embedded base64 images back into uploaded files so patch payloads stay small
  const preparedTeams: Team[] = [];
  for (let i = 0; i < payload.teams.length; i++) {
    const t = payload.teams[i];
    const photo = await uploadDataUrlIfNeeded(t.photo, '/api/upload/team-logos', `team-${t.id}`);
    preparedTeams.push({ ...t, photo });
    advance(`Uploading team logos (${i + 1}/${payload.teams.length})…`);
  }

  const preparedPlayers: Player[] = [];
  for (let i = 0; i < payload.players.length; i++) {
    const p = payload.players[i];
    const photo = await uploadDataUrlIfNeeded(p.photo, '/api/upload/solo-photos', `player-${p.id}`);
    preparedPlayers.push({ ...p, photo });
    advance(`Uploading player photos (${i + 1}/${payload.players.length})…`);
  }

  // 2. Remove records not present in the restored backup
  for (const g of staleGames) {
    await patch({ delGame: g.id });
    advance('Cleaning up removed games…');
  }
  for (const p of stalePlayers) {
    await patch({ delPlayer: p.id });
    advance('Cleaning up removed players…');
  }
  for (const t of staleTeams) {
    await patch({ delTeam: t.id });
    advance('Cleaning up removed teams…');
  }

  // 3. Batch-upsert teams, players, games, and live/custom states
  const preparedTeamBatches = chunkArray(preparedTeams, 10);
  for (let i = 0; i < preparedTeamBatches.length; i++) {
    await patch({ teams: preparedTeamBatches[i] });
    advance(`Restoring teams (batch ${i + 1}/${preparedTeamBatches.length})…`);
  }

  const preparedPlayerBatches = chunkArray(preparedPlayers, 25);
  for (let i = 0; i < preparedPlayerBatches.length; i++) {
    await patch({ players: preparedPlayerBatches[i] });
    advance(`Restoring players (batch ${i + 1}/${preparedPlayerBatches.length})…`);
  }

  for (let i = 0; i < gameBatches.length; i++) {
    await patch({ games: gameBatches[i] });
    advance(`Restoring games (batch ${i + 1}/${gameBatches.length})…`);
  }

  const finalState = await patch({
    live: payload.live,
    custom: payload.custom,
    log: `Restored backup (${preparedTeams.length} teams, ${preparedPlayers.length} players, ${payload.games.length} games)`,
  });

  onProgress?.({ percent: 100, label: 'Restore complete' });
  return finalState;
}

// --- Record & Stat Helpers ---
function fullName(p: Player): string {
  const base = [p.first?.trim(), p.last?.trim()].filter(Boolean).join(' ') || `Player #${p.number}`;
  return p.nick ? `${base} “${p.nick}”` : base;
}

function teamRecord(teamId: number, games: Game[]) {
  const r = { games: 0, final: 0, w: 0, l: 0, pf: 0, pa: 0, seasons: [] as string[] };
  const teamGames = games.filter((g) => g.home === teamId || g.away === teamId);

  teamGames.forEach((g) => {
    r.games++;
    if (g.status !== 'final') return;
    const opp = g.home === teamId ? g.away : g.home;
    const mine = sc(g, teamId);
    const theirs = sc(g, opp);
    r.final++;
    r.pf += mine;
    r.pa += theirs;
    if (mine > theirs) r.w++;
    else if (mine < theirs) r.l++;
  });
  r.seasons = [...new Set(teamGames.map((g) => g.season))].sort();
  return r;
}

const pctText = (w: number, n: number) => (n ? (w / n).toFixed(3) : '');

function playerTotals(playerId: number, games: Game[]) {
  const totals = Z();
  let gp = 0;

  for (const g of games) {
    const playerEvents = g.events.filter((e) => e.playerId === playerId);
    const participated = g.played.includes(playerId) || playerEvents.length > 0;
    if (participated && g.status !== 'scheduled') gp++;

    for (const e of playerEvents) {
      if (e.type === 'pts') totals.pts += e.pts || 0;
      else if (e.type === 'foul') totals.pf += 1;
      else if ((KS as readonly string[]).includes(e.type)) {
        const key = e.type as keyof typeof totals;
        totals[key] = (totals[key] || 0) + 1;
      }
    }
  }

  return { gp, ...totals };
}

const avgText = (total: number, gp: number) => (gp > 0 ? (total / gp).toFixed(1) : '0.0');

function openPrintPopup(html: string) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('The browser blocked the new window. Allow pop-ups for this site, then try again.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// --- CSV Exports ---
export function exportTeamsCsv(db: FullDbPayload) {
  const header = [
    'Team ID', 'Name', 'Abbreviation', 'Alias', 'Color', 'Category', 'Status', 'Logo',
    'Active players', 'Archived players', 'Total players', 'Seasons',
    'Games (all)', 'Games final', 'Wins', 'Losses', 'Win %', 'Points for', 'Points against', 'Point difference',
  ];
  const rows = [...db.teams]
    .sort((x, y) => x.name.localeCompare(y.name))
    .map((t) => {
      const r = teamRecord(t.id, db.games);
      const all = db.players.filter((p) => p.teamId === t.id);
      return [
        t.id, t.name, ab(t), t.alias || '', t.color || '#3b82f6', t.category || 'Free',
        t.archived ? 'Archived' : 'Active', t.photo ? 'Yes' : 'No',
        all.filter((p) => !p.archived).length,
        all.filter((p) => p.archived).length,
        all.length,
        r.seasons.join('; '),
        r.games, r.final, r.w, r.l, pctText(r.w, r.final), r.pf, r.pa, r.pf - r.pa,
      ];
    });
  const content = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  downloadFile('teams', content, 'text/csv;charset=utf-8', 'csv');
}

export function exportPlayersCsv(db: FullDbPayload) {
  const header = [
    'Player ID', 'Jersey #', 'First name', 'Last name', 'Nickname', 'Locale', 'Status', 'Photo',
    'Identity verified', 'Verified on', 'Team ID', 'Team', 'Team abbreviation', 'Team category',
    'Games played', 'Points', 'Rebounds', 'Assists', 'Steals', 'Blocks', 'Turnovers', 'Fouls',
    'Points / game', 'Rebounds / game', 'Assists / game',
  ];
  const rows = [...db.players]
    .sort((x, y) => `${x.last}, ${x.first}`.localeCompare(`${y.last}, ${y.first}`))
    .map((p) => {
      const t = db.teams.find((tm) => tm.id === p.teamId);
      const s = playerTotals(p.id, db.games);
      return [
        p.id, p.number, p.first || '', p.last || '', p.nick || '', p.locale || '',
        p.archived ? 'Archived' : 'Active', p.photo ? 'Yes' : 'No',
        Boolean(p.verified), p.verified && p.verifiedAt ? p.verifiedAt : '',
        p.teamId, t?.name || '', t ? ab(t) : '', t?.category || 'Free',
        s.gp, s.pts, s.reb, s.ast, s.stl, s.blk, s.to, s.pf,
        avgText(s.pts, s.gp), avgText(s.reb, s.gp), avgText(s.ast, s.gp),
      ];
    });
  const content = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  downloadFile('players', content, 'text/csv;charset=utf-8', 'csv');
}

export function exportGamesCsv(db: FullDbPayload) {
  const header = [
    'Game ID', 'Season', 'Date', 'Time', 'Status', 'Running time', 'Live game now', 'Match',
    'Home team ID', 'Home team', 'Home category', 'Away team ID', 'Away team', 'Away category',
    'Home score', 'Away score', 'Winner', 'Margin',
    'Home game fouls', 'Away game fouls', 'Home technical fouls', 'Away technical fouls',
    'Home timeouts taken', 'Away timeouts taken',
    'Substitutions', 'Events recorded', 'Home players used', 'Away players used',
  ];

  const playerTeamMap = new Map(db.players.map((p) => [p.id, p.teamId]));
  const count = (g: Game, t: number, type: string) => g.events.filter((e) => e.type === type && e.teamId === t).length;
  const gameFouls = (g: Game, t: number) => {
    const maxP = Math.max(4, ...g.events.map((e) => e.period || 1));
    let total = 0;
    for (let p = 1; p <= maxP; p++) total += tf(g, t, p);
    return total;
  };
  const techFouls = (g: Game, t: number) =>
    g.events.filter((e) => e.type === 'foul' && e.teamId === t && e.foulType === 'technical').length;
  const used = (g: Game, t: number) =>
    new Set(
      [...(g.played || []), ...g.events.map((e) => e.playerId).filter((id): id is number => id != null)].filter(
        (id) => playerTeamMap.get(id) === t,
      ),
    ).size;

  const rows = [...db.games]
    .sort((x, y) => {
      const dateX = x.date + (x.time || '');
      const dateY = y.date + (y.time || '');
      return dateX < dateY ? -1 : dateX > dateY ? 1 : x.id - y.id;
    })
    .map((g) => {
      const h = sc(g, g.home);
      const a = sc(g, g.away);
      const ht = db.teams.find((t) => t.id === g.home);
      const at = db.teams.find((t) => t.id === g.away);
      const winner = g.status !== 'final' ? '' : h > a ? ht?.name : a > h ? at?.name : 'Tie';
      return [
        g.id, g.season, g.date, g.time || '', g.status, Boolean(g.runningTime), g.id === db.live.gameId,
        `${ht?.name || ''} vs ${at?.name || ''}`,
        g.home, ht?.name || '', ht?.category || 'Free', g.away, at?.name || '', at?.category || 'Free',
        h, a, winner, Math.abs(h - a),
        gameFouls(g, g.home), gameFouls(g, g.away), techFouls(g, g.home), techFouls(g, g.away),
        count(g, g.home, 'timeout'), count(g, g.away, 'timeout'),
        g.events.filter((e) => e.type === 'sub').length, g.events.length, used(g, g.home), used(g, g.away),
      ];
    });
  const content = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  downloadFile('games', content, 'text/csv;charset=utf-8', 'csv');
}

// --- Printable A4 Team Profile ---
export function openTeamProfile(db: FullDbPayload, teamId: number) {
  const t = db.teams.find((tm) => tm.id === teamId);
  if (!t) {
    alert('Team not found');
    return;
  }
  const now = nowInfo();
  const rec = teamRecord(teamId, db.games);
  const teamColor = escHtml(t.color || '#3b82f6');
  const brandName = brandInfo.name || 'HoopIO';
  const brandFull = brandInfo.fullName || 'HoopIO Basketball Management';
  const brandLogo = brandInfo.logo ? `${location.origin}${brandInfo.logo}` : '';

  const players = db.players
    .filter((p) => p.teamId === teamId)
    .sort((x, y) => Number(x.archived) - Number(y.archived) || byNumber(x.number, y.number));

  const games = db.games
    .filter((g) => g.home === teamId || g.away === teamId)
    .sort((x, y) => ((x.date + (x.time || '')) < (y.date + (y.time || '')) ? -1 : 1));

  const bySeason = rec.seasons.map((season) => {
    const r = { season, gp: 0, w: 0, l: 0, pf: 0, pa: 0 };
    games
      .filter((g) => g.season === season && g.status === 'final')
      .forEach((g) => {
        const mine = sc(g, teamId);
        const theirs = sc(g, g.home === teamId ? g.away : g.home);
        r.gp++;
        r.pf += mine;
        r.pa += theirs;
        if (mine > theirs) r.w++;
        else if (mine < theirs) r.l++;
      });
    return r;
  });

  const reportId = `TP-${t.id}-${now.file.replace('_', '-')}`;
  const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);

  const rosterRows =
    players
      .map((p) => {
        const s = playerTotals(p.id, db.games);
        return `<tr><td>${p.id}</td><td class="c">${escHtml(p.number)}</td><td>${escHtml(p.last)}${p.first ? ', ' + escHtml(p.first) : ''}${p.nick ? ` “${escHtml(p.nick)}”` : ''}${p.archived ? ' <i>(archived)</i>' : ''}</td><td>${escHtml(p.locale || '')}</td>
      <td class="n">${s.gp}</td><td class="n">${s.pts}</td><td class="n">${avgText(s.pts, s.gp)}</td><td class="n">${s.reb}</td><td class="n">${s.ast}</td><td class="n">${s.stl}</td><td class="n">${s.blk}</td><td class="n">${s.to}</td><td class="n">${s.pf}</td></tr>`;
      })
      .join('') || '<tr><td colspan="13">No players registered.</td></tr>';

  const seasonRows =
    bySeason
      .map(
        (r) =>
          `<tr><td>${escHtml(r.season)}</td><td class="n">${r.gp}</td><td class="n">${r.w}</td><td class="n">${r.l}</td><td class="n">${pctText(r.w, r.gp) || '–'}</td><td class="n">${r.pf}</td><td class="n">${r.pa}</td><td class="n">${r.gp ? sign(r.pf - r.pa) : '–'}</td></tr>`,
      )
      .join('') || '<tr><td colspan="8">No games yet.</td></tr>';

  const gameRows =
    games
      .map((g) => {
        const home = g.home === teamId;
        const opp = db.teams.find((tm) => tm.id === (home ? g.away : g.home));
        const mine = sc(g, teamId);
        const theirs = sc(g, home ? g.away : g.home);
        const result = g.status === 'final' ? (mine > theirs ? 'W' : mine < theirs ? 'L' : 'T') : '';
        return `<tr><td>${escHtml(g.season)}</td><td>${escHtml(g.date)}</td><td>${escHtml(g.time || '')}</td><td>${home ? 'Home' : 'Away'}</td><td>${escHtml(opp?.name || 'Removed team')}</td>
      <td class="n">${g.status === 'scheduled' ? '–' : `${mine} – ${theirs}`}</td><td class="c"><b>${result}</b></td><td>${escHtml(g.status)}${g.runningTime ? ' · running time' : ''}</td></tr>`;
      })
      .join('') || '<tr><td colspan="8">No games yet.</td></tr>';

  const activeN = players.filter((p) => !p.archived).length;
  const logo = t.photo ? `<img class="tl" src="${escHtml(t.photo)}" alt="">` : '';
  const orgLogo = brandLogo ? `<img class="lg" src="${escHtml(brandLogo)}" alt="">` : '';

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Team Profile - ${escHtml(t.name)} - ${now.date}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 11.5px/1.45 "Segoe UI", system-ui, Arial, sans-serif; color: #111; background: #fff; }
  .page { max-width: 190mm; margin: 0 auto; padding: 10mm 0; }
  .bar { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 10px; }
  .bar button { padding: 8px 18px; font: inherit; font-weight: 700; border: 0; border-radius: 6px; background: #1d4ed8; color: #fff; cursor: pointer; }
  .bar button.g { background: #e5e7eb; color: #111; }
  header.top { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; border-bottom: 3px solid ${teamColor}; }
  header.top img.lg { width: 46px; height: 46px; object-fit: contain; }
  header.top .org b { display: block; font-size: 14px; letter-spacing: .04em; } header.top .org span { color: #555; font-size: 10.5px; }
  header.top .doc { margin-left: auto; text-align: right; font-size: 10.5px; color: #444; }
  .title { display: flex; align-items: center; gap: 14px; margin: 14px 0 10px; }
  .title img.tl { width: 84px; height: 84px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc; }
  .title h1 { margin: 0; font-size: 26px; line-height: 1.1; } .title .kind { font-size: 11px; letter-spacing: .12em; color: #555; font-weight: 700; }
  .tag { display: inline-block; padding: 1px 9px; border-radius: 99px; border: 1px solid #888; font-size: 10.5px; font-weight: 700; margin-left: 6px; vertical-align: 3px; }
  .sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; border: 1px solid #555; vertical-align: -2px; margin-right: 4px; background: ${teamColor}; }
  h2 { margin: 16px 0 5px; font-size: 12.5px; letter-spacing: .08em; text-transform: uppercase; border-bottom: 1px solid #999; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 4px; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th, td { padding: 3px 6px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
  th { background: #eef0f6; font-size: 10px; letter-spacing: .05em; text-transform: uppercase; border-bottom: 1px solid #999; }
  td.n, th.n { text-align: right; } td.c, th.c { text-align: center; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid #bbb; border-radius: 6px; }
  .meta div { padding: 5px 9px; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; } .meta div:nth-child(4n) { border-right: 0; }
  .meta small { display: block; color: #666; font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; } .meta b { font-size: 13px; }
  .foot { margin-top: 14px; padding-top: 6px; border-top: 1px solid #999; font-size: 10px; color: #444; display: flex; justify-content: space-between; gap: 12px; }
  .note { font-size: 10px; color: #555; margin: 3px 0 0; }
  @media print { .bar { display: none; } .page { padding: 0; max-width: none; } }
</style></head><body><div class="page">
  <div class="bar"><button class="g" onclick="window.close()">Close</button><button onclick="window.print()">Print / Save as PDF</button></div>
  <header class="top">${orgLogo}<div class="org"><b>${escHtml(brandName)}</b><span>${escHtml(brandFull)}</span></div>
    <div class="doc"><b>TEAM PROFILE</b><br>Generated as of ${now.date} ${now.time} (${now.tz})<br>Report ID ${escHtml(reportId)}</div></header>
  <div class="title">${logo}<div><div class="kind">TEAM PROFILE</div><h1>${escHtml(t.name)}<span class="tag">${escHtml(t.category || 'Free')}</span></h1>
    <div>${t.alias ? escHtml(t.alias) + ' · ' : ''}${escHtml(ab(t))} · ${t.archived ? 'Archived' : 'Active'}</div></div></div>

  <div class="meta">
    <div><small>Team ID</small><b>${t.id}</b></div><div><small>Abbreviation</small><b>${escHtml(ab(t))}</b></div><div><small>Alias</small><b>${escHtml(t.alias || '–')}</b></div><div><small>Color</small><b><span class="sw"></span>${teamColor}</b></div>
    <div><small>Category</small><b>${escHtml(t.category || 'Free')}</b></div><div><small>Status</small><b>${t.archived ? 'Archived' : 'Active'}</b></div><div><small>Players</small><b>${activeN} active${players.length - activeN ? ` + ${players.length - activeN} archived` : ''}</b></div><div><small>Seasons</small><b>${escHtml(rec.seasons.join(', ') || '–')}</b></div>
    <div><small>Games (final / all)</small><b>${rec.final} / ${rec.games}</b></div><div><small>Record (W–L)</small><b>${rec.w} – ${rec.l}</b></div><div><small>Win %</small><b>${pctText(rec.w, rec.final) || '–'}</b></div><div><small>Points for / against</small><b>${rec.pf} / ${rec.pa}</b></div>
  </div>

  <h2>Record by season</h2>
  <table><thead><tr><th>Season</th><th class="n">GP</th><th class="n">W</th><th class="n">L</th><th class="n">PCT</th><th class="n">PF</th><th class="n">PA</th><th class="n">DIFF</th></tr></thead><tbody>${seasonRows}</tbody></table>
  <p class="note">GP = games played, PCT = winning percentage, PF = points for, PA = points against, DIFF = PF minus PA. Final games only.</p>

  <h2>Roster and player statistics</h2>
  <table><thead><tr><th>ID</th><th class="c">#</th><th>Player</th><th>Locale</th><th class="n">GP</th><th class="n">PTS</th><th class="n">PPG</th><th class="n">REB</th><th class="n">AST</th><th class="n">STL</th><th class="n">BLK</th><th class="n">TO</th><th class="n">PF</th></tr></thead><tbody>${rosterRows}</tbody></table>
  <p class="note">Player statistics cover all seasons and include live and final games, as on the Players page.</p>

  <h2>Games</h2>
  <table><thead><tr><th>Season</th><th>Date</th><th>Time</th><th>H/A</th><th>Opponent</th><th class="n">Score</th><th class="c">Result</th><th>Status</th></tr></thead><tbody>${gameRows}</tbody></table>

  <div class="foot"><span>Generated as of ${now.long}, ${now.time} (${now.tz}) · ${escHtml(brandName)}</span><span>${escHtml(reportId)} · ${db.teams.length} teams · ${db.players.length} players · ${db.games.length} games on record</span></div>
</div></body></html>`;

  openPrintPopup(html);
}

// --- Printable A4 Official Roster (Captain First + Signature Block) ---
function buildRosterSection(db: FullDbPayload, t: Team, now: ReturnType<typeof nowInfo>): string {
  const players = db.players
    .filter((p) => p.teamId === t.id && !p.archived)
    .sort((x, y) => byNumber(x.number, y.number));

  const cap = t.captainId != null ? players.find((p) => p.id === t.captainId) : undefined;
  const ordered = cap ? [cap, ...players.filter((p) => p.id !== cap.id)] : players;
  const reportId = `OR-${t.id}-${now.file.replace('_', '-')}`;
  const teamColor = escHtml(t.color || '#888');
  const brandName = brandInfo.name || 'HoopIO';
  const brandFull = brandInfo.fullName || 'HoopIO Basketball Management';
  const orgLogo = brandInfo.logo ? `<img class="lg" src="${escHtml(`${location.origin}${brandInfo.logo}`)}" alt="">` : '';

  const initials = (p: Player) => ((p.first || '?')[0] + ((p.last || '')[0] || '')).toUpperCase();

  const rows =
    ordered
      .map(
        (p, i) => `<tr class="${cap && i === 0 ? 'cap' : ''}">
      <td class="c">${i + 1}</td>
      <td class="c">${p.photo ? `<img class="pp" src="${escHtml(p.photo)}" alt="">` : `<div class="pp ini">${escHtml(initials(p))}</div>`}</td>
      <td class="num">${escHtml(p.number)}</td>
      <td><b>${escHtml(p.last)}</b>${cap && i === 0 ? ' <span class="tag">CAPTAIN</span>' : ''}</td><td>${escHtml(p.first)}</td><td>${escHtml(p.nick || '')}</td><td>${escHtml(p.locale || '')}</td></tr>`,
      )
      .join('') || '<tr><td colspan="7">No active players registered.</td></tr>';

  const logo = t.photo ? `<img class="tl" src="${escHtml(t.photo)}" alt="">` : '';

  return `<section class="rs">
  <header class="top" style="border-bottom-color:${teamColor}">${orgLogo}<div class="org"><b>${escHtml(brandName)}</b><span>${escHtml(brandFull)}</span></div>
    <div class="doc"><b>OFFICIAL ROSTER</b><br>As of ${now.date} ${now.time}<br>Document ID ${escHtml(reportId)}</div></header>
  <div class="title">${logo}<div><div class="kind">OFFICIAL TEAM ROSTER</div><h1>${escHtml(t.name)}</h1>
    <div>${t.alias ? escHtml(t.alias) + ' · ' : ''}${escHtml(ab(t))} · ${escHtml(t.category || 'Free')} · ${players.length} players</div></div></div>
  <div class="staff"><div><small>Head coach</small><b>${escHtml(t.coach || '–')}</b></div><div><small>First assistant coach</small><b>${escHtml(t.assistant || '–')}</b></div><div><small>Captain</small><b>${cap ? '#' + escHtml(cap.number) + ' ' + escHtml(fullName(cap)) : '– not selected –'}</b></div></div>
  <table><thead><tr><th class="c">No.</th><th class="c">Photo</th><th class="c">Jersey</th><th>Last name</th><th>First name</th><th>Nickname</th><th>Locale</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="cert"><p style="margin-top:14px">I certify that the players listed above are the official roster of <b>${escHtml(t.name)}</b> for ${escHtml(brandName)}.</p>
    <div class="sign"><div class="s"><b>${cap ? escHtml(fullName(cap)) : '&nbsp;'}</b><br>Team captain: printed name and signature</div><div>Date signed</div></div></div>
  <div class="foot"><span>Generated ${now.long}, ${now.time} (${now.tz}) · ${escHtml(brandName)}</span><span>${escHtml(reportId)}</span></div>
</section>`;
}

function openRostersPopup(db: FullDbPayload, teams: Team[], title: string) {
  const now = nowInfo();
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escHtml(title)} - ${now.date}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 12px/1.4 "Segoe UI", system-ui, Arial, sans-serif; color: #111; background: #fff; }
  .page { max-width: 186mm; margin: 0 auto; padding: 8mm 0; }
  .bar { display: flex; gap: 8px; justify-content: flex-end; align-items: center; margin-bottom: 10px; }
  .bar span { margin-right: auto; color: #555; }
  .bar button { padding: 8px 18px; font: inherit; font-weight: 700; border: 0; border-radius: 6px; background: #1d4ed8; color: #fff; cursor: pointer; }
  .bar button.g { background: #e5e7eb; color: #111; }
  .rs { page-break-after: always; break-after: page; } .rs:last-child { page-break-after: auto; break-after: auto; }
  header.top { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; border-bottom: 3px solid #888; }
  header.top img.lg { width: 46px; height: 46px; object-fit: contain; }
  header.top .org b { display: block; font-size: 14px; letter-spacing: .04em; } header.top .org span { color: #555; font-size: 10.5px; }
  header.top .doc { margin-left: auto; text-align: right; font-size: 10.5px; color: #444; }
  .title { display: flex; align-items: center; gap: 14px; margin: 14px 0 10px; }
  .title img.tl { width: 78px; height: 78px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc; }
  .title h1 { margin: 0; font-size: 26px; line-height: 1.1; } .title .kind { font-size: 11px; letter-spacing: .12em; color: #555; font-weight: 700; }
  .staff { display: flex; gap: 28px; margin: 4px 0 10px; } .staff small { display: block; color: #666; font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  tr { page-break-inside: avoid; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #ccc; text-align: left; vertical-align: middle; }
  th { background: #eef0f6; font-size: 10px; letter-spacing: .05em; text-transform: uppercase; border-bottom: 1px solid #999; }
  td.c, th.c { text-align: center; } td.num { text-align: center; font-size: 20px; font-weight: 800; width: 16mm; }
  tr.cap td { background: #fff7e0; }
  .tag { display: inline-block; padding: 0 7px; border-radius: 99px; border: 1px solid #b7791f; font-size: 9px; font-weight: 800; letter-spacing: .06em; color: #7a4b00; vertical-align: 1px; }
  .pp { width: 17mm; height: 17mm; object-fit: cover; border: 1px solid #aaa; border-radius: 3px; display: block; margin: 0 auto; }
  .pp.ini { display: flex; align-items: center; justify-content: center; background: #e5e7eb; color: #555; font-weight: 800; font-size: 16px; }
  .cert { margin-top: 16px; page-break-inside: avoid; }
  .cert p { margin: 0 0 54px; }
  .sign { display: flex; gap: 30px; align-items: flex-end; }
  .sign div { flex: 1; border-top: 1px solid #111; padding-top: 3px; font-size: 10.5px; } .sign div.s { flex: 1.6; } .sign b { font-size: 12.5px; }
  .foot { margin-top: 14px; padding-top: 6px; border-top: 1px solid #999; font-size: 10px; color: #444; display: flex; justify-content: space-between; gap: 12px; }
  @media print { .bar { display: none; } .page { padding: 0; max-width: none; } }
</style></head><body><div class="page">
  <div class="bar"><span>${escHtml(title)}</span><button class="g" onclick="window.close()">Close</button><button onclick="window.print()">Print / Save as PDF</button></div>
  ${teams.map((t) => buildRosterSection(db, t, now)).join('')}
</div></body></html>`;

  openPrintPopup(html);
}

export function openTeamRoster(db: FullDbPayload, teamId: number) {
  const t = db.teams.find((tm) => tm.id === teamId);
  if (!t) {
    alert('Team not found');
    return;
  }
  openRostersPopup(db, [t], `Official Roster - ${t.name}`);
}

export function openAllTeamsRosters(db: FullDbPayload) {
  const teams = db.teams
    .filter((t) => !t.archived && db.players.some((p) => p.teamId === t.id && !p.archived))
    .sort((x, y) => String(x.name).localeCompare(String(y.name), undefined, { numeric: true, sensitivity: 'base' }));

  if (!teams.length) {
    alert('There are no teams with players yet.');
    return;
  }
  openRostersPopup(db, teams, `Official Rosters - all teams (${teams.length})`);
}