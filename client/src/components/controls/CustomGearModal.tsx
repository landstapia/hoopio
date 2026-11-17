import { useState } from 'react';
import { useDb } from '../../context/DbContext';
import { Buzzer } from '../../lib/buzzer';
import { fc } from '../../lib/format';
import type { CustomState } from '../../types';
import { ModalShell } from '../shared/ModalShell';

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
  };

  const savePeriodLen = async () => {
    const m = parseFloat(periodLenInput);
    if (!(m > 0)) return alert('Enter period length in minutes');
    await patch({ custom: { periodLen: Math.round(m * 60000) }, log: 'Custom period length changed' });
  };

  const saveTimeoutLen = async () => {
    const n = parseInt(timeoutInput, 10);
    if (!(n >= 5 && n <= 600)) return alert('Enter 5 to 600 seconds');
    await patch({ custom: { timeoutSecs: n }, log: `Custom timeout length set to ${n}s` });
  };

  const setGameClock = async () => {
    const m = parseInt(mm || '0', 10);
    const s = parseFloat(ss || '0');
    if (Number.isNaN(m) || Number.isNaN(s) || m < 0 || s < 0) return alert('Enter minutes and seconds');
    await patch({ custom: { clock: Math.round((m * 60 + s) * 1000) }, log: 'Custom game clock set' });
  };

  const setShotClock = async () => {
    const s = parseFloat(sv);
    if (Number.isNaN(s) || s < 0 || s > 24) return alert('Enter 0 to 24 seconds');
    await patch({ custom: { shot: Math.round(s * 1000) }, log: 'Custom shot clock set' });
  };

  const resetAll = async () => {
    if (!confirm('Reset custom scoreboard scores, fouls, timeouts, and clocks to default?')) return;
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
    <ModalShell maxWidth="max-w-[580px]" onClose={onClose}>
      <h3 className="mb-3 pr-10 text-lg font-bold text-[#eef2fb]">
        Custom scoreboard settings{' '}
        <small className="block text-xs font-normal text-[#8c9bc4]">teams, clocks &amp; defaults</small>
      </h3>

      <div className="space-y-4">
        {/* Teams */}
        <div className="space-y-2">
          <span className="text-xs text-[#8c9bc4]">Teams (short name max 10 chars, full name, color)</span>
          <div className="grid grid-cols-[110px_1fr_52px] gap-1.5">
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
          <div className="grid grid-cols-[110px_1fr_52px] gap-1.5">
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
            onClick={saveTeams}
            className="min-h-[40px] w-full rounded-xl bg-[#2a3f87] text-sm font-bold text-white hover:bg-[#354fa8]"
          >
            Save team names &amp; colors
          </button>
        </div>

        {/* Game clock */}
        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">
            Game clock <b className="text-base text-white">{fc(custom.clock)}</b>
          </span>
          <div className="grid grid-cols-6 gap-1">
            {adj.map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => patch({ customAdd: { clock: s * 1000 }, log: `Custom game clock ${s}s` })}
                className="min-h-[40px] rounded-xl bg-[#2a3f87] text-xs font-bold text-white hover:bg-[#354fa8]"
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
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-white"
            />
            <b>:</b>
            <input
              type="number"
              min="0"
              max="59"
              value={ss}
              onChange={(e) => setSs(e.target.value)}
              placeholder="sec"
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-white"
            />
            <button
              type="button"
              onClick={setGameClock}
              className="min-h-[40px] rounded-xl bg-[#2a3f87] px-4 text-sm font-bold text-white hover:bg-[#354fa8]"
            >
              Set
            </button>
          </div>
        </div>

        {/* Shot clock */}
        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">
            Shot clock <b className="text-base text-white">{custom.shotOn ? Math.ceil(custom.shot / 1000) : 'OFF'}</b>
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => patch({ customAdd: { shot: -1000 }, log: 'Custom shot clock -1s' })}
              className="min-h-[40px] rounded-xl bg-[#2a3f87] text-sm font-bold text-white hover:bg-[#354fa8]"
            >
              −1s
            </button>
            <button
              type="button"
              onClick={() => patch({ customAdd: { shot: 1000 }, log: 'Custom shot clock +1s' })}
              className="min-h-[40px] rounded-xl bg-[#2a3f87] text-sm font-bold text-white hover:bg-[#354fa8]"
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
              className="min-h-[40px] rounded-xl bg-[#2a3f87] text-sm font-bold text-white hover:bg-[#354fa8]"
            >
              {custom.shotOn ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="24"
              value={sv}
              onChange={(e) => setSv(e.target.value)}
              placeholder="sec (0-24)"
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-white"
            />
            <button
              type="button"
              onClick={setShotClock}
              className="min-h-[40px] rounded-xl bg-[#2a3f87] px-4 text-sm font-bold text-white hover:bg-[#354fa8]"
            >
              Set
            </button>
          </div>
        </div>

        {/* Period & timeout lengths */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs text-[#8c9bc4]">Period length (min)</span>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="1"
                value={periodLenInput}
                onChange={(e) => setPeriodLenInput(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-white"
              />
              <button
                type="button"
                onClick={savePeriodLen}
                className="min-h-[40px] rounded-xl bg-[#2a3f87] px-3.5 text-sm font-bold text-white hover:bg-[#354fa8]"
              >
                Save
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-[#8c9bc4]">Default timeout (sec)</span>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="5"
                max="600"
                value={timeoutInput}
                onChange={(e) => setTimeoutInput(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-white"
              />
              <button
                type="button"
                onClick={saveTimeoutLen}
                className="min-h-[40px] rounded-xl bg-[#2a3f87] px-3.5 text-sm font-bold text-white hover:bg-[#354fa8]"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Active break / timeout controls */}
        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">Break / timeout running</span>
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
              className="min-h-[40px] rounded-xl bg-[#2a3f87] text-sm font-bold text-white disabled:opacity-40"
            >
              {custom.toSuspended ? 'Resume' : 'Suspend'}
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
              className="min-h-[40px] rounded-xl bg-[#2a3f87] text-sm font-bold text-white disabled:opacity-40"
            >
              End
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#eef2fb]">
          <input
            type="checkbox"
            checked={buzzHere}
            onChange={(e) => {
              Buzzer.unlock();
              onToggleBuzzHere(e.target.checked);
            }}
            className="h-5 w-5 accent-[#4f7bff]"
          />
          play the buzzer sound on this device too
        </label>

        <button
          type="button"
          onClick={resetAll}
          className="min-h-[42px] w-full rounded-xl bg-[#7f1d1d] text-sm font-bold text-white hover:bg-[#991b1b]"
        >
          Reset custom scoreboard
        </button>
      </div>

      <div className="mt-4 flex justify-end border-t border-[#1a2d6b] pt-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-[#15803d] px-5 py-2.5 font-bold text-white hover:bg-[#166534]"
        >
          Done
        </button>
      </div>
    </ModalShell>
  );
}