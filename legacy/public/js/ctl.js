/* ctl.js - the operator panel shared by /controls (the live game) and /custom-controls (the manual custom scoreboard).
   Layout (follows the approved mockup, built for a landscape phone first, then laptop):
     left summary column | two team cards (points, FOUL, TIMEOUT, BALL + gear) | CLOCK card (+gear) | GAME card (+gear)
   ctlHtml(c) draws the panel ONCE; ctlUpdate(c) only changes numbers, labels and classes, so text you are typing is never lost.
   A "controller" c has view() (what to show) and the methods the buttons call: onclick="CTL.main.toggle()" / "CTL.custom.toggle()".
   Styles: css/controls.css */

const CTL = {};
const secText = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;      // 30 -> "0:30", 60 -> "1:00" 
const GEAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 2.2"/></svg>';
const FS_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>Full screen';
const FS_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>Exit full screen';

/* ---------- Full screen (button in the top menu on the two control pages) ---------- */
// Uses the browser's full screen when it exists; on an iPhone (no full screen for web pages) it hides the menu instead ("focus mode").
function ctlFullscreen() {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) return (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  if (el.requestFullscreen || el.webkitRequestFullscreen) return Promise.resolve((el.requestFullscreen || el.webkitRequestFullscreen).call(el)).catch(() => {});
  $('body').toggleClass('ctlfocus');
  ctlFsLabel();
}
function ctlFsLabel() {
  const full = !!(document.fullscreenElement || document.webkitFullscreenElement) || $('body').hasClass('ctlfocus');
  $('#fsbtn, .fsx').html(full ? FS_OFF : FS_ON).attr('aria-label', full ? 'Exit full screen' : 'Full screen');
}
$(document).on('fullscreenchange webkitfullscreenchange', ctlFsLabel);

/* ---------- Show only one group: All | Score | Clock | Game (remembered per device, separately for /controls and /custom-controls) ---------- */
function setCtlView(id, view) {
  localStorage['ctlView-' + id] = view;
  $('#ctl').attr('data-view', view);
  $('#ctl .vw button').each(function () { $(this).toggleClass('on', $(this).data('v') == view); });
}

