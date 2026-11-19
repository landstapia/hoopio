import { Monitor } from 'lucide-react';
import type { OperatorSection, SectionKey } from '../hooks/useOfficiatingPreferences';

interface OfficiatingToolbarProps {
  operatorMode: boolean;
  toggleOperatorMode: () => void;
  operatorSection: OperatorSection;
  setOperatorSection: (section: OperatorSection) => void;
  visibleSections: Record<SectionKey, boolean> | Set<SectionKey> | SectionKey[];
  toggleSection: (key: SectionKey) => void;
  isAllSelected: boolean;
  selectAllSections: () => void;
}

const SECTION_OPTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: 'score', label: 'Score' },
  { key: 'time', label: 'Time' },
  { key: 'game', label: 'Game' },
  { key: 'stats', label: 'Stats' },
  { key: 'log', label: 'Log' },
];

const OPERATOR_OPTIONS: Array<{ key: OperatorSection; label: string }> = [
  { key: 'score', label: 'Score Controls' },
  { key: 'time', label: 'Timekeeping' },
  { key: 'game', label: 'Game Controls' },
];

export function OfficiatingToolbar({
  operatorMode,
  toggleOperatorMode,
  operatorSection,
  setOperatorSection,
  visibleSections,
  toggleSection,
  isAllSelected,
  selectAllSections,
}: OfficiatingToolbarProps) {
  const activeBtnCls = '!border-[#3b82f6] !bg-[#1d4ed8] !text-white hover:!bg-[#1e40af]';
  const inactiveBtnCls = 'border-[#3a4a8f] bg-[#16224d] text-[#cfd8ff] hover:bg-[#243675]';

  const isSectionSelected = (key: SectionKey): boolean => {
    if (operatorMode) return false;
    if (visibleSections instanceof Set) return visibleSections.has(key);
    if (Array.isArray(visibleSections)) return visibleSections.includes(key);
    return Boolean(visibleSections?.[key]);
  };

  return (
    <div className="relative z-10 flex w-full min-w-0 shrink-0 flex-wrap items-center justify-between gap-1.5 rounded-xl border border-[#1a2d6b] bg-[#0a1530] px-2.5 py-2 sm:gap-2 sm:px-3">
      {operatorMode ? (
        /* Exclusive 1-of-3 panel selector in Operator Mode */
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Operator view">
          {OPERATOR_OPTIONS.map(({ key, label }) => {
            const active = operatorSection === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setOperatorSection(key)}
                className={`min-h-[34px] rounded-lg border px-2.5 text-[11px] font-extrabold transition sm:text-xs ${
                  active ? activeBtnCls : inactiveBtnCls
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : (
        /* Multi-toggle section filters in Standard Mode */
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={selectAllSections}
            className={`min-h-[34px] rounded-lg border px-2.5 text-xs font-extrabold transition ${
              isAllSelected ? activeBtnCls : inactiveBtnCls
            }`}
          >
            Show All
          </button>

          {SECTION_OPTIONS.map(({ key, label }) => {
            const active = isSectionSelected(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleSection(key)}
                className={`min-h-[34px] rounded-lg border px-2.5 text-xs font-extrabold transition ${
                  active ? activeBtnCls : inactiveBtnCls
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Rightmost: Operator Mode */}
      <button
        type="button"
        onClick={toggleOperatorMode}
        className={`ml-auto flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-extrabold transition sm:px-3 sm:text-xs ${
          operatorMode
            ? 'border-[#f2a501] bg-[#f2a501] text-[#1a1200] hover:bg-[#fbbf24]'
            : inactiveBtnCls
        }`}
      >
        <Monitor className="h-3.5 w-3.5" />
        <span>{operatorMode ? 'Exit Operator Mode' : 'Operator Mode'}</span>
      </button>
    </div>
  );
}