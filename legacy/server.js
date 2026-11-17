// server.js - tiny dependency-free web server for the basketball app.
// Run with:  node server.js   then open http://localhost:3000
//
// What it does:
//   * serves everything in the /public folder
//   * keeps the whole database in memory and saves it to database.json
//   * runs the game clock and shot clock (so every screen shows the same time)
//   * appends every game action to game-log.txt

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');
const LOG_FILE = path.join(__dirname, 'game-log.txt');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};
const TEAM_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6'];

/* ------------------------------------------------------------------ */
/* Database: create, load, save                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_PLACE = 'Rodriguez Village Basketball Court';

// Add a scheduled game. The first 5 players of each team start on the court.
function createGame(db, info) {
  const game = {
    id: db.seq.game++,
    season: info.season,
    date: info.date,
    time: info.time || '',  // scheduled time of the game, e.g. '18:30'
    no: 0,                                                            // game number: set by renumberGames() (order of date and time)
    competition: info.competition || 'BCBL',
    place: info.place || DEFAULT_PLACE,
    lineupPeriod: 0,       // the period whose starting players were confirmed (0 = not yet)
    home: +info.home,
    away: +info.away,
    status: 'scheduled',   // scheduled | live | final
    runningTime: !!info.runningTime,   // true = clock keeps running through fouls and substitutions (see rtActive in public/js/state.js)
    rtLast2: true,                     // FIBA: stop-time again in the last 2:00 of the 4th quarter and overtime
    events: [],            // every score, foul, rebound, substitution, timeout...
    adj: {},               // manual score corrections per team id
    active: {},            // team id -> player ids currently on the court
    played: [],            // every player who has been on the court
  };
  [game.home, game.away].forEach(teamId => {
    const starters = db.players.filter(p => p.teamId == teamId).slice(0, 5).map(p => p.id);
    game.active[teamId] = starters;
    game.played.push(...starters);
  });
  db.games.push(game);
}

// The CUSTOM scoreboard (manual scoreboard, see /custom-scoreboard and /custom-controls). It has its own clocks, scores and
// buzzer and never touches the live game or any other data.
const TEAM_CATEGORIES = ['Senior', 'Junior', 'Free'];
const createCustom = () => ({
  a: { name: 'HOME', full: 'Home', color: '#ef4444', score: 0, fouls: 0, timeouts: 2 },
  b: { name: 'GUEST', full: 'Guest', color: '#3b82f6', score: 0, fouls: 0, timeouts: 2 },
  period: 1, clock: 600000, periodLen: 600000, running: false,
  shot: 24000, shotOn: true, shotHold: false,
  arrow: null, swap: false,                                  // arrow: 'a' | 'b' | null
  toKind: null, toTeam: null, toLeft: 0, toSuspended: false, // running timeout / break ('timeout' | 'break')
  buzzOn: false, buzzLeft: 0, buzzKind: null,   // buzzKind: null = normal buzzer, 'shot' = shot clock buzzer (higher pitch)
  timeoutSecs: 30,                               // default timeout length in seconds (changed in the game settings gear)
});

// First-run sample data: two teams of 10 players and one game.
function createSampleDatabase() {
  const firstNames = ['James', 'Marco', 'Luis', 'Paolo', 'Ken', 'Josh', 'Rico', 'Andre', 'Carlo', 'Dan'];
  const lastNames = ['Santos', 'Reyes', 'Cruz', 'Garcia', 'Lopez', 'Ramos', 'Diaz', 'Torres', 'Flores', 'Mendoza',
    'Navarro', 'Castro', 'Bautista', 'Aquino', 'Villanueva', 'Salazar', 'Rivera', 'Soriano', 'Pascual', 'Domingo'];
  const numbers = ['4', '5', '7', '8', '9', '10', '11', '12', '23', '24'];   // jersey numbers are TEXT: '9', '09', '0', '00' are all different
  const teams = [
    { id: 1, name: 'Dasmariñas Lions', abbr: 'LIONS', alias: 'The Pride', color: '#ef4444', photo: '', category: 'Free' },
    { id: 2, name: 'Cavite Hawks', abbr: 'HAWKS', alias: 'Sky Kings', color: '#3b82f6', photo: '', category: 'Free' },
  ];
  const players = [];
  let nextId = 1;
  teams.forEach((team, teamIndex) => {
    firstNames.forEach((first, i) => players.push({
      id: nextId++, teamId: team.id, first, last: lastNames[teamIndex * 10 + i],
      nick: '', number: numbers[i], photo: '', locale: '',
    }));
  });
  const db = {
    seq: { team: 3, player: nextId, game: 1 },   // counters for new ids
    teams, players, games: [],
    live: {                                      // what the scoreboard shows right now
      gameId: null, period: 1, clock: 600000, periodLen: 600000, running: false,
      shot: 24000, shotOn: true, arrow: null, timeouts: {}, names: {},
      toKind: null, toTeam: null, toLeft: 0, toSuspended: false, swap: false,                 // running timeout: team id and milliseconds left
      buzzOn: false, buzzLeft: 0, buzzKind: null,   // buzzer: held down / automatic buzz milliseconds left; buzzKind 'shot' = shot clock buzzer
      timeoutSecs: 30,                         // default timeout length in seconds
    },
  };
  db.custom = createCustom();
  createGame(db, { season: String(new Date().getFullYear()), date: new Date().toISOString().slice(0, 10), home: 1, away: 2 });
  db.live.gameId = 1;
  db.live.timeouts = { 1: 2, 2: 2 };
  return db;
}

let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : createSampleDatabase();
let unsaved = true;

// ---- Upgrade older databases (safe to run every start). A backup copy is made before the first upgrade. ----
const DB_VERSION = 3;     // 3: players.locale, teams.category, live.shotHold, db.custom
if (fs.existsSync(DB_FILE) && (db.version || 1) < DB_VERSION) {
  fs.copyFileSync(DB_FILE, DB_FILE.replace('.json', `.backup-v${db.version || 1}.json`));
}
db.teams.forEach((team, i) => {
  team.color = team.color || TEAM_COLORS[i % TEAM_COLORS.length]; team.archived = !!team.archived;
  if (!TEAM_CATEGORIES.includes(team.category))                                    // new: Senior | Junior | Free
    team.category = /junior/i.test(team.name) ? 'Junior' : /senior/i.test(team.name) ? 'Senior' : 'Free';   // guessed from the team name once
});
db.players.forEach(p => { p.number = String(p.number); p.archived = !!p.archived; p.locale = p.locale || ''; });   // new: locale (text)
db.custom = Object.assign(createCustom(), db.custom || {});                        // new: the custom (manual) scoreboard
db.games.forEach(g => {                                                           // new: competition and place for older games
  g.competition = g.competition || 'BCBL';
  g.place = g.place || DEFAULT_PLACE;
});
db.games.forEach(g => {
  g.runningTime = !!g.runningTime;
  g.rtLast2 = g.rtLast2 !== false;
  g.time = g.time || '';
  g.isDefault = !!g.isDefault;                                                    // new: one game can be marked as the default game
  if (g.lineupPeriod === undefined) g.lineupPeriod = (g.id == db.live.gameId ? db.live.period : 0);   // the running game does not ask again
});
Object.assign(db.live, {
  toKind: db.live.toKind || (db.live.toTeam ? 'timeout' : null),   // 'timeout' | 'break' | null
  toTeam: db.live.toTeam || null, toLeft: db.live.toLeft || 0, toSuspended: !!db.live.toSuspended,
  swap: !!db.live.swap, buzzOn: false, buzzLeft: 0, shotHold: !!db.live.shotHold,
});
db.custom.buzzOn = false; db.custom.buzzLeft = 0; db.custom.buzzKind = null;
db.live.buzzKind = null;
db.live.timeoutSecs = db.live.timeoutSecs > 0 ? db.live.timeoutSecs : 30;      // new: default timeout length
db.custom.timeoutSecs = db.custom.timeoutSecs > 0 ? db.custom.timeoutSecs : 30;
db.version = DB_VERSION;
// Game numbers follow the date and time: the earliest game is No. 1 (same date and time: the one added first).
// Renumbered after every change, so changing a game's date or time, adding or deleting a game keeps the numbers in order.
function renumberGames() {
  const key = g => `${g.date || ''} ${g.time || '00:00'}`;
  db.games.slice().sort((x, y) => key(x).localeCompare(key(y)) || x.id - y.id).forEach((g, i) => { g.no = i + 1; });
}
renumberGames();

// The DEFAULT game (marked on the Games page) becomes the live game whenever no game is live (at start, or after the live game was deleted).
function useDefaultGame() {
  const defaults = db.games.filter(g => g.isDefault);
  defaults.slice(0, -1).forEach(g => { g.isDefault = false; });                   // only one default (safety net: the last one in the list wins)
  const def = defaults[defaults.length - 1];
  if (def && !db.games.some(g => g.id == db.live.gameId)) db.live.gameId = def.id;
}
useDefaultGame();
const playerExists = id => db.players.some(p => p.id == id);
db.games.forEach(game => {
  for (const teamId in game.active) game.active[teamId] = game.active[teamId].filter(playerExists);
  game.played = (game.played || []).filter(playerExists);
});

const saveDatabase = () => { fs.writeFileSync(DB_FILE, JSON.stringify(db)); unsaved = false; };
const writeLog = text => fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${text}\n`);

/* ------------------------------------------------------------------ */
/* Clock: ticks every 100 ms on the server                              */
/* ------------------------------------------------------------------ */

