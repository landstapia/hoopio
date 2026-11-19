import { ModalShell } from '../../../shared/ModalShell';

interface HotkeyHelpModalProps {
  onClose: () => void;
}

const SHORTCUTS: Array<[string, string]> = [
  ['Space', 'Start / Stop shot clock'],
  ['Shift + Space', 'Start / Stop game clock'],
  ['9', 'Reset shot clock to 24s'],
  ['0', 'Reset shot clock to 14s'],
  ['1 / 2 / 3', 'Add +1 / +2 / +3 points'],
  ['F', 'Record foul'],
  ['R / A / S / B / T', 'Rebound / Assist / Steal / Block / Turnover'],
  ['U', 'Substitution modal'],
  ['← / →', 'Set possession arrow left / right'],
  ['Backspace', 'Sound buzzer (hold)'],
  ['Ctrl + Z / ⌘ + Z', 'Undo last recorded event'],
  ['?', 'Toggle this keyboard shortcut guide'],
];

export function HotkeyHelpModal({ onClose }: HotkeyHelpModalProps) {
  return (
    <ModalShell maxWidth="max-w-[540px]" title="Keyboard Shortcuts" onClose={onClose}>
      <div className="divide-y divide-[#1a2d6b] rounded-xl border border-[#1a2d6b] bg-[#071233]">
        {SHORTCUTS.map(([keys, desc]) => (
          <div key={keys} className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-xs">
            <span className="font-medium text-[#cfd8ff]">{desc}</span>
            <kbd className="shrink-0 rounded border border-[#3a4a8f] bg-[#0f1a44] px-2 py-1 font-mono text-[11px] font-bold text-[#fbbf24]">
              {keys}
            </kbd>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}