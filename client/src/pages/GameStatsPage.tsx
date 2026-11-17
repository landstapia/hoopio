import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { ab, BRAND, byNumber, fc, nm, per, secText, teamColor } from '../lib/format';
import { foulTag, KS, sc, st, staffLabel, tf, Z } from '../lib/stats';

export function GameStatsPage() {
  const { id } = useParams();
  const { db, getTeam, getPlayer } = useDb();

  if (!db) {
    return <div className="p-4 text-sm text-[#8c9bc4]">Loading box score…</div>;
  }

  const game = db.games.find((g) => String(g.id) === String(id));
  if (!game) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-6">
        <p className="text-base text-white">Game not found.</p>
        <Link to="/games" className="mt-2 inline-block text-sm font-bold text-[#f2a501] underline">
          ← Back to Games
        </Link>
      </div>
    );
  }

  const home = getTeam(game.home);
  const away = getTeam(game.away);
  const homeScore = sc(game, game.home);
  const awayScore = sc(game, game.away);
  const stats = st(game.events);

  const maxPeriod = Math.max(4, ...game.events.map((e) => e.period || 1));
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const periodPoints = (teamId: number, p: number) =>
    game.events
      .filter((e) => e.teamId === teamId && e.period === p && e.type === 'pts')
      .reduce((sum, e) => sum + (e.pts || 0), 0);

  const renderTeamBox = (teamId: number) => {
    const team = getTeam(teamId);
    const c = teamColor(team);
    const roster = db.players
      .filter((p) => p.teamId === teamId && (!p.archived || game.played.includes(p.id)))
      .sort((a, b) => byNumber(a.number, b.number));

    const totals = Z();
    for (const p of roster) {
      const s = stats[p.id] || Z();
      for (const k of KS) totals[k] += s[k];
    }
    const adjPts = game.adj?.[teamId] || 0;

    return (
      <section
        key={teamId}
        style={{ borderTopColor: c }}
        className="rounded-2xl border border-[#1a2d6b] border-t-4 bg-[#0a1530] p-4 print:border-slate-300 print:bg-white print:text-black"
      >
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 style={{ color: c }} className="text-lg font-extrabold print:text-black">
              {team?.name} ({ab(team)})
            </h2>
            <p className="text-xs text-[#8c9bc4] print:text-slate-600">
              Coach: {team?.coach || '—'}
              {team?.assistant ? ` · Asst: ${team.assistant}` : ''}
            </p>
          </div>
          <div className="text-2xl font-extrabold text-white print:text-black">{sc(game, teamId)} PTS</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#16224d] text-[10px] uppercase text-[#8c9bc4] print:bg-slate-200 print:text-slate-800">
                <th className="w-[46px] px-2 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">Player</th>
                <th className="w-[46px] px-1.5 py-2 text-center">MIN</th>
                {KS.map((k) => (
                  <th key={k} className="w-[46px] px-1.5 py-2 text-center">
                    {k.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map((p) => {
                const s = stats[p.id] || Z();
                const played = game.played.includes(p.id) || Object.values(s).some((v) => v > 0);
                return (
                  <tr key={p.id} className="border-b border-[#1a2d6b]/70 print:border-slate-300">
                    <td className="px-2 py-1.5 font-bold">{p.number}</td>
                    <td className="px-2 py-1.5 font-medium">
                      {nm(p)}
                      {team?.captainId === p.id && (
                        <span className="ml-1.5 rounded bg-[#f2a501]/20 px-1 text-[10px] font-extrabold text-[#f2a501] print:border print:border-black print:text-black">
                          CAP
                        </span>
                      )}
                    </td>
                    <td className="px-1.5 py-1.5 text-center text-[#8c9bc4] print:text-slate-600">
                      {played ? '●' : 'DNP'}
                    </td>
                    {KS.map((k) => (
                      <td
                        key={k}
                        className={`px-1.5 py-1.5 text-center ${
                          k === 'pts' ? 'font-extrabold text-[#f2a501] print:text-black' : ''
                        }`}
                      >
                        {s[k]}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {adjPts !== 0 && (
                <tr className="border-b border-[#1a2d6b]/70 text-[#8c9bc4] print:border-slate-300 print:text-slate-600">
                  <td className="px-2 py-1.5">—</td>
                  <td className="px-2 py-1.5 italic">Manual score adjustment</td>
                  <td className="px-1.5 py-1.5 text-center">—</td>
                  <td className="px-1.5 py-1.5 text-center font-bold">{adjPts}</td>
                  {KS.slice(1).map((k) => (
                    <td key={k} className="px-1.5 py-1.5 text-center">
                      —
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#16224d] font-extrabold text-white print:bg-slate-200 print:text-black">
                <td className="px-2 py-2" colSpan={3}>
                  TEAM TOTALS
                </td>
                {KS.map((k) => (
                  <td key={k} className="px-1.5 py-2 text-center">
                    {k === 'pts' ? totals.pts + adjPts : totals[k]}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    );
  };

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4 print:max-w-none print:text-black">
      {/* Screen-only toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-3 print:hidden">
        <Link
          to="/games"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#2a3f87] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#354fa8]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Games
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={`/games/${game.id}/scoresheet`}
            className="rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3.5 py-2 text-xs font-bold text-[#c7d2fe] hover:bg-[#192b6e]"
          >
            FIBA Official Scoresheet
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#15803d] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#166534]"
          >
            <Printer className="h-3.5 w-3.5" /> Print Box Score
          </button>
        </div>
      </div>

      {/* Report Header & Period Summary */}
      <header className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-5 print:border-slate-300 print:bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1a2d6b] pb-3 print:border-slate-300">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#f2a501] print:text-slate-700">
              {BRAND.fullName} · Official Game Box Score
            </div>
            <h1 className="mt-0.5 text-xl font-extrabold text-white print:text-black">
              Game #{game.no} · {home?.name} vs {away?.name}
            </h1>
          </div>
          <div className="text-right text-xs text-[#8c9bc4] print:text-slate-600">
            <div>Season {game.season}</div>
            <div>
              {game.date} {game.time} · {game.place}
            </div>
            <div className="font-bold uppercase text-[#c7d2fe] print:text-black">Status: {game.status}</div>
          </div>
        </div>

        {/* Period-by-period line score */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#16224d] text-[10px] uppercase text-[#8c9bc4] print:bg-slate-200 print:text-slate-800">
                <th className="px-3 py-2 text-left">Team</th>
                {periods.map((p) => (
                  <th key={p} className="w-[54px] px-2 py-2 text-center">
                    {per(p)}
                  </th>
                ))}
                {((game.adj?.[game.home] || 0) !== 0 || (game.adj?.[game.away] || 0) !== 0) && (
                  <th className="w-[54px] px-2 py-2 text-center">ADJ</th>
                )}
                <th className="w-[64px] px-2 py-2 text-center">FINAL</th>
                <th className="w-[64px] px-2 py-2 text-center">FOULS</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: game.home, team: home, total: homeScore },
                { id: game.away, team: away, total: awayScore },
              ].map(({ id: tid, team, total }) => {
                const totalFouls = periods.reduce((s, p) => s + tf(game, tid, p), 0);
                return (
                  <tr key={tid} className="border-b border-[#1a2d6b]/70 print:border-slate-300">
                    <td
                      style={{ color: teamColor(team) }}
                      className="px-3 py-2 font-extrabold print:text-black"
                    >
                      {team?.name} ({ab(team)})
                    </td>
                    {periods.map((p) => (
                      <td key={p} className="px-2 py-2 text-center">
                        {periodPoints(tid, p)}
                      </td>
                    ))}
                    {((game.adj?.[game.home] || 0) !== 0 || (game.adj?.[game.away] || 0) !== 0) && (
                      <td className="px-2 py-2 text-center">{game.adj?.[tid] || 0}</td>
                    )}
                    <td className="px-2 py-2 text-center text-sm font-extrabold text-[#f2a501] print:text-black">
                      {total}
                    </td>
                    <td className="px-2 py-2 text-center">{totalFouls}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </header>

      {/* Both Team Box Scores */}
      {renderTeamBox(game.home)}
      {renderTeamBox(game.away)}

      {/* Chronological Play-by-Play Summary */}
      <section className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4 print:break-inside-avoid print:border-slate-300 print:bg-white">
        <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-[#8c9bc4] print:text-slate-700">
          Play-by-Play Log ({game.events.length} events)
        </h3>
        {game.events.length === 0 ? (
          <p className="text-xs text-[#8c9bc4]">No events recorded.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            {game.events.map((e) => {
              const p = e.playerId != null ? getPlayer(e.playerId) : undefined;
              const team = e.teamId != null ? getTeam(e.teamId) : undefined;
              const label =
                e.type === 'pts'
                  ? `+${e.pts} #${p?.number ?? '?'} ${nm(p)}`
                  : e.type === 'timeout'
                    ? `Timeout${e.secs ? ` ${secText(e.secs)}` : ''}`
                    : e.type === 'tech'
                      ? 'Technical foul'
                      : e.type === 'sub'
                        ? `Sub in #${getPlayer(e.playerId ?? -1)?.number ?? '?'} / out #${
                            getPlayer(e.outId ?? -1)?.number ?? '?'
                          }`
                        : e.type === 'foul' && e.staff
                          ? `${e.staff === 'coach' ? 'Coach' : 'Asst.'} ${staffLabel(team, e.staff)} FOUL${foulTag(
                              e,
                            )}`
                          : e.type === 'foul' && !e.playerId
                            ? 'Team foul'
                            : `${e.type.toUpperCase()}${foulTag(e)} #${p?.number ?? '?'} ${nm(p)}`;

              return (
                <div
                  key={e.id}
                  className="flex items-center gap-2 border-b border-[#1a2d6b]/40 py-1 print:border-slate-200"
                >
                  <span className="w-16 shrink-0 text-[#8c9bc4] print:text-slate-600">
                    {per(e.period)} {fc(e.clock)}
                  </span>
                  <span style={{ color: teamColor(team) }} className="w-12 shrink-0 font-extrabold print:text-black">
                    {ab(team)}
                  </span>
                  <span className="truncate text-[#eef2fb] print:text-black">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}