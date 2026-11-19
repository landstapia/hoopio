import { useEffect, useState } from 'react';
import { AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { useDb } from '../../context/DbContext';
import { Buzzer } from '../../lib/buzzer';
import { fc, ink, toText } from '../../lib/format';
import { ModalShell } from '../../shared/ModalShell';
import type { CustomState } from '../../types';

export function CustomGearModal({
  custom,
  buzzHere,
  onToggleBuzzHere,
  onClose,
}: {
  custom: CustomState;
  buzzHere: boolean;
  onToggleBuzzHere: (val: boolean) => void;
  onClose: () => void;
}) {
  const { patch } = useDb();

  const [aName, setAName] = useState(custom.a.name);
  const [aFull, setAFull] = useState(custom.a.full);
  const [aColor, setAColor] = useState(custom.a.color);

  const [bName, setBName] = useState(custom.b.name);
  const [bFull, setBFull] = useState(custom.b.full);
  const [bColor, setBColor] = useState(custom.b.color);

  const [periodLenInput, setPeriodLenInput] = useState(String(custom.periodLen / 60000));
  const [timeoutInput, setTimeoutInput] = useState(String(custom.timeoutSecs || 30));
  const [mm, setMm] = useState('');
  const [ss, setSs] = useState('');
  const [sv, setSv] = useState('');

  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(id);
  }, [feedback]);

  const adj = [
    [-60, '−1:00'],
    [-10, '−10s'],
    [-1, '−1s'],
    [1, '+1s'],
    [10, '+10s'],
    [60, '+1:00'],
  ] as const;

  const saveTeams = async () => {
    await patch({
      custom: {
        a: { name: (aName.trim() || 'TEAM A').slice(0, 10), full: aFull.trim(), color: aColor },
        b: { name: (bName.trim() || 'TEAM B').slice(0, 10), full: bFull.trim(), color: bColor },
      },
      log: 'Custom scoreboard teams updated',
    });
    setFeedback({ kind: 'ok', text: 'Team names & colors saved.' });
  };

  const savePeriodLen = async () => {
    const m = parseFloat(periodLenInput);
    if (!(m > 0)) {
      setFeedback({ kind: 'err', text: 'Enter a valid period length in minutes.' });
      return;
    }
    await patch({ custom: { periodLen: Math.round(m * 60000) }, log: 'Custom period length changed' });
    setFeedback({ kind: 'ok', text: `Period length set to ${m} min.` });
  };

  const saveTimeoutLen = async () => {
    const n = parseInt(timeoutInput, 10);
    if (!(n >= 5 && n <= 600)) {
      setFeedback({ kind: 'err', text: 'Enter 5 to 600 seconds for timeout length.' });
      return;
    }
    await patch({ custom: { timeoutSecs: n }, log: `Custom timeout length set to ${n}s` });
    setFeedback({ kind: 'ok', text: `Default timeout set to ${n}s.` });
  };

  const setGameClock = async () => {
    const m = parseInt(mm || '0', 10);
    const s = parseFloat(ss || '0');
    if (Number.isNaN(m) || Number.isNaN(s) || m < 0 || s < 0) {
      setFeedback({ kind: 'err', text: 'Enter valid minutes and seconds.' });
      return;
    }
    await patch({ custom: { clock: Math.round((m * 60 + s) * 1000) }, log: 'Custom game clock set' });
    setMm('');
    setSs('');
    setFeedback({ kind: 'ok', text: 'Game clock updated.' });
  };

  const setShotClock = async () => {
    const s = parseFloat(sv);
    if (Number.isNaN(s) || s < 0 || s > 24) {
      setFeedback({ kind: 'err', text: 'Enter 0 to 24 seconds for shot clock.' });
      return;
    }
    await patch({ custom: { shot: Math.round(s * 1000) }, log: 'Custom shot clock set' });
    setSv('');
    setFeedback({ kind: 'ok', text: `Shot clock set to ${s}s.` });
  };

  const resetAll = async () => {
    const len = custom.periodLen || 600000;
    await patch({
      custom: {
        a: { score: 0, fouls: 0, timeouts: 2 },
        b: { score: 0, fouls: 0, timeouts: 2 },
        period: 1,
        clock: len,
        running: false,
        shot: 24000,
        shotOn: true,
        shotHold: false,
        arrow: null,
        toKind: null,
        toTeam: null,
        toLeft: 0,
        toSuspended: false,
      },
      log: 'Custom scoreboard reset',
    });
    onClose();
  };

  return (
    <ModalShell
      maxWidth="max-w-[580px]"
      title="Custom Scoreboard Settings"
      subtitle="Teams, clocks, timeouts & device audio"
      onClose={onClose}
    >
      <div className="space-y-3">
        {feedback && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
              feedback.kind === 'ok'
                ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-200'
                : 'border-red-800 bg-red-900/50 text-red-200'
            }`}
          >
            {feedback.kind === 'ok' ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-300" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Section 1: Teams */}
        <section className="space-y-2.5 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
              Teams &amp; Colors
            </span>
            <span className="text-[11px] text-[#8c9bc4]">Short name max 10 chars</span>
          </div>

          <div className="grid grid-cols-[40px_110px_1fr_48px] items-center gap-1.5">
            <div
              style={{ backgroundColor: aColor, color: ink(aColor) }}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-extrabold ring-1 ring-white/20"
            >
              {(aName || 'A').slice(0, 3).toUpperCase()}
            </div>
            <input
              maxLength={10}
              value={aName}
              onChange={(e) => setAName(e.target.value)}
              placeholder="TEAM A"
              className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm font-bold text-white"
            />
            <input
              value={aFull}
              onChange={(e) => setAFull(e.target.value)}
              placeholder="Full team name"
              className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
            />
            <input
              type="color"
              value={aColor}
              onChange={(e) => setAColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border border-[#3a4a8f] bg-[#0f1a44] p-1"
            />
          </div>

          <div className="grid grid-cols-[40px_110px_1fr_48px] items-center gap-1.5">
            <div
              style={{ backgroundColor: bColor, color: ink(bColor) }}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-extrabold ring-1 ring-white/20"
            >
              {(bName || 'B').slice(0, 3).toUpperCase()}
            </div>
            <input
              maxLength={10}
              value={bName}
              onChange={(e) => setBName(e.target.value)}
              placeholder="TEAM B"
              className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm font-bold text-white"
            />
            <input
              value={bFull}
              onChange={(e) => setBFull(e.target.value)}
              placeholder="Full team name"
              className="h-10 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
            />
            <input
              type="color"
              value={bColor}
              onChange={(e) => setBColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border border-[#3a4a8f] bg-[#0f1a44] p-1"
            />
          </div>

          <button
            type="button"
            onClick={() => void saveTeams()}
            className="min-h-[40px] w-full rounded-xl bg-[#2a3f87] text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-[#354fa8]"
          >
            Save Team Names &amp; Colors
          </button>
        </section>

        {/* Section 2: Game Clock */}
        <section className="space-y-2 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
              Game Clock
            </span>
            <b className="font-mono text-base font-extrabold text-[#f2a501]">{fc(custom.clock)}</b>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {adj.map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => patch({ customAdd: { clock: s * 1000 }, log: `Custom game clock ${s}s` })}
                className="min-h-[40px] rounded-xl bg-[#2a3f87] text-xs font-extrabold text-white transition hover:bg-[#354fa8]"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              value={mm}
              onChange={(e) => setMm(e.target.value)}
              placeholder="min"
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
            />
            <b className="text-[#8c9bc4]">:</b>
            <input
              type="number"
              min="0"
              max="59"
              value={ss}
              onChange={(e) => setSs(e.target.value)}
              placeholder="sec"
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => void setGameClock()}
              className="min-h-[40px] rounded-xl bg-[#2a3f87] px-4 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-[#354fa8]"
            >
              Set Clock
            </button>
          </div>
        </section>

        {/* Section 3: Shot Clock */}
        <section className="space-y-2 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
              Shot Clock
            </span>
            <b className="font-mono text-base font-extrabold text-[#f87171]">
              {custom.shotOn ? `${Math.ceil(custom.shot / 1000)}s` : 'OFF'}
            </b>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => patch({ customAdd: { shot: -1000 }, log: 'Custom shot clock -1s' })}
              className="min-h-[40px] rounded-xl bg-[#2a3f87] text-sm font-extrabold text-white transition hover:bg-[#354fa8]"
            >
              −1s
            </button>
            <button
              type="button"
              onClick={() => patch({ customAdd: { shot: 1000 }, log: 'Custom shot clock +1s' })}
              className="min-h-[40px] rounded-xl bg-[#2a3f87] text-sm font-extrabold text-white transition hover:bg-[#354fa8]"
            >
              +1s
            </button>
            <button
              type="button"
              onClick={() =>
                patch({
                  custom: { shotOn: !custom.shotOn },
                  log: `Custom shot clock ${custom.shotOn ? 'hidden' : 'shown'}`,
                })
              }
              className="min-h-[40px] rounded-xl bg-[#2a3f87] text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-[#354fa8]"
            >
              {custom.shotOn ? 'Hide Shot' : 'Show Shot'}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="24"
              value={sv}
              onChange={(e) => setSv(e.target.value)}
              placeholder="sec (0–24)"
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => void setShotClock()}
              className="min-h-[40px] rounded-xl bg-[#2a3f87] px-4 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-[#354fa8]"
            >
              Set Shot
            </button>
          </div>
        </section>

        {/* Section 4: Period & Default Timeout Lengths */}
        <section className="grid grid-cols-1 gap-2.5 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
              Period Length (min)
            </span>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="1"
                step="any"
                value={periodLenInput}
                onChange={(e) => setPeriodLenInput(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => void savePeriodLen()}
                className="min-h-[40px] rounded-xl bg-[#2a3f87] px-3.5 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-[#354fa8]"
              >
                Save
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
              Default Timeout (sec)
            </span>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="5"
                max="600"
                value={timeoutInput}
                onChange={(e) => setTimeoutInput(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => void saveTimeoutLen()}
                className="min-h-[40px] rounded-xl bg-[#2a3f87] px-3.5 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-[#354fa8]"
              >
                Save
              </button>
            </div>
          </div>
        </section>

        {/* Section 5: Active Break / Timeout Controls */}
        <section className="space-y-2 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8c9bc4]">
              Active Timeout / Break
            </span>
            <span className="text-xs font-bold text-[#fbbf24]">
              {custom.toKind
                ? `${custom.toKind.toUpperCase()} · ${toText(custom.toLeft)}`
                : 'None running'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={!custom.toKind}
              onClick={() =>
                custom.toKind &&
                patch({
                  custom: { toSuspended: !custom.toSuspended },
                  log: `Custom ${custom.toKind} ${custom.toSuspended ? 'resumed' : 'suspended'}`,
                })
              }
              className="min-h-[40px] rounded-xl bg-[#2a3f87] text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-[#354fa8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {custom.toSuspended ? 'Resume Timer' : 'Suspend Timer'}
            </button>
            <button
              type="button"
              disabled={!custom.toKind}
              onClick={() =>
                custom.toKind &&
                patch({
                  custom: { toKind: null, toTeam: null, toLeft: 0, toSuspended: false, buzzLeft: 2500 },
                  log: `Custom ${custom.toKind} ended early`,
                })
              }
              className="min-h-[40px] rounded-xl bg-[#2a3f87] text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-[#354fa8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              End Early
            </button>
          </div>
        </section>

        {/* Section 6: Device Buzzer & Reset */}
        <section className="space-y-2.5 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-[#eef2fb]">
            <input
              type="checkbox"
              checked={buzzHere}
              onChange={(e) => {
                Buzzer.unlock();
                onToggleBuzzHere(e.target.checked);
              }}
              className="h-4 w-4 accent-[#4f7bff]"
            />
            Play the buzzer sound on this device too
          </label>

          {confirmReset ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-500/40 bg-red-950/50 p-2.5 text-xs">
              <span className="font-bold text-red-200">
                Reset all scores, fouls, timeouts &amp; clocks to default?
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg bg-[#2a3f87] px-3 py-1.5 font-bold text-white hover:bg-[#354fa8]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void resetAll()}
                  className="rounded-lg bg-[#b91c1c] px-3 py-1.5 font-extrabold text-white hover:bg-[#991b1b]"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/60 text-xs font-extrabold uppercase tracking-wider text-red-200 transition hover:bg-red-900/70"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Custom Scoreboard
            </button>
          )}
        </section>
      </div>

      <div className="mt-4 flex justify-end border-t border-[#1a2d6b] pt-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-[#15803d] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#166534]"
        >
          Done
        </button>
      </div>
    </ModalShell>
  );
}