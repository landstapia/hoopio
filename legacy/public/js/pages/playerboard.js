/* pages/playerboard.js - /playerboard: both team rosters with fouls and points, for a second monitor. No menu (see router.js).
   Look: css/playerboard.css · Data: live game (CG) · Order of the teams = same as /scoreboard (boardSides).
   Keys: F or double-click = full screen. Rows: every active player of the team, plus anyone who played in this game. */

const PB_MAX_ROWS = 15;       // rows that fit at full size; more rows shrink automatically

function pbDots(n) {
  let h = '';
  for (let i = 1; i <= 5; i++) h += `<i class="${i <= n ? (i == 5 ? 'out' : 'on') : ''}"></i>`;
  return `<span class="pbdots">${h}</span>`;
}

// One side of the board: header (alias, team name, logo) and the roster. right = true mirrors the columns.
function pbSide(g, teamId, right, stats) {
  const l = LV(), t = T(teamId);
  const players = DB.players
    .filter(p => p.teamId == teamId && (!p.archived || g.played.includes(p.id)))
    .sort((u, v) => byNumber(u.number, v.number));
  const color = readable(colRaw(teamId), '#000000');
  const abbr = (l.names[teamId] || ab(teamId)).slice(0, 10);

  const logo = t.photo ? `<img class="pblogo" src="${E(t.photo)}" alt="">` : '';
  const title = `<div class="t"><div class="pbalias" style="color:${color}">${E(abbr)}</div><div class="pbname">${E(t.name)}</div></div>`;

  const head = right
    ? '<div class="pbhead"><span class="pbhpt">PTS</span><span>FOULS</span><span class="pbnm">PLAYER</span><span>#</span></div>'
    : '<div class="pbhead"><span class="pbnum">#</span><span>PLAYER</span><span>FOULS</span><span class="pbhpt">PTS</span></div>';

  const rows = players.map(p => {
    const x = stats[p.id] || Z();
    const n = `<span class="pbnum">${E(p.number)}</span>`;
    const name = `<span class="pbnm">${E(nm(p).toUpperCase())}</span>`;
    const pt = `<span class="pbpt">${x.pts}</span>`;
    return `<div class="pbrow">${right ? pt + pbDots(x.pf) + name + n : n + name + pbDots(x.pf) + pt}</div>`;
  }).join('');

  return `<div class="pbside ${right ? 'pbright' : 'pbleft'}">
    <div class="pbhdr">${right ? logo + title : title + logo}</div>
    <div class="pbroster">${head}${rows || '<div class="pbempty">No players on this team</div>'}</div>
  </div>`;
}

function playerboard() {
  const g = CG();
  if (!g) return `<div class="pbwrap idle"><img src="${BRAND.logo}" alt=""><div>NO LIVE GAME</div></div>`;
  const stats = st(g.events);
  const [left, right] = boardSides(g);
  const rows = Math.max(
    DB.players.filter(p => p.teamId == left && (!p.archived || g.played.includes(p.id))).length,
    DB.players.filter(p => p.teamId == right && (!p.archived || g.played.includes(p.id))).length, 1);
  const rh = Math.max(24, Math.min(40, Math.floor(PB_MAX_ROWS * 40 / Math.max(rows, PB_MAX_ROWS))));   // row height shrinks if a team has more than 15 players
  return `<div class="pbwrap"><div class="pbstage" id="pbstage" style="--rh:${rh}px">${pbSide(g, left, false, stats)}${pbSide(g, right, true, stats)}</div></div>`;
}

// Scale the 1600x900 stage to the window
function pbFit() {
  const s = Math.min(innerWidth / 1600, innerHeight / 900);
  $('#pbstage').css('transform', 'scale(' + s + ')');
}

pages.playerboard = function () {
  tickHook = () => { setHtml('#pb', playerboard()); pbFit(); };
  $(document).on('keydown.page', e => { if (e.key.toLowerCase() == 'f') toggleFullscreen(); })
             .on('dblclick.page', toggleFullscreen);
  $(window).off('resize.pb').on('resize.pb', pbFit);
  return { h: `<div id="pb">${playerboard()}</div>`, after: pbFit };
};
