/* pages/scoresheet.js - /scoresheet: the scorekeeping screen (follows the approved mockup).
     Top strip      scores, period fouls (BONUS), timeouts, game clock and shot clock - large, readable from across the table
     SCORE CONTROLS +1 +2 +3 FOUL (large) and REB AST STL BLK TO (smaller)                         gear: technical / team foul / score correction
     GAME CONTROLS  Substitutes, Possession                                                          gear: starting players, names and colors, period
     TIMEKEEPING    game clock and shot clock Pause/Start, +24, +14, Timeouts, Break, Buzzers       gear: set clocks, running time, buzzer sound
     Rosters        both teams, sortable, active players first
     Event log      at the right, newest first; the pencil edits an event in a dialog, the bin asks before deleting it
   The tabs show one group only (remembered on this device). Teams are in OPERATOR order = the opposite of the scoreboard (sheetSides in state.js).
   Most buttons call the same controller as the Controls page (CTL.main in ctl.js) so both pages always behave the same. Styles: css/scoresheet.css */

// Tabs: All | Score | Game | Timekeeping. Remembered on this device.
function setSheetView(view) {
  localStorage.sheetView = view;
  $('#sheet').attr('data-view', view);
  $('.sh-tab').each(function () { $(this).toggleClass('on', $(this).data('v') == view); });
}

const slogUi = { team: '' };                                   // event log filter: '' = both teams, else a team id
const shBtn = (cls, label, onclick, extra = '') => `<button class="${cls}" ${extra} onclick="${onclick}">${label}</button>`;

/* ---------- Top strip ---------- */
function sumHtml() {
  const g = CG(), l = LV(), [left, right] = sheetSides(g);
  const team = (t, rightSide) => {
    const f = tf(g, t, l.period), to = l.timeouts[t] || 0, gf = gameFouls(g, t), tech = techFouls(g, t);
    const info = `<div><b class="sh-tn" style="color:${col(t)}">${teamLabel(l, t)}</b><small class="sh-full">${E(T(t).name || '')}</small>
        <div class="sh-chips"${rightSide ? ' style="justify-content:flex-end"' : ''}>
          <span class="sh-chip ${f >= 5 ? 'bonus' : ''}">FOULS<strong>${f}</strong>${f >= 5 ? '<em>BONUS</em>' : ''}</span>
          <span class="sh-chip">TIMEOUTS<strong>${to}</strong></span></div>
        <small class="sh-sub">Game fouls ${gf} · Technical ${tech}${l.arrow == t ? ' · <b class="sh-pos">● POSSESSION</b>' : ''}</small></div>`;
    const score = `<span class="sh-num">${sc(g, t)}</span>`;
    return `<div class="sh-tb" style="--c:${col(t)}">${rightSide ? score + `<div style="text-align:right">${info}</div>` : info + score}</div>`;
  };
  const shot = (!l.shotOn || l.clock < l.shot) ? '--' : Math.ceil(l.shot / 1000);
  return `${team(left, false)}
    <div class="sh-ck"><small>PERIOD ${per(l.period)} · ${l.running ? '<span class="sh-run">● RUNNING</span>' : '■ STOPPED'}</small>
      <span class="sh-gc">${fc(l.clock)}</span><span class="sh-sc"><small>SHOT</small>${shot}</span>
      ${g.runningTime ? `<small class="sh-rt ${rtActive(g, l) ? '' : 'off'}">${rtActive(g, l) ? '⏱ RUNNING TIME' : '⏱ STOP TIME (last 2:00)'}</small>` : ''}
      ${l.toKind ? `<small class="sh-pz">${E(pauseText(l))}</small>` : ''}</div>
    ${team(right, true)}`;
}

