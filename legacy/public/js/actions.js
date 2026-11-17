/* actions.js - everything a button does. Pages only draw HTML; the buttons call these functions.
   Most actions: change something -> P({...}) sends it to the server, which also writes game-log.txt.
   Note: always read the game again with CG() at the moment of the change (not earlier), so changes made on another device are not lost. */

// A new game event (score, foul, rebound, substitution, timeout...) stamped with period and clock
const evBase = (teamId, type, playerId) => ({
  id: Date.now() + Math.random(), period: LV().period, clock: LV().clock, teamId, playerId, type,
});
const lbl = g => `${sc(g, g.home)}-${sc(g, g.away)}`;      // "12-10" score text for the log
const logTime = () => `Q${per(LV().period)} ${fc(LV().clock)}`;
const TIMEOUT_MS = 60000;   // a timeout lasts 1 minute
const BUZZ_MS = 2500;       // length of the automatic buzzer

// Active (on-court) players of one team / of both teams, deleted players left out
const activeOf = (g, teamId) => g.active[teamId].map(PL).filter(p => p.id);
const activePlayers = g => sheetSides(g).flatMap(teamId => activeOf(g, teamId));

/* ================= STATISTICS: points, fouls and other stats =================
   type: 'pts' | 'foul' | 'reb' | 'ast' | 'stl' | 'blk' | 'to'      pts: 1, 2 or 3 (for 'pts') */
async function add(type, pts) {
  if (!CG()) return alert('No live game selected');
  const l0 = LV(), g0 = CG();
  // The clocks react the moment the button is pressed, before (and whether or not) a player is chosen.
  if (type == 'foul') {
    if (rtActive(g0, l0)) await P({ log: `${logTime()} | FOUL pressed: RUNNING TIME - clocks keep running` });
    else await P({ live: { running: false }, log: `${logTime()} | FOUL pressed: game & shot clock paused` });
  } else if (pts) {
    const live = { shot: 24000 };                      // a made basket resets the shot clock value (hidden or paused stays as the operator left it)
    // FIBA: in the last 2:00 of the 4th quarter / overtime the clock stops after a made field goal (running-time games)
    const stopAfterBasket = pts >= 2 && !!g0.runningTime && g0.rtLast2 !== false && inLastTwo(l0);
    if (stopAfterBasket) live.running = false;
    await P({ live, log: `${logTime()} | +${pts} pressed: shot clock reset to 24${stopAfterBasket ? ' · made field goal in the last 2:00: game clock stopped (FIBA)' : ''}` });
  }

  const title = `${pts ? '+' + pts + ' points' : type == 'foul' ? 'FOUL' : type.toUpperCase()} — type the jersey number or tap a player`;
  let foulType = 'personal', teamFoul = true;         // chosen at the bottom of the FOUL window (default: personal, counts as team foul)
  const pick = player => {
    const g = CG(), l = LV();                         // fresh copy of the game
    const event = evBase(player.teamId, type, player.id);
    if (pts) event.pts = pts;
    if (type == 'foul') { event.foulType = foulType; event.teamFoul = teamFoul; }
    g.events.push(event);
    if (g.status == 'scheduled') g.status = 'live';
    const kindText = type == 'foul' && foulType != 'personal' ? ` ${foulType.toUpperCase()}` : '';
    P({
      games: [g],
      live: type == 'foul' && foulType != 'personal' ? { running: false } : undefined,      // technical and flagrant fouls always stop the clock (also in running time)
      log: `Q${per(l.period)} ${fc(l.clock)} | ${ab(player.teamId)} #${player.number} ${nm(player)} ${pts ? '+' + pts : type.toUpperCase() + kindText} | score ${lbl(g)}`,
    }).then(() => {
      if (type == 'foul' && st(CG().events)[player.id].pf >= 5) alert(`#${player.number} ${nm(player)} has 5 fouls — must be substituted`);
    });
  };

  // The FOUL popup: at the bottom the foul type, the "counts as team foul" tick (ticked by default) and the coach / assistant coach buttons
  const footer = type != 'foul' ? null : (box, close) => {
    const staffBtn = (t, who) => `<button class="b" data-staff="${t}|${who}" style="background:${col(t)};color:${ink(col(t))}">${E(ab(t))} · ${who == 'coach' ? 'Coach' : 'Asst. coach'}: ${E(staffLabel(t, who))}</button>`;
    box.html(`<div class="tfoul">
      <div class="row" style="align-items:center;gap:18px"><label style="display:inline-flex;align-items:center;gap:8px;white-space:nowrap;flex:none;width:auto">Foul type <select id="foulType">${opt(FOUL_TYPES, 'personal')}</select></label>
        <label style="display:inline-flex;align-items:center;gap:8px;white-space:nowrap;flex:none;width:auto"><input type="checkbox" id="fTeam" checked style="width:auto;flex:none;margin:0"> counts as a team foul</label></div>
      <div class="lbl">Coach / assistant coach <small>tap to charge the foul to the coach (uses the foul type and team foul tick above)</small></div>
      ${sheetSides(CG()).map(t => `<div class="row">${staffBtn(t, 'coach')}${staffBtn(t, 'assistant')}</div>`).join('')}</div>`);
    box.on('change', '#foulType', function () { foulType = this.value; });
    box.on('change', '#fTeam', function () { teamFoul = this.checked; });
    box.on('click', '[data-staff]', function () { const [t, who] = String($(this).data('staff')).split('|'); close(); staffFoul(+t, who, foulType, teamFoul); });
  };
  pickPlayers(title, CG(), pick, footer);
}

