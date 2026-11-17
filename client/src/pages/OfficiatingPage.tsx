import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Pencil, Settings, Trash2 } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { Buzzer, haptic } from '../lib/buzzer';
import {
  ab,
  byNumber,
  fc,
  inLastTwo,
  nm,
  per,
  rtActive,
  secText,
  sheetSides,
  teamColor,
  toText,
} from '../lib/format';
import { foulTag, gameFouls, KS, sc, st, staffLabel, type StatKey, techFouls, tf, Z } from '../lib/stats';
import { BreakModal } from '../components/controls/BreakModal';
import { TimeoutPickerModal } from '../components/controls/TimeoutPickerModal';
import { EventDeleteModal } from '../components/officiating/EventDeleteModal';
import { EventEditModal } from '../components/officiating/EventEditModal';
import { GameGearModal } from '../components/officiating/GameGearModal';
import { LineupModal } from '../components/officiating/LineupModal';
import { PlayerPickerModal, type StatActionSpec } from '../components/officiating/PlayerPickerModal';
import { ScoreGearModal } from '../components/officiating/ScoreGearModal';
import { SubModal } from '../components/officiating/SubModal';
import { TimeGearModal } from '../components/officiating/TimeGearModal';
import type { GameEvent } from '../types';

type SectionKey = 'score' | 'game' | 'time' | 'stats' | 'log';
type RosterSortKey = 'status' | 'number' | 'name' | StatKey;

const ALL_SECTIONS: SectionKey[] = ['score', 'game', 'time', 'stats', 'log'];

const SECTION_OPTIONS: Array<[SectionKey, string]> = [
  ['score', 'Score'],
  ['game', 'Game'],
  ['time', 'Timekeeping'],
  ['stats', 'Statistics'],
  ['log', 'Event log'],
];

const BUZZ_MS = 2500;
const LONG_BUZZ_MS = 3000;

function loadInitialSections(): Set<SectionKey> {
  try {
    const raw = localStorage.sheetSections;
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((k): k is SectionKey => ALL_SECTIONS.includes(k as SectionKey));
        if (valid.length > 0) return new Set(valid);
      }
    }
  } catch {
    // ignore malformed storage
  }
  return new Set(ALL_SECTIONS);
}

