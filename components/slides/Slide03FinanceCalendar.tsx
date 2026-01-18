"use client";

import React, { useEffect, useMemo } from "react";
import type { AppState } from "@/lib/types";
import PdfWall from "@/components/widgets/PdfWall";
import CalendarDrag from "@/components/widgets/CalendarDrag";
import EventEditor from "@/components/widgets/EventEditor";

export default function Slide03FinanceCalendar({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const firstId = useMemo(
    () => (state.events?.[0]?.id ? state.events[0].id : null),
    [state.events]
  );

  useEffect(() => {
    const current = (state.ui as any)?.selectedEventId ?? null;
    if (!current && firstId) {
      setState((prev) => ({
        ...prev,
        ui: {
          ...((prev.ui || ({ activeSlide: 2 } as any)) as any),
          selectedEventId: firstId,
        } as any,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstId]);

  const selectedId = ((state.ui as any)?.selectedEventId ??
    firstId ??
    null) as string | null;

  return (
    <section
      className="
        w-full min-w-0
        grid grid-cols-1 gap-6 items-start
        h-[calc(100vh-120px)]
        overflow-hidden

        xl:w-screen xl:max-w-none
        xl:relative xl:left-1/2 xl:-translate-x-1/2
        xl:px-8

        lg:grid-cols-[minmax(340px,400px)_minmax(360px,420px)_minmax(0,1fr)]
        lg:grid-rows-[auto_minmax(0,1fr)]

        xl:grid-cols-[minmax(340px,400px)_minmax(0,1fr)_minmax(360px,420px)]
        xl:grid-rows-1
      "
    >
      {/* LEFT: PDF */}
      <div
        className="
          min-w-0 overflow-x-hidden overscroll-contain
          lg:max-h-[42vh] lg:overflow-y-auto
          xl:max-h-none xl:h-full xl:overflow-y-auto
        "
      >
        <PdfWall state={state} setState={setState} />
      </div>

      {/* RIGHT (on LG): EVENT EDITOR */}
      <div
        className="
          min-w-0 overflow-x-hidden overscroll-contain
          lg:max-h-[42vh] lg:overflow-y-auto
          xl:max-h-none xl:h-full xl:overflow-y-auto

          lg:col-start-2 lg:row-start-1
          xl:col-start-3 xl:row-start-1
        "
      >
        <EventEditor state={state} setState={setState} selectedId={selectedId} />
      </div>

      {/* MIDDLE: CALENDAR */}
      <div
        className="
          min-w-0 min-h-0 overflow-x-hidden overscroll-contain
          h-full overflow-y-auto
          lg:col-span-3 lg:row-start-2
          xl:col-start-2 xl:row-start-1 xl:col-span-1
        "
      >
        <CalendarDrag
          state={state}
          setState={setState}
          windowStart="2026-01-18"
          days={130}
          onSelectEvent={(id) =>
            setState((prev) => ({
              ...prev,
              ui: {
                ...((prev.ui || ({ activeSlide: 2 } as any)) as any),
                selectedEventId: id,
              } as any,
            }))
          }
        />
      </div>
    </section>
  );
}
