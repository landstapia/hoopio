/* components.js - widgets shared by several pages: the big scoreboard, the summary strip, roster tables */

const toText = l => {                          // timeout / break countdown as M:SS
  const s = Math.ceil(l.toLeft / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

// Shot clock as 7-segment text: two digits, or blank when switched off / longer than the game clock
const shotSeg = l => (!l.shotOn || l.clock < l.shot) ? '  ' : String(Math.ceil(l.shot / 1000)).padStart(2, ' ');

// Red timeout ticks: lit = still available (at least 3 slots shown)
const timeoutTicks = left =>
  Array.from({ length: Math.max(3, left) }, (_, i) => `<i class="tick ${i < left ? 'lit' : ''}"></i>`).join('');

// Possession arrow (a drawn shape, so it looks the same on every device). dir: 'left' | 'right'
const arrowSvg = (lit, dir) =>
  `<svg class="arw ${dir} ${lit ? 'lit' : ''}" viewBox="0 0 120 80"><polygon points="0,40 55,0 55,22 120,22 120,58 55,58 55,80"/></svg>`;

const teamLabel = (l, teamId) => E((l.names[teamId] || ab(teamId)).slice(0, 10));   // custom name or abbreviation (max 10)

// Text for a running timeout / break, e.g. "TIMEOUT LIONS 0:42 (suspended)"
const pauseText = l => l.toKind
  ? `${l.toKind == 'break' ? 'BREAK' : 'TIMEOUT ' + teamLabel(l, l.toTeam)} ${toText(l)}${l.toSuspended ? ' (suspended)' : ''}`
  : '';

/* ---------- The big scoreboard display. Styles: css/scoreboard.css ----------
   boardHtml(m) draws ANY scoreboard from a small description, so the live game (board) and the manual
   custom scoreboard (customBoard) look exactly the same.
   m = { idle, pause: {isBreak, name, color, suspended, time}, left/right: {name, full, color, score, fouls, timeouts},
         period, clock, shotText, arrowLeft, arrowRight } */
function boardHtml(m) {
  if (m.idle) return `<div class="board idle"><img class="lg" src="${BRAND.logo}" alt=""><div>${m.idle}</div></div>`;

  // A timeout or break: the scores stay visible, smaller, at the top; the countdown is large at the bottom
  if (m.pause) {
    const p = m.pause;
    const team = (s, right) => `<div class="pz-team${right ? ' r' : ''}">
        <div class="nm" style="color:${s.color}">${E(s.name)}</div>
        <div class="pts ${s.score >= 100 ? 'three' : ''}">${seg(s.score)}</div>
        <div class="pz-row"><span class="lb">FOULS</span>${seg(s.fouls)}<span class="lb">TIMEOUTS</span><span class="pz-tk">${timeoutTicks(s.timeouts)}</span></div>
      </div>`;
    return `<div class="board pzb">
      <div class="pz-top">
        ${team(m.left, false)}
        <div class="pz-mid">
          <div class="pr"><span class="lb">PERIOD</span>${m.period > 4 ? '<span class="ot">OT</span>' : ''}${seg(m.period > 4 ? m.period - 4 : m.period)}</div>
          <span class="lb">GAME CLOCK</span><div class="clk">${seg(fc(m.clock))}</div>
        </div>
        ${team(m.right, true)}
      </div>
      <div class="pz-bot">
        <div class="pz-kind" style="color:${p.isBreak ? '#f2a501' : p.color}">${p.isBreak ? 'BREAK' : 'TIMEOUT'}</div>
        <div class="pz-who" style="color:${p.isBreak ? '#f2a501' : p.color}">${p.isBreak ? 'INTERMISSION' : E(p.name)}</div>
        ${p.suspended ? '<div class="pz-sus">SUSPENDED</div>' : ''}
        <div class="pz-time">${seg(p.time)}</div>
      </div>
    </div>`;
  }

  const side = (s, right) => `<div class="team">
      <div class="tn">
        ${s.logo && right ? `<img class="tl" src="${E(s.logo)}" alt="">` : ''}
        <div class="tt">
          <div class="nm" style="color:${s.color}">${E(s.name)}</div>
          <div class="full">${E(s.full)}</div>
        </div>
        ${s.logo && !right ? `<img class="tl" src="${E(s.logo)}" alt="">` : ''}
      </div>
      <div class="pts ${s.score >= 100 ? 'three' : ''}">${seg(s.score)}</div>
      <div class="fl"><span class="lb">FOULS</span>${seg(s.fouls)}<span class="bn ${s.fouls >= 5 ? 'lit' : ''}">BONUS</span></div>
      <div class="to"><span class="lb">TIMEOUTS</span>${timeoutTicks(s.timeouts)}</div>
    </div>`;

  return `<div class="board">
    ${side(m.left, false)}
    <div class="center">
      <img class="lg" src="${BRAND.logo}" alt="">
      <div class="pr"><span class="lb">PERIOD</span>${m.period > 4 ? '<span class="ot">OT</span>' : ''}${seg(m.period > 4 ? m.period - 4 : m.period)}</div>
      <div class="clk">${seg(fc(m.clock))}</div>
      <div class="shot">${seg(m.shotText)}</div>
      <div class="arrows">${arrowSvg(m.arrowLeft, 'left')}<span class="lb">POSSESSION</span>${arrowSvg(m.arrowRight, 'right')}</div>
    </div>
    ${side(m.right, true)}
  </div>`;
}

// The live game scoreboard (/scoreboard)
function board() {
  const l = LV(), g = CG();
  if (!g) return boardHtml({ idle: 'NO LIVE GAME' });
  const team = t => ({ name: (l.names[t] || ab(t)).slice(0, 10), full: T(t).name, logo: T(t).photo || '', color: readable(colRaw(t), '#000000'), score: sc(g, t), fouls: tf(g, t, l.period), timeouts: l.timeouts[t] || 0 });
  const [left, right] = boardSides(g);
  return boardHtml({
    pause: l.toKind ? { isBreak: l.toKind == 'break', name: (l.names[l.toTeam] || ab(l.toTeam)).slice(0, 10), color: readable(colRaw(l.toTeam), '#000000'), suspended: l.toSuspended, time: toText(l) } : null,
    left: team(left), right: team(right), period: l.period, clock: l.clock, shotText: shotSeg(l),
    arrowLeft: l.arrow == left, arrowRight: l.arrow == right,
  });
}

// The custom (manual) scoreboard (/custom-scoreboard): everything comes from db.custom, nothing from the live game
function customBoard() {
  const c = DB.custom;
  const team = k => ({ name: c[k].name.slice(0, 10), full: c[k].full, color: readable(c[k].color, '#000000'), score: c[k].score, fouls: c[k].fouls, timeouts: c[k].timeouts });
  const [left, right] = customSides(c);
  return boardHtml({
    pause: c.toKind ? { isBreak: c.toKind == 'break', name: c.toTeam ? c[c.toTeam].name.slice(0, 10) : '', color: c.toTeam ? c[c.toTeam].color : '#f2a501', suspended: c.toSuspended, time: toText(c) } : null,
    left: team(left), right: team(right), period: c.period, clock: c.clock, shotText: shotSeg(c),
    arrowLeft: c.arrow == left, arrowRight: c.arrow == right,
  });
}

// Roster table of one team for the scoresheet: active players first, sortable (see datatable.js)
function ros(g, teamId) {
  const stats = st(g.events);
  const onCourt = g.active[teamId];
  const rows = DB.players
    .filter(p => p.teamId == teamId && (!p.archived || g.played.includes(p.id)))
    .map(p => ({ p, active: onCourt.includes(p.id), x: stats[p.id] || Z() }))
    .sort((u, v) => v.active - u.active || byNumber(u.p.number, v.p.number));

  // Sortable (click a column title): the sort is remembered while the scoresheet refreshes (data-dtkey, see datatable.js)
  const num = (v, html) => ({ h: html, s: v });
  const tableRows = rows.map(({ p, active, x }) => [
    num(active ? 1 : 0, active ? '<b class="on">● ACTIVE</b>' : '<span class="off">○ BENCH</span>'),
    E(p.number),
    num(nm(p), `<span class="pnm" title="${E(p.first + ' ' + p.last + (p.nick ? ' “' + p.nick + '”' : ''))}">${E(nm(p))}</span>`),
    ...KS.map(k => num(x[k], (k == 'pf' && x.pf >= 4) ? `<b class="warn">${x.pf}</b>` : (x[k] || '-'))),     // 4+ fouls in red, 0 as "-"
  ]);
  const table = `<div class="dt-wrap rwrap" style="overflow:auto"><table class="roster dt" data-dtkey="roster-${teamId}">
    <thead><tr>${['Status', '#', 'Player', ...KS.map(k => k.toUpperCase())].map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows.map(r => `<tr>${r.map(tdOf).join('')}</tr>`).join('')}</tbody></table></div>`;

  return `<div class="card" style="border-top:4px solid ${col(teamId)}">
    <h3 style="color:${col(teamId)}">${E(T(teamId).name)} <small>${onCourt.length}/5 on court</small></h3>
    ${table}
  </div>`;
}

// Draw the two rosters (only when something changed) and make them sortable
function drawRosters(force) {
  const g = CG();
  if (!g) return;
  const html = sheetSides(g).map(t => ros(g, t)).join('');
  if (!force && $('#ros').data('html') === html) return;
  $('#ros').html(html).data('html', html);
  $('#ros table.roster').dataTableLite({ search: false, filters: false, paging: false, pageLength: 0 });
}