/* ---------- Timekeeping buttons: same look and states as the Controls page ---------- */
function tkUpdate() {
  if (!$('#sheet').length) return;
  const l = LV(), g = CG();
  $('#skg .lbl').html(`${l.running ? 'PAUSE' : 'START'}<small>GAME CLOCK ${fc(l.clock)}</small>`);
  $('#skg').toggleClass('sb-red', l.running).toggleClass('sb-green', !l.running);
  const shotRun = l.running && !l.shotHold && l.shotOn, shotTxt = l.shotOn ? Math.ceil(l.shot / 1000) : 'OFF';
  $('#sks .lbl').html(shotRun ? `PAUSE<small>SHOT CLOCK ${shotTxt}</small>` : l.shotHold ? `START<small>SHOT CLOCK ${shotTxt} · PAUSED</small>` : `READY<small>SHOT CLOCK ${shotTxt} · WITH GAME CLOCK</small>`);
  $('#sks').toggleClass('sb-red', shotRun).toggleClass('sb-green', !shotRun && l.shotHold).toggleClass('sb-dark', !shotRun && !l.shotHold);
  sheetSides(g).forEach(t => $(`[data-skto="${t}"]`).text(`${l.timeouts[t] || 0} left · ${secText(l.timeoutSecs || 30)}`));
  $('#skbrk .lbl').html(l.toKind ? `END ${l.toKind == 'break' ? 'BREAK' : 'TIMEOUT'}<small>${toText(l)} LEFT${l.toSuspended ? ' · SUSPENDED' : ''}</small>` : 'BREAK');
  $('[data-pos]').each(function () { $(this).toggleClass('sh-on', l.arrow == $(this).data('pos')); });
}

/* ---------- Event log (right side) ---------- */
function slogRowsHtml(g) {
  const evs = g.events.slice().reverse().filter(e => !slogUi.team || e.teamId == slogUi.team);
  let prev = null;
  const rows = evs.map(e => {
    const p = PL(e.playerId), kind = evKind(e);
    let who, type, cls = 'st';
    if (e.type == 'timeout') { who = 'Timeout' + (e.secs ? ' ' + secText(e.secs) : ''); type = 'T/O'; cls = 'to'; }
    else if (e.type == 'tech') { who = 'Technical foul'; type = 'TECH'; cls = 'foul'; }
    else if (e.type == 'sub') { who = `Sub: in ${PL(e.playerId).id ? '#' + PL(e.playerId).number : '-'}, out ${PL(e.outId).id ? '#' + PL(e.outId).number : '-'}`; type = 'SUB'; cls = 'sub'; }
    else if (e.type == 'foul' && e.staff) { who = (e.staff == 'coach' ? 'Coach: ' : 'Asst. coach: ') + staffLabel(e.teamId, e.staff); type = 'FOUL' + foulTag(e); cls = 'foul'; }
    else if (e.type == 'foul' && !e.playerId) { who = 'Team foul'; type = 'FOUL'; cls = 'foul'; }
    else { who = `#${p.number} ${nm(p)}`; type = e.type == 'pts' ? '+' + e.pts : e.type.toUpperCase() + foulTag(e); cls = e.type == 'pts' ? 'pts' : e.type == 'foul' ? 'foul' : 'st'; }
    const pb = prev !== null && prev != e.period ? ' sbk' : '';
    prev = e.period;
    return `<div class="sh-lrow${pb}" style="--c:${col(e.teamId)}"><span class="k">${per(e.period)} · ${fc(e.clock)}</span><span class="t">${E(ab(e.teamId))}</span>
      <span class="p" title="${E(who)}">${E(who)}</span><span class="y ${cls}">${E(type)}</span>
      <button class="sh-ib" aria-label="Edit event" onclick="evEdit(${g.id},${e.id})">${SH_PEN}</button>
      <button class="sh-ib d" aria-label="Delete event" onclick="evDel(${g.id},${e.id})">${SH_BIN}</button></div>`;
  }).join('');
  return rows || '<p class="sh-empty">No events yet.</p>';
}
const SH_PEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>';
const SH_BIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6"/></svg>';

function slogHtml(g) {
  const [a1, b1] = sheetSides(g);
  const tb = (val, label) => `<button class="${String(slogUi.team) == String(val) ? 'on' : ''}" data-t="${val}" onclick="slogSet('${val}')">${label}</button>`;
  return `<div class="sh-lh"><h4>Event log</h4><span>newest first</span><i></i><b>LIVE</b></div>
    <div class="sh-lf">${tb('', 'All')}${tb(a1, E(ab(a1)))}${tb(b1, E(ab(b1)))}</div>
    <div class="sh-ls" id="slist">${slogRowsHtml(g)}</div>`;
}
function slogSet(team) {                                       // filter: only the list is redrawn
  slogUi.team = team;
  $('.sh-lf button').each(function () { $(this).toggleClass('on', String($(this).data('t')) == String(team)); });
  drawLog(true);
}
function drawLog(force) {                                      // redraw only when something changed; keep the scroll position
  const g = CG(), el = $('#slist');
  if (!g || !el.length) return;
  const html = slogRowsHtml(g);
  if (!force && el.data('html') === html) return;
  const top = el.scrollTop();
  el.html(html).data('html', html).scrollTop(top);
}

