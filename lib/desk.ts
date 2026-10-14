import { addDays, convert, firstName, mailLink, methodLabel, money, round2, splitTotal, todayKey, uid, waLink } from "./format";
import { makeInstallments } from "./plan";
import { contractFromQuote, priceQuote } from "./pricing";
import type {
  Booking,
  Cadence,
  Currency,
  DayBlock,
  DeskState,
  FollowUp,
  Inquiry,
  LineItem,
  Message,
  PayMethod,
  Quote,
} from "./types";

const nowIso = () => new Date().toISOString();

function replace<T extends { id: string }>(rows: T[], id: string, next: T) {
  return rows.map((row) => (row.id === id ? next : row));
}

export function quoteOf(state: DeskState, id: string) {
  return state.quotes.find((quote) => quote.id === id);
}

export function inquiryOf(state: DeskState, id: string) {
  return state.inquiries.find((inquiry) => inquiry.id === id);
}

export function bookingForQuote(state: DeskState, quoteId: string) {
  return state.bookings.find((booking) => booking.quoteId === quoteId);
}

export function patchQuote(state: DeskState, id: string, patch: Partial<Quote>): DeskState {
  const quote = quoteOf(state, id);
  if (!quote || quote.status === "accepted") return state;
  return {
    ...state,
    quotes: replace(state.quotes, id, { ...quote, ...patch, id: quote.id, status: quote.status, updated: nowIso() }),
  };
}

export function patchDay(state: DeskState, quoteId: string, dayId: string, patch: Partial<DayBlock>): DeskState {
  const quote = quoteOf(state, quoteId);
  if (!quote || quote.status === "accepted") return state;
  return patchQuote(state, quoteId, {
    days: quote.days.map((day) => (day.id === dayId ? { ...day, ...patch, id: day.id } : day)),
  });
}

export function patchItem(state: DeskState, quoteId: string, itemId: string, patch: Partial<LineItem>): DeskState {
  const quote = quoteOf(state, quoteId);
  if (!quote || quote.status === "accepted") return state;
  return patchQuote(state, quoteId, {
    items: quote.items.map((item) => (item.id === itemId ? { ...item, ...patch, id: item.id } : item)),
  });
}

export function addDay(state: DeskState, quoteId: string): DeskState {
  const quote = quoteOf(state, quoteId);
  if (!quote || quote.status === "accepted") return state;
  const day = quote.days.length + 1;
  const block: DayBlock = {
    id: uid("day"),
    day,
    city: "Next stop",
    title: `Day ${day}`,
    narrative: "",
    stay: "",
    meals: "Breakfast",
  };
  return patchQuote(state, quoteId, { days: [...quote.days, block] });
}

export function removeDay(state: DeskState, quoteId: string, dayId: string): DeskState {
  const quote = quoteOf(state, quoteId);
  if (!quote || quote.status === "accepted") return state;
  const removed = quote.days.find((day) => day.id === dayId);
  if (!removed) return state;
  const kept = quote.days.filter((day) => day.id !== dayId);
  const numberOf = new Map(kept.map((day, index) => [day.day, index + 1]));
  return patchQuote(state, quoteId, {
    days: kept.map((day, index) => ({ ...day, day: index + 1 })),
    items: quote.items.map((item) => {
      if (item.day == null) return item;
      if (item.day === removed.day) return { ...item, day: null };
      return { ...item, day: numberOf.get(item.day) ?? null };
    }),
  });
}

export function addItem(state: DeskState, quoteId: string, seed?: Partial<LineItem>): DeskState {
  const quote = quoteOf(state, quoteId);
  if (!quote || quote.status === "accepted") return state;
  const line: LineItem = {
    id: uid("item"),
    day: seed?.day ?? null,
    category: seed?.category ?? "Activity",
    description: seed?.description ?? "",
    qty: seed?.qty ?? 1,
    unit: seed?.unit ?? "person",
    unitPrice: seed?.unitPrice ?? 0,
    currency: seed?.currency ?? quote.invoiceCurrency,
  };
  return patchQuote(state, quoteId, { items: [...quote.items, line] });
}

