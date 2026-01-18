// components/slides/Slide01Overview.tsx
"use client";

import React from "react";
import { AppState } from "@/lib/types";

export default function Slide01Overview({
  state,
  // kept for consistency with other slides; not used on this slide
  setState,
}: {
  state: AppState;
  setState: (s: AppState) => void;
}) {
  const velvet = state.events.find((e) => e.title === "The Velvet Circle") || state.events[0];

  return (
    <div className="h-full w-full grid grid-cols-12 gap-6">
      {/* LEFT: Velvet Circle status card (full width now) */}
      <div className="col-span-12 rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_80px_rgba(0,0,0,0.55)]">
        <div className="text-[11px] tracking-[0.28em] uppercase text-white/55">Event Status Update</div>
        <div className="mt-2 text-5xl font-semibold text-white">{velvet?.title ?? "The Velvet Circle"}</div>

        <div className="mt-8 grid grid-cols-12 gap-4">
          <InfoBox label="When" value="Wednesday, Jan 21 • 6:00 PM" />
          <InfoBox label="Where" value="Panther Commons • 4th Floor Ballroom" />
          <InfoBox label="Walmart Card" value="$1,282.00" />
          <InfoBox label="Next Step" value="Walmart supply run tomorrow" />
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-6">
          <div className="text-[11px] tracking-[0.28em] uppercase text-white/55">Highlights</div>
          <ul className="mt-4 space-y-3 text-lg text-white/90">
            <li>• Cards + chips + Panther Currency</li>
            <li>• Prizes + mocktails</li>
            <li>• Fast setup plan, no experience required</li>
            <li>• Formal atmosphere (luxury + social)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-12 md:col-span-6 xl:col-span-3 rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="text-[11px] tracking-[0.28em] uppercase text-white/55">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
