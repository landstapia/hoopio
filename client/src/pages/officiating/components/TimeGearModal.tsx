import { useState, type FormEvent } from 'react';
import { useDb } from '../../../context/DbContext';
import { Buzzer } from '../../../lib/buzzer';
import { fc, per, secText } from '../../../lib/format';
import type { Game, LiveState } from '../../../types';
import { ModalShell } from '../../../shared/ModalShell';

interface TimeGearModalProps {
  game: Game;
  live: LiveState;
  buzzHere: boolean;
  onToggleBuzzHere: (v: boolean) => void;
  onClose: () => void;
}

export function TimeGearModal({
  game,
  live,
  buzzHere,
  onToggleBuzzHere,
  onClose,
}: TimeGearModalProps) {
  const { patch } = useDb();

  const initialClockSecs = Math.ceil(live.clock / 1000);
  const [clockMin, setClockMin] = useState(() => String(Math.floor(initialClockSecs / 60)));
  const [clockSec, setClockSec] = useState(() => String(initialClockSecs % 60).padStart(2, '0'));
  const [shotSec, setShotSec] = useState(() => String(Math.ceil(live.shot / 1000)));

  const handleSetGameClock = async (e: FormEvent) => {
    e.preventDefault();
    const m = Math.max(0, parseInt(clockMin || '0', 10) || 0);
    const s = Math.min(59, Math.max(0, parseInt(clockSec || '0', 10) || 0));
    const nextMs = (m * 60 + s) * 1000;
    await patch({
      live: { clock: nextMs },
      log: `Controls: game clock set to ${fc(nextMs)} (period ${per(live.period)})`,
    });
  };

  const nudgeGameClock = async (deltaMs: number) => {
    const nextMs = Math.max(0, live.clock + deltaMs);
    const nextSecs = Math.ceil(nextMs / 1000);
    setClockMin(String(Math.floor(nextSecs / 60)));
    setClockSec(String(nextSecs % 60).padStart(2, '0'));
    await patch({
      live: { clock: nextMs },
      log: `Controls: game clock ${deltaMs > 0 ? '+' : ''}${deltaMs / 1000}s → ${fc(nextMs)}`,
    });
  };

  const handleSetShotClock = async (e: FormEvent) => {
    e.preventDefault();
    const s = Math.min(99, Math.max(0, parseInt(shotSec || '0', 10) || 0));
    const nextMs = s * 1000;
    await patch({
      live: { shot: nextMs, shotOn: true },
      log: `Controls: shot clock set to ${s}s`,
    });
  };

  const toggleShotClockEnabled = async () => {
    const nextOn = !live.shotOn;
    await patch({
      live: { shotOn: nextOn, ...(nextOn && live.shot <= 0 ? { shot: 24000 } : {}) },
      log: `Controls: shot clock ${nextOn ? 'enabled' : 'disabled'}`,
    });
  };

  const setDefaultTimeoutSecs = async (secs: number) => {
    await patch({
      live: { timeoutSecs: secs },
      log: `Controls: default timeout set to ${secText(secs)}`,
    });
  };

  const toggleRunningTime = async () => {
    const nextRt = !game.runningTime;
    await patch({
      games: [{ ...game, runningTime: nextRt }],
      log: `Controls: running time ${nextRt ? 'enabled' : 'disabled'}`,
    });
  };

  const toggleRtLast2 = async () => {
    const nextLast2 = !(game.rtLast2 !== false);
    await patch({
      games: [{ ...game, rtLast2: nextLast2 }],
      log: `Controls: stop clock in last 2:00 ${nextLast2 ? 'enabled' : 'disabled'}`,
    });
  };

  const handleToggleBuzz = () => {
    const next = !buzzHere;
    if (next) Buzzer.unlock();
    onToggleBuzzHere(next);
  };

  const rtLast2Enabled = game.rtLast2 !== false;

  return (
    <ModalShell
      maxWidth="max-w-[560px]"
      title="Timekeeping controls"
      subtitle="Custom functions"
      onClose={onClose}
    >
      <div className="space-y-3">
        {/* Section 1: Game Clock Correction */}
        <div className="space-y-2.5 rounded-xl border border-[#1a2d6b] bg-[#0a1530]/70 p-3">
          <div className="flex items-center justify-between border-b border-[#1a2d6b] pb-1.5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#eef2fb]">
                Game Clock Correction
              </h4>
              <p className="text-[11px] text-[#8c9bc4]">Adjust current period clock directly</p>
            </div>
            <b className="font-mono text-base tabular-nums text-[#f2a501]">{fc(live.clock)}</b>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={live.clock === 0}
                onClick={() => nudgeGameClock(-1000)}
                className="min-h-[42px] rounded-xl bg-[#7f1d1d] px-3 text-sm font-bold text-white transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-40"
              >
                −1s
              </button>
              <button
                type="button"
                onClick={() => nudgeGameClock(1000)}
                className="min-h-[42px] rounded-xl bg-[#166534] px-3 text-sm font-bold text-white transition hover:bg-[#15803d]"
              >
                +1s
              </button>
            </div>

            <form onSubmit={handleSetGameClock} className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="99"
                value={clockMin}
                onChange={(e) => setClockMin(e.target.value)}
                aria-label="Minutes"
                className="h-[42px] w-16 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-2 text-center text-sm font-bold text-white focus:border-[#4f7bff] focus:outline-none"
              />
              <b className="text-white">:</b>
              <input
                type="number"
                min="0"
                max="59"
                value={clockSec}
                onChange={(e) => setClockSec(e.target.value)}
                aria-label="Seconds"
                className="h-[42px] w-16 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-2 text-center text-sm font-bold text-white focus:border-[#4f7bff] focus:outline-none"
              />
              <button
                type="submit"
                className="h-[42px] rounded-xl bg-[#2563eb] px-4 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
              >
                Set
              </button>
            </form>
          </div>
        </div>

        {/* Section 2: Shot Clock Settings */}
        <div className="space-y-2.5 rounded-xl border border-[#1a2d6b] bg-[#0a1530]/70 p-3">
          <div className="flex items-center justify-between border-b border-[#1a2d6b] pb-1.5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#eef2fb]">
                Shot Clock
              </h4>
              <p className="text-[11px] text-[#8c9bc4]">Enable, disable, or set custom seconds</p>
            </div>
            <b className="font-mono text-base tabular-nums text-white">
              {live.shotOn ? `${Math.ceil(live.shot / 1000)}s` : 'OFF'}
            </b>
          </div>

          <div
            onClick={toggleShotClockEnabled}
            className="flex cursor-pointer select-none items-center justify-between gap-3 py-0.5"
          >
            <span id="shot-clock-enabled-label" className="text-sm text-[#eef2fb]">
              Use shot clock in this game
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={live.shotOn}
              aria-labelledby="shot-clock-enabled-label"
              onClick={(e) => {
                e.stopPropagation();
                toggleShotClockEnabled();
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4f7bff] focus:ring-offset-2 focus:ring-offset-[#0a1530] ${
                live.shotOn ? 'bg-[#2563eb]' : 'bg-[#1e2d63]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  live.shotOn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <form onSubmit={handleSetShotClock} className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-xs font-semibold text-[#c7d2fe]">Custom shot clock (sec)</span>
            <div className="flex items-center">
              <input
                type="number"
                min="0"
                max="99"
                value={shotSec}
                onChange={(e) => setShotSec(e.target.value)}
                placeholder="sec"
                className="h-[42px] w-24 rounded-l-xl border border-r-0 border-[#3a4a8f] bg-[#0f1a44] px-3 text-sm font-bold text-white placeholder-[#94a5d4] focus:border-[#4f7bff] focus:outline-none"
              />
              <button
                type="submit"
                className="h-[42px] rounded-r-xl bg-[#2563eb] px-4 text-sm font-bold text-white transition hover:bg-[#1d4ed8]"
              >
                Set
              </button>
            </div>
          </form>
        </div>

        {/* Section 3: Clock Rules & Device Buzzer */}
        <div className="space-y-2.5 rounded-xl border border-[#1a2d6b] bg-[#0a1530]/70 p-3">
          <h4 className="border-b border-[#1a2d6b] pb-1.5 text-xs font-bold uppercase tracking-wider text-[#eef2fb]">
            Clock Rules &amp; Audio
          </h4>

          {/* Default Timeout Length */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-[#eef2fb]">Default timeout length</span>
            <div className="flex items-center gap-1.5">
              {[30, 60].map((secs) => {
                const active = (live.timeoutSecs || 30) === secs;
                return (
                  <button
                    key={secs}
                    type="button"
                    onClick={() => setDefaultTimeoutSecs(secs)}
                    className={`min-h-[36px] rounded-xl px-3 text-xs font-extrabold transition ${
                      active
                        ? 'bg-[#facc15] text-[#1a1200]'
                        : 'bg-[#2a3f87] text-white hover:bg-[#354fa8]'
                    }`}
                  >
                    {secText(secs)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Running Time Switch */}
          <div
            onClick={toggleRunningTime}
            className="flex cursor-pointer select-none items-center justify-between gap-3 py-0.5"
          >
            <span id="running-time-label" className="text-sm text-[#eef2fb]">
              Running time
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={!!game.runningTime}
              aria-labelledby="running-time-label"
              onClick={(e) => {
                e.stopPropagation();
                toggleRunningTime();
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4f7bff] focus:ring-offset-2 focus:ring-offset-[#0a1530] ${
                game.runningTime ? 'bg-[#2563eb]' : 'bg-[#1e2d63]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  game.runningTime ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Stop Clock in Last 2:00 Switch */}
          {game.runningTime && (
            <div
              onClick={toggleRtLast2}
              className="flex cursor-pointer select-none items-center justify-between gap-3 py-0.5 pl-3"
            >
              <span id="rt-last2-label" className="text-xs text-[#c7d2fe]">
                Stop clock in last 2:00 (FIBA)
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={rtLast2Enabled}
                aria-labelledby="rt-last2-label"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRtLast2();
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4f7bff] focus:ring-offset-2 focus:ring-offset-[#0a1530] ${
                  rtLast2Enabled ? 'bg-[#2563eb]' : 'bg-[#1e2d63]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                    rtLast2Enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Local Device Buzzer Switch */}
          <div
            onClick={handleToggleBuzz}
            className="flex cursor-pointer select-none items-center justify-between gap-3 py-0.5"
          >
            <span id="buzz-here-label" className="text-sm text-[#eef2fb]">
              Play buzzer sound on this device
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={buzzHere}
              aria-labelledby="buzz-here-label"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleBuzz();
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4f7bff] focus:ring-offset-2 focus:ring-offset-[#0a1530] ${
                buzzHere ? 'bg-[#2563eb]' : 'bg-[#1e2d63]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  buzzHere ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
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