// A foul charged to the coach or the assistant coach (no player, no jersey number). who: 'coach' | 'assistant'
function staffFoul(teamId, who, foulType, teamFoul) {
  const g = CG(), l = LV();
  const event = evBase(teamId, 'foul', null);
  event.staff = who; event.foulType = foulType; event.teamFoul = teamFoul;
  g.events.push(event);
  if (g.status == 'scheduled') g.status = 'live';
  return P({
    games: [g], live: foulType != 'personal' ? { running: false } : undefined,
    log: `Q${per(l.period)} ${fc(l.clock)} | ${ab(teamId)} ${who == 'coach' ? 'COACH' : 'ASSISTANT COACH'} ${staffLabel(teamId, who)} FOUL ${foulType.toUpperCase()}${teamFoul ? '' : ' (not a team foul)'}`,
  });
}

// Technical foul charged to a team (coach, bench or a player). It is not a player statistic.
// The game clock always stops for a technical foul, also in running time.
function technical(teamId, countsAsTeamFoul) {
  const g = CG();
  const event = evBase(teamId, 'tech', null);
  if (countsAsTeamFoul) event.teamFoul = true;
  g.events.push(event);
  if (g.status == 'scheduled') g.status = 'live';
  return P({
    games: [g], live: { running: false },
    log: `${logTime()} | ${ab(teamId)} TECHNICAL FOUL${countsAsTeamFoul ? ' (counts as team foul)' : ''}: clocks paused | tech ${techFouls(g, teamId)}`,
  });
}

function undo() {
  const g = CG();
  const event = g && g.events.pop();                 // remove the last recorded event
  if (!event) return;
  const live = { timeouts: LV().timeouts };
  if (event.type == 'sub') {                         // put the lineup back as it was
    const on = g.active[event.teamId];
    if (event.playerId && event.outId) g.active[event.teamId] = on.map(id => id == event.playerId ? event.outId : id);
    else if (event.playerId) g.active[event.teamId] = on.filter(id => id != event.playerId);
    else if (event.outId) on.push(event.outId);
  }
  if (event.type == 'timeout') { live.timeouts[event.teamId]++; live.toKind = null; live.toTeam = null; live.toLeft = 0; }
  P({ games: [g], live, log: `UNDO ${event.type} ${event.pts || ''} by ${PL(event.playerId).last || ab(event.teamId)}` });
}

/* ================= GAME: starting players =================
   At the start of the game and of every period the scorekeeper must choose the active players (5 per team). */
const needLineup = g => !!g && g.status != 'final' && g.lineupPeriod !== LV().period;
function checkLineup() {
  const g = CG();
  if (needLineup(g) && !$('#lineup').length) lineupModal();
}

