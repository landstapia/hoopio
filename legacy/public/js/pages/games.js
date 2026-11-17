/* pages/games.js - /games (schedule + season standings), /games/:id (details, rankings, editable events),
   /games/:id/statistics (read-only box score). */

pages.games = function (parts) {
  const id = parts[1];
  if (!id) return gamesList();
  const g = G(id);
  if (!g) return { h: 'Not found' };
  if (parts[2] == 'statistics') return gameStatistics(g);
  if (parts[2] == 'logs') return gameLogs(g);
  if (parts[2] == 'scoresheet') return gameScoresheet(g);
  return gameDetail(g);
};

const seasonId = season => 'gs-' + String(season).replace(/[^\w-]/g, '_');   // safe element id for a season's table

// Rows of {p: player, s: statLine} for everyone who played in a game, best scorer first.
// (Deleted players are left out.)
function gameRows(g) {
  const stats = st(g.events);
  const ids = [...new Set([...g.played, ...Object.keys(stats).map(Number)])];
  return ids
    .map(id => ({ p: PL(id), s: stats[id] || Z() }))
    .filter(row => row.p.id)
    .sort((x, y) => y.s.pts - x.s.pts);
}

/* ---------- Standings (bottom of /games): one season at a time, optional category ---------- */
const stdUi = { season: '', cat: '' };                      // chosen season ('' = the latest) and category ('' = all)

// One row per team that is part of a game in the season (scheduled, live or final). Only FINAL games count towards the numbers.
function standingsData(season) {
  const games = DB.games.filter(g => g.season == season);
  const ids = [...new Set(games.flatMap(g => [g.home, g.away]))].filter(id => T(id).id);
  const finals = games.filter(g => g.status == 'final').sort((x, y) => ((x.date + (x.time || '')) < (y.date + (y.time || '')) ? -1 : 1));
  const rows = ids.map(id => {
    let gp = 0, w = 0, l = 0, pf = 0, pa = 0;
    const form = [], pts = {};
    finals.filter(g => g.home == id || g.away == id).forEach(g => {
      const opp = g.home == id ? g.away : g.home, mine = sc(g, id), theirs = sc(g, opp);
      gp++; pf += mine; pa += theirs;
      if (mine > theirs) { w++; form.push('W'); } else if (mine < theirs) { l++; form.push('L'); } else form.push('T');
      g.events.forEach(e => { if (e.type == 'pts' && e.teamId == id && e.playerId) pts[e.playerId] = (pts[e.playerId] || 0) + e.pts; });
    });
    const top = Object.entries(pts).map(([pid, n]) => ({ p: PL(+pid), n })).filter(x => x.p.id)
      .sort((x, y) => y.n - x.n || byNumber(x.p.number, y.p.number))[0];      // same points: the lower jersey number
    return { t: T(id), gp, w, l, pf, pa, diff: pf - pa, pct: gp ? w / gp : -1, form: form.slice(-5), top };
  });
  // Teams with games played first: win %, then point difference, then points for, then name
  return rows.sort((x, y) => (y.gp > 0) - (x.gp > 0) || y.pct - x.pct || y.diff - x.diff || y.pf - x.pf || x.t.name.localeCompare(y.t.name));
}

