import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClockTickPayload, FullDbPayload, Game, PatchChange, Player, Team } from '../types';

interface DbContextValue {
  db: FullDbPayload | null;
  connected: boolean;
  patch: (change: PatchChange) => Promise<FullDbPayload>;
  uploadFile: (
    folder: 'team-logos' | 'team-photos' | 'solo-photos' | 'event-photos' | 'event-videos',
    file: File,
  ) => Promise<string>;
  getTeam: (id: number | undefined | null) => Team | undefined;
  getPlayer: (id: number | undefined | null) => Player | undefined;
  getGame: (id: number | undefined | null) => Game | undefined;
  liveGame: Game | undefined;
}

const DbContext = createContext<DbContextValue | null>(null);

export function DbProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<FullDbPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initial HTTP load so the UI renders immediately even before socket handshake completes
    fetch('/api/db')
      .then((r) => r.json())
      .then((data: FullDbPayload) => setDb(data))
      .catch((err) => console.error('Failed to load initial /api/db:', err));

    const socket = io({
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('db:state', (state: FullDbPayload) => {
      setDb(state);
    });

    socket.on('clock:tick', (tick: ClockTickPayload) => {
      setDb((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          live: { ...prev.live, ...tick.live },
          custom: { ...prev.custom, ...tick.custom },
        };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const patch = useCallback(async (change: PatchChange): Promise<FullDbPayload> => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      return new Promise<FullDbPayload>((resolve) => {
        socket.emit('patch', change, (state: FullDbPayload) => {
          setDb(state);
          resolve(state);
        });
      });
    }

    const res = await fetch('/api/patch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(change),
    });
    const state = (await res.json()) as FullDbPayload;
    setDb(state);
    return state;
  }, []);

  const uploadFile = useCallback(
    async (
      folder: 'team-logos' | 'team-photos' | 'solo-photos' | 'event-photos' | 'event-videos',
      file: File,
    ): Promise<string> => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/upload/${folder}`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = (await res.json()) as { url: string };
      return data.url;
    },
    [],
  );

  const value = useMemo<DbContextValue>(() => {
    const getTeam = (id: number | undefined | null) =>
      id == null ? undefined : db?.teams.find((t) => t.id === Number(id));
    const getPlayer = (id: number | undefined | null) =>
      id == null ? undefined : db?.players.find((p) => p.id === Number(id));
    const getGame = (id: number | undefined | null) =>
      id == null ? undefined : db?.games.find((g) => g.id === Number(id));
    const liveGame = db?.live.gameId != null ? getGame(db.live.gameId) : undefined;

    return {
      db,
      connected,
      patch,
      uploadFile,
      getTeam,
      getPlayer,
      getGame,
      liveGame,
    };
  }, [db, connected, patch, uploadFile]);

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb(): DbContextValue {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error('useDb must be used inside <DbProvider>');
  return ctx;
}