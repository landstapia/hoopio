/* pages/teams.js - /teams (list, add, archive, delete) and /teams/:id (edit team, statistics, rankings, add player) */

pages.teams = function (parts) {
  return parts[1] ? teamDetail(T(parts[1])) : teamsList();
};

const TEAM_CATEGORIES = ['Senior', 'Junior', 'Free'];
let teamsCategoryFilter = '';          // '' = all categories
let teamsSort = localStorage.teamsSort || 'name';   // 'name' = A–Z | 'name-desc' = Z–A | 'added' = order they were added
const catOpts = selected => opt(TEAM_CATEGORIES.map(c => [c, c]), selected || 'Free');

// One team card with Archive / Restore and Delete buttons
function teamCard(t) {
  const count = teamPlayers(t.id).length;
  const menu = hmenu([{ label: t.archived ? 'Restore' : 'Archive', js: `archiveTeam(${t.id},${!t.archived})` }, { label: 'Delete', js: `deleteTeam(${t.id})`, danger: true }]);
  return `<div class="card hasmenu" style="border-top:4px solid ${col(t.id)};${t.archived ? 'opacity:.6' : ''}"><div class="cardmenu">${menu}</div>${im(t, 60)}<br>
      ${a('/teams/' + t.id, '<b>' + E(t.name) + '</b>')}${t.archived ? ' <small>(archived)</small>' : ''}<br>
      <small>${E(ab(t.id))} · ${E(t.alias)} · ${count} players</small><br>
      <span class="cat cat-${E(t.category || 'Free')}">${E(t.category || 'Free')}</span><br>
    </div>`;
}

function teamsList() {
  const inCat = t => !teamsCategoryFilter || (t.category || 'Free') == teamsCategoryFilter;
  const byName = (x, y) => String(x.name).localeCompare(String(y.name), undefined, { numeric: true, sensitivity: 'base' });
  const sorter = teamsSort == 'name' ? byName : teamsSort == 'name-desc' ? (x, y) => byName(y, x) : (x, y) => x.id - y.id;
  const active = DB.teams.filter(t => !t.archived && inCat(t)).sort(sorter), archived = DB.teams.filter(t => t.archived && inCat(t)).sort(sorter);
  return {
    bc: [['Teams']],
    h: `${pageHead('Teams', [{ label: 'Print all team rosters', js: 'allTeamsRosters()' }, { label: 'Generate CSV', js: 'exportTeamsCsv()' }])}
      <div class="card">
        ${fi('Full name', 'id="tn"', 'l')}${fi('Abbreviation', 'id="ta" maxlength="10"', 'xs')}${fi('Alias', 'id="tl"', 'm')}${fx('Color', 'type="color" id="tc" value="#f2a501"', 'xs')}
        ${fi('Head coach', 'id="tco"', 'm')}${fi('First assistant coach', 'id="tas"', 'm')}${fs('Category', 'id="tcat"', catOpts('Free'), 's')}
        <button onclick="P({teams:[{name:V('tn'),abbr:V('ta'),alias:V('tl'),color:V('tc'),category:V('tcat'),coach:V('tco'),assistant:V('tas'),photo:'',archived:false}],log:'Team added'})">Add team</button>
      </div>
      <div class="row">${fs('Category', 'onchange="teamsCategoryFilter=this.value;route()"', opt([['', 'All categories'], ...TEAM_CATEGORIES.map(c => [c, c])], teamsCategoryFilter), 'm')}
        ${fs('Sort by', 'onchange="teamsSort=this.value;localStorage.teamsSort=this.value;route()"', opt([['name', 'Team name A–Z'], ['name-desc', 'Team name Z–A'], ['added', 'Order added']], teamsSort), 'm')}</div>
      <div class="grid">${active.map(teamCard).join('')}</div>
      ${archived.length ? `<h3>Archived teams</h3><div class="grid">${archived.map(teamCard).join('')}</div>` : ''}`,
  };
}