export function removeItem(state: DeskState, quoteId: string, itemId: string): DeskState {
  const quote = quoteOf(state, quoteId);
  if (!quote || quote.status === "accepted") return state;
  return patchQuote(state, quoteId, { items: quote.items.filter((item) => item.id !== itemId) });
}

function nextReceipt(state: DeskState) {
  const nums = state.bookings.flatMap((booking) =>
    booking.installments.map((row) => Number(row.receiptNo?.split("-").pop() ?? 0)),
  );
  const next = Math.max(170, ...nums) + 1;
  return `RCT-2026-${String(next).padStart(4, "0")}`;
}

function nextInvoice(state: DeskState) {
  const nums = state.bookings.map((booking) => Number(booking.invoiceNo.split("-").pop() ?? 0));
  return `INV-2026-${Math.max(160, ...nums) + 1}`;
}

function proposalCopy(inquiry: Inquiry, quote: Quote) {
  const priced = priceQuote(quote, inquiry.travelers);
  const deposit = round2(priced.sellInvoice * 0.3);
  const name = inquiry.organisation ? inquiry.client : firstName(inquiry.client);
  const total = money(priced.sellInvoice, quote.invoiceCurrency);
  const each = money(priced.perPerson, quote.invoiceCurrency);
  const hold = money(deposit, quote.invoiceCurrency);
  const wa = `Hello ${name}, your ${quote.title} proposal ${quote.ref} is ready.\n${inquiry.travelers} travellers · ${inquiry.dates}\n${total} (${each} per person). Reserve with ${hold}.\nValid ${quote.validityDays} days.\n— Abena, Annix Travels`;
  const subject = `Proposal ${quote.ref} · ${quote.title}`;
  const email = `Dear ${name},\n\nYour itemised proposal ${quote.ref} for ${quote.title} is ready.\n${inquiry.travelers} travellers · ${inquiry.dates}\nTotal ${total} · ${each} per person.\nA 30% deposit (${hold}) reserves the trip. The balance can run as a Susu plan.\nValid ${quote.validityDays} days.\n\nAbena Owusu\nAnnix Travel & Tours`;
  return { wa, subject, email };
}

export function handoffLinks(inquiry: Inquiry, wa: string, subject: string, email: string) {
  return {
    whatsapp: waLink(inquiry.phone, wa),
    email: mailLink(inquiry.email, subject, email),
  };
}

export function sendQuote(state: DeskState, quoteId: string): DeskState {
  const quote = quoteOf(state, quoteId);
  const inquiry = quote ? inquiryOf(state, quote.inquiryId) : undefined;
  if (!quote || !inquiry || quote.status === "accepted") return state;
  const priced = priceQuote(quote, inquiry.travelers);
  if (priced.sellInvoice <= 0) return state;
  const copy = proposalCopy(inquiry, quote);
  const at = nowIso();
  const messages: Message[] = [
    ...state.messages,
    {
      id: uid("msg"),
      inquiryId: inquiry.id,
      channel: "whatsapp",
      direction: "out",
      auto: "proposal",
      at,
      body: copy.wa,
    },
    {
      id: uid("msg"),
      inquiryId: inquiry.id,
      channel: "email",
      direction: "out",
      auto: "proposal",
      at,
      subject: copy.subject,
      body: copy.email,
    },
  ];
  const followUps: FollowUp[] = [
    ...state.followUps.filter((row) => !(row.inquiryId === inquiry.id && row.status === "open")),
    {
      id: uid("fu"),
      inquiryId: inquiry.id,
      due: `${addDays(todayKey(), 2)}T09:00:00.000Z`,
      reason: `Proposal ${quote.ref} sent. Nudge if there is no reply.`,
      channel: inquiry.channel === "email" ? "email" : "whatsapp",
      status: "open",
    },
  ];
  return {
    ...state,
    quotes: replace(state.quotes, quote.id, { ...quote, status: "sent", updated: at }),
    inquiries: replace(state.inquiries, inquiry.id, { ...inquiry, status: "quoted" }),
    messages,
    followUps,
  };
}

