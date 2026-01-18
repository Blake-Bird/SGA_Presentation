

"use client";
import type { AppState } from "@/lib/types";

const posts = [
  {
    title: "POST 1 — Save the Date",
    copy: ["Suit up for the stakes.", "♠️ The Velvet Circle", "Formal. Strategic. Iconic.", "Jan 21 • 6:00 PM • Panther Commons (4th Floor Ballroom)"],
    note: "Built to be screenshotable → easy DM share."
  },
  {
    title: "POST 2 — Teaser Reel",
    copy: ["Close-ups only: cards, chips, shuffling, gold accents.", "No faces. Slow cinematic audio.", "Caption: “The cards are being shuffled.”"],
    note: "Mystery beats information → curiosity sharing."
  },
  {
    title: "POST 3 — Outfit Inspo (virality driver)",
    copy: ["Slide 1: “Dress like you’re holding pocket aces.”", "Men: suit + loafers", "Women: cocktail / evening dress", "Final: “This is not casual.”"],
    note: "People send this to friends deciding what to wear."
  },
  {
    title: "POST 4 — Rule Reel",
    copy: ["Never played before?", "We’ll teach you in 60 seconds."],
    note: "Removes intimidation → raises attendance ceiling."
  },
  {
    title: "POST 5 — Poker Face Challenge (UGC engine)",
    copy: ["😐😎 Show us your poker face.", "Tag us — best one reposted."],
    note: "Students repost themselves, not you."
  },
  {
    title: "POST 6 — Prize + Mocktails Reveal",
    copy: ["Reveal prizes + named mocktails (Golden Ace / Royal Flush).", "Win big. Sip classy."],
    note: "Material incentive + aesthetic flex."
  },
  {
    title: "POST 7 — Countdown",
    copy: ["⏳ 2 days left", "Doors: 6:00 PM"],
    note: "Urgency + clean info tile."
  },
];

export default function Slide02Social({
  // kept for consistency with other slides; not used on this slide
  state,
  setState,
}: {
  state: AppState;
  setState: (s: AppState) => void;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-glow">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-400">Instagram + Snap Story Campaign</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">1 Post / Day — Share‑Engineered</div>
        </div>
        <div className="text-sm text-zinc-300">Start tomorrow • consistent daily cadence</div>
      </div>

      <div className="mt-6 grid grid-cols-12 gap-4">
        {posts.map((p) => (
          <div key={p.title} className="col-span-12 md:col-span-6 xl:col-span-4 rounded-3xl border border-white/10 bg-zinc-950/30 p-5">
            <div className="text-sm font-semibold">{p.title}</div>
            <div className="mt-3 space-y-1 text-sm text-zinc-200">
              {p.copy.map((c, i) => (
                <div key={i} className="leading-relaxed">{c}</div>
              ))}
            </div>
            <div className="mt-4 text-xs text-zinc-400">{p.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
