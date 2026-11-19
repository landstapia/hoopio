import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  RefreshCw,
  ScrollText,
  Upload,
} from 'lucide-react';
import { useDb } from '../context/DbContext';
import {
  exportDatabaseBackup,
  normalizeBackupPayload,
  restoreDatabaseBackup,
  type TransferProgress,
} from '../lib/export';
import { ModalShell } from '../shared/ModalShell';
import type { FullDbPayload } from '../types';

type RestoreModalState =
  | { stage: 'confirm'; fileName: string; payload: FullDbPayload }
  | { stage: 'restoring'; fileName: string; progress: TransferProgress }
  | { stage: 'success'; fileName: string; summary: string }
  | { stage: 'error'; title: string; message: string };

export function LogPage() {
  const { db, patch } = useDb();
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<TransferProgress | null>(null);
  const [restoreModal, setRestoreModal] = useState<RestoreModalState | null>(null);
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

  const handleDownloadBackup = async () => {
    if (!db) return;
    try {
      setExporting(true);
      setExportProgress({ percent: 0, label: 'Starting backup export…' });
      await exportDatabaseBackup(db, setExportProgress);
    } catch (err) {
      setRestoreModal({
        stage: 'error',
        title: 'Backup Export Failed',
        message: err instanceof Error ? err.message : 'Failed to export backup.',
      });
    } finally {
      setExporting(false);
      window.setTimeout(() => setExportProgress(null), 1500);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const rawParsed: unknown = JSON.parse(text);
      const normalized = normalizeBackupPayload(rawParsed);

      setRestoreModal({
        stage: 'confirm',
        fileName: file.name,
        payload: normalized,
      });
    } catch (err) {
      setRestoreModal({
        stage: 'error',
        title: 'Invalid Backup File',
        message: err instanceof Error ? err.message : 'Selected file is not a valid HoopIO backup.',
      });
    }
  };

  const executeRestore = async (fileName: string, normalized: FullDbPayload) => {
    try {
      setRestoreModal({
        stage: 'restoring',
        fileName,
        progress: { percent: 10, label: 'Uploading backup to server…' },
      });

      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized),
      });

      if (res.status === 404 || res.status === 405) {
        await restoreDatabaseBackup(db, patch, normalized, (prog) => {
          setRestoreModal({ stage: 'restoring', fileName, progress: prog });
        });
      } else if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `Restore failed (${res.status})`);
      }

      await loadLog();
      setRestoreModal({
        stage: 'success',
        fileName,
        summary: `${normalized.teams.length} teams, ${normalized.players.length} players, and ${normalized.games.length} games restored.`,
      });
    } catch (err) {
      setRestoreModal({
        stage: 'error',
        title: 'Database Restore Failed',
        message: err instanceof Error ? err.message : 'Failed to restore backup.',
      });
    }
  };

  const q = search.trim().toLowerCase();
  const entries = lines.filter((line) => !q || line.toLowerCase().includes(q));
  const isRestoring = restoreModal?.stage === 'restoring';
  const isBusy = exporting || isRestoring;

  return (
    <>
      {restoreModal && (
        <ModalShell
          maxWidth="max-w-[460px]"
          title={
            restoreModal.stage === 'confirm'
              ? 'Restore Database Backup'
              : restoreModal.stage === 'restoring'
                ? 'Restoring Database…'
                : restoreModal.stage === 'success'
                  ? 'Backup Restored'
                  : restoreModal.title
          }
          subtitle={'fileName' in restoreModal ? restoreModal.fileName : undefined}
          onClose={() => {
            if (!isRestoring) setRestoreModal(null);
          }}
        >
          {restoreModal.stage === 'confirm' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-950/50 p-3 text-xs text-[#fde68a]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f2a501]" />
                <span>
                  This will replace your current teams, players, games, and scoreboard settings
                  with the contents of this backup.
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3 text-center">
                <div>
                  <div className="text-lg font-extrabold text-white">
                    {restoreModal.payload.teams.length}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8c9bc4]">
                    Teams
                  </div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-white">
                    {restoreModal.payload.players.length}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8c9bc4]">
                    Players
                  </div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-white">
                    {restoreModal.payload.games.length}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8c9bc4]">
                    Games
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#1a2d6b] pt-3">
                <button
                  type="button"
                  onClick={() => setRestoreModal(null)}
                  className="rounded-xl bg-[#2a3f87] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#354fa8]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void executeRestore(restoreModal.fileName, restoreModal.payload)
                  }
                  className="rounded-xl bg-[#15803d] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#166534]"
                >
                  Confirm Restore
                </button>
              </div>
            </div>
          )}

          {restoreModal.stage === 'restoring' && (
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#c7d2fe]">{restoreModal.progress.label}</span>
                <span className="font-mono text-[#f2a501]">{restoreModal.progress.percent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#071233]">
                <div
                  style={{ width: `${restoreModal.progress.percent}%` }}
                  className="h-full rounded-full bg-[#f2a501] transition-all duration-200"
                />
              </div>
              <p className="text-[11px] text-[#8c9bc4]">
                Please keep this window open until the restore completes.
              </p>
            </div>
          )}

          {restoreModal.stage === 'success' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-3 text-xs font-bold text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{restoreModal.summary}</span>
              </div>

              <div className="flex justify-end border-t border-[#1a2d6b] pt-3">
                <button
                  type="button"
                  onClick={() => setRestoreModal(null)}
                  className="rounded-xl bg-[#15803d] px-5 py-2 text-xs font-extrabold text-white hover:bg-[#166534]"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {restoreModal.stage === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-red-800 bg-red-900/50 p-3 text-xs font-bold text-red-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <span>{restoreModal.message}</span>
              </div>

              <div className="flex justify-end border-t border-[#1a2d6b] pt-3">
                <button
                  type="button"
                  onClick={() => setRestoreModal(null)}
                  className="rounded-xl bg-[#2a3f87] px-5 py-2 text-xs font-extrabold text-white hover:bg-[#354fa8]"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </ModalShell>
      )}

      <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
        {/* Database Backup & Restore Card */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
                disabled={!db || isBusy}
                onClick={() => void handleDownloadBackup()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#15803d] px-3.5 text-xs font-extrabold text-white hover:bg-[#166534] disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? 'Exporting…' : 'Download JSON Backup'}
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3.5 text-xs font-extrabold text-[#c7d2fe] hover:bg-[#192b6e] disabled:opacity-40"
              >
                <Upload className="h-3.5 w-3.5" />
                {isRestoring ? 'Restoring…' : 'Restore Backup'}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={(e) => void handleFileSelected(e)}
                className="hidden"
              />
            </div>
          </div>

          {exportProgress && (
            <div className="space-y-1.5 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#c7d2fe]">{exportProgress.label}</span>
                <span className="font-mono text-[#f2a501]">{exportProgress.percent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#0f1a44]">
                <div
                  style={{ width: `${exportProgress.percent}%` }}
                  className="h-full rounded-full bg-[#f2a501] transition-all duration-200"
                />
              </div>
            </div>
          )}
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
    </>
  );
}