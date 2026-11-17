/* pages/dashboard.js - the landing page "/": league banner, quick numbers, live game and links */

pages.dashboard = function () {
  const g = CG();
  const tiles = [
    ['/scoreboard', '📺', 'Scoreboard · Score', 'Full-screen display for the second monitor'],
    ['/playerboard', '👕', 'Scoreboard · Player', 'Both rosters with fouls and points per player'],
    ['/scoresheet', '📝', 'Scoresheet', 'Record points, fouls, subs and timeouts'],
    ['/controls', '🎛️', 'Controls', 'Clocks, period, names, arrow, swap sides'],
    ['/games', '📅', 'Games', 'Schedule, results and masterlist'],
    ['/teams', '👥', 'Teams', 'Rosters, colors and logos'],
    ['/players', '🏃', 'Players', 'Profiles and season statistics'],
    ['/log', '📜', 'Game log', 'Every action, from game-log.txt'],
    ['/custom-controls', '🧮', 'Custom Controls', 'Operate the manual custom scoreboard (Others menu)'],
    ['/custom-scoreboard', '🔢', 'Custom Scoreboard', 'Manual scoreboard display, independent of the live game'],
    ['/rules', '📖', 'FIBA Rules Manual', 'Key FIBA rules for the scorer\'s table (Others menu)'],
  ];
  const numbers = [[DB.teams.filter(t => !t.archived).length, 'Teams'], [DB.players.filter(p => !p.archived).length, 'Players'], [DB.games.length, 'Games'], [g ? 'LIVE' : '—', 'Game status']];
  const live = g
    ? `<b>Live game:</b> ${E(T(g.home).name)} ${sc(g, g.home)} – ${sc(g, g.away)} ${E(T(g.away).name)}
       (${a('/games/' + g.id, 'details')} · ${a('/scoresheet', 'open scoresheet')})`
    : '<b>No live game.</b> Pick one in ' + a('/games', 'Games') + '.';

  return {
    h: `
      <div class="card hero">
        <img src="${BRAND.logo}" alt="${E(BRAND.name)}">
        <div>
          <h1>${E(BRAND.fullName)}</h1>
          <p>${E(BRAND.tagline)}</p>
          <div class="stats">${numbers.map(([n, label]) => `<div><b>${n}</b><small>${label}</small></div>`).join('')}</div>
        </div>
      </div>
      <div class="card">${live}</div>
      <div class="grid">
        ${tiles.map(([href, icon, title, text]) =>
          `<div class="card tile"><span class="ic">${icon}</span>${a(href, '<b>' + title + '</b>')}<br><small>${text}</small></div>`).join('')}
      </div>`,
  };
};
