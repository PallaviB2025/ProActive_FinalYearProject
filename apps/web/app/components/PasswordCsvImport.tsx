"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { Credential } from "@proactive/shared";
import {
  parseCredentialCsv,
  credentialIdentity,
  readCsvFile,
  type ImportPreview,
} from "../../lib/csvImport";

type Props = {
  existing: readonly Credential[];
  busy: boolean;
  onImport: (credentials: Credential[]) => Promise<boolean>;
};

export function PasswordCsvImport({ existing, busy, onImport }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const readVersion = useRef(0);
  const submitting = useRef(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  useEffect(() => () => { readVersion.current++; }, []);
  const existingIds = new Set(existing.map(credentialIdentity));
  const availableRows = preview?.rows.filter((row) => row.credential &&
    !row.duplicate && !existingIds.has(credentialIdentity(row.credential))) ?? [];
  const selectedRows = availableRows.filter((row) => selected.includes(row.row));

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const version = ++readVersion.current;
    const element = event.currentTarget;
    setPreview(null);
    setSelected([]);
    setComplete(false);
    setError("");
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = parseCredentialCsv(await readCsvFile(file), existing);
      if (version !== readVersion.current) return;
      element.value = "";
      setPreview(result);
      setSelected(
        result.rows
          .filter((row) => row.credential && !row.duplicate)
          .map((row) => row.row),
      );
    } catch (caught) {
      if (version !== readVersion.current) return;
      setError(caught instanceof Error ? caught.message : "Unable to read CSV");
      element.value = "";
    }
  }

  async function submit() {
    if (!preview || busy || submitting.current) return;
    const credentials = selectedRows
      .flatMap((row) => (row.credential ? [row.credential] : []));
    if (!credentials.length) return;
    submitting.current = true;
    try { if (await onImport(credentials)) {
      setPreview(null);
      setSelected([]);
      setComplete(true);
      if (input.current) input.current.value = "";
    } } finally { submitting.current = false; }
  }

  return (
    <div className="import-zone">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Bring in existing passwords</h3>
          <p className="text-xs mt-1">Choose a browser or password-manager CSV export. It is read only in this browser.</p>
        </div>
        <label className="sec-btn-secondary cursor-pointer mb-0 text-center">
          Import Passwords
          <input
            ref={input}
            data-testid="csv-file"
            type="file"
            disabled={busy}
            accept=".csv,text/csv"
            onChange={(event) => void choose(event)}
            className="sr-only"
          />
        </label>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      {complete && (
        <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Password export files contain plaintext credentials. Delete the exported CSV securely after import.
        </p>
      )}

      {preview && (
        <div className="mt-4" data-testid="import-preview">
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
            <span>Total rows: <strong>{preview.total}</strong></span>
            <span>Valid: <strong>{preview.valid}</strong></span>
            <span>Invalid: <strong>{preview.invalid}</strong></span>
            <span>Duplicates: <strong>{preview.duplicates}</strong></span>
          </div>
          <div className="import-preview max-h-64 overflow-auto divide-y divide-slate-200">
            {preview.rows.map((row) => (
              <label key={row.row} className="flex items-center gap-3 px-3 py-2.5 mb-0 normal-case tracking-normal">
                <input
                  type="checkbox"
                  className="h-4 w-4 min-h-0 shrink-0"
                  disabled={busy || !availableRows.includes(row)}
                  checked={selectedRows.includes(row)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, row.row]
                        : current.filter((value) => value !== row.row),
                    )
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-800">{row.credential?.website || `Row ${row.row}`}</span>
                  <span className="block truncate text-xs text-slate-500">{row.credential?.username || row.error}</span>
                </span>
                <span className="text-xs text-slate-500">{row.duplicate ? "Duplicate" : row.credential ? "Ready" : "Invalid"}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button className="sec-btn-primary" disabled={busy || selectedRows.length === 0} onClick={() => void submit()}>
              Import {selectedRows.length} selected
            </button>
            <button type="button" className="sec-btn-secondary" disabled={busy} onClick={() => { setPreview(null); setSelected([]); if (input.current) input.current.value = ""; }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
