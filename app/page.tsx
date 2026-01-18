"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PresentationOS from "@/components/PresentationOS";
import type { AppState } from "@/lib/types";
import { loadLocalState, saveLocalState } from "@/lib/store";
import { subscribeRoomState, writeRoomState } from "@/lib/cloud";

export default function Page() {
  // ✅ prevent hydration mismatch by not rendering until mounted
  const [mounted, setMounted] = useState(false);

  const roomId = useMemo(() => {
    if (typeof window === "undefined") return "default";
    const u = new URL(window.location.href);
    return u.searchParams.get("room") || "default";
  }, []);

  // ✅ start with a safe seed-ish state so SSR/first client render match
  const [state, setState] = useState<AppState>(() => {
    // IMPORTANT: do NOT touch localStorage here (runs during hydration)
    // We'll load from localStorage in useEffect after mount.
    return {
      totalBudget: 15000,
      walmartCardBalance: 1282,
      events: [],
      pdfWall: { docs: [] },
      ui: { activeSlide: 0, selectedEventId: null },
    } as any;
  });

  const applyingRemote = useRef(false);
  const lastSeenRemoteUpdatedAt = useRef<number>(0);
  const ignoreRemoteUntilMs = useRef<number>(0);


  // ✅ local drag lock to prevent cloud snapshot from undoing drop
  const dragLockUntilMs = useRef<number>(0);

  // ✅ stable client id
  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "server";
    const k = "sga_client_id_v1";
    const existing = localStorage.getItem(k);
    if (existing) return existing;
    const fresh =
      (crypto as any)?.randomUUID?.() ??
      `id_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(k, fresh);
    return fresh;
  }, []);

  // ✅ expose a tiny helper so CalendarDrag can lock cloud during drag/drop
  useEffect(() => {
    (window as any).__SGA_SET_DRAG_LOCK__ = (ms: number) => {
      dragLockUntilMs.current = Date.now() + Math.max(0, ms || 0);
    };
    return () => {
      delete (window as any).__SGA_SET_DRAG_LOCK__;
    };
  }, []);

  // ✅ load local state AFTER mount (kills hydration mismatch)
  useEffect(() => {
    setMounted(true);
    const local = loadLocalState();
    setState(local);
  }, []);

  // ✅ Subscribe to shared room
  useEffect(() => {
    if (!mounted) return;

    const unsub = subscribeRoomState(roomId, (remote) => {
      if (!remote?.state) return;

      // ✅ ignore snapshots while a drag/drop just happened
      if (Date.now() < dragLockUntilMs.current) return;
      if (Date.now() < ignoreRemoteUntilMs.current) return;


      const remoteUpdatedAt = remote.__meta?.updatedAtMs ?? 0;

      // ✅ Ignore older snapshots
      if (remoteUpdatedAt && remoteUpdatedAt <= lastSeenRemoteUpdatedAt.current) return;

      // ✅ If *we* wrote it, don't re-apply it
      if (remote.__meta?.updatedBy && remote.__meta.updatedBy === clientId) {
        lastSeenRemoteUpdatedAt.current = remoteUpdatedAt;
        return;
      }

      lastSeenRemoteUpdatedAt.current = remoteUpdatedAt;

      applyingRemote.current = true;

      // ✅ Apply shared data but preserve local UI
      setState((prev) => {
        const merged: AppState = {
          ...(remote.state as any),
          ui: prev.ui,
        };
        try {
          saveLocalState(merged);
        } catch {}
        return merged;
      });

      setTimeout(() => {
        applyingRemote.current = false;
      }, 0);
    });

    return () => unsub();
  }, [roomId, clientId, mounted]);

  // ✅ Autosave local + cloud
  useEffect(() => {
    if (!mounted) return;

    try {
      saveLocalState(state);
    } catch {}

    if (applyingRemote.current) return;

    const t = setTimeout(() => {
      writeRoomState(roomId, state, {
        clientId,
        updatedAtMs: Date.now(),
      }).catch((err) => {
        console.error("writeRoomState failed:", err);
      });
    }, 900); // ✅ slightly slower = fewer races

    return () => clearTimeout(t);
  }, [state, roomId, clientId, mounted]);

  // ✅ don't render until mounted to avoid hydration mismatch
  if (!mounted) return null;

  const setStateLocked = (updater: any) => {
    // ignore remote snapshots for a short window after local edits
    ignoreRemoteUntilMs.current = Date.now() + 900;

    setState((prev) => (typeof updater === "function" ? updater(prev) : updater));
  };

  return <PresentationOS state={state} setState={setStateLocked} />;

}
