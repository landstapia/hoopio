import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Radio, Trophy, Users } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { ab, BRAND, fc, nm, per, teamColor } from '../lib/format';
import { KS, sc, type StatKey, tot } from '../lib/stats';

const LEADER_LABELS: Array<[StatKey, string]> = [
  ['pts', 'Points'],
  ['reb', 'Rebounds'],
  ['ast', 'Assists'],
  ['stl', 'Steals'],
  ['blk', 'Blocks'],
];

export function DashboardPage() {
  const { db, liveGame, getTeam } = useDb();

  const seasons = useMemo(() => {
    if (!db) return [];
    const set = new Set(db.games.map((g) => g.season).filter(Boolean));
    return [...set].sort().reverse();
  }, [db]);

  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const activeSeason = seasonFilter || seasons[0] || '';

  const standings = useMemo(() => {
    if (!db) return [];
    const seasonGames = db.games.filter(
      (g) => g.status === 'final' && (!activeSeason || g.season === activeSeason),
    );

    const rows = db.teams
      .filter((t) => !t.archived)
      .map((t) => ({
        team: t,
        gp: 0,
        w: 0,
        l: 0,
        pf: 0,
        pa: 0,
      }));

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

  const leaders = useMemo(() => {
    if (!db) return {} as Record<StatKey, Array<{ playerId: number; value: number; avg: string; gp: number }>>;
    const seasonGames = db.games.filter((g) => !activeSeason || g.season === activeSeason);
    const activePlayers = db.players.filter((p) => !p.archived);

    const result = {} as Record<StatKey, Array<{ playerId: number; value: number; avg: string; gp: number }>>;
    for (const k of KS) {
      const list = activePlayers
        .map((p) => {
          const t = tot(p.id, seasonGames, activeSeason || undefined);
          return {
            playerId: p.id,
            value: t[k],
            avg: t.gp ? (t[k] / t.gp).toFixed(1) : '0.0',
            gp: t.gp,
          };
        })
        .filter((x) => x.gp > 0 && x.value > 0)
        .sort((a, b) => Number(b.avg) - Number(a.avg) || b.value - a.value)
        .slice(0, 5);
      result[k] = list;
    }
    return result;
  }, [db, activeSeason]);

  if (!db) {
    return <div className="p-4 text-sm text-[#8c9bc4]">Loading dashboard…</div>;
  }

  const l = db.live;
  const recentGames = [...db.games]
    .filter((g) => !activeSeason || g.season === activeSeason)
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`) || b.no - a.no)
    .slice(0, 6);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      {/* Hero / Live Game Card */}
      <section className="rounded-2xl border border-[#2f4690] bg-gradient-to-br from-[#0d1d4a] to-[#08112b] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={BRAND.logo} alt={BRAND.name} className="h-12 w-12 object-contain" />
            <div>
              <h1 className="text-xl font-extrabold text-white sm:text-2xl">{BRAND.fullName}</h1>
              <p className="text-xs text-[#8c9bc4]">{BRAND.tagline}</p>
            </div>
          </div>

          {seasons.length > 0 && (
            <label className="flex items-center gap-2 text-xs font-bold text-[#c7d2fe]">
              Season
              <select
                value={activeSeason}
                onChange={(e) => setSeasonFilter(e.target.value)}
                className="rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-3 py-1.5 text-sm font-bold text-white"
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {liveGame ? (
          <div className="mt-4 rounded-xl border-2 border-[#f2a501] bg-black/70 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#15803d] px-2.5 py-0.5 text-xs font-extrabold text-white">
                <Radio className="h-3.5 w-3.5 animate-pulse" /> LIVE GAME · #{liveGame.no}
              </span>
              <span className="text-xs font-bold text-[#c7d2fe]">
                Period {per(l.period)} · {fc(l.clock)} · {liveGame.place}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1">
              <div className="flex items-center gap-2.5">
                {getTeam(liveGame.home)?.photo && (
                  <img
                    src={getTeam(liveGame.home)?.photo}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                )}
                <div className="min-w-0">
                  <div
                    style={{ color: teamColor(getTeam(liveGame.home)) }}
                    className="truncate text-lg font-extrabold sm:text-2xl"
                  >
                    {ab(getTeam(liveGame.home))}
                  </div>
                  <div className="truncate text-xs text-[#8c9bc4]">{getTeam(liveGame.home)?.name}</div>
                </div>
              </div>

              <div
                style={{ fontFamily: 'Arial, sans-serif' }}
                className="text-3xl font-extrabold text-[#f2a501] sm:text-5xl"
              >
                {sc(liveGame, liveGame.home)} – {sc(liveGame, liveGame.away)}
              </div>

              <div className="flex items-center justify-end gap-2.5 text-right">
                <div className="min-w-0">
                  <div
                    style={{ color: teamColor(getTeam(liveGame.away)) }}
                    className="truncate text-lg font-extrabold sm:text-2xl"
                  >
                    {ab(getTeam(liveGame.away))}
                  </div>
                  <div className="truncate text-xs text-[#8c9bc4]">{getTeam(liveGame.away)?.name}</div>
                </div>
                {getTeam(liveGame.away)?.photo && (
                  <img
                    src={getTeam(liveGame.away)?.photo}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-[#1a2d6b] pt-3">
              <Link
                to="/officiating"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1d4ed8] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#1e40af]"
              >
                <Play className="h-3.5 w-3.5" /> Open Officiating
              </Link>
              <Link
                to="/scoreboard"
                target="_blank"
                className="rounded-xl bg-[#2a3f87] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#354fa8]"
              >
                Scoreboard ↗
              </Link>
              <Link
                to="/playerboard"
                target="_blank"
                className="rounded-xl bg-[#2a3f87] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#354fa8]"
              >
                Playerboard ↗
              </Link>
              <Link
                to={`/games/${liveGame.id}/statistics`}
                target="_blank"
                className="rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-4 py-2 text-xs font-extrabold text-[#c7d2fe] hover:bg-[#192b6e]"
              >
                Box Score ↗
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1a2d6b] bg-[#071233] p-4">
            <span className="text-sm text-[#c7d2fe]">No game is currently set as live.</span>
            <Link
              to="/games"
              className="rounded-xl bg-[#f2a501] px-4 py-2 text-xs font-extrabold text-[#1a1200] hover:bg-[#fbbf24]"
            >
              Manage Games →
            </Link>
          </div>
        )}
      </section>

      {/* Standings + Recent/Upcoming Games */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Standings */}
        <section className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
              <Trophy className="h-4 w-4 text-[#f2a501]" /> Standings
            </h2>
            <Link to="/games" className="text-xs font-bold text-[#f2a501] hover:underline">
              Full schedule →
            </Link>
          </div>

          {standings.length === 0 ? (
            <p className="text-sm text-[#8c9bc4]">No completed games yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#16224d] text-[10px] uppercase text-[#8c9bc4]">
                    <th className="px-2 py-2 text-left">#</th>
                    <th className="px-2 py-2 text-left">Team</th>
                    <th className="px-2 py-2 text-center">GP</th>
                    <th className="px-2 py-2 text-center">W</th>
                    <th className="px-2 py-2 text-center">L</th>
                    <th className="px-2 py-2 text-center">DIFF</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((r, idx) => {
                    const diff = r.pf - r.pa;
                    return (
                      <tr key={r.team.id} className="border-b border-[#1a2d6b]/70 hover:bg-white/[0.03]">
                        <td className="px-2 py-2 font-bold text-[#8c9bc4]">{idx + 1}</td>
                        <td className="px-2 py-2 font-extrabold" style={{ color: teamColor(r.team) }}>
                          {r.team.name}
                        </td>
                        <td className="px-2 py-2 text-center">{r.gp}</td>
                        <td className="px-2 py-2 text-center font-bold text-[#4ade80]">{r.w}</td>
                        <td className="px-2 py-2 text-center font-bold text-[#f87171]">{r.l}</td>
                        <td className="px-2 py-2 text-center font-semibold">
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent & Scheduled Games */}
        <section className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white">Recent &amp; Upcoming Games</h2>
            <Link to="/games" className="text-xs font-bold text-[#f2a501] hover:underline">
              All games →
            </Link>
          </div>

          {recentGames.length === 0 ? (
            <p className="text-sm text-[#8c9bc4]">No games recorded for this season.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentGames.map((g) => {
                const home = getTeam(g.home);
                const away = getTeam(g.away);
                const hs = sc(g, g.home);
                const as = sc(g, g.away);
                return (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[#1a2d6b] bg-[#071233] px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white">
                        <span style={{ color: teamColor(home) }}>{ab(home)}</span>{' '}
                        <span className="text-[#8c9bc4]">vs</span>{' '}
                        <span style={{ color: teamColor(away) }}>{ab(away)}</span>
                      </div>
                      <div className="text-[11px] text-[#8c9bc4]">
                        Game #{g.no} · {g.date} {g.time}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {g.status !== 'scheduled' && (
                        <span className="text-sm font-extrabold text-[#f2a501]">
                          {hs}–{as}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          g.status === 'live'
                            ? 'bg-[#15803d] text-white'
                            : g.status === 'final'
                              ? 'bg-[#1e2a6b] text-[#c7d2fe]'
                              : 'bg-[#16224d] text-[#8c9bc4]'
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Season Statistical Leaders */}
      <section className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
            <Users className="h-4 w-4 text-[#f2a501]" /> Statistical Leaders (Per Game)
          </h2>
          <Link to="/players" className="text-xs font-bold text-[#f2a501] hover:underline">
            All players →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LEADER_LABELS.map(([key, label]) => {
            const list = leaders[key] ?? [];
            return (
              <div key={key} className="rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
                <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#f2a501]">
                  {label}
                </h3>
                {list.length === 0 ? (
                  <p className="text-xs text-[#8c9bc4]">No stats yet</p>
                ) : (
                  <ol className="space-y-1.5 text-xs">
                    {list.map((item, idx) => {
                      const p = db.players.find((pl) => pl.id === item.playerId);
                      const t = p ? getTeam(p.teamId) : undefined;
                      return (
                        <li key={item.playerId} className="flex items-center justify-between gap-1.5">
                          <span className="truncate text-[#eef2fb]">
                            <b className="mr-1 text-[#8c9bc4]">{idx + 1}.</b>
                            {nm(p)}{' '}
                            <small style={{ color: teamColor(t) }} className="font-bold">
                              {ab(t)}
                            </small>
                          </span>
                          <span className="font-extrabold text-white">{item.avg}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}