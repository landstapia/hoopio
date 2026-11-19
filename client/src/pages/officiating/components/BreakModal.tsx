import { useState, type FormEvent } from 'react';
import { ModalShell } from '../../../shared/ModalShell';

export function BreakModal({
  onStart,
  onClose,
}: {
  onStart: (minutes: number) => void;
  onClose: () => void;
}) {
  const [customMin, setCustomMin] = useState('');

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    const m = parseFloat(customMin);
    if (!(m > 0)) return alert('Enter the number of minutes');
    onClose();
    onStart(m);
  };

  return (
    <ModalShell maxWidth="max-w-[760px]" title="Break" subtitle="How many minutes?" onClose={onClose}>
      <div className="flex flex-wrap items-center justify-center gap-3 sm:flex-nowrap sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[1, 2, 5, 15].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                onClose();
                onStart(m);
              }}
              className="h-12 whitespace-nowrap rounded-xl bg-[#2a3f87] px-4 text-base font-bold text-white transition hover:bg-[#354fa8]"
            >
              {m} min
            </button>
          ))}
        </div>

        <form onSubmit={handleCustomSubmit} className="flex items-center justify-center">
          <input
            type="number"
            min="1"
            max="120"
            step="0.5"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            placeholder="Enter min"
            className="h-12 w-[135px] rounded-l-xl border border-r-0 border-[#3a4a8f] bg-[#0f1a44] px-3.5 text-base text-white placeholder-[#94a5d4] focus:border-[#4f7bff] focus:outline-none"
          />
          <button
            type="submit"
            className="h-12 whitespace-nowrap rounded-r-xl bg-[#2a3f87] px-5 text-base font-bold text-white transition hover:bg-[#354fa8]"
          >
            Start
          </button>
        </form>
      </div>
    </ModalShell>
  );
}