const BUZZ_MS = 2500;           // long buzzer (end of period / break / timeout)
const SHOT_BUZZ_MS = 1500;      // shot clock buzzer: shorter, and higher in pitch (see public/js/buzzer.js)
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const elapsed = now - lastTick;
  lastTick = now;
  const live = db.live;

  if (live.buzzLeft > 0) {                                  // automatic buzzer
    live.buzzLeft = Math.max(0, live.buzzLeft - elapsed);
    if (live.buzzLeft === 0) live.buzzKind = null;
    unsaved = true;
  }
  if (live.toKind && !live.toSuspended) {                   // timeout / break countdown (stops while suspended)
    live.toLeft = Math.max(0, live.toLeft - elapsed);
    unsaved = true;
    if (live.toLeft === 0) {
      writeLog(`${live.toKind} ended`);
      live.toKind = null;
      live.toTeam = null;
      live.buzzLeft = BUZZ_MS; live.buzzKind = null;
    }
  }

  tickCustom(elapsed);                                      // the custom scoreboard has its own clocks (see below)

  if (!live.running) return;
  live.clock = Math.max(0, live.clock - elapsed);
  if (live.shotOn && !live.shotHold) live.shot = Math.max(0, live.shot - elapsed);   // shotHold = shot clock paused by the operator
  unsaved = true;

  if (live.clock === 0) {                                   // end of period: buzzer
    live.running = false;
    live.buzzLeft = BUZZ_MS; live.buzzKind = null;
    writeLog(`Period ${live.period} ended (clock expired)`);
  } else if (live.shotOn && live.shot > 0) {
    live.shotViol = false;
  } else if (live.shotOn && !live.shotHold && live.shot === 0 && live.shot <= live.clock) {   // shot clock violation (not while the operator has paused the shot clock)
    const game = db.games.find(g => g.id == live.gameId);
    const rtNow = game && game.runningTime && !(game.rtLast2 !== false && live.period >= 4 && live.clock <= 120000);
    if (rtNow) {                                            // running time: the game clock does NOT stop, the operator resets the shot clock
      if (!live.shotViol) {                                 // once per violation: buzzer + log
        live.shotViol = true;
        live.buzzLeft = SHOT_BUZZ_MS; live.buzzKind = 'shot';
        writeLog('Shot clock violation (24s expired) - running time: game clock keeps running');
      }
    } else {
      live.running = false;
      live.buzzLeft = SHOT_BUZZ_MS; live.buzzKind = 'shot';   // the shot clock buzzer sounds when the shot clock reaches zero
      writeLog('Shot clock violation (24s expired)');
    }
  }
}, 100);

