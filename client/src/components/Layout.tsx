import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { BRAND } from '../lib/format';

const MAIN_LINKS = [
  { to: '/officiating', label: 'Officiating' },
  { to: '/games', label: 'Games' },
  { to: '/teams', label: 'Teams' },
  { to: '/players', label: 'Players' },
];

const SCOREBOARD_LINKS = [
  { to: '/scoreboard', label: 'Score' },
  { to: '/playerboard', label: 'Player' },
];

const OTHERS_LINKS = [
  { to: '/custom-scoreboard', label: 'Custom Scoreboard' },
  { to: '/custom-controls', label: 'Custom Controls' },
  { to: '/rules', label: 'Table Officials Reference' },
  { to: '/manual', label: 'FIBA Rules Manual' },
  { to: '/log', label: 'Game Log' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { connected } = useDb();
  const [openMenu, setOpenMenu] = useState<'sb' | 'others' | null>(null);
  const [clockText, setClockText] = useState('');

  const isDisplayPage =
    pathname === '/scoreboard' ||
    pathname === '/playerboard' ||
    pathname === '/custom-scoreboard' ||
    pathname.endsWith('/statistics') ||
    pathname.endsWith('/scoresheet');

  const isCtlPage = pathname === '/officiating' || pathname === '/custom-controls';

  useEffect(() => {
    const update = () =>
      setClockText(
        new Date().toLocaleString([], {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  if (isDisplayPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050a1c] text-[#eef2fb]">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-1.5 border-b-2 border-[#f2a501] bg-[#040918] px-3 py-1.5 print:hidden">
        <Link to="/" className="mr-3 flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-[#10245f]">
          <img src={BRAND.logo} alt={BRAND.name} className="h-10 w-10 object-contain" />
          <span className="flex flex-col leading-tight">
            <b className="text-lg tracking-wider text-[#f2a501]">{BRAND.name}</b>
            <small className="hidden max-w-[260px] text-[11px] text-[#8c9bc4] xl:block">
              {BRAND.fullName}
            </small>
          </span>
        </Link>

        {/* Scoreboard dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'sb' ? null : 'sb')}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              SCOREBOARD_LINKS.some((l) => l.to === pathname)
                ? 'bg-[#01247c] text-white'
                : 'text-[#eef2fb] hover:bg-[#10245f]'
            }`}
          >
            Scoreboard <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {openMenu === 'sb' && (
            <div className="absolute left-0 top-full mt-1 min-w-[180px] rounded-xl border border-[#1a2d6b] bg-[#040918] p-1 shadow-2xl">
              {SCOREBOARD_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block rounded-lg px-3 py-2 text-sm text-[#eef2fb] hover:bg-[#10245f]"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {MAIN_LINKS.map((l) => {
          const active = pathname === l.to || pathname.startsWith(`${l.to}/`);
          return (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active ? 'bg-[#01247c] text-white' : 'text-[#eef2fb] hover:bg-[#10245f]'
              }`}
            >
              {l.label}
            </Link>
          );
        })}

        {/* Others dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'others' ? null : 'others')}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              OTHERS_LINKS.some((l) => l.to === pathname)
                ? 'bg-[#01247c] text-white'
                : 'text-[#eef2fb] hover:bg-[#10245f]'
            }`}
          >
            Others <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {openMenu === 'others' && (
            <div className="absolute left-0 top-full mt-1 min-w-[210px] rounded-xl border border-[#1a2d6b] bg-[#040918] p-1 shadow-2xl">
              {OTHERS_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block rounded-lg px-3 py-2 text-sm text-[#eef2fb] hover:bg-[#10245f]"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto hidden items-center gap-2 text-xs text-[#8c9bc4] md:flex">
          <span
            title={connected ? 'Real-time Socket.IO connected' : 'Reconnecting...'}
            className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}
          />
          <span>{clockText}</span>
        </div>
      </header>

      <main className={`flex-1 w-full ${isCtlPage ? 'p-0' : 'px-3 py-2.5'}`}>{children}</main>

      {!isCtlPage && (
        <footer className="py-5 text-center text-xs text-[#8c9bc4] print:hidden">
          {BRAND.name} · {BRAND.fullName}
        </footer>
      )}
    </div>
  );
}