/* ---------- The panel ---------- */
function ctlHtml(c) {
  const v = c.view(), id = c.id;
  const call = (fn, ...args) => `CTL.${id}.${fn}(${args.map(x => typeof x == 'number' ? x : `'${x}'`).join(',')})`;   // numbers stay numbers
  const target = c.custom ? 'custom' : 'live';

  const teamCard = t => `<section class="pn tm" style="--c:${t.color}">
      <div class="hd"><span class="tnw"><span class="tnm" data-nm="${t.k}"></span><small class="tfull" data-full="${t.k}"></small></span><span class="sc" data-score="${t.k}">0</span>
        <button class="gear" aria-label="Team adjustments" onclick="${call('gearTeam', t.k)}">${GEAR_SVG}</button></div>
      <div class="g g3">
        ${[1, 2, 3].map(n => `<button class="pt" title="Shortcut: press ${n}" onclick="${call('score', t.k, n)}">+${n}<kbd class="sk">${n}</kbd></button>`).join('')}
        <button class="bfoul big" title="Shortcut: press F" onclick="${call('foul', t.k)}">FOUL<kbd class="sk">F</kbd><small><span data-gf="${t.k}">0</span> in game</small></button>
        <button class="bto big" data-toh="${id}:${t.k}" title="Tap: start the default timeout. Hold: choose another length." oncontextmenu="return false">TIMEOUT<small><span data-to="${t.k}">0</span> left · <span data-tod>0:30</span></small></button>
        <button class="bl big" data-arrow="${t.k}" onclick="${call('arrow', t.k)}">BALL<small data-ball="${t.k}">tap to give</small></button>
      </div></section>`;

  const sideTeam = t => `<div class="tm2" style="--c:${t.color}"><div class="tnw"><b data-nm="${t.k}" style="white-space:nowrap"></b><small class="tfull" data-full="${t.k}"></small></div><span data-score="${t.k}">0</span>
      <em>FOULS <i data-gf="${t.k}">0</i> &middot; TIMEOUTS <i data-to="${t.k}">0</i></em></div>`;

  const view = localStorage['ctlView-' + id] || 'all';
  const tabs = [['all', 'All'], ['score', 'Score'], ['clock', 'Clock'], ['game', 'Game']]
    .map(([k, t]) => `<button class="${k == view ? 'on' : ''}" data-v="${k}" onclick="setCtlView('${id}','${k}')">${t}</button>`).join('');

  return `<div class="ctl" id="ctl" data-view="${view}">
    <aside class="sd" aria-label="Live summary">
      <div class="vw" role="group" aria-label="Show">${tabs}</div>
      <span class="t">PERIOD <b data-period>1</b></span>
      <span class="st" id="cstat"></span>
      <div class="tmr brkbox" id="cpz" style="padding:.15em .2em"><small id="cpzl" style="max-width:100%;white-space:normal;overflow-wrap:anywhere;text-align:center;line-height:1.15">BREAK</small><span class="gm" id="cpzt" style="font-size:1.7em">0:00</span></div>
      <div class="tmr"><small>GAME</small><span class="gm" id="sgv">0:00</span></div>
      <div class="tmr"><small>SHOT</small><span class="sh2" id="ssv">24</span></div>
      ${v.teams.map(sideTeam).join('')}
      <span class="bp" id="cbp"></span>
    </aside>
    <div class="mn">
      <div class="teams grp-score">${v.teams.map(teamCard).join('')}</div>
      <div class="bot">
        <section class="pn grp-clock"><div class="hd"><span class="t">CLOCK</span><span class="fill"></span>
          <button class="gear" aria-label="Clock settings" onclick="${call('gearClock')}">${GEAR_SVG}</button></div>
          <div class="g clkg">
            <button id="cgb" data-haptic class="big gamebtn" onclick="${call('toggle')}"><span class="lbl"></span></button>
            <button id="cshb" data-haptic class="big shotbtn" onclick="${call('shotToggle')}"><span class="lbl"></span></button>
            <button class="s24" data-haptic onclick="${call('shot', 24)}">+24</button><button class="s24" data-haptic onclick="${call('shot', 14)}">+14</button>
          </div></section>
        <section class="pn grp-game"><div class="hd"><span class="t">GAME</span><span class="fill"></span>
          <button class="gear" aria-label="Game settings" onclick="${call('gearGame')}">${GEAR_SVG}</button></div>
          <div class="g g3">
            <button class="big" onclick="${call('prev')}">&#9666; PREV</button>
            <div class="pd"><small>PERIOD</small><span data-period>1</span></div>
            <button class="big" onclick="${call('next')}">NEXT &#9656;</button>
            <button class="brk big" id="cbrk" onclick="${call('brk')}"><span class="lbl">BREAK</span></button>
            <button class="bz big" title="Hold to sound" oncontextmenu="return false" onpointerdown="buzzStart('${target}')" onpointerup="buzzStop()" onpointerleave="buzzStop()">BUZZER<small>HOLD</small></button>
            <button class="bz2 big" onclick="buzzLong('${target}')">LONG<small>BUZZER</small></button>
          </div></section>
      </div>
    </div>
  </div>`;
}

// Change only what is shown (numbers, labels, classes). Safe to call many times per second.
function ctlUpdate(c) {
  if (!$('#ctl').length) return;
  const v = c.view();
  $('#sgv').text(fc(v.clock));
  $('#ssv').text(v.shotOn ? Math.ceil(v.shot / 1000) : 'OFF').toggleClass('held', v.shotHold && v.shotOn);
  $('[data-period]').text(per(v.period));
  $('#cstat').text(v.running ? '● RUNNING' : '■ STOPPED').toggleClass('on', v.running).toggle(!v.pause);
  $('#cpz').toggle(!!v.pause);
  if (v.pause) { $('#cpzl').text(v.pause.label + (v.pause.suspended ? ' (SUSPENDED)' : '')); $('#cpzt').text(v.pause.time); }
  $('#cbrk .lbl').html(v.pause ? `END ${v.pause.isBreak ? 'BREAK' : 'TIMEOUT'}<small>${v.pause.time} LEFT</small>` : 'BREAK');

  // Game clock: PAUSE (red) while running, START (green) when stopped
  $('#cgb .lbl').html(`${v.running ? 'PAUSE' : 'START'}<small>GAME ${fc(v.clock)}</small>`);
  $('#cgb').toggleClass('stop', v.running).toggleClass('go', !v.running);
  // Shot clock: red PAUSE = counting; green START = paused by you; blue READY = waiting for the game clock (auto-paused)
  const shotRun = v.running && !v.shotHold && v.shotOn, shotTxt = v.shotOn ? Math.ceil(v.shot / 1000) : 'OFF';
  $('#cshb .lbl').html(shotRun ? `PAUSE<small>SHOT ${shotTxt}</small>` : v.shotHold ? `START<small>SHOT ${shotTxt} · PAUSED</small>` : `READY<small>SHOT ${shotTxt} · WITH GAME CLOCK</small>`);
  $('#cshb').toggleClass('stop', shotRun).toggleClass('go', !shotRun && v.shotHold).toggleClass('idle', !shotRun && !v.shotHold);

  v.teams.forEach(t => {
    $(`[data-nm="${t.k}"]`).text(t.name); $(`[data-full="${t.k}"]`).text(t.full); $(`[data-score="${t.k}"]`).text(t.score);
    $(`[data-gf="${t.k}"]`).text(t.gf); $(`[data-to="${t.k}"]`).text(t.timeouts);
    $(`[data-arrow="${t.k}"]`).toggleClass('on', t.arrow);
    $(`[data-ball="${t.k}"]`).text(t.arrow ? 'POSSESSION' : 'tap to give');
  });
  $('[data-tod]').text(secText(v.timeoutSecs));
  const holder = v.teams.find(t => t.arrow);
  $('#cbp').text('BALL: ' + (holder ? holder.name : '—'));
  if (CTL.gearRefresh && $('#gearwin').length) CTL.gearRefresh(c);
}

