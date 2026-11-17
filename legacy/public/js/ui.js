/* ui.js - small HTML helpers used by every page, plus the player-number popup */

let pendingPhoto = null;   // holds a just-chosen photo (as text) until the Save button is pressed

const V = id => $('#' + id).val();   // value of an input by id

// Player number in a round label in the team color (readable on any color)
const numBadge = p => `<span class="num" style="background:${col(p.teamId)};color:${ink(col(p.teamId))}">${E(p.number)}</span>`;

// Escape text before putting it into HTML
const E = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Link that the router handles without reloading the page
const a = (href, text) => `<a href="${href}" data-l>${text}</a>`;

// <option> list from [[value, label], ...]
const opt = (pairs, selected) =>
  pairs.map(([value, label]) => `<option value="${value}" ${value == selected ? 'selected' : ''}>${E(label)}</option>`).join('');

// <option> list of all teams
const topts = selected => opt(DB.teams.filter(t => !t.archived || t.id == selected).map(t => [t.id, t.name]), selected);

/* ---------- Outlined fields whose label is always visible ----------
   The label rests inside the box while it is empty and moves onto the box border (smaller) as soon as there is text or the box has focus,
   so a field never loses its name. Look: css/fields.css.
   fi(label, attrs, size)          text / number input            (attrs = the usual attributes as text: 'id="tn" value="..."')
   fs(label, attrs, options, size) drop-down                      (options = <option> list, e.g. opt(...))
   fx(label, attrs, size)          field that always shows something: date, time, color, file (label always on the border)
   size = '' (default) | 'xs' | 's' | 'm' | 'l' | 'xl'  - field width */
const fi = (label, attrs = '', size = '') => `<label class="fl ${size}"><input placeholder=" " ${attrs}><span>${E(label)}</span></label>`;
const fs = (label, attrs = '', options = '', size = '') => `<label class="fl on ${size}"><select ${attrs}>${options}</select><span>${E(label)}</span></label>`;
const fx = (label, attrs = '', size = '') => `<label class="fl on ${size}"><input ${attrs}><span>${E(label)}</span></label>`;

// A table cell is either HTML text, or { h: html, s: sortValue } when the sort value differs from the text
const tdOf = c => (c && typeof c == 'object') ? `<td data-sort="${E(c.s)}">${c.h}</td>` : `<td>${c}</td>`;

// Table: headers = ['A','B'], rows = [['a1','b1'], ...] (cells may contain HTML)
function tb(headers, rows, cls = '') {
  const head = headers.map(h => `<th>${h}</th>`).join('');
  const body = rows.map(r => `<tr>${r.map(tdOf).join('')}</tr>`).join('');
  return `<div style="overflow:auto"><table class="${cls}"><tr>${head}</tr>${body}</table></div>`;
}