function lineupModal() {
  const g0 = CG(), l = LV();
  const teams = sheetSides(g0);
  const stats = st(g0.events);
  const pool = t => teamPlayers(t).filter(p => (stats[p.id]?.pf || 0) < 5).sort((x, y) => byNumber(x.number, y.number));   // fouled-out players cannot play
  const need = t => Math.min(5, pool(t).length);
  const chosen = {};
  teams.forEach(t => { chosen[t] = new Set(g0.active[t].filter(id => pool(t).some(p => p.id == id))); });   // start from the current lineup

  const win = popup('lineup', false);                // cannot be closed until confirmed
  function draw() {
    const columns = teams.map(t => `<div class="lcol" style="border-top:4px solid ${col(t)}">
        <h3 style="color:${col(t)}">${E(T(t).name)} <small>${chosen[t].size}/${need(t)} selected</small></h3>
        <div class="pl2">${pool(t).map(p => `<button class="pk ${chosen[t].has(p.id) ? 'sel' : ''}" data-t="${t}" data-id="${p.id}">
            ${numBadge(p)}<span class="pn">${E(nm(p))}</span></button>`).join('') || '<small>No players on this team</small>'}</div>
        <button class="lclear" data-t="${t}">Clear selection</button></div>`).join('');
    const ready = teams.every(t => chosen[t].size == need(t));
    win.body.html(`<h3 class="ptitle">Select the active players · ${l.period > 1 || g0.lineupPeriod ? 'period ' + per(l.period) : 'start of game'}</h3>
      <div class="two">${columns}</div>
      <div class="pfoot"><button class="b go" id="lnOk" ${ready ? '' : 'disabled'}>Confirm players &amp; continue</button></div>`);
  }
  win.el.on('click', '.pk', function () {
    const t = +$(this).data('t'), id = +$(this).data('id');
    if (chosen[t].has(id)) chosen[t].delete(id);
    else if (chosen[t].size < 5) chosen[t].add(id);
    draw();
  });
  win.el.on('click', '.lclear', function () { chosen[+$(this).data('t')].clear(); draw(); });
  win.el.on('click', '#lnOk', async function () {
    const g = CG();
    teams.forEach(t => {
      g.active[t] = [...chosen[t]];
      chosen[t].forEach(id => { if (!g.played.includes(id)) g.played.push(id); });
    });
    g.lineupPeriod = LV().period;
    if (g.status == 'scheduled') g.status = 'live';
    win.close();
    await P({ games: [g], log: `LINEUP period ${per(LV().period)}: ` + teams.map(t => `${ab(t)} ${[...chosen[t]].map(id => '#' + PL(id).number).join(',')}`).join(' | ') });
  });
  draw();
}

/* ================= GAME: substitution window =================
   Works like "select the starting players": one column per team with ALL its players. Players on court show a green tick
   (✓ ON), players on the bench are gray. Tap an active player to take him OFF, tap a bench player to put him ON (max 5 per team).
   Nothing is saved until you press "Confirm substitution"; ✕ cancels. On confirm the players going out and coming in are paired
   into substitution events (so Undo and the event log work as before). */
