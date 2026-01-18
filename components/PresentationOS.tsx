"use client";

import React from "react";
import type { AppState } from "@/lib/types";

import Slide01Overview from "@/components/slides/Slide01Overview";
import Slide02Social from "@/components/slides/Slide02Social";
import Slide03FinanceCalendar from "@/components/slides/Slide03FinanceCalendar";
import Slide04Export from "@/components/slides/Slide04Export";

import {
  computeSpent,
  remainingBudget,
  setActiveSlide,
  downloadState,
  importStateFromFile,
} from "@/lib/store";

export default function PresentationOS({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const spent = computeSpent(state);
  const remaining = remainingBudget(state);
  const slide = state.ui?.activeSlide ?? 0;

  return (
    <main className="min-h-screen text-white">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <div className="text-sm text-white/60 truncate">
              SGA • Live Presentation OS
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm flex-wrap justify-end">
            <div className="text-white/70">
              Total Budget:{" "}
              <span className="font-semibold text-white">
                ${Number(state.totalBudget || 0).toFixed(2)}
              </span>
            </div>
            <div className="text-white/70">
              Spent:{" "}
              <span className="font-semibold text-white">
                ${Number(spent || 0).toFixed(2)}
              </span>
            </div>
            <div className="text-white/70">
              Remaining:{" "}
              <span className="font-semibold text-white">
                ${Number(remaining || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadState(state)}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Export
            </button>

            <button
              onClick={async () => {
                const imported = await importStateFromFile();
                if (!imported) {
                  alert("Invalid or cancelled file.");
                  return;
                }
                setState(imported);
              }}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Import
            </button>

            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => setState((prev) => setActiveSlide(prev, i))}
                className={`h-10 w-10 rounded-full border text-sm transition ${
                  slide === i
                    ? "border-white/30 bg-white/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-10">
        {slide === 0 && <Slide01Overview state={state} setState={setState} />}
        {slide === 1 && <Slide02Social state={state} setState={setState} />}
        {slide === 2 && (
          <Slide03FinanceCalendar state={state} setState={setState} />
        )}
        {slide === 3 && <Slide04Export state={state} setState={setState} />}
      </div>
    </main>
  );
}
