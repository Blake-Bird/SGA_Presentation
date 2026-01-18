// components/widgets/EventEditor.tsx
"use client";

import React, { useMemo } from "react";
import type {
  AppState,
  EventStatus,
  LineItem,
  LineItemGroup,
  SgaEvent,
  ChecklistItem,
  SocialAsset,
} from "@/lib/types";
import { removeEvent, updateEvent } from "@/lib/store";

function tzOffsetISO() {
  const mins = -new Date().getTimezoneOffset();
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

function localInputFromISO(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function isoFromLocalInput(v: string) {
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

const inputBase =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25 focus:bg-black/35";
const inputTight =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/25 focus:bg-black/35";
const selectBase =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/30 px-4 py-3 pr-12 text-white outline-none focus:border-white/25 focus:bg-black/35 appearance-none";

export default function EventEditor({
  state,
  setState,
  selectedId,
}: {
  state: AppState;
  setState: (s: AppState) => void;
  selectedId?: string | null;
}) {
  

  const event = useMemo(() => {
    const list = state.events || [];
    return list.find((e) => e.id === selectedId) ?? list[0];
  }, [state.events, selectedId]);

  if (!event) {
    return (
      <div className="w-full min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="text-white/80 text-lg font-semibold">No events found</div>
        <div className="mt-2 text-white/50 text-sm">Add an event to begin.</div>
      </div>
    );
  }

  const count = Number(event.plannedCount ?? 1);

  function patch(p: Partial<SgaEvent>) {
    setState((prev) => updateEvent(prev, event.id, p));
  }
  function del() {
    if (!confirm(`Delete "${event.title}"?`)) return;
    setState((prev) => removeEvent(prev, event.id));
  }

  const checklist = event.checklist ?? [];
  function setChecklist(next: ChecklistItem[]) {
    patch({ checklist: next });
  }
  function toggleChecklist(id: string) {
    setChecklist(checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  }
  function updateChecklistNotes(id: string, notes: string) {
    setChecklist(checklist.map((c) => (c.id === id ? { ...c, notes } : c)));
  }
  function addChecklistItem() {
    const label = prompt("Checklist item?");
    if (!label) return;
    setChecklist([{ id: rid(), label, done: false, notes: "" }, ...checklist]);
  }
  function removeChecklistItem(id: string) {
    setChecklist(checklist.filter((c) => c.id !== id));
  }

  const items = event.items ?? [];
  function setItems(next: LineItem[]) {
    patch({ items: next });
  }
  function addItem(group: LineItemGroup) {
    const it: LineItem = {
      id: rid(),
      group,
      type: "",
      name: "",
      unit: 0,
      qty: 1,
      total: 0,
      link: "",
      notes: "",
    };
    setItems([it, ...items]);
  }
  function removeItem(id: string) {
    setItems(items.filter((x) => x.id !== id));
  }
  function updateItem(id: string, p: Partial<LineItem>) {
    setItems(
      items.map((x) => {
        if (x.id !== id) return x;
        const unit = p.unit ?? x.unit;
        const qty = p.qty ?? x.qty;
        const total = Number(unit || 0) * Number(qty || 0);
        return { ...x, ...p, total };
      })
    );
  }

  const social = event.social ?? { status: "Not started", notes: "", assets: [] as SocialAsset[] };
  function setSocial(p: Partial<typeof social>) {
    patch({ social: { ...social, ...p } as any });
  }
  async function uploadPoster(file: File) {
    const dataUrl = await fileToDataUrl(file);
    const asset: SocialAsset = { id: rid(), name: file.name, mime: file.type, dataUrl };
    const next = [...(social.assets ?? []), asset];
    setSocial({ assets: next });
  }
  function removePoster(id: string) {
    const next = (social.assets ?? []).filter((a) => a.id !== id);
    setSocial({ assets: next });
  }

  const booking = event.booking ?? { booked: false, notes: "" };
  const purchase = event.purchase ?? { statusText: "", lastUpdateISO: "" };

  return (
    <div className="w-full min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] tracking-[0.28em] uppercase text-white/55">Live Edit Panel</div>
          <div className="mt-1 text-2xl font-semibold text-white">Edit while presenting</div>
          <div className="mt-1 text-sm text-white/60">Booking • Social • Purchase • Checklist • Items</div>
        </div>

        <button
          onClick={del}
          className="shrink-0 rounded-full border border-white/15 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 px-4 py-2 text-sm text-white"
        >
          Delete
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <Field label="Title">
          <input value={event.title} onChange={(e) => patch({ title: e.target.value })} className={inputBase} />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Estimated Cost (event budget)">
            <input
              type="number"
              value={event.estimatedCost}
              onChange={(e) => patch({ estimatedCost: Number(e.target.value || 0) })}
              className={inputBase}
            />
            <div className="mt-2 text-xs text-white/60">
              Counts as: <span className="text-white">${Number(event.estimatedCost || 0).toFixed(2)}</span> ×{" "}
              <span className="text-white">{count}x</span>
            </div>
          </Field>

          <Field label="Planned Count">
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => patch({ plannedCount: Math.max(1, Number(e.target.value || 1)) })}
              className={inputBase}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Status">
            <div className="relative">
              <select
                value={event.status}
                onChange={(e) => patch({ status: e.target.value as EventStatus })}
                className={selectBase}
              >
                <option value="Planned">Planned</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Purchased">Purchased</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/55">▾</div>
            </div>
          </Field>

          <Field label="Location">
            <input value={event.location ?? ""} onChange={(e) => patch({ location: e.target.value })} className={inputBase} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Start (picker)">
            <input
              type="datetime-local"
              value={localInputFromISO(event.start)}
              onChange={(e) => patch({ start: isoFromLocalInput(e.target.value) })}
              className={inputTight}
            />
          </Field>

          <Field label="End (picker)">
            <input
              type="datetime-local"
              value={localInputFromISO(event.end)}
              onChange={(e) => patch({ end: isoFromLocalInput(e.target.value) })}
              className={inputTight}
            />
          </Field>
        </div>

        <Field label="Booking (location reserved?)">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="flex items-center gap-2 text-white/80">
              <input
                type="checkbox"
                checked={!!booking.booked}
                onChange={(e) =>
                  patch({
                    booking: {
                      ...booking,
                      booked: e.target.checked,
                      bookedAt: e.target.checked ? new Date().toISOString() : booking.bookedAt,
                    },
                  })
                }
              />
              Booked
            </label>

            <input
              value={booking.bookedBy ?? ""}
              onChange={(e) => patch({ booking: { ...booking, bookedBy: e.target.value } })}
              placeholder="Booked by (name)"
              className={inputBase}
            />
          </div>

          <textarea
            value={booking.notes ?? ""}
            onChange={(e) => patch({ booking: { ...booking, notes: e.target.value } })}
            placeholder="Booking notes (room, layout, confirmation email, etc.)"
            className="mt-3 w-full min-h-[120px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[15px] leading-6 text-white/90 placeholder:text-white/35 outline-none focus:border-white/25 focus:bg-white/7 resize-y"
          />
        </Field>

        <Field label="Purchase Request (one-line status)">
          <input
            value={purchase.statusText ?? ""}
            onChange={(e) =>
              patch({
                purchase: { ...purchase, statusText: e.target.value, lastUpdateISO: new Date().toISOString() },
              })
            }
            placeholder='e.g., "Submitted — awaiting Connor review"'
            className={inputTight}
          />
          <div className="mt-2 text-xs text-white/50">
            Last update: {purchase.lastUpdateISO ? new Date(purchase.lastUpdateISO).toLocaleString() : "—"}
          </div>
        </Field>

        <Field label="Social Media Tracker">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <select value={social.status} onChange={(e) => setSocial({ status: e.target.value as any })} className={selectBase}>
                <option value="Not started">Not started</option>
                <option value="In progress">In progress</option>
                <option value="Posted">Posted</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/55">▾</div>
            </div>

            <label className="min-w-0 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white/80 cursor-pointer hover:bg-black/40">
              <span className="block break-words">Upload poster (image)</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const input = e.target as HTMLInputElement;
                  const f = input.files?.[0];
                  if (f) await uploadPoster(f);
                  input.value = "";
                }}
              />
            </label>
          </div>

          <textarea
            value={social.notes ?? ""}
            onChange={(e) => setSocial({ notes: e.target.value })}
            placeholder="Social notes (caption plan, posting schedule, revisions needed)"
            className="mt-3 w-full min-h-[140px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[15px] leading-6 text-white/90 placeholder:text-white/35 outline-none focus:border-white/25 focus:bg-white/7 resize-y"
          />

          {!!(social.assets?.length) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {social.assets!.map((a) => (
                <div key={a.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-white/70 break-words">{a.name}</div>
                  <img src={a.dataUrl} alt={a.name} className="mt-2 w-full rounded-xl border border-white/10" />
                  <button onClick={() => removePoster(a.id)} className="mt-2 text-xs text-white/70 hover:text-white">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>

        <Field label="Checklist (toggles + notes)">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-white/60">Fast “done/not done” per task.</div>
            <button
              onClick={addChecklistItem}
              className="shrink-0 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm text-white"
            >
              + Add
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {checklist.map((c) => (
              <div key={c.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="min-w-0 flex items-center gap-2 text-white/90">
                    <input type="checkbox" checked={c.done} onChange={() => toggleChecklist(c.id)} />
                    <span className={`min-w-0 ${c.done ? "line-through text-white/55" : ""} break-words`}>{c.label}</span>
                  </label>
                  <button onClick={() => removeChecklistItem(c.id)} className="text-xs text-white/60 hover:text-white">
                    Remove
                  </button>
                </div>

                <input
                  value={c.notes ?? ""}
                  onChange={(e) => updateChecklistNotes(c.id, e.target.value)}
                  placeholder="Notes / owner / deadline"
                  className={`${inputTight} mt-2`}
                />
              </div>
            ))}
          </div>
        </Field>

        <Field label="Items to Order (Prizes • Catering • Other)">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              onClick={() => addItem("Prizes")}
              className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm text-white"
            >
              + Prize
            </button>
            <button
              onClick={() => addItem("Catering")}
              className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm text-white"
            >
              + Catering
            </button>
            <button
              onClick={() => addItem("Other")}
              className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm text-white"
            >
              + Other
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs tracking-[0.22em] uppercase text-white/55 break-words">{it.group}</div>
                  <button onClick={() => removeItem(it.id)} className="text-xs text-white/60 hover:text-white">
                    Remove
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    value={it.type}
                    onChange={(e) => updateItem(it.id, { type: e.target.value })}
                    placeholder="Type (gift card, plates, decor)"
                    className={inputTight}
                  />
                  <input
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    placeholder="Item name"
                    className={inputTight}
                  />
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input
                    type="number"
                    value={it.unit}
                    onChange={(e) => updateItem(it.id, { unit: Number(e.target.value || 0) })}
                    placeholder="Unit $"
                    className={inputTight}
                  />
                  <input
                    type="number"
                    value={it.qty}
                    onChange={(e) => updateItem(it.id, { qty: Number(e.target.value || 0) })}
                    placeholder="Qty"
                    className={inputTight}
                  />
                  <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white/85 break-words">
                    Total: <span className="text-white font-semibold">${Number(it.total || 0).toFixed(2)}</span>
                  </div>
                  <input
                    value={it.link ?? ""}
                    onChange={(e) => updateItem(it.id, { link: e.target.value })}
                    placeholder="Link (optional)"
                    className={inputTight}
                  />
                </div>

                <input
                  value={it.notes ?? ""}
                  onChange={(e) => updateItem(it.id, { notes: e.target.value })}
                  placeholder="Notes (color, size, vendor details)"
                  className={`${inputTight} mt-2`}
                />
              </div>
            ))}
          </div>
        </Field>

        <div className="text-xs text-white/50">Tip: click an event in the calendar to load it here.</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] tracking-[0.28em] uppercase text-white/55 break-words">{label}</div>
      <div className="mt-3 min-w-0">{children}</div>
    </div>
  );
}

function rid() {
  try {
    // @ts-ignore
    return crypto.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}`;
  } catch {
    return `id_${Math.random().toString(16).slice(2)}`;
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