/* ---------- Pop-ups: timeout length, and the three gears (they stay open and show live values) ---------- */
function ctlSheet(title, caption, html) {
  const win = popup('gearwin');
  win.el.find('.bx').removeClass('wide').addClass('mid2');
  win.body.html(`<h3 class="ptitle">${title}${caption ? ` <small>${caption}</small>` : ''}</h3>${html}<div class="pfoot"><button class="b go" id="gdone">Done</button></div>`);
  win.el.on('click', '#gdone', () => { win.close(); CTL.gearRefresh = null; });
  win.el.find('.x').on('click', () => { CTL.gearRefresh = null; });
  return win;
}
const pmRow = (label, valId, key) => `<div class="grow"><span>${label} <b id="${valId}">0</b></span><div class="g2"><button class="b bred" data-a="${key}" data-d="-1">&minus;</button><button class="b dn" data-a="${key}" data-d="1">+</button></div></div>`;

/* A "controller" gets these shared pop-ups through ctlTimeoutPicker(c, k), ctlTeamGear(c, k), ctlClockGear(c), ctlGameGear(c) */
function ctlTimeoutPicker(c, k) {
  const v = c.view(), t = v.teams.find(x => String(x.k) == String(k));
  if (!t.timeouts) return alert('No timeouts left');
  if (v.pause) return alert('A timeout or break is already running');
  const win = popup('topick');
  win.el.find('.bx').removeClass('wide').addClass('mid2');
  win.body.html(`<h3 class="ptitle">Timeout · <span style="color:${t.color}">${E(t.name)}</span> <small>${t.timeouts} left · choose the length</small></h3>
    <div class="g2"><button class="b tob" data-s="60">1:00</button><button class="b tob" data-s="30">0:30</button></div>
    <div class="grow"><span>Custom time</span><div class="in"><input id="tom" type="number" min="0" placeholder="min"><b>:</b><input id="tos" type="number" min="0" max="59" placeholder="sec"><button class="b tob" id="tocu">Start</button></div></div>
    <div class="pfoot"><button class="b" id="tocx">Cancel</button></div>`);
  win.el.on('click', '[data-s]', function () { win.close(); c.to(k, +$(this).data('s')); });
  win.el.on('click', '#tocu', () => {
    const s = (parseInt($('#tom').val() || '0', 10)) * 60 + (parseInt($('#tos').val() || '0', 10));
    if (!(s > 0)) return alert('Enter the timeout length (minutes and seconds)');
    win.close(); c.to(k, s);
  });
  win.el.on('click', '#tocx', () => win.close());
}

function ctlTeamGear(c, k) {
  const t0 = c.view().teams.find(x => String(x.k) == String(k));
  const win = ctlSheet(`<span style="color:${t0.color}">${E(t0.name)}</span>`, 'custom controls: add or deduct',
    `<div class="grow"><span>Points <b id="gpv">0</b></span><div class="g6">${[-3, -2, -1, 1, 2, 3].map(d => `<button class="b ${d < 0 ? 'bred' : 'dn'}" data-a="score" data-d="${d}">${d < 0 ? '&minus;' : '+'}${Math.abs(d)}</button>`).join('')}</div></div>`
    + pmRow('Game fouls', 'gfv', 'foulAdj') + pmRow('Timeouts left', 'gtv', 'toAdd'));
  win.el.on('click', '[data-a]', function () { c[$(this).data('a')](k, +$(this).data('d')); });
  CTL.gearRefresh = cc => { const t = cc.view().teams.find(x => String(x.k) == String(k)); $('#gpv').text(t.score); $('#gfv').text(t.gf); $('#gtv').text(t.timeouts); };
  CTL.gearRefresh(c);
}

