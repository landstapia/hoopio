import { useState } from 'react';
import { ModalShell } from '../shared/ModalShell';

export function TimeoutPickerModal({
  teamName,
  teamColorHex,
  timeoutsLeft,
  onStart,
  onClose,
}: {
  teamName: string;
  teamColorHex: string;
  timeoutsLeft: number;
  onStart: (secs: number) => void;
  onClose: () => void;
}) {
  const [min, setMin] = useState('');
  const [sec, setSec] = useState('');

  const startCustom = () => {
    const s = parseInt(min || '0', 10) * 60 + parseInt(sec || '0', 10);
    if (!(s > 0)) return alert('Enter the timeout length (minutes and seconds)');
    onClose();
    onStart(s);
  };

  return (
    <ModalShell maxWidth="max-w-[540px]" onClose={onClose}>
      <h3 className="mb-3 pr-10 text-lg font-bold text-[#eef2fb]">
        Timeout · <span style={{ color: teamColorHex }}>{teamName}</span>{' '}
        <small className="block text-xs font-normal text-[#8c9bc4]">{timeoutsLeft} left · choose the length</small>
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            onStart(60);
          }}
          className="min-h-[64px] rounded-xl bg-[#facc15] text-2xl font-extrabold text-[#1a1200] hover:bg-[#fde047]"
        >
          1:00
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onStart(30);
          }}
          className="min-h-[64px] rounded-xl bg-[#facc15] text-2xl font-extrabold text-[#1a1200] hover:bg-[#fde047]"
        >
          0:30
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        <span className="text-xs text-[#8c9bc4]">Custom time</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="0"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="min"
            className="h-11 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-white"
          />
          <b>:</b>
          <input
            type="number"
            min="0"
            max="59"
            value={sec}
            onChange={(e) => setSec(e.target.value)}
            placeholder="sec"
            className="h-11 min-w-0 flex-1 rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-2.5 text-white"
          />
          <button
            type="button"
            onClick={startCustom}
            className="min-h-[44px] rounded-xl bg-[#facc15] px-4 font-extrabold text-[#1a1200]"
          >
            Start
          </button>
        </div>
      </div>
    </ModalShell>
  );
}