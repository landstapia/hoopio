import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDb } from '../context/DbContext';
import { installMobileHaptics } from '../lib/haptics';
import { ab, sheetSides } from '../lib/format';
import { useOfficiatingPreferences } from './officiating/hooks/useOfficiatingPreferences';
import { useGameActions } from './officiating/hooks/useGameActions';
import { useOfficiatingHotkeys } from './officiating/hooks/useOfficiatingHotkeys';
import { useOfficiatingGuards } from './officiating/hooks/useOfficiatingGuards';
import { OfficiatingModals, type ActiveModal } from './officiating/components/OfficiatingModals';
import { HotkeyHelpModal } from './officiating/components/HotkeyHelpModal';
import { OfficiatingToolbar } from './officiating/components/OfficiatingToolbar';
import { ScoreboardStrip } from './officiating/components/ScoreboardStrip';
import { ScoreControlsPanel } from './officiating/components/ScoreControlsPanel';
import { GameControlsPanel } from './officiating/components/GameControlsPanel';
import { TimekeepingPanel } from './officiating/components/TimekeepingPanel';
import { TeamRosterCard, type RosterSortState } from './officiating/components/TeamRosterCard';
import { EventLogSidebar } from './officiating/components/EventLogSidebar';

export function OfficiatingPage() {
  const { db, liveGame, getTeam, getPlayer, patch } = useDb();

  // 1. Preferences & Display Flags
  const prefs = useOfficiatingPreferences();
  const workstationRef = useRef<HTMLDivElement | null>(null);
  const buzzKeyHeldRef = useRef(false);
  const isWorkstationReady = Boolean(db && liveGame);

  useEffect(() => {
    const el = workstationRef.current;
    if (!el) return;
    return installMobileHaptics(el);
  }, [isWorkstationReady]);

  // 2. Modals State
  const [activeModal, setActiveModal] = useState<ActiveModal>({ type: 'none' });
  const [forceLineup, setForceLineup] = useState(false);
  const [rosterSort, setRosterSort] = useState<RosterSortState>(null);

  // 3. Game Actions
  const { errorMsg, actions } = useGameActions(
    prefs.buzzHere,
    (spec) => setActiveModal(spec ? { type: 'statAction', spec } : { type: 'none' }),
    (open) => setActiveModal(open ? { type: 'sub' } : { type: 'none' }),
    (open) => setActiveModal(open ? { type: 'break' } : { type: 'none' }),
    (open) => setActiveModal(open ? { type: 'timeoutPicker' } : { type: 'none' })
  );

  const currentTeams = db && liveGame ? sheetSides(liveGame, db.live) : [];
  const isFinal = liveGame?.status === 'final';
  const needLineup = Boolean(
    db &&
      liveGame &&
      (forceLineup || (!isFinal && liveGame.lineupPeriod !== db.live.period))
  );
  const anyModalOpen = activeModal.type !== 'none' || needLineup;

  // 4. Guards (Wake Lock, Refresh Guard, Ctrl+Z Undo, '?' Hotkey Help)
  const { showHotkeys, setShowHotkeys } = useOfficiatingGuards({
    isClockRunning: Boolean(db?.live.running),
    hasOpenModal: anyModalOpen || isFinal,
    onUndo: () => {
      if (!isFinal && liveGame && liveGame.events.length > 0) {
        void actions.undoLast();
      }
    },
  });

  // 5. Hotkeys
  useOfficiatingHotkeys({
    anyModalOpen: anyModalOpen || showHotkeys || isFinal,
    liveGame,
    operatorMode: prefs.operatorMode,
    toggleGameClock: actions.toggleGameClock,
    toggleShotClock: actions.toggleShotClock,
    resetShotClock: actions.resetShotClock,
    triggerStatAction: actions.triggerStatAction,
    togglePossession: (side) => {
      if (!db || isFinal) return;
      const targetTeam = currentTeams[side === 'left' ? 0 : 1];
      if (targetTeam == null) return;
      const nextArrow = db.live.arrow === targetTeam ? null : targetTeam;
      void patch({
        live: { arrow: nextArrow },
        log: nextArrow ? `Possession: ${ab(getTeam(nextArrow))}` : 'Possession cleared',
      });
    },
  });

  // 6. Backspace Buzzer Hold Shortcut (refs prevent re-render cleanup from cutting off audio)
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const buzzBlocked = anyModalOpen || showHotkeys || isFinal || !liveGame;
  const buzzBlockedRef = useRef(buzzBlocked);
  buzzBlockedRef.current = buzzBlocked;

  useEffect(() => {
    if (buzzBlocked && buzzKeyHeldRef.current) {
      buzzKeyHeldRef.current = false;
      actionsRef.current.buzzStop();
    }
  }, [buzzBlocked]);

  useEffect(() => {
    const releaseKeyBuzz = () => {
      if (!buzzKeyHeldRef.current) return;
      buzzKeyHeldRef.current = false;
      actionsRef.current.buzzStop();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' || e.ctrlKey || e.altKey || e.metaKey || buzzBlockedRef.current) {
        return;
      }
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (!e.repeat && !buzzKeyHeldRef.current) {
        buzzKeyHeldRef.current = true;
        actionsRef.current.buzzStart();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        releaseKeyBuzz();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseKeyBuzz);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseKeyBuzz);
      releaseKeyBuzz();
    };
  }, []);

  if (!db) {
    return (
      <div className="mx-auto max-w-[1680px] px-4 py-6 text-sm text-[#8c9bc4]">
        Loading officiating workstation…
      </div>
    );
  }

  if (!liveGame) {
    return (
      <div className="mx-auto max-w-[1680px] px-4 py-6">
        <div className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-6">
          <p className="text-base">
            No live game. Set one in{' '}
            <Link to="/games" className="font-bold text-[#f2a501] underline">
              Games
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const teams = sheetSides(liveGame, db.live);
  const teamsMissingActive = teams.filter((t) => (liveGame.active?.[t]?.length ?? 0) === 0);
  const currentModal: ActiveModal = needLineup ? { type: 'lineup' } : activeModal;

  return (
    <>
      <div
        ref={workstationRef}
        className={
          prefs.operatorMode
            ? 'fixed inset-0 z-40 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#050a1c] p-2 sm:p-3'
            : 'mx-auto flex w-full max-w-[1680px] flex-col items-start gap-3 px-3 py-3 sm:px-5 xl:flex-row'
        }
      >
        {/* Left Main Workstation */}
        <div
          className={
            prefs.operatorMode
              ? 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-2'
              : 'flex w-full min-w-0 flex-1 flex-col gap-2.5'
          }
        >
          {errorMsg && (
            <div className="shrink-0 rounded-xl border border-red-800 bg-red-900/50 p-3 text-sm font-bold text-red-200">
              {errorMsg}
            </div>
          )}

          <OfficiatingToolbar
            operatorMode={prefs.operatorMode}
            toggleOperatorMode={prefs.toggleOperatorMode}
            operatorSection={prefs.operatorSection}
            setOperatorSection={prefs.setOperatorSection}
            visibleSections={prefs.visibleSections}
            toggleSection={prefs.toggleSection}
            isAllSelected={prefs.isAllSelected}
            selectAllSections={prefs.selectAllSections}
          />

          {isFinal && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-[#f2a501]/70 bg-[#1e1b0d] px-3.5 py-2.5 text-xs font-bold text-[#fde68a] sm:text-sm">
              <span>
                GAME FINAL — Controls are locked to protect the official box score.
              </span>
              <button
                type="button"
                onClick={() =>
                  void patch({
                    games: [{ ...liveGame, status: 'live' }],
                    log: 'Game reopened from Final',
                  })
                }
                className="rounded-lg border border-[#f2a501] bg-[#f2a501] px-3 py-1 text-xs font-extrabold text-black transition hover:bg-[#fbbf24]"
              >
                Reopen Game
              </button>
            </div>
          )}

          {!isFinal && teamsMissingActive.length > 0 && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/60 bg-amber-950/50 px-3 py-2 text-xs font-bold text-[#fbbf24] sm:text-sm">
              <span>
                ⚠ No active players selected for{' '}
                <strong className="text-white">
                  {teamsMissingActive.map((t) => ab(getTeam(t))).join(' & ')}
                </strong>
              </span>
              <button
                type="button"
                onClick={async () => {
                  setForceLineup(true);
                  await patch({ games: [{ ...liveGame, lineupPeriod: 0 }] });
                  setForceLineup(false);
                }}
                className="rounded-lg border border-amber-400/60 bg-amber-500/20 px-2.5 py-1 text-xs font-extrabold text-white transition hover:bg-amber-500/30"
              >
                Select Lineup
              </button>
            </div>
          )}

          {!prefs.operatorMode && (
            <ScoreboardStrip
              game={liveGame}
              live={db.live}
              teams={teams}
              operatorMode={prefs.operatorMode}
              getTeamFn={getTeam}
            />
          )}

          {/* Operator Mode View Container */}
          {prefs.operatorMode ? (
            <div
              className={`flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 overflow-hidden ${
                isFinal ? 'pointer-events-none select-none opacity-60' : ''
              }`}
            >
              {prefs.showScore && (
                <ScoreControlsPanel
                  teams={teams}
                  currentArrow={db.live.arrow}
                  canUndo={liveGame.events.length > 0}
                  operatorMode={true}
                  getTeamFn={getTeam}
                  setArrow={(t) =>
                    patch({ live: { arrow: t }, log: t ? `Possession: ${ab(getTeam(t))}` : 'Possession cleared' })
                  }
                  triggerStatAction={actions.triggerStatAction}
                  undoLast={actions.undoLast}
                  openGearScore={() => setActiveModal({ type: 'gearScore' })}
                />
              )}

              {prefs.showTime && (
                <TimekeepingPanel
                  live={db.live}
                  operatorMode={true}
                  toggleGameClock={actions.toggleGameClock}
                  toggleShotClock={actions.toggleShotClock}
                  resetShotClock={actions.resetShotClock}
                  openGearTime={() => setActiveModal({ type: 'gearTime' })}
                />
              )}

              {prefs.showGame && (
                <GameControlsPanel
                  live={db.live}
                  teams={teams}
                  operatorMode={true}
                  getTeamFn={getTeam}
                  handleTimeoutButton={actions.handleTimeoutButton}
                  handleBreakButton={actions.handleBreakButton}
                  buzzStart={actions.buzzStart}
                  buzzStop={actions.buzzStop}
                  buzzLong={actions.buzzLong}
                  openSubstitutions={actions.openSubstitutions}
                  onNextPeriod={() => actions.stepPeriod(1)}
                  openHotkeys={() => setShowHotkeys(true)}
                  openGearGame={() => setActiveModal({ type: 'gearGame' })}
                />
              )}
            </div>
          ) : (
            /* Standard Workstation Layout */
            <>
              {(prefs.showScore || prefs.showTime) && (
                <div
                  className={`flex flex-col gap-2.5 lg:flex-row ${
                    isFinal ? 'pointer-events-none select-none opacity-60' : ''
                  }`}
                >
                  {prefs.showScore && (
                    <ScoreControlsPanel
                      teams={teams}
                      currentArrow={db.live.arrow}
                      canUndo={liveGame.events.length > 0}
                      getTeamFn={getTeam}
                      setArrow={(t) =>
                        patch({ live: { arrow: t }, log: t ? `Possession: ${ab(getTeam(t))}` : 'Possession cleared' })
                      }
                      triggerStatAction={actions.triggerStatAction}
                      undoLast={actions.undoLast}
                      openGearScore={() => setActiveModal({ type: 'gearScore' })}
                    />
                  )}
                  {prefs.showTime && (
                    <TimekeepingPanel
                      live={db.live}
                      operatorMode={false}
                      toggleGameClock={actions.toggleGameClock}
                      toggleShotClock={actions.toggleShotClock}
                      resetShotClock={actions.resetShotClock}
                      openGearTime={() => setActiveModal({ type: 'gearTime' })}
                    />
                  )}
                </div>
              )}

              {prefs.showGame && (
                <div className={isFinal ? 'pointer-events-none select-none opacity-60' : ''}>
                  <GameControlsPanel
                    live={db.live}
                    teams={teams}
                    getTeamFn={getTeam}
                    handleTimeoutButton={actions.handleTimeoutButton}
                    handleBreakButton={actions.handleBreakButton}
                    buzzStart={actions.buzzStart}
                    buzzStop={actions.buzzStop}
                    buzzLong={actions.buzzLong}
                    openSubstitutions={actions.openSubstitutions}
                    onNextPeriod={() => actions.stepPeriod(1)}
                    openHotkeys={() => setShowHotkeys(true)}
                    openGearGame={() => setActiveModal({ type: 'gearGame' })}
                  />
                </div>
              )}

              {prefs.showStats && (
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {teams.map((t) => (
                    <TeamRosterCard
                      key={t}
                      teamId={t}
                      game={liveGame}
                      players={db.players}
                      team={getTeam(t)}
                      sort={rosterSort}
                      onSortChange={setRosterSort}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Sticky Event Log Sidebar */}
        {prefs.showLog && (
          <EventLogSidebar
            game={liveGame}
            teams={teams}
            getTeamFn={getTeam}
            getPlayerFn={getPlayer}
            setEditingEvent={(e) => setActiveModal({ type: 'editEvent', event: e })}
            setDeletingEvent={(e) => setActiveModal({ type: 'deleteEvent', event: e })}
          />
        )}
      </div>

      <OfficiatingModals
        activeModal={currentModal}
        setActiveModal={setActiveModal}
        game={liveGame}
        live={db.live}
        buzzHere={prefs.buzzHere}
        setBuzzHere={prefs.setBuzzHere}
        getTeamFn={getTeam}
        startTimeout={actions.startTimeout}
        startBreak={actions.startBreak}
        stepPeriod={actions.stepPeriod}
        onOpenLineup={async () => {
          setForceLineup(true);
          await patch({ games: [{ ...liveGame, lineupPeriod: 0 }] });
          setForceLineup(false);
        }}
      />

      {showHotkeys && <HotkeyHelpModal onClose={() => setShowHotkeys(false)} />}
    </>
  );
}