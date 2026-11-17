import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, ScrollText, Upload } from 'lucide-react';
import { useDb } from '../context/DbContext';
import { exportDatabaseBackup } from '../lib/export';

export function LogPage() {
  const { db } = useDb();
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadLog = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/log');
      if (res.ok) {
        const text = await res.text();
        setLines(
          text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .reverse(),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLog();
  }, []);

  const handleDownloadBackup = () => {
    if (db) exportDatabaseBackup(db);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setRestoring(true);
      const text = await file.text();
      const parsed = JSON.parse(text) as { teams?: unknown[]; players?: unknown[]; games?: unknown[] };
      if (!Array.isArray(parsed.teams) || !Array.isArray(parsed.players) || !Array.isArray(parsed.games)) {
        throw new Error('Selected file is not a valid HoopIO backup.');
      }

      const ok = confirm(
        `Restore backup "${file.name}"?\n\nThis will replace current data with ${parsed.teams.length} teams, ${parsed.players.length} players, and ${parsed.games.length} games.`,
      );
      if (!ok) return;

      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) throw new Error(`Restore failed (${res.status})`);
      await loadLog();
      alert('Database backup restored successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to restore backup');
    } finally {
      setRestoring(false);
    }
  };

  const q = search.trim().toLowerCase();
  const entries = lines.filter((line) => !q || line.toLowerCase().includes(q));

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      {/* Database Backup & Restore Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
        <div>
          <h2 className="text-base font-extrabold text-white">Database Backup &amp; Restore</h2>
          <p className="text-xs text-[#8c9bc4]">
            {db
              ? `${db.teams.length} teams · ${db.players.length} players · ${db.games.length} games`
              : 'Loading database summary…'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!db}
            onClick={handleDownloadBackup}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#15803d] px-3.5 text-xs font-extrabold text-white hover:bg-[#166534] disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Download JSON Backup
          </button>

          <button
            type="button"
            disabled={restoring}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3.5 text-xs font-extrabold text-[#c7d2fe] hover:bg-[#192b6e] disabled:opacity-40"
          >
            <Upload className="h-3.5 w-3.5" />
            {restoring ? 'Restoring…' : 'Restore Backup'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleRestoreFile}
            className="hidden"
          />
        </div>
      </div>

      {/* Audit Log Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
        <div className="flex items-center gap-2.5">
          <ScrollText className="h-5 w-5 text-[#f2a501]" />
          <div>
            <h1 className="text-xl font-extrabold text-white">System &amp; Game Audit Log</h1>
            <p className="text-xs text-[#8c9bc4]">Newest entries first ({entries.length} records)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter log entries…"
            className="h-9 w-64 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3 text-xs text-white placeholder-[#94a5d4]"
          />
          <button
            type="button"
            onClick={() => void loadLog()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#2a3f87] px-3 text-xs font-bold text-white hover:bg-[#354fa8]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#1a2d6b] bg-[#0a1530]">
        {loading && entries.length === 0 ? (
          <p className="p-6 text-sm text-[#8c9bc4]">Loading audit log…</p>
        ) : entries.length === 0 ? (
          <p className="p-6 text-sm text-[#8c9bc4]">No log entries found.</p>
        ) : (
          <div className="divide-y divide-[#1a2d6b]/60 font-mono text-xs">
            {entries.map((line, idx) => (
              <div key={idx} className="px-4 py-2 text-[#eef2fb] hover:bg-white/[0.03]">
                {line}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}