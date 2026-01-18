"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PresentationOS from "@/components/PresentationOS";
import type { AppState } from "@/lib/types";
import { loadLocalState, saveLocalState } from "@/lib/store";
import { subscribeRoomState, writeRoomState } from "@/lib/cloud";

export default function Page() {
  const [mounted, setMounted] = useState(false);

  const roomId = useMemo(() => {
    if (typeof window === "undefined") return "default";
    const u = new URL(window.location.href);
    return u.searchParams.get("room") || "default";
  }, []);

  // seed-ish (no localStorage access during first render)
  const [state, setState] = useState<AppState>(() => {
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

  // ✅ ignore remote snapshots briefly after local edits
  const ignoreRemoteUntilMs = useRef<number>(0);

  // ✅ lock remote snapshots briefly after drag/drop
  const dragLockUntilMs = useRef<number>(0);

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

  // expose helper for CalendarDrag
  useEffect(() => {
    (window as any).__SGA_SET_DRAG_LOCK__ = (ms: number) => {
      dragLockUntilMs.current = Date.now() + Math.max(0, ms || 0);
    };
    return () => {
      delete (window as any).__SGA_SET_DRAG_LOCK__;
    };
  }, []);

  // mount flag + load local AFTER mount
  useEffect(() => {
    setMounted(true);
    const local = loadLocalState();
    setState(local);
  }, []);

  // Subscribe to room
  useEffect(() => {
    if (!mounted) return;

    const unsub = subscribeRoomState(roomId, (remote) => {
      if (!remote?.state) return;

      // ✅ ignore remote while drag/drop just happened
      if (Date.now() < dragLockUntilMs.current) return;

      // ✅ ignore remote right after local edits
      if (Date.now() < ignoreRemoteUntilMs.current) return;

      const remoteUpdatedAt = remote.__meta?.updatedAtMs ?? 0;

      // ignore older snapshots
      if (
        remoteUpdatedAt &&
        remoteUpdatedAt <= lastSeenRemoteUpdatedAt.current
      )
        return;

      // if we wrote it, skip re-applying
      if (remote.__meta?.updatedBy && remote.__meta.updatedBy === clientId) {
        lastSeenRemoteUpdatedAt.current = remoteUpdatedAt;
        return;
      }

      lastSeenRemoteUpdatedAt.current = remoteUpdatedAt;

      applyingRemote.current = true;

      setState((prev) => {
        const merged: AppState = {
          ...(remote.state as any),
          ui: prev.ui, // keep local UI
        };
        try {
          saveLocalState(merged);
        } catch {}
        return merged;
      });

      // release guard next tick
      setTimeout(() => {
        applyingRemote.current = false;
      }, 0);
    });

    return () => unsub();
  }, [roomId, clientId, mounted]);

  // Autosave local + cloud (debounced)
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
    }, 1000); // ✅ 800–1200ms range

    return () => clearTimeout(t);
  }, [state, roomId, clientId, mounted]);

  // best-effort flush
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
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [roomId, clientId, state, mounted]);

  if (!mounted) return null;

  // ✅ wrapper that sets ignore window for local edits
  const setStateLocked = (updater: any) => {
    ignoreRemoteUntilMs.current = Date.now() + 900;
    setState((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  };

  return <PresentationOS state={state} setState={setStateLocked} />;
}