async function subModal() {
  if (!CG()) return;
  if (rtActive(CG(), LV())) await P({ log: `${logTime()} | SUBSTITUTION pressed: RUNNING TIME - clocks keep running` });
  else await P({ live: { running: false }, log: `${logTime()} | SUBSTITUTION pressed: clocks paused` });

  const g0 = CG(), teams = sheetSides(g0), stats = st(g0.events);
  const start = {}, chosen = {};
  teams.forEach(t => { start[t] = new Set(g0.active[t]); chosen[t] = new Set(g0.active[t]); });
  const pool = t => DB.players.filter(p => p.teamId == t && (!p.archived || start[t].has(p.id))).sort((x, y) => byNumber(x.number, y.number));
  const fouledOut = p => (stats[p.id]?.pf || 0) >= 5;
  let typed = '';

  const win = popup('subwin', true);
  win.body.html(`<h3 class="ptitle">Substitution <small>tap an active player to take him off · tap a bench player to put him on (max 5) · confirm when finished</small></h3>
    <input id="sn" placeholder="Type a number to find a player (both teams)…" autocomplete="off" inputmode="numeric">
    <div id="sl"></div>
    <div class="pfoot"><span id="sw" class="hint"></span><button class="b" id="subCancel">Cancel</button><button class="b go" id="subOk">Confirm substitution</button></div>`);

  const diff = t => ({ out: [...start[t]].filter(id => !chosen[t].has(id)), inn: [...chosen[t]].filter(id => !start[t].has(id)) });
  function draw() {
    let changes = 0; const warn = [];
    $('#sl').html(`<div class="two">${teams.map(t => {
      const d = diff(t); changes += d.out.length + d.inn.length;
      if (chosen[t].size < Math.min(5, pool(t).filter(p => !fouledOut(p)).length)) warn.push(`${ab(t)} has only ${chosen[t].size} on court`);
      const btn = p => {
        const on = chosen[t].has(p.id), was = start[t].has(p.id), blocked = !on && (fouledOut(p) || chosen[t].size >= 5);
        const tag = on ? (was ? '✓ ON' : '✓ IN') : (was ? 'OFF' : fouledOut(p) ? '5 FOULS' : 'BENCH');
        return `<button class="pk sb ${on ? 'sel-on' : 'benchp'} ${on != was ? 'chg' : ''}" data-t="${t}" data-id="${p.id}" ${blocked ? 'disabled' : ''}>
          ${numBadge(p)}<span class="pn">${E(nm(p))}</span><span class="stt">${tag}</span></button>`;
      };
      const shown = pool(t).filter(p => String(p.number).startsWith(typed));
      return `<div class="lcol" style="border-top:4px solid ${col(t)}">
        <h3 style="color:${col(t)}">${E(T(t).name)} <small>${chosen[t].size}/5 on court${d.out.length + d.inn.length ? ` · ${d.out.length + d.inn.length} change(s)` : ''}</small></h3>
        <div class="pl2">${shown.map(btn).join('') || '<small>No match</small>'}</div>
        <button class="lclear" data-t="${t}">Clear selection</button></div>`;
    }).join('')}</div>`);
    $('#subOk').prop('disabled', !changes).text(changes ? `Confirm substitution (${changes})` : 'Confirm substitution');
    $('#sw').text(warn.length ? '⚠ ' + warn.join(' · ') : '');
  }

  win.el.on('input', '#sn', function () { typed = $(this).val().trim(); draw(); });
  win.el.on('click', '.pk', function () {
    const t = +$(this).data('t'), id = +$(this).data('id');
    if (chosen[t].has(id)) chosen[t].delete(id);
    else if (chosen[t].size < 5) chosen[t].add(id);
    draw();
  });
  win.el.on('click', '.lclear', function () { chosen[+$(this).data('t')].clear(); draw(); });
  win.el.on('click', '#subCancel', () => { win.close(); route(); });
  win.el.on('click', '.x', () => route());
  win.el.on('click', '#subOk', async () => {
    const g = CG(), l = LV(), lines = [];
    teams.forEach(t => {
      const d = diff(t), pairs = Math.min(d.out.length, d.inn.length);
      d.out.forEach((outId, i) => { const e = evBase(t, 'sub', d.inn[i] || null); e.outId = outId; g.events.push(e); });            // out + in = one swap
      d.inn.slice(pairs).forEach(inId => { const e = evBase(t, 'sub', inId); e.outId = null; g.events.push(e); });                // extra players coming in
      let list = [...g.active[t]];                                                                                                   // keep players in their court slots
      d.out.forEach((outId, i) => { list = d.inn[i] ? list.map(x => x == outId ? d.inn[i] : x) : list.filter(x => x != outId); });
      g.active[t] = list.concat(d.inn.slice(pairs));
      d.inn.forEach(id => { if (!g.played.includes(id)) g.played.push(id); });
      if (d.out.length || d.inn.length) lines.push(`${ab(t)} out ${d.out.map(id => '#' + PL(id).number).join(',') || '-'} / in ${d.inn.map(id => '#' + PL(id).number).join(',') || '-'}`);
    });
    win.close();
    await P({ games: [g], log: `Q${per(l.period)} ${fc(l.clock)} | SUBSTITUTION ${lines.join(' | ') || 'no change'}` });
  });
  draw();
  $('#sn').focus();
}

