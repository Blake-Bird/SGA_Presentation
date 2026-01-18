// lib/cloud.ts
import type { AppState } from "@/lib/types";
import { db, storage } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type RoomDoc = {
  // IMPORTANT: this is "shared state" (no per-user UI)
  state: AppState;
  __meta?: {
    updatedAtMs?: number;
    updatedBy?: string;
  };
};

// Everyone uses the SAME room
const ROOM_ID = "default";

// Firestore doc location
function roomDocRef() {
  return doc(db, "rooms", ROOM_ID);
}

/**
 * Strip UI fields so one client cannot "drive" other clients
 * (slide changes, selected event, etc.)
 */
function stripUi(state: AppState): AppState {
  const { ui, ...rest } = state as any;
  return rest as AppState;
}

/**
 * Subscribe to the shared state (real-time).
 * Calls cb whenever anyone changes anything.
 */
export function subscribeRoomState(
  _roomId: string, // kept for compatibility with your Page.tsx
  cb: (doc: RoomDoc | null) => void
): Unsubscribe {
  return onSnapshot(
    roomDocRef(),
    (snap) => {
      if (!snap.exists()) return cb(null);
      cb(snap.data() as RoomDoc);
    },
    () => cb(null)
  );
}

/**
 * Write the shared state to the shared room.
 * NOTE: We intentionally DO NOT sync `state.ui`.
 */
export async function writeRoomState(
  _roomId: string,
  state: AppState,
  meta: { clientId: string; updatedAtMs: number }
) {
  await setDoc(
    roomDocRef(),
    {
      state: stripUi(state),
      __meta: {
        updatedAtMs: meta.updatedAtMs,
        updatedBy: meta.clientId,
      },
      _serverUpdatedAt: serverTimestamp(),
    } as any,
    { merge: true }
  );
}

/**
 * Upload a PDF to shared storage and return url + storagePath.
 * PdfWall calls this, then puts url into state so everyone sees it instantly.
 *
 * NOTE: Firebase Storage may require billing. If disabled, this will throw.
 */
export async function uploadPdfToRoom(_roomId: string, file: File) {
  if (!storage) {
    throw new Error("Firebase Storage is not configured/enabled for this project.");
  }

  const id =
    (crypto as any)?.randomUUID?.() ??
    `pdf_${Math.random().toString(16).slice(2)}`;

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const storagePath = `rooms/${ROOM_ID}/pdfs/${id}/${safeName}`;

  const fileRef = ref(storage, storagePath);

  await uploadBytes(fileRef, file, {
    contentType: file.type || "application/pdf",
  });

  const url = await getDownloadURL(fileRef);

  return { id, url, storagePath };
}