export function acceptQuote(state: DeskState, quoteId: string): DeskState {
  const quote = quoteOf(state, quoteId);
  const inquiry = quote ? inquiryOf(state, quote.inquiryId) : undefined;
  if (!quote || !inquiry) return state;
  if (bookingForQuote(state, quote.id)) {
    return {
      ...state,
      quotes: replace(state.quotes, quote.id, { ...quote, status: "accepted" }),
      inquiries: replace(state.inquiries, inquiry.id, { ...inquiry, status: "booked" }),
    };
  }
  const contract = contractFromQuote(quote, inquiry.travelers);
  const at = nowIso();
  const booking: Booking = {
    id: `b_${quote.id}`,
    ref: `ANX-B-${300 + state.bookings.length + 1}`,
    quoteId: quote.id,
    inquiryId: inquiry.id,
    invoiceNo: nextInvoice(state),
    plan: "Susu",
    cadence: "monthly",
    depositPct: 30,
    installments: makeInstallments(contract.total, {
      depositPct: 30,
      payments: 5,
      cadence: "monthly",
      start: todayKey(),
    }),
    created: at,
    ...contract,
  };
  const deposit = booking.installments[0];
  const name = inquiry.organisation ? inquiry.client : firstName(inquiry.client);
  const body = `${name}, ${quote.title} is reserved on ${booking.ref}.\nInvoice ${booking.invoiceNo} · ${money(booking.total, booking.currency)}.\nDeposit ${money(deposit.amount, booking.currency)} is due ${deposit.due.slice(0, 10)} to hold the booking.\n— Abena, Annix Travels`;
  return {
    ...state,
    quotes: replace(state.quotes, quote.id, { ...quote, status: "accepted", updated: at }),
    inquiries: replace(state.inquiries, inquiry.id, { ...inquiry, status: "booked" }),
    bookings: [...state.bookings, booking],
    followUps: state.followUps.map((row) =>
      row.inquiryId === inquiry.id && row.status === "open" ? { ...row, status: "done" } : row,
    ),
    messages: [
      ...state.messages,
      {
        id: uid("msg"),
        inquiryId: inquiry.id,
        channel: "whatsapp",
        direction: "out",
        auto: "reservation",
        at,
        body,
      },
      {
        id: uid("msg"),
        inquiryId: inquiry.id,
        channel: "email",
        direction: "out",
        auto: "reservation",
        at,
        subject: `Reserved ${booking.ref} · ${quote.title}`,
        body,
      },
    ],
  };
}