/* ================= GAME: timeouts and breaks ================= */
// secs: the length of the timeout. Default = the "default timeout length" of the game settings gear (30 seconds unless changed). Uses up one of the team's timeouts.
function timeout(teamId, secs = (LV().timeoutSecs || 30)) {
  const l = LV(), g = CG(), left = l.timeouts[teamId] || 0;
  if (!left) return alert('No timeouts left');
  if (l.toKind) return alert('A timeout or break is already running');
  l.timeouts[teamId] = left - 1;
  const event = evBase(teamId, 'timeout', null);
  event.secs = secs;
  g.events.push(event);
  return P({
    games: [g],
    live: { timeouts: l.timeouts, running: false, toKind: 'timeout', toTeam: teamId, toLeft: secs * 1000, toSuspended: false, buzzLeft: BUZZ_MS },
    log: `${logTime()} | ${ab(teamId)} TIMEOUT ${secText(secs)} (${left - 1} left)`,
  });
}

// Break: choose 1, 2, 15 minutes or a custom number of minutes
function breakModal(start = startBreak, busy = () => !!LV().toKind, ready = () => !!CG()) {   // the custom scoreboard passes its own start / busy / ready
  if (!ready()) return;
  if (busy()) return alert('A timeout or break is already running');
  const win = popup('brkwin', true);
  win.body.html(`<h3 class="ptitle">Break — how many minutes?</h3>
    <div class="row">${[1, 2, 15].map(m => `<button class="b p" data-m="${m}">${m} min</button>`).join('')}
      <span class="sp"></span><input id="bm" type="number" min="1" max="120" step="0.5" placeholder="custom minutes" style="width:160px">
      <button class="b o" id="bgo">Start custom</button></div>`);
  win.el.on('click', '[data-m]', function () { win.close(); start(+$(this).data('m')); });
  win.el.on('click', '#bgo', () => {
    const m = parseFloat($('#bm').val());
    if (!(m > 0)) return alert('Enter the number of minutes');
    win.close();
    start(m);
  });
}
const startBreak = minutes => L(
  { running: false, toKind: 'break', toTeam: null, toLeft: Math.round(minutes * 60000), toSuspended: false },
  `${logTime()} | BREAK started: ${minutes} min`);

// Suspend / resume a running timeout or break (the countdown stops while suspended)
const suspendPause = () => LV().toKind && L({ toSuspended: !LV().toSuspended }, `${LV().toKind} ${LV().toSuspended ? 'resumed' : 'suspended'}`);
// End a running timeout or break now (the buzzer sounds)
const endPause = () => LV().toKind && L({ toKind: null, toTeam: null, toLeft: 0, toSuspended: false, buzzLeft: BUZZ_MS }, `${LV().toKind} ended early`);

/* ================= TIMEKEEPER: possession, periods, clocks ================= */
const possess = teamId => L({ arrow: teamId }, `Possession: ${ab(teamId)}`);

// Move to the next (direction 1) or previous (-1) period. FIBA timeouts: 2 in 1st half, 3 in 2nd half, 1 per overtime.
// The new period asks for the active players (see needLineup).
function nextP(direction = 1) {
  const l = LV(), g = CG();
  const period = Math.max(1, l.period + direction);
  const length = period > 4 ? 300000 : l.periodLen;      // overtime = 5 minutes
  const timeouts = { ...l.timeouts };
  [g.home, g.away].forEach(t => {
    if (period == 1) timeouts[t] = 2;
    if (period == 3) timeouts[t] = 3;
    if (period > 4) timeouts[t] = 1;
  });
  L({ period, clock: length, running: false, shot: 24000, timeouts }, `Period set to ${per(period)}`);
}

/* ---------- Swap the left/right placement of the teams (scoreboard; the scoresheet/controls show the opposite order) ---------- */
const swapSides = () => L({ swap: !LV().swap }, 'Team sides swapped on the scoreboard');

/* ---------- Running time (see rtActive in state.js) ---------- */
// field: 'runningTime' (on / off for the game) or 'rtLast2' (FIBA stop-time in the last 2:00 of Q4 and overtime)
function setRT(id, field, on) {
  const g = G(id);
  if (!g) return;
  g[field] = !!on;
  P({ games: [g], log: field == 'runningTime'
    ? `Game ${id}: RUNNING TIME ${on ? 'ON (clock keeps running through fouls and substitutions)' : 'OFF (stop time)'}`
    : `Game ${id}: stop-time in the last 2:00 of Q4 / OT (FIBA) ${on ? 'ON' : 'OFF'}` });
}