// Custom scoreboard: same rules as above, but on db.custom only (timeout / break countdown, buzzer, game clock, shot clock)
function tickCustom(elapsed) {
  const c = db.custom;
  if (c.buzzLeft > 0) { c.buzzLeft = Math.max(0, c.buzzLeft - elapsed); if (c.buzzLeft === 0) c.buzzKind = null; unsaved = true; }
  if (c.toKind && !c.toSuspended) {
    c.toLeft = Math.max(0, c.toLeft - elapsed);
    unsaved = true;
    if (c.toLeft === 0) { writeLog(`CUSTOM ${c.toKind} ended`); c.toKind = null; c.toTeam = null; c.buzzLeft = BUZZ_MS; c.buzzKind = null; }
  }
  if (!c.running) return;
  c.clock = Math.max(0, c.clock - elapsed);
  if (c.shotOn && !c.shotHold) c.shot = Math.max(0, c.shot - elapsed);
  unsaved = true;
  if (c.clock === 0) { c.running = false; c.buzzLeft = BUZZ_MS; c.buzzKind = null; writeLog(`CUSTOM period ${c.period} ended (clock expired)`); }
  else if (c.shotOn && !c.shotHold && c.shot === 0 && c.shot <= c.clock) { c.running = false; c.buzzLeft = SHOT_BUZZ_MS; c.buzzKind = 'shot'; writeLog('CUSTOM shot clock violation'); }
}

setInterval(() => unsaved && saveDatabase(), 3000);   // save to disk every 3 seconds if changed
process.on('SIGINT', () => { saveDatabase(); process.exit(); });

/* ------------------------------------------------------------------ */
/* applyChange: the one function that edits data                        */
/* The browser sends one JSON object; each key below is optional.      */
/* ------------------------------------------------------------------ */

// Insert a record, or replace the one with the same id. New records get an id.
function upsert(list, record, counterName) {
  if (!record.id) record.id = db.seq[counterName]++;
  const index = list.findIndex(item => item.id == record.id);
  if (index < 0) list.push(record); else list[index] = record;
}

