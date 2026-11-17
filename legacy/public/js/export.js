/* export.js - CSV export (Teams, Players, Games) and the printable Team Profile sheet.
   pageHead(title, items) draws the page title with a gear button at the right; the gear menu holds "Generate CSV" (Teams, Players, Games pages)
   or "Generate Team Profile" (a team's page). Nothing is sent to the server: the files are built in the browser from the data already loaded. */

/* ---------- Page header with a gear menu ---------- */
// items = [{ label, js }]. Uses the same menu mechanics as the hamburger menus (toggleHmenu / closeHmenus in ui.js).
function pageHead(title, items) {
  return `<div class="pghead" style="display:flex;align-items:center;gap:12px"><h2 style="flex:1;margin:.4em 0">${title}</h2>
    <div class="hmenu"><button class="hbtn" aria-label="Page options" aria-haspopup="true" title="Options" onclick="toggleHmenu(event,this)">${GEAR_SVG}</button>
      <div class="hlist" role="menu">${items.map(i => `<button role="menuitem" onclick="closeHmenus();${i.js}">${i.label}</button>`).join('')}</div></div></div>`;
}

/* ---------- Time stamps ---------- */
const pad2 = n => String(n).padStart(2, '0');
function nowInfo() {
  const d = new Date(), off = -d.getTimezoneOffset(), sign = off >= 0 ? '+' : '-';
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`, time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return { date, time, file: `${date}_${pad2(d.getHours())}${pad2(d.getMinutes())}`, tz: `UTC${sign}${pad2(Math.floor(Math.abs(off) / 60))}:${pad2(Math.abs(off) % 60)}`,
    long: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) };
}

/* ---------- CSV ---------- */
// One cell: numbers as they are; text in quotes when needed. A text that starts with = + - @ gets a leading ' so a spreadsheet never runs it as a formula.
function csvCell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v == 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v == 'boolean') return v ? 'Yes' : 'No';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
// Downloads a .csv file (UTF-8 with a byte order mark so Excel shows accents such as ñ correctly)
function csvDownload(name, header, rows) {
  const text = '\ufeff' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${name}_${nowInfo().file}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// A team's record from its FINAL games (all seasons)
function teamRecord(teamId) {
  const r = { games: 0, final: 0, w: 0, l: 0, pf: 0, pa: 0, seasons: [] };
  DB.games.filter(g => [g.home, g.away].includes(teamId)).forEach(g => {
    r.games++;
    if (g.status != 'final') return;
    const opp = g.home == teamId ? g.away : g.home, mine = sc(g, teamId), theirs = sc(g, opp);
    r.final++; r.pf += mine; r.pa += theirs;
    if (mine > theirs) r.w++; else if (mine < theirs) r.l++;
  });
  r.seasons = [...new Set(DB.games.filter(g => [g.home, g.away].includes(teamId)).map(g => g.season))].sort();
  return r;
}
const pctText = (w, n) => (n ? (w / n).toFixed(3) : '');

function exportTeamsCsv() {
  const header = ['Team ID', 'Name', 'Abbreviation', 'Alias', 'Color', 'Category', 'Status', 'Logo', 'Active players', 'Archived players', 'Total players', 'Seasons',
    'Games (all)', 'Games final', 'Wins', 'Losses', 'Win %', 'Points for', 'Points against', 'Point difference'];
  const rows = DB.teams.slice().sort((x, y) => x.name.localeCompare(y.name)).map(t => {
    const r = teamRecord(t.id), all = DB.players.filter(p => p.teamId == t.id);
    return [t.id, t.name, t.abbr, t.alias, colRaw(t.id), t.category || 'Free', t.archived ? 'Archived' : 'Active', t.photo ? 'Yes' : 'No',
      all.filter(p => !p.archived).length, all.filter(p => p.archived).length, all.length, r.seasons.join('; '),
      r.games, r.final, r.w, r.l, pctText(r.w, r.final), r.pf, r.pa, r.pf - r.pa];
  });
  csvDownload('teams', header, rows);
}

function exportPlayersCsv() {
  const header = ['Player ID', 'Jersey #', 'First name', 'Last name', 'Nickname', 'Locale', 'Status', 'Photo', 'Identity verified', 'Verified on', 'Team ID', 'Team', 'Team abbreviation', 'Team category',
    'Games played', 'Points', 'Rebounds', 'Assists', 'Steals', 'Blocks', 'Turnovers', 'Fouls', 'Points / game', 'Rebounds / game', 'Assists / game'];
  const rows = DB.players.slice().sort((x, y) => (x.last + ', ' + x.first).localeCompare(y.last + ', ' + y.first)).map(p => {
    const t = T(p.teamId), s = tot(p.id);
    return [p.id, p.number, p.first, p.last, p.nick, p.locale, p.archived ? 'Archived' : 'Active', p.photo ? 'Yes' : 'No', p.verified ? 'Yes' : 'No', p.verified ? fmtDateTime(p.verifiedAt) : '', p.teamId, t.name || '', t.abbr || '', t.id ? (t.category || 'Free') : '',
      s.gp, s.pts, s.reb, s.ast, s.stl, s.blk, s.to, s.pf, avg(s, 'pts'), avg(s, 'reb'), avg(s, 'ast')];
  });
  csvDownload('players', header, rows);
}

function exportGamesCsv() {
  const header = ['Game ID', 'Season', 'Date', 'Time', 'Status', 'Running time', 'Live game now', 'Match',
    'Home team ID', 'Home team', 'Home category', 'Away team ID', 'Away team', 'Away category', 'Home score', 'Away score', 'Winner', 'Margin',
    'Home game fouls', 'Away game fouls', 'Home technical fouls', 'Away technical fouls', 'Home timeouts taken', 'Away timeouts taken',
    'Substitutions', 'Events recorded', 'Home players used', 'Away players used'];
  const count = (g, t, type) => g.events.filter(e => e.type == type && e.teamId == t).length;
  const used = (g, t) => new Set([...(g.played || []), ...g.events.map(e => e.playerId).filter(Boolean)].filter(id => PL(id).teamId == t)).size;
  const rows = DB.games.slice().sort((x, y) => ((x.date + (x.time || '')) < (y.date + (y.time || '')) ? -1 : (x.date + (x.time || '')) > (y.date + (y.time || '')) ? 1 : x.id - y.id)).map(g => {
    const h = sc(g, g.home), a = sc(g, g.away), ht = T(g.home), at = T(g.away);
    const winner = g.status != 'final' ? '' : h > a ? ht.name : a > h ? at.name : 'Tie';
    return [g.id, g.season, g.date, g.time || '', g.status, !!g.runningTime, g.id == LV().gameId, `${ht.name || ''} vs ${at.name || ''}`,
      g.home, ht.name || '', ht.category || 'Free', g.away, at.name || '', at.category || 'Free', h, a, winner, Math.abs(h - a),
      gameFouls(g, g.home), gameFouls(g, g.away), techFouls(g, g.home), techFouls(g, g.away), count(g, g.home, 'timeout'), count(g, g.away, 'timeout'),
      g.events.filter(e => e.type == 'sub').length, g.events.length, used(g, g.home), used(g, g.away)];
  });
  csvDownload('games', header, rows);
}

/* ---------- Team Profile: a printable sheet in a new window ("Print" there, choose "Save as PDF" to keep a file) ---------- */
function teamProfile(teamId) {
  const t = T(teamId);
  if (!t.id) return alert('Team not found');
  const now = nowInfo(), rec = teamRecord(teamId);
  const players = teamPlayers(teamId, true).sort((x, y) => (x.archived - y.archived) || byNumber(x.number, y.number));
  const games = DB.games.filter(g => [g.home, g.away].includes(teamId)).sort((x, y) => ((x.date + (x.time || '')) < (y.date + (y.time || '')) ? -1 : 1));
  const bySeason = rec.seasons.map(season => {
    const r = { season, gp: 0, w: 0, l: 0, pf: 0, pa: 0 };
    games.filter(g => g.season == season && g.status == 'final').forEach(g => {
      const mine = sc(g, teamId), theirs = sc(g, g.home == teamId ? g.away : g.home);
      r.gp++; r.pf += mine; r.pa += theirs; if (mine > theirs) r.w++; else if (mine < theirs) r.l++;
    });
    return r;
  });
  const reportId = `TP-${t.id}-${now.file.replace('_', '-')}`;
  const sign = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);

  const rosterRows = players.map(p => {
    const s = tot(p.id);
    return `<tr><td>${p.id}</td><td class="c">${E(p.number)}</td><td>${E(p.last)}${p.first ? ', ' + E(p.first) : ''}${p.nick ? ` “${E(p.nick)}”` : ''}${p.archived ? ' <i>(archived)</i>' : ''}</td><td>${E(p.locale || '')}</td>
      <td class="n">${s.gp}</td><td class="n">${s.pts}</td><td class="n">${avg(s, 'pts')}</td><td class="n">${s.reb}</td><td class="n">${s.ast}</td><td class="n">${s.stl}</td><td class="n">${s.blk}</td><td class="n">${s.to}</td><td class="n">${s.pf}</td></tr>`;
  }).join('') || '<tr><td colspan="13">No players registered.</td></tr>';
  const seasonRows = bySeason.map(r => `<tr><td>${E(r.season)}</td><td class="n">${r.gp}</td><td class="n">${r.w}</td><td class="n">${r.l}</td><td class="n">${pctText(r.w, r.gp) || '–'}</td><td class="n">${r.pf}</td><td class="n">${r.pa}</td><td class="n">${r.gp ? sign(r.pf - r.pa) : '–'}</td></tr>`).join('')
    || '<tr><td colspan="8">No games yet.</td></tr>';
  const gameRows = games.map(g => {
    const home = g.home == teamId, opp = T(home ? g.away : g.home), mine = sc(g, teamId), theirs = sc(g, home ? g.away : g.home);
    const result = g.status == 'final' ? (mine > theirs ? 'W' : mine < theirs ? 'L' : 'T') : '';
    return `<tr><td>${E(g.season)}</td><td>${E(g.date)}</td><td>${E(g.time || '')}</td><td>${home ? 'Home' : 'Away'}</td><td>${E(opp.name || 'Removed team')}</td>
      <td class="n">${g.status == 'scheduled' ? '–' : mine + ' – ' + theirs}</td><td class="c"><b>${result}</b></td><td>${E(g.status)}${g.runningTime ? ' · running time' : ''}</td></tr>`;
  }).join('') || '<tr><td colspan="8">No games yet.</td></tr>';

  const activeN = players.filter(p => !p.archived).length;
  const logo = t.photo ? `<img class="tl" src="${t.photo}" alt="">` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Team Profile - ${E(t.name)} - ${now.date}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 11.5px/1.45 "Segoe UI", system-ui, Arial, sans-serif; color: #111; background: #fff; }
  .page { max-width: 190mm; margin: 0 auto; padding: 10mm 0; }
  .bar { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 10px; }
  .bar button { padding: 8px 18px; font: inherit; font-weight: 700; border: 0; border-radius: 6px; background: #1d4ed8; color: #fff; cursor: pointer; }
  .bar button.g { background: #e5e7eb; color: #111; }
  header.top { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; border-bottom: 3px solid ${colRaw(t.id)}; }
  header.top img.lg { width: 46px; height: 46px; object-fit: contain; }
  header.top .org b { display: block; font-size: 14px; letter-spacing: .04em; } header.top .org span { color: #555; font-size: 10.5px; }
  header.top .doc { margin-left: auto; text-align: right; font-size: 10.5px; color: #444; }
  .title { display: flex; align-items: center; gap: 14px; margin: 14px 0 10px; }
  .title img.tl { width: 84px; height: 84px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc; }
  .title h1 { margin: 0; font-size: 26px; line-height: 1.1; } .title .kind { font-size: 11px; letter-spacing: .12em; color: #555; font-weight: 700; }
  .tag { display: inline-block; padding: 1px 9px; border-radius: 99px; border: 1px solid #888; font-size: 10.5px; font-weight: 700; margin-left: 6px; vertical-align: 3px; }
  .sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; border: 1px solid #555; vertical-align: -2px; margin-right: 4px; background: ${colRaw(t.id)}; }
  h2 { margin: 16px 0 5px; font-size: 12.5px; letter-spacing: .08em; text-transform: uppercase; border-bottom: 1px solid #999; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 4px; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th, td { padding: 3px 6px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
  th { background: #eef0f6; font-size: 10px; letter-spacing: .05em; text-transform: uppercase; border-bottom: 1px solid #999; }
  td.n, th.n { text-align: right; } td.c, th.c { text-align: center; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid #bbb; border-radius: 6px; }
  .meta div { padding: 5px 9px; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; } .meta div:nth-child(4n) { border-right: 0; }
  .meta small { display: block; color: #666; font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; } .meta b { font-size: 13px; }
  .foot { margin-top: 14px; padding-top: 6px; border-top: 1px solid #999; font-size: 10px; color: #444; display: flex; justify-content: space-between; gap: 12px; }
  .note { font-size: 10px; color: #555; margin: 3px 0 0; }
  @media print { .bar { display: none; } .page { padding: 0; max-width: none; } }
</style></head><body><div class="page">
  <div class="bar"><button class="g" onclick="window.close()">Close</button><button onclick="window.print()">Print / Save as PDF</button></div>
  <header class="top"><img class="lg" src="${location.origin + BRAND.logo}" alt=""><div class="org"><b>${E(BRAND.name)}</b><span>${E(BRAND.fullName)}</span></div>
    <div class="doc"><b>TEAM PROFILE</b><br>Generated as of ${now.date} ${now.time} (${now.tz})<br>Report ID ${E(reportId)}</div></header>
  <div class="title">${logo}<div><div class="kind">TEAM PROFILE</div><h1>${E(t.name)}<span class="tag">${E(t.category || 'Free')}</span></h1>
    <div>${t.alias ? E(t.alias) + ' · ' : ''}${E(t.abbr)} · ${t.archived ? 'Archived' : 'Active'}</div></div></div>

  <div class="meta">
    <div><small>Team ID</small><b>${t.id}</b></div><div><small>Abbreviation</small><b>${E(t.abbr)}</b></div><div><small>Alias</small><b>${E(t.alias || '–')}</b></div><div><small>Color</small><b><span class="sw"></span>${E(colRaw(t.id))}</b></div>
    <div><small>Category</small><b>${E(t.category || 'Free')}</b></div><div><small>Status</small><b>${t.archived ? 'Archived' : 'Active'}</b></div><div><small>Players</small><b>${activeN} active${players.length - activeN ? ` + ${players.length - activeN} archived` : ''}</b></div><div><small>Seasons</small><b>${rec.seasons.join(', ') || '–'}</b></div>
    <div><small>Games (final / all)</small><b>${rec.final} / ${rec.games}</b></div><div><small>Record (W–L)</small><b>${rec.w} – ${rec.l}</b></div><div><small>Win %</small><b>${pctText(rec.w, rec.final) || '–'}</b></div><div><small>Points for / against</small><b>${rec.pf} / ${rec.pa}</b></div>
  </div>

  <h2>Record by season</h2>
  <table><thead><tr><th>Season</th><th class="n">GP</th><th class="n">W</th><th class="n">L</th><th class="n">PCT</th><th class="n">PF</th><th class="n">PA</th><th class="n">DIFF</th></tr></thead><tbody>${seasonRows}</tbody></table>
  <p class="note">GP = games played, PCT = winning percentage, PF = points for, PA = points against, DIFF = PF minus PA. Final games only.</p>

  <h2>Roster and player statistics</h2>
  <table><thead><tr><th>ID</th><th class="c">#</th><th>Player</th><th>Locale</th><th class="n">GP</th><th class="n">PTS</th><th class="n">PPG</th><th class="n">REB</th><th class="n">AST</th><th class="n">STL</th><th class="n">BLK</th><th class="n">TO</th><th class="n">PF</th></tr></thead><tbody>${rosterRows}</tbody></table>
  <p class="note">Player statistics cover all seasons and include live and final games, as on the Players page.</p>

  <h2>Games</h2>
  <table><thead><tr><th>Season</th><th>Date</th><th>Time</th><th>H/A</th><th>Opponent</th><th class="n">Score</th><th class="c">Result</th><th>Status</th></tr></thead><tbody>${gameRows}</tbody></table>

  <div class="foot"><span>Generated as of ${now.long}, ${now.time} (${now.tz}) · ${E(BRAND.name)} · database version ${DB.version || ''}</span><span>${E(reportId)} · ${DB.teams.length} teams · ${DB.players.length} players · ${DB.games.length} games on record</span></div>
</div></body></html>`;

  const w = window.open('', '_blank');
  if (!w) return alert('The browser blocked the new window. Allow pop-ups for this site, then try again.');
  w.document.open(); w.document.write(html); w.document.close();
}

