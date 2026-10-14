import type { Currency, Fx, PayMethod } from "./types";

export function money(amount: number, currency: Currency) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function round2(amount: number) {
  return Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100;
}

export function toGhs(amount: number, currency: Currency, fx: Fx) {
  return amount * (fx[currency] || 0);
}

export function fromGhs(ghs: number, currency: Currency, fx: Fx) {
  return fx[currency] ? ghs / fx[currency] : 0;
}

export function convert(amount: number, from: Currency, to: Currency, fx: Fx) {
  if (from === to) return amount;
  return fromGhs(toGhs(amount, from, fx), to, fx);
}

export function accra(iso: string, withTime = false) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}

export function accraDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function methodLabel(method: PayMethod) {
  switch (method) {
    case "momo":
      return "MTN MoMo";
    case "bank":
      return "Bank transfer";
    case "card":
      return "Card";
    case "cash":
      return "Cash";
  }
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function mailLink(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function todayKey(from = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(from);
}

export function splitTotal(total: number, weights: number[]) {
  const cents = Math.round(round2(total) * 100);
  const weight = weights.reduce((sum, n) => sum + n, 0) || 1;
  const raw = weights.map((n) => Math.floor((cents * n) / weight));
  let drift = cents - raw.reduce((sum, n) => sum + n, 0);
  for (let i = raw.length - 1; drift > 0 && i >= 0; i -= 1) {
    raw[i] += 1;
    drift -= 1;
  }
  return raw.map((n) => n / 100);
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function firstName(client: string) {
  return client.split(" ")[0] || client;
}
