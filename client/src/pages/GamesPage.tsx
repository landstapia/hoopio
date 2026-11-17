import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, Play, Plus, Printer, RotateCcw, Trash2, Trophy } from 'lucide-react';
import { PageOptionsMenu } from '../components/PageOptionsMenu';
import { ModalShell } from '../components/shared/ModalShell';
import { useDb } from '../context/DbContext';
import { exportGamesCsv } from '../lib/export';
import { ab, BRAND, teamColor } from '../lib/format';
import { sc } from '../lib/stats';
import type { Game } from '../types';

export function GamesPage() {
  const { db, getTeam, patch } = useDb();
  const navigate = useNavigate();

  const seasons = useMemo(() => {
    if (!db) return [];
    const set = new Set(db.games.map((g) => g.season).filter(Boolean));
    return [...set].sort().reverse();
  }, [db]);

  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'scheduled' | 'final'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  // New game form state
  const [homeId, setHomeId] = useState<number>(0);
  const [awayId, setAwayId] = useState<number>(0);
  const [season, setSeason] = useState<string>('');
  const [competition, setCompetition] = useState<string>(BRAND.fullName);
  const [gameNo, setGameNo] = useState<string>('1');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>('18:00');
  const [place, setPlace] = useState<string>('Main Court');
  const [periodMin, setPeriodMin] = useState<string>('10');
  const [runningTime, setRunningTime] = useState<boolean>(false);
  const [rtLast2, setRtLast2] = useState<boolean>(true);

  const activeSeason = seasonFilter || seasons[0] || '';

  const standings = useMemo(() => {
    if (!db) return [];
    const seasonGames = db.games.filter(
      (g) => g.status === 'final' && (!activeSeason || g.season === activeSeason),
    );
    const rows = db.teams
      .filter((t) => !t.archived)
      .map((t) => ({ team: t, gp: 0, w: 0, l: 0, pf: 0, pa: 0 }));
    const byId = new Map(rows.map((r) => [r.team.id, r]));

    for (const g of seasonGames) {
      const hs = sc(g, g.home);
      const as = sc(g, g.away);
      const hRow = byId.get(g.home);
      const aRow = byId.get(g.away);
      if (hRow) {
        hRow.gp++;
        hRow.pf += hs;
        hRow.pa += as;
        if (hs > as) hRow.w++;
        else if (as > hs) hRow.l++;
      }
      if (aRow) {
        aRow.gp++;
        aRow.pf += as;
        aRow.pa += hs;
        if (as > hs) aRow.w++;
        else if (hs > as) aRow.l++;
      }
    }

    return rows
      .filter((r) => r.gp > 0 || seasonGames.length === 0)
      .sort((a, b) => b.w - a.w || a.l - b.l || b.pf - b.pa - (a.pf - a.pa));
  }, [db, activeSeason]);

  if (!db) {
    return <div className="p-4 text-sm text-[#8c9bc4]">Loading games…</div>;
  }

  const activeTeams = db.teams.filter((t) => !t.archived);

  const openCreateModal = () => {
    const first = activeTeams[0]?.id ?? 0;
    const second = activeTeams[1]?.id ?? activeTeams[0]?.id ?? 0;
    const nextNo = db.games.reduce((m, g) => Math.max(m, g.no || 0), 0) + 1;
    setHomeId(first);
    setAwayId(second);
    setSeason(activeSeason || String(new Date().getFullYear()));
    setCompetition(BRAND.fullName);
    setGameNo(String(nextNo));
    setDate(new Date().toISOString().slice(0, 10));
    setTime('18:00');
    setPlace('Main Court');
    setPeriodMin('10');
    setRunningTime(false);
    setRtLast2(true);
    setCreateOpen(true);
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeId || !awayId) return alert('Select both teams');
    if (homeId === awayId) return alert('Home and away teams must be different');
    const mins = parseFloat(periodMin);
    if (!(mins > 0)) return alert('Enter a valid period length in minutes');

    const newGame: Game = {
      id: Date.now(),
      season: season.trim() || String(new Date().getFullYear()),
      competition: competition.trim() || BRAND.fullName,
      no: parseInt(gameNo, 10) || 1,
      date,
      time,
      place: place.trim() || 'Main Court',
      home: homeId,
      away: awayId,
      status: 'scheduled',
      events: [],
      adj: { [homeId]: 0, [awayId]: 0 },
      active: { [homeId]: [], [awayId]: [] },
      played: [],
      lineupPeriod: 0,
      runningTime,
      rtLast2,
      isDefault: false,
    };

    await patch({
      games: [...db.games, newGame],
      live: { periodLen: Math.round(mins * 60000) },
      log: `Game #${newGame.no} scheduled: ${ab(getTeam(homeId))} vs ${ab(getTeam(awayId))}`,
    });
    setCreateOpen(false);
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
      games: [{ ...game, status: nextStatus }],
      ...(clearLive ? { live: { gameId: null, running: false } } : {}),
      log: `Game #${game.no} marked ${nextStatus.toUpperCase()}`,
    });
  };

  const deleteGame = async (game: Game) => {
    if (!confirm(`Delete Game #${game.no} (${ab(getTeam(game.home))} vs ${ab(getTeam(game.away))})? This cannot be undone.`)) {
      return;
    }
    const clearLive = db.live.gameId === game.id;
    await patch({
      delGame: game.id,
      ...(clearLive ? { live: { gameId: null, running: false } } : {}),
      log: `Game #${game.no} deleted`,
    });
  };

  const filteredGames = [...db.games]
    .filter((g) => (!activeSeason || g.season === activeSeason) && (statusFilter === 'all' || g.status === statusFilter))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`) || b.no - a.no);

  return (
    <>
      {createOpen && (
        <ModalShell maxWidth="max-w-[540px]" onClose={() => setCreateOpen(false)}>
          <h3 className="mb-3 pr-10 text-lg font-bold text-[#eef2fb]">Schedule New Game</h3>

          <form onSubmit={handleCreateGame} className="space-y-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Home Team (Light)
                <select
                  value={homeId}
                  onChange={(e) => setHomeId(Number(e.target.value))}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-2.5 text-sm text-white"
                >
                  {activeTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({ab(t)})
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
                  {activeTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({ab(t)})
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

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Game #
                <input
                  type="number"
                  min="1"
                  value={gameNo}
                  onChange={(e) => setGameNo(e.target.value)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-[#c7d2fe]">
                Period (min)
                <input
                  type="number"
                  min="1"
                  value={periodMin}
                  onChange={(e) => setPeriodMin(e.target.value)}
                  className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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

            <div className="space-y-1.5 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#eef2fb]">
                <input
                  type="checkbox"
                  checked={runningTime}
                  onChange={(e) => setRunningTime(e.target.checked)}
                  className="h-4 w-4 accent-[#4f7bff]"
                />
                Running time (clock keeps running during fouls &amp; substitutions)
              </label>
              {runningTime && (
                <label className="ml-6 flex cursor-pointer items-center gap-2 text-xs text-[#8c9bc4]">
                  <input
                    type="checkbox"
                    checked={rtLast2}
                    onChange={(e) => setRtLast2(e.target.checked)}
                    className="h-4 w-4 accent-[#4f7bff]"
                  />
                  Stop time in the last 2:00 of Q4 / overtime (FIBA)
                </label>
              )}
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
                className="rounded-xl bg-[#15803d] px-5 py-2 text-sm font-bold text-white hover:bg-[#166534]"
              >
                Create Game
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
        {/* Header & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
          <div>
            <h1 className="text-xl font-extrabold text-white">Games &amp; Standings</h1>
            <p className="text-xs text-[#8c9bc4]">Schedule games, launch officiating, or open official reports</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                  {stVal}
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

        {/* Standings Card */}
        {standings.length > 0 && (
          <section className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
            <h2 className="mb-2.5 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#f2a501]">
              <Trophy className="h-4 w-4" /> Standings {activeSeason ? `· ${activeSeason}` : ''}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#16224d] text-[10px] uppercase text-[#8c9bc4]">
                    <th className="px-2.5 py-2 text-left">#</th>
                    <th className="px-2.5 py-2 text-left">Team</th>
                    <th className="px-2.5 py-2 text-center">GP</th>
                    <th className="px-2.5 py-2 text-center">W</th>
                    <th className="px-2.5 py-2 text-center">L</th>
                    <th className="px-2.5 py-2 text-center">WIN%</th>
                    <th className="px-2.5 py-2 text-center">PF</th>
                    <th className="px-2.5 py-2 text-center">PA</th>
                    <th className="px-2.5 py-2 text-center">DIFF</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((r, idx) => {
                    const diff = r.pf - r.pa;
                    const winPct = r.gp > 0 ? ((r.w / r.gp) * 100).toFixed(0) : '0';
                    return (
                      <tr key={r.team.id} className="border-b border-[#1a2d6b]/70 hover:bg-white/[0.03]">
                        <td className="px-2.5 py-2 font-bold text-[#8c9bc4]">{idx + 1}</td>
                        <td className="px-2.5 py-2 font-extrabold" style={{ color: teamColor(r.team) }}>
                          {r.team.name}
                        </td>
                        <td className="px-2.5 py-2 text-center">{r.gp}</td>
                        <td className="px-2.5 py-2 text-center font-bold text-[#4ade80]">{r.w}</td>
                        <td className="px-2.5 py-2 text-center font-bold text-[#f87171]">{r.l}</td>
                        <td className="px-2.5 py-2 text-center text-[#c7d2fe]">{winPct}%</td>
                        <td className="px-2.5 py-2 text-center">{r.pf}</td>
                        <td className="px-2.5 py-2 text-center">{r.pa}</td>
                        <td className="px-2.5 py-2 text-center font-semibold">
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Game List */}
        {filteredGames.length === 0 ? (
          <div className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-6 text-center text-sm text-[#8c9bc4]">
            No games match the current filters. Click <b>+ New Game</b> to schedule one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredGames.map((g) => {
              const home = getTeam(g.home);
              const away = getTeam(g.away);
              const hs = sc(g, g.home);
              const as = sc(g, g.away);
              const isLive = db.live.gameId === g.id && g.status === 'live';

              return (
                <div
                  key={g.id}
                  className={`flex flex-col justify-between gap-3 rounded-2xl border bg-[#0a1530] p-4 ${
                    isLive ? 'border-2 border-[#f2a501]' : 'border-[#1a2d6b]'
                  }`}
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-[#8c9bc4]">
                      <span>
                        Game #{g.no} · {g.date} {g.time} · {g.place}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          isLive
                            ? 'bg-[#15803d] text-white'
                            : g.status === 'final'
                              ? 'bg-[#1e2a6b] text-[#c7d2fe]'
                              : 'bg-[#16224d] text-[#8c9bc4]'
                        }`}
                      >
                        {isLive ? '● LIVE' : g.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1">
                      <div>
                        <div style={{ color: teamColor(home) }} className="text-lg font-extrabold">
                          {ab(home)}
                        </div>
                        <div className="truncate text-xs text-[#c7d2fe]">{home?.name}</div>
                      </div>

                      <div
                        style={{ fontFamily: 'Arial, sans-serif' }}
                        className="text-2xl font-extrabold text-white"
                      >
                        {g.status === 'scheduled' ? 'VS' : `${hs} – ${as}`}
                      </div>

                      <div className="text-right">
                        <div style={{ color: teamColor(away) }} className="text-lg font-extrabold">
                          {ab(away)}
                        </div>
                        <div className="truncate text-xs text-[#c7d2fe]">{away?.name}</div>
                      </div>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-[#1a2d6b] pt-2.5">
                    {g.status !== 'final' && (
                      <button
                        type="button"
                        onClick={() => setLive(g)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#1d4ed8] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-[#1e40af]"
                      >
                        <Play className="h-3.5 w-3.5" /> {isLive ? 'Open Officiating' : 'Set Live'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleFinal(g)}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#2a3f87] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-[#354fa8]"
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

                    <Link
                      to={`/games/${g.id}/statistics`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3 py-1.5 text-xs font-bold text-[#c7d2fe] hover:bg-[#192b6e]"
                    >
                      <FileText className="h-3.5 w-3.5" /> Box Score
                    </Link>

                    <Link
                      to={`/games/${g.id}/scoresheet`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3 py-1.5 text-xs font-bold text-[#c7d2fe] hover:bg-[#192b6e]"
                    >
                      <Printer className="h-3.5 w-3.5" /> FIBA Sheet
                    </Link>

                    <span className="flex-1" />

                    <button
                      type="button"
                      title="Delete game"
                      onClick={() => deleteGame(g)}
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