function ctlClockGear(c, extra = '') {                  // extra: more rows (the scoresheet adds running time, break and buzzer settings)
  const adj = [[-60, '−1:00'], [-10, '−10s'], [-1, '−1s'], [1, '+1s'], [10, '+10s'], [60, '+1:00']];
  const win = ctlSheet('Clock settings', 'set the clocks or add / deduct time',
    `<div class="grow"><span>Game clock <b id="gcv">0:00</b></span><div class="g6">${adj.map(([s, t]) => `<button class="b" data-g="${s}">${t}</button>`).join('')}</div>
        <div class="in"><input id="mm" type="number" min="0" placeholder="min"><b>:</b><input id="ss" type="number" min="0" placeholder="sec"><button class="b" id="gset">Set</button></div></div>
     <div class="grow"><span>Shot clock <b id="gsv">24</b></span><div class="g3s"><button class="b" data-sc="-1">&minus;1s</button><button class="b" data-sc="1">+1s</button><button class="b" id="gshon"></button></div>
        <div class="in"><input id="sv" type="number" min="0" max="24" placeholder="sec (0-24)"><button class="b" id="gsset">Set</button></div></div>${extra}`);
  win.el.on('click', '[data-gg]', function () { c[$(this).data('gg')](); });
  win.el.on('change', '#gbuz', function () { localStorage.buzzHere = this.checked ? 1 : 0; Buzzer.unlock(); });
  win.el.on('click', '[data-g]', function () { c.adjC(+$(this).data('g')); });
  win.el.on('click', '[data-sc]', function () { c.adjS(+$(this).data('sc')); });
  win.el.on('click', '#gset', () => c.setClk());
  win.el.on('click', '#gsset', () => c.setShot());
  win.el.on('click', '#gshon', () => c.shotOnOff());
  CTL.gearRefresh = cc => {
    const v = cc.view(); $('#gcv').text(fc(v.clock)); $('#gsv').text(v.shotOn ? Math.ceil(v.shot / 1000) : 'OFF'); $('#gshon').text(v.shotOn ? 'Hide' : 'Show');
    $('#gsus').text(v.suspended ? 'Resume' : 'Suspend').prop('disabled', !v.pause); $('#gend').prop('disabled', !v.pause);
  };
  CTL.gearRefresh(c);
  return win;
}

function ctlGameGear(c) {
  const win = ctlSheet('Game settings', c.custom ? 'custom scoreboard' : 'live game', c.gameGearHtml());
  win.el.on('click', '[data-gg]', function () { c[$(this).data('gg')](); });
  win.el.on('change', '#gbuz', function () { localStorage.buzzHere = this.checked ? 1 : 0; Buzzer.unlock(); });
  CTL.gearRefresh = cc => { const v = cc.view(); $('#gsus').text(v.suspended ? 'Resume' : 'Suspend').prop('disabled', !v.pause); $('#gend').prop('disabled', !v.pause); if (cc.gearSync) cc.gearSync(); };
  CTL.gearRefresh(c);
}

// Shared pieces of the game gear sheet
const gearBreakRows = () => `<div class="grow"><span>Break / timeout running</span><div class="g3s"><button class="b" id="gsus" data-gg="suspend">Suspend</button><button class="b" id="gend" data-gg="end">End</button><button class="b" data-gg="swap">Swap sides</button></div></div>`;
const gearBuzzRow = () => `<label class="gsw"><input type="checkbox" id="gbuz" ${localStorage.buzzHere == '1' ? 'checked' : ''}> play the buzzer sound on this device too</label>`;
const gearPeriodRow = len => `<div class="grow"><span>Period length (min)</span><div class="in"><input id="pl" type="number" min="1" value="${len}"><button class="b" data-gg="periodLen">Save</button></div></div>`;

const gearTimeoutRow = secs => `<div class="grow"><span>Default timeout length (seconds). Tap TIMEOUT to start it; hold TIMEOUT to pick another length.</span><div class="in"><input id="tol" type="number" min="5" max="600" value="${secs}"><button class="b" data-gg="timeoutLen">Save</button></div></div>`;

// TIMEOUT button: a tap starts the default length, holding it (about half a second) opens the length chooser
let tohTimer = null, tohFired = false;
$(document).on('pointerdown', '[data-toh]', function () {
  tohFired = false;
  const el = this;
  clearTimeout(tohTimer);
  tohTimer = setTimeout(() => { tohFired = true; const [cid, k] = String($(el).data('toh')).split(':'); ctlTimeoutPicker(CTL[cid], k); }, 550);
});
$(document).on('pointerup pointerleave pointercancel', '[data-toh]', () => clearTimeout(tohTimer));
$(document).on('click', '[data-toh]', function () {
  if (tohFired) { tohFired = false; return; }                // this click is the end of a long press
  const [cid, k] = String($(this).data('toh')).split(':');
  CTL[cid].toStart(k);
});

