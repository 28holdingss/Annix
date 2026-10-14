import { addDays, splitTotal, todayKey, uid } from "./format";
import type { Booking, Cadence, Installment } from "./types";

export function makeInstallments(
  total: number,
  opts: { depositPct: number; payments: number; cadence: Cadence; start?: string },
): Installment[] {
  const payments = Math.max(2, opts.payments);
  const rest = payments - 1;
  const tail = (100 - opts.depositPct) / rest;
  const weights = [opts.depositPct, ...Array.from({ length: rest }, () => tail)];
  const amounts = splitTotal(total, weights);
  const step = opts.cadence === "weekly" ? 7 : 30;
  const start = opts.start ?? todayKey();
  return amounts.map((amount, index) => ({
    id: uid("ins"),
    label: index === 0 ? "Deposit to reserve" : `Susu ${index} of ${rest}`,
    due: `${addDays(start, step * index)}T09:00:00.000Z`,
    amount,
    status: index === 0 ? "due" : "scheduled",
  }));
}

export function balanceOf(booking: Booking) {
  return booking.installments.filter((row) => row.status !== "paid").reduce((sum, row) => sum + row.amount, 0);
}

export function paidOf(booking: Booking) {
  return booking.installments.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.amount, 0);
}

export function toneOf(row: Installment, today: string) {
  if (row.status === "paid") return "paid" as const;
  if (row.due.slice(0, 10) < today) return "overdue" as const;
  if (row.due.slice(0, 10) <= addDays(today, 7)) return "due" as const;
  return "scheduled" as const;
}
