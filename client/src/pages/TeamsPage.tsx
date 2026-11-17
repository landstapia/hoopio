import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Edit3, Plus, RotateCcw, Shield, Trash2, Upload, Users } from 'lucide-react';
import { ModalShell } from '../components/shared/ModalShell';
import { useDb } from '../context/DbContext';
import { ab, byNumber, colRaw, ink, nm, teamColor } from '../lib/format';
import type { Team, TeamCategory } from '../types';

const CATEGORIES: TeamCategory[] = ['Senior', 'Junior', 'Free'];

async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch('/api/upload/team-logos', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Image upload failed');
  const data = (await res.json()) as { url?: string; path?: string };
  if (!data.url && !data.path) throw new Error('Server did not return an image URL');
  return data.url || data.path!;
}

export function TeamsPage() {
  const { db, patch } = useDb();

  const [catFilter, setCatFilter] = useState<'all' | TeamCategory>('all');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Create / Edit modal state
  const [editingTeam, setEditingTeam] = useState<Team | 'new' | null>(null);
  const [name, setName] = useState('');
  const [abbr, setAbbr] = useState('');
  const [alias, setAlias] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [category, setCategory] = useState<TeamCategory>('Senior');
  const [coach, setCoach] = useState('');
  const [assistant, setAssistant] = useState('');
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [photo, setPhoto] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!db) {
    return <div className="p-4 text-sm text-[#8c9bc4]">Loading teams…</div>;
  }

  const openNewTeam = () => {
    setEditingTeam('new');
    setName('');
    setAbbr('');
    setAlias('');
    setColor('#3b82f6');
    setCategory('Senior');
    setCoach('');
    setAssistant('');
    setCaptainId(null);
    setPhoto('');
  };

  const openEditTeam = (team: Team) => {
    setEditingTeam(team);
    setName(team.name);
    setAbbr(team.abbr || '');
    setAlias(team.alias || '');
    setColor(colRaw(team, team.id));
    setCategory(team.category || 'Senior');
    setCoach(team.coach || '');
    setAssistant(team.assistant || '');
    setCaptainId(team.captainId ?? null);
    setPhoto(team.photo || '');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadImageFile(file);
      setPhoto(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Logo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    const cleanName = name.trim();
    if (!cleanName) return alert('Enter a team name');

    const cleanAbbr = (abbr.trim() || cleanName.slice(0, 3)).toUpperCase().slice(0, 5);
    const isNew = editingTeam === 'new';

    const teamObj: Team = {
      id: isNew ? Date.now() : editingTeam.id,
      name: cleanName,
      abbr: cleanAbbr,
      alias: alias.trim(),
      color,
      category,
      coach: coach.trim(),
      assistant: assistant.trim(),
      captainId,
      photo,
      archived: isNew ? false : editingTeam.archived,
    };

    const nextTeams = isNew
      ? [...db.teams, teamObj]
      : db.teams.map((t) => (t.id === teamObj.id ? teamObj : t));

    await patch({
      teams: nextTeams,
      log: `${isNew ? 'Created' : 'Updated'} team: ${teamObj.name} (${teamObj.abbr})`,
    });
    setEditingTeam(null);
  };

  const toggleArchive = async (team: Team) => {
    const nextArchived = !team.archived;
    await patch({
      teams: db.teams.map((t) => (t.id === team.id ? { ...t, archived: nextArchived } : t)),
      log: `${nextArchived ? 'Archived' : 'Restored'} team: ${team.name}`,
    });
  };

  const deleteTeam = async (team: Team) => {
    const hasGames = db.games.some((g) => g.home === team.id || g.away === team.id);
    if (hasGames) {
      return alert('This team has recorded games. Archive it instead of deleting so box scores stay intact.');
    }
    if (!confirm(`Delete team "${team.name}"? Players on this team will remain in the player pool.`)) return;

    await patch({
      delTeam: team.id,
      log: `Deleted team: ${team.name}`,
    });
  };

  const q = search.trim().toLowerCase();
  const filteredTeams = db.teams
    .filter((t) => {
      if (!showArchived && t.archived) return false;
      if (catFilter !== 'all' && (t.category || 'Senior') !== catFilter) return false;
      if (
        q &&
        !t.name.toLowerCase().includes(q) &&
        !ab(t).toLowerCase().includes(q) &&
        !(t.alias || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => Number(!!a.archived) - Number(!!b.archived) || a.name.localeCompare(b.name));

  const modalRoster =
    editingTeam && editingTeam !== 'new'
      ? db.players
          .filter((p) => p.teamId === editingTeam.id && !p.archived)
          .sort((a, b) => byNumber(a.number, b.number))
      : [];

  return (
    <>
      {editingTeam && (
        <ModalShell maxWidth="max-w-[560px]" onClose={() => setEditingTeam(null)}>
          <h3 className="mb-3 pr-10 text-lg font-bold text-[#eef2fb]">
            {editingTeam === 'new' ? 'Create New Team' : `Edit Team · ${editingTeam.name}`}
          </h3>

          <form onSubmit={handleSaveTeam} className="space-y-3">
            {/* Logo preview + upload */}
            <div className="flex items-center gap-3 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
              {photo ? (
                <img src={photo} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-[#3a4a8f]" />
              ) : (
                <div
                  style={{ backgroundColor: color, color: ink(color) }}
                  className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-extrabold"
                >
                  {(abbr || name || 'TM').slice(0, 3).toUpperCase()}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2a3f87] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#354fa8]">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? 'Uploading…' : 'Upload Logo'}
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

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_110px_64px]">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Team Name *
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Carmona Ballers"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-sm text-white"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Abbrev.
                <input
                  maxLength={5}
                  value={abbr}
                  onChange={(e) => setAbbr(e.target.value.toUpperCase())}
                  placeholder="CAR"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-sm font-bold uppercase text-white"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Color
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-[#3a4a8f] bg-[#0f1a44] p-1"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TeamCategory)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-2.5 text-sm text-white"
                >
                  {CATEGORIES.map((cVal) => (
                    <option key={cVal} value={cVal}>
                      {cVal}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Alias / Subtitle
                <input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Optional sponsor or division"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-sm text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Head Coach
                <input
                  value={coach}
                  onChange={(e) => setCoach(e.target.value)}
                  placeholder="Coach name"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-sm text-white"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Assistant Coach
                <input
                  value={assistant}
                  onChange={(e) => setAssistant(e.target.value)}
                  placeholder="Assistant coach name"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 text-sm text-white"
                />
              </label>
            </div>

            {editingTeam !== 'new' && (
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Team Captain (CAP on FIBA Scoresheet)
                <select
                  value={captainId ?? ''}
                  onChange={(e) => setCaptainId(e.target.value ? Number(e.target.value) : null)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-2.5 text-sm text-white"
                >
                  <option value="">— No captain selected —</option>
                  {modalRoster.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.number} {nm(p)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex justify-end gap-2 border-t border-[#1a2d6b] pt-3">
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="rounded-xl bg-[#2a3f87] px-4 py-2 text-sm font-bold text-white hover:bg-[#354fa8]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="rounded-xl bg-[#15803d] px-5 py-2 text-sm font-bold text-white hover:bg-[#166534] disabled:opacity-40"
              >
                Save Team
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
        {/* Header & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
          <div>
            <h1 className="text-xl font-extrabold text-white">Teams</h1>
            <p className="text-xs text-[#8c9bc4]">Manage club colors, coaches, captains, and rosters</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams…"
              className="h-9 w-44 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3 text-xs text-white placeholder-[#94a5d4]"
            />

            <div className="flex overflow-hidden rounded-xl border border-[#3a4a8f]">
              {(['all', ...CATEGORIES] as const).map((cVal) => (
                <button
                  key={cVal}
                  type="button"
                  onClick={() => setCatFilter(cVal)}
                  className={`h-9 px-3 text-xs font-extrabold capitalize transition ${
                    catFilter === cVal
                      ? 'bg-[#2a3f87] text-white'
                      : 'bg-[#0f1a44] text-[#c7d2fe] hover:bg-[#192b6e]'
                  }`}
                >
                  {cVal}
                </button>
              ))}
            </div>

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
              onClick={openNewTeam}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#15803d] px-4 text-xs font-extrabold text-white hover:bg-[#166534]"
            >
              <Plus className="h-4 w-4" /> New Team
            </button>
          </div>
        </div>

        {/* Team Cards Grid */}
        {filteredTeams.length === 0 ? (
          <div className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-6 text-center text-sm text-[#8c9bc4]">
            No teams found. Click <b>+ New Team</b> to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((t) => {
              const c = teamColor(t);
              const rawC = colRaw(t, t.id);
              const roster = db.players
                .filter((p) => p.teamId === t.id && !p.archived)
                .sort((a, b) => byNumber(a.number, b.number));

              return (
                <div
                  key={t.id}
                  style={{ borderTopColor: c }}
                  className={`flex flex-col justify-between gap-3 rounded-2xl border border-[#1a2d6b] border-t-4 bg-[#0a1530] p-4 ${
                    t.archived ? 'opacity-65' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        {t.photo ? (
                          <img src={t.photo} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <div
                            style={{ backgroundColor: rawC, color: ink(rawC) }}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
                          >
                            {ab(t)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 style={{ color: c }} className="truncate text-lg font-extrabold leading-tight">
                            {t.name}
                          </h3>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8c9bc4]">
                            <span className="rounded bg-[#16224d] px-1.5 py-0.5 font-bold text-[#c7d2fe]">
                              {ab(t)}
                            </span>
                            <span>{t.category || 'Senior'}</span>
                            {t.alias && <span>· {t.alias}</span>}
                          </div>
                        </div>
                      </div>

                      {t.archived && (
                        <span className="rounded-full bg-[#7f1d1d] px-2 py-0.5 text-[10px] font-extrabold text-white">
                          ARCHIVED
                        </span>
                      )}
                    </div>

                    {/* Coaching staff */}
                    <div className="mt-3 space-y-0.5 text-xs text-[#c7d2fe]">
                      <div>
                        <span className="text-[#8c9bc4]">Coach:</span> {t.coach || '—'}
                      </div>
                      {t.assistant && (
                        <div>
                          <span className="text-[#8c9bc4]">Asst. Coach:</span> {t.assistant}
                        </div>
                      )}
                    </div>

                    {/* Roster preview */}
                    <div className="mt-3 rounded-xl border border-[#1a2d6b] bg-[#071233] p-2.5">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[#8c9bc4]">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Roster ({roster.length})
                        </span>
                        <Link to={`/players?team=${t.id}`} className="text-[#f2a501] hover:underline">
                          Manage →
                        </Link>
                      </div>

                      {roster.length === 0 ? (
                        <p className="text-xs text-[#8c9bc4]">No active players</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {roster.slice(0, 10).map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1 rounded-md bg-[#16224d] px-2 py-0.5 text-[11px] text-[#eef2fb]"
                            >
                              <b style={{ color: c }}>#{p.number}</b>
                              <span className="max-w-[90px] truncate">{p.last || p.first}</span>
                              {t.captainId === p.id && (
                                <Shield className="h-3 w-3 text-[#f2a501]" aria-label="Captain" />
                              )}
                            </span>
                          ))}
                          {roster.length > 10 && (
                            <span className="px-1.5 py-0.5 text-[11px] text-[#8c9bc4]">
                              +{roster.length - 10} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-1.5 border-t border-[#1a2d6b] pt-2.5">
                    <button
                      type="button"
                      onClick={() => openEditTeam(t)}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#2a3f87] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-[#354fa8]"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleArchive(t)}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3 py-1.5 text-xs font-bold text-[#c7d2fe] hover:bg-[#192b6e]"
                    >
                      {t.archived ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </>
                      ) : (
                        <>
                          <Archive className="h-3.5 w-3.5" /> Archive
                        </>
                      )}
                    </button>

                    <span className="flex-1" />

                    <button
                      type="button"
                      title="Delete team"
                      onClick={() => deleteTeam(t)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-[#fca5a5] hover:bg-white/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}