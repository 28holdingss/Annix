export const CURRENCIES = ["GHS", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Channel = "whatsapp" | "email" | "instagram" | "walk-in";
export type InquiryStatus = "new" | "qualifying" | "quoting" | "quoted" | "booked";
export type QuoteStatus = "draft" | "sent" | "accepted";
export type Unit = "person" | "room-night" | "day" | "group";
export type PayMethod = "momo" | "bank" | "card" | "cash";
export type Cadence = "weekly" | "monthly";
export type Category =
  | "Flight"
  | "Stay"
  | "Transfer"
  | "Activity"
  | "Meals"
  | "Guide"
  | "Visa"
  | "Insurance"
  | "Fee";

export type Fx = Record<Currency, number>;

export type Inquiry = {
  id: string;
  ref: string;
  client: string;
  organisation?: string;
  phone: string;
  email: string;
  channel: Channel;
  kind: "Group tour" | "Bespoke" | "Heritage" | "Corporate";
  destination: string;
  travelers: number;
  dates: string;
  depart: string;
  brief: string;
  consultant: string;
  status: InquiryStatus;
  opened: string;
};

export type DayBlock = {
  id: string;
  day: number;
  city: string;
  title: string;
  narrative: string;
  stay: string;
  meals: string;
};

export type LineItem = {
  id: string;
  day: number | null;
  category: Category;
  description: string;
  qty: number;
  unit: Unit;
  unitPrice: number;
  currency: Currency;
};

export type Quote = {
  id: string;
  inquiryId: string;
  ref: string;
  title: string;
  status: QuoteStatus;
  invoiceCurrency: Currency;
  marginPct: number;
  validityDays: number;
  fx: Fx;
  fxLocked: string;
  days: DayBlock[];
  items: LineItem[];
  inclusions: string[];
  exclusions: string[];
  notes: string;
  updated: string;
};

export type Installment = {
  id: string;
  label: string;
  due: string;
  amount: number;
  status: "paid" | "due" | "scheduled";
  method?: PayMethod;
  paidAt?: string;
  receiptNo?: string;
  reference?: string;
};

export type SnapshotLine = {
  description: string;
  qty: number;
  unit: Unit;
  amount: number;
};

export type Booking = {
  id: string;
  ref: string;
  quoteId: string;
  inquiryId: string;
  invoiceNo: string;
  currency: Currency;
  total: number;
  fx: Fx;
  fxLocked: string;
  lines: SnapshotLine[];
  plan: "Susu";
  cadence: Cadence;
  depositPct: number;
  installments: Installment[];
  created: string;
};

export type Message = {
  id: string;
  inquiryId: string;
  channel: "whatsapp" | "email";
  direction: "in" | "out";
  auto?: "proposal" | "follow-up" | "receipt" | "reservation";
  at: string;
  subject?: string;
  body: string;
};

export type FollowUp = {
  id: string;
  inquiryId: string;
  due: string;
  reason: string;
  channel: "whatsapp" | "email";
  status: "open" | "done";
};

export type DeskState = {
  inquiries: Inquiry[];
  quotes: Quote[];
  bookings: Booking[];
  messages: Message[];
  followUps: FollowUp[];
};
