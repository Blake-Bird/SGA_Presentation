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

// ✅ mount flag
useEffect(() => {
  setMounted(true);
}, []);

// ✅ Subscribe FIRST (remote-first). If no remote row exists, fall back to local.
useEffect(() => {
  if (!mounted) return;

  let didReceiveAnyRemote = false;

  const unsub = subscribeRoomState(roomId, async (remote) => {
    // If no row exists yet: seed from local once.
    if (!remote?.state) {
      if (didReceiveAnyRemote) return;

      const local = loadLocalState();
      setState(local);

      // create/seed the room so others instantly see it
      try {
        await writeRoomState(roomId, local, {
          clientId,
          updatedAtMs: Date.now(),
        });
      } catch {}

      return;
    }

    didReceiveAnyRemote = true;

    // don't let a remote snapshot immediately undo a drag/drop
    

    const remoteUpdatedAt = remote.__meta?.updatedAtMs ?? 0;

    // ignore older snapshots
    if (remoteUpdatedAt && remoteUpdatedAt <= lastSeenRemoteUpdatedAt.current) return;

    // if we wrote it, we can skip re-applying (prevents flicker)
    if (remote.__meta?.updatedBy && remote.__meta.updatedBy === clientId) {
      lastSeenRemoteUpdatedAt.current = remoteUpdatedAt;
      return;
    }

    lastSeenRemoteUpdatedAt.current = remoteUpdatedAt;

    applyingRemote.current = true;

    setState((prev) => {
      const merged: AppState = {
        ...(remote.state as any), // shared state
        ui: prev.ui,              // keep local-only UI
      };
      try {
        saveLocalState(merged);
      } catch {}
      return merged;
    });

    // release the "remote applying" guard next tick
    queueMicrotask(() => {
      applyingRemote.current = false;
    });
  });

  return () => unsub();
}, [roomId, clientId, mounted]);

  // ✅ Autosave local + cloud (fast = realtime)
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
  }, 150);

  return () => clearTimeout(t);
}, [state, roomId, clientId, mounted]);

// ✅ best-effort flush when user closes/tab-switches
useEffect(() => {
  if (!mounted) return;

  const flush = () => {
    if (applyingRemote.current) return;
    writeRoomState(roomId, state, {
      clientId,
      updatedAtMs: Date.now(),
    }).catch(() => {});
  };

  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });

  return () => {
    window.removeEventListener("beforeunload", flush);
  };
}, [roomId, clientId, state, mounted]);

  // ✅ don't render until mounted to avoid hydration mismatch
  if (!mounted) return null;

  const setStateLocked = (updater: any) => {
    setState((prev) => (typeof updater === "function" ? updater(prev) : updater));
  };

  return <PresentationOS state={state} setState={setStateLocked} />;

}