/* ---------- Edit / delete dialogs ---------- */
function evEdit(gid, eid) {
  const g = G(gid), e = g.events.find(x => x.id == eid);
  if (!e) return;
  const kind = evKind(e), typeEditable = !!e.playerId && EV_TYPES.some(t => t[0] == kind);
  const roster = DB.players.filter(p => p.teamId == e.teamId && (!p.archived || p.id == e.playerId)).sort((x, y) => byNumber(x.number, y.number));
  const periods = [...new Set([1, 2, 3, 4, e.period, LV().period])].sort((x, y) => x - y);
  const win = popup('evdlg');
  win.el.find('.bx').removeClass('wide').addClass('dlg2');
  win.body.html(`<h3 class="ptitle">Edit event <small><span style="color:${col(e.teamId)}">${E(T(e.teamId).name)}</span> · saved when you press Save</small></h3>
    <div class="dfg">
      ${fs('Period', 'id="edp"', opt(periods.map(x => [x, per(x)]), e.period))}
      ${fi('Clock (e.g. 7:45)', `id="edc" value="${fc(e.clock)}"`)}
      ${typeEditable ? `<div class="w">${fs('Player', 'id="edpl"', roster.map(p => `<option value="${p.id}" ${p.id == e.playerId ? 'selected' : ''}>#${E(p.number)} ${E(nm(p))}</option>`).join(''))}</div>
      <div class="w">${fs('Type', 'id="edt"', opt(EV_TYPES, kind))}</div>` : `<p class="w dhint">This kind of event (${E(e.type)}) can change its period and clock, or be deleted.</p>`}
    </div>
    <div class="dac"><button class="dtext danger" id="edd">Delete</button><i></i><button class="dtext" id="edx">Cancel</button><button class="dfill" id="eds">Save</button></div>`);
  win.el.on('click', '#edx', () => win.close());
  win.el.on('click', '#edd', () => { win.close(); evDel(gid, eid); });
  win.el.on('click', '#eds', () => {
    const ms = parseClock(V('edc'));
    if (ms === null) return alert('Clock must look like 7:45 or 9.4');
    e.period = +V('edp'); e.clock = ms;
    if (typeEditable) {
      e.playerId = +V('edpl');
      const k = V('edt');
      if (k.startsWith('pts')) { e.type = 'pts'; e.pts = +k[3]; } else { e.type = k; delete e.pts; }
    }
    win.close();
    P({ games: [g], log: `EDIT game ${gid}: event updated (${per(e.period)} ${fc(e.clock)} ${evKind(e)})` });
  });
}

function evDel(gid, eid) {
  const g = G(gid), e = g.events.find(x => x.id == eid);
  if (!e) return;
  const p = PL(e.playerId);
  const what = e.type == 'timeout' ? 'Timeout' : e.type == 'tech' ? 'Technical foul' : e.type == 'sub' ? 'Substitution' : (e.playerId ? `#${p.number} ${nm(p)} · ${e.type == 'pts' ? '+' + e.pts + ' points' : e.type.toUpperCase()}` : e.staff ? `${e.staff == 'coach' ? 'Coach' : 'Asst. coach'} ${staffLabel(e.teamId, e.staff)} · FOUL` : 'Team foul');
  const win = popup('evdlg');
  win.el.find('.bx').removeClass('wide').addClass('dlg2');
  win.body.html(`<h3 class="ptitle">Delete this event?</h3><p class="dhint">The score and statistics update at once.</p>
    <div class="devt" style="border-color:${col(e.teamId)}">${per(e.period)} · ${fc(e.clock)} · ${E(ab(e.teamId))}<small>${E(what)}</small></div>
    <div class="dac"><i></i><button class="dtext" id="edx">Cancel</button><button class="dfill dred" id="edy">Delete</button></div>`);
  win.el.on('click', '#edx', () => win.close());
  win.el.on('click', '#edy', () => { win.close(); evD(gid, eid); });
}

