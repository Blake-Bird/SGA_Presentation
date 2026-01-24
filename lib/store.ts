import type { AppState, SgaEvent, PdfDoc, LineItem } from "./types";

const STORAGE_KEY = "sga_presentation_os_v3";

// ----------------------------
// Seed
// ----------------------------
const seed: AppState = {
  totalBudget: 15000,
  walmartCardBalance: 1282,
  events: [
    {
      id: "evt_velvet",
      title: "The Velvet Circle",
      category: "Velvet Circle",
      status: "Submitted",
      estimatedCost: 1282,
      plannedCount: 1,
      start: "2026-01-21T18:00:00-05:00",
      end: "2026-01-21T20:00:00-05:00",
      location: "Panther Commons • 4th Floor Ballroom",
      booking: { booked: true, bookedBy: "", bookedAt: new Date().toISOString(), notes: "" },
      purchase: { statusText: "Submitted — awaiting Connor", lastUpdateISO: new Date().toISOString() },
      social: { status: "Not started", notes: "", assets: [] },
      checklist: [],
      items: [],
      pdfPath: null,
    },
  ],
    pdfWall: {
    docs: [
      {
        id: "pdf_flowers_after_dark",
        title: "Flowers After Dark",
        fileName: "Flowers_After_Dark.pdf",
        mime: "application/pdf",
        url: "/pdfs/Flowers_After_Dark.pdf",
        storagePath: "/pdfs/Flowers_After_Dark.pdf",
        extractedTotal: undefined,
        manualTotal: undefined,
        addedAtISO: new Date().toISOString(),
      },
      {
        id: "pdf_gilded_hour_mocktails",
        title: "Gilded Hour — Mocktails — Charity Auction",
        fileName: "Gilded_Hour__Mocktails__Charity_Auction.pdf",
        mime: "application/pdf",
        url: "/pdfs/Gilded_Hour__Mocktails__Charity_Auction.pdf",
        storagePath: "/pdfs/Gilded_Hour__Mocktails__Charity_Auction.pdf",
        extractedTotal: undefined,
        manualTotal: undefined,
        addedAtISO: new Date().toISOString(),
      },
      {
        id: "pdf_last_to_leave_circle",
        title: "Last To Leave Circle",
        fileName: "Last_To_Leave_Circle.pdf",
        mime: "application/pdf",
        url: "/pdfs/Last_To_Leave_Circle.pdf",
        storagePath: "/pdfs/Last_To_Leave_Circle.pdf",
        extractedTotal: undefined,
        manualTotal: undefined,
        addedAtISO: new Date().toISOString(),
      },
      {
        id: "pdf_panther_games",
        title: "Panther Games",
        fileName: "Panther_Games.pdf",
        mime: "application/pdf",
        url: "/pdfs/Panther_Games.pdf",
        storagePath: "/pdfs/Panther_Games.pdf",
        extractedTotal: undefined,
        manualTotal: undefined,
        addedAtISO: new Date().toISOString(),
      },
    ],
  },

  ui: { activeSlide: 0, selectedEventId: "evt_velvet" },
};

// ----------------------------
// Helpers: migrate/sanitize
// ----------------------------

function fixItemTotals(items: LineItem[] | undefined): LineItem[] {
  if (!items) return [];
  return items.map((it) => {
    const unit = Number(it.unit || 0);
    const qty = Number(it.qty || 0);
    const total = Number(unit) * Number(qty);
    return { ...it, unit, qty, total };
  });
}

