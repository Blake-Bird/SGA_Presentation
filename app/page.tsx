"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PresentationOS from "@/components/PresentationOS";
import type { AppState } from "@/lib/types";
import { loadLocalState, saveLocalState } from "@/lib/store";
import { subscribeRoomState, writeRoomState } from "@/lib/cloud";

export default function Page() {
  const roomId = useMemo(() => {
    if (typeof window === "undefined") return "default";
    const u = new URL(window.location.href);
    return u.searchParams.get("room") || "default";
  }, []);

  const [state, setState] = useState<AppState>(() => loadLocalState());

  const applyingRemote = useRef(false);
  const lastSeenRemoteUpdatedAt = useRef<number>(0);

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

  // ✅ Subscribe to shared room
  useEffect(() => {
    const unsub = subscribeRoomState(roomId, (remote) => {
      if (!remote?.state) return;

      const remoteUpdatedAt = remote.__meta?.updatedAtMs ?? 0;

      // ✅ Ignore older snapshots
      if (remoteUpdatedAt && remoteUpdatedAt <= lastSeenRemoteUpdatedAt.current) return;

      // ✅ CRITICAL FIX: if *we* wrote it, don't re-apply it (prevents revert)
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
  }, [roomId, clientId]);

  // ✅ Autosave local + cloud
  useEffect(() => {
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
    }, 250);

    return () => clearTimeout(t);
  }, [state, roomId, clientId]);

  return <PresentationOS state={state} setState={setState} />;
}
