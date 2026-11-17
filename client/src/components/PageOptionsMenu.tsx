import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';

export interface PageOptionItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface PageOptionsMenuProps {
  items: PageOptionItem[];
  label?: string;
}

export function PageOptionsMenu({ items, label = 'Page options' }: PageOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#3a4a8f] bg-[#0f1a44] text-[#c7d2fe] hover:bg-[#192b6e] hover:text-white"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 min-w-[210px] overflow-hidden rounded-xl border border-[#3a4a8f] bg-[#0a1530] py-1 shadow-xl"
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="flex w-full items-center px-3.5 py-2 text-left text-xs font-bold text-[#eef2fb] hover:bg-[#192b6e] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}