function standingsHtml() {
  const all = seasons();
  if (!all.length) return '<h3>Standings</h3><p class="std-note">No games yet.</p>';
  const season = all.includes(stdUi.season) ? stdUi.season : all[all.length - 1];
  const rows = standingsData(season).filter(r => !stdUi.cat || (r.t.category || 'Free') == stdUi.cat);
  const tip = (abbr, text) => `<span title="${text}">${abbr}</span>`;
  const table = rows.length ? dtb('standings', ['#', 'Team', tip('GP', 'Games played (final games)'), tip('W', 'Wins'), tip('L', 'Losses'),
    tip('PCT', 'Winning percentage: wins divided by games played'), tip('PF', 'Points for: total points scored'), tip('PA', 'Points against: total points allowed'),
    tip('DIFF', 'Point difference: PF minus PA'), tip('LAST 5', 'Results of the last five final games, oldest first')],
    rows.map((r, i) => {
      const pct = r.gp ? (r.w == r.gp ? '1.000' : r.pct.toFixed(3).slice(1)) : '–';
      const cat = r.t.category || 'Free';
      return [
        { h: i == 0 && r.gp ? '<span class="std-r1">1</span>' : i + 1, s: i + 1 },
        { h: `<div class="std-tm">${a('/teams/' + r.t.id, E(r.t.name))}<span class="cat cat-${E(cat)}">${E(cat)}</span></div>
               <div class="std-ts"><span class="lb">TOP SCORER</span>${r.top ? `<span>#${E(r.top.p.number)} ${E(nm(r.top.p))}</span><b>${r.top.n} pts</b>` : `<span>${r.gp ? 'no player points recorded' : 'no final game yet'}</span>`}</div>`, s: r.t.name },
        r.gp, r.w, r.l,
        { h: `<b>${pct}</b>`, s: r.pct },
        r.pf, r.pa,
        { h: r.gp ? `<span class="${r.diff > 0 ? 'std-up' : r.diff < 0 ? 'std-dn' : ''}">${r.diff > 0 ? '+' : r.diff < 0 ? '−' : ''}${Math.abs(r.diff)}</span>` : '–', s: r.gp ? r.diff : -9999 },
        { h: `<div class="std-form">${r.form.map(f => `<span class="std-${f == 'W' ? 'w' : f == 'L' ? 'l' : 't'}">${f}</span>`).join('')}</div>`, s: r.form.filter(f => f == 'W').length },
      ];
    })) : '<p class="std-note">No teams in this season for the chosen category.</p>';
  const catBtn = (val, label) => `<button class="${stdUi.cat == val ? 'on' : ''}" onclick="stdSet('cat','${val}')">${label}</button>`;
  return `<section class="card std">
    <div class="std-head"><h3>Standings</h3>
      ${fs('Season', `onchange="stdSet('season',this.value)"`, opt(all.map(x => [x, x]), season), 's')}
      <div class="std-seg">${catBtn('', 'All')}${catBtn('Senior', 'Senior')}${catBtn('Junior', 'Junior')}${catBtn('Free', 'Free')}</div>
      <i></i><span class="std-note">Final games only · ranked by win %, then point difference</span></div>
    ${table}
    <p class="std-note">Every team in this season's games is listed, also before its first final game (at the bottom). Top scorer = most points in final games.</p></section>`;
}
function stdSet(key, val) { stdUi[key] = val; delete DT_STATE.standings; route(); }

/* ---------- New game: same category only ---------- */
const catOf = id => T(id).category || 'Free';
const awayOpts = (homeId, selected) => {
  const list = DB.teams.filter(t => !t.archived && t.id != homeId && catOf(t.id) == catOf(homeId)).map(t => [t.id, t.name]);
  return list.length ? opt(list, selected) : '<option value="">(no other team in this category)</option>';
};
const catNote = homeId => (homeId ? `Category: ${catOf(homeId)}. Only ${catOf(homeId)} teams can play each other.` : '');
function gHomeChanged() {                                      // the opponent list follows the category of the home team
  const h = +V('gh');
  $('#ga').html(awayOpts(h));
  $('#gcat').text(catNote(h));
}
function addGame() {
  const home = +V('gh'), away = +V('ga');
  if (!home || !away) return alert('Choose both teams.');
  if (home == away) return alert('A team cannot play itself.');
  if (catOf(home) != catOf(away)) return alert(`Only ${catOf(home)} teams can play ${catOf(home)} teams. ${T(away).name} is ${catOf(away)}.`);
  const print = $('#gprint').prop('checked');
  P({ newGame: { season: V('gs'), date: V('gd'), time: V('gt'), home, away, runningTime: $('#grt').prop('checked'),
      competition: V('gc').trim() || 'BCBL', place: V('gp').trim() || DEFAULT_PLACE }, log: 'New game scheduled' })
    .then(() => { if (print) go('/games/' + DB.games[DB.games.length - 1].id + '/scoresheet?print=1'); });      // the new game is the last one
}
const DEFAULT_PLACE = 'Rodriguez Village Basketball Court';

/* ---------- /games/:id/logs : the event log, read only ---------- */
function evDescribe(e) {
  const p = PL(e.playerId);
  if (e.type == 'timeout') return { who: 'no player', type: 'TIMEOUT' + (e.secs ? ' ' + secText(e.secs) : ''), c: '#fde047' };
  if (e.type == 'tech') return { who: 'no player', type: 'TECHNICAL' + (e.teamFoul ? ' (team foul)' : ''), c: '#fca5a5' };
  if (e.type == 'sub') return { who: `in ${PL(e.playerId).id ? '#' + PL(e.playerId).number + ' ' + nm(PL(e.playerId)) : '-'} · out ${PL(e.outId).id ? '#' + PL(e.outId).number + ' ' + nm(PL(e.outId)) : '-'}`, type: 'SUB', c: '#c7d2fe' };
  if (e.type == 'foul' && e.staff) return { who: (e.staff == 'coach' ? 'Coach: ' : 'Asst. coach: ') + staffLabel(e.teamId, e.staff), type: 'FOUL' + foulTag(e) + (e.teamFoul === false ? ' (no team foul)' : ''), c: '#fca5a5' };
  if (e.type == 'foul' && !e.playerId) return { who: 'no player', type: 'TEAM FOUL', c: '#fca5a5' };
  return { who: `#${p.number} ${nm(p)}`, type: e.type == 'pts' ? '+' + e.pts : e.type.toUpperCase() + foulTag(e), c: e.type == 'pts' ? '#93c5fd' : e.type == 'foul' ? '#fca5a5' : '#5eead4' };
}
function gameLogs(g) {
  const score = { [g.home]: 0, [g.away]: 0 };
  const rows = g.events.map((e, i) => {
    if (e.type == 'pts') score[e.teamId] += e.pts;
    const d = evDescribe(e);
    return [
      { h: i + 1, s: i + 1 },                                  // "#" = the order the events were added; the newest is shown first
      { h: per(e.period), s: e.period },
      { h: fc(e.clock), s: e.clock },
      { h: `<b style="color:${col(e.teamId)}">${E(ab(e.teamId))}</b>`, s: ab(e.teamId) },
      E(d.who),
      { h: `<b style="color:${d.c}">${E(d.type)}</b>`, s: d.type },
      e.type == 'pts' ? `${score[g.home]}&ndash;${score[g.away]}` : '',
    ];
  });
  return {
    bc: [['Games', '/games'], [`Game #${g.id}`, '/games/' + g.id], ['Logs']],
    h: `<h2>${E(T(g.home).name)} ${sc(g, g.home)} – ${sc(g, g.away)} ${E(T(g.away).name)}</h2>
        <p class="std-note">${E(g.season)} · ${E(g.date)} ${E(g.time || '')} · ${E(g.status)} · event log (read only, newest first) ·
          ${a('/games/' + g.id, 'Details')} · ${a('/games/' + g.id + '/statistics', 'Stats')}</p>
        ${rows.length ? dtb('glog-' + g.id, ['#', 'Q', 'Clock', 'Team', 'Player', 'Type', 'Score'], rows) : '<p class="std-note">No events recorded yet.</p>'}`,
    after: () => $('#glog-' + g.id).dataTableLite({ pageLength: 50, order: [0, 'desc'], placeholder: 'Search team, player or type…' }),
  };
}

/* ---------- /games ---------- */
function gamesList() {
  const year = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  // Only teams of the same category can play each other: Senior with Senior, Junior with Junior, Free with Free
  const firstHome = DB.teams.find(t => !t.archived);
  const newGameForm = `
    <div class="card"><b>New game</b><br>
      ${fi('Season', `id="gs" value="${year}"`, 'xs')}${fx('Date', `id="gd" type="date" value="${today}"`, 's')}${fx('Time', 'id="gt" type="time"', 's')}
      ${fs('Home team', 'id="gh" onchange="gHomeChanged()"', topts(firstHome?.id), 'l')}${fs('Away team', 'id="ga"', awayOpts(firstHome?.id), 'l')}
      ${fi('Competition', 'id="gc" value="BCBL"', 's')}${fi('Place', `id="gp" value="${E(DEFAULT_PLACE)}"`, 'l')}
      <br><label style="display:inline-block;white-space:nowrap;margin:8px 14px 0 0" title="The clock keeps running through fouls and substitutions (FIBA stop-time in the last 2:00 of Q4 / OT)"><input type="checkbox" id="grt"> running time</label>
      <label style="display:inline-block;white-space:nowrap;margin:8px 14px 0 0" title="Opens the FIBA scoresheet (teams, players, coaches, date, place...) ready to print after the game is added"><input type="checkbox" id="gprint"> print scoresheet</label>
      <button onclick="addGame()">Add</button>
      <small id="gcat" class="std-note">${catNote(firstHome?.id)}</small>
    </div>`;

  // One sortable / searchable table per season (see js/datatable.js)
  const schedule = seasons().map(season => {
    const games = DB.games.filter(g => g.season == season).sort((x, y) => (x.date < y.date ? -1 : 1));
    return `<h3>Season ${E(season)}</h3>` + dtb(seasonId(season), ['Date', 'Time', 'Match', 'Score', 'Status', ''], games.map(g => [
      g.date,
      g.time || '—',
      (g.isDefault ? '<span class="std-r1" title="Default game">★</span> ' : '') + `<small>#${g.no || g.id}</small> ` + E(T(g.home).name || ab(g.home)) + ' vs ' + E(T(g.away).name || ab(g.away)),      // full team names (the abbreviation is used where space is tight)
      { h: lbl(g), s: sc(g, g.home) + sc(g, g.away) },
      g.status + (g.runningTime ? ' <small>· running time</small>' : ''),
      a('/games/' + g.id, 'Details') + ' · ' + a('/games/' + g.id + '/statistics', 'Stats') + ' · ' + a('/games/' + g.id + '/logs', 'Logs') + ' · ' + a('/games/' + g.id + '/scoresheet', 'Scoresheet') +
        ` · <a href="#" onclick="goLive(${g.id});return false">Go live</a>` +
        ` · <a href="#" onclick="setDefaultGame(${g.id});return false">${g.isDefault ? 'Remove default' : 'Set default'}</a>`,
    ]));
  }).join('');

  return {
    bc: [['Games']], h: `${pageHead('Games', [{ label: 'Generate CSV', js: 'exportGamesCsv()' }])}${newGameForm}${schedule}${standingsHtml()}`,
    after: () => {
      seasons().forEach(season => $('#' + seasonId(season)).dataTableLite({ pageLength: 25, placeholder: 'Search team, date or status…' }));
      $('#standings').dataTableLite({ search: false, filters: false, paging: false, pageLength: 0 });
    },
  };
}

/* ---------- /games/:id/statistics (read-only, no menu or breadcrumbs) ---------- */
function gameStatistics(g) {
  const rows = gameRows(g);
  const teamTable = teamId => {
    const teamRows = rows.filter(r => r.p.teamId == teamId);
    const totals = Z();
    teamRows.forEach(r => KS.forEach(k => totals[k] += r.s[k]));
    return `<h3>${E(T(teamId).name)}</h3>` + dtb('box-' + teamId, ['#', 'Player', ...KS.map(k => k.toUpperCase())],
      teamRows.map(r => [E(r.p.number), { h: `<span class="pnm">${E(nm(r.p))}</span>`, s: nm(r.p) }, ...KS.map(k => ({ h: r.s[k] || '-', s: r.s[k] }))]),
      [['', '<b>Team</b>', ...KS.map(k => `<b>${totals[k]}</b>`)]]);
  };
  return {
    h: `<div class="brandbar"><img src="${BRAND.logo}" alt=""><div><b>${BRAND.fullName}</b><br><small>Official game statistics</small></div></div>
        <h2>${E(T(g.home).name)} ${sc(g, g.home)} – ${sc(g, g.away)} ${E(T(g.away).name)}</h2>
        <small>${g.season} · ${g.date} ${g.time || ''} · ${g.status} (read-only)</small>
        ${teamTable(g.home)}${teamTable(g.away)}`,
    after: () => [g.home, g.away].forEach(t => $('#box-' + t).dataTableLite({ search: false, filters: false, paging: false, pageLength: 0 })),
  };
}

/* ---------- Event log (compact, editable, newest first) ----------
   One slim line per event. Period, clock, player and type can be changed in the line itself, the ✕ deletes the event.
   Newest added event on top, the oldest at the bottom. Filters (team, type, period, player) and the "+ Add event" row
   keep their state while the page redraws. Styles: css/events.css */
const evUi = { gid: 0, team: '', type: '', period: '', q: '', add: false };
const EV_TYPES = [['pts1', '+1'], ['pts2', '+2'], ['pts3', '+3'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK'], ['to', 'TO'], ['foul', 'FOUL']];
const evKind = e => (e.type == 'pts' ? 'pts' + e.pts : e.type);
const EV_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const rosterOf = g => DB.players.filter(p => [g.home, g.away].includes(p.teamId));

function evRowsHtml(g) {
  const roster = rosterOf(g), periods = [...new Set([1, 2, 3, 4, ...g.events.map(e => e.period)])].sort((x, y) => x - y);
  const score = {}, run = {}; score[g.home] = 0; score[g.away] = 0;                  // running score after each scoring event (in the order they were added)
  g.events.forEach(e => { if (e.type == 'pts') { score[e.teamId] += e.pts; run[e.id] = `${score[g.home]}&ndash;${score[g.away]}`; } });
  const q = evUi.q.trim().toLowerCase();
  const shown = g.events.slice().reverse().filter(e => {                              // newest first
    if (evUi.team && e.teamId != evUi.team) return false;
    if (evUi.period && e.period != evUi.period) return false;
    if (evUi.type && !(evUi.type == 'pts' ? e.type == 'pts' : evKind(e) == evUi.type)) return false;
    if (q) { const p = PL(e.playerId); if (!(`#${p.number} ${nm(p)} ${fullName(p)}`.toLowerCase().includes(q))) return false; }
    return true;
  });
  let prev = null;
  const rows = shown.map(e => {
    const kind = evKind(e), teamFoul = e.type == 'foul' && !e.playerId && !e.staff;   // a team foul (Controls page) has no player and is not a coach foul
    const tp = roster.filter(p => p.teamId == e.teamId).map(p => `<option value="${p.id}" ${p.id == e.playerId ? 'selected' : ''}>#${p.number} ${E(nm(p))}</option>`).join('');
    const removed = PL(e.playerId).id ? '' : '<option selected>(removed player)</option>';
    let who, type;
    if (e.type == 'foul' && e.staff) who = `<span class="ero evdim">${E((e.staff == 'coach' ? 'Coach: ' : 'Asst: ') + staffLabel(e.teamId, e.staff))}</span>`;
    else if (e.type == 'timeout' || e.type == 'tech' || teamFoul) who = '<span class="ero evdim">no player</span>';
    else if (e.type == 'sub') who = `<span class="ero evdim">in ${E(PL(e.playerId).id ? '#' + PL(e.playerId).number : '-')} · out ${E(PL(e.outId).id ? '#' + PL(e.outId).number : '-')}</span>`;
    else who = `<label class="ech"><select aria-label="Player" onchange="evP(${g.id},${e.id},this.value)">${removed}${tp}</select></label>`;
    if (e.type == 'foul' && e.staff) type = `<span class="ero etf">FOUL${E(foulTag(e))}</span>`;
    else if (teamFoul) type = '<span class="ero etf">TEAM FOUL</span>';
    else if (EV_TYPES.some(t => t[0] == kind)) type = `<label class="ech ety ${kind.startsWith('pts') ? 'etp' : kind == 'foul' ? 'etf' : 'ets'}"><select aria-label="Type" onchange="evT(${g.id},${e.id},this.value)">${opt(EV_TYPES, kind)}</select></label>`;
    else if (e.type == 'tech') type = `<span class="ero etf">TECHNICAL${e.teamFoul ? ' (team foul)' : ''}</span>`;
    else if (e.type == 'timeout') type = `<span class="ero eto">TIMEOUT${e.secs ? ' ' + secText(e.secs) : ''}</span>`;
    else type = `<span class="ero evdim">${E(e.type.toUpperCase())}</span>`;
    const pb = prev !== null && prev != e.period ? ' evpb' : '';
    prev = e.period;
    return `<div class="evrow${pb}"><label class="ech"><select aria-label="Period" onchange="evPer(${g.id},${e.id},this.value)">${opt(periods.map(x => [x, per(x)]), e.period)}</select></label>
      <input class="eci" aria-label="Clock" value="${fc(e.clock)}" title="Clock, e.g. 7:45 or 9.4" onchange="evClk(${g.id},${e.id},this.value)">
      <span class="etm" style="--c:${col(e.teamId)}">${E(ab(e.teamId))}</span>${who}${type}<span class="ers">${run[e.id] || ''}</span>
      <button class="ex" aria-label="Delete event" onclick="evD(${g.id},${e.id})">${EV_X}</button></div>`;
  }).join('');
  return { rows, shown: shown.length, total: g.events.length };
}

function evLogHtml(g) {
  evUi.gid = g.id;
  const { rows, shown, total } = evRowsHtml(g), roster = rosterOf(g), periods = [...new Set([1, 2, 3, 4, ...g.events.map(e => e.period)])].sort((x, y) => x - y);
  const teamBtn = (val, label) => `<button data-t="${val}" class="${String(evUi.team) == String(val) ? 'on' : ''}" onclick="evSet('team','${val}')">${label}</button>`;
  const fTypes = opt([['', 'All types'], ['pts', 'All points'], ...EV_TYPES, ['tech', 'TECH'], ['timeout', 'TIMEOUT'], ['sub', 'SUB']], evUi.type);
  const add = !evUi.add ? '' : `<div class="evadd">
      ${fs('Period', 'id="aper"', opt(periods.map(x => [x, per(x)]), LV().gameId == g.id ? LV().period : periods[periods.length - 1]))}
      ${fi('Clock', `id="aclk" title="mm:ss" value="${LV().gameId == g.id ? fc(LV().clock) : ''}"`)}
      ${fs('Team', `id="ateam" onchange="evAddTeam(${g.id})"`, [g.home, g.away].map(t => `<option value="${t}">${E(ab(t))}</option>`).join(''))}
      ${fs('Player', 'id="ap"', roster.filter(p => p.teamId == g.home).map(p => `<option value="${p.id}">#${p.number} ${E(nm(p))}</option>`).join(''))}
      ${fs('Type', 'id="at"', opt(EV_TYPES, 'pts2'))}
      <button onclick="addEv(${g.id})">Add</button></div>`;
  return `<div class="evlog">
    <div class="evr1"><h3>Event log</h3><span class="evdim">Newest first · tap any value to edit it, changes save at once</span><i></i>
      <button class="evbtn" onclick="evUi.add=!evUi.add;route()">${evUi.add ? 'Close' : '+ Add event'}</button></div>
    <div class="evtools">
      <div class="evseg">${teamBtn('', 'All')}${teamBtn(g.home, E(ab(g.home)))}${teamBtn(g.away, E(ab(g.away)))}</div>
      ${fs('Type', `onchange="evSet('type',this.value)"`, fTypes, 's')}
      ${fs('Period', `onchange="evSet('period',this.value)"`, opt([['', 'All'], ...periods.map(x => [x, per(x)])], evUi.period), 's evx')}
      ${fi('Search player', `value="${E(evUi.q)}" oninput="evSet('q',this.value)"`, 'm evx')}
      <i></i><span class="evdim" id="evcount">Showing ${shown} of ${total}</span></div>
    ${add}
    <div class="evtbl"><div class="evrow evh"><span>Q</span><span>CLOCK</span><span>TEAM</span><span>PLAYER</span><span>TYPE</span><span class="ers">SCORE</span><span></span></div><div id="evbody">${rows || '<p class="evdim" style="padding:12px">No events match.</p>'}</div></div>
  </div>`;
}

// Filters: only the table is redrawn (so typing in the search box keeps its focus)
function evSet(key, val) {
  evUi[key] = val;
  const g = G(evUi.gid), { rows, shown, total } = evRowsHtml(g);
  $('#evbody').html(rows || '<p class="evdim" style="padding:12px">No events match.</p>');
  $('#evcount').text(`Showing ${shown} of ${total}`);
  $('.evseg button').each(function () { $(this).toggleClass('on', String($(this).data('t')) == String(evUi.team)); });
}
// In the add row, the player list follows the chosen team
function evAddTeam(id) {
  const g = G(id), t = +V('ateam');
  $('#ap').html(rosterOf(g).filter(p => p.teamId == t).map(p => `<option value="${p.id}">#${p.number} ${E(nm(p))}</option>`).join(''));
}

/* ---------- /games/:id ---------- */
function gameDetail(g) {
  return {
    bc: [['Games', '/games'], [`Game #${g.id}`]],
    h: `
      <h2>${E(T(g.home).name)} ${sc(g, g.home)} – ${sc(g, g.away)} ${E(T(g.away).name)}</h2>
      <div class="card">
        ${fs('Status', `onchange="setSt(${g.id},this.value)"`, opt(['scheduled', 'live', 'final'].map(x => [x, x]), g.status), 's')}
        ${fx('Date', `id="ed" type="date" value="${g.date}"`, 's')}${fx('Time', `id="et" type="time" value="${g.time || ''}"`, 's')}
        <span class="fl-note" style="margin:22px 10px 0 0">Game No. <b>${g.no || g.id}</b></span>${fi('Competition', `id="ec" value="${E(g.competition || 'BCBL')}"`, 's')}${fi('Place', `id="ep" value="${E(g.place || DEFAULT_PLACE)}"`, 'l')}
        <button onclick="saveWhen(${g.id})">Save</button>
        <button onclick="goLive(${g.id})">Make live game</button>
        <button onclick="setDefaultGame(${g.id})" title="The default game becomes the live game whenever no game is live">${g.isDefault ? '★ Default game (click to remove)' : '☆ Mark as default game'}</button>
        ${a('/games/' + g.id + '/statistics', 'View statistics')} · ${a('/games/' + g.id + '/scoresheet', 'Print scoresheet')}
        <button onclick="if(confirm('Delete game?'))P({delGame:${g.id},log:'Game ${g.id} deleted'}).then(()=>go('/games'))">Delete</button>
      </div>

      <div class="card rtbox">
        <label class="rt ${g.runningTime ? 'on' : ''}"><input type="checkbox" ${g.runningTime ? 'checked' : ''} onchange="setRT(${g.id},'runningTime',this.checked)"> <b>Running time</b>
          <small>the clock keeps running through fouls and substitutions</small></label>
        <label class="rt2 ${g.runningTime ? '' : 'dim'}"><input type="checkbox" ${g.rtLast2 !== false ? 'checked' : ''} ${g.runningTime ? '' : 'disabled'} onchange="setRT(${g.id},'rtLast2',this.checked)">
          FIBA stop-time in the last 2:00 of the 4th quarter and overtime</label>
      </div>

      <h3>Player rankings</h3>
      ${rtab(gameRows(g), ['pts', 'reb', 'ast', 'stl'], 'gamerank')}

      ${evLogHtml(g)}`,
    after: () => startRtab('gamerank'),
  };
}


/* ---------- /games/:id/scoresheet : the FIBA scoresheet, filled in, ready to print ----------
   The blank sheet is the picture public/img/fiba-scoresheet.jpg (8.5 x 13 in, 200 dpi = 1700 x 2600 px). The text is laid on top of it.
   All positions below are in picture pixels (from the top left); sx() turns them into screen / paper pixels. Printing: paper size Folio 8.5 x 13 in, margins none.
   Filled in: Team A (= home) and Team B (= away), Competition, Date, Time, Game No., Place, players (last name, first name) with their numbers,
   head coach and first assistant coach. Everything else is left blank for the scorer. */
const SHEET_K = 816 / 1700;                                     // picture pixel -> css pixel (8.5 in = 816 css px)
const SHEET_ROWS = 12;                                          // player lines per team on the sheet
const SHEET_TEAM = [                                            // vertical positions of Team A and Team B: name line, first player line top, coach lines
  { name: 503, rows: 725, head: 1168, asst: 1206 },
  { name: 1287, rows: 1513, head: 1956, asst: 1994 },
];
function gameScoresheet(g) {
  const k = SHEET_K, rowH = (1168 - 725) / SHEET_ROWS;
  // text: x0..x1 = the space for the text, yb = the bottom of the text (the line it sits on), size in picture pixels (shrinks to fit), center = centered
  const txt = (text, x0, x1, yb, size = 26, center = false) => {
    text = String(text ?? '').trim();
    if (!text) return '';
    const fs = Math.min(size, (x1 - x0) / (text.length * 0.54));
    return `<div class="fs-t" style="left:${(x0 * k).toFixed(1)}px;width:${((x1 - x0) * k).toFixed(1)}px;bottom:${((2600 - yb) * k).toFixed(1)}px;font-size:${(fs * k).toFixed(2)}px;${center ? 'text-align:center' : ''}">${E(text)}</div>`;
  };
  const dateText = g.date ? g.date.split('-').reverse().join('/') : '';
  const teams = [T(g.home), T(g.away)];
  let h = txt(teams[0].name, 196, 845, 340, 30) + txt(teams[1].name, 998, 1648, 340, 30)                   // Team A / Team B on the top line
    + txt(g.competition || 'BCBL', 262, 376, 397, 28) + txt(dateText, 478, 625, 397, 28) + txt(g.time, 726, 891, 397, 28)
    + txt(g.no || g.id, 262, 374, 439, 28, true) + txt(g.place || DEFAULT_PLACE, 500, 891, 439, 28);
  const notes = [];
  [g.home, g.away].forEach((teamId, i) => {
    const pos = SHEET_TEAM[i], t = T(teamId);
    h += txt(t.name, 202, 817, pos.name - 4, 30);                                                           // Team A / Team B inside the team box
    const players = teamPlayers(teamId).sort((x, y) => byNumber(x.number, y.number));
    if (players.length > SHEET_ROWS) notes.push(`${t.name} has ${players.length} players: only the first ${SHEET_ROWS} (by number) fit on the sheet.`);
    players.slice(0, SHEET_ROWS).forEach((p, r) => {
      const bottom = pos.rows + (r + 1) * rowH - 3;
      h += txt((p.first ? `${p.last}, ${p.first}` : p.last) + (captainOf(teamId)?.id == p.id ? ' (CAP)' : ''), 146, 572, bottom, 25) + txt(p.number, 580, 621, bottom, 25, true);
    });
    h += txt(t.coach, 382, 738, pos.head + 34, 25) + txt(t.assistant, 382, 738, pos.asst + 33, 25);
  });
  return {
    h: `<style>
        @page { size: 8.5in 13in; margin: 0; }
        .fs-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 8px 0; }
        .fs-wrap { overflow: auto; }
        .fsheet { position: relative; width: 816px; height: 1247px; background: #fff; box-shadow: 0 0 0 1px #888; }
        .fsheet img { position: absolute; left: 0; top: 0; width: 816px; height: 1248px; }
        .fs-t { position: absolute; color: #000; font-family: Arial, Helvetica, sans-serif; font-weight: 600; line-height: 1; white-space: nowrap; overflow: hidden; }
        @media print {
          header, footer, .bc, .fs-bar { display: none !important; }
          html, body, main { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .fs-wrap { overflow: visible; } .fsheet { box-shadow: none; }
        }
      </style>
      <div class="fs-bar"><button onclick="window.print()">Print scoresheet</button>${a('/games/' + g.id, 'Back to the game')} · ${a('/games', 'Games')}
        <small class="std-note">Paper: Folio 8.5 × 13 in, margins: none, scale: 100%. ${notes.map(E).join(' ')}</small></div>
      <div class="fs-wrap"><div class="fsheet"><img id="fsimg" src="/img/fiba-scoresheet.jpg" alt="FIBA scoresheet">${h}</div></div>`,
    after: () => {
      if (!/[?&]print=1/.test(location.search)) return;
      history.replaceState(0, '', location.pathname);                                    // so a refresh does not print again
      const img = document.getElementById('fsimg');
      const go = () => setTimeout(() => window.print(), 300);
      if (img.complete) go(); else img.onload = go;
    },
  };
}
