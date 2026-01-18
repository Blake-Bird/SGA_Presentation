import type { AppState } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type RoomDoc = {
  state: AppState;
  __meta?: {
    updatedAtMs?: number;
    updatedBy?: string;
  };
};

// don't sync ui
function stripUi(state: AppState): AppState {
  const { ui, ...rest } = state as any;
  return rest as AppState;
}

export function subscribeRoomState(
  roomId: string,
  cb: (doc: RoomDoc | null) => void
) {
  let cancelled = false;

  // initial fetch
  (async () => {
    const { data, error } = await supabase
      .from("room_state")
      .select("state, updated_at_ms, updated_by")
      .eq("room_id", roomId)
      .maybeSingle();

    if (cancelled) return;

    if (error || !data) cb(null);
    else {
      cb({
        state: data.state as any,
        __meta: {
          updatedAtMs: Number(data.updated_at_ms || 0),
          updatedBy: data.updated_by ?? undefined,
        },
      });
    }
  })();

  // realtime
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

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

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

  const { data } = supabase.storage.from("room-pdfs").getPublicUrl(path);
  return { id, url: data.publicUrl, storagePath: path };
}