/* ---------- Gear sheets (custom functions) ---------- */
function scoreGear() {
  const g = CG(), teams = sheetSides(g);
  const win = ctlSheet('Score controls', 'custom functions',
    `<div class="grow"><span>Technical foul (no player needed)</span><div class="g2">${teams.map(t => `<button class="b bred" data-tech="${t}">${E(ab(t))}</button>`).join('')}</div>
        <label class="gsw sub"><input type="checkbox" id="gtc"> counts as a team foul (technical foul by a player)</label></div>
     <div class="grow"><span>Team foul without a player</span><div class="g2">${teams.map(t => `<button class="b" data-tf="${t}">${E(ab(t))} +1</button>`).join('')}</div></div>
     ${teams.map(t => `<div class="grow"><span>Manual score correction · ${E(ab(t))} <b data-gs="${t}">0</b></span><div class="g6">${[-3, -2, -1, 1, 2, 3].map(d => `<button class="b ${d < 0 ? 'bred' : 'dn'}" data-sc="${t}|${d}">${d < 0 ? '&minus;' : '+'}${Math.abs(d)}</button>`).join('')}</div></div>`).join('')}
     <label class="gsw"><input type="checkbox" id="gbench" ${localStorage.pickBench == '1' ? 'checked' : ''}> show bench players in the player list</label>`);
  win.el.on('click', '[data-tech]', function () { technical(+$(this).data('tech'), $('#gtc').prop('checked')); });
  win.el.on('click', '[data-tf]', function () { CTL.main.foulAdj(+$(this).data('tf'), 1); });
  win.el.on('click', '[data-sc]', function () { const [t, d] = String($(this).data('sc')).split('|'); CTL.main.score(+t, +d); });
  win.el.on('change', '#gbench', function () { localStorage.pickBench = this.checked ? '1' : '0'; });
  CTL.gearRefresh = () => teams.forEach(t => $(`[data-gs="${t}"]`).text(sc(CG(), t)));
  CTL.gearRefresh();
}

function gameGear() {
  const g = CG(), l = LV(), teams = sheetSides(g);
  const win = ctlSheet('Game controls', 'custom functions',
    `<div class="grow"><span>Starting players for this period</span><button class="b dm" data-gg="lineup">Choose starting players…</button></div>
     <div class="grow"><span>Team names (scoreboard, max 10) &amp; colors</span>${teams.map(t =>
       `<div class="in"><input id="gn${t}" maxlength="10" value="${E(l.names[t] || ab(t))}" aria-label="Name"><input class="cc" type="color" id="gc${t}" value="${colRaw(t)}" aria-label="Color"></div>`).join('')}
       <button class="b dm" data-gg="names">Apply names &amp; colors</button></div>
     <div class="grow"><span>Period</span><div class="g3s"><button class="b dm" data-gg="prev">&#9666; Prev</button><button class="b dm" data-gg="next">Next &#9656;</button><button class="b dm" data-gg="swap">Swap sides</button></div></div>
     ${gearTimeoutRow(l.timeoutSecs || 30)}
     ${gearPeriodRow(l.periodLen / 60000)}
     <button class="b bred" data-gg="newGame">New game… (Games page)</button>`);
  win.el.on('click', '[data-gg]', function () {
    const fn = $(this).data('gg');
    if (fn == 'lineup') { win.close(); CTL.gearRefresh = null; return lineupModal(); }
    CTL.main[fn]();
  });
}

function timeGear() {
  const g = CG();
  ctlClockGear(CTL.main, `
    <div class="grow"><label class="gsw"><input type="checkbox" ${g.runningTime ? 'checked' : ''} onchange="setRT(${g.id},'runningTime',this.checked)"> <b>Running time</b> <small>clock keeps running through fouls and substitutions</small></label>
      <label class="gsw sub"><input type="checkbox" ${g.rtLast2 !== false ? 'checked' : ''} onchange="setRT(${g.id},'rtLast2',this.checked)"> FIBA stop-time in the last 2:00 of Q4 / overtime (the clock also stops after a made 2 or 3)</label></div>
    <div class="grow"><span>Break / timeout running</span><div class="g3s"><button class="b" id="gsus" data-gg="suspend">Suspend</button><button class="b" id="gend" data-gg="end">End</button></div></div>
    ${gearBuzzRow()}`);
}