/* =============== Controller: the LIVE game (/controls) =============== */
CTL.main = {
  id: 'main', custom: false,
  view() {
    const l = LV(), g = CG();
    return {
      period: l.period, clock: l.clock, shot: l.shot, shotOn: l.shotOn, shotHold: !!l.shotHold, running: l.running, suspended: l.toSuspended,
      timeoutSecs: l.timeoutSecs || 30,
      pause: l.toKind ? { isBreak: l.toKind == 'break', label: l.toKind == 'break' ? 'BREAK' : 'TIMEOUT ' + (l.names[l.toTeam] || ab(l.toTeam)).slice(0, 7), time: toText(l), suspended: l.toSuspended } : null,
      teams: sheetSides(g).map(t => ({ k: t, name: l.names[t] || ab(t), full: T(t).name || '', color: col(t), score: sc(g, t), timeouts: l.timeouts[t] || 0, gf: gameFouls(g, t), arrow: l.arrow == t })),
    };
  },
  set(live, text) { return quiet({ live, log: text }).then(() => ctlUpdate(this)); },

  // --- team ---
  score(k, d) {                                          // points typed in here are a manual score correction (no player)
    const g = CG();
    g.adj[k] = (g.adj[k] || 0) + d;
    return quiet({ games: [g], log: `Controls: score ${ab(+k)} ${d > 0 ? '+' : ''}${d} | score ${lbl(g)}` }).then(() => ctlUpdate(this));
  },
  foul(k) { return this.foulAdj(k, 1); },
  foulAdj(k, d) {                                        // a team foul is an event without a player; − removes the latest one of those
    const g = CG();
    if (d > 0) g.events.push(evBase(+k, 'foul', null));
    else {
      const i = g.events.map(e => e.type == 'foul' && !e.playerId && !e.staff && e.teamId == k).lastIndexOf(true);
      if (i < 0) return alert('No team foul without a player to remove. Fouls charged to a player are changed in the game\'s event log.');
      g.events.splice(i, 1);
    }
    return quiet({ games: [g], log: `Controls: team foul ${ab(+k)} ${d > 0 ? '+1' : '-1'}` }).then(() => ctlUpdate(this));
  },
  toPick(k) { ctlTimeoutPicker(this, k); },
  toStart(k) { timeout(+k, this.view().timeoutSecs); },                  // tap on TIMEOUT: the default length (game settings gear)
  to(k, secs) { timeout(+k, secs); },
  timeoutLen() {
    const n = parseInt(V('tol'), 10);
    if (!(n >= 5 && n <= 600)) return alert('Enter 5 to 600 seconds');
    return this.set({ timeoutSecs: n }, `Default timeout length set to ${n}s`);
  },
  toAdd(k, d) { return this.set({ timeouts: { ...LV().timeouts, [k]: Math.max(0, (LV().timeouts[k] || 0) + d) } }, `Timeouts ${ab(+k)} ${d > 0 ? '+' : ''}${d}`); },
  arrow(k) { return this.set({ arrow: LV().arrow == k ? null : +k }, `Possession: ${LV().arrow == k ? 'cleared' : ab(+k)}`); },
  gearTeam(k) { ctlTeamGear(this, k); },

  // --- clocks: the shot clock only runs while the game clock runs (server), so pausing the game clock pauses it too.
  //     Pausing the shot clock (shotHold) never stops the game clock. ---
  toggle() { haptic(); return this.set({ running: !LV().running }, 'Game clock ' + (LV().running ? 'paused' : 'started')); },
  shotToggle() { haptic(); return this.set({ shotHold: !LV().shotHold }, 'Shot clock ' + (LV().shotHold ? 'started' : 'paused')); },
  shot(n) { haptic(); return this.set({ shot: n * 1000, shotOn: true }, `Shot clock set to ${n}`); },               // +24 / +14 always set exactly 24 / 14, whatever the clock showed (the operator decides)
  adjC(s) { return quiet({ liveAdd: { clock: s * 1000 }, log: `Game clock adjusted ${s}s` }).then(() => ctlUpdate(this)); },       // relative: applied on the server, so the clock never jumps back
  adjS(s) { return quiet({ liveAdd: { shot: s * 1000 }, log: `Shot clock adjusted ${s}s` }).then(() => ctlUpdate(this)); },
  shotOnOff() { return this.set({ shotOn: !LV().shotOn }, 'Shot clock ' + (LV().shotOn ? 'hidden' : 'shown')); },
  setClk() {
    const m = parseInt(V('mm') || '0', 10), s = parseFloat(V('ss') || '0');
    if (isNaN(m) || isNaN(s) || m < 0 || s < 0) return alert('Enter minutes and seconds');
    return this.set({ clock: Math.round((m * 60 + s) * 1000) }, 'Game clock set manually');
  },
  setShot() {
    const s = parseFloat(V('sv'));
    if (isNaN(s) || s < 0 || s > 24) return alert('Enter 0 to 24 seconds');
    return this.set({ shot: Math.round(s * 1000) }, 'Shot clock set manually');
  },
  gearClock() { ctlClockGear(this); },

  // --- game ---
  prev() { nextP(-1); }, next() { nextP(1); },
  brk() { if (LV().toKind) return endPause(); breakModal(); },          // while a break / timeout runs this button ends it
  suspend() { suspendPause(); }, end() { endPause(); }, swap() { swapSides(); },
  periodLen() { return this.set({ periodLen: Math.round(parseFloat(V('pl')) * 60000) }, 'Period length changed'); },
  names() {
    const g = CG(), names = { ...LV().names }, teams = [];
    sheetSides(g).forEach(t => {
      names[t] = (V('gn' + t).trim() || ab(t)).slice(0, 10);
      if (V('gc' + t).toLowerCase() != colRaw(t).toLowerCase()) teams.push({ ...T(t), color: V('gc' + t) });
    });
    return P({ live: { names }, teams, log: 'Team names / colors set' });
  },
  newGame() { go('/games'); },                           // games are created and chosen on the Games page
  gearGame() { ctlGameGear(this); },
  gameGearHtml() {
    const g = CG(), l = LV();
    return `<button class="b dn" data-gg="newGame">New game · choose or add on the Games page</button>
      <div class="grow"><label class="gsw"><input type="checkbox" id="grt" ${g.runningTime ? 'checked' : ''} onchange="setRT(${g.id},'runningTime',this.checked)"> <b>Running time</b> <small>clock keeps running through fouls and substitutions</small></label>
        <label class="gsw sub"><input type="checkbox" id="grt2" ${g.rtLast2 !== false ? 'checked' : ''} onchange="setRT(${g.id},'rtLast2',this.checked)"> FIBA stop-time in the last 2:00 of Q4 / overtime</label></div>
      <div class="grow"><span>Team names (scoreboard, max 10) &amp; colors</span>${sheetSides(g).map(t =>
        `<div class="in"><input id="gn${t}" maxlength="10" value="${E(l.names[t] || ab(t))}" aria-label="Name"><input class="cc" type="color" id="gc${t}" value="${colRaw(t)}" aria-label="Color"></div>`).join('')}
        <button class="b" data-gg="names">Apply names &amp; colors</button></div>
      ${gearTimeoutRow(l.timeoutSecs || 30)}${gearPeriodRow(l.periodLen / 60000)}${gearBreakRows()}${gearBuzzRow()}`;
  },
};

