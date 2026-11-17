import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive, BadgeCheck, Edit3, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { PageOptionsMenu } from '../components/PageOptionsMenu';
import { ModalShell } from '../components/shared/ModalShell';
import { useDb } from '../context/DbContext';
import { exportPlayersCsv } from '../lib/export';
import { ab, byNumber, colRaw, ink, nm, teamColor } from '../lib/format';
import { KS, type StatKey, tot } from '../lib/stats';
import type { Player } from '../types';

type PlayerSortKey = 'number' | 'name' | 'team' | 'gp' | StatKey;

async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch('/api/upload/solo-photos', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Image upload failed');
  const data = (await res.json()) as { url?: string; path?: string };
  if (!data.url && !data.path) throw new Error('Server did not return an image URL');
  return data.url || data.path!;
}

export function PlayersPage() {
  const { db, getTeam, patch } = useDb();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTeamParam = searchParams.get('team');
  const [teamFilter, setTeamFilter] = useState<number | ''>(
    initialTeamParam ? Number(initialTeamParam) : '',
  );
  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState<{ key: PlayerSortKey; dir: 1 | -1 }>({
    key: 'pts',
    dir: -1,
  });

  // Add / Edit modal state
  const [editingPlayer, setEditingPlayer] = useState<Player | 'new' | null>(null);
  const [teamId, setTeamId] = useState<number>(0);
  const [number, setNumber] = useState<string>('');
  const [first, setFirst] = useState<string>('');
  const [last, setLast] = useState<string>('');
  const [nick, setNick] = useState<string>('');
  const [locale, setLocale] = useState<string>('');
  const [verified, setVerified] = useState<boolean>(false);
  const [photo, setPhoto] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);

  const seasons = useMemo(() => {
    if (!db) return [];
    const set = new Set(db.games.map((g) => g.season).filter(Boolean));
    return [...set].sort().reverse();
  }, [db]);

  const activeSeason = seasonFilter || seasons[0] || '';

  if (!db) {
    return <div className="p-4 text-sm text-[#8c9bc4]">Loading players…</div>;
  }

  const activeTeams = db.teams.filter((t) => !t.archived);

  const handleTeamFilterChange = (val: number | '') => {
    setTeamFilter(val);
    if (val === '') {
      searchParams.delete('team');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ team: String(val) }, { replace: true });
    }
  };

  const openNewPlayer = () => {
    const defaultTeam =
      typeof teamFilter === 'number' ? teamFilter : activeTeams[0]?.id ?? db.teams[0]?.id ?? 0;
    setEditingPlayer('new');
    setTeamId(defaultTeam);
    setNumber('');
    setFirst('');
    setLast('');
    setNick('');
    setLocale('');
    setVerified(false);
    setPhoto('');
  };

  const openEditPlayer = (p: Player) => {
    setEditingPlayer(p);
    setTeamId(p.teamId);
    setNumber(String(p.number));
    setFirst(p.first || '');
    setLast(p.last || '');
    setNick(p.nick || '');
    setLocale(p.locale || '');
    setVerified(!!p.verified);
    setPhoto(p.photo || '');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadImageFile(file);
      setPhoto(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    if (!teamId) return alert('Select a team');
    if (!first.trim() && !last.trim()) return alert('Enter a first or last name');
    const cleanNum = number.trim();
    if (!cleanNum) return alert('Enter a jersey number');

    const isNew = editingPlayer === 'new';
    const playerObj: Player = {
      id: isNew ? Date.now() : editingPlayer.id,
      teamId,
      number: cleanNum,
      first: first.trim(),
      last: last.trim(),
      nick: nick.trim(),
      locale: locale.trim(),
      verified,
      photo,
      archived: isNew ? false : editingPlayer.archived,
    };

    const nextPlayers = isNew
      ? [...db.players, playerObj]
      : db.players.map((p) => (p.id === playerObj.id ? playerObj : p));

    await patch({
      players: nextPlayers,
      log: `${isNew ? 'Added' : 'Updated'} player: #${playerObj.number} ${nm(playerObj)} (${ab(
        getTeam(teamId),
      )})`,
    });
    setEditingPlayer(null);
  };

  const toggleArchive = async (p: Player) => {
    const nextArchived = !p.archived;
    await patch({
      players: db.players.map((pl) => (pl.id === p.id ? { ...pl, archived: nextArchived } : pl)),
      log: `${nextArchived ? 'Archived' : 'Restored'} player: #${p.number} ${nm(p)}`,
    });
  };

  const deletePlayer = async (p: Player) => {
    const hasEvents = db.games.some((g) => g.events.some((ev) => ev.playerId === p.id || ev.outId === p.id));
    if (hasEvents) {
      return alert('This player has recorded game events. Archive them instead so box scores remain accurate.');
    }
    if (!confirm(`Delete player #${p.number} ${nm(p)}?`)) return;

    await patch({
      delPlayer: p.id,
      log: `Deleted player: #${p.number} ${nm(p)}`,
    });
  };

  const toggleSort = (key: PlayerSortKey) => {
    setSort((prev) => {
      if (prev.key !== key) {
        return { key, dir: key === 'gp' || KS.includes(key as StatKey) ? -1 : 1 };
      }
      return { key, dir: prev.dir === 1 ? -1 : 1 };
    });
  };

  const sortArrow = (k: PlayerSortKey) => (sort.key === k ? (sort.dir > 0 ? ' ▲' : ' ▼') : '');

  const q = search.trim().toLowerCase();
  const rows = db.players
    .filter((p) => {
      if (!showArchived && p.archived) return false;
      if (teamFilter !== '' && p.teamId !== teamFilter) return false;
      if (q) {
        const hay = `${p.number} ${p.first} ${p.last} ${p.nick} ${p.locale}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .map((p) => {
      const stats = tot(p.id, db.games, activeSeason || undefined);
      return { player: p, team: getTeam(p.teamId), stats };
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sort.key === 'number') cmp = byNumber(a.player.number, b.player.number);
      else if (sort.key === 'name') cmp = nm(a.player).localeCompare(nm(b.player));
      else if (sort.key === 'team') cmp = (a.team?.name || '').localeCompare(b.team?.name || '');
      else if (sort.key === 'gp') cmp = a.stats.gp - b.stats.gp;
      else {
        const aAvg = a.stats.gp ? a.stats[sort.key] / a.stats.gp : 0;
        const bAvg = b.stats.gp ? b.stats[sort.key] / b.stats.gp : 0;
        cmp = aAvg - bAvg || a.stats[sort.key] - b.stats[sort.key];
      }
      return cmp * sort.dir;
    });

  return (
    <>
      {editingPlayer && (
        <ModalShell maxWidth="max-w-[540px]" onClose={() => setEditingPlayer(null)}>
          <h3 className="mb-3 pr-10 text-lg font-bold text-[#eef2fb]">
            {editingPlayer === 'new' ? 'Add Player' : `Edit Player · #${editingPlayer.number} ${nm(editingPlayer)}`}
          </h3>

          <form onSubmit={handleSavePlayer} className="space-y-3">
            {/* Photo upload */}
            <div className="flex items-center gap-3 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
              {photo ? (
                <img src={photo} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-[#3a4a8f]" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16224d] text-sm font-extrabold text-[#8c9bc4]">
                  #{number || '0'}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2a3f87] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#354fa8]">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? 'Uploading…' : 'Upload Photo'}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto('')}
                    className="rounded-xl px-3 py-2 text-xs font-bold text-[#fca5a5] hover:bg-white/5"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_110px] gap-2.5">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Team *
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(Number(e.target.value))}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-2.5 text-sm text-white"
                >
                  {db.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({ab(t)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Jersey # *
                <input
                  required
                  maxLength={3}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="23"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-sm font-bold text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                First Name *
                <input
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  placeholder="Juan"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-sm text-white"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Last Name *
                <input
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  placeholder="Dela Cruz"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-sm text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Nickname
                <input
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="Optional"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-sm text-white"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Locale / Barangay
                <input
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  placeholder="e.g. Bancal"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-sm text-white"
                />
              </label>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3 text-xs font-bold text-[#eef2fb]">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="h-4 w-4 accent-[#4f7bff]"
              />
              League-verified player eligibility
            </label>

            <div className="flex justify-end gap-2 border-t border-[#1a2d6b] pt-3">
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="rounded-xl bg-[#2a3f87] px-4 py-2 text-sm font-bold text-white hover:bg-[#354fa8]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="rounded-xl bg-[#15803d] px-5 py-2 text-sm font-bold text-white hover:bg-[#166534] disabled:opacity-40"
              >
                Save Player
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
        {/* Header & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
          <div>
            <h1 className="text-xl font-extrabold text-white">Players</h1>
            <p className="text-xs text-[#8c9bc4]">
              Rosters, jersey numbers, and per-game season averages ({rows.length} shown)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or #…"
              className="h-9 w-44 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3 text-xs text-white placeholder-[#94a5d4]"
            />

            <select
              value={teamFilter}
              onChange={(e) => handleTeamFilterChange(e.target.value ? Number(e.target.value) : '')}
              className="h-9 rounded-xl border border-[#3a4a8f] bg-[#0f2160] px-3 text-xs font-bold text-white"
            >
              <option value="">All Teams</option>
              {db.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {seasons.length > 0 && (
              <select
                value={activeSeason}
                onChange={(e) => setSeasonFilter(e.target.value)}
                className="h-9 rounded-xl border border-[#3a4a8f] bg-[#0f2160] px-3 text-xs font-bold text-white"
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    Season {s}
                  </option>
                ))}
              </select>
            )}

            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#c7d2fe]">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-4 w-4 accent-[#4f7bff]"
              />
              Archived
            </label>

            <button
              type="button"
              onClick={openNewPlayer}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#15803d] px-4 text-xs font-extrabold text-white hover:bg-[#166534]"
            >
              <Plus className="h-4 w-4" /> Add Player
            </button>

            <PageOptionsMenu
              items={[{ label: 'Generate CSV', onClick: () => exportPlayersCsv(db) }]}
            />
          </div>
        </div>

        {/* Players Table */}
        <section className="overflow-hidden rounded-2xl border border-[#1a2d6b] bg-[#0a1530]">
          {rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#8c9bc4]">
              No players match the current filters. Click <b>+ Add Player</b> to register one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#16224d] text-[10px] uppercase text-[#8c9bc4]">
                    <th
                      onClick={() => toggleSort('number')}
                      className="w-[54px] cursor-pointer px-3 py-2.5 text-left hover:text-white"
                    >
                      #{sortArrow('number')}
                    </th>
                    <th
                      onClick={() => toggleSort('name')}
                      className="cursor-pointer px-3 py-2.5 text-left hover:text-white"
                    >
                      Player{sortArrow('name')}
                    </th>
                    <th
                      onClick={() => toggleSort('team')}
                      className="cursor-pointer px-3 py-2.5 text-left hover:text-white"
                    >
                      Team{sortArrow('team')}
                    </th>
                    <th
                      onClick={() => toggleSort('gp')}
                      className="cursor-pointer px-2 py-2.5 text-center hover:text-white"
                    >
                      GP{sortArrow('gp')}
                    </th>
                    {KS.map((k) => (
                      <th
                        key={k}
                        onClick={() => toggleSort(k)}
                        className="cursor-pointer px-2 py-2.5 text-center hover:text-white"
                      >
                        {k === 'to' ? 'TOPG' : k === 'pf' ? 'FPG' : `${k.toUpperCase()[0]}PG`}
                        {sortArrow(k)}
                      </th>
                    ))}
                    <th className="w-[104px] px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ player: p, team, stats }) => {
                    const c = teamColor(team);
                    const rawC = team ? colRaw(team, team.id) : '#3b82f6';
                    const avg = (val: number) => (stats.gp ? (val / stats.gp).toFixed(1) : '—');

                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-[#1a2d6b]/70 hover:bg-white/[0.03] ${
                          p.archived ? 'opacity-55' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <span
                            style={{ backgroundColor: rawC, color: ink(rawC) }}
                            className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full px-1.5 text-xs font-extrabold"
                          >
                            {p.number}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            {p.photo && (
                              <img src={p.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                            )}
                            <div>
                              <div className="flex items-center gap-1 font-bold text-white">
                                <span>{nm(p)}</span>
                                {p.verified && (
                                  <BadgeCheck className="h-3.5 w-3.5 text-[#38bdf8]" aria-label="Verified" />
                                )}
                                {p.archived && (
                                  <span className="ml-1 rounded bg-[#7f1d1d] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                                    ARCHIVED
                                  </span>
                                )}
                              </div>
                              {(p.nick || p.locale) && (
                                <div className="text-[11px] text-[#8c9bc4]">
                                  {[p.nick ? `"${p.nick}"` : '', p.locale].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-bold" style={{ color: c }}>
                          {team?.name || '—'}
                        </td>
                        <td className="px-2 py-2 text-center font-semibold">{stats.gp}</td>
                        {KS.map((k) => (
                          <td
                            key={k}
                            className={`px-2 py-2 text-center ${
                              k === 'pts' ? 'font-extrabold text-[#f2a501]' : 'text-[#eef2fb]'
                            }`}
                          >
                            {avg(stats[k])}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              title="Edit player"
                              onClick={() => openEditPlayer(p)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#cfd8ff] hover:bg-white/10"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={p.archived ? 'Restore player' : 'Archive player'}
                              onClick={() => toggleArchive(p)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#cfd8ff] hover:bg-white/10"
                            >
                              {p.archived ? (
                                <RotateCcw className="h-3.5 w-3.5" />
                              ) : (
                                <Archive className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Delete player"
                              onClick={() => deletePlayer(p)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#fca5a5] hover:bg-white/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}