/* ---------- The page ---------- */
pages.scoresheet = function () {
  const g = CG(), l = LV();
  if (!g) return { bc: [['Scoresheet']], h: `<p>No live game. Set one in ${a('/games', 'Games')}.</p>` };
  let view = localStorage.sheetView || 'all';
  if (view == 'stats') view = 'score';                           // older saved value
  const teams = sheetSides(g);

  // Refresh the live parts every poll (parts are only replaced when something changed)
  tickHook = () => {
    setHtml('#sum', sumHtml());
    tkUpdate();
    drawRosters();
    drawLog();
    if (CTL.gearRefresh && $('#gearwin').length) CTL.gearRefresh(CTL.main);
  };

  const gear = (fn, label) => `<button class="sh-gear" aria-label="${label}" onclick="${fn}()">${GEAR_SVG}</button>`;
  // The big buttons also work from the keyboard: 1 = +1, 2 = +2, 3 = +3, F = FOUL (shortcut handler at the end of ctl.js); the key is shown on the button
  const bigs = [['pts', 1, '+1', 'sb-blue', '1'], ['pts', 2, '+2', 'sb-blue', '2'], ['pts', 3, '+3', 'sb-blue', '3'], ['foul', 0, 'FOUL', 'sb-red', 'F']]
    .map(([k, n, label, cls, key]) => shBtn(cls, `${label}<kbd class="sk">${key}</kbd>`, n ? `add('pts',${n})` : `add('${k}')`, `title="Shortcut: press ${key}"`)).join('');
  const smalls = [['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK'], ['to', 'TO']].map(([k, label]) => shBtn('sb-teal', label, `add('${k}')`)).join('');
  const tabs = [['all', 'All'], ['score', 'Score'], ['game', 'Game'], ['time', 'Timekeeping']]
    .map(([v, t]) => `<button class="sh-tab ${v == view ? 'on' : ''}" data-v="${v}" onclick="setSheetView('${v}')">${t}</button>`).join('');
  const pos = teams.map(t => shBtn('sb-dark', E(ab(t)), `possess(${t})`, `data-pos="${t}"`)).join('');
  const timeouts = teams.map(t => `<button class="sb-yellow" data-toh="main:${t}" title="Tap: start the default timeout. Hold: choose another length." oncontextmenu="return false">TIMEOUT ${E(ab(t))}<small data-skto="${t}">${l.timeouts[t] || 0} left · ${secText(l.timeoutSecs || 30)}</small></button>`).join('');

  return {
    bc: [['Scoresheet']],
    h: `<div class="shp">
      <div class="shl">
        <div class="sh-top">
          <button onclick="undo()">Undo last</button><button onclick="nextP()">Next period ▸</button><button onclick="swapSides()">Swap sides</button>
          <i></i><span>Show</span><div class="sh-seg">${tabs}</div>
        </div>
        <div class="sh-sum" id="sum">${sumHtml()}</div>

        <div id="sheet" data-view="${view}">
          <div class="sh-row2">
            <section class="sh-card grp-score"><div class="sh-hd"><h5>SCORE CONTROLS</h5><i></i>${gear('scoreGear', 'Score settings')}</div>
              <div class="sh-sc2"><div class="sh-bigs">${bigs}</div><div class="sh-smls">${smalls}</div></div></section>
            <section class="sh-card grp-game"><div class="sh-hd"><h5>GAME CONTROLS</h5><i></i>${gear('gameGear', 'Game settings')}</div>
              <div class="sh-gm"><button class="sb-dark sub" onclick="subModal()">Substitutes</button>
                <div class="sh-pos2">${pos}<button class="sb-mid" onclick="L({arrow:null},'Possession cleared')">Clear</button></div>
                <label>POSSESSION</label></div></section>
          </div>

          <section class="sh-card grp-time"><div class="sh-hd"><h5>TIMEKEEPING CONTROLS</h5><i></i>${gear('timeGear', 'Timekeeping settings')}</div>
            <div class="sh-tk1">
              <button id="skg" data-haptic class="sb-big" onclick="CTL.main.toggle()"><span class="lbl"></span></button>
              <button id="sks" data-haptic class="sb-big" onclick="CTL.main.shotToggle()"><span class="lbl"></span></button>
              <button class="sb-blue sb-big" data-haptic onclick="CTL.main.shot(24)">+24</button><button class="sb-blue sb-big" data-haptic onclick="CTL.main.shot(14)">+14</button>
            </div>
            <div class="sh-tk2">${timeouts}
              <button id="skbrk" class="sb-violet" onclick="CTL.main.brk()"><span class="lbl">BREAK</span></button>
              <button class="sb-brown" title="Hold to sound" oncontextmenu="return false" onpointerdown="buzzStart('live')" onpointerup="buzzStop()" onpointerleave="buzzStop()">BUZZER<small>HOLD</small></button>
              <button class="sb-brown2" onclick="buzzLong('live')">LONG BUZZER</button>
            </div></section>

          <div class="two grp-ros" id="ros">${teams.map(t => ros(g, t)).join('')}</div>
        </div>
      </div>
      <aside class="shg" id="slog" aria-label="Event log">${slogHtml(g)}</aside>
    </div>`,
    after: () => { drawRosters(true); drawLog(true); tkUpdate(); },
  };
};
