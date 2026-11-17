import { useState } from 'react';
import { useDb } from '../../context/DbContext';
import { Buzzer } from '../../lib/buzzer';
import { fc } from '../../lib/format';
import type { Game, LiveState } from '../../types';
import { ModalShell } from '../shared/ModalShell';

export function TimeGearModal({
  game,
  live,
  buzzHere,
  onToggleBuzzHere,
  onClose,
}: {
  game: Game;
  live: LiveState;
  buzzHere: boolean;
  onToggleBuzzHere: (val: boolean) => void;
  onClose: () => void;
}) {
  const { patch } = useDb();
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

  const setGameClock = async () => {
    const m = parseInt(mm || '0', 10);
    const s = parseFloat(ss || '0');
    if (Number.isNaN(m) || Number.isNaN(s) || m < 0 || s < 0) return alert('Enter minutes and seconds');
    await patch({ live: { clock: Math.round((m * 60 + s) * 1000) }, log: 'Game clock set manually' });
  };

  const setShotClock = async () => {
    const s = parseFloat(sv);
    if (Number.isNaN(s) || s < 0 || s > 24) return alert('Enter 0 to 24 seconds');
    await patch({ live: { shot: Math.round(s * 1000) }, log: 'Shot clock set manually' });
  };

  const setRunningTimeField = async (field: 'runningTime' | 'rtLast2', on: boolean) => {
    await patch({
      games: [{ ...game, [field]: on }],
      log:
        field === 'runningTime'
          ? `Game ${game.id}: RUNNING TIME ${on ? 'ON (clock keeps running through fouls and substitutions)' : 'OFF (stop time)'}`
          : `Game ${game.id}: stop-time in the last 2:00 of Q4 / OT (FIBA) ${on ? 'ON' : 'OFF'}`,
    });
  };

  return (
    <ModalShell maxWidth="max-w-[560px]" onClose={onClose}>
      <h3 className="mb-3 pr-10 text-lg font-bold text-[#eef2fb]">
        Clock settings{' '}
        <small className="block text-xs font-normal text-[#8c9bc4]">set the clocks or add / deduct time</small>
      </h3>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">
            Game clock <b className="text-base text-white">{fc(live.clock)}</b>
          </span>
          <div className="grid grid-cols-6 gap-1">
            {adj.map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => patch({ liveAdd: { clock: s * 1000 }, log: `Game clock adjusted ${s}s` })}
                className="min-h-[44px] rounded-xl bg-[#2a3f87] text-xs font-bold text-white hover:bg-[#354fa8]"
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
              className="h-11 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-white"
            />
            <b>:</b>
            <input
              type="number"
              min="0"
              max="59"
              value={ss}
              onChange={(e) => setSs(e.target.value)}
              placeholder="sec"
              className="h-11 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-white"
            />
            <button
              type="button"
              onClick={setGameClock}
              className="min-h-[44px] rounded-xl bg-[#2a3f87] px-4 font-bold text-white hover:bg-[#354fa8]"
            >
              Set
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">
            Shot clock <b className="text-base text-white">{live.shotOn ? Math.ceil(live.shot / 1000) : 'OFF'}</b>
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => patch({ liveAdd: { shot: -1000 }, log: 'Shot clock adjusted -1s' })}
              className="min-h-[44px] rounded-xl bg-[#2a3f87] font-bold text-white hover:bg-[#354fa8]"
            >
              −1s
            </button>
            <button
              type="button"
              onClick={() => patch({ liveAdd: { shot: 1000 }, log: 'Shot clock adjusted 1s' })}
              className="min-h-[44px] rounded-xl bg-[#2a3f87] font-bold text-white hover:bg-[#354fa8]"
            >
              +1s
            </button>
            <button
              type="button"
              onClick={() =>
                patch({
                  live: { shotOn: !live.shotOn },
                  log: `Shot clock ${live.shotOn ? 'hidden' : 'shown'}`,
                })
              }
              className="min-h-[44px] rounded-xl bg-[#2a3f87] font-bold text-white hover:bg-[#354fa8]"
            >
              {live.shotOn ? 'Hide' : 'Show'}
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
              className="h-11 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-white"
            />
            <button
              type="button"
              onClick={setShotClock}
              className="min-h-[44px] rounded-xl bg-[#2a3f87] px-4 font-bold text-white hover:bg-[#354fa8]"
            >
              Set
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#eef2fb]">
            <input
              type="checkbox"
              checked={game.runningTime}
              onChange={(e) => setRunningTimeField('runningTime', e.target.checked)}
              className="h-5 w-5 accent-[#4f7bff]"
            />
            <b>Running time</b>{' '}
            <small className="text-[#8c9bc4]">clock keeps running through fouls and substitutions</small>
          </label>
          <label className="ml-6 flex cursor-pointer items-center gap-2 text-xs text-[#8c9bc4]">
            <input
              type="checkbox"
              checked={game.rtLast2 !== false}
              onChange={(e) => setRunningTimeField('rtLast2', e.target.checked)}
              className="h-4 w-4 accent-[#4f7bff]"
            />
            FIBA stop-time in the last 2:00 of Q4 / overtime (the clock also stops after a made 2 or 3)
          </label>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-[#8c9bc4]">Break / timeout running</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={!live.toKind}
              onClick={() =>
                live.toKind &&
                patch({
                  live: { toSuspended: !live.toSuspended },
                  log: `${live.toKind} ${live.toSuspended ? 'resumed' : 'suspended'}`,
                })
              }
              className="min-h-[44px] rounded-xl bg-[#2a3f87] font-bold text-white disabled:opacity-40"
            >
              {live.toSuspended ? 'Resume' : 'Suspend'}
            </button>
            <button
              type="button"
              disabled={!live.toKind}
              onClick={() =>
                live.toKind &&
                patch({
                  live: { toKind: null, toTeam: null, toLeft: 0, toSuspended: false, buzzLeft: 2500 },
                  log: `${live.toKind} ended early`,
                })
              }
              className="min-h-[44px] rounded-xl bg-[#2a3f87] font-bold text-white disabled:opacity-40"
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