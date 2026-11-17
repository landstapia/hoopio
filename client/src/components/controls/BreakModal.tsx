import { useState } from 'react';
import { ModalShell } from '../shared/ModalShell';

export function BreakModal({
  onStart,
  onClose,
}: {
  onStart: (minutes: number) => void;
  onClose: () => void;
}) {
  const [customMin, setCustomMin] = useState('');

  const startCustom = () => {
    const m = parseFloat(customMin);
    if (!(m > 0)) return alert('Enter the number of minutes');
    onClose();
    onStart(m);
  };

  return (
    <ModalShell maxWidth="max-w-[540px]" onClose={onClose}>
      <h3 className="mb-3 pr-10 text-lg font-bold text-[#eef2fb]">Break — how many minutes?</h3>

      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 15].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              onClose();
              onStart(m);
            }}
            className="rounded-xl bg-[#2a3f87] px-4 py-2.5 font-bold text-white hover:bg-[#354fa8]"
          >
            {m} min
          </button>
        ))}
        <span className="flex-1" />
        <input
          type="number"
          min="1"
          max="120"
          step="0.5"
          value={customMin}
          onChange={(e) => setCustomMin(e.target.value)}
          placeholder="custom minutes"
          className="w-[155px] rounded-lg border border-[#3a4a8f] bg-[#0f1a44] px-3 py-2 text-white placeholder-[#94a5d4]"
        />
        <button
          type="button"
          onClick={startCustom}
          className="rounded-xl bg-[#1d4ed8] px-4 py-2.5 font-bold text-white hover:bg-[#1e40af]"
        >
          Start custom
        </button>
      </div>
    </ModalShell>
  );
}