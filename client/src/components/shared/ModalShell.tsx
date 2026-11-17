import React, { useEffect } from 'react';

export function ModalShell({
  maxWidth = 'max-w-[560px]',
  dismissable = true,
  onClose,
  children,
}: {
  maxWidth?: string;
  dismissable?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!dismissable || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismissable, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2"
      onClick={(e) => {
        if (dismissable && onClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative max-h-[92vh] w-full ${maxWidth} overflow-auto rounded-[22px] border border-[#2f4690] bg-[#11204f] p-4 sm:p-5 shadow-2xl`}
      >
        {dismissable && onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#7f1d1d] font-bold text-white hover:bg-[#991b1b]"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}