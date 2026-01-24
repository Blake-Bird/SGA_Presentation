"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { AppState, PdfDoc } from "@/lib/types";
import { setPdfDocs } from "@/lib/store";
import { uploadPdfToRoom } from "@/lib/cloud";

import { Document, Page, pdfjs } from "react-pdf";

// Worker for PDF.js (works on Vercel)
pdfjs.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.js";

export default function PdfWall({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const docs = state.pdfWall?.docs ?? [];
  const [open, setOpen] = useState<PdfDoc | null>(null);

  const roomId = useMemo(() => {
    if (typeof window === "undefined") return "default";
    const u = new URL(window.location.href);
    return u.searchParams.get("room") || "default";
  }, []);

  const total = useMemo(() => {
    return docs.reduce((sum, d) => sum + Number(d.manualTotal ?? d.extractedTotal ?? 0), 0);
  }, [docs]);

  // ✅ always use functional updates so we never write using stale `docs/state`
  const updateDocs = useCallback(
    (fn: (prev: PdfDoc[]) => PdfDoc[]) => {
      setState((prev) => {
        const prevDocs = prev.pdfWall?.docs ?? [];
        const nextDocs = fn(prevDocs);
        return setPdfDocs(prev, nextDocs);
      });
    },
    [setState]
  );

  async function addPdfFromFile(file: File) {
    // 1) upload file to cloud storage
    const uploaded = await uploadPdfToRoom(roomId, file);

    // 2) create doc entry in state (cloud-safe)
    const base: PdfDoc = {
      id: uploaded.id,
      title: file.name.replace(/\.pdf$/i, ""),
      fileName: file.name,
      mime: file.type || "application/pdf",
      url: uploaded.url,
      storagePath: uploaded.storagePath,
      extractedTotal: undefined,
      manualTotal: undefined,
      addedAtISO: new Date().toISOString(),
    };

    // ✅ optimistic insert
    updateDocs((prev) => [base, ...prev]);

    // 3) attempt extraction locally
    try {
      const extracted = await extractTotalRequestedAmount(file);
      updateDocs((prev) =>
        prev.map((d) => (d.id === base.id ? { ...d, extractedTotal: extracted ?? undefined } : d))
      );
    } catch {
      // ignore
    }
  }

  function updateDoc(id: string, patch: Partial<PdfDoc>) {
    updateDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeDoc(id: string) {
    updateDocs((prev) => prev.filter((d) => d.id !== id));
    if (open?.id === id) setOpen(null);
  }

  return (
    <div className="w-full min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <div className="text-[11px] tracking-[0.28em] uppercase text-white/55">
              Submitted Requests (Visible)
            </div>
            <div className="mt-1 text-2xl font-semibold text-white">PDF Wall</div>
            <div className="mt-1 text-sm text-white/60">
              Add PDFs → auto-reads “Total Requested Amount” when possible. Click to expand.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm text-white cursor-pointer whitespace-nowrap">
              + Add PDF
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const input = e.target as HTMLInputElement;
                  const f = input.files?.[0];
                  if (f) await addPdfFromFile(f);
                  input.value = "";
                }}
              />
            </label>

            <div className="w-full sm:w-auto rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-left sm:text-right">
              <div className="text-[11px] tracking-[0.28em] uppercase text-white/55">
                Purchase Request Total
              </div>
              <div className="mt-1 text-2xl font-semibold text-white tabular-nums">
                ${total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {docs.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/70">
            No PDFs yet. Click <span className="text-white">+ Add PDF</span>.
          </div>
        )}

        {docs.map((d) => {
          const docTotal = Number(d.manualTotal ?? d.extractedTotal ?? 0);
          const hasFile = !!d.url;

          return (
            <div key={d.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3">
                  <div className="min-w-0">
                    <input
                      value={d.title}
                      onChange={(e) => updateDoc(d.id, { title: e.target.value })}
                      className="w-full min-w-0 bg-transparent text-white font-semibold outline-none border-b border-white/10 focus:border-white/30"
                    />
                    <div className="mt-1 text-xs text-white/50 break-words">{d.fileName}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm text-white/70 tabular-nums">
                      ${docTotal.toFixed(2)}
                      <span className="ml-2 text-xs text-white/45">
                        {d.manualTotal != null ? "(manual)" : d.extractedTotal != null ? "(auto)" : "(—)"}
                      </span>
                    </div>

                    <button
                      onClick={() => removeDoc(d.id)}
                      className="rounded-full border border-white/15 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 px-3 py-2 text-xs text-white"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[11px] tracking-[0.28em] uppercase text-white/55">
                      Override total (optional)
                    </div>
                    <input
                      type="number"
                      value={d.manualTotal ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateDoc(d.id, { manualTotal: v === "" ? undefined : Number(v) });
                      }}
                      placeholder="Leave blank to use auto"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/25 focus:bg-black/35"
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[11px] tracking-[0.28em] uppercase text-white/55">
                      Open full screen
                    </div>
                    <button
                      disabled={!hasFile}
                      onClick={() => setOpen(d)}
                      className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm ${
                        hasFile
                          ? "border-white/15 bg-white/5 hover:bg-white/10 text-white"
                          : "border-white/10 bg-white/3 text-white/40 cursor-not-allowed"
                      }`}
                    >
                      {hasFile ? "Open viewer (zoom + pages)" : "Missing file URL"}
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  <div className="relative h-[260px]">
                    {hasFile ? (
                      <iframe
                        src={`${d.url}#view=FitH&navpanes=0&toolbar=0`}
                        className="absolute inset-0 h-full w-full"
                        title={d.title}
                      />
                    ) : (
                      <div className="p-4 text-sm text-white/60">No file available.</div>
                    )}
                    <div className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs text-white/80">
                      Preview
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {open && <PdfModal doc={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PdfModal({ doc, onClose }: { doc: PdfDoc; onClose: () => void }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [fitWidth, setFitWidth] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(900);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      setContainerWidth(Math.max(320, Math.floor(w)));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setPage(1);
    setScale(1.1);
    setFitWidth(true);
  }, [doc.id]);

  const canPrev = page > 1;
  const canNext = numPages > 0 && page < numPages;

  return (
    <div className="fixed inset-0 z-[2147483647] bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0 p-4 md:p-8">
        <div className="h-full w-full rounded-3xl border border-white/10 bg-black/70 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-white/10">
            <div className="min-w-0">
              <div className="text-white font-semibold truncate">{doc.title}</div>
              <div className="text-xs text-white/50 truncate">{doc.fileName}</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-white"
              >
                Open tab
              </a>
              <a
                href={doc.url}
                download
                className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-white"
              >
                Download
              </a>
              <button
                onClick={onClose}
                className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm text-white"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-3 border-b border-white/10">
            <button
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`rounded-full border px-3 py-2 text-xs ${
                canPrev
                  ? "border-white/15 bg-white/5 hover:bg-white/10 text-white"
                  : "border-white/10 bg-white/3 text-white/40 cursor-not-allowed"
              }`}
            >
              Prev
            </button>

            <div className="text-xs text-white/70 tabular-nums px-2">
              Page {page} / {numPages || "—"}
            </div>

            <button
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(numPages || p, p + 1))}
              className={`rounded-full border px-3 py-2 text-xs ${
                canNext
                  ? "border-white/15 bg-white/5 hover:bg-white/10 text-white"
                  : "border-white/10 bg-white/3 text-white/40 cursor-not-allowed"
              }`}
            >
              Next
            </button>

            <div className="mx-2 h-6 w-px bg-white/10" />

            <button
              onClick={() => {
                setFitWidth(false);
                setScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(2))));
              }}
              className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-white"
            >
              −
            </button>

            <button
              onClick={() => {
                setFitWidth(false);
                setScale((s) => Math.min(3.0, Number((s + 0.1).toFixed(2))));
              }}
              className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-white"
            >
              +
            </button>

            <button
              onClick={() => setFitWidth(true)}
              className={`rounded-full border px-3 py-2 text-xs ${
                fitWidth ? "border-white/20 bg-white/10 text-white" : "border-white/15 bg-white/5 hover:bg-white/10 text-white"
              }`}
            >
              Fit width
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="px-3 md:px-6 py-6">
              <div
                ref={containerRef}
                className="mx-auto w-full max-w-[1100px] rounded-2xl border border-white/10 bg-black/40 p-3 md:p-4"
              >
                <Document
                  file={doc.url}
                  onLoadSuccess={(info) => {
                    setNumPages(info.numPages);
                    setPage(1);
                  }}
                  loading={<div className="text-white/70 text-sm p-6">Loading PDF…</div>}
                  error={<div className="text-red-200 text-sm p-6">Failed to load PDF.</div>}
                >
                  <Page
                    pageNumber={page}
                    width={fitWidth ? Math.min(1100, containerWidth - 32) : undefined}
                    scale={fitWidth ? undefined : scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              </div>

              <div className="mt-3 text-xs text-white/45 text-center">
                Tip: Fit width for reading, +/− for zoom.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function extractTotalRequestedAmount(file: File): Promise<number | null> {
  const buf = await file.arrayBuffer();

  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js";

  // @ts-ignore
  const loadingTask = pdfjsLib.getDocument({ data: buf });
  const pdf = await loadingTask.promise;

  let fullText = "";
  const maxPages = Math.min(pdf.numPages, 3);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = (content.items as any[]).map((it) => it?.str).filter(Boolean);
    fullText += "\n" + strings.join(" ");
  }

  const patterns = [
    /Total\s+Requested\s+Amount\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i,
    /Total\s+Requested\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i,
  ];

  for (const re of patterns) {
    const m = fullText.match(re);
    if (m?.[1]) return Number(m[1].replace(/,/g, ""));
  }

  return null;
}