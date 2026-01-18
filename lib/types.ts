export type EventCategory =
  | "Velvet Circle"
  | "Service Fair"
  | "Food Drive"
  | "Henna Class"
  | "Cooking Competition"
  | "HPU’s Got Talent"
  | "Game Show"
  | "Flower Making"
  | "Student Run Business Showcase"
  | "Healthy Living Week"
  | "Saint Patrick’s Golden Lucky Coin"
  | "Sip & Paint"
  | "Formal Dance"
  | "Clothing Drive"
  | "Last to Leave the Circle"
  | "Mocktails & Networking"
  | "Panther Games"
  | "Color Run"
  | "Other";

export type EventStatus = "Planned" | "Submitted" | "Approved" | "Purchased";

export type LineItemGroup = "Prizes" | "Catering" | "Other";

export type LineItem = {
  id: string;
  group: LineItemGroup;
  type: string;
  name: string;
  unit: number;
  qty: number;
  total: number; // auto = unit * qty
  link?: string;
  notes?: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  notes?: string;
};

export type SocialAsset = {
  id: string;
  name: string;
  mime: string;
  dataUrl: string; // images only (kept as-is)
};

export type SocialTracker = {
  status: "Not started" | "In progress" | "Posted";
  notes?: string;
  assets?: SocialAsset[];
};

export type BookingTracker = {
  booked: boolean;
  bookedBy?: string;
  bookedAt?: string; // ISO
  notes?: string;
};

export type PurchaseTracker = {
  statusText?: string;
  lastUpdateISO?: string;
};

/**
 * ✅ Cloud-safe PDF representation
 * - Stored in Firebase Storage
 * - We keep a public download URL for iframe viewing
 */
export type PdfDoc = {
  id: string;
  title: string;
  fileName: string;

  mime?: string;          // "application/pdf"
  url: string;            // download URL (cloud)
  storagePath: string;    // storage location

  extractedTotal?: number;
  manualTotal?: number;
  addedAtISO: string;
};

export type SgaEvent = {
  id: string;
  title: string;
  category: EventCategory;
  status: EventStatus;

  start?: string; // ISO
  end?: string;   // ISO
  location?: string;

  estimatedCost: number;
  plannedCount?: number;

  booking?: BookingTracker;
  purchase?: PurchaseTracker;
  checklist?: ChecklistItem[];
  social?: SocialTracker;

  items?: LineItem[];
  pdfPath?: string | null; // legacy (ok to keep)
};

export type AppState = {
  totalBudget: number;
  walmartCardBalance: number;

  events: SgaEvent[];

  // ✅ pdf wall state (NOT part of spent/remaining)
  pdfWall?: {
    docs: PdfDoc[];
  };

  ui: {
    activeSlide: number;
    selectedEventId?: string | null;
  };
};
