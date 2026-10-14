"use client";

import Link from "next/link";
import { useState } from "react";
import { accraDay, money, todayKey, toGhs } from "@/lib/format";
import { balanceOf, paidOf, toneOf } from "@/lib/plan";
import { useDesk } from "@/lib/store";
import { CURRENCIES } from "@/lib/types";

export function Payments() {
  const desk = useDesk();
  const today = todayKey();
  const [view, setView] = useState<"due" | "scheduled" | "paid">("due");
  const rows = desk.bookings
    .flatMap((booking) => {
      const inquiry = desk.inquiries.find((row) => row.id === booking.inquiryId);
      return booking.installments.map((row) => ({ booking, inquiry, row, tone: toneOf(row, today) }));
    })
    .sort((a, b) => a.row.due.localeCompare(b.row.due));

  const collected = desk.bookings.reduce((sum, booking) => sum + toGhs(paidOf(booking), booking.currency, booking.fx), 0);
  const open = desk.bookings.reduce((sum, booking) => sum + toGhs(balanceOf(booking), booking.currency, booking.fx), 0);
  const dueNow = rows.filter((item) => item.tone === "due" || item.tone === "overdue");
  const shown =
    view === "paid" ? [...rows.filter((item) => item.row.status === "paid")].reverse() : view === "due" ? dueNow : rows.filter((item) => item.tone === "scheduled");

  return (
    <>
      <header className="file-head">
        <div>
          <p className="kicker">Payments</p>
          <h1>Collections</h1>
          <p className="lede">Each row is in the invoice currency. The cedis totals use that booking’s locked rate.</p>
        </div>
      </header>

      <section className="pay-stats">
        <article>
          <p>Collected</p>
          <strong>{money(collected, "GHS")}</strong>
          <em>At locked rates</em>
        </article>
        <article>
          <p>Still to collect</p>
          <strong>{money(open, "GHS")}</strong>
          <em>At locked rates</em>
        </article>
        <article>
          <p>Due in 7 days</p>
          <strong>{dueNow.length}</strong>
          <em>{dueNow.length === 1 ? "Installment" : "Installments"}</em>
        </article>
      </section>

      <div className="currency-strip">
        {CURRENCIES.map((currency) => {
          const still = desk.bookings.filter((booking) => booking.currency === currency).reduce((sum, booking) => sum + balanceOf(booking), 0);
          const got = desk.bookings.filter((booking) => booking.currency === currency).reduce((sum, booking) => sum + paidOf(booking), 0);
          if (still === 0 && got === 0) return null;
          return (
            <article key={currency}>
              <p>{currency}</p>
              <strong>{money(got, currency)}</strong>
              <em>{money(still, currency)} still open</em>
            </article>
          );
        })}
      </div>

      <div className="filters" role="group" aria-label="Which installments">
        <button type="button" className="btn small" aria-pressed={view === "due"} onClick={() => setView("due")}>
          Due now
        </button>
        <button type="button" className="btn small" aria-pressed={view === "scheduled"} onClick={() => setView("scheduled")}>
          Scheduled
        </button>
        <button type="button" className="btn small" aria-pressed={view === "paid"} onClick={() => setView("paid")}>
          Receipts
        </button>
      </div>

      <div className="pay-board">
        {shown.map(({ booking, inquiry, row, tone }) => (
          <Link key={row.id} href={`/bookings/${booking.id}`} className={`pay-board-row ${tone}`}>
            <time>
              <strong>{whenLabel(row.due, today, row.status === "paid")}</strong>
              <em>{accraDay(row.due)}</em>
            </time>
            <span>
              <strong>{inquiry?.client ?? "Client"}</strong>
              <em>
                {row.label}
                {row.receiptNo ? ` · ${row.receiptNo}` : ""}
                {inquiry ? ` · ${inquiry.destination}` : ""}
              </em>
            </span>
            <b>
              {money(row.amount, booking.currency)}
              <em>{booking.currency}</em>
            </b>
            <i className={`pill ${tone}`}>{tone === "paid" ? "receipt" : tone}</i>
          </Link>
        ))}
        {shown.length === 0 ? <p className="empty">{view === "paid" ? "No receipts yet." : view === "due" ? "Nothing due in the next 7 days." : "No later installments."}</p> : null}
      </div>
    </>
  );
}

function whenLabel(due: string, today: string, paid: boolean) {
  if (paid) return "Paid";
  const day = due.slice(0, 10);
  if (day < today) return "Overdue";
  if (day === today) return "Today";
  const gap = Math.round((Date.parse(day) - Date.parse(today)) / 86_400_000);
  if (gap === 1) return "Tomorrow";
  if (gap < 14) return `In ${gap} days`;
  return accraDay(due);
}
