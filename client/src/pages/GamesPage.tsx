import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Flag,
  Pencil,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { PageOptionsMenu } from '../components/PageOptionsMenu';
import { ModalShell } from '../shared/ModalShell';
import { useDb } from '../context/DbContext';
import { exportGamesCsv } from '../lib/export';
import { ab, BRAND, fc, nm, per, teamColor } from '../lib/format';
import { sc } from '../lib/stats';
import type { Game, TeamCategory } from '../types';

export function GamesPage() {
  const { db, getTeam, patch } = useDb();
  const navigate = useNavigate();

  const seasons = useMemo(() => {
    if (!db) return [];
    const set = new Set(db.games.map((g) => g.season).filter(Boolean));
    return [...set].sort().reverse();
  }, [db]);

  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TeamCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'scheduled' | 'final'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingGame, setDeletingGame] = useState<Game | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [forfeitGame, setForfeitGame] = useState<Game | null>(null);
  const [forfeitingTeamId, setForfeitingTeamId] = useState<number>(0);
  const [forfeiting, setForfeiting] = useState(false);

  // Edit / Reschedule modal state
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editHomeId, setEditHomeId] = useState<number>(0);
  const [editAwayId, setEditAwayId] = useState<number>(0);
  const [editSeason, setEditSeason] = useState<string>('');
  const [editCompetition, setEditCompetition] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [editPlace, setEditPlace] = useState<string>('');
  const [editRunningTime, setEditRunningTime] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // New game form state
  const [homeId, setHomeId] = useState<number>(0);
  const [awayId, setAwayId] = useState<number>(0);
  const [season, setSeason] = useState<string>('');
  const [competition, setCompetition] = useState<string>(BRAND.fullName);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>('18:00');
  const [place, setPlace] = useState<string>('Main Court');
  const [periodMin, setPeriodMin] = useState<string>('10');
  const [runningTime, setRunningTime] = useState<boolean>(false);

  const activeSeason = seasonFilter || seasons[0] || '';

  if (!db) {
    return <div className="p-4 text-sm text-[#8c9bc4]">Loading games…</div>;
  }

  const activeTeams = db.teams.filter((t) => !t.archived);

  const getTopScorer = (game: Game, teamId: number) => {
    if (game.isDefault) return null;
    const totals = new Map<number, number>();
    for (const ev of game.events) {
      if (ev.teamId === teamId && ev.type === 'pts' && ev.playerId != null) {
        totals.set(ev.playerId, (totals.get(ev.playerId) ?? 0) + (ev.pts ?? 0));
      }
    }

    let bestPlayerId: number | null = null;
    let bestPts = 0;
    for (const [playerId, pts] of totals.entries()) {
      if (pts > bestPts) {
        bestPts = pts;
        bestPlayerId = playerId;
      }
    }

    if (bestPlayerId == null || bestPts <= 0) return null;
    const player = db.players.find((p) => p.id === bestPlayerId);
    return { player, pts: bestPts };
  };

  const openCreateModal = () => {
    const filteredByCat =
      categoryFilter === 'all'
        ? activeTeams
        : activeTeams.filter((t) => t.category === categoryFilter);
    const pool = filteredByCat.length >= 2 ? filteredByCat : activeTeams;

    const first = pool[0]?.id ?? 0;
    const second = pool[1]?.id ?? pool[0]?.id ?? 0;
    setHomeId(first);
    setAwayId(second);
    setSeason(activeSeason || String(new Date().getFullYear()));
    setCompetition(BRAND.fullName);
    setDate(new Date().toISOString().slice(0, 10));
    setTime('18:00');
    setPlace('Main Court');
    setPeriodMin('10');
    setRunningTime(false);
    setFormError(
      activeTeams.length < 2
        ? 'You need at least 2 active teams in the Teams page before creating a game.'
        : null
    );
    setCreateOpen(true);
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (activeTeams.length < 2) {
      setFormError('You need at least 2 active teams before creating a game.');
      return;
    }
    if (!homeId || !awayId) {
      setFormError('Select both Home and Away teams.');
      return;
    }
    if (homeId === awayId) {
      setFormError('Home and Away teams must be different.');
      return;
    }
    const mins = parseFloat(periodMin);
    if (!(mins > 0)) {
      setFormError('Enter a valid period length in minutes.');
      return;
    }

    const trimmedSeason = season.trim() || String(new Date().getFullYear());

    setSaving(true);
    try {
      await patch({
        newGame: {
          season: trimmedSeason,
          date,
          time,
          home: homeId,
          away: awayId,
          runningTime,
          competition: competition.trim() || BRAND.fullName,
          place: place.trim() || 'Main Court',
        },
        live: { periodLen: Math.round(mins * 60000) },
        log: `Game scheduled: ${ab(getTeam(homeId))} vs ${ab(getTeam(awayId))}`,
      });

      setSeasonFilter(trimmedSeason);
      setStatusFilter('all');
      setCreateOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create game.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (game: Game) => {
    setEditingGame(game);
    setEditHomeId(game.home);
    setEditAwayId(game.away);
    setEditSeason(game.season);
    setEditCompetition(game.competition);
    setEditDate(game.date);
    setEditTime(game.time);
    setEditPlace(game.place);
    setEditRunningTime(game.runningTime);
    setEditError(null);
  };

  const handleEditGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame) return;
    setEditError(null);

    if (!editHomeId || !editAwayId) {
      setEditError('Select both Home and Away teams.');
      return;
    }
    if (editHomeId === editAwayId) {
      setEditError('Home and Away teams must be different.');
      return;
    }

    const trimmedSeason = editSeason.trim() || editingGame.season;
    const teamsChanged = editHomeId !== editingGame.home || editAwayId !== editingGame.away;

    setEditSaving(true);
    try {
      await patch({
        games: [
          {
            ...editingGame,
            home: editHomeId,
            away: editAwayId,
            season: trimmedSeason,
            competition: editCompetition.trim() || BRAND.fullName,
            date: editDate,
            time: editTime,
            place: editPlace.trim() || 'Main Court',
            runningTime: editRunningTime,
            ...(teamsChanged
              ? {
                  adj: { [editHomeId]: 0, [editAwayId]: 0 },
                  active: { [editHomeId]: [], [editAwayId]: [] },
                }
              : {}),
          },
        ],
        log: `Game #${editingGame.no} rescheduled/updated: ${ab(getTeam(editHomeId))} vs ${ab(getTeam(editAwayId))}`,
      });

      setEditingGame(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update game.');
    } finally {
      setEditSaving(false);
    }
  };

  const setLive = async (game: Game) => {
    const isAlreadyLive = db.live.gameId === game.id;
    const len = db.live.periodLen || 600000;
    const updatedGame: Game = {
      ...game,
      status: 'live',
      active: game.active ?? { [game.home]: [], [game.away]: [] },
      played: game.played ?? [],
    };

    const nextGames = db.games.map((g) => {
      if (g.id === game.id) return updatedGame;
      if (g.status === 'live') return { ...g, status: 'scheduled' as const };
      return g;
    });

    await patch({
      games: nextGames,
      live: isAlreadyLive
        ? { gameId: game.id }
        : {
            gameId: game.id,
            period: 1,
            clock: len,
            running: false,
            shot: 24000,
            shotOn: true,
            shotHold: false,
            arrow: null,
            swap: false,
            timeouts: { [game.home]: 2, [game.away]: 2 },
            names: { [game.home]: ab(getTeam(game.home)), [game.away]: ab(getTeam(game.away)) },
            toKind: null,
            toTeam: null,
            toLeft: 0,
            toSuspended: false,
          },
      log: `Game #${game.no} set LIVE (${ab(getTeam(game.home))} vs ${ab(getTeam(game.away))})`,
    });

    navigate('/officiating');
  };

  const toggleFinal = async (game: Game) => {
    const nextStatus = game.status === 'final' ? 'scheduled' : 'final';
    const clearLive = db.live.gameId === game.id && nextStatus === 'final';
    await patch({
      games: [
        {
          ...game,
          status: nextStatus,
          ...(nextStatus === 'scheduled' && game.isDefault
            ? { isDefault: false, adj: { [game.home]: 0, [game.away]: 0 } }
            : {}),
        },
      ],
      ...(clearLive ? { live: { gameId: null, running: false } } : {}),
      log: `Game #${game.no} marked ${nextStatus.toUpperCase()}`,
    });
  };

  const openForfeitModal = (game: Game) => {
    setForfeitGame(game);
    setForfeitingTeamId(game.away);
  };

  const confirmForfeit = async () => {
    if (!forfeitGame || !forfeitingTeamId) return;
    setForfeiting(true);
    try {
      const winnerId =
        forfeitingTeamId === forfeitGame.home ? forfeitGame.away : forfeitGame.home;
      const clearLive = db.live.gameId === forfeitGame.id;

      await patch({
        games: [
          {
            ...forfeitGame,
            status: 'final',
            isDefault: true,
            events: [],
            adj: {
              [winnerId]: 20,
              [forfeitingTeamId]: 0,
            },
          },
        ],
        ...(clearLive ? { live: { gameId: null, running: false } } : {}),
        log: `Game #${forfeitGame.no} forfeited by ${ab(getTeam(forfeitingTeamId))} (20–0 ${ab(getTeam(winnerId))})`,
      });
      setForfeitGame(null);
    } finally {
      setForfeiting(false);
    }
  };

  const confirmDeleteGame = async () => {
    if (!deletingGame) return;
    setDeleting(true);
    try {
      const clearLive = db.live.gameId === deletingGame.id;
      await patch({
        delGame: deletingGame.id,
        ...(clearLive ? { live: { gameId: null, running: false } } : {}),
        log: `Game #${deletingGame.no} deleted`,
      });
      setDeletingGame(null);
    } finally {
      setDeleting(false);
    }
  };

  const seasonGames = db.games.filter((g) => {
    if (activeSeason && g.season !== activeSeason) return false;
    if (categoryFilter !== 'all') {
      const homeCat = getTeam(g.home)?.category;
      const awayCat = getTeam(g.away)?.category;
      if (homeCat !== categoryFilter && awayCat !== categoryFilter) return false;
    }
    return true;
  });

  const statusCounts = {
    all: seasonGames.length,
    live: seasonGames.filter((g) => g.status === 'live').length,
    scheduled: seasonGames.filter((g) => g.status === 'scheduled').length,
    final: seasonGames.filter((g) => g.status === 'final').length,
  };

  const query = searchQuery.trim().toLowerCase();

  const filteredGames = [...seasonGames]
    .filter((g) => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      if (!query) return true;
      const home = getTeam(g.home);
      const away = getTeam(g.away);
      const haystack = [
        `#${g.no}`,
        String(g.no),
        home?.name,
        ab(home),
        home?.category,
        away?.name,
        ab(away),
        away?.category,
        g.place,
        g.date,
        g.competition,
        g.isDefault ? 'forfeit' : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => {
      const aLive = db.live.gameId === a.id && a.status === 'live' ? 1 : 0;
      const bLive = db.live.gameId === b.id && b.status === 'live' ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;
      return `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`) || b.no - a.no;
    });

  return (
    <>
      {createOpen && (
        <ModalShell maxWidth="max-w-[540px]" onClose={() => setCreateOpen(false)}>
          <h3 className="mb-3 pr-10 text-lg font-bold text-[#eef2fb]">Schedule New Game</h3>

          <form onSubmit={handleCreateGame} className="space-y-3">
            {formError && (
              <div className="rounded-xl border border-red-800 bg-red-900/50 px-3 py-2 text-xs font-bold text-red-200">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Home Team (Light)
                <select
                  value={homeId}
                  onChange={(e) => setHomeId(Number(e.target.value))}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-2.5 text-sm text-white"
                >
                  {activeTeams.length === 0 && <option value={0}>No active teams</option>}
                  {activeTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({ab(t)}) · {t.category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Away Team (Dark)
                <select
                  value={awayId}
                  onChange={(e) => setAwayId(Number(e.target.value))}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-2.5 text-sm text-white"
                >
                  {activeTeams.length === 0 && <option value={0}>No active teams</option>}
                  {activeTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({ab(t)}) · {t.category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Competition / League
                <input
                  value={competition}
                  onChange={(e) => setCompetition(e.target.value)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Season
                <input
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Period (min)
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={periodMin}
                  onChange={(e) => setPeriodMin(e.target.value)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Time
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Venue
                <input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Main Court"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
            </div>

            <div className="rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#eef2fb]">
                <input
                  type="checkbox"
                  checked={runningTime}
                  onChange={(e) => setRunningTime(e.target.checked)}
                  className="h-4 w-4 accent-[#4f7bff]"
                />
                Running time (clock keeps running during fouls &amp; substitutions)
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#1a2d6b] pt-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl bg-[#2a3f87] px-4 py-2 text-sm font-bold text-white hover:bg-[#354fa8]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || activeTeams.length < 2}
                className="rounded-xl bg-[#15803d] px-5 py-2 text-sm font-bold text-white hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create Game'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {editingGame && (
        <ModalShell
          maxWidth="max-w-[540px]"
          onClose={() => {
            if (!editSaving) setEditingGame(null);
          }}
        >
          <h3 className="mb-3 pr-10 text-lg font-bold text-[#eef2fb]">
            Edit / Reschedule Game #{editingGame.no}
          </h3>

          <form onSubmit={handleEditGame} className="space-y-3">
            {editError && (
              <div className="rounded-xl border border-red-800 bg-red-900/50 px-3 py-2 text-xs font-bold text-red-200">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Home Team (Light)
                <select
                  value={editHomeId}
                  onChange={(e) => setEditHomeId(Number(e.target.value))}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-2.5 text-sm text-white"
                >
                  {db.teams
                    .filter((t) => !t.archived || t.id === editingGame.home)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({ab(t)}) · {t.category}
                      </option>
                    ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Away Team (Dark)
                <select
                  value={editAwayId}
                  onChange={(e) => setEditAwayId(Number(e.target.value))}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-2.5 text-sm text-white"
                >
                  {db.teams
                    .filter((t) => !t.archived || t.id === editingGame.away)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({ab(t)}) · {t.category}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Competition / League
                <input
                  value={editCompetition}
                  onChange={(e) => setEditCompetition(e.target.value)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Season
                <input
                  value={editSeason}
                  onChange={(e) => setEditSeason(e.target.value)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Date
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Time
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Venue
                <input
                  value={editPlace}
                  onChange={(e) => setEditPlace(e.target.value)}
                  placeholder="Main Court"
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
            </div>

            <div className="rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#eef2fb]">
                <input
                  type="checkbox"
                  checked={editRunningTime}
                  onChange={(e) => setEditRunningTime(e.target.checked)}
                  className="h-4 w-4 accent-[#4f7bff]"
                />
                Running time (clock keeps running during fouls &amp; substitutions)
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#1a2d6b] pt-3">
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEditingGame(null)}
                className="rounded-xl bg-[#2a3f87] px-4 py-2 text-sm font-bold text-white hover:bg-[#354fa8] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="rounded-xl bg-[#15803d] px-5 py-2 text-sm font-bold text-white hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {forfeitGame && (
        <ModalShell
          maxWidth="max-w-[460px]"
          onClose={() => {
            if (!forfeiting) setForfeitGame(null);
          }}
        >
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-950/60 text-[#fbbf24]">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#eef2fb]">
                Mark Game #{forfeitGame.no} as Forfeit
              </h3>
              <p className="mt-0.5 text-xs text-[#8c9bc4]">
                Select the forfeiting team. FIBA forfeit awards a 20–0 win to the opponent.
              </p>
            </div>
          </div>

          <div className="mt-3.5 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#94a5d4]">
              Which team forfeited?
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[forfeitGame.home, forfeitGame.away].map((tid, idx) => {
                const team = getTeam(tid);
                const selected = forfeitingTeamId === tid;
                return (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => setForfeitingTeamId(tid)}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                      selected
                        ? 'border-amber-400 bg-amber-950/50 ring-1 ring-amber-400'
                        : 'border-[#1a2d6b] bg-[#071233] hover:border-[#3a4a8f]'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase text-[#8c9bc4]">
                      {idx === 0 ? 'Home' : 'Away'}
                    </span>
                    <span
                      style={{ color: teamColor(team) }}
                      className="mt-0.5 text-sm font-extrabold"
                    >
                      {ab(team)}
                    </span>
                    <span className="w-full truncate text-xs text-[#c7d2fe]">{team?.name}</span>
                  </button>
                );
              })}
            </div>

            {forfeitingTeamId > 0 && (
              <div className="rounded-xl border border-[#1a2d6b] bg-[#071233] p-3 text-xs text-[#c7d2fe]">
                Official result:{' '}
                <strong className="text-white">
                  {ab(getTeam(forfeitGame.home))}{' '}
                  {forfeitingTeamId === forfeitGame.home ? '0 – 20' : '20 – 0'}{' '}
                  {ab(getTeam(forfeitGame.away))}
                </strong>{' '}
                (Forfeit by{' '}
                <strong className="text-[#fbbf24]">
                  {getTeam(forfeitingTeamId)?.name ?? ab(getTeam(forfeitingTeamId))}
                </strong>
                ).
                {db.live.gameId === forfeitGame.id && forfeitGame.status === 'live' && (
                  <p className="mt-1.5 font-bold text-[#fbbf24]">
                    ⚠ This game is currently LIVE and will be ended on the officiating page.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-[#1a2d6b] pt-3">
            <button
              type="button"
              disabled={forfeiting}
              onClick={() => setForfeitGame(null)}
              className="rounded-xl bg-[#2a3f87] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#354fa8] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={forfeiting || !forfeitingTeamId}
              onClick={() => void confirmForfeit()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#d97706] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#b45309] disabled:opacity-50"
            >
              <Flag className="h-4 w-4" />
              {forfeiting ? 'Saving…' : 'Confirm Forfeit'}
            </button>
          </div>
        </ModalShell>
      )}

      {deletingGame && (
        <ModalShell
          maxWidth="max-w-[440px]"
          onClose={() => {
            if (!deleting) setDeletingGame(null);
          }}
        >
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/40 bg-red-950/60 text-[#f87171]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#eef2fb]">
                Delete Game #{deletingGame.no}?
              </h3>
              <p className="mt-1 text-xs text-[#8c9bc4]">
                {ab(getTeam(deletingGame.home))} vs {ab(getTeam(deletingGame.away))} ·{' '}
                {deletingGame.date} {deletingGame.time}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3 text-xs text-[#c7d2fe]">
            <p>
              This will permanently remove{' '}
              <strong className="text-white">
                {getTeam(deletingGame.home)?.name ?? ab(getTeam(deletingGame.home))}
              </strong>{' '}
              vs{' '}
              <strong className="text-white">
                {getTeam(deletingGame.away)?.name ?? ab(getTeam(deletingGame.away))}
              </strong>
              {deletingGame.events.length > 0 && (
                <>
                  {' '}
                  and its <strong className="text-white">{deletingGame.events.length}</strong>{' '}
                  recorded play-by-play events
                </>
              )}
              . This action cannot be undone.
            </p>
            {db.live.gameId === deletingGame.id && deletingGame.status === 'live' && (
              <p className="mt-2 font-bold text-[#fbbf24]">
                ⚠ This game is currently LIVE and will be cleared from the officiating workstation.
              </p>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-[#1a2d6b] pt-3">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeletingGame(null)}
              className="rounded-xl bg-[#2a3f87] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#354fa8] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void confirmDeleteGame()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#b91c1c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#991b1b] disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting…' : 'Delete Game'}
            </button>
          </div>
        </ModalShell>
      )}

      <div className="mx-auto flex max-w-[1400px] flex-col gap-3">
        {/* Header & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
          <div>
            <h1 className="text-xl font-extrabold text-white">Games</h1>
            <p className="text-xs text-[#8c9bc4]">
              Schedule games, launch officiating, or open official reports
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8c9bc4]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team, #, court…"
                className="h-9 w-44 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] pl-8 pr-2.5 text-xs text-white placeholder-[#8c9bc4] focus:border-[#8ab4ff] focus:outline-none sm:w-52"
              />
            </div>

            <select
              aria-label="Filter by division"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | TeamCategory)}
              className="h-9 rounded-xl border border-[#3a4a8f] bg-[#0f2160] px-3 text-xs font-bold text-white"
            >
              <option value="all">All Divisions</option>
              <option value="Senior">Senior</option>
              <option value="Junior">Junior</option>
              <option value="Free">Free</option>
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

            <div className="flex overflow-hidden rounded-xl border border-[#3a4a8f]">
              {(['all', 'live', 'scheduled', 'final'] as const).map((stVal) => (
                <button
                  key={stVal}
                  type="button"
                  onClick={() => setStatusFilter(stVal)}
                  className={`h-9 px-3 text-xs font-extrabold capitalize transition ${
                    statusFilter === stVal
                      ? 'bg-[#2a3f87] text-white'
                      : 'bg-[#0f1a44] text-[#c7d2fe] hover:bg-[#192b6e]'
                  }`}
                >
                  {stVal} ({statusCounts[stVal]})
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#15803d] px-4 text-xs font-extrabold text-white hover:bg-[#166534]"
            >
              <Plus className="h-4 w-4" /> New Game
            </button>

            <PageOptionsMenu
              items={[{ label: 'Generate CSV', onClick: () => exportGamesCsv(db) }]}
            />
          </div>
        </div>

        {/* Games List */}
        {filteredGames.length === 0 ? (
          <div className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-8 text-center text-sm text-[#8c9bc4]">
            No games match the current filters. Click <b>+ New Game</b> to schedule one.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredGames.map((g) => {
              const home = getTeam(g.home);
              const away = getTeam(g.away);
              const hs = sc(g, g.home);
              const as = sc(g, g.away);
              const isLive = db.live.gameId === g.id && g.status === 'live';
              const homeTop = getTopScorer(g, g.home);
              const awayTop = getTopScorer(g, g.away);
              const division = home?.category || away?.category;
              const homeForfeited = Boolean(g.isDefault && hs < as);
              const awayForfeited = Boolean(g.isDefault && as < hs);

              return (
                <div
                  key={g.id}
                  className={`flex flex-col justify-between gap-3 rounded-xl border bg-[#0a1530] px-4 py-3 transition hover:bg-[#0d1b3d] lg:flex-row lg:items-center ${
                    isLive ? 'border-2 border-[#f2a501]' : 'border-[#1a2d6b]'
                  }`}
                >
                  {/* Left: Game #, Division, RT & Status Tag, Date/Venue */}
                  <div className="min-w-0 lg:w-[310px] lg:shrink-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                        Game #{g.no}
                      </span>

                      {division && (
                        <span className="rounded-md border border-[#3a4a8f] bg-[#0f1a44] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c7d2fe]">
                          {division}
                        </span>
                      )}

                      {g.runningTime && (
                        <span className="rounded-md bg-[#16224d] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#fbbf24]">
                          RT
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          g.status === 'live'
                            ? 'bg-[#dc2626] text-white'
                            : g.status === 'scheduled'
                              ? 'bg-[#1d4ed8] text-white'
                              : 'bg-[#1e2a6b] text-[#c7d2fe]'
                        }`}
                      >
                        {isLive
                          ? `● LIVE · Q${per(db.live.period)} ${fc(db.live.clock)}`
                          : g.status === 'live'
                            ? '● LIVE'
                            : g.status}
                      </span>
                    </div>

                    <div className="mt-0.5 truncate text-xs text-[#8c9bc4]">
                      {g.date} · {g.time} · {g.place}
                    </div>
                  </div>

                  {/* Center: Matchup, Score & Top Scorer per Team */}
                  <div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                    <div className="flex items-center justify-end gap-2.5 text-right">
                      <div className="min-w-0">
                        <div className="flex items-center justify-end gap-2">
                          {homeForfeited && (
                            <span className="shrink-0 rounded-md bg-amber-950/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#fbbf24] ring-1 ring-amber-500/50">
                              FORFEIT
                            </span>
                          )}
                          <div
                            style={{ color: teamColor(home) }}
                            className="truncate text-lg font-extrabold leading-tight tracking-wide sm:text-2xl"
                          >
                            {ab(home)}
                          </div>
                        </div>
                        <div className="truncate text-[11px] text-[#c7d2fe]">{home?.name}</div>
                        {homeTop && (
                          <div className="mt-0.5 inline-flex max-w-full items-center justify-end gap-1 truncate text-[11px] font-semibold text-[#fbbf24]">
                            <Star className="h-3 w-3 shrink-0 fill-[#fbbf24] text-[#fbbf24]" />
                            <span className="truncate">
                              #{homeTop.player?.number ?? '?'} {nm(homeTop.player)} · {homeTop.pts} pts
                            </span>
                          </div>
                        )}
                      </div>
                      <span
                        style={{ backgroundColor: teamColor(home) }}
                        className="h-11 w-1.5 shrink-0 rounded-full"
                      />
                    </div>

                    <div
                      style={{ fontFamily: 'Arial, sans-serif' }}
                      className="min-w-[84px] rounded-lg bg-[#071233] px-3 py-1.5 text-center text-lg font-extrabold tabular-nums text-white sm:text-xl"
                    >
                      {g.status === 'scheduled' ? (
                        <span className="text-xs font-bold tracking-widest text-[#8c9bc4]">VS</span>
                      ) : (
                        `${hs} – ${as}`
                      )}
                    </div>

                    <div className="flex items-center justify-start gap-2.5 text-left">
                      <span
                        style={{ backgroundColor: teamColor(away) }}
                        className="h-11 w-1.5 shrink-0 rounded-full"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center justify-start gap-2">
                          <div
                            style={{ color: teamColor(away) }}
                            className="truncate text-lg font-extrabold leading-tight tracking-wide sm:text-2xl"
                          >
                            {ab(away)}
                          </div>
                          {awayForfeited && (
                            <span className="shrink-0 rounded-md bg-amber-950/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#fbbf24] ring-1 ring-amber-500/50">
                              FORFEIT
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[11px] text-[#c7d2fe]">{away?.name}</div>
                        {awayTop && (
                          <div className="mt-0.5 inline-flex max-w-full items-center justify-start gap-1 truncate text-[11px] font-semibold text-[#fbbf24]">
                            <Star className="h-3 w-3 shrink-0 fill-[#fbbf24] text-[#fbbf24]" />
                            <span className="truncate">
                              #{awayTop.player?.number ?? '?'} {nm(awayTop.player)} · {awayTop.pts} pts
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-[#1a2d6b] pt-2.5 lg:shrink-0 lg:justify-end lg:border-t-0 lg:pt-0">
                    {g.status !== 'final' && (
                      <button
                        type="button"
                        onClick={() => setLive(g)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#1d4ed8] px-3 text-xs font-extrabold text-white transition hover:bg-[#1e40af]"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {isLive ? 'Open Officiating' : 'Set Live'}
                      </button>
                    )}

                    {g.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => openEditModal(g)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#3a4a8f] bg-[#16224d] px-2.5 text-xs font-extrabold text-[#eef2fb] transition hover:bg-[#243675]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleFinal(g)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#2a3f87] px-2.5 text-xs font-extrabold text-white transition hover:bg-[#354fa8]"
                    >
                      {g.status === 'final' ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" /> Reopen
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Finalize
                        </>
                      )}
                    </button>

                    {g.status !== 'final' && (
                      <button
                        type="button"
                        onClick={() => openForfeitModal(g)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-950/60 px-2.5 text-xs font-extrabold text-[#fbbf24] transition hover:bg-amber-900/70"
                      >
                        <Flag className="h-3.5 w-3.5" /> Forfeit
                      </button>
                    )}

                    <Link
                      to={`/games/${g.id}/statistics`}
                      target="_blank"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-xs font-bold text-[#c7d2fe] transition hover:bg-[#192b6e]"
                    >
                      <FileText className="h-3.5 w-3.5" /> Box Score
                    </Link>

                    <Link
                      to={`/games/${g.id}/scoresheet`}
                      target="_blank"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-xs font-bold text-[#c7d2fe] transition hover:bg-[#192b6e]"
                    >
                      <Printer className="h-3.5 w-3.5" /> FIBA Sheet
                    </Link>

                    <button
                      type="button"
                      title="Delete game"
                      aria-label={`Delete Game #${g.no}`}
                      onClick={() => setDeletingGame(g)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#fca5a5] transition hover:bg-white/10"
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