/* =============== Controller: the CUSTOM scoreboard (/custom-controls) ===============
   Everything lives in db.custom (server.js). It has its own clocks, scores, fouls, timeouts, arrow and buzzer, so it never changes the live game. */
CTL.custom = {
  id: 'custom', custom: true,
  view() {
    const c = CU();
    return {
      period: c.period, clock: c.clock, shot: c.shot, shotOn: c.shotOn, shotHold: !!c.shotHold, running: c.running, suspended: c.toSuspended,
      timeoutSecs: c.timeoutSecs || 30,
      pause: c.toKind ? { isBreak: c.toKind == 'break', label: c.toKind == 'break' ? 'BREAK' : 'TIMEOUT ' + (c.toTeam ? c[c.toTeam].name : '').slice(0, 7), time: toText(c), suspended: c.toSuspended } : null,
      teams: customSheet(c).map(k => ({ k, name: c[k].name, full: c[k].full || '', color: readable(c[k].color), score: c[k].score, timeouts: c[k].timeouts, gf: c[k].fouls, arrow: c.arrow == k })),
    };
  },
  set(patch, text) { return quiet({ custom: patch, log: 'CUSTOM: ' + text }).then(() => ctlUpdate(this)); },

  score(k, d) { return this.set({ [k]: { score: Math.max(0, CU()[k].score + d) } }, `${CU()[k].name} ${d > 0 ? '+' : ''}${d} | ${CU().a.score}-${CU().b.score}`); },
  foul(k) { return this.foulAdj(k, 1); },
  foulAdj(k, d) { return this.set({ [k]: { fouls: Math.max(0, CU()[k].fouls + d) } }, `${CU()[k].name} fouls ${d > 0 ? '+' : ''}${d}`); },
  toPick(k) { ctlTimeoutPicker(this, k); },
  toStart(k) { this.to(k, this.view().timeoutSecs); },
  timeoutLen() {
    const n = parseInt(V('tol'), 10);
    if (!(n >= 5 && n <= 600)) return alert('Enter 5 to 600 seconds');
    return this.set({ timeoutSecs: n }, `default timeout length set to ${n}s`);
  },
  to(k, secs) {
    const c = CU();
    if (!c[k].timeouts) return alert('No timeouts left');
    if (c.toKind) return alert('A timeout or break is already running');
    return this.set({ running: false, toKind: 'timeout', toTeam: k, toLeft: secs * 1000, toSuspended: false, buzzLeft: BUZZ_MS, [k]: { timeouts: c[k].timeouts - 1 } }, `${c[k].name} timeout ${secs == 60 ? '1:00' : secs + 's'}`);
  },
  toAdd(k, d) { return this.set({ [k]: { timeouts: Math.max(0, CU()[k].timeouts + d) } }, `${CU()[k].name} timeouts ${d > 0 ? '+' : ''}${d}`); },
  arrow(k) { return this.set({ arrow: CU().arrow == k ? null : k }, `possession: ${CU().arrow == k ? 'cleared' : CU()[k].name}`); },
  gearTeam(k) { ctlTeamGear(this, k); },

  toggle() { haptic(); return this.set({ running: !CU().running }, 'game clock ' + (CU().running ? 'paused' : 'started')); },
  shotToggle() { haptic(); return this.set({ shotHold: !CU().shotHold }, 'shot clock ' + (CU().shotHold ? 'started' : 'paused')); },
  shot(n) { haptic(); return this.set({ shot: n * 1000, shotOn: true }, `shot clock set to ${n}`); },
  adjC(s) { return quiet({ customAdd: { clock: s * 1000 }, log: `CUSTOM: game clock adjusted ${s}s` }).then(() => ctlUpdate(this)); },
  adjS(s) { return quiet({ customAdd: { shot: s * 1000 }, log: `CUSTOM: shot clock adjusted ${s}s` }).then(() => ctlUpdate(this)); },
  shotOnOff() { return this.set({ shotOn: !CU().shotOn }, 'shot clock ' + (CU().shotOn ? 'hidden' : 'shown')); },
  setClk() {
    const m = parseInt(V('mm') || '0', 10), s = parseFloat(V('ss') || '0');
    if (isNaN(m) || isNaN(s) || m < 0 || s < 0) return alert('Enter minutes and seconds');
    return this.set({ clock: Math.round((m * 60 + s) * 1000) }, 'game clock set manually');
  },
  setShot() {
    const s = parseFloat(V('sv'));
    if (isNaN(s) || s < 0 || s > 24) return alert('Enter 0 to 24 seconds');
    return this.set({ shot: Math.round(s * 1000) }, 'shot clock set manually');
  },
  gearClock() { ctlClockGear(this); },

  // Period change: FIBA timeouts (2 in 1st half, 3 in 2nd half, 1 per overtime) and period fouls reset (overtime keeps the 4th-quarter fouls)
  step(d) {
    const c = CU(), period = Math.max(1, c.period + d);
    const patch = { period, clock: period > 4 ? 300000 : c.periodLen, running: false, shot: 24000 };
    ['a', 'b'].forEach(k => {
      patch[k] = {};
      if (period <= 4) patch[k].fouls = 0;
      if (period == 1) patch[k].timeouts = 2;
      if (period == 3) patch[k].timeouts = 3;
      if (period > 4) patch[k].timeouts = 1;
    });
    return this.set(patch, `period set to ${per(period)}`);
  },
  prev() { this.step(-1); }, next() { this.step(1); },
  brk() {
    if (CU().toKind) return this.end();                  // while a break / timeout runs this button ends it
    breakModal(m => this.set({ running: false, toKind: 'break', toTeam: null, toLeft: Math.round(m * 60000), toSuspended: false }, `break started: ${m} min`), () => !!CU().toKind, () => true);
  },
  suspend() { if (CU().toKind) this.set({ toSuspended: !CU().toSuspended }, `${CU().toKind} ${CU().toSuspended ? 'resumed' : 'suspended'}`); },
  end() { if (CU().toKind) this.set({ toKind: null, toTeam: null, toLeft: 0, toSuspended: false, buzzLeft: BUZZ_MS }, `${CU().toKind} ended early`); },
  swap() { return quiet({ custom: { swap: !CU().swap }, log: 'CUSTOM: sides swapped' }).then(route); },
  periodLen() { return this.set({ periodLen: Math.round(parseFloat(V('pl')) * 60000) }, 'period length changed'); },
  names() {
    const patch = {};
    ['a', 'b'].forEach(k => { patch[k] = { name: (V('gn' + k).trim() || CU()[k].name).slice(0, 10).toUpperCase(), full: V('gf' + k).trim().slice(0, 28), color: V('gc' + k) }; });
    return quiet({ custom: patch, log: 'CUSTOM: team names / colors set' }).then(route);
  },
  newGame() {                                            // scores, fouls, timeouts, period, clocks and arrow back to the start (names and colors stay)
    if (!confirm('Start a new custom game? Scores, fouls, timeouts, period and clocks are reset.')) return;
    const c = CU();
    return quiet({ custom: { period: 1, clock: c.periodLen, running: false, shot: 24000, shotOn: true, shotHold: false, arrow: null, toKind: null, toTeam: null, toLeft: 0, toSuspended: false,
      a: { score: 0, fouls: 0, timeouts: 2 }, b: { score: 0, fouls: 0, timeouts: 2 } }, log: 'CUSTOM: new game (reset)' }).then(route);
  },
  gearGame() { ctlGameGear(this); },
  gameGearHtml() {
    const c = CU();
    return `<button class="b bred" data-gg="newGame">New game (reset scores, fouls, timeouts, clocks)</button>
      <div class="grow"><span>Team names, full names &amp; colors</span>${customSheet(c).map(k =>
        `<div class="in"><input id="gn${k}" maxlength="10" value="${E(c[k].name)}" aria-label="Name"><input id="gf${k}" maxlength="28" value="${E(c[k].full)}" aria-label="Full name" placeholder="Full name"><input class="cc" type="color" id="gc${k}" value="${c[k].color}" aria-label="Color"></div>`).join('')}
        <button class="b" data-gg="names">Apply names &amp; colors</button></div>
      ${gearTimeoutRow(c.timeoutSecs || 30)}${gearPeriodRow(c.periodLen / 60000)}${gearBreakRows()}${gearBuzzRow()}
      <small><a href="/custom-scoreboard" target="_blank">Open the custom scoreboard ↗</a> · independent of the live game, players and statistics.</small>`;
  },
};