/* ---------- Official roster: photo, last name, first name, nickname, number, locale. The captain is listed first and signs it. ----------
   teamRoster(id) = one team; allTeamsRosters() = every active team (Teams page gear menu), each team starting on a new page. */
function rosterSection(t, now) {
  const cap = captainOf(t.id);
  const players = teamPlayers(t.id).sort((x, y) => byNumber(x.number, y.number));
  const ordered = cap ? [cap, ...players.filter(p => p.id != cap.id)] : players;                 // the captain is first
  const reportId = `OR-${t.id}-${now.file.replace('_', '-')}`;
  const initials = p => ((p.first || '?')[0] + ((p.last || '')[0] || '')).toUpperCase();
  const rows = ordered.map((p, i) => `<tr class="${cap && i == 0 ? 'cap' : ''}">
      <td class="c">${i + 1}</td>
      <td class="c">${p.photo ? `<img class="pp" src="${p.photo}" alt="">` : `<div class="pp ini">${E(initials(p))}</div>`}</td>
      <td class="num">${E(p.number)}</td>
      <td><b>${E(p.last)}</b>${cap && i == 0 ? ' <span class="tag">CAPTAIN</span>' : ''}</td><td>${E(p.first)}</td><td>${E(p.nick || '')}</td><td>${E(p.locale || '')}</td></tr>`).join('')
    || '<tr><td colspan="7">No active players registered.</td></tr>';
  const logo = t.photo ? `<img class="tl" src="${t.photo}" alt="">` : '';
  return `<section class="rs">
  <header class="top" style="border-bottom-color:${colRaw(t.id)}"><img class="lg" src="${location.origin + BRAND.logo}" alt=""><div class="org"><b>${E(BRAND.name)}</b><span>${E(BRAND.fullName)}</span></div>
    <div class="doc"><b>OFFICIAL ROSTER</b><br>As of ${now.date} ${now.time}<br>Document ID ${E(reportId)}</div></header>
  <div class="title">${logo}<div><div class="kind">OFFICIAL TEAM ROSTER</div><h1>${E(t.name)}</h1>
    <div>${t.alias ? E(t.alias) + ' · ' : ''}${E(t.abbr)} · ${E(t.category || 'Free')} · ${players.length} players</div></div></div>
  <div class="staff"><div><small>Head coach</small><b>${E(t.coach || '–')}</b></div><div><small>First assistant coach</small><b>${E(t.assistant || '–')}</b></div><div><small>Captain</small><b>${cap ? '#' + E(cap.number) + ' ' + E(fullName(cap)) : '– not selected –'}</b></div></div>
  <table><thead><tr><th class="c">No.</th><th class="c">Photo</th><th class="c">Jersey</th><th>Last name</th><th>First name</th><th>Nickname</th><th>Locale</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="cert"><p style="margin-top:14px">I certify that the players listed above are the official roster of <b>${E(t.name)}</b> for ${E(BRAND.name)}.</p>
    <div class="sign"><div class="s"><b>${cap ? E(fullName(cap)) : '&nbsp;'}</b><br>Team captain: printed name and signature</div><div>Date signed</div></div></div>
  <div class="foot"><span>Generated ${now.long}, ${now.time} (${now.tz}) · ${E(BRAND.name)}</span><span>${E(reportId)}</span></div>
</section>`;
}