function migrateLoadedState(raw: any): AppState {
  const parsed = (raw || {}) as Partial<AppState>;

  const events = Array.isArray(parsed.events) ? parsed.events : seed.events;

  const normalizedEvents = events.map((e: any) => ({
    ...e,
    plannedCount: e.plannedCount ?? 1,
    estimatedCost: Number(e.estimatedCost || 0),
    items: fixItemTotals(e.items),
    social: e.social
      ? { ...e.social, assets: Array.isArray(e.social.assets) ? e.social.assets : [] }
      : { status: "Not started", notes: "", assets: [] },
    checklist: Array.isArray(e.checklist) ? e.checklist : [],
    booking: e.booking ? { ...e.booking } : { booked: false, notes: "" },
    purchase: e.purchase ? { ...e.purchase } : { statusText: "", lastUpdateISO: "" },
  })) as SgaEvent[];

  const docs = Array.isArray(parsed.pdfWall?.docs) ? parsed.pdfWall!.docs : seed.pdfWall!.docs;
  const normalizedDocs = docs
    .map((d: any) => {
      // Backward compatibility: if old docs had dataUrl/objectUrl, skip them (too large for cloud anyway)
      // You can re-upload PDFs once online sync is enabled.
      if (!d) return null;

      // Cloud-safe doc shape:
      if (typeof d.url === "string" && typeof d.storagePath === "string") {
        return {
          id: String(d.id),
          title: String(d.title ?? ""),
          fileName: String(d.fileName ?? ""),
          mime: d.mime ? String(d.mime) : "application/pdf",
          url: String(d.url),
          storagePath: String(d.storagePath),
          extractedTotal: d.extractedTotal != null ? Number(d.extractedTotal) : undefined,
          manualTotal: d.manualTotal != null ? Number(d.manualTotal) : undefined,
          addedAtISO: String(d.addedAtISO ?? new Date().toISOString()),
        } as PdfDoc;
      }

      return null;
    })
    .filter(Boolean) as PdfDoc[];

  const ui = {
    ...seed.ui,
    ...(parsed.ui || {}),
  };

  const selected = ui.selectedEventId;
  const selectedExists = normalizedEvents.some((e) => e.id === selected);
  const selectedEventId = selectedExists ? selected : normalizedEvents[0]?.id ?? null;

  return {
    ...seed,
    ...parsed,
    totalBudget: Number((parsed as any).totalBudget ?? seed.totalBudget),
    walmartCardBalance: Number((parsed as any).walmartCardBalance ?? seed.walmartCardBalance),
    events: normalizedEvents,
    pdfWall: { docs: normalizedDocs },
    ui: { ...ui, selectedEventId },
  };
}

// ----------------------------
// Load / Save (LOCAL backup)
// ----------------------------

export function loadLocalState(): AppState {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    return migrateLoadedState(parsed);
  } catch {
    return seed;
  }
}

export function saveLocalState(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ----------------------------
// Budget math
// ----------------------------

export function computeSpent(state: AppState) {
  return (state.events || []).reduce((sum, e) => {
    const count = Number(e.plannedCount ?? 1);
    const cost = Number(e.estimatedCost || 0);
    return sum + cost * count;
  }, 0);
}

export function remainingBudget(state: AppState) {
  return Number(state.totalBudget || 0) - computeSpent(state);
}

// ----------------------------
// Events
// ----------------------------

export function addEvent(state: AppState, partial: Partial<SgaEvent>): AppState {
  const id = partial.id || `evt_${Math.random().toString(16).slice(2, 8)}`;
  const e: SgaEvent = {
    id,
    title: partial.title || "New Event",
    category: (partial.category as any) || "Other",
    status: (partial.status as any) || "Planned",
    estimatedCost: Number(partial.estimatedCost ?? 0),
    plannedCount: Number(partial.plannedCount ?? 1),
    start: partial.start,
    end: partial.end,
    location: partial.location || "TBD",
    booking: partial.booking,
    purchase: partial.purchase,
    checklist: partial.checklist,
    social: partial.social,
    items: fixItemTotals(partial.items),
    pdfPath: partial.pdfPath ?? null,
  };

  const next = { ...state, events: [e, ...(state.events || [])] };
  return { ...next, ui: { ...next.ui, selectedEventId: id } };
}

export function updateEvent(state: AppState, id: string, patch: Partial<SgaEvent>): AppState {
  const nextEvents = (state.events || []).map((e) => {
    if (e.id !== id) return e;

    const nextItems = patch.items ? fixItemTotals(patch.items) : e.items;

    return {
      ...e,
      ...patch,
      estimatedCost: patch.estimatedCost != null ? Number(patch.estimatedCost || 0) : Number(e.estimatedCost || 0),
      plannedCount: patch.plannedCount != null ? Number(patch.plannedCount || 1) : Number(e.plannedCount ?? 1),
      items: nextItems,
    };
  });

  return {
    ...state,
    events: nextEvents,
    ui: { ...state.ui, selectedEventId: state.ui?.selectedEventId ?? id },
  };
}

export function removeEvent(state: AppState, id: string): AppState {
  const nextEvents = (state.events || []).filter((e) => e.id !== id);
  return {
    ...state,
    events: nextEvents,
    ui: { ...state.ui, selectedEventId: nextEvents[0]?.id ?? null },
  };
}

export function setActiveSlide(state: AppState, idx: number): AppState {
  return { ...state, ui: { ...state.ui, activeSlide: idx } };
}

// ----------------------------
// PDF WALL (in-state)
// ----------------------------

export function setPdfDocs(state: AppState, docs: PdfDoc[]): AppState {
  return { ...state, pdfWall: { docs } };
}

// ----------------------------
// EXPORT / IMPORT (cloud-safe)
// ----------------------------

export function downloadState(state: AppState, filename = "sga_state.json") {
  if (typeof window === "undefined") return;

  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importStateFromFile(): Promise<AppState | null> {
  if (typeof window === "undefined") return null;

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        resolve(migrateLoadedState(parsed));
      } catch {
        resolve(null);
      }
    };

    input.click();
  });
}
