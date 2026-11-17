/* stats.js - scores, fouls and statistics. Everything is calculated from game.events. */

// The statistics tracked per player (order = column order in tables)
const KS = ['pts', 'reb', 'ast', 'stl', 'blk', 'to', 'pf'];
const Z = () => ({ pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 });   // an empty stat line

// Team score = points from events + manual adjustments made on /controls
const sc = (game, teamId) =>
  game.events.filter(e => e.teamId == teamId).reduce((sum, e) => sum + (e.pts || 0), 0) + ((game.adj || {})[teamId] || 0);

// What counts as a TEAM foul: every personal foul, plus a technical foul that was marked "counts as team foul"
// (FIBA: a technical foul by a player is a team foul; a technical foul by the coach or bench is not).
// A foul has its own "counts as team foul" tick (e.teamFoul, ticked by default); older fouls without the tick count as before.
const isTeamFoul = e => e.type == 'foul' ? e.teamFoul !== false : (e.type == 'tech' && !!e.teamFoul);

// Team fouls in one period (used for BONUS: 5 or more)
const tf = (game, teamId, period) =>
  game.events.filter(e => isTeamFoul(e) && e.teamId == teamId && e.period == period).length;

// Team fouls in the whole game, and technical fouls (team level) in the whole game
const gameFouls = (game, teamId) => game.events.filter(e => isTeamFoul(e) && e.teamId == teamId).length;
// Technical fouls of a team = team / bench technicals (type 'tech') + technical fouls charged to a player (a 'foul' event with foulType 'technical')
const techFouls = (game, teamId) => game.events.filter(e => e.teamId == teamId && (e.type == 'tech' || (e.type == 'foul' && e.foulType == 'technical'))).length;

// Captain of a team: one of its active players, chosen on the team's page (team.captainId). A captain who was archived or moved to another team no longer counts.
const captainOf = teamId => { const p = DB.players.find(x => x.id == T(teamId).captainId); return p && p.teamId == teamId && !p.archived ? p : null; };

// Coach / assistant coach of a team (names are set on the team's page). A foul charged to them is an event with staff: 'coach' | 'assistant' and no player.
const staffLabel = (teamId, who) => who == 'coach' ? (T(teamId).coach || 'Head coach') : (T(teamId).assistant || 'Assistant coach');

// Kind of a player foul: 'personal' (also every older foul without a kind) | 'technical' | 'flagrant'.
// Every kind is counted in the player's PF and in the team fouls.
const FOUL_TYPES = [['personal', 'Personal'], ['technical', 'Technical'], ['flagrant', 'Flagrant']];
const foulKind = e => e.foulType || 'personal';
const foulTag = e => (e.type == 'foul' && (e.playerId || e.staff) && foulKind(e) != 'personal') ? (foulKind(e) == 'technical' ? ' (T)' : ' (F)') : '';   // small suffix for logs: FOUL (T) / FOUL (F)

// Statistics per player for a list of events -> { playerId: {pts, reb, ...} }
function st(events) {
  const result = {};
  for (const e of events) {
    if (!e.playerId || e.type == 'sub') continue;        // timeouts and substitutions are not stats
    const line = result[e.playerId] ??= Z();
    if (e.type == 'pts') line.pts += e.pts;
    else if (e.type == 'foul') line.pf++;
    else line[e.type]++;
  }
  return result;
}

// One player's totals across games (optionally for one season). gp = games played.
function tot(playerId, season) {
  const total = { gp: 0, ...Z() };
  DB.games
    .filter(g => g.status != 'scheduled' && (!season || g.season == season))
    .forEach(g => {
      const line = st(g.events)[playerId];
      if ((g.played || []).includes(playerId) || line) {
        total.gp++;
        KS.forEach(k => total[k] += line ? line[k] : 0);
      }
    });
  return total;
}

// Per-game average as text, e.g. "12.5"
const avg = (total, key) => (total.gp ? (total[key] / total.gp).toFixed(1) : '0.0');

// Ranking helper: rk(rows, 'pts') returns a function that gives a row's rank (ties share a rank)
function rk(rows, key) {
  const sorted = [...rows].sort((x, y) => y[key] - x[key]);
  return row => 1 + sorted.findIndex(x => x[key] == row[key]);
}
