import React, { useEffect } from 'react';

export function ModalShell({
  maxWidth = 'max-w-[560px]',
  dismissable = true,
  title,
  subtitle,
  onClose,
  children,
}: {
  maxWidth?: string;
  dismissable?: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
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

  const hasCloseBtn = dismissable && !!onClose;

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
        {hasCloseBtn && (
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#7f1d1d] font-bold text-white hover:bg-[#991b1b]"
          >
            ✕
          </button>
        )}

        {title && (
          <div className={`mb-4 border-b border-[#1a2d6b] pb-3.5 ${hasCloseBtn ? 'pr-10' : ''}`}>
            <h3 className="text-xl font-bold leading-tight text-[#eef2fb]">{title}</h3>
            {subtitle && <p className="mt-1 text-xs sm:text-sm text-[#8c9bc4]">{subtitle}</p>}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}