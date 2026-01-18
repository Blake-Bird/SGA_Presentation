import type { AppState } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type RoomDoc = {
  state: AppState;
  __meta?: {
    updatedAtMs?: number;
    updatedBy?: string;
  };
};

// same logic: don't sync ui
function stripUi(state: AppState): AppState {
  const { ui, ...rest } = state as any;
  return rest as AppState;
}

/**
 * Subscribe to shared room state:
 * - loads initial snapshot from Postgres
 * - listens to realtime updates from Postgres table
 */
export function subscribeRoomState(
  roomId: string,
  cb: (doc: RoomDoc | null) => void
) {
  let cancelled = false;

  // 1) initial fetch
  (async () => {
    const { data, error } = await supabase
      .from("room_state")
      .select("state, updated_at_ms, updated_by")
      .eq("room_id", roomId)
      .maybeSingle();

    if (cancelled) return;

    if (error || !data) {
      // if no row yet, treat as empty
      cb(null);
    } else {
      cb({
        state: data.state as any,
        __meta: {
          updatedAtMs: Number(data.updated_at_ms || 0),
          updatedBy: data.updated_by ?? undefined,
        },
      });
    }
  })();

  // 2) realtime subscription
  const channel = supabase
    .channel(`room_state:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "room_state",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const row: any = payload.new;
        if (!row?.state) return;

        cb({
          state: row.state as any,
          __meta: {
            updatedAtMs: Number(row.updated_at_ms || 0),
            updatedBy: row.updated_by ?? undefined,
          },
        });
      }
    )
    .subscribe();

  // return unsubscribe
  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

/**
 * Persist latest state into Postgres.
 * (This is the Firestore setDoc equivalent.)
 */
export async function writeRoomState(
  roomId: string,
  state: AppState,
  meta: { clientId: string; updatedAtMs: number }
) {
  const payload = {
    room_id: roomId,
    state: stripUi(state) as any,
    updated_at_ms: meta.updatedAtMs,
    updated_by: meta.clientId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("room_state").upsert(payload, {
    onConflict: "room_id",
  });

  if (error) throw error;
}

  // 1) try update (fast path)
  const { data: updated, error: updErr } = await supabase
    .from("room_state")
    .update(payload)
    .eq("room_id", roomId)
    .select("room_id");

  if (updErr) throw updErr;

  // if row existed, we’re done
  if (updated && updated.length > 0) return;

  // 2) otherwise insert (row didn’t exist yet)
  const { error: insErr } = await supabase.from("room_state").insert(payload);
  if (insErr) throw insErr;
}

/**
 * Upload PDF to Supabase Storage and return a public URL.
 * Bucket: room-pdfs
 */
export async function uploadPdfToRoom(roomId: string, file: File) {
  const id =
    (crypto as any)?.randomUUID?.() ??
    `pdf_${Math.random().toString(16).slice(2)}`;

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const path = `${roomId}/${id}/${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("room-pdfs")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/pdf",
    });

  if (upErr) throw upErr;

  // Public URL (bucket must be public)
  const { data } = supabase.storage.from("room-pdfs").getPublicUrl(path);
  const url = data.publicUrl;

  return { id, url, storagePath: path };
}