export function createQuote(state: DeskState, inquiryId: string, quoteId = uid("q")): DeskState {
  const inquiry = inquiryOf(state, inquiryId);
  if (!inquiry || state.quotes.some((quote) => quote.inquiryId === inquiryId || quote.id === quoteId)) return state;
  const dubai = /dubai/i.test(inquiry.destination);
  const currency: Currency = dubai ? "USD" : "GHS";
  const quote: Quote = {
    id: quoteId,
    inquiryId,
    ref: `ANX-Q-${2100 + state.quotes.length}`,
    title: inquiry.destination,
    status: "draft",
    invoiceCurrency: currency,
    marginPct: 12,
    validityDays: 14,
    fx: { GHS: 1, USD: 12.45, EUR: 13.6 },
    fxLocked: todayKey(),
    notes: inquiry.brief,
    inclusions: ["Flights or coach as listed", "Hotels and breakfast", "Transfers listed in the costing"],
    exclusions: ["Personal spending", "Meals not listed", "Travel insurance unless added"],
    updated: nowIso(),
    days: [
      {
        id: uid("day"),
        day: 1,
        city: dubai ? "Accra → Dubai" : inquiry.destination,
        title: "Arrival",
        narrative: "Arrival, transfer, and check-in.",
        stay: "Hotel",
        meals: "Breakfast",
      },
      {
        id: uid("day"),
        day: 2,
        city: dubai ? "Dubai" : inquiry.destination,
        title: dubai ? "Desert and gala dinner" : "Main day",
        narrative: dubai
          ? "Free morning for the group. Evening desert safari and the gala dinner."
          : "The main excursion for the group.",
        stay: "Hotel",
        meals: "Breakfast, dinner",
      },
      {
        id: uid("day"),
        day: 3,
        city: dubai ? "Dubai" : inquiry.destination,
        title: dubai ? "Free half-day" : "Second day",
        narrative: dubai ? "A free half-day, then time at the hotel." : "Continue the programme.",
        stay: "Hotel",
        meals: "Breakfast",
      },
      {
        id: uid("day"),
        day: 4,
        city: "Departure",
        title: "Fly home",
        narrative: "Checkout and the flight back to Accra.",
        stay: "—",
        meals: "Breakfast",
      },
    ],
    items: dubai
      ? [
          {
            id: uid("item"),
            day: null,
            category: "Flight",
            description: "Accra–Dubai return",
            qty: inquiry.travelers,
            unit: "person",
            unitPrice: 780,
            currency: "USD",
          },
          {
            id: uid("item"),
            day: null,
            category: "Stay",
            description: "Dubai hotel, 4 nights",
            qty: Math.ceil(inquiry.travelers / 2) * 3,
            unit: "room-night",
            unitPrice: 180,
            currency: "USD",
          },
          {
            id: uid("item"),
            day: 2,
            category: "Meals",
            description: "Gala dinner",
            qty: inquiry.travelers,
            unit: "person",
            unitPrice: 75,
            currency: "USD",
          },
          {
            id: uid("item"),
            day: null,
            category: "Visa",
            description: "UAE visa fees",
            qty: inquiry.travelers,
            unit: "person",
            unitPrice: 90,
            currency: "USD",
          },
        ]
      : [
          {
            id: uid("item"),
            day: null,
            category: "Fee",
            description: "Planning fee — replace with supplier lines",
            qty: 1,
            unit: "group",
            unitPrice: 0,
            currency: "GHS",
          },
        ],
  };
  return {
    ...state,
    quotes: [...state.quotes, quote],
    inquiries: replace(state.inquiries, inquiry.id, { ...inquiry, status: inquiry.status === "booked" ? inquiry.status : "quoting" }),
  };
}

export function recordPayment(
  state: DeskState,
  bookingId: string,
  installmentId: string,
  method: PayMethod,
  reference: string,
): DeskState {
  const booking = state.bookings.find((row) => row.id === bookingId);
  const inquiry = booking ? inquiryOf(state, booking.inquiryId) : undefined;
  const inst = booking?.installments.find((row) => row.id === installmentId);
  if (!booking || !inquiry || !inst || inst.status === "paid") return state;
  const at = nowIso();
  const receiptNo = nextReceipt(state);
  const installments = booking.installments.map((row) =>
    row.id === installmentId
      ? { ...row, status: "paid" as const, method, reference, paidAt: at, receiptNo }
      : row,
  );
  const balance = installments.filter((row) => row.status !== "paid").reduce((sum, row) => sum + row.amount, 0);
  const body = `Receipt ${receiptNo}\n${inst.label}: ${money(inst.amount, booking.currency)} via ${methodLabel(method)}${reference ? ` · ${reference}` : ""}.\nBalance ${money(balance, booking.currency)}.\n— Annix Travels`;
  return {
    ...state,
    bookings: replace(state.bookings, booking.id, { ...booking, installments }),
    messages: [
      ...state.messages,
      { id: uid("msg"), inquiryId: inquiry.id, channel: "whatsapp", direction: "out", auto: "receipt", at, body },
      {
        id: uid("msg"),
        inquiryId: inquiry.id,
        channel: "email",
        direction: "out",
        auto: "receipt",
        at,
        subject: `Receipt ${receiptNo}`,
        body,
      },
    ],
  };
}

