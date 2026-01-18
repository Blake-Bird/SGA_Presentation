"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PresentationOS from "@/components/PresentationOS";
import type { AppState } from "@/lib/types";
import { loadLocalState, saveLocalState } from "@/lib/store";
import { subscribeRoomState, writeRoomState } from "@/lib/cloud";

export default function Page() {
  // Room ID: keeps everyone in same shared workspace.
  // Later you can make this a URL param like ?room=SGA
  const roomId = useMemo(() => {
    if (typeof window === "undefined") return "default";
    const u = new URL(window.location.href);
    return u.searchParams.get("room") || "default";
  }, []);

  // Local fallback (still works offline / before cloud loads)
  const [state, setState] = useState<AppState>(() => loadLocalState());

  // Prevent save-loop: when we apply remote updates, don't immediately re-write.
  const applyingRemote = useRef(false);
  const lastSeenRemoteUpdatedAt = useRef<number>(0);

  // Stable client id for "updatedBy"
  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "server";
    const k = "sga_client_id_v1";
    const existing = localStorage.getItem(k);
    if (existing) return existing;
    const fresh = (crypto as any)?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(k, fresh);
    return fresh;
  }, []);

  // Subscribe to shared room state (realtime)
  useEffect(() => {
    const unsub = subscribeRoomState(roomId, (remote) => {
      if (!remote) return;

      const remoteUpdatedAt = remote.__meta?.updatedAtMs ?? 0;
      if (remoteUpdatedAt && remoteUpdatedAt <= lastSeenRemoteUpdatedAt.current) return;

      lastSeenRemoteUpdatedAt.current = remoteUpdatedAt;

      applyingRemote.current = true;
      setState(remote.state);
      // also keep local backup in sync
      try {
        saveLocalState(remote.state);
      } catch {}
      // release lock next tick
      setTimeout(() => {
        applyingRemote.current = false;
      }, 0);
    });

    return () => unsub();
  }, [roomId]);

  // Autosave (local + cloud) when state changes
  useEffect(() => {
    // Always keep local autosave
    try {
      saveLocalState(state);
    } catch {}

    // If we just applied a remote snapshot, don't echo it back.
    if (applyingRemote.current) return;

    // Debounced cloud save
    const t = setTimeout(() => {
      writeRoomState(roomId, state, {
        clientId,
        updatedAtMs: Date.now(),
      }).catch(() => {
        // ignore; local autosave still works
      });
    }, 250);

    return () => clearTimeout(t);
  }, [state, roomId, clientId]);

  return <PresentationOS state={state} setState={setState} />;
}