/* ---------- Pop-up to change the game clock and the shot clock (scoresheet). Same functions as /controls. ---------- */
function clockModal() {
  if (!CG()) return;
  const win = popup('clkwin', true);
  const adj = [[-60, '−1:00'], [-10, '−10s'], [-1, '−1s'], [1, '+1s'], [10, '+10s'], [60, '+1:00']];
  const small = 'style="width:84px"';
  win.body.html(`<h3 class="ptitle">Game clock &amp; shot clock <small>changes apply at once · the window stays open until you press Done</small></h3>
    <div class="two">
      <div class="lcol"><h3>Game clock</h3><div class="bigv" id="cwg"></div>
        <div class="row">${adj.map(([sec, t]) => `<button class="b k" data-c="${sec}">${t}</button>`).join('')}</div>
        <div class="row">Set to <input id="cmm" ${small} type="number" min="0" placeholder="min"> : <input id="css" ${small} type="number" min="0" max="59" placeholder="sec">
          <button class="b k" id="cwSet">Set</button></div>
        <div class="row"><button class="b" id="cwPp"></button></div>
      </div>
      <div class="lcol"><h3>Shot clock</h3><div class="bigv" id="cws"></div>
        <div class="row"><button class="b k" data-s24="1">24</button><button class="b k" data-s14="1">14</button>
          ${[-1, 1].map(n => `<button class="b k" data-sc="${n}">${n > 0 ? '+' : '−'}1s</button>`).join('')}
          <button class="b k" id="cwSon"></button></div>
        <div class="row">Set to <input id="csv" ${small} type="number" min="0" max="24" placeholder="sec"> <button class="b k" id="cwSset">Set</button></div>
      </div>
    </div>
    <div class="pfoot"><button class="b go" id="cwDone">Done</button></div>`);

  const upd = () => {                                    // refresh the numbers (not the input boxes)
    const l = LV();
    $('#cwg').text(fc(l.clock));
    $('#cws').text(l.shotOn ? Math.ceil(l.shot / 1000) : 'OFF');
    $('#cwSon').text(l.shotOn ? 'Shot clock off' : 'Shot clock on');
    $('#cwPp').text(l.running ? '⏸ Pause' : '▶ Play').toggleClass('stop', l.running).toggleClass('go', !l.running);
  };
  const q = (live, text) => quiet({ live, log: text }).then(upd);
  const timer = setInterval(() => { if ($('#clkwin').length) upd(); else clearInterval(timer); }, 200);

  win.el.on('click', '[data-c]', function () { const sec = +$(this).data('c'); quiet({ liveAdd: { clock: sec * 1000 }, log: `Game clock adjusted ${sec}s` }).then(upd); });
  win.el.on('click', '#cwSet', () => {
    const m = parseInt($('#cmm').val() || '0', 10), sec = parseInt($('#css').val() || '0', 10);
    if (isNaN(m) || isNaN(sec) || m < 0 || sec < 0) return alert('Enter minutes and seconds');
    q({ clock: (m * 60 + sec) * 1000 }, 'Game clock set manually');
  });
  win.el.on('click', '#cwPp', () => q({ running: !LV().running }, 'Game clock ' + (LV().running ? 'paused' : 'started')));
  win.el.on('click', '[data-s24]', () => q({ shot: 24000, shotOn: true }, 'Shot clock reset 24'));
  win.el.on('click', '[data-s14]', () => q({ shot: 14000, shotOn: true }, 'Shot clock set to 14'));
  win.el.on('click', '[data-sc]', function () { const sec = +$(this).data('sc'); quiet({ liveAdd: { shot: sec * 1000 }, log: `Shot clock adjusted ${sec}s` }).then(upd); });
  win.el.on('click', '#cwSon', () => q({ shotOn: !LV().shotOn }, 'Shot clock toggled'));
  win.el.on('click', '#cwSset', () => {
    const sec = parseFloat($('#csv').val());
    if (isNaN(sec) || sec < 0 || sec > 24) return alert('Enter 0 to 24 seconds');
    q({ shot: Math.round(sec * 1000) }, 'Shot clock set manually');
  });
  win.el.on('click', '#cwDone', () => { win.close(); route(); });
  upd();
}

/* ---------- Controls page ---------- */
const setClk = () => L({ clock: (+V('mm') * 60 + +V('ss')) * 1000 }, 'Game clock set manually');
const adjC = seconds => P({ liveAdd: { clock: seconds * 1000 }, log: `Game clock adjusted ${seconds}s` });
const adjS = seconds => P({ liveAdd: { shot: seconds * 1000 }, log: `Shot clock adjusted ${seconds}s` });

