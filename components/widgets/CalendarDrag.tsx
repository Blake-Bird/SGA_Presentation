"use client";

import React, { useMemo, useRef, useState } from "react";
import type { AppState, SgaEvent } from "@/lib/types";
import { addEvent, updateEvent } from "@/lib/store";

function tzOffsetISO() {
  const mins = -new Date().getTimezoneOffset();
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

function statusClass(status?: string) {
  switch (status) {
    case "Planned":
      return "border-white/12 bg-white/5";
    case "Submitted":
      return "border-amber-300/25 bg-gradient-to-br from-amber-300/10 to-white/5";
    case "Approved":
      return "border-emerald-300/25 bg-gradient-to-br from-emerald-300/10 to-white/5";
    case "Purchased":
      return "border-sky-300/25 bg-gradient-to-br from-sky-300/10 to-white/5";
    default:
      return "border-white/12 bg-white/5";
  }
}

function toISOFromLocalInput(v: string) {
  if (!v) return undefined;
  const [date, time] = v.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const dt = new Date(y, m - 1, d, hh, mm, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours()
  )}:${pad(dt.getMinutes())}:00${tzOffsetISO()}`;
}

function addDaysISO(isoDate: string, delta: number) {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + delta);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CalendarDrag({
  state,
  setState,
  windowStart = "2026-01-18",
  days = 28,
  onSelectEvent,
}: {
  state: AppState;
  setState: (s: AppState) => void;
  windowStart?: string;
  days?: number;
  onSelectEvent?: (id: string) => void;
}) {
  const [startISO, setStartISO] = useState(windowStart);
  const startDate = useMemo(() => new Date(startISO + "T00:00:00"), [startISO]);

  const daysArr = useMemo(() => {
    const a: Date[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      a.push(d);
    }
    return a;
  }, [startDate, days]);

  const scheduled = useMemo(
    () => (state.events || []).filter((e) => e.start && e.start.includes("T")),
    [state.events]
  );

  const unscheduled = useMemo(
    () => (state.events || []).filter((e) => !e.start),
    [state.events]
  );

  // ✅ DO NOT use React state for drag id (rerender during drag can cancel it)
  const dragIdRef = useRef<string | null>(null);

  function placeEventOnDay(eventId: string, day: Date) {
    const isoDate = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
      day.getDate()
    ).padStart(2, "0")}`;
    const startLocal = `${isoDate}T18:00`;
    const endLocal = `${isoDate}T20:00`;

    setState((prev) =>
      updateEvent(prev, eventId, {
        start: toISOFromLocalInput(startLocal),
        end: toISOFromLocalInput(endLocal),
      })
    );
    onSelectEvent?.(eventId);

  }

  function createNewEvent() {
    const title = prompt("New event name?");
    if (!title) return;

    const next = addEvent(state, {
      title,
      category: "Other",
      status: "Planned",
      estimatedCost: 0,
      plannedCount: 1,
      location: "TBD",
      notes: "",
      booking: { booked: false },
      social: { status: "Not started", notes: "", assets: [] },
      purchase: { statusText: "Planned — not submitted", lastUpdateISO: new Date().toISOString() },
      checklist: [
        { id: cryptoRandomId(), label: "Book location", done: false },
        { id: cryptoRandomId(), label: "Finalize supplies/items", done: false },
        { id: cryptoRandomId(), label: "Poster ready", done: false },
        { id: cryptoRandomId(), label: "First post scheduled", done: false },
      ],
      items: [],
    } as any);

    setState(next);
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] tracking-[0.28em] uppercase text-white/55">Interactive Calendar</div>
          <div className="mt-1 text-2xl font-semibold text-white">Drag events • fit the semester</div>
          <div className="mt-1 text-sm text-white/60">
            Drop onto a day → defaults to 6:00–8:00 PM (editable in the editor).
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setStartISO((s) => addDaysISO(s, -7))}
            className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm text-white"
            title="Previous week"
          >
            ←
          </button>
          <button
            onClick={() => setStartISO((s) => addDaysISO(s, +7))}
            className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm text-white"
            title="Next week"
          >
            →
          </button>

          <button
            onClick={createNewEvent}
            className="ml-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm text-white"
          >
            + New Event
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-[11px] tracking-[0.28em] uppercase text-white/55">
          Unscheduled (drag onto calendar)
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {unscheduled.map((e) => (
            <DragChip
              key={e.id}
              e={e}
              onDragStart={(ev) => {
                // ✅ Required by some browsers; also avoids state updates
                dragIdRef.current = e.id;
                try {
                  ev.dataTransfer.setData("text/plain", e.id);
                  ev.dataTransfer.effectAllowed = "move";
                } catch {}
              }}
              onDragEnd={() => {
                dragIdRef.current = null;
              }}
              onClick={() => onSelectEvent?.(e.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto overscroll-x-contain pb-2">
        <div className="grid grid-cols-7 gap-3 min-w-[980px]">
          {daysArr.map((d) => {
            const dayEvents = scheduled.filter((e) => {
              if (!e.start) return false;
              const dt = new Date(e.start);
              return (
                dt.getFullYear() === d.getFullYear() &&
                dt.getMonth() === d.getMonth() &&
                dt.getDate() === d.getDate()
              );
            });

            return (
              <div
                key={d.toDateString()}
                className="rounded-2xl border border-white/10 bg-black/20 p-3 min-h-[150px] overflow-hidden"
                onDragOver={(ev) => {
                  // ✅ Must preventDefault for drop to fire
                  ev.preventDefault();
                  try {
                    ev.dataTransfer.dropEffect = "move";
                  } catch {}
                }}
                onDrop={(ev) => {
                  ev.preventDefault();

                  // ✅ Prefer dataTransfer (works even if ref got cleared)
                  let id =
                    ((): string | null => {
                      try {
                        return ev.dataTransfer.getData("text/plain") || null;
                      } catch {
                        return null;
                      }
                    })() ?? dragIdRef.current;

                  if (id) placeEventOnDay(id, d);

                  dragIdRef.current = null;
                }}
              >
                <div className="text-xs text-white/70">
                  {d.toLocaleDateString(undefined, { weekday: "short" })} •{" "}
                  {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>

                <div className="mt-2 space-y-2">
                  {dayEvents.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onSelectEvent?.(e.id)}
                      className={`w-full text-left rounded-xl border px-3 py-2 hover:brightness-110 transition ${statusClass(
                        e.status
                      )}`}
                      title={e.title}
                    >
                      <div className="text-sm font-semibold text-white leading-tight line-clamp-2 break-words">
                        {e.title}
                      </div>
                      <div className="text-xs text-white/60">{formatTime(e.start)}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DragChip({
  e,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  e: SgaEvent;
  onDragStart: (ev: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const count = Number(e.plannedCount ?? 1);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`cursor-grab active:cursor-grabbing select-none rounded-full border px-3 py-2 hover:brightness-110 transition ${statusClass(
        e.status
      )}`}
      title="Drag onto a day"
    >
      <div className="text-sm text-white leading-tight max-w-[260px] truncate">
        {e.title} {count > 1 ? <span className="text-white/60">• {count}x</span> : null}
      </div>
      <div className="text-xs text-white/50 max-w-[260px] truncate">{e.category}</div>
    </div>
  );
}

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function cryptoRandomId() {
  try {
    // @ts-ignore
    return crypto.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}`;
  } catch {
    return `id_${Math.random().toString(16).slice(2)}`;
  }
}