export function OfficiatingPage() {
  const { db, liveGame, getTeam, getPlayer, patch } = useDb();

  const [operatorMode, setOperatorMode] = useState(() => localStorage.operatorMode === '1');
  const [visibleSections, setVisibleSections] = useState<Set<SectionKey>>(loadInitialSections);
  const [logTeamFilter, setLogTeamFilter] = useState<number | ''>('');
  const [buzzHere, setBuzzHere] = useState(() => localStorage.buzzHere === '1');

  // Active modals
  const [forceLineup, setForceLineup] = useState(false);
  const [statAction, setStatAction] = useState<StatActionSpec | null>(null);
  const [subOpen, setSubOpen] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const [gearModal, setGearModal] = useState<'score' | 'game' | 'time' | null>(null);
  const [toPickerTeam, setToPickerTeam] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<GameEvent | null>(null);

  // Per-team roster sort state
  const [rosterSort, setRosterSort] = useState<Record<number, { key: RosterSortKey; dir: 1 | -1 }>>({});

  // Long-press timer for TIMEOUT button
  const toHoldTimer = useRef<number | null>(null);
  const toHoldFired = useRef(false);
  const buzzHeldRef = useRef(false);

  const toggleOperatorMode = () => {
    const next = !operatorMode;
    setOperatorMode(next);
    localStorage.operatorMode = next ? '1' : '0';
  };

  const persistSections = (next: Set<SectionKey>) => {
    setVisibleSections(next);
    localStorage.sheetSections = JSON.stringify([...next]);
  };

  const toggleSection = (key: SectionKey) => {
    const next = new Set(visibleSections);
    if (next.has(key)) {
      if (next.size === 1) return; // keep at least one section visible
      next.delete(key);
    } else {
      next.add(key);
    }
    persistSections(next);
  };

  const selectAllSections = () => {
    persistSections(new Set(ALL_SECTIONS));
  };

  const isAllSelected = ALL_SECTIONS.every((k) => visibleSections.has(k));
  const showScore = !operatorMode && visibleSections.has('score');
  const showGame = !operatorMode && visibleSections.has('game');
  const showTime = operatorMode || visibleSections.has('time');
  const showStats = !operatorMode && visibleSections.has('stats');
  const showLog = !operatorMode && visibleSections.has('log');

  // Sync optional local buzzer audio
  useEffect(() => {
    if (!db) return;
    const l = db.live;
    const shouldSound = buzzHere && (l.buzzOn || l.buzzLeft > 0);
    const kind = !l.buzzOn && l.buzzKind === 'shot' ? 'shot' : 'game';
    Buzzer.sync(shouldSound, kind);
  }, [db, buzzHere]);

  // Stop held buzzer if pointer released anywhere
  useEffect(() => {
    const stopBuzz = () => {
      if (!buzzHeldRef.current) return;
      buzzHeldRef.current = false;
      patch({ live: { buzzOn: false } });
    };
    window.addEventListener('pointerup', stopBuzz);
    window.addEventListener('pointercancel', stopBuzz);
    window.addEventListener('blur', stopBuzz);
    return () => {
      window.removeEventListener('pointerup', stopBuzz);
      window.removeEventListener('pointercancel', stopBuzz);
      window.removeEventListener('blur', stopBuzz);
      Buzzer.stop();
    };
  }, [patch]);

  const triggerStatAction = useCallback(
    async (spec: StatActionSpec) => {
      if (!db || !liveGame) return;
      const l = db.live;
      const logTime = `Q${per(l.period)} ${fc(l.clock)}`;

      if (spec.kind === 'foul') {
        if (rtActive(liveGame, l)) {
          await patch({ log: `${logTime} | FOUL pressed: RUNNING TIME - clocks keep running` });
        } else {
          await patch({ live: { running: false }, log: `${logTime} | FOUL pressed: game & shot clock paused` });
        }
      } else if (spec.kind === 'pts') {
        const stopAfterBasket =
          spec.pts >= 2 && !!liveGame.runningTime && liveGame.rtLast2 !== false && inLastTwo(l);
        await patch({
          live: { shot: 24000, ...(stopAfterBasket ? { running: false } : {}) },
          log: `${logTime} | +${spec.pts} pressed: shot clock reset to 24${
            stopAfterBasket ? ' · made field goal in the last 2:00: game clock stopped (FIBA)' : ''
          }`,
        });
      }

      setStatAction(spec);
    },
    [db, liveGame, patch],
  );

  const toggleGameClock = useCallback(() => {
    if (!db) return;
    haptic();
    const nextRunning = !db.live.running;
    patch({
      live: { running: nextRunning },
      log: `Game clock ${nextRunning ? 'started' : 'paused'}`,
    });
  }, [db, patch]);

  const toggleShotClock = useCallback(() => {
    if (!db) return;
    haptic();
    const nextHold = !db.live.shotHold;
    patch({
      live: { shotHold: nextHold },
      log: `Shot clock ${nextHold ? 'paused' : 'started'}`,
    });
  }, [db, patch]);

  const resetShotClock = useCallback(
    (seconds: 24 | 14) => {
      haptic();
      patch({
        live: { shot: seconds * 1000, shotOn: true },
        log: `Shot clock set to ${seconds}`,
      });
    },
    [patch],
  );

  // Keyboard shortcuts:
  // 1 = +1, 2 = +2, 3 = +3, F = FOUL (when not in Operator Mode)
  // Shift + Space = Game clock start/pause
  // Space = Shot clock pause/resume, 9 = Shot clock +24, 0 = Shot clock +14
  useEffect(() => {
    const anyModalOpen =
      forceLineup ||
      !!statAction ||
      subOpen ||
      breakOpen ||
      !!gearModal ||
      toPickerTeam !== null ||
      !!editingEvent ||
      !!deletingEvent;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || anyModalOpen || !liveGame) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (el && el.tagName === 'BUTTON') el.blur();
        if (e.shiftKey) {
          toggleGameClock();
        } else {
          toggleShotClock();
        }
        return;
      }

      const k = e.key.toLowerCase();
      if (k === '9') {
        e.preventDefault();
        resetShotClock(24);
        return;
      }
      if (k === '0') {
        e.preventDefault();
        resetShotClock(14);
        return;
      }

      if (!operatorMode) {
        if (k === '1') {
          e.preventDefault();
          triggerStatAction({ kind: 'pts', pts: 1 });
        } else if (k === '2') {
          e.preventDefault();
          triggerStatAction({ kind: 'pts', pts: 2 });
        } else if (k === '3') {
          e.preventDefault();
          triggerStatAction({ kind: 'pts', pts: 3 });
        } else if (k === 'f') {
          e.preventDefault();
          triggerStatAction({ kind: 'foul' });
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    operatorMode,
    forceLineup,
    statAction,
    subOpen,
    breakOpen,
    gearModal,
    toPickerTeam,
    editingEvent,
    deletingEvent,
    liveGame,
    triggerStatAction,
    toggleGameClock,
    toggleShotClock,
    resetShotClock,
  ]);

  if (!db) {
    return <div className="p-4 text-sm text-[#8c9bc4]">Loading officiating workstation…</div>;
  }

  if (!liveGame) {
    return (
      <div className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-6">
        <p className="text-base">
          No live game. Set one in{' '}
          <Link to="/games" className="font-bold text-[#f2a501] underline">
            Games
          </Link>
          .
        </p>
      </div>
    );
  }

  const l = db.live;
  const g = liveGame;
  const teams = sheetSides(g, l);
  const needLineup = forceLineup || (g.status !== 'final' && g.lineupPeriod !== l.period);

  /* ---------- Actions ---------- */
  const undoLast = async () => {
    const nextEvents = [...g.events];
    const ev = nextEvents.pop();
    if (!ev) return;

    const nextActive = { ...g.active };
    const nextTimeouts = { ...l.timeouts };
    const livePatch: Record<string, unknown> = { timeouts: nextTimeouts };

    if (ev.type === 'sub' && ev.teamId != null) {
      const on = nextActive[ev.teamId] ?? [];
      if (ev.playerId && ev.outId) {
        nextActive[ev.teamId] = on.map((id) => (id === ev.playerId ? ev.outId! : id));
      } else if (ev.playerId) {
        nextActive[ev.teamId] = on.filter((id) => id !== ev.playerId);
      } else if (ev.outId) {
        nextActive[ev.teamId] = [...on, ev.outId];
      }
    }

    if (ev.type === 'timeout' && ev.teamId != null) {
      nextTimeouts[ev.teamId] = (nextTimeouts[ev.teamId] || 0) + 1;
      livePatch.toKind = null;
      livePatch.toTeam = null;
      livePatch.toLeft = 0;
    }

    const who = ev.playerId ? getPlayer(ev.playerId)?.last || '' : ev.teamId != null ? ab(getTeam(ev.teamId)) : '';
    await patch({
      games: [{ ...g, events: nextEvents, active: nextActive }],
      live: livePatch,
      log: `UNDO ${ev.type} ${ev.pts || ''} by ${who}`,
    });
  };

  const stepPeriod = async (direction: 1 | -1 = 1) => {
    const period = Math.max(1, l.period + direction);
    const length = period > 4 ? 300000 : l.periodLen;
    const timeouts = { ...l.timeouts };
    for (const t of [g.home, g.away]) {
      if (period === 1) timeouts[t] = 2;
      if (period === 3) timeouts[t] = 3;
      if (period > 4) timeouts[t] = 1;
    }
    await patch({
      live: { period, clock: length, running: false, shot: 24000, timeouts },
      log: `Period set to ${per(period)}`,
    });
  };

  const openSubstitutions = async () => {
    const logTime = `Q${per(l.period)} ${fc(l.clock)}`;
    if (rtActive(g, l)) {
      await patch({ log: `${logTime} | SUBSTITUTION pressed: RUNNING TIME - clocks keep running` });
    } else {
      await patch({ live: { running: false }, log: `${logTime} | SUBSTITUTION pressed: clocks paused` });
    }
    setSubOpen(true);
  };

  const startTimeout = async (teamId: number, secs = l.timeoutSecs || 30) => {
    const left = l.timeouts[teamId] || 0;
    if (!left) return alert('No timeouts left');
    if (l.toKind) return alert('A timeout or break is already running');

    const nextTimeouts = { ...l.timeouts, [teamId]: left - 1 };
    const event: GameEvent = {
      id: Date.now() + Math.random(),
      period: l.period,
      clock: l.clock,
      teamId,
      playerId: null,
      type: 'timeout',
      secs,
    };

    await patch({
      games: [{ ...g, events: [...g.events, event] }],
      live: {
        timeouts: nextTimeouts,
        running: false,
        toKind: 'timeout',
        toTeam: teamId,
        toLeft: secs * 1000,
        toSuspended: false,
        buzzLeft: BUZZ_MS,
      },
      log: `Q${per(l.period)} ${fc(l.clock)} | ${ab(getTeam(teamId))} TIMEOUT ${secText(secs)} (${left - 1} left)`,
    });
  };

  const handleBreakButton = async () => {
    if (l.toKind) {
      await patch({
        live: { toKind: null, toTeam: null, toLeft: 0, toSuspended: false, buzzLeft: BUZZ_MS },
        log: `${l.toKind} ended early`,
      });
    } else {
      setBreakOpen(true);
    }
  };

  const startBreak = async (minutes: number) => {
    await patch({
      live: {
        running: false,
        toKind: 'break',
        toTeam: null,
        toLeft: Math.round(minutes * 60000),
        toSuspended: false,
      },
      log: `Q${per(l.period)} ${fc(l.clock)} | BREAK started: ${minutes} min`,
    });
  };

  const buzzStart = () => {
    if (buzzHeldRef.current) return;
    buzzHeldRef.current = true;
    Buzzer.unlock();
    patch({ live: { buzzOn: true }, log: 'BUZZER pressed' });
  };

  const buzzStop = () => {
    if (!buzzHeldRef.current) return;
    buzzHeldRef.current = false;
    patch({ live: { buzzOn: false } });
  };

  const buzzLong = () => {
    Buzzer.unlock();
    patch({ live: { buzzLeft: LONG_BUZZ_MS }, log: 'LONG BUZZER' });
  };

  /* ---------- Summary Strip Team Block ---------- */
  const renderSummaryTeam = (teamId: number, rightSide: boolean) => {
    const team = getTeam(teamId);
    const c = teamColor(team);
    const fouls = tf(g, teamId, l.period);
    const toLeft = l.timeouts[teamId] || 0;
    const gf = gameFouls(g, teamId);
    const tech = techFouls(g, teamId);
    const label = (l.names[teamId] || ab(team)).slice(0, 10);

    const info = (
      <div className={`min-w-0 ${rightSide ? 'text-right' : 'text-left'}`}>
        <b style={{ color: c }} className="block text-2xl leading-tight tracking-wide">
          {label}
        </b>
        <small className="block truncate text-xs font-semibold text-[#c7d2fe]">{team?.name}</small>
        <div className={`mt-1.5 flex gap-1.5 ${rightSide ? 'justify-end' : 'justify-start'}`}>
          <span
            className={`flex min-w-[4.6rem] flex-col items-center rounded-lg px-2 py-1 text-[10px] font-bold tracking-wider ${
              fouls >= 5 ? 'bg-[#92400e] text-white' : 'bg-[#16224d] text-[#c7d2fe]'
            }`}
          >
            FOULS
            <strong className="text-xl leading-none text-white">{fouls}</strong>
            {fouls >= 5 && <em className="not-italic text-[9px] text-[#fde68a]">BONUS</em>}
          </span>
          <span className="flex min-w-[4.6rem] flex-col items-center rounded-lg bg-[#16224d] px-2 py-1 text-[10px] font-bold tracking-wider text-[#c7d2fe]">
            TIMEOUTS
            <strong className="text-xl leading-none text-white">{toLeft}</strong>
          </span>
        </div>
        <small className="mt-1 block text-[11px] text-[#8c9bc4]">
          Game fouls {gf} · Technical {tech}
          {l.arrow === teamId && <b className="text-[#fbbf24]"> · ● POSSESSION</b>}
        </small>
      </div>
    );

    const scoreEl = (
      <span
        style={{ fontFamily: 'Arial, sans-serif' }}
        className={`font-extrabold leading-none text-white ${
          operatorMode ? 'text-6xl sm:text-7xl' : 'text-5xl sm:text-6xl'
        }`}
      >
        {sc(g, teamId)}
      </span>
    );

    return (
      <div
        key={teamId}
        style={{ borderTopColor: c }}
        className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[#1a2d6b] border-t-4 bg-[#0a1530] px-3.5 py-2.5"
      >
        {rightSide ? (
          <>
            {scoreEl}
            {info}
          </>
        ) : (
          <>
            {info}
            {scoreEl}
          </>
        )}
      </div>
    );
  };

  /* ---------- Roster Tables ---------- */
  const gameStats = st(g.events);
  const toggleRosterSort = (teamId: number, key: RosterSortKey) => {
    setRosterSort((prev) => {
      const cur = prev[teamId];
      if (!cur || cur.key !== key) {
        return { ...prev, [teamId]: { key, dir: key === 'status' || KS.includes(key as StatKey) ? -1 : 1 } };
      }
      return { ...prev, [teamId]: { key, dir: cur.dir === 1 ? -1 : 1 } };
    });
  };

  const renderRoster = (teamId: number) => {
    const team = getTeam(teamId);
    const c = teamColor(team);
    const onCourt = g.active[teamId] ?? [];
    const sort = rosterSort[teamId];

    const rows = db.players
      .filter((p) => p.teamId === teamId && (!p.archived || g.played.includes(p.id)))
      .map((p) => ({ p, active: onCourt.includes(p.id), s: gameStats[p.id] || Z() }))
      .sort((u, v) => {
        if (!sort) {
          return Number(v.active) - Number(u.active) || byNumber(u.p.number, v.p.number);
        }
        let cmp = 0;
        if (sort.key === 'status') cmp = Number(u.active) - Number(v.active);
        else if (sort.key === 'number') cmp = byNumber(u.p.number, v.p.number);
        else if (sort.key === 'name') cmp = nm(u.p).localeCompare(nm(v.p));
        else cmp = u.s[sort.key] - v.s[sort.key];
        return cmp * sort.dir;
      });

    const sortArrow = (k: RosterSortKey) => (sort?.key === k ? (sort.dir > 0 ? ' ▲' : ' ▼') : '');

    return (
      <div
        key={teamId}
        style={{ borderTopColor: c }}
        className="min-w-0 rounded-xl border border-[#1a2d6b] border-t-4 bg-[#0a1530] p-2.5"
      >
        <h3 style={{ color: c }} className="mb-1.5 text-sm font-bold">
          {team?.name}{' '}
          <small className="ml-1 font-normal text-[#8c9bc4]">{onCourt.length}/5 on court</small>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#16224d] text-[10px] uppercase text-[#8c9bc4]">
                <th
                  onClick={() => toggleRosterSort(teamId, 'status')}
                  className="w-[82px] cursor-pointer px-1.5 py-1.5 text-left hover:text-white"
                >
                  Status{sortArrow('status')}
                </th>
                <th
                  onClick={() => toggleRosterSort(teamId, 'number')}
                  className="w-[38px] cursor-pointer px-1 py-1.5 text-left hover:text-white"
                >
                  #{sortArrow('number')}
                </th>
                <th
                  onClick={() => toggleRosterSort(teamId, 'name')}
                  className="min-w-[14ch] cursor-pointer px-1.5 py-1.5 text-left hover:text-white"
                >
                  Player{sortArrow('name')}
                </th>
                {KS.map((k) => (
                  <th
                    key={k}
                    onClick={() => toggleRosterSort(teamId, k)}
                    className="w-[34px] cursor-pointer px-0.5 py-1.5 text-center hover:text-white"
                  >
                    {k.toUpperCase()}
                    {sortArrow(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, active, s }) => (
                <tr key={p.id} className="h-[32px] border-b border-[#1a2d6b]/70 hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-1.5 text-[11px]">
                    {active ? (
                      <b className="text-[#4ade80]">● ACTIVE</b>
                    ) : (
                      <span className="text-[#8c9bc4]">○ BENCH</span>
                    )}
                  </td>
                  <td className="px-1 font-semibold">{p.number}</td>
                  <td className="max-w-[160px] truncate px-1.5 font-medium">{nm(p)}</td>
                  {KS.map((k) => (
                    <td key={k} className="px-0.5 text-center">
                      {k === 'pf' && s.pf >= 4 ? (
                        <b className="text-[#f87171]">{s.pf}</b>
                      ) : (
                        s[k] || '-'
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ---------- Event Log Sidebar ---------- */
  const filteredEvents = g.events
    .slice()
    .reverse()
    .filter((e) => logTeamFilter === '' || e.teamId === logTeamFilter);

  const shotDisplay = !l.shotOn || l.clock < l.shot ? '--' : Math.ceil(l.shot / 1000);
  const shotRunning = l.running && !l.shotHold && l.shotOn;
  const shotClockText = l.shotOn ? Math.ceil(l.shot / 1000) : 'OFF';

  return (
    <>
      {needLineup && <LineupModal game={g} live={l} />}
      {statAction && (
        <PlayerPickerModal action={statAction} game={g} live={l} onClose={() => setStatAction(null)} />
      )}
      {subOpen && <SubModal game={g} live={l} onClose={() => setSubOpen(false)} />}
      {breakOpen && <BreakModal onStart={startBreak} onClose={() => setBreakOpen(false)} />}
      {gearModal === 'score' && <ScoreGearModal game={g} live={l} onClose={() => setGearModal(null)} />}
      {gearModal === 'game' && (
        <GameGearModal
          game={g}
          live={l}
          onOpenLineup={() => {
            patch({ games: [{ ...g, lineupPeriod: 0 }] });
            setForceLineup(true);
          }}
          onStepPeriod={stepPeriod}
          onClose={() => setGearModal(null)}
        />
      )}
      {gearModal === 'time' && (
        <TimeGearModal
          game={g}
          live={l}
          buzzHere={buzzHere}
          onToggleBuzzHere={(val) => {
            setBuzzHere(val);
            localStorage.buzzHere = val ? '1' : '0';
          }}
          onClose={() => setGearModal(null)}
        />
      )}
      {toPickerTeam !== null && (
        <TimeoutPickerModal
          teamName={l.names[toPickerTeam] || ab(getTeam(toPickerTeam))}
          teamColorHex={teamColor(getTeam(toPickerTeam))}
          timeoutsLeft={l.timeouts[toPickerTeam] || 0}
          onStart={(secs) => startTimeout(toPickerTeam, secs)}
          onClose={() => setToPickerTeam(null)}
        />
      )}
      {editingEvent && (
        <EventEditModal
          game={g}
          event={editingEvent}
          livePeriod={l.period}
          onDeleteRequest={(ev) => setDeletingEvent(ev)}
          onClose={() => setEditingEvent(null)}
        />
      )}
      {deletingEvent && (
        <EventDeleteModal game={g} event={deletingEvent} onClose={() => setDeletingEvent(null)} />
      )}

      <div className="flex flex-col items-start gap-2.5 xl:flex-row">
        {/* Left Main Workstation */}
        <div
          className={`flex w-full min-w-0 flex-1 flex-col gap-2 ${
            operatorMode ? 'mx-auto min-h-[calc(100vh-64px)] max-w-[1400px]' : ''
          }`}
        >
          {/* Top toolbar, Operator Mode toggle & multi-select Show toggles */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={undoLast}
              className="min-h-[38px] rounded-xl bg-[#2a3f87] px-3.5 text-sm font-extrabold text-white hover:bg-[#354fa8]"
            >
              Undo last
            </button>
            <button
              type="button"
              onClick={() => stepPeriod(1)}
              className="min-h-[38px] rounded-xl bg-[#2a3f87] px-3.5 text-sm font-extrabold text-white hover:bg-[#354fa8]"
            >
              Next period ▸
            </button>
            <button
              type="button"
              onClick={() => patch({ live: { swap: !l.swap }, log: 'Team sides swapped on the scoreboard' })}
              className="min-h-[38px] rounded-xl bg-[#2a3f87] px-3.5 text-sm font-extrabold text-white hover:bg-[#354fa8]"
            >
              Swap sides
            </button>

            <button
              type="button"
              aria-pressed={operatorMode}
              onClick={toggleOperatorMode}
              className={`flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3.5 text-sm font-extrabold transition ${
                operatorMode
                  ? 'border-[#f2a501] bg-[#f2a501] text-[#1a1200]'
                  : 'border-[#3a4a8f] bg-[#16224d] text-[#eef2fb] hover:bg-[#243675]'
              }`}
            >
              <Monitor className="h-4 w-4" />
              Operator mode
            </button>

            <span className="flex-1" />

            {operatorMode ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setGearModal('score')}
                  className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#3a4a8f] bg-[#16224d] px-3 text-xs font-extrabold text-[#cfd8ff] hover:bg-[#243675]"
                >
                  <Settings className="h-3.5 w-3.5" /> Score
                </button>
                <button
                  type="button"
                  onClick={() => setGearModal('game')}
                  className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#3a4a8f] bg-[#16224d] px-3 text-xs font-extrabold text-[#cfd8ff] hover:bg-[#243675]"
                >
                  <Settings className="h-3.5 w-3.5" /> Game
                </button>
                <button
                  type="button"
                  onClick={() => setGearModal('time')}
                  className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#3a4a8f] bg-[#16224d] px-3 text-xs font-extrabold text-[#cfd8ff] hover:bg-[#243675]"
                >
                  <Settings className="h-3.5 w-3.5" /> Clock
                </button>
              </div>
            ) : (
              <>
                <span className="text-xs text-[#8c9bc4]">Show</span>
                <div
                  role="group"
                  aria-label="Visible sections"
                  className="flex flex-wrap overflow-hidden rounded-xl border border-[#3a4a8f]"
                >
                  <button
                    type="button"
                    aria-pressed={isAllSelected}
                    onClick={selectAllSections}
                    className={`min-h-[36px] px-3 text-xs font-extrabold transition ${
                      isAllSelected ? 'bg-[#2a3f87] text-white' : 'bg-[#0f1a44] text-[#c7d2fe] hover:bg-[#192b6e]'
                    }`}
                  >
                    All
                  </button>
                  {SECTION_OPTIONS.map(([key, label]) => {
                    const active = visibleSections.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleSection(key)}
                        className={`min-h-[36px] border-l border-[#3a4a8f]/70 px-3 text-xs font-extrabold transition ${
                          active
                            ? 'bg-[#2a3f87] text-white'
                            : 'bg-[#0f1a44] text-[#8c9bc4] hover:bg-[#192b6e] hover:text-[#c7d2fe]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Summary Strip */}
          <div
            className={`grid grid-cols-1 gap-2 ${
              operatorMode ? 'md:grid-cols-[1fr_240px_1fr]' : 'md:grid-cols-[1fr_210px_1fr]'
            }`}
          >
            {renderSummaryTeam(teams[0], false)}

            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-[#f2a501] bg-black px-2 py-2 text-center">
              <small className="text-[11px] font-bold tracking-wider text-[#c7d2fe]">
                PERIOD {per(l.period)} ·{' '}
                {l.running ? <span className="text-[#4ade80]">● RUNNING</span> : '■ STOPPED'}
              </small>
              <span
                style={{ fontFamily: 'Arial, sans-serif' }}
                className={`font-extrabold leading-tight text-[#f2a501] ${
                  operatorMode ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'
                }`}
              >
                {fc(l.clock)}
              </span>
              <span
                style={{ fontFamily: 'Arial, sans-serif' }}
                className={`font-extrabold leading-none text-[#f87171] ${
                  operatorMode ? 'text-3xl' : 'text-2xl'
                }`}
              >
                <small className="mr-1.5 text-[10px] font-bold tracking-wider text-[#c7d2fe]">SHOT</small>
                {shotDisplay}
              </span>
              {g.runningTime && (
                <small
                  className={`mt-0.5 text-[10px] font-bold ${
                    rtActive(g, l) ? 'text-[#4ade80]' : 'text-[#fbbf24]'
                  }`}
                >
                  {rtActive(g, l) ? '⏱ RUNNING TIME' : '⏱ STOP TIME (last 2:00)'}
                </small>
              )}
              {l.toKind && (
                <small className="mt-0.5 text-[11px] font-bold text-[#fbbf24]">
                  {l.toKind === 'break'
                    ? `BREAK ${toText(l.toLeft)}`
                    : `TIMEOUT ${l.toTeam != null ? ab(getTeam(l.toTeam)) : ''} ${toText(l.toLeft)}`}
                  {l.toSuspended ? ' (suspended)' : ''}
                </small>
              )}
            </div>

            {renderSummaryTeam(teams[1], true)}
          </div>

          {/* SCORE CONTROLS & GAME CONTROLS */}
          {(showScore || showGame) && (
            <div className="flex flex-col gap-2 lg:flex-row">
              {showScore && (
                <section className="flex min-w-0 flex-[2.15] flex-col gap-2 rounded-xl border border-[#1a2d6b] bg-[#0a1530] p-2.5">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold tracking-widest text-[#8c9bc4]">SCORE CONTROLS</h5>
                    <span className="flex-1" />
                    <button
                      type="button"
                      aria-label="Score settings"
                      onClick={() => setGearModal('score')}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3a4a8f] bg-[#16224d] text-[#cfd8ff] hover:bg-[#243675]"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[2.7fr_1fr]">
                    <div className="grid grid-cols-4 gap-1.5">
                      {(
                        [
                          [{ kind: 'pts', pts: 1 }, '+1', 'bg-[#1d4ed8] hover:bg-[#1e40af]', '1'],
                          [{ kind: 'pts', pts: 2 }, '+2', 'bg-[#1d4ed8] hover:bg-[#1e40af]', '2'],
                          [{ kind: 'pts', pts: 3 }, '+3', 'bg-[#1d4ed8] hover:bg-[#1e40af]', '3'],
                          [{ kind: 'foul' }, 'FOUL', 'bg-[#b91c1c] hover:bg-[#991b1b]', 'F'],
                        ] as Array<[StatActionSpec, string, string, string]>
                      ).map(([spec, label, bgCls, shortcut]) => (
                        <button
                          key={label}
                          type="button"
                          title={`Shortcut: press ${shortcut}`}
                          onClick={() => triggerStatAction(spec)}
                          className={`relative flex min-h-[96px] items-center justify-center rounded-xl text-2xl font-extrabold text-white transition active:scale-[0.97] sm:text-3xl ${bgCls}`}
                        >
                          {label}
                          <kbd className="pointer-events-none absolute right-1.5 top-1.5 rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                            {shortcut}
                          </kbd>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {(['reb', 'ast', 'stl', 'blk', 'to'] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => triggerStatAction({ kind: 'stat', stat: k })}
                          className="min-h-[44px] rounded-xl bg-[#0f766e] text-sm font-extrabold text-white transition hover:bg-[#115e59] active:scale-[0.97]"
                        >
                          {k.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {showGame && (
                <section className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-[#1a2d6b] bg-[#0a1530] p-2.5">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold tracking-widest text-[#8c9bc4]">GAME CONTROLS</h5>
                    <span className="flex-1" />
                    <button
                      type="button"
                      aria-label="Game settings"
                      onClick={() => setGearModal('game')}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3a4a8f] bg-[#16224d] text-[#cfd8ff] hover:bg-[#243675]"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={openSubstitutions}
                      className="min-h-[52px] rounded-xl bg-[#1e2a6b] text-lg font-extrabold text-white transition hover:bg-[#29398f] active:scale-[0.97]"
                    >
                      Substitutes
                    </button>
                    <div className="flex gap-1.5">
                      {teams.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => patch({ live: { arrow: t }, log: `Possession: ${ab(getTeam(t))}` })}
                          className={`min-h-[46px] flex-1 truncate rounded-xl bg-[#1e2a6b] px-2 text-sm font-extrabold text-white transition hover:bg-[#29398f] ${
                            l.arrow === t ? 'ring-2 ring-inset ring-[#f2a501]' : ''
                          }`}
                        >
                          {ab(getTeam(t))}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => patch({ live: { arrow: null }, log: 'Possession cleared' })}
                        className="min-h-[46px] flex-1 rounded-xl bg-[#2a3f87] px-2 text-sm font-extrabold text-white hover:bg-[#354fa8]"
                      >
                        Clear
                      </button>
                    </div>
                    <label className="-mt-1 text-[10px] font-bold tracking-widest text-[#8c9bc4]">POSSESSION</label>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* TIMEKEEPING CONTROLS (expands into full-screen operator pads when Operator Mode is ON) */}
          {showTime && (
            <section
              className={`flex flex-col gap-2 rounded-xl border border-[#1a2d6b] bg-[#0a1530] p-2.5 ${
                operatorMode ? 'flex-1' : ''
              }`}
            >
              {!operatorMode && (
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold tracking-widest text-[#8c9bc4]">TIMEKEEPING CONTROLS</h5>
                  <span className="flex-1" />
                  <button
                    type="button"
                    aria-label="Timekeeping settings"
                    onClick={() => setGearModal('time')}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3a4a8f] bg-[#16224d] text-[#cfd8ff] hover:bg-[#243675]"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div
                className={`grid grid-cols-2 gap-2 sm:grid-cols-[2.2fr_2.2fr_1fr_1fr] ${
                  operatorMode ? 'flex-1' : ''
                }`}
              >
                <button
                  type="button"
                  title="Shortcut: press Shift + Spacebar"
                  onClick={toggleGameClock}
                  className={`relative flex flex-col items-center justify-center rounded-xl font-extrabold text-white transition active:scale-[0.98] ${
                    operatorMode ? 'min-h-[120px] text-2xl sm:text-3xl' : 'min-h-[68px] text-xl'
                  } ${l.running ? 'bg-[#b91c1c] hover:bg-[#991b1b]' : 'bg-[#15803d] hover:bg-[#166534]'}`}
                >
                  <span>{l.running ? 'PAUSE' : 'START'}</span>
                  <small className="mt-0.5 text-xs font-bold tracking-wider opacity-90">
                    GAME CLOCK {fc(l.clock)}
                  </small>
                  <kbd className="pointer-events-none absolute right-1.5 top-1.5 rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                    SHIFT+SPACE
                  </kbd>
                </button>

                <button
                  type="button"
                  title="Shortcut: press Spacebar"
                  onClick={toggleShotClock}
                  className={`relative flex flex-col items-center justify-center rounded-xl font-extrabold text-white transition active:scale-[0.98] ${
                    operatorMode ? 'min-h-[120px] text-2xl sm:text-3xl' : 'min-h-[68px] text-xl'
                  } ${
                    shotRunning
                      ? 'bg-[#b91c1c] hover:bg-[#991b1b]'
                      : l.shotHold
                        ? 'bg-[#15803d] hover:bg-[#166534]'
                        : 'bg-[#1e2a6b] hover:bg-[#29398f]'
                  }`}
                >
                  <span>{shotRunning ? 'PAUSE' : l.shotHold ? 'START' : 'READY'}</span>
                  <small className="mt-0.5 text-xs font-bold tracking-wider opacity-90">
                    {shotRunning
                      ? `SHOT CLOCK ${shotClockText}`
                      : l.shotHold
                        ? `SHOT CLOCK ${shotClockText} · PAUSED`
                        : `SHOT CLOCK ${shotClockText} · WITH GAME CLOCK`}
                  </small>
                  <kbd className="pointer-events-none absolute right-1.5 top-1.5 rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                    SPACE
                  </kbd>
                </button>

                <button
                  type="button"
                  title="Shortcut: press 9"
                  onClick={() => resetShotClock(24)}
                  className={`relative flex items-center justify-center rounded-xl bg-[#1d4ed8] font-extrabold text-white transition hover:bg-[#1e40af] active:scale-[0.98] ${
                    operatorMode ? 'min-h-[120px] text-3xl sm:text-4xl' : 'min-h-[68px] text-2xl'
                  }`}
                >
                  +24
                  <kbd className="pointer-events-none absolute right-1.5 top-1.5 rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                    9
                  </kbd>
                </button>

                <button
                  type="button"
                  title="Shortcut: press 0"
                  onClick={() => resetShotClock(14)}
                  className={`relative flex items-center justify-center rounded-xl bg-[#1d4ed8] font-extrabold text-white transition hover:bg-[#1e40af] active:scale-[0.98] ${
                    operatorMode ? 'min-h-[120px] text-3xl sm:text-4xl' : 'min-h-[68px] text-2xl'
                  }`}
                >
                  +14
                  <kbd className="pointer-events-none absolute right-1.5 top-1.5 rounded border border-white/70 bg-black/30 px-1.5 py-0.5 text-[10px] font-bold">
                    0
                  </kbd>
                </button>
              </div>

              {/* Possession row shown directly in Operator Mode */}
              {operatorMode && (
                <div className="grid grid-cols-3 gap-2">
                  {teams.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => patch({ live: { arrow: t }, log: `Possession: ${ab(getTeam(t))}` })}
                      className={`min-h-[54px] truncate rounded-xl bg-[#1e2a6b] px-3 text-base font-extrabold text-white transition hover:bg-[#29398f] ${
                        l.arrow === t ? 'ring-2 ring-inset ring-[#f2a501]' : ''
                      }`}
                    >
                      ◀ POSSESSION {ab(getTeam(t))}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => patch({ live: { arrow: null }, log: 'Possession cleared' })}
                    className="min-h-[54px] rounded-xl bg-[#2a3f87] px-3 text-base font-extrabold text-white hover:bg-[#354fa8]"
                  >
                    Clear Possession
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {teams.map((t) => (
                  <button
                    key={t}
                    type="button"
                    title="Tap: start default timeout. Hold: choose another length."
                    onContextMenu={(e) => e.preventDefault()}
                    onPointerDown={() => {
                      toHoldFired.current = false;
                      if (toHoldTimer.current) window.clearTimeout(toHoldTimer.current);
                      toHoldTimer.current = window.setTimeout(() => {
                        toHoldFired.current = true;
                        setToPickerTeam(t);
                      }, 550);
                    }}
                    onPointerUp={() => {
                      if (toHoldTimer.current) window.clearTimeout(toHoldTimer.current);
                    }}
                    onPointerLeave={() => {
                      if (toHoldTimer.current) window.clearTimeout(toHoldTimer.current);
                    }}
                    onClick={() => {
                      if (toHoldFired.current) {
                        toHoldFired.current = false;
                        return;
                      }
                      startTimeout(t);
                    }}
                    className={`flex flex-col items-center justify-center rounded-xl bg-[#facc15] px-2 font-extrabold text-[#1a1200] transition hover:bg-[#fde047] active:scale-[0.98] ${
                      operatorMode ? 'min-h-[76px] text-base' : 'min-h-[54px] text-sm'
                    }`}
                  >
                    <span>TIMEOUT {ab(getTeam(t))}</span>
                    <small className="text-[11px] font-bold">
                      {l.timeouts[t] || 0} left · {secText(l.timeoutSecs || 30)}
                    </small>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleBreakButton}
                  className={`flex flex-col items-center justify-center rounded-xl bg-[#6d28d9] px-2 font-extrabold text-white transition hover:bg-[#5b21b6] active:scale-[0.98] ${
                    operatorMode ? 'min-h-[76px] text-base' : 'min-h-[54px] text-sm'
                  }`}
                >
                  <span>{l.toKind ? `END ${l.toKind === 'break' ? 'BREAK' : 'TIMEOUT'}` : 'BREAK'}</span>
                  {l.toKind && (
                    <small className="text-[11px] font-bold">
                      {toText(l.toLeft)} LEFT{l.toSuspended ? ' · SUSPENDED' : ''}
                    </small>
                  )}
                </button>

                <button
                  type="button"
                  title="Hold to sound"
                  onContextMenu={(e) => e.preventDefault()}
                  onPointerDown={buzzStart}
                  onPointerUp={buzzStop}
                  onPointerLeave={buzzStop}
                  className={`flex touch-none select-none flex-col items-center justify-center rounded-xl bg-[#854d0e] px-2 font-extrabold text-white transition hover:bg-[#713f12] ${
                    operatorMode ? 'min-h-[76px] text-base' : 'min-h-[54px] text-sm'
                  }`}
                >
                  <span>BUZZER</span>
                  <small className="text-[10px] font-bold">HOLD</small>
                </button>

                <button
                  type="button"
                  onClick={buzzLong}
                  className={`flex flex-col items-center justify-center rounded-xl bg-[#b45309] px-2 font-extrabold text-white transition hover:bg-[#92400e] active:scale-[0.98] ${
                    operatorMode ? 'min-h-[76px] text-base' : 'min-h-[54px] text-sm'
                  }`}
                >
                  <span>LONG BUZZER</span>
                </button>
              </div>
            </section>
          )}

          {/* Both Team Rosters (Statistics) */}
          {showStats && (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {teams.map((t) => renderRoster(t))}
            </div>
          )}
        </div>

        {/* Right Sticky Event Log Sidebar */}
        {showLog && (
          <aside
            aria-label="Event log"
            className="flex h-[24rem] w-full flex-none flex-col overflow-hidden rounded-2xl border border-[#2f4690] bg-[#0a1530] xl:sticky xl:top-16 xl:h-[calc(100vh-80px)] xl:w-[390px]"
          >
            <div className="flex items-baseline gap-2 px-3 pt-2.5 pb-1">
              <h4 className="text-base font-bold text-white">Event log</h4>
              <span className="text-xs text-[#8c9bc4]">newest first</span>
              <span className="flex-1" />
              <b className="rounded-full bg-[#4ade80] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[#052e16]">
                LIVE
              </b>
            </div>

            <div className="flex gap-1.5 px-3 pb-2">
              {(
                [
                  ['', 'All'],
                  [teams[0], ab(getTeam(teams[0]))],
                  [teams[1], ab(getTeam(teams[1]))],
                ] as Array<[number | '', string]>
              ).map(([val, label]) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setLogTeamFilter(val)}
                  className={`max-w-[110px] truncate rounded-full border px-3 py-1 text-xs font-bold transition ${
                    logTeamFilter === val
                      ? 'border-[#2a3f87] bg-[#2a3f87] text-white'
                      : 'border-[#3a4a8f] bg-transparent text-[#c7d2fe] hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#1a2d6b]">
              {filteredEvents.length === 0 ? (
                <p className="p-4 text-sm text-[#8c9bc4]">No events yet.</p>
              ) : (
                filteredEvents.map((e, idx) => {
                  const p = e.playerId != null ? getPlayer(e.playerId) : undefined;
                  const team = e.teamId != null ? getTeam(e.teamId) : undefined;
                  const c = teamColor(team);

                  let who = '';
                  let typeLabel = '';
                  let typeColor = 'text-[#5eead4]';

                  if (e.type === 'timeout') {
                    who = `Timeout${e.secs ? ` ${secText(e.secs)}` : ''}`;
                    typeLabel = 'T/O';
                    typeColor = 'text-[#fde047]';
                  } else if (e.type === 'tech') {
                    who = 'Technical foul';
                    typeLabel = 'TECH';
                    typeColor = 'text-[#fca5a5]';
                  } else if (e.type === 'sub') {
                    const inNum = e.playerId != null ? `#${getPlayer(e.playerId)?.number ?? '?'}` : '-';
                    const outNum = e.outId != null ? `#${getPlayer(e.outId)?.number ?? '?'}` : '-';
                    who = `Sub: in ${inNum}, out ${outNum}`;
                    typeLabel = 'SUB';
                    typeColor = 'text-[#c7d2fe]';
                  } else if (e.type === 'foul' && e.staff) {
                    who = `${e.staff === 'coach' ? 'Coach: ' : 'Asst. coach: '}${staffLabel(team, e.staff)}`;
                    typeLabel = `FOUL${foulTag(e)}`;
                    typeColor = 'text-[#fca5a5]';
                  } else if (e.type === 'foul' && !e.playerId) {
                    who = 'Team foul';
                    typeLabel = 'FOUL';
                    typeColor = 'text-[#fca5a5]';
                  } else {
                    who = `#${p?.number ?? '?'} ${nm(p)}`;
                    typeLabel = e.type === 'pts' ? `+${e.pts}` : `${e.type.toUpperCase()}${foulTag(e)}`;
                    typeColor =
                      e.type === 'pts' ? 'text-[#93c5fd]' : e.type === 'foul' ? 'text-[#fca5a5]' : 'text-[#5eead4]';
                  }

                  const prev = idx > 0 ? filteredEvents[idx - 1] : null;
                  const periodBreak = prev && prev.period !== e.period;

                  return (
                    <div
                      key={e.id}
                      style={{ borderLeftColor: c }}
                      className={`grid h-10 grid-cols-[74px_56px_minmax(0,1fr)_44px_30px_30px] items-center border-b border-[#16224d] border-l-4 pl-2 pr-1 text-xs ${
                        periodBreak ? 'border-t-2 border-t-[#3a4a8f]' : ''
                      }`}
                    >
                      <span className="text-[#8c9bc4]">
                        {per(e.period)} · {fc(e.clock)}
                      </span>
                      <span style={{ color: c }} className="truncate font-extrabold">
                        {ab(team)}
                      </span>
                      <span title={who} className="truncate text-[#eef2fb]">
                        {who}
                      </span>
                      <span className={`text-center font-extrabold ${typeColor}`}>{typeLabel}</span>
                      <button
                        type="button"
                        aria-label="Edit event"
                        onClick={() => setEditingEvent(e)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[#cfd8ff] hover:bg-white/10"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete event"
                        onClick={() => setDeletingEvent(e)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[#fca5a5] hover:bg-white/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}