function adjScore(teamId, delta) {
  const g = CG();
  g.adj[teamId] = (g.adj[teamId] || 0) + delta;
  P({ games: [g], log: `Manual score adjust ${ab(teamId)} ${delta > 0 ? '+' : ''}${delta} | score ${lbl(g)}` });
}

// Make a game the live one (shown on /scoreboard and /scoresheet). The scorekeeper then chooses the starting players.
function goLive(id) {
  const g = G(id), l = LV();
  g.status = 'live';
  g.lineupPeriod = 0;
  const timeouts = {};
  timeouts[g.home] = timeouts[g.away] = 2;
  P({
    games: [g],
    live: { gameId: id, period: 1, clock: l.periodLen, running: false, shot: 24000, arrow: null, timeouts, names: {}, toKind: null, toTeam: null, toLeft: 0 },
    log: `Game #${id} set live: ${ab(g.home)} vs ${ab(g.away)}`,
  });
}

// Mark a game as the DEFAULT game (a second press removes the mark). Only one game is the default; it becomes the live game
// whenever no game is live (see useDefaultGame in server.js).
function setDefaultGame(id) {
  const target = G(id), flag = !target.isDefault;
  const changed = DB.games.filter(g => g.id != id && g.isDefault).map(g => ({ ...g, isDefault: false }));
  P({ games: [...changed, { ...target, isDefault: flag }], log: `Game ${id} ${flag ? 'marked as the DEFAULT game' : 'is no longer the default game'}` });
}

/* ---------- Game page: editing a game afterwards ---------- */
function setSt(id, status) {
  const g = G(id);
  g.status = status;
  P({ games: [g], log: `Game ${id} status ${status}` });
}

function saveWhen(id) {                               // change the date and time of a game
  const g = G(id);
  g.date = V('ed');
  g.time = V('et');
  g.competition = V('ec').trim() || 'BCBL';
  g.place = V('ep').trim();
  P({ games: [g], log: `Game ${id} date/time/competition/place set to ${g.date} ${g.time} ${g.competition} ${g.place}` });
}

function addEv(id) {                                  // add a missing event by hand (the "+ Add event" row of the event log)
  const g = G(id), p = PL(V('ap')), kind = V('at');   // kind: 'pts1' | 'pts2' | 'pts3' | 'reb' | ...
  if (!p.id) return alert('Choose a player');
  const clock = V('aclk').trim() ? parseClock(V('aclk')) : LV().clock;
  if (clock === null) return alert('Clock must look like 7:45 or 9.4');
  const event = evBase(p.teamId, kind.startsWith('pts') ? 'pts' : kind, p.id);
  event.period = +V('aper') || LV().period;
  event.clock = clock;
  if (kind.startsWith('pts')) event.pts = +kind[3];
  g.events.push(event);                                // newest event = top of the log
  P({ games: [g], log: `EDIT game ${id}: added ${kind} for ${nm(p)} (${per(event.period)} ${fc(clock)})` });
}
function evP(id, eventId, playerId) {                 // give an event to a different player
  const g = G(id);
  g.events.find(e => e.id == eventId).playerId = +playerId;
  P({ games: [g], log: `EDIT game ${id}: event reassigned to ${nm(PL(playerId))}` });
}

// Clock text -> milliseconds: "7:45", "0:09", or seconds with tenths "9.4". null if it cannot be read.
function parseClock(text) {
  const t = String(text).trim();
  if (!t) return null;
  let sec;
  if (t.includes(':')) { const [m, s] = t.split(':'); sec = parseInt(m, 10) * 60 + parseFloat(s); }
  else sec = parseFloat(t);
  return isNaN(sec) || sec < 0 ? null : Math.round(sec * 1000);
}

function evClk(id, eventId, text) {                    // change the clock time of an event
  const ms = parseClock(text);
  if (ms === null) { alert('Clock must look like 7:45 or 9.4'); return route(); }
  const g = G(id), e = g.events.find(x => x.id == eventId);
  e.clock = ms;
  P({ games: [g], log: `EDIT game ${id}: event clock set to ${fc(ms)}` });
}

