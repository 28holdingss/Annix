"use client";

import Link from "next/link";
import { useState } from "react";
import { accra, accraDay, convert, mailLink, methodLabel, money, waLink } from "@/lib/format";
import { balanceOf, paidOf, toneOf } from "@/lib/plan";
import { useDesk } from "@/lib/store";
import { CURRENCIES, type Cadence, type Currency, type PayMethod } from "@/lib/types";

export function BookingDesk({ id }: { id: string }) {
  const desk = useDesk();
  const booking = desk.bookings.find((row) => row.id === id);
  const inquiry = booking ? desk.inquiries.find((row) => row.id === booking.inquiryId) : undefined;
  const [method, setMethod] = useState<PayMethod>("momo");
  const [reference, setReference] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [depositPct, setDepositPct] = useState(booking?.depositPct ?? 30);
  const [payments, setPayments] = useState(booking?.installments.length ?? 5);
  const [cadence, setCadence] = useState<Cadence>(booking?.cadence ?? "monthly");
  if (!booking || !inquiry) return <p>This booking is not on the desk.</p>;

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const collected = paidOf(booking);
  const balance = balanceOf(booking);
  const anyPaid = booking.installments.some((row) => row.status === "paid");
  const next = booking.installments.find((row) => row.status !== "paid");
  const paidCount = booking.installments.filter((row) => row.status === "paid").length;
  const width = booking.total ? Math.min(100, (collected / booking.total) * 100) : 0;
  const latest = [...booking.installments].reverse().find((row) => row.receiptNo);

  return (
    <div className="booking">
      <header className="studio-head">
        <div>
          <p className="kicker">
            {booking.ref} · {booking.invoiceNo}
          </p>
          <h1>{inquiry.client}</h1>
          <p className="meta">
            {inquiry.destination} · {inquiry.dates} · {inquiry.travelers} travellers
          </p>
        </div>
        <div className="handoff">
          <Link className="btn" href="/payments">
            Payments
          </Link>
          <Link className="btn" href={`/quotes/${booking.quoteId}/proposal`}>
            Proposal
          </Link>
        </div>
      </header>

      <section className="pay-stats">
        <article>
          <p>Collected</p>
          <strong>{money(collected, booking.currency)}</strong>
        </article>
        <article>
          <p>Still to collect</p>
          <strong>{money(balance, booking.currency)}</strong>
        </article>
        <article>
          <p>{next ? next.label : "Plan complete"}</p>
          <strong>{next ? money(next.amount, booking.currency) : "Paid"}</strong>
          {next ? <span>{accraDay(next.due)}</span> : null}
        </article>
      </section>

      <div className="split">
        <section className="ledger-card">
          <div className="section-head">
            <h2>Susu plan</h2>
            <span className="meta">
              {paidCount} of {booking.installments.length} paid · {Math.round(width)}%
            </span>
          </div>
          <div className="progress" aria-hidden>
            <span style={{ width: `${width}%` }} />
          </div>
          <ol className="pay-list">
            {booking.installments.map((row) => {
              const tone = toneOf(row, today);
              const isNext = next?.id === row.id;
              const open = openId === row.id || (isNext && openId === null && tone !== "scheduled");
              return (
                <li key={row.id} className={`pay-row ${tone} ${isNext ? "next" : ""}`}>
                  <span className="pay-mark" aria-hidden>
                    {row.status === "paid" ? "✓" : row.due.slice(8, 10)}
                  </span>
                  <div>
                    <div className="pay-top">
                      <strong>{row.label}</strong>
                      <span>{money(row.amount, booking.currency)}</span>
                    </div>
                    <p className="meta">
                      {accra(row.due)}
                      {row.receiptNo ? ` · ${row.receiptNo}` : ""}
                      {row.method ? ` · ${methodLabel(row.method)}` : ""}
                      {row.status !== "paid" ? ` · ${tone}` : ""}
                    </p>
                    {row.status !== "paid" && open ? (
                      <form
                        className="pay-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          desk.recordPayment(booking.id, row.id, method, reference);
                          setReference("");
                          setOpenId(null);
                        }}
                      >
                        <select value={method} aria-label="Payment method" onChange={(event) => setMethod(event.target.value as PayMethod)}>
                          <option value="momo">MTN MoMo</option>
                          <option value="bank">Bank transfer</option>
                          <option value="card">Card</option>
                          <option value="cash">Cash</option>
                        </select>
                        <input placeholder="Reference" aria-label="Payment reference" value={reference} onChange={(event) => setReference(event.target.value)} />
                        <button className="btn primary small" type="submit">
                          Issue receipt
                        </button>
                      </form>
                    ) : null}
                    {row.status !== "paid" && !open ? (
                      <button type="button" className="terms-add" onClick={() => setOpenId(row.id)}>
                        Record this payment
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
          {latest ? (
            <p className="meta pay-handoff">
              Latest receipt {latest.receiptNo}
              {" · "}
              <a href={waLink(inquiry.phone, `Receipt ${latest.receiptNo} for ${money(latest.amount, booking.currency)}. Balance ${money(balance, booking.currency)}. — Annix Travels`)} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              {" · "}
              <a href={mailLink(inquiry.email, `Receipt ${latest.receiptNo}`, `${latest.receiptNo}\n${latest.label}: ${money(latest.amount, booking.currency)}\nBalance ${money(balance, booking.currency)}.`)}>
                Email
              </a>
            </p>
          ) : null}
          {!anyPaid ? (
            <form
              className="pay-form reshape"
              onSubmit={(event) => {
                event.preventDefault();
                const count = Number.isFinite(payments) ? payments : 5;
                const deposit = Number.isFinite(depositPct) ? depositPct : 30;
                desk.rebuildPlan(booking.id, { depositPct: deposit, payments: count, cadence });
              }}
            >
              <label>
                Deposit %
                <input type="number" min={10} max={80} value={depositPct} onChange={(event) => setDepositPct(Number(event.target.value))} />
              </label>
              <label>
                Payments
                <input type="number" min={2} max={12} value={payments} onChange={(event) => setPayments(Number(event.target.value))} />
              </label>
              <label>
                Cadence
                <select value={cadence} onChange={(event) => setCadence(event.target.value as Cadence)}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              <button className="btn small" type="submit">
                Rebuild
              </button>
            </form>
          ) : null}
        </section>

        <article className="invoice-card">
          <p className="kicker">Invoice {booking.invoiceNo}</p>
          <h2>{money(booking.total, booking.currency)}</h2>
          <p className="meta">Rate locked {accra(`${booking.fxLocked}T12:00:00.000Z`)}. Collect in {booking.currency}.</p>
          <div className="eq">
            {CURRENCIES.map((currency) => {
              const current = currency === booking.currency;
              return (
                <button key={currency} type="button" className={current ? "on" : undefined} disabled={current || anyPaid} onClick={() => desk.rebaseCurrency(booking.id, currency as Currency)}>
                  {money(convert(booking.total, booking.currency, currency, booking.fx), currency)}
                </button>
              );
            })}
          </div>
          <ul className="inv-lines">
            {booking.lines.map((line) => (
              <li key={`${line.description}-${line.qty}`}>
                <span>
                  {line.description}
                  <small>
                    {line.qty} {line.unit}
                  </small>
                </span>
                <strong>{money(line.amount, booking.currency)}</strong>
              </li>
            ))}
          </ul>
          <div className="inv-balance">
            <span>Still open</span>
            <strong>{money(balance, booking.currency)}</strong>
          </div>
          <p className="meta">{anyPaid ? "Currency stays fixed once a receipt exists." : "Nothing received yet. Choose another currency above to reissue the invoice."}</p>
        </article>
      </div>
    </div>
  );
}