// Relative changes: "add this many ms" is applied here on the server, so the time the operator sees on screen (a fraction of a second old)
// can never put the clock back. Used by the +/- second buttons of the game clock and the shot clock.
function addTime(target, delta) {
  ['clock', 'shot'].forEach(k => { if (typeof delta[k] == 'number') target[k] = Math.max(0, target[k] + delta[k]); });
}
// Teams may only play teams of their own category (Senior with Senior, Junior with Junior, Free with Free)
function sameCategory(homeId, awayId) {
  const h = db.teams.find(t => t.id == homeId), a = db.teams.find(t => t.id == awayId);
  return !!h && !!a && homeId != awayId && (h.category || 'Free') == (a.category || 'Free');
}
// Identity verification of a player: the server writes the date and time (ISO text) at the moment the box is ticked,
// keeps it while it stays ticked, and clears it when unticked. The browser cannot change it.
function stampVerified(player) {
  const old = db.players.find(p => p.id == player.id);
  if (player.verified) player.verifiedAt = (old && old.verified && old.verifiedAt) || new Date().toISOString();
  else { player.verified = false; delete player.verifiedAt; }
}
function applyChange(change) {
  if (change.live) {
    // any normal buzzer change (button, timeout, period end) is a normal buzz unless the change says it is the shot clock buzzer
    if (('buzzLeft' in change.live || 'buzzOn' in change.live) && !('buzzKind' in change.live)) db.live.buzzKind = null;
    Object.assign(db.live, change.live);                                // scoreboard fields
  }
  if (change.liveAdd) addTime(db.live, change.liveAdd);
  if (change.customAdd) addTime(db.custom, change.customAdd);
  if (change.custom) {                                                  // custom scoreboard: team objects a / b are merged field by field
    const { a, b, ...rest } = change.custom;
    if (('buzzLeft' in rest || 'buzzOn' in rest) && !('buzzKind' in rest)) db.custom.buzzKind = null;
    Object.assign(db.custom, rest);
    if (a) Object.assign(db.custom.a, a);
    if (b) Object.assign(db.custom.b, b);
  }
  (change.teams || []).forEach(team => upsert(db.teams, team, 'team'));
  (change.players || []).forEach(player => { stampVerified(player); upsert(db.players, player, 'player'); });
  (change.games || []).forEach(game => {                                // replace edited games
    const index = db.games.findIndex(g => g.id == game.id);
    if (index >= 0) db.games[index] = game;
  });
  if (change.newGame) {
    if (sameCategory(change.newGame.home, change.newGame.away)) createGame(db, change.newGame);
    else writeLog('New game REFUSED: teams must be in the same category (Senior, Junior or Free) and different');
  }
  if (change.delGame) {
    db.games = db.games.filter(g => g.id != change.delGame);
    if (db.live.gameId == change.delGame) db.live.gameId = null;
  }
  if (change.delTeam) {                                                 // team + its players + its games
    const id = change.delTeam;
    const gameIds = db.games.filter(g => g.home == id || g.away == id).map(g => g.id);
    db.teams = db.teams.filter(t => t.id != id);
    db.players = db.players.filter(p => p.teamId != id);
    db.games = db.games.filter(g => !gameIds.includes(g.id));
    if (gameIds.includes(db.live.gameId)) { db.live.gameId = null; db.live.toKind = null; db.live.toTeam = null; }
  }
  if (change.delPlayer) {
    db.players = db.players.filter(p => p.id != change.delPlayer);
    db.games.forEach(game => {                                          // remove from lineups too
      for (const teamId in game.active) game.active[teamId] = game.active[teamId].filter(id => id != change.delPlayer);
      game.played = game.played.filter(id => id != change.delPlayer);
    });
  }
  renumberGames();
  useDefaultGame();
  if (change.log) writeLog(change.log);
  unsaved = true;
}

/* ------------------------------------------------------------------ */
/* HTTP routes                                                          */
/* ------------------------------------------------------------------ */

function sendJson(res, data) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url === '/api/db') return sendJson(res, db);                      // read everything
  if (url === '/api/log') {                                             // read game-log.txt
    res.setHeader('Content-Type', 'text/plain');
    return res.end(fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '');
  }
  if (url === '/api/patch' && req.method === 'POST') {                  // change something
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { applyChange(JSON.parse(body)); } catch (err) { console.error(err); }
      sendJson(res, db);
    });
    return;
  }

  // Anything else: a file from /public. Unknown paths get index.html (the page router handles them).
  let file = path.join(PUBLIC_DIR, path.normalize(url));
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(PUBLIC_DIR, 'index.html');
  }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Basketball app running at http://localhost:${PORT}`));
