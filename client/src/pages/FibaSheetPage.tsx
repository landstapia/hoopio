import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Crosshair, Printer, RotateCcw } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { ab, byNumber, nm } from '../lib/format';
import { foulTag, sc, tf } from '../lib/stats';
import type { GameEvent } from '../types';

const STORAGE_KEY = 'hoopio_fiba_coords_v3';

const DEFAULT_COORDS = {
  "header": {
    "teamA": {
      "x": 11.8,
      "y": 12.6
    },
    "teamB": {
      "x": 59.2,
      "y": 12.6
    },
    "competition": {
      "x": 15.2,
      "y": 14.7
    },
    "date": {
      "x": 28,
      "y": 14.7
    },
    "time": {
      "x": 42.8,
      "y": 14.7
    },
    "gameNo": {
      "x": 13.5,
      "y": 16.3
    },
    "place": {
      "x": 29,
      "y": 16.3
    }
  },
  "teamA": {
    "name": {
      "x": 11.8,
      "y": 18.6
    },
    "timeoutsH1": [
      {
        "x": 10.2,
        "y": 20.4
      },
      {
        "x": 12.9,
        "y": 20.4
      }
    ],
    "timeoutsH2": [
      {
        "x": 10.2,
        "y": 22.4
      },
      {
        "x": 12.9,
        "y": 22.4
      },
      {
        "x": 15.6,
        "y": 22.4
      }
    ],
    "teamFoulsQ": [
      {
        "x": 27.2,
        "y": 20.4
      },
      {
        "x": 39.2,
        "y": 20.4
      },
      {
        "x": 27.2,
        "y": 22.4
      },
      {
        "x": 39.2,
        "y": 22.4
      }
    ],
    "rosterStartY": 28.6,
    "rosterRowStepY": 1.42,
    "colNoX": 35.4,
    "colNameX": 8.7,
    "colInX": 38.2,
    "colFoulStartX": 40.7,
    "colFoulStepX": 2.1,
    "coach": {
      "x": 24.1,
      "y": 45.6
    },
    "assistant": {
      "x": 24,
      "y": 47.2
    }
  },
  "teamB": {
    "name": {
      "x": 11.8,
      "y": 48.8
    },
    "timeoutsH1": [
      {
        "x": 10.2,
        "y": 50.6
      },
      {
        "x": 12.9,
        "y": 50.6
      }
    ],
    "timeoutsH2": [
      {
        "x": 10.2,
        "y": 52.6
      },
      {
        "x": 12.9,
        "y": 52.6
      },
      {
        "x": 15.6,
        "y": 52.6
      }
    ],
    "teamFoulsQ": [
      {
        "x": 27.2,
        "y": 50.6
      },
      {
        "x": 39.2,
        "y": 50.6
      },
      {
        "x": 27.2,
        "y": 52.6
      },
      {
        "x": 39.2,
        "y": 52.6
      }
    ],
    "rosterStartY": 59,
    "rosterRowStepY": 1.42,
    "colNoX": 35.4,
    "colNameX": 8.7,
    "colInX": 38.2,
    "colFoulStartX": 40.7,
    "colFoulStepX": 2.1,
    "coach": {
      "x": 24.5,
      "y": 76
    },
    "assistant": {
      "x": 24.4,
      "y": 77.5
    }
  },
  "runningScore": {
    "colStartX": [
      54.1,
      65.2,
      73.6,
      87.4
    ],
    "teamOffsetX": {
      "aNum": 0,
      "aMark": 2.2,
      "bMark": 5.5,
      "bNum": 7.8
    },
    "startY": 21.9,
    "rowStepY": 1.41
  },
  "summary": {
    "periodY": [
      79.1,
      80.7,
      82.3,
      83.9,
      85.5
    ],
    "teamAX": 75.8,
    "teamBX": 88.6,
    "finalY": 87.7,
    "finalTeamAX": 76.2,
    "finalTeamBX": 88.8,
    "winnerX": 72.5,
    "winnerY": 89.8
  }
};

