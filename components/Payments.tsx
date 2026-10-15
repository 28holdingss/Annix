"use client";

import Link from "next/link";
import { useState } from "react";
import { accraDay, money, todayKey, toGhs } from "@/lib/format";
import { balanceOf, paidOf, toneOf } from "@/lib/plan";
import { useDesk } from "@/lib/store";
import { CURRENCIES, type Booking, type Currency } from "@/lib/types";

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
  const scheduled = rows.filter((item) => item.tone === "scheduled");
  const receipts = rows.filter((item) => item.row.status === "paid");
  const shown = view === "paid" ? [...receipts].reverse() : view === "due" ? dueNow : scheduled;
  const months = byMonth(rows);
  const paidSeries = months.map((month) => month.paid);

  return (
    <>
      <header className="file-head">
        <div>
          <p className="kicker">Payments</p>
          <h1>Collections</h1>
          <p className="lede">Cedis totals use each booking’s locked rate.</p>
        </div>
      </header>

      <div className="collect-board">
        <section className="collect-card">
          <div className="collect-card-top">
            <div>
              <h2>Summary</h2>
              <p>Each month, collected beside what is still open.</p>
            </div>
            <div className="bar-key">
              <span><i /> Collected</span>
              <span><i className="pale" /> Still open</span>
            </div>
          </div>
          <Bars months={months} />
          <div className="collect-currencies">
            {CURRENCIES.map((currency) => {
              const got = sumCurrency(desk.bookings, currency, paidOf);
              const still = sumCurrency(desk.bookings, currency, balanceOf);
              if (got === 0 && still === 0) return null;
              return (
                <article key={currency}>
                  <p>{currency}</p>
                  <strong>{money(got, currency)}</strong>
                  <em>{money(still, currency)} open</em>
                </article>
              );
            })}
          </div>
        </section>

        <div className="collect-side">
          <div className="activity-row">
            <article className="collect-card">
              <h2>Receipts</h2>
              <strong>{money(collected, "GHS")}</strong>
              <em>{receipts.length} paid</em>
              <Spark values={paidSeries} />
            </article>
            <article className="collect-card">
              <h2>Due now</h2>
              <strong>{money(ghsSum(dueNow), "GHS")}</strong>
              <em>{dueNow.length === 1 ? "1 installment" : `${dueNow.length} installments`}</em>
            </article>
            <article className="collect-card">
              <h2>Scheduled</h2>
              <strong>{money(ghsSum(scheduled), "GHS")}</strong>
              <em>{scheduled.length} later</em>
            </article>
            <article className="collect-card owe">
              <h2>Still open</h2>
              <strong>{money(open, "GHS")}</strong>
              <em>Balance still to collect</em>
            </article>
          </div>
        </div>
      </div>

      <section className="collect-history">
        <header>
          <div>
            <h2>Installments</h2>
            <p>Open a row to record it on the booking.</p>
          </div>
          <div className="collect-switch" role="group" aria-label="Which installments">
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
        </header>
        <div className="collect-table">
          <div className="collect-head" role="row">
            <span>Client</span>
            <span>Ref</span>
            <span>Status</span>
            <span>Date</span>
            <span>Amount</span>
          </div>
          {shown.map(({ booking, inquiry, row, tone }) => (
            <Link key={row.id} href={`/bookings/${booking.id}`} className="collect-line" role="row">
              <strong>{inquiry?.client ?? "Client"}</strong>
              <span>{row.receiptNo || row.label}</span>
              <i className={`pill ${tone}`}>{tone === "paid" ? "Receipt" : tone}</i>
              <span>{accraDay(row.due)}</span>
              <b className={tone === "paid" ? undefined : "owing"}>{money(row.amount, booking.currency)}</b>
            </Link>
          ))}
        </div>
        {shown.length === 0 ? <p className="empty">{view === "paid" ? "No receipts yet." : view === "due" ? "Nothing due in the next 7 days." : "No later installments."}</p> : null}
      </section>
    </>
  );
}

function ghsSum(items: { booking: Booking; row: { amount: number } }[]) {
  return items.reduce((sum, item) => sum + toGhs(item.row.amount, item.booking.currency, item.booking.fx), 0);
}

function sumCurrency(bookings: Booking[], currency: Currency, pick: (booking: Booking) => number) {
  return bookings.filter((booking) => booking.currency === currency).reduce((sum, booking) => sum + pick(booking), 0);
}

function byMonth(rows: { booking: Booking; row: { due: string; amount: number; status: string } }[]) {
  const map = new Map<string, { paid: number; open: number }>();
  for (const item of rows) {
    const key = item.row.due.slice(0, 7);
    const amount = toGhs(item.row.amount, item.booking.currency, item.booking.fx);
    const bucket = map.get(key) ?? { paid: 0, open: 0 };
    if (item.row.status === "paid") bucket.paid += amount;
    else bucket.open += amount;
    map.set(key, bucket);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      label: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`)),
      ...value,
    }));
}

function Bars({ months }: { months: ReturnType<typeof byMonth> }) {
  const max = Math.max(1, ...months.flatMap((month) => [month.paid, month.open]));
  return (
    <div className="bars" role="img" aria-label="Collected and still open by month">
      {months.map((month) => (
        <span key={month.key}>
          <i style={{ height: month.paid ? `${Math.max(6, (month.paid / max) * 100)}%` : "0%" }} />
          <i className="pale" style={{ height: month.open ? `${Math.max(6, (month.open / max) * 100)}%` : "0%" }} />
          <em>{month.label}</em>
        </span>
      ))}
    </div>
  );
}

function Spark({ values, light }: { values: number[]; light?: boolean }) {
  const max = Math.max(1, ...values);
  const width = 120;
  const height = 36;
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / max) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className={light ? "spark light" : "spark"} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline points={points} />
    </svg>
  );
}