export function rebaseCurrency(state: DeskState, bookingId: string, currency: Currency): DeskState {
  const booking = state.bookings.find((row) => row.id === bookingId);
  if (!booking || booking.currency === currency || booking.installments.some((row) => row.status === "paid")) return state;
  const total = round2(convert(booking.total, booking.currency, currency, booking.fx));
  const amounts = splitTotal(total, booking.installments.map((row) => row.amount || 1));
  const rough = booking.lines.map((line) => round2(convert(line.amount, booking.currency, currency, booking.fx)));
  const drift = round2(total - rough.reduce((sum, amount) => sum + amount, 0));
  if (rough.length) rough[rough.length - 1] = round2(rough[rough.length - 1] + drift);
  return {
    ...state,
    bookings: replace(state.bookings, booking.id, {
      ...booking,
      currency,
      total,
      lines: booking.lines.map((line, index) => ({ ...line, amount: rough[index] })),
      installments: booking.installments.map((row, index) => ({ ...row, amount: amounts[index] })),
    }),
  };
}

export function rebuildPlan(
  state: DeskState,
  bookingId: string,
  opts: { depositPct: number; payments: number; cadence: Cadence },
): DeskState {
  const booking = state.bookings.find((row) => row.id === bookingId);
  if (!booking || booking.installments.some((row) => row.status === "paid")) return state;
  return {
    ...state,
    bookings: replace(state.bookings, booking.id, {
      ...booking,
      cadence: opts.cadence,
      depositPct: opts.depositPct,
      installments: makeInstallments(booking.total, { ...opts, start: todayKey() }),
    }),
  };
}

export function postMessage(
  state: DeskState,
  inquiryId: string,
  channel: "whatsapp" | "email",
  body: string,
  subject?: string,
): DeskState {
  const text = body.trim();
  if (!text) return state;
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        id: uid("msg"),
        inquiryId,
        channel,
        direction: "out",
        at: nowIso(),
        subject: channel === "email" ? subject?.trim() || "Annix Travels" : undefined,
        body: text,
      },
    ],
  };
}

export function nudge(state: DeskState, followUpId: string): DeskState {
  const follow = state.followUps.find((row) => row.id === followUpId);
  const inquiry = follow ? inquiryOf(state, follow.inquiryId) : undefined;
  if (!follow || !inquiry || follow.status === "done") return state;
  const quote = state.quotes.find((row) => row.inquiryId === inquiry.id);
  const name = inquiry.organisation ? inquiry.client : firstName(inquiry.client);
  const body = `Hello ${name}, just checking you saw the proposal${quote ? ` ${quote.ref}` : ""} for ${inquiry.destination}. I can adjust the itinerary or set the Susu dates to suit the group.\n— Abena, Annix Travels`;
  const at = nowIso();
  return {
    ...state,
    followUps: replace(state.followUps, follow.id, { ...follow, status: "done" }),
    messages: [
      ...state.messages,
      {
        id: uid("msg"),
        inquiryId: inquiry.id,
        channel: follow.channel,
        direction: "out",
        auto: "follow-up",
        at,
        subject: follow.channel === "email" ? `Following up · ${inquiry.destination}` : undefined,
        body,
      },
    ],
  };
}

export function latestMessage(state: DeskState, inquiryId: string) {
  return [...state.messages].reverse().find((message) => message.inquiryId === inquiryId);
}

export function needsRevision(state: DeskState, inquiryId: string) {
  const last = latestMessage(state, inquiryId);
  const quote = state.quotes.find((row) => row.inquiryId === inquiryId);
  return Boolean(last && last.direction === "in" && quote && quote.status === "sent");
}
