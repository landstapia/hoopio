/* state.js - shared data, talking to the server, lookups and formatting */

let DB;                    // the whole database; refreshed from the server every 400 ms (see router.js)
let tickHook = null;       // a live page sets this to a function that refreshes its numbers on every poll
const pages = {};          // page registry: each file in js/pages adds one entry, e.g. pages.teams = function(){...}
const app = $('#app');     // the main content area

/* ---------- Talking to the server ---------- */

// Send a change to the server (see applyChange in server.js), then redraw the current page.
// Example: P({ live: { running: false }, log: 'Clock paused' })
async function P(change) {
  await quiet(change);
  await route();
}

// Same, but without redrawing the page (used by the hold-to-sound buzzer button)
async function quiet(change) {
  DB = await $.ajax({
    url: '/api/patch', method: 'POST',
    contentType: 'application/json', data: JSON.stringify(change), dataType: 'json',
  });
}

// Shortcut for changing scoreboard fields (clock, period, arrow...) and writing a log line.
const L = (live, text) => P({ live, log: text });

/* ---------- Lookups ---------- */

const T  = id => DB.teams.find(t => t.id == id) || {};      // team by id
const PL = id => DB.players.find(p => p.id == id) || {};    // player by id ({} if deleted)
const G  = id => DB.games.find(g => g.id == id);            // game by id
const LV = () => DB.live;                                   // live scoreboard state
const CG = () => G(LV().gameId);                            // the current live game
const CU = () => DB.custom;                                 // the CUSTOM (manual) scoreboard state - separate from the live game

/* ---------- Formatting ---------- */

const TEAM_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6'];

// Team color (falls back to a default palette if the team has none yet)
const colRaw = teamId => T(teamId).color || TEAM_COLORS[((teamId || 1) - 1) % TEAM_COLORS.length];   // the color as saved (use this in color pickers)

// Contrast guard: a team color that is too dark to read on the dark screens is lightened (the saved color is not changed)
const _lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4))); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const _ratio = (a, b) => { const x = _lum(a), y = _lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
function readable(hex, bg = '#0a1530', min = 4.5) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
  let t = 0, c = hex;
  while (_ratio(c, bg) < min && t < 1) {
    t += .05;
    c = '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + 255 * t).toString(16).padStart(2, '0')).join('');
  }
  return c;
}
const col = teamId => readable(colRaw(teamId), '#0a1530', 5.5);

// Player name as "Last, F."
const nm = p => (p && p.id) ? (p.first ? `${p.last}, ${p.first[0]}.` : p.last) : 'Removed player';
// Full name "Last, First" (just the last name if there is no first name)
const fullName = p => (p && p.id) ? (p.first ? `${p.last}, ${p.first}` : p.last) : 'Removed player';

// Clock text: 10:00, 0:45, and tenths of a second under one minute (9.4)
function fc(ms) {
  if (ms < 60000) return (ms / 1000).toFixed(1);
  return Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0');
}

// Date and time from a saved ISO text, in this device's time zone: 2026-11-02 08:30
const fmtDateTime = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
};

// Period label: 1-4, then OT1, OT2...
const per = p => (p > 4 ? 'OT' + (p - 4) : p);

// All seasons that have at least one game
const seasons = () => [...new Set(DB.games.map(g => g.season))].sort();

// Sort helper for jersey numbers (text): 0, 00, 4, 09, 9, 10 ... exact same text never ties
const byNumber = (x, y) => String(x).localeCompare(String(y), undefined, { numeric: true }) || (String(x) < String(y) ? -1 : 1);

// Which team is on the LEFT / RIGHT.  "Swap sides" (live.swap) flips the scoreboard.
// The operator screens (scoresheet, controls) show the opposite order, like standing on the other side of the court:
// the team on the RIGHT of the scoresheet is on the LEFT of the scoreboard. Set false to show the same order.
const MIRROR_OPERATOR_VIEW = true;
const boardSides = g => (LV().swap ? [g.away, g.home] : [g.home, g.away]);
const sheetSides = g => (MIRROR_OPERATOR_VIEW ? boardSides(g).slice().reverse() : boardSides(g));

// Short team label: abbreviation, or the start of the name if the abbreviation is empty
const ab = id => T(id).abbr || (T(id).name || '?').slice(0, 10);

// Players of a team (archived players left out unless asked for)
const teamPlayers = (teamId, includeArchived = false) =>
  DB.players.filter(p => p.teamId == teamId && (includeArchived || !p.archived));

// Black or white text, whichever is readable on a team color
function ink(hex) {                                // black or white text, whichever has the better contrast on this background
  if (!/^#[0-9a-f]{6}$/i.test(String(hex))) return '#fff';
  return _ratio(hex, '#000000') >= _ratio(hex, '#ffffff') ? '#000' : '#fff';
}

/* ---------- Running time (FIBA-based) ----------
   Standard FIBA basketball is STOP-time: the clock stops at every whistle. "Running time" is the common league variation
   where the clock keeps running through fouls and substitutions and only stops for timeouts, intervals and injuries.
   The FIBA rule that is kept: in the last 2:00 of the 4th quarter and of every overtime the clock is stopped as usual
   (whistles, and after a made field goal). That part can be switched off per game (game.rtLast2 = false).
   The server (server.js) uses the same rule for the shot clock violation. */
const RT_LAST_MS = 120000;
const inLastTwo = l => l.period >= 4 && l.clock <= RT_LAST_MS;
// Is the clock running continuously RIGHT NOW? (running time on, and not in the FIBA stop-time window)
const rtActive = (g, l) => !!g && !!g.runningTime && !(g.rtLast2 !== false && inLastTwo(l));

// Custom scoreboard sides: scoreboard order (left, right) and the operator's mirrored order, like boardSides / sheetSides
const customSides = c => (c.swap ? ['b', 'a'] : ['a', 'b']);
const customSheet = c => (MIRROR_OPERATOR_VIEW ? customSides(c).slice().reverse() : customSides(c));