type CoordsConfig = typeof DEFAULT_COORDS;

type PinSpec = {
  id: string;
  label: string;
  x: number;
  y: number;
  onMove: (nx: number, ny: number, prev: CoordsConfig) => CoordsConfig;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function FibaSheetPage() {
  const { id } = useParams();
  const { db, getTeam, getPlayer } = useDb();

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<CoordsConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<CoordsConfig>;
        return {
          ...DEFAULT_COORDS,
          ...parsed,
          header: { ...DEFAULT_COORDS.header, ...(parsed.header ?? {}) },
          teamA: { ...DEFAULT_COORDS.teamA, ...(parsed.teamA ?? {}) },
          teamB: { ...DEFAULT_COORDS.teamB, ...(parsed.teamB ?? {}) },
          runningScore: { ...DEFAULT_COORDS.runningScore, ...(parsed.runningScore ?? {}) },
          summary: { ...DEFAULT_COORDS.summary, ...(parsed.summary ?? {}) },
        };
      }
    } catch {
      // ignore storage error
    }
    return DEFAULT_COORDS;
  });

  const [calibrate, setCalibrate] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string>('header.teamA');
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [hideBgOnPrint, setHideBgOnPrint] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
    } catch {
      // ignore storage error
    }
  }, [coords]);

  if (!db) {
    return <div className="p-4 text-sm text-[#8c9bc4]">Loading FIBA scoresheet…</div>;
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

  const homeTeam = getTeam(game.home);
  const awayTeam = getTeam(game.away);

  const pos = (x: number, y: number): React.CSSProperties => ({
    left: `${x.toFixed(2)}%`,
    top: `${y.toFixed(2)}%`,
  });

  const makeTeamPins = (side: 'teamA' | 'teamB', labelPrefix: string): PinSpec[] => {
    const t = coords[side];
    return [
      {
        id: `${side}.name`,
        label: `${labelPrefix} Name (box)`,
        x: t.name.x,
        y: t.name.y,
        onMove: (nx, ny, prev) => ({ ...prev, [side]: { ...prev[side], name: { x: nx, y: ny } } }),
      },
      {
        id: `${side}.toH1_0`,
        label: `${labelPrefix} TO H1 #1`,
        x: t.timeoutsH1[0].x,
        y: t.timeoutsH1[0].y,
        onMove: (nx, ny, prev) => {
          const dx = round1(nx - prev[side].timeoutsH1[0].x);
          return {
            ...prev,
            [side]: {
              ...prev[side],
              timeoutsH1: prev[side].timeoutsH1.map((p) => ({ x: round1(p.x + dx), y: ny })),
            },
          };
        },
      },
      {
        id: `${side}.toH2_0`,
        label: `${labelPrefix} TO H2 #1`,
        x: t.timeoutsH2[0].x,
        y: t.timeoutsH2[0].y,
        onMove: (nx, ny, prev) => {
          const dx = round1(nx - prev[side].timeoutsH2[0].x);
          return {
            ...prev,
            [side]: {
              ...prev[side],
              timeoutsH2: prev[side].timeoutsH2.map((p) => ({ x: round1(p.x + dx), y: ny })),
            },
          };
        },
      },
      {
        id: `${side}.tfQ1`,
        label: `${labelPrefix} Team Fouls Q1`,
        x: t.teamFoulsQ[0].x,
        y: t.teamFoulsQ[0].y,
        onMove: (nx, ny, prev) => {
          const dx = round1(nx - prev[side].teamFoulsQ[0].x);
          const dy = round1(ny - prev[side].teamFoulsQ[0].y);
          return {
            ...prev,
            [side]: {
              ...prev[side],
              teamFoulsQ: prev[side].teamFoulsQ.map((p) => ({
                x: round1(p.x + dx),
                y: round1(p.y + dy),
              })),
            },
          };
        },
      },
      {
        id: `${side}.row1No`,
        label: `${labelPrefix} Row 1 No.`,
        x: t.colNoX,
        y: t.rosterStartY,
        onMove: (nx, ny, prev) => ({
          ...prev,
          [side]: { ...prev[side], colNoX: nx, rosterStartY: ny },
        }),
      },
      {
        id: `${side}.row1Name`,
        label: `${labelPrefix} Row 1 Player`,
        x: t.colNameX,
        y: t.rosterStartY,
        onMove: (nx, ny, prev) => ({
          ...prev,
          [side]: { ...prev[side], colNameX: nx, rosterStartY: ny },
        }),
      },
      {
        id: `${side}.row1In`,
        label: `${labelPrefix} Row 1 In (X)`,
        x: t.colInX,
        y: t.rosterStartY,
        onMove: (nx, ny, prev) => ({
          ...prev,
          [side]: { ...prev[side], colInX: nx, rosterStartY: ny },
        }),
      },
      {
        id: `${side}.row1Foul1`,
        label: `${labelPrefix} Row 1 Foul 1`,
        x: t.colFoulStartX,
        y: t.rosterStartY,
        onMove: (nx, ny, prev) => ({
          ...prev,
          [side]: { ...prev[side], colFoulStartX: nx, rosterStartY: ny },
        }),
      },
      {
        id: `${side}.row1Foul5`,
        label: `${labelPrefix} Row 1 Foul 5 (spacing)`,
        x: round1(t.colFoulStartX + 4 * t.colFoulStepX),
        y: t.rosterStartY,
        onMove: (nx, _ny, prev) => ({
          ...prev,
          [side]: {
            ...prev[side],
            colFoulStepX: round1((nx - prev[side].colFoulStartX) / 4),
          },
        }),
      },
      {
        id: `${side}.row12Bottom`,
        label: `${labelPrefix} Row 12 (row spacing)`,
        x: t.colNameX,
        y: round1(t.rosterStartY + 11 * t.rosterRowStepY),
        onMove: (_nx, ny, prev) => ({
          ...prev,
          [side]: {
            ...prev[side],
            rosterRowStepY: Math.round(((ny - prev[side].rosterStartY) / 11) * 100) / 100,
          },
        }),
      },
      {
        id: `${side}.coach`,
        label: `${labelPrefix} Head Coach`,
        x: t.coach.x,
        y: t.coach.y,
        onMove: (nx, ny, prev) => ({ ...prev, [side]: { ...prev[side], coach: { x: nx, y: ny } } }),
      },
      {
        id: `${side}.assistant`,
        label: `${labelPrefix} Asst. Coach`,
        x: t.assistant.x,
        y: t.assistant.y,
        onMove: (nx, ny, prev) => ({ ...prev, [side]: { ...prev[side], assistant: { x: nx, y: ny } } }),
      },
    ];
  };

  const pins: PinSpec[] = [
    {
      id: 'header.teamA',
      label: 'Top Header Team A',
      x: coords.header.teamA.x,
      y: coords.header.teamA.y,
      onMove: (nx, ny, prev) => ({ ...prev, header: { ...prev.header, teamA: { x: nx, y: ny } } }),
    },
    {
      id: 'header.teamB',
      label: 'Top Header Team B',
      x: coords.header.teamB.x,
      y: coords.header.teamB.y,
      onMove: (nx, ny, prev) => ({ ...prev, header: { ...prev.header, teamB: { x: nx, y: ny } } }),
    },
    {
      id: 'header.competition',
      label: 'Header Competition',
      x: coords.header.competition.x,
      y: coords.header.competition.y,
      onMove: (nx, ny, prev) => ({ ...prev, header: { ...prev.header, competition: { x: nx, y: ny } } }),
    },
    {
      id: 'header.date',
      label: 'Header Date',
      x: coords.header.date.x,
      y: coords.header.date.y,
      onMove: (nx, ny, prev) => ({ ...prev, header: { ...prev.header, date: { x: nx, y: ny } } }),
    },
    {
      id: 'header.time',
      label: 'Header Time',
      x: coords.header.time.x,
      y: coords.header.time.y,
      onMove: (nx, ny, prev) => ({ ...prev, header: { ...prev.header, time: { x: nx, y: ny } } }),
    },
    {
      id: 'header.gameNo',
      label: 'Header Game #',
      x: coords.header.gameNo.x,
      y: coords.header.gameNo.y,
      onMove: (nx, ny, prev) => ({ ...prev, header: { ...prev.header, gameNo: { x: nx, y: ny } } }),
    },
    {
      id: 'header.place',
      label: 'Header Place',
      x: coords.header.place.x,
      y: coords.header.place.y,
      onMove: (nx, ny, prev) => ({ ...prev, header: { ...prev.header, place: { x: nx, y: ny } } }),
    },
    ...makeTeamPins('teamA', 'Team A'),
    ...makeTeamPins('teamB', 'Team B'),
    ...coords.runningScore.colStartX.map((cx, cIdx) => ({
      id: `rs.col${cIdx}`,
      label: `Running Score Col ${cIdx + 1} (${cIdx * 40 + 1}–${(cIdx + 1) * 40})`,
      x: cx,
      y: coords.runningScore.startY,
      onMove: (nx: number, ny: number, prev: CoordsConfig) => {
        const nextCols = [...prev.runningScore.colStartX];
        nextCols[cIdx] = nx;
        return {
          ...prev,
          runningScore: { ...prev.runningScore, colStartX: nextCols, startY: ny },
        };
      },
    })),
    {
      id: 'rs.row40',
      label: 'Running Score Row 40 (row spacing)',
      x: coords.runningScore.colStartX[0],
      y: round1(coords.runningScore.startY + 39 * coords.runningScore.rowStepY),
      onMove: (_nx, ny, prev) => ({
        ...prev,
        runningScore: {
          ...prev.runningScore,
          rowStepY: Math.round(((ny - prev.runningScore.startY) / 39) * 100) / 100,
        },
      }),
    },
    {
      id: 'summary.q1A',
      label: 'Period Summary Q1 Team A',
      x: coords.summary.teamAX,
      y: coords.summary.periodY[0],
      onMove: (nx, ny, prev) => {
        const dy = ny - prev.summary.periodY[0];
        return {
          ...prev,
          summary: {
            ...prev.summary,
            teamAX: nx,
            periodY: prev.summary.periodY.map((py) => round1(py + dy)),
          },
        };
      },
    },
    {
      id: 'summary.q1B',
      label: 'Period Summary Q1 Team B',
      x: coords.summary.teamBX,
      y: coords.summary.periodY[0],
      onMove: (nx, _ny, prev) => ({
        ...prev,
        summary: { ...prev.summary, teamBX: nx },
      }),
    },
    {
      id: 'summary.finalA',
      label: 'Final Score Team A',
      x: coords.summary.finalTeamAX,
      y: coords.summary.finalY,
      onMove: (nx, ny, prev) => ({
        ...prev,
        summary: { ...prev.summary, finalTeamAX: nx, finalY: ny },
      }),
    },
    {
      id: 'summary.finalB',
      label: 'Final Score Team B',
      x: coords.summary.finalTeamBX,
      y: coords.summary.finalY,
      onMove: (nx, _ny, prev) => ({
        ...prev,
        summary: { ...prev.summary, finalTeamBX: nx },
      }),
    },
  ];

  const getRelPct = (clientX: number, clientY: number) => {
    if (!sheetRef.current) return null;
    const rect = sheetRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x: round1(x), y: round1(y) };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!calibrate) return;
    const pt = getRelPct(e.clientX, e.clientY);
    if (!pt) return;
    setCursorPos(pt);

    if (draggingId) {
      const pin = pins.find((p) => p.id === draggingId);
      if (pin) {
        setCoords((prev) => pin.onMove(pt.x, pt.y, prev));
      }
    }
  };

  const selectedPin = pins.find((p) => p.id === selectedPinId) || pins[0];

  const copyCoordsCode = async () => {
    const snippet = `const DEFAULT_COORDS = ${JSON.stringify(coords, null, 2)};`;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetCoords = () => {
    if (!confirm('Reset all scoresheet coordinates back to defaults?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setCoords(DEFAULT_COORDS);
  };

  const buildRunningScore = (teamId: number) => {
    const map = new Map<number, { num: string; pts: number }>();
    let total = 0;
    for (const e of game.events) {
      if (e.teamId === teamId && e.type === 'pts' && e.pts) {
        total += e.pts;
        const num = e.playerId != null ? String(getPlayer(e.playerId)?.number ?? '?') : '—';
        map.set(total, { num, pts: e.pts });
      }
    }
    return map;
  };

  const homeRunning = buildRunningScore(game.home);
  const awayRunning = buildRunningScore(game.away);

  const periodPts = (teamId: number, p: number) =>
    game.events
      .filter((e) => e.teamId === teamId && e.period === p && e.type === 'pts')
      .reduce((s, e) => s + (e.pts || 0), 0);

  const renderTeamOverlay = (teamId: number, cfg: typeof coords.teamA) => {
    const team = getTeam(teamId);
    const roster = db.players
      .filter((p) => p.teamId === teamId && (!p.archived || game.played.includes(p.id)))
      .sort((a, b) => byNumber(a.number, b.number))
      .slice(0, 12);

    const playerFouls = (pid: number): GameEvent[] =>
      game.events.filter((e) => e.teamId === teamId && e.playerId === pid && e.type === 'foul');

    const h1Timeouts = game.events.filter(
      (e) => e.teamId === teamId && e.type === 'timeout' && e.period <= 2,
    );
    const h2Timeouts = game.events.filter(
      (e) => e.teamId === teamId && e.type === 'timeout' && (e.period === 3 || e.period === 4),
    );

    return (
      <>
        <div
          style={pos(cfg.name.x, cfg.name.y)}
          className="absolute -translate-y-1/2 text-[13px] font-extrabold uppercase tracking-wide text-slate-950 sm:text-[14px] print:text-[12px]"
        >
          {team?.name} ({ab(team)})
        </div>

        {cfg.timeoutsH1.map((pt, idx) => {
          const to = h1Timeouts[idx];
          if (!to) return null;
          return (
            <div
              key={`h1-${idx}`}
              style={pos(pt.x, pt.y)}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px] font-extrabold text-red-700 sm:text-[12px]"
            >
              {Math.ceil(to.clock / 60000)}&apos;
            </div>
          );
        })}

        {cfg.timeoutsH2.map((pt, idx) => {
          const to = h2Timeouts[idx];
          if (!to) return null;
          return (
            <div
              key={`h2-${idx}`}
              style={pos(pt.x, pt.y)}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px] font-extrabold text-red-700 sm:text-[12px]"
            >
              {Math.ceil(to.clock / 60000)}&apos;
            </div>
          );
        })}

        {cfg.teamFoulsQ.map((pt, qIdx) => {
          const count = tf(game, teamId, qIdx + 1);
          if (!count) return null;
          return (
            <div
              key={`tf-${qIdx}`}
              style={pos(pt.x, pt.y)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 text-[12px] font-extrabold sm:text-[13px] ${
                count >= 5 ? 'text-red-700 underline' : 'text-slate-950'
              }`}
            >
              {count}
            </div>
          );
        })}

        {roster.map((p, rIdx) => {
          const y = cfg.rosterStartY + rIdx * cfg.rosterRowStepY;
          const fouls = playerFouls(p.id);
          const played = game.played.includes(p.id) || fouls.length > 0;

          return (
            <div key={p.id}>
              <span
                style={pos(cfg.colNoX, y)}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px] font-extrabold text-slate-950 sm:text-[12px] print:text-[10.5px]"
              >
                {p.number}
              </span>
              <span
                style={pos(cfg.colNameX, y)}
                className="absolute max-w-[23%] -translate-y-1/2 truncate text-[11px] font-bold text-slate-950 sm:text-[12px] print:text-[10.5px]"
              >
                {nm(p)}
                {team?.captainId === p.id ? ' (CAP)' : ''}
              </span>
              {played && (
                <span
                  style={pos(cfg.colInX, y)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px] font-extrabold text-slate-950 sm:text-[12px]"
                >
                  X
                </span>
              )}
              {fouls.slice(0, 5).map((f, fIdx) => {
                const fx = cfg.colFoulStartX + fIdx * cfg.colFoulStepX;
                const tag = foulTag(f).trim() || `P${f.period}`;
                return (
                  <span
                    key={f.id}
                    style={pos(fx, y)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-extrabold text-red-700 sm:text-[11px]"
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          );
        })}

        <div
          style={pos(cfg.coach.x, cfg.coach.y)}
          className="absolute -translate-y-1/2 text-[11px] font-bold text-slate-950 sm:text-[12px] print:text-[10.5px]"
        >
          {team?.coach || ''}
        </div>
        <div
          style={pos(cfg.assistant.x, cfg.assistant.y)}
          className="absolute -translate-y-1/2 text-[11px] font-bold text-slate-950 sm:text-[12px] print:text-[10.5px]"
        >
          {team?.assistant || ''}
        </div>
      </>
    );
  };

  const otHomePts = game.events
    .filter((e) => e.teamId === game.home && e.period > 4 && e.type === 'pts')
    .reduce((s, e) => s + (e.pts || 0), 0);
  const otAwayPts = game.events
    .filter((e) => e.teamId === game.away && e.period > 4 && e.type === 'pts')
    .reduce((s, e) => s + (e.pts || 0), 0);

  return (
    <div className="mx-auto flex max-w-[1150px] flex-col gap-3 print:max-w-none print:gap-0">
      {/* Screen-only Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-3 print:hidden">
        <Link
          to="/games"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#2a3f87] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#354fa8]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Games
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCalibrate((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
              calibrate
                ? 'border-[#f2a501] bg-[#f2a501] text-[#1a1200]'
                : 'border-[#3a4a8f] bg-[#0f1a44] text-[#c7d2fe] hover:bg-[#192b6e]'
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
            {calibrate ? 'Done Calibrating' : 'Calibrate Positions'}
          </button>

          <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3 py-2 text-xs font-bold text-[#c7d2fe]">
            <input
              type="checkbox"
              checked={hideBgOnPrint}
              onChange={(e) => setHideBgOnPrint(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#4f7bff]"
            />
            Pre-printed paper
          </label>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#15803d] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#166534]"
          >
            <Printer className="h-3.5 w-3.5" /> Print Scoresheet
          </button>
        </div>
      </div>

      {/* Live Drag & Fine-Tune Bar */}
      {calibrate && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f2a501] bg-[#0a1530] px-4 py-2.5 text-xs text-white print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-[#f2a501]">Drag any pink pin on the sheet</span>
            <select
              value={selectedPin.id}
              onChange={(e) => setSelectedPinId(e.target.value)}
              className="h-8 rounded-lg border border-[#3a4a8f] bg-[#0f2160] px-2 text-xs font-bold text-white"
            >
              {pins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.x}%, {p.y}%)
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1">
              <span>X:</span>
              <input
                type="number"
                step="0.1"
                value={selectedPin.x}
                onChange={(e) => {
                  const nx = parseFloat(e.target.value);
                  if (!Number.isNaN(nx)) setCoords((prev) => selectedPin.onMove(nx, selectedPin.y, prev));
                }}
                className="h-8 w-16 rounded border border-[#3a4a8f] bg-[#0f1a44] px-1.5 text-center font-mono text-white"
              />
            </label>

            <label className="flex items-center gap-1">
              <span>Y:</span>
              <input
                type="number"
                step="0.1"
                value={selectedPin.y}
                onChange={(e) => {
                  const ny = parseFloat(e.target.value);
                  if (!Number.isNaN(ny)) setCoords((prev) => selectedPin.onMove(selectedPin.x, ny, prev));
                }}
                className="h-8 w-16 rounded border border-[#3a4a8f] bg-[#0f1a44] px-1.5 text-center font-mono text-white"
              />
            </label>

            {cursorPos && (
              <span className="font-mono text-[11px] text-[#8c9bc4]">
                Cursor: {cursorPos.x}%, {cursorPos.y}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyCoordsCode}
              className="inline-flex items-center gap-1 rounded-lg bg-[#1d4ed8] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1e40af]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy COORDS'}
            </button>
            <button
              type="button"
              onClick={resetCoords}
              className="inline-flex items-center gap-1 rounded-lg bg-[#2a3f87] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#354fa8]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        </div>
      )}

      {/* Scoresheet Canvas Container */}
      <div
        ref={sheetRef}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDraggingId(null)}
        onPointerLeave={() => {
          setCursorPos(null);
          setDraggingId(null);
        }}
        className="relative mx-auto w-full overflow-hidden rounded-xl bg-white shadow-2xl select-none print:w-full print:rounded-none print:shadow-none"
      >
        <img
          src="/img/fiba-scoresheet.jpg"
          alt="FIBA Official Scoresheet"
          draggable={false}
          className={`block h-auto w-full ${hideBgOnPrint ? 'print:opacity-0' : ''}`}
        />

        {/* Text & Ink Overlay Layer */}
        <div className="pointer-events-none absolute inset-0 leading-none">
          {/* Top Header Team A & Team B Lines */}
          <div
            style={pos(coords.header.teamA.x, coords.header.teamA.y)}
            className="absolute -translate-y-1/2 text-[14px] font-extrabold uppercase tracking-wide text-slate-950 sm:text-[15px] print:text-[13px]"
          >
            {homeTeam?.name} ({ab(homeTeam)})
          </div>
          <div
            style={pos(coords.header.teamB.x, coords.header.teamB.y)}
            className="absolute -translate-y-1/2 text-[14px] font-extrabold uppercase tracking-wide text-slate-950 sm:text-[15px] print:text-[13px]"
          >
            {awayTeam?.name} ({ab(awayTeam)})
          </div>

          {/* Competition, Date, Time, Game No., Place */}
          <div
            style={pos(coords.header.competition.x, coords.header.competition.y)}
            className="absolute -translate-y-1/2 text-[12px] font-bold uppercase text-slate-950 sm:text-[13px] print:text-[11px]"
          >
            {game.competition}
          </div>
          <div
            style={pos(coords.header.date.x, coords.header.date.y)}
            className="absolute -translate-y-1/2 text-[12px] font-bold text-slate-950 sm:text-[13px] print:text-[11px]"
          >
            {game.date}
          </div>
          <div
            style={pos(coords.header.time.x, coords.header.time.y)}
            className="absolute -translate-y-1/2 text-[12px] font-bold text-slate-950 sm:text-[13px] print:text-[11px]"
          >
            {game.time}
          </div>
          <div
            style={pos(coords.header.gameNo.x, coords.header.gameNo.y)}
            className="absolute -translate-y-1/2 text-[12px] font-extrabold text-slate-950 sm:text-[13px] print:text-[11px]"
          >
            #{game.no}
          </div>
          <div
            style={pos(coords.header.place.x, coords.header.place.y)}
            className="absolute -translate-y-1/2 text-[12px] font-bold text-slate-950 sm:text-[13px] print:text-[11px]"
          >
            {game.place}
          </div>

          {renderTeamOverlay(game.home, coords.teamA)}
          {renderTeamOverlay(game.away, coords.teamB)}

          {/* Running Score Columns (1–160) */}
          {coords.runningScore.colStartX.map((baseX, colIdx) => {
            const start = colIdx * 40 + 1;
            return Array.from({ length: 40 }, (_, rIdx) => {
              const ptsVal = start + rIdx;
              const y = coords.runningScore.startY + rIdx * coords.runningScore.rowStepY;
              const aHit = homeRunning.get(ptsVal);
              const bHit = awayRunning.get(ptsVal);
              if (!aHit && !bHit) return null;

              return (
                <div key={ptsVal}>
                  {aHit && (
                    <>
                      <span
                        style={pos(baseX + coords.runningScore.teamOffsetX.aNum, y)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-950 sm:text-[11px]"
                      >
                        {aHit.num}
                      </span>
                      <span
                        style={pos(baseX + coords.runningScore.teamOffsetX.aMark, y)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px] font-extrabold text-red-700 sm:text-[13px]"
                      >
                        {aHit.pts === 3 ? '◯' : '／'}
                      </span>
                    </>
                  )}
                  {bHit && (
                    <>
                      <span
                        style={pos(baseX + coords.runningScore.teamOffsetX.bMark, y)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px] font-extrabold text-blue-800 sm:text-[13px]"
                      >
                        {bHit.pts === 3 ? '◯' : '／'}
                      </span>
                      <span
                        style={pos(baseX + coords.runningScore.teamOffsetX.bNum, y)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-950 sm:text-[11px]"
                      >
                        {bHit.num}
                      </span>
                    </>
                  )}
                </div>
              );
            });
          })}

          {/* Bottom Period-by-Period & Final Score Summary */}
          {[1, 2, 3, 4].map((q, idx) => (
            <div key={q}>
              <span
                style={pos(coords.summary.teamAX, coords.summary.periodY[idx])}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px] font-extrabold text-slate-950 sm:text-[13px]"
              >
                {periodPts(game.home, q)}
              </span>
              <span
                style={pos(coords.summary.teamBX, coords.summary.periodY[idx])}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px] font-extrabold text-slate-950 sm:text-[13px]"
              >
                {periodPts(game.away, q)}
              </span>
            </div>
          ))}

          {(otHomePts > 0 || otAwayPts > 0) && (
            <>
              <span
                style={pos(coords.summary.teamAX, coords.summary.periodY[4])}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px] font-extrabold text-slate-950 sm:text-[13px]"
              >
                {otHomePts}
              </span>
              <span
                style={pos(coords.summary.teamBX, coords.summary.periodY[4])}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px] font-extrabold text-slate-950 sm:text-[13px]"
              >
                {otAwayPts}
              </span>
            </>
          )}

          {/* Final Scores & Winning Team */}
          <span
            style={pos(coords.summary.finalTeamAX, coords.summary.finalY)}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[14px] font-extrabold text-slate-950 sm:text-[15px]"
          >
            {sc(game, game.home)}
          </span>
          <span
            style={pos(coords.summary.finalTeamBX, coords.summary.finalY)}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[14px] font-extrabold text-slate-950 sm:text-[15px]"
          >
            {sc(game, game.away)}
          </span>

          {game.status === 'final' && sc(game, game.home) !== sc(game, game.away) && (
            <span
              style={pos(coords.summary.winnerX, coords.summary.winnerY)}
              className="absolute -translate-y-1/2 text-[12px] font-extrabold uppercase text-slate-950 sm:text-[13px]"
            >
              {sc(game, game.home) > sc(game, game.away) ? homeTeam?.name : awayTeam?.name}
            </span>
          )}
        </div>

        {/* Draggable Calibration Pins Overlay */}
        {calibrate && (
          <div className="absolute inset-0 print:hidden">
            {pins.map((pin) => {
              const isSelected = pin.id === selectedPin.id;
              return (
                <button
                  key={pin.id}
                  type="button"
                  title={pin.label}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedPinId(pin.id);
                    setDraggingId(pin.id);
                  }}
                  style={pos(pin.x, pin.y)}
                  className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white shadow active:cursor-grabbing ${
                    isSelected ? 'z-20 scale-125 bg-amber-400 ring-2 ring-black' : 'z-10 bg-pink-600/90 hover:scale-125'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}