function teamDetail(t) {
  if (!t.id) return { h: 'Not found' };

  const rows = teamPlayers(t.id).map(p => ({ p, s: tot(p.id) }));
  const archivedPlayers = teamPlayers(t.id, true).filter(p => p.archived);
  const finals = DB.games.filter(g => g.status == 'final' && [g.home, g.away].includes(t.id));

  return {
    bc: [['Teams', '/teams'], [E(t.name)]],
    h: `
      ${pageHead(E(t.name), [{ label: 'Generate Official Roster', js: `teamRoster(${t.id})` }, { label: 'Generate Team Profile', js: `teamProfile(${t.id})` }])}
      <div class="card hasmenu" style="display:flex;gap:14px;flex-wrap:wrap"><div class="cardmenu">${hmenu([{ label: t.archived ? 'Restore team' : 'Archive team', js: `archiveTeam(${t.id},${!t.archived})` }, { label: 'Delete team', js: `deleteTeam(${t.id})`, danger: true }])}</div>
        ${im(t, 120)}
        <div>
          ${fi('Full name', `id="tn" value="${E(t.name)}"`, 'l')}${fi('Abbreviation', `id="ta" maxlength="10" value="${E(t.abbr)}"`, 'xs')}${fi('Alias', `id="tl" value="${E(t.alias)}"`, 'm')}${fx('Color', `type="color" id="tc" value="${colRaw(t.id)}"`, 'xs')}${fs('Category', 'id="tcat"', catOpts(t.category), 's')}<br>
          ${fi('Head coach', `id="tco" value="${E(t.coach || '')}"`, 'm')}${fi('First assistant coach', `id="tas" value="${E(t.assistant || '')}"`, 'm')}${fs('Captain', 'id="tcap"', `<option value="">— none —</option>${teamPlayers(t.id).sort((x, y) => byNumber(x.number, y.number)).map(p => `<option value="${p.id}" ${captainOf(t.id)?.id == p.id ? 'selected' : ''}>#${E(p.number)} ${E(fullName(p))}</option>`).join('')}`, 'l')}<br>
          ${fx('Picture', 'type="file" accept="image/*" onchange="pic(this,d=>{pendingPhoto=d})"', 'l')}
          <button onclick="P({teams:[{...T(${t.id}),name:V('tn'),abbr:V('ta'),alias:V('tl'),color:V('tc'),category:V('tcat'),coach:V('tco'),assistant:V('tas'),captainId:+V('tcap')||null,photo:pendingPhoto||T(${t.id}).photo}],log:'Team ${t.id} updated'})">Save</button>
          ${t.archived ? '<br><small>This team is archived: hidden from lists and new games, history kept.</small>' : ''}
        </div>
      </div>

      <h3>Team statistics</h3>
      ${teamStatsHtml(t, rows, finals)}

      <h3>Players & rankings</h3>
      ${rtab(rows, ['pts', 'reb', 'ast', 'stl'], 'teamrank', true)}

      <div class="card"><b>Add player</b><br>
        ${fi('First name', 'id="pf"', 'm')}${fi('Last name', 'id="pls"', 'm')}${fi('Nickname', 'id="pk"', 's')}${fi('Jersey #', 'id="pnum" title="Jersey number as text, e.g. 09 (0 and 00 are different numbers)"', 'xs')}${fi('Locale', 'id="ploc"', 'm')}
        <button onclick="addP(${t.id})">Add</button>
      </div>
      ${archivedPlayers.length ? `<h3>Archived players</h3>${tb(['#', 'Player', ''], archivedPlayers.map(p =>
        [E(p.number), a('/players/' + p.id, E(fullName(p))), `<button onclick="archivePlayer(${p.id},false)">Restore</button>`]))}` : ''}`,
    after: () => startRtab('teamrank', 4),
  };
}


// ---- Team statistics block: big numbers, records highlighted (look: css/teamstats.css) ----
const KS_NAMES = { pts: 'Points', reb: 'Rebounds', ast: 'Assists', stl: 'Steals', blk: 'Blocks', to: 'Turnovers', pf: 'Fouls' };

