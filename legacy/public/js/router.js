/* router.js - decides which page to show for the address in the browser, then starts the app.
   URL "/teams/3" -> parts = ['teams','3'] -> pages.teams(parts) in js/pages/teams.js.
   Every page function returns { bc: breadcrumbs, h: html }. */

const MENU = ['scoreboard', 'scoresheet', 'controls', 'games', 'teams', 'players'];
// "scoreboard" in MENU is a drop-down: Score = the big scoreboard, Player = the roster board (fouls and points per player)
const SCOREBOARD_MENU = [['scoreboard', 'Score'], ['playerboard', 'Player']];
// "Others" drop-down list: more tools that do not belong to the live game. Add a line here to add a menu entry.
const OTHERS = [['custom-scoreboard', 'Custom Scoreboard'], ['custom-controls', 'Custom Controls'], ['rules', 'FIBA Rules Manual']];

let currentPage = '';       // name of the page being shown

async function route() {
  tickHook = null;
  $(document).off('.page'); // remove key handlers added by the previous page          // the new page sets its own if it is a live page
  pendingPhoto = null;

  const parts = location.pathname.split('/').filter(Boolean);
  const name = parts[0] || 'dashboard';
  currentPage = name;
  const isScoreboard = name == 'scoreboard' || name == 'playerboard' || name == 'custom-scoreboard';     // the display pages hide the menu
  const isStatistics = parts[2] == 'statistics' || parts[2] == 'scoresheet';     // read-only / print pages: no menu, no breadcrumbs

  // These two "viewing" pages hide the top menu (see base.css) and have no breadcrumbs.
  const isCtl = name == 'controls' || name == 'custom-controls';               // operator pages: slim menu + full screen button
  $('body').toggleClass('sbp', isScoreboard).toggleClass('view', isStatistics).toggleClass('ctlpage', isCtl);
  if (!isCtl) $('body').removeClass('ctlfocus');
  $('#nav').html(
    `<a href="/" data-l class="brand"><img src="${BRAND.logo}" alt=""><span><b>${BRAND.name}</b><small>${BRAND.fullName}</small></span></a>` +
    MENU.map(x => x == 'scoreboard'
      ? `<div class="dd"><a href="#" class="ddb ${SCOREBOARD_MENU.some(o => o[0] == name) ? 'active' : ''}" data-dd>Scoreboard ▾</a>
           <div class="ddm">${SCOREBOARD_MENU.map(([y, label]) => `<a href="/${y}" data-l class="${y == name ? 'active' : ''}">${label}</a>`).join('')}</div></div>`
      : `<a href="/${x}" data-l class="${x == name ? 'active' : ''}">${x}</a>`).join('') +
    `<div class="dd"><a href="#" class="ddb ${OTHERS.some(o => o[0] == name) ? 'active' : ''}" data-dd>Others ▾</a>
       <div class="ddm">${OTHERS.map(([x, label]) => `<a href="/${x}" data-l class="${x == name ? 'active' : ''}">${label}</a>`).join('')}</div></div>` +
    (isCtl ? '<button id="fsbtn" class="fsb" onclick="ctlFullscreen()"></button>' : '') +
    '<span id="sysclock" class="sysclock"></span>');
  if (!$('.fsx').length) $('body').append('<button class="fsx" onclick="ctlFullscreen()"></button>');     // floating exit button of the focus mode (iPhone)
  ctlFsLabel();
  updateClock();
  const pageTitle = name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  document.title = name == 'scoreboard' ? `${BRAND.name} Scoreboard` : name == 'playerboard' ? `${BRAND.name} Playerboard` : `${BRAND.name} · ${pageTitle}`;
  $('#foot').text(`${BRAND.name} · ${BRAND.fullName}`);

  let result;
  try {
    result = await (pages[name] || (() => ({ h: 'Not found' })))(parts);
  } catch (err) {
    result = { h: '<pre>' + E(err.stack) + '</pre>' };
  }

  let crumbs = '';
  if (result.bc && !isScoreboard && !isStatistics) {
    const trail = result.bc.map(([text, href]) => href ? a(href, text) + ' ›' : text).join(' ');
    crumbs = `<div class="bc">${a('/', 'Home')} › ${trail}</div>`;
  }
  app.html(crumbs + result.h);
  if (result.after) result.after();     // pages can run code after they are drawn (e.g. start a data table)
}

// Current date and time, top right of the menu
function updateClock() {
  $('#sysclock').text(new Date().toLocaleString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
}
setInterval(updateClock, 1000);

// Go to another page without reloading
function go(url) {
  history.pushState(0, '', url);
  route();
}

// "Others" drop-down: opens on click (touch screens) and on hover; closes when you click anywhere else
$(document).on('click', '[data-dd]', function (e) { e.preventDefault(); e.stopImmediatePropagation(); $(this).parent().toggleClass('open'); });
$(document).on('click', () => $('.dd').removeClass('open'));

// Links marked data-l are handled here instead of reloading the page
$(document).on('click', 'a[data-l]', function (e) {
  e.preventDefault();
  go($(this).attr('href'));
});
$(window).on('popstate', route);          // browser back/forward buttons

// Start: load the database, show the page, then refresh the data 5 times per second
$(async () => {
  DB = await $.getJSON('/api/db');
  route();
  setInterval(async () => {
    DB = await $.getJSON('/api/db');
    Buzzer.sync(buzzingHere() && Buzzer.here(), buzzKindHere());
    if (currentPage == 'scoresheet' || currentPage == 'controls') checkLineup();   // new game / new period: choose the active players      // start/stop the buzzer sound on this screen
    if (tickHook) tickHook();
  }, 200);
});