/* ---------- Keyboard shortcuts:  1 = +1,  2 = +2,  3 = +3,  F = FOUL ----------
   Scoresheet: the same as clicking the button: the player list opens with the cursor in the number box (Tab, arrows and Enter: see pickPlayers in ui.js).
   Controls and Custom Controls: these buttons belong to a team, so a small chooser asks "which team?" first (Tab or the arrows move, Enter confirms, Esc cancels).
   Shortcuts are ignored while you type in a box or while a window is open. */
const KEY_ACTIONS = { '1': ['pts', 1], '2': ['pts', 2], '3': ['pts', 3], f: ['foul', 0] };
let keyLock = false;
$(document).on('keydown', e => {
  if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || keyLock) return;
  const tag = e.target.tagName;
  if (tag == 'INPUT' || tag == 'TEXTAREA' || tag == 'SELECT' || e.target.isContentEditable || $('.md').length) return;
  const act = KEY_ACTIONS[String(e.key).toLowerCase()];
  if (!act) return;
  const page = currentPage;
  if (page == 'scoresheet' && CG()) { e.preventDefault(); keyLock = true; setTimeout(() => (keyLock = false), 350); act[0] == 'pts' ? add('pts', act[1]) : add('foul'); }   // the list opens after a short round trip: ignore a second key meanwhile
  else if (page == 'controls' && CG()) { e.preventDefault(); ctlTeamKey(CTL.main, act); }
  else if (page == 'custom-controls') { e.preventDefault(); ctlTeamKey(CTL.custom, act); }
});

function ctlTeamKey(c, [kind, n]) {
  const teams = c.view().teams, label = kind == 'pts' ? '+' + n : 'FOUL';
  const win = popup('keyteam');
  win.el.find('.bx').removeClass('wide').addClass('mid2');
  win.body.html(`<h3 class="ptitle">${label} <small>which team? Tab or ← → to choose, Enter to confirm, Esc to cancel</small></h3>
    <div class="g2">${teams.map(t => `<button class="b kt" data-k="${t.k}" style="background:${t.color};color:${ink(t.color)}">${E(t.name)}</button>`).join('')}</div>`);
  const btns = win.el.find('.kt').toArray();
  btns[0].focus();
  win.el.on('click', '.kt', function () { const k = $(this).data('k'); win.close(); kind == 'pts' ? c.score(k, n) : c.foul(k); });
  win.el.on('keydown', e => {
    if (e.key == 'Escape') return win.close();
    if (['Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const dir = e.key == 'ArrowLeft' || (e.key == 'Tab' && e.shiftKey) ? -1 : 1;
      btns[(btns.indexOf(document.activeElement) + dir + btns.length) % btns.length].focus();
    }
  });
}
