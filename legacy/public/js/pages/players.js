/* pages/players.js - /players (searchable table, archive, delete) and /players/:id (profile, portrait, stats) */

let playerSeasonFilter = '';        // '' = all seasons
let playersShowArchived = false;
let playersPhotoFilter = '';        // '' = all | 'with' = has a picture | 'none' = no picture
let playersVerFilter = '';          // '' = all | 'yes' = identity verified | 'no' = not verified

pages.players = function (parts) {
  return parts[1] ? playerDetail(PL(parts[1])) : playersList();
};

function playersList() {
  const keys = ['pts', 'reb', 'ast', 'stl'];
  const list = DB.players
    .filter(p => playersShowArchived || !p.archived)
    .filter(p => !playersPhotoFilter || (playersPhotoFilter == 'none' ? !p.photo : !!p.photo))
    .filter(p => !playersVerFilter || (playersVerFilter == 'yes' ? !!p.verified : !p.verified))
    .sort((x, y) => (x.last + ', ' + x.first).localeCompare(y.last + ', ' + y.first));

  const rows = list.map(p => {
    const s = tot(p.id, playerSeasonFilter);
    return `<tr class="${p.archived ? 'arch' : ''}">
      <td>${p.id}</td>
      <td data-sort="${p.photo ? 1 : 0}" style="padding:3px 6px">${a('/players/' + p.id, im(p, 32))}<span class="sr">${p.photo ? 'with picture' : 'no picture'}</span></td>
      <td>${E(p.number)}</td>
      <td>${a('/players/' + p.id, E(fullName(p)))}${p.nick ? ` <small>“${E(p.nick)}”</small>` : ''}${p.archived ? ' <small>(archived)</small>' : ''}</td>
      <td>${E(p.locale || '')}</td>
      <td>${E(T(p.teamId).name || '')}</td>
      <td data-sort="${p.verified ? 1 : 0}">${p.verified ? `<b class="on">✔ Yes</b>${p.verifiedAt ? `<br><small>${E(fmtDateTime(p.verifiedAt))}</small>` : ''}` : '<span class="off">No</span>'}</td>
      <td>${s.gp}</td>
      ${keys.map(k => `<td data-sort="${s[k]}">${s[k]} / ${avg(s, k)}</td>`).join('')}
      <td style="text-align:right;padding:2px 4px">${hmenu([{ label: p.archived ? 'Restore' : 'Archive', js: `archivePlayer(${p.id},${!p.archived})` }, { label: 'Delete', js: `deletePlayer(${p.id})`, danger: true }])}</td>
    </tr>`;
  }).join('');

  return {
    bc: [['Players']],
    h: `${pageHead('Players', [{ label: 'Generate CSV', js: 'exportPlayersCsv()' }])}
      <div class="row">${fs('Season', 'onchange="playerSeasonFilter=this.value;route()"', opt([['', 'All seasons'], ...seasons().map(x => [x, x])], playerSeasonFilter), 's')}
        ${fs('Picture', 'onchange="playersPhotoFilter=this.value;route()"', opt([['', 'All'], ['with', 'With picture'], ['none', 'No picture']], playersPhotoFilter), 's')}
        ${fs('Identity', 'onchange="playersVerFilter=this.value;route()"', opt([['', 'All'], ['yes', 'Verified'], ['no', 'Not verified']], playersVerFilter), 's')}
        <label><input type="checkbox" ${playersShowArchived ? 'checked' : ''} onchange="playersShowArchived=this.checked;route()"> show archived players</label>
      </div>
      <table id="ptable" class="dt" data-dtkey="players">
        <thead><tr><th>ID</th><th>Photo</th><th>#</th><th>Player (Last, First)</th><th>Locale</th><th>Team</th><th>Verified</th><th>GP</th>${keys.map(k => `<th>${k.toUpperCase()} tot / avg</th>`).join('')}<th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
    after: () => $('#ptable').dataTableLite({ pageLength: 25 }),
  };
}

function playerDetail(p) {
  if (!p.id) return { h: 'Not found' };

  const career = tot(p.id);
  const seasonRows = seasons().map(season => {
    const t = tot(p.id, season);
    return [season, t.gp, ...KS.map(k => t[k] + ' / ' + avg(t, k))];
  });
  seasonRows.push(['<b>Career</b>', career.gp, ...KS.map(k => `<b>${career[k]} / ${avg(career, k)}</b>`)]);

  const gameRowsOfPlayer = DB.games
    .filter(g => g.status != 'scheduled' && (st(g.events)[p.id] || g.played.includes(p.id)))
    .map(g => {
      const line = st(g.events)[p.id] || Z();
      return [a('/games/' + g.id, g.date + (g.time ? ' ' + g.time : '')), E(ab(g.home)) + ' vs ' + E(ab(g.away)), ...KS.map(k => line[k])];
    });

  return {
    bc: [['Players', '/players'], [E(nm(p))]],
    h: `
      <div class="card hasmenu" style="display:flex;gap:14px;flex-wrap:wrap"><div class="cardmenu">${hmenu([{ label: p.archived ? 'Restore' : 'Archive', js: `archivePlayer(${p.id},${!p.archived})` }, { label: 'Delete', js: `deletePlayer(${p.id})`, danger: true }])}</div>
        ${im(p, 150)}
        <div>
          <h2>#${E(p.number)} ${E(fullName(p))} ${p.nick ? `"${E(p.nick)}"` : ''} ${p.verified ? '<small class="on" title="Identity verified">✔ verified</small>' : ''} ${p.archived ? '<small>(archived)</small>' : ''}</h2>
          ID ${p.id} · ${a('/teams/' + p.teamId, E(T(p.teamId).name))}${p.locale ? ' · ' + E(p.locale) : ''}<br>
          ${fi('First name', `id="pf" value="${E(p.first)}"`, 'm')}${fi('Last name', `id="pls" value="${E(p.last)}"`, 'm')}${fi('Nickname', `id="pk" value="${E(p.nick)}"`, 's')}${fi('Jersey #', `id="pnum" value="${E(p.number)}"`, 'xs')}
          ${fs('Team', 'id="ptm"', topts(p.teamId), 'l')}${fi('Locale', `id="ploc" value="${E(p.locale || '')}" title="Locale (text), e.g. town or barangay"`, 'm')}<br>
          <label><input type="checkbox" id="pver" ${p.verified ? 'checked' : ''} onchange="setVerified(${p.id},this.checked)"> Identity verified</label>
          <small>${p.verified ? 'Verified on ' + E(fmtDateTime(p.verifiedAt)) : 'Not verified'}</small> <small>(saved when ticked)</small><br>
          ${fx('Picture', 'type="file" accept="image/*" onchange="pic(this,d=>{pendingPhoto=d})"', 'l')}
          <button onclick="savePlayer(${p.id})">Save</button>
          ${p.photo ? `<button class="danger" onclick="removePhoto(${p.id})" title="Remove the current picture">Remove picture</button>` : ''}
        </div>
      </div>

      <h3>Season stats</h3>
      ${tb(['Season', 'GP', ...KS.map(k => k.toUpperCase() + ' tot/avg')], seasonRows)}

      <h3>Per game</h3>
      ${tb(['Date', 'Match', ...KS.map(k => k.toUpperCase())], gameRowsOfPlayer)}`,
  };
}