function evPer(id, eventId, period) {                  // change the period of an event
  const g = G(id);
  g.events.find(e => e.id == eventId).period = +period;
  P({ games: [g], log: `EDIT game ${id}: event period set to ${per(+period)}` });
}

function evT(id, eventId, kind) {                      // change the type: 'pts1' | 'pts2' | 'pts3' | 'reb' | 'ast' | 'stl' | 'blk' | 'to' | 'foul'
  const g = G(id), e = g.events.find(x => x.id == eventId);
  if (kind.startsWith('pts')) { e.type = 'pts'; e.pts = +kind[3]; }
  else { e.type = kind; delete e.pts; }
  P({ games: [g], log: `EDIT game ${id}: event type set to ${kind}` });
}

function evD(id, eventId) {                           // delete an event
  const g = G(id);
  g.events = g.events.filter(e => e.id != eventId);
  P({ games: [g], log: `EDIT game ${id}: event deleted` });
}

/* ---------- Teams and players: add, save, archive, delete ---------- */
function addP(teamId) {                               // add a player to a team (the number is TEXT: 9, 09, 0, 00 differ)
  const number = V('pnum').trim();
  if (!number) return alert('Enter a jersey number');
  if (DB.players.some(p => p.teamId == teamId && String(p.number) === number)) return alert('Number already used in this team');
  P({ players: [{ teamId, first: V('pf'), last: V('pls'), nick: V('pk'), number, locale: V('ploc'), photo: '', archived: false }], log: `Player added to ${ab(teamId)}` });
}

function savePlayer(id) {                             // save the player profile form
  const number = V('pnum').trim(), teamId = +V('ptm');
  if (!number) return alert('Enter a jersey number');
  if (DB.players.some(p => p.id != id && p.teamId == teamId && String(p.number) === number)) return alert('Number already used in this team');
  P({ players: [{ ...PL(id), first: V('pf'), last: V('pls'), nick: V('pk'), number, locale: V('ploc'), teamId, photo: pendingPhoto || PL(id).photo }], log: `Player ${id} updated` });
}

// Remove a player's picture (the initials are shown again). Name, stats and everything else stay as they are.
function removePhoto(id) {
  const p = PL(id);
  if (!confirm(`Remove the picture of ${fullName(p)}?`)) return;
  P({ players: [{ ...p, photo: '' }], log: `Player ${nm(p)} picture removed` });
}

// Identity verified checkbox (player page). Saved at once; the server records the date and time of the tick (see stampVerified in server.js).
function setVerified(id, flag) {
  const p = PL(id);
  if (!flag && !confirm(`Remove the identity verification of ${fullName(p)}?`)) return route();     // route() puts the box back as it was
  P({ players: [{ ...p, verified: flag }], log: `Player ${nm(p)} identity ${flag ? 'verified' : 'verification removed'}` });
}

// Archive = hide from lists and from new games, but keep all history. Restore brings it back.
const archivePlayer = (id, flag) => P({ players: [{ ...PL(id), archived: flag }], log: `Player ${nm(PL(id))} ${flag ? 'archived' : 'restored'}` });
const archiveTeam = (id, flag) => P({ teams: [{ ...T(id), archived: flag }], log: `Team ${ab(id)} ${flag ? 'archived' : 'restored'}` });

function deletePlayer(id) {                           // delete = gone for good (old game events show "Removed player")
  const p = PL(id);
  if (!confirm(`Delete ${p.first} ${p.last}? This cannot be undone. (Archive keeps the history.)`)) return;
  P({ delPlayer: id, log: `Player ${nm(p)} deleted` }).then(() => go('/players'));
}

function deleteTeam(id) {                             // delete a team with its players (and its games, after a typed confirmation)
  const t = T(id), games = DB.games.filter(g => g.home == id || g.away == id).length, n = teamPlayers(id, true).length;
  if (games) {
    const typed = prompt(`${t.name} has ${games} game(s) and ${n} player(s).\nDeleting removes the team, its players AND those games for good. Archive the team instead if you want to keep the history.\n\nTo delete, type the team name exactly:`);
    if (typed !== t.name) return;
  } else if (!confirm(`Delete ${t.name} and its ${n} player(s)? This cannot be undone.`)) return;
  P({ delTeam: id, log: `Team ${t.name} deleted (${n} players, ${games} games)` }).then(() => go('/teams'));
}