// Sortable table (use with $('#id').dataTableLite({...}) in the page's "after" function, see js/datatable.js).
// foot = optional extra rows that stay at the bottom and are never sorted (e.g. team totals)
function dtb(id, headers, rows, foot = [], cls = '') {
  return `<div class="dt-wrap" style="overflow:auto"><table id="${id}" class="dt ${cls}" data-dtkey="${id}">
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(tdOf).join('')}</tr>`).join('')}</tbody>
    ${foot.length ? `<tfoot>${foot.map(r => `<tr>${r.map(tdOf).join('')}</tr>`).join('')}</tfoot>` : ''}</table></div>`;
}

// Ranking table (sortable). rows = [{p: player, s: statLine}], keys = ['pts','reb',...]
// Each stat cell shows the value and its rank, and sorts by the value. Start the DataTable with startRtab(id) (startRtab(id, 4) for the big version).
// big = true (team page): larger table, a picture left of the name, the name as  Last, First “Nick”  (like the Players page) and a Locale column.
function rtab(rows, keys, id, big = false) {
  const rankers = keys.map(k => rk(rows.map(r => r.s), k));
  const headers = big ? ['#', 'Player', 'Locale', 'Team', ...keys.map(k => k.toUpperCase() + ' <small>(rank)</small>')]
                      : ['#', 'Player', 'Team', ...keys.map(k => k.toUpperCase() + ' <small>(rank)</small>')];
  const nameCell = r => big
    ? { h: `<span class="pcell">${a('/players/' + r.p.id, im(r.p, 52))}<span>${a('/players/' + r.p.id, E(fullName(r.p)))}${r.p.nick ? ` <small>“${E(r.p.nick)}”</small>` : ''}</span></span>`, s: fullName(r.p) }
    : { h: `<span class="pnm">${a('/players/' + r.p.id, E(nm(r.p)))}</span>`, s: nm(r.p) };
  return dtb(id, headers, rows.map(r => [
    r.p.number,
    nameCell(r),
    ...(big ? [E(r.p.locale || '')] : []),
    E(ab(r.p.teamId)),
    ...keys.map((k, i) => ({ h: `${r.s[k]} <small>#${rankers[i](r.s)}</small>`, s: r.s[k] })),
  ]), [], big ? 'rt-big' : '');
}
const startRtab = (id, orderCol = 3) => $('#' + id).dataTableLite({ pageLength: 25, order: [orderCol, 'desc'], placeholder: 'Search name or number…' });