function teamStatsHtml(t, rows, finals) {
  const me = t.id, opp = g => (g.home == me ? g.away : g.home);
  const tile = (value, label, sub = '', cls = '') => `<div class="ts-tile ${cls}"><b>${value}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const vs = r => `vs <i>${E(T(opp(r.g)).name)}</i> · ${E(r.g.date)}`;
  const fmt1 = x => (Math.round(x * 10) / 10).toFixed(1);
  const signed = x => (x > 0 ? '+' : '') + fmt1(x);

  // final games in the order they were played
  const res = [...finals].sort((x, y) => (x.date + ' ' + (x.time || '')).localeCompare(y.date + ' ' + (y.time || '')) || x.id - y.id)
    .map(g => { const f = sc(g, me), a = sc(g, opp(g)); return { g, f, a, w: f > a, m: f - a }; });
  const n = res.length, wins = res.filter(r => r.w).length, losses = n - wins;
  const pf = res.reduce((x, r) => x + r.f, 0), pa = res.reduce((x, r) => x + r.a, 0);

  // current streak and longest winning streak
  let cur = 0, curKind = '', run = 0, bestRun = 0;
  res.forEach(r => { run = r.w ? run + 1 : 0; bestRun = Math.max(bestRun, run); });
  for (let i = n - 1; i >= 0; i--) { const k = res[i].w ? 'W' : 'L'; if (!curKind) curKind = k; if (k != curKind) break; cur++; }

  const high = n ? res.reduce((b, r) => (r.f > b.f ? r : b)) : null;
  const wonGames = res.filter(r => r.w), bigWin = wonGames.length ? wonGames.reduce((b, r) => (r.m > b.m ? r : b)) : null;
  const stingy = n ? res.reduce((b, r) => (r.a < b.a ? r : b)) : null;

  // totals of all players of the team and how many games the team has played
  const played = DB.games.filter(g => g.status != 'scheduled' && [g.home, g.away].includes(me)).length;
  const totals = Z();
  rows.forEach(r => KS.forEach(k => totals[k] += r.s[k]));

  const leaders = ['pts', 'reb', 'ast', 'stl'].map(k => {
    const best = rows.filter(r => r.s[k] > 0).sort((x, y) => y.s[k] - x.s[k])[0];
    return best
      ? `<div class="ts-tile ts-lead"><b>${best.s[k]}</b><span>${KS_NAMES[k]} leader</span><div class="who">${a('/players/' + best.p.id, E(fullName(best.p)))} <small>#${E(best.p.number)} · ${avg(best.s, k)} per game</small></div></div>`
      : tile('–', `${KS_NAMES[k]} leader`);
  }).join('');

  return `<div class="tstat" style="--tc:${col(t.id)}">
    <div class="ts-hero">
      <div class="ts-tile rec"><b><span class="w">${wins}</span><span class="d">–</span><span class="l">${losses}</span></b><span>Record · final games</span></div>
      ${tile(n ? fmt1(wins / n * 100) + '%' : '–', 'Win %', '', 'hi')}
      ${tile(n ? curKind + cur : '–', 'Streak', n ? (curKind == 'W' ? 'wins in a row' : 'losses in a row') : '', n ? (curKind == 'W' ? 'ts-up' : 'ts-dn') : '')}
      ${tile(n, 'Games', played > n ? `${played - n} not final yet` : 'final')}
    </div>

    <h4>Scoring</h4>
    <div class="ts-grid">
      ${tile(n ? fmt1(pf / n) : '–', 'Points per game', `${pf} points in total`, 'hi')}
      ${tile(n ? fmt1(pa / n) : '–', 'Allowed per game', `${pa} points in total`)}
      ${tile(n ? signed((pf - pa) / n) : '–', 'Point difference / game', n ? `${(pf - pa > 0 ? '+' : '') + (pf - pa)} in total` : '', !n ? '' : pf >= pa ? 'ts-up' : 'ts-dn')}
    </div>

    <h4>Records</h4>
    <div class="ts-grid">
      ${tile(high ? high.f : '–', 'Highest score', high ? vs(high) : '', 'star')}
      ${tile(bigWin ? '+' + bigWin.m : '–', 'Biggest win', bigWin ? vs(bigWin) : '', 'star')}
      ${tile(stingy ? stingy.a : '–', 'Fewest points allowed', stingy ? vs(stingy) : '', 'star')}
      ${tile(bestRun ? 'W' + bestRun : '–', 'Longest win streak', '', 'star')}
    </div>

    <h4>Season totals${played ? ` · ${played} game${played == 1 ? '' : 's'}` : ''}</h4>
    <div class="ts-grid ts-tot">
      ${KS.map(k => tile(totals[k], KS_NAMES[k], played ? `<i>${fmt1(totals[k] / played)}</i> per game` : '', k == 'pts' ? 'hi' : '')).join('')}
    </div>

    <h4>Team leaders</h4>
    <div class="ts-grid">${leaders}</div>
  </div>`;
}