function openRosters(teams, title) {
  const now = nowInfo();
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${E(title)} - ${now.date}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 12px/1.4 "Segoe UI", system-ui, Arial, sans-serif; color: #111; background: #fff; }
  .page { max-width: 186mm; margin: 0 auto; padding: 8mm 0; }
  .bar { display: flex; gap: 8px; justify-content: flex-end; align-items: center; margin-bottom: 10px; }
  .bar span { margin-right: auto; color: #555; }
  .bar button { padding: 8px 18px; font: inherit; font-weight: 700; border: 0; border-radius: 6px; background: #1d4ed8; color: #fff; cursor: pointer; }
  .bar button.g { background: #e5e7eb; color: #111; }
  .rs { page-break-after: always; break-after: page; } .rs:last-child { page-break-after: auto; break-after: auto; }
  header.top { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; border-bottom: 3px solid #888; }
  header.top img.lg { width: 46px; height: 46px; object-fit: contain; }
  header.top .org b { display: block; font-size: 14px; letter-spacing: .04em; } header.top .org span { color: #555; font-size: 10.5px; }
  header.top .doc { margin-left: auto; text-align: right; font-size: 10.5px; color: #444; }
  .title { display: flex; align-items: center; gap: 14px; margin: 14px 0 10px; }
  .title img.tl { width: 78px; height: 78px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc; }
  .title h1 { margin: 0; font-size: 26px; line-height: 1.1; } .title .kind { font-size: 11px; letter-spacing: .12em; color: #555; font-weight: 700; }
  .staff { display: flex; gap: 28px; margin: 4px 0 10px; } .staff small { display: block; color: #666; font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  tr { page-break-inside: avoid; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #ccc; text-align: left; vertical-align: middle; }
  th { background: #eef0f6; font-size: 10px; letter-spacing: .05em; text-transform: uppercase; border-bottom: 1px solid #999; }
  td.c, th.c { text-align: center; } td.num { text-align: center; font-size: 20px; font-weight: 800; width: 16mm; }
  tr.cap td { background: #fff7e0; }
  .tag { display: inline-block; padding: 0 7px; border-radius: 99px; border: 1px solid #b7791f; font-size: 9px; font-weight: 800; letter-spacing: .06em; color: #7a4b00; vertical-align: 1px; }
  .pp { width: 17mm; height: 17mm; object-fit: cover; border: 1px solid #aaa; border-radius: 3px; display: block; margin: 0 auto; }
  .pp.ini { display: flex; align-items: center; justify-content: center; background: #e5e7eb; color: #555; font-weight: 800; font-size: 16px; }
  .cert { margin-top: 16px; page-break-inside: avoid; }
  .cert p { margin: 0 0 54px; }
  .sign { display: flex; gap: 30px; align-items: flex-end; }
  .sign div { flex: 1; border-top: 1px solid #111; padding-top: 3px; font-size: 10.5px; } .sign div.s { flex: 1.6; } .sign b { font-size: 12.5px; }
  .foot { margin-top: 14px; padding-top: 6px; border-top: 1px solid #999; font-size: 10px; color: #444; display: flex; justify-content: space-between; gap: 12px; }
  @media print { .bar { display: none; } .page { padding: 0; max-width: none; } }
</style></head><body><div class="page">
  <div class="bar"><span>${E(title)}</span><button class="g" onclick="window.close()">Close</button><button onclick="window.print()">Print / Save as PDF</button></div>
  ${teams.map(t => rosterSection(t, now)).join('')}
</div></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return alert('The browser blocked the new window. Allow pop-ups for this site, then try again.');
  w.document.open(); w.document.write(html); w.document.close();
}

function teamRoster(teamId) {
  const t = T(teamId);
  if (!t.id) return alert('Team not found');
  openRosters([t], `Official Roster - ${t.name}`);
}

// Every active team that has at least one active player, in name order; each roster starts on a new page
function allTeamsRosters() {
  const teams = DB.teams.filter(t => !t.archived && teamPlayers(t.id).length).sort((x, y) => String(x.name).localeCompare(String(y.name), undefined, { numeric: true, sensitivity: 'base' }));
  if (!teams.length) return alert('There are no teams with players yet.');
  openRosters(teams, `Official Rosters - all teams (${teams.length})`);
}
