"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  acceptQuote,
  addDay,
  addItem,
  createQuote,
  nudge,
  patchDay,
  patchItem,
  patchQuote,
  postMessage,
  rebaseCurrency,
  rebuildPlan,
  cycleDocument,
  recordPayment,
  removeDay,
  removeItem,
  sendQuote,
  setRentalStatus,
  setTicket,
  setVisaStatus,
} from "./desk";
import { createSeed } from "./seed";
import { uid } from "./format";
import type { Cadence, Currency, DayBlock, DeskState, LineItem, PayMethod, Quote, RentalStatus, TicketStatus, VisaStatus } from "./types";

const KEY = "skyland-annix-desk-v1";

type Api = DeskState & {
  ready: boolean;
  reset: () => void;
  patchQuote: (id: string, patch: Partial<Quote>) => void;
  patchDay: (quoteId: string, dayId: string, patch: Partial<DayBlock>) => void;
  patchItem: (quoteId: string, itemId: string, patch: Partial<LineItem>) => void;
  addDay: (quoteId: string) => void;
  removeDay: (quoteId: string, dayId: string) => void;
  addItem: (quoteId: string, seed?: Partial<LineItem>) => void;
  removeItem: (quoteId: string, itemId: string) => void;
  sendQuote: (id: string) => void;
  acceptQuote: (id: string) => void;
  createQuote: (inquiryId: string) => string | null;
  recordPayment: (bookingId: string, installmentId: string, method: PayMethod, reference: string) => void;
  rebaseCurrency: (bookingId: string, currency: Currency) => void;
  rebuildPlan: (bookingId: string, opts: { depositPct: number; payments: number; cadence: Cadence }) => void;
  postMessage: (inquiryId: string, channel: "whatsapp" | "email", body: string, subject?: string) => void;
  nudge: (followUpId: string) => void;
  setTicket: (id: string, patch: { status?: TicketStatus; pnr?: string }) => void;
  cycleDocument: (visaId: string, docId: string) => void;
  setVisaStatus: (id: string, status: VisaStatus) => void;
  setRentalStatus: (id: string, status: RentalStatus) => void;
};

const Ctx = createContext<Api | null>(null);

function usable(value: unknown): value is DeskState {
  if (!value || typeof value !== "object") return false;
  const row = value as DeskState;
  return Array.isArray(row.inquiries) && Array.isArray(row.quotes) && Array.isArray(row.bookings) && Array.isArray(row.messages) && Array.isArray(row.followUps);
}

function hydrate(saved: DeskState): DeskState {
  const seed = createSeed();
  const known = new Set(saved.inquiries.map((row) => row.id));
  const messages = new Set(saved.messages.map((row) => row.id));
  return {
    ...saved,
    inquiries: [...saved.inquiries.map((row) => ({ ...row, service: row.service ?? "tour" })), ...seed.inquiries.filter((row) => !known.has(row.id))],
    messages: [...saved.messages, ...seed.messages.filter((row) => !messages.has(row.id) && !known.has(row.inquiryId))],
    tickets: saved.tickets ?? seed.tickets,
    visas: saved.visas ?? seed.visas,
    rentals: saved.rentals ?? seed.rentals,
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DeskState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (usable(parsed)) {
          setState(hydrate(parsed));
          return;
        }
      }
    } catch {
      /* seed below */
    }
    setState(createSeed());
  }, []);

  useEffect(() => {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const api = useMemo<Api | null>(() => {
    if (!state) return null;
    const apply = (recipe: (current: DeskState) => DeskState) => setState((current) => (current ? recipe(current) : current));
    return {
      ...state,
      ready: true,
      reset: () => {
        localStorage.removeItem(KEY);
        setState(createSeed());
      },
      patchQuote: (id, patch) => apply((current) => patchQuote(current, id, patch)),
      patchDay: (quoteId, dayId, patch) => apply((current) => patchDay(current, quoteId, dayId, patch)),
      patchItem: (quoteId, itemId, patch) => apply((current) => patchItem(current, quoteId, itemId, patch)),
      addDay: (quoteId) => apply((current) => addDay(current, quoteId)),
      removeDay: (quoteId, dayId) => apply((current) => removeDay(current, quoteId, dayId)),
      addItem: (quoteId, seed) => apply((current) => addItem(current, quoteId, seed)),
      removeItem: (quoteId, itemId) => apply((current) => removeItem(current, quoteId, itemId)),
      sendQuote: (id) => apply((current) => sendQuote(current, id)),
      acceptQuote: (id) => apply((current) => acceptQuote(current, id)),
      createQuote: (inquiryId) => {
        const existing = state.quotes.find((quote) => quote.inquiryId === inquiryId);
        if (existing) return existing.id;
        const id = uid("q");
        setState((current) => (current ? createQuote(current, inquiryId, id) : current));
        return id;
      },
      recordPayment: (bookingId, installmentId, method, reference) =>
        apply((current) => recordPayment(current, bookingId, installmentId, method, reference)),
      rebaseCurrency: (bookingId, currency) => apply((current) => rebaseCurrency(current, bookingId, currency)),
      rebuildPlan: (bookingId, opts) => apply((current) => rebuildPlan(current, bookingId, opts)),
      postMessage: (inquiryId, channel, body, subject) => apply((current) => postMessage(current, inquiryId, channel, body, subject)),
      nudge: (followUpId) => apply((current) => nudge(current, followUpId)),
      setTicket: (id, patch) => apply((current) => setTicket(current, id, patch)),
      cycleDocument: (visaId, docId) => apply((current) => cycleDocument(current, visaId, docId)),
      setVisaStatus: (id, status) => apply((current) => setVisaStatus(current, id, status)),
      setRentalStatus: (id, status) => apply((current) => setRentalStatus(current, id, status)),
    };
  }, [state]);

  if (!api) {
    return <div className="booting">Opening the Annix desk…</div>;
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDesk() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useDesk must be used inside StoreProvider");
  return value;
}