// Default team icon: a basketball in the team color
function teamIcon(team, size) {
  const color = team.color || col(team.id);
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="border-radius:12px;background:#0f2160">
    <circle cx="50" cy="50" r="44" fill="${color}"/>
    <g fill="none" stroke="#0009" stroke-width="3"><path d="M50 6v88M6 50h88"/><path d="M18 18Q50 50 18 82M82 18Q50 50 82 82"/></g></svg>`;
}

// Picture (team logo / player portrait). Without a photo: a basketball icon for teams, initials for players.
function im(item, size = 80) {
  if (item.photo) return `<img src="${item.photo}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:8px">`;
  if (item.abbr !== undefined) return teamIcon(item, size);          // it is a team
  const initials = ((item.first || '?')[0] + ((item.last || '')[0] || '')).toUpperCase();
  return `<div class="ph" style="width:${size}px;height:${size}px">${E(initials)}</div>`;
}

// Replace an element's HTML only if it changed (keeps buttons clickable while the page refreshes live)
function setHtml(selector, html) {
  const el = $(selector);
  if (el.data('html') !== html) el.html(html).data('html', html);
}

// Read an <input type=file> image, shrink it to max 400px wide, and pass it to callback as text
function pic(input, callback) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 400 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- Popup: type a jersey number, then pick the player ----------
   title    : text at the top
   players  : the players that may be chosen (this is where "active only" / "bench only" is decided)
   onPick   : function called with the chosen player
   footer   : optional function(box, close) that fills the bottom area of the popup
   Typing filters the list; Enter picks when exactly one player matches. The team tag sits on the right. */
function modal(title, players, onPick, footer) {
  $('.md').remove();
  const overlay = $(`
    <div class="md"><div class="bx">
      <button class="x" title="Close">✕</button>
      <h3>${E(title)}</h3>
      <input id="pn" placeholder="Type jersey number…" inputmode="numeric" autocomplete="off">
      <div id="pl" class="pg"></div>
      <div class="mfoot"></div>
    </div></div>`).appendTo('body');
  const input = overlay.find('#pn');
  const list = overlay.find('#pl');

  function draw() {
    const typed = input.val().trim();
    const matches = players.filter(p => String(p.number).startsWith(typed));
    list.empty();
    matches.forEach(p => {
      $(`<button class="pb">
           <span class="who">${numBadge(p)} <span class="pn">${E(nm(p))}</span></span>
           <span class="tg" style="background:${col(p.teamId)};color:${ink(col(p.teamId))}">${E(ab(p.teamId))}</span>
         </button>`)
        .on('click', () => { overlay.remove(); onPick(p); })
        .appendTo(list);
    });
    if (!matches.length) list.text('No eligible player');
    return matches;
  }

  // Optional bottom area (e.g. technical foul): footer(box, close) fills it with HTML and wires its buttons
  if (footer) footer(overlay.find('.mfoot'), () => overlay.remove()); else overlay.find('.mfoot').remove();

  overlay.find('.x').on('click', () => overlay.remove());
  input.on('input', draw).on('keydown', e => {
    if (e.key == 'Escape') overlay.remove();
    if (e.key == 'Enter') {
      const matches = draw();
      const exact = matches.filter(p => String(p.number) === input.val().trim());
      const chosen = exact.length == 1 ? exact[0] : (matches.length == 1 ? matches[0] : null);
      if (chosen) { overlay.remove(); onPick(chosen); }
    }
  });
  draw();
  input.focus();
}

/* ---------- Player picker for points, fouls and other stats: ONE COLUMN PER TEAM ----------
   Active players (on court) are listed first in order of their numbers; with "show bench players" ticked the bench follows
   (for late additions). Typing a jersey number filters BOTH columns. Enter picks when exactly one player matches.
   title: text on top · g: the game · onPick(player) · footer: optional function(box, close) for the bottom area */
function pickPlayers(title, g, onPick, footer) {
  $('.md').remove();
  const teams = sheetSides(g);
  const overlay = $(`<div class="md" id="picker"><div class="bx mid">
      <button class="x" title="Close">✕</button>
      <h3>${E(title)}</h3>
      <div class="prow">
        <input id="pn" placeholder="Type jersey number… (both teams)" inputmode="numeric" autocomplete="off">
        <label class="pbench"><input type="checkbox" id="pbench" ${localStorage.pickBench == '1' ? 'checked' : ''}> show bench players</label>
      </div>
      <div id="pl" class="pcols"></div>
      <div class="mfoot"></div>
    </div></div>`).appendTo('body');
  const input = overlay.find('#pn'), list = overlay.find('#pl');

  const rows = t => {                                                   // active first, then (optionally) the bench, each by number
    const on = activeOf(g, t).sort((x, y) => byNumber(x.number, y.number));
    const bench = teamPlayers(t).filter(p => !g.active[t].includes(p.id)).sort((x, y) => byNumber(x.number, y.number));
    return { on, bench };
  };
  function draw() {
    const typed = input.val().trim(), showBench = overlay.find('#pbench').prop('checked');
    const match = p => String(p.number).startsWith(typed);
    let visible = [], hiddenBench = 0;
    list.html(teams.map(t => {
      const { on, bench } = rows(t);
      const shown = on.filter(match).concat(showBench ? bench.filter(match) : []);
      hiddenBench += showBench ? 0 : bench.filter(match).length;
      visible = visible.concat(shown);
      const btn = p => `<button class="pb ${g.active[t].includes(p.id) ? 'act' : 'benchp'}" data-id="${p.id}">
          <span class="who">${numBadge(p)} <span class="pn">${E(nm(p))}</span></span>
          <span class="stt">${g.active[t].includes(p.id) ? '● ON COURT' : 'BENCH'}</span></button>`;
      return `<div class="pcol" style="border-top:4px solid ${col(t)}"><h4 style="color:${col(t)}">${E(T(t).name)} <small>${g.active[t].length} on court</small></h4>
        <div class="pl1">${shown.map(btn).join('') || '<small>No match</small>'}</div></div>`;
    }).join(''));
    if (typed && !visible.length && hiddenBench) list.append('<div class="hint pnote">No active player with that number — tick “show bench players” to include the bench.</div>');
    return visible;
  }

  const choose = p => { overlay.remove(); onPick(p); };
  list.on('click', '.pb', function () { choose(PL($(this).data('id'))); });
  overlay.on('change', '#pbench', function () { localStorage.pickBench = this.checked ? '1' : '0'; draw(); input.focus(); });
  if (footer) footer(overlay.find('.mfoot'), () => overlay.remove()); else overlay.find('.mfoot').remove();
  overlay.find('.x').on('click', () => overlay.remove());
  // Keyboard: Tab goes  number box -> left team -> right team -> number box  (Shift+Tab goes back; a team with no players shown is skipped).
  // Up / Down move through the players of a team, Enter picks the highlighted player, Esc closes.
  overlay.on('keydown', e => {
    if (e.key == 'Escape') return overlay.remove();
    const cols = list.find('.pcol').toArray().map(c => $(c).find('.pb').toArray());
    const here = document.activeElement, inCol = cols.findIndex(c => c.includes(here));
    if (e.key == 'Tab') {
      const zones = ['input'].concat(cols.map((c, i) => (c.length ? i : null)).filter(z => z !== null));
      const at = (Math.max(0, inCol >= 0 ? zones.indexOf(inCol) : 0) + (e.shiftKey ? zones.length - 1 : 1)) % zones.length;
      e.preventDefault();
      if (zones[at] === 'input') input.focus(); else cols[zones[at]][0].focus();
    } else if ((e.key == 'ArrowDown' || e.key == 'ArrowUp') && inCol >= 0) {
      e.preventDefault();
      const c = cols[inCol], next = Math.max(0, Math.min(c.length - 1, c.indexOf(here) + (e.key == 'ArrowDown' ? 1 : -1)));
      c[next].focus();
    }
  });
  input.on('input', draw).on('keydown', e => {
    if (e.key == 'Escape') overlay.remove();
    if (e.key == 'Enter') {
      const matches = draw(), typed = input.val().trim();
      const exact = matches.filter(p => String(p.number) === typed);
      const chosen = exact.length == 1 ? exact[0] : (matches.length == 1 ? matches[0] : null);
      if (chosen) choose(chosen);
    }
  });
  draw();
  input.focus();
}

/* ---------- Big window that stays open until you close it (substitutions, starting players, breaks) ----------
   Returns { el: whole overlay, body: the content area, close() }.  dismissable=false hides the close button. */
function popup(id, dismissable = true) {
  $('#' + id).remove();
  const el = $(`<div class="md" id="${id}"><div class="bx wide">
      <button class="x" ${dismissable ? '' : 'style="display:none"'} title="Close">✕</button><div class="pc"></div></div></div>`).appendTo('body');
  el.find('.x').on('click', () => el.remove());
  return { el, body: el.find('.pc'), close: () => el.remove() };
}


/* ---------- Hamburger menu ----------
   hmenu([{ label, js, danger }]) returns the button + its list. The list is positioned under the button (position: fixed, so tables and cards never clip it). */
const HAMBURGER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
function hmenu(items) {
  return `<div class="hmenu"><button class="hbtn" aria-label="Menu" aria-haspopup="true" onclick="toggleHmenu(event,this)">${HAMBURGER}</button>
    <div class="hlist" role="menu">${items.map(i => `<button role="menuitem" class="${i.danger ? 'danger' : ''}" onclick="closeHmenus();${i.js}">${i.label}</button>`).join('')}</div></div>`;
}
function closeHmenus() { $('.hmenu.open').removeClass('open'); }
function toggleHmenu(e, btn) {
  e.stopPropagation();
  const m = $(btn).closest('.hmenu'), wasOpen = m.hasClass('open');
  closeHmenus();
  if (wasOpen) return;
  m.addClass('open');
  const list = m.find('.hlist'), r = btn.getBoundingClientRect();
  list.css({ top: Math.min(r.bottom + 4, innerHeight - list.outerHeight() - 6), left: Math.max(6, r.right - list.outerWidth()) });
}
$(document).on('click', closeHmenus).on('keydown', e => { if (e.key == 'Escape') closeHmenus(); });
$(window).on('scroll resize', closeHmenus);
