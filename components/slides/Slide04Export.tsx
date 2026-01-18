"use client";

import type { AppState } from "@/lib/types";
import { downloadState, importStateFromFile } from "@/lib/store";
import { useState } from "react";



export default function Slide04Export({
  state,
  setState,
}: {
  state: AppState;
  setState: (s: AppState) => void;
}) {
  const [raw, setRaw] = useState("");

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 xl:col-span-7 rounded-3xl border border-white/10 bg-white/5 p-7 shadow-glow">
        <div className="text-xs uppercase tracking-widest text-zinc-400">Backup / Restore</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">Export or import your full plan</div>
        <div className="mt-2 text-sm text-zinc-300">
          This lets you keep a clean snapshot before the meeting, then iterate live without fear.
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => {
              const json = JSON.stringify(state, null, 2);
              navigator.clipboard?.writeText(json);
            }}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
          >
            Copy Export JSON
          </button>

          <button
            onClick={() => setRaw(JSON.stringify(state, null, 2))}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Show Export JSON
          </button>

          <button
            onClick={() => downloadState(state)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Download JSON File
          </button>
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste JSON here to import…"
          className="mt-4 h-[360px] w-full rounded-3xl border border-white/10 bg-zinc-950/40 p-4 text-xs text-zinc-200 outline-none focus:border-white/20"
        />

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              try {
                const parsed = JSON.parse(raw) as AppState;
                setState(parsed);
              } catch {
                alert("Invalid JSON");
              }
            }}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
          >
            Import JSON
          </button>
          
          <button
            onClick={async () => {
              const imported = await importStateFromFile();
              if (imported) setState(imported);
            }}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Import from File
          </button>


          <button
            onClick={() => setRaw("")}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="col-span-12 xl:col-span-5 rounded-3xl border border-white/10 bg-white/5 p-7 shadow-glow">
        <div className="text-xs uppercase tracking-widest text-zinc-400">Meeting Checklist</div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">What to say as you drive the deck</div>

        <div className="mt-5 space-y-3 text-sm text-zinc-200">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
            <div className="font-semibold">Velvet Circle is locked.</div>
            <div className="text-zinc-400">Jan 21 • 6PM • Panther Commons 4th Floor Ballroom • Walmart card $1,282</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
            <div className="font-semibold">Social rollout is disciplined.</div>
            <div className="text-zinc-400">1 post/day, share‑engineered, outfit post is the anchor.</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
            <div className="font-semibold">Budget is transparent.</div>
            <div className="text-zinc-400">PDF totals shown on-screen + calendar spend-down live.</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
            <div className="font-semibold">Calendar is flexible.</div>
            <div className="text-zinc-400">We can drag dates live to fit constraints without redoing paperwork.</div>
          </div>
        </div>

        <div className="mt-6 text-xs text-zinc-400">
          Everything persists automatically in your browser (localStorage) so you can reopen it and it’s still updated.
        </div>
      </div>
    </div>
  );
}
