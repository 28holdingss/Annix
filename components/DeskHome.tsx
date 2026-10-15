"use client";

import Link from "next/link";
import { Cover, coverKey } from "@/components/covers";
import { needsRevision } from "@/lib/desk";
import { accraDay, money, todayKey } from "@/lib/format";
import { toneOf } from "@/lib/plan";
import { priceQuote } from "@/lib/pricing";
import { useDesk } from "@/lib/store";
import type { Inquiry, Quote } from "@/lib/types";

export function DeskHome() {
  const desk = useDesk();
  const today = todayKey();
  const revisions = desk.inquiries.filter((inquiry) => needsRevision(desk, inquiry.id));
  const follows = desk.followUps.filter((row) => row.status === "open");
  const attention = follows.length + revisions.length;
  const due = desk.bookings
    .flatMap((booking) =>
      booking.installments
        .filter((row) => row.status !== "paid")
        .map((row) => ({ booking, row, tone: toneOf(row, today) })),
    )
    .sort((a, b) => a.row.due.localeCompare(b.row.due));
  const dueSoon = due.filter((item) => item.tone === "due" || item.tone === "overdue");
  const openInquiries = desk.inquiries.filter((inquiry) => inquiry.status !== "booked").length;
  const quoted = desk.quotes.filter((quote) => quote.status === "sent").length;
  const booked = desk.bookings.length;
  const spotlight = [...desk.inquiries].sort((a, b) => b.opened.localeCompare(a.opened)).slice(0, 4);
  const greeting = morningLine(dueSoon.length, revisions.length, follows.length);

  return (
    <>
      <header className="topbar">
        <div className="hello">
          <span className="avatar lg">AO</span>
          <div>
            <h1>Abena Owusu</h1>
            <p>{greeting}</p>
          </div>
        </div>
        <div className="top-actions">
          <Link href="/messages" className="bell" aria-label={`${attention} threads waiting`}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 16V10a6 6 0 1 1 12 0v6l1.5 2h-15L6 16z" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
            {attention > 0 ? <span>{attention}</span> : null}
          </Link>
          <Link href="/inquiries" className="btn primary">
            + New trip
          </Link>
        </div>
      </header>

      <section className="spotlights" aria-label="Trips in motion">
        {spotlight.map((inquiry) => {
          const quote = desk.quotes.find((row) => row.inquiryId === inquiry.id);
          return (
            <Link key={inquiry.id} href={openInquiry(desk, inquiry, quote)} className={`spot ${coverKey(inquiry.destination)}`}>
              <span className="spot-ico" aria-hidden>
                <SpotIcon service={inquiry.service} />
              </span>
              <span className="spot-status">{nice(quote?.status ?? inquiry.status)}</span>
              <strong>{inquiry.destination}</strong>
              <em>
                {inquiry.organisation ?? inquiry.client} · {inquiry.dates}
              </em>
            </Link>
          );
        })}
      </section>

      <section className="stats">
        <Stat href="/inquiries" kind="inquiries" label="Open inquiries" value={String(openInquiries)} note="Not yet booked" />
        <Stat href="/quotes" kind="quotes" label="With the client" value={String(quoted)} note="Proposals sent" />
        <Stat href="/bookings" kind="plans" label="Susu plans" value={String(booked)} note="Reserved trips" />
        <Stat href="/payments" kind="due" label="Due this week" value={String(dueSoon.length)} note="Installments" hot={dueSoon.length > 0} />
      </section>

      {revisions.length || follows.length ? (
        <section className="attn">
          <div className="section-head">
            <h2>Waiting on you</h2>
          </div>
          {revisions.map((inquiry) => {
            const quote = desk.quotes.find((row) => row.inquiryId === inquiry.id);
            return (
              <Link key={inquiry.id} href={quote ? `/quotes/${quote.id}` : `/inquiries/${inquiry.id}`} className="attn-row">
                <span className="attn-ico change" aria-hidden>
                  <svg viewBox="0 0 24 24">
                    <path d="M4 6h16M4 12h10M4 18h7" />
                    <path d="M15 16l3 3 4-5" />
                  </svg>
                </span>
                <span>
                  <strong>{inquiry.client}</strong>
                  <em>Asked for a change on {inquiry.destination}</em>
                </span>
                <span className="attn-kind">Change</span>
              </Link>
            );
          })}
          {follows.map((follow) => {
            const inquiry = desk.inquiries.find((row) => row.id === follow.inquiryId);
            return (
              <Link key={follow.id} href={`/messages?with=${follow.inquiryId}`} className="attn-row">
                <span className="attn-ico follow" aria-hidden>
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v5l3 2" />
                  </svg>
                </span>
                <span>
                  <strong>{inquiry?.client ?? "Follow up"}</strong>
                  <em>{follow.reason}</em>
                </span>
                <time>{accraDay(follow.due)}</time>
              </Link>
            );
          })}
        </section>
      ) : null}

      <div className="home-grid">
        <section className="card flat">
          <div className="section-head">
            <h2>Trip packages</h2>
            <Link href="/quotes">See more</Link>
          </div>
          <div className="packages">
            {[...desk.quotes]
              .sort((a, b) => b.updated.localeCompare(a.updated))
              .slice(0, 5)
              .map((quote) => {
                const inquiry = desk.inquiries.find((row) => row.id === quote.inquiryId);
                const priced = inquiry ? priceQuote(quote, inquiry.travelers) : null;
                return (
                  <Link key={quote.id} href={`/quotes/${quote.id}`} className="package">
                    <Cover destination={inquiry?.destination ?? quote.title} label={currencyMark(quote.invoiceCurrency)} />
                    <div className="pkg-main">
                      <span className="pkg-title">
                        <strong>{inquiry?.organisation ?? inquiry?.client ?? quote.title}</strong>
                        <span className={`pill ${quote.status}`}>{quote.status}</span>
                      </span>
                      <span className="meta">
                        {quote.title} · {inquiry?.dates} · {inquiry?.travelers} travellers
                      </span>
                    </div>
                    <div className="pkg-end">
                      <b>{priced ? money(priced.perPerson, quote.invoiceCurrency) : "—"}</b>
                      <em>per person</em>
                    </div>
                  </Link>
                );
              })}
          </div>
        </section>

        <aside className="side-col">
          <Month marks={new Set(due.map((item) => item.row.due.slice(0, 10)))} today={today} />
          <section className="card flat">
            <div className="section-head">
              <h2>Upcoming collections</h2>
              <Link href="/payments">Payments</Link>
            </div>
            <div className="timeline">
              {due.slice(0, 4).map(({ booking, row, tone }) => {
                const inquiry = desk.inquiries.find((item) => item.id === booking.inquiryId);
                return (
                  <Link key={row.id} href={`/bookings/${booking.id}`} className="collect">
                    <span className={`dot ${tone}`} />
                    <strong>{inquiry?.client}</strong>
                    <span className={`chip ${tone}`}>{money(row.amount, booking.currency)}</span>
                    <span className="meta">{row.label}</span>
                    <span className="meta when">{accraDay(row.due)}</span>
                  </Link>
                );
              })}
              {due.length === 0 ? <p className="empty">Every installment is paid.</p> : null}
            </div>
          </section>
        </aside>
      </div>

    </>
  );
}

function Stat({ href, kind, label, value, note, hot }: { href: string; kind: "inquiries" | "quotes" | "plans" | "due"; label: string; value: string; note: string; hot?: boolean }) {
  return (
    <Link href={href} className={hot ? "stat hot" : "stat"}>
      <span className={`stat-ico ${kind}`} aria-hidden>
        <StatIcon kind={kind} />
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
      <em>{note}</em>
    </Link>
  );
}

function StatIcon({ kind }: { kind: "inquiries" | "quotes" | "plans" | "due" }) {
  if (kind === "quotes") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M6 4h9l3 3v13H6z" />
        <path d="M15 4v3h3M9 12h6M9 16h4" />
      </svg>
    );
  }
  if (kind === "plans") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
      </svg>
    );
  }
  if (kind === "due") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

function morningLine(due: number, changes: number, follows: number) {
  const parts = [
    due ? `${due} collection${due === 1 ? "" : "s"} due` : "",
    changes ? `${changes} change${changes === 1 ? "" : "s"} to answer` : "",
    follows ? `${follows} follow-up${follows === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Nothing is waiting on you this morning.";
}

function currencyMark(currency: string) {
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  return "₵";
}

function nice(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function SpotIcon({ service }: { service?: Inquiry["service"] }) {
  if (service === "ticket") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </svg>
    );
  }
  if (service === "visa") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="6" y="3.5" width="12" height="17" rx="2" />
        <path d="M9 8.5h6M9 12h6M9 15.5h4" />
      </svg>
    );
  }
  if (service === "rental") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 16h16v2.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V16z" />
        <path d="M6 16l1.8-5.2A2 2 0 0 1 9.7 9.5h4.6a2 2 0 0 1 1.9 1.3L18 16" />
        <circle cx="8" cy="18.2" r="1.2" />
        <circle cx="16" cy="18.2" r="1.2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

function openInquiry(desk: ReturnType<typeof useDesk>, inquiry: Inquiry, quote?: Quote) {
  if (inquiry.service === "ticket") {
    const row = desk.tickets.find((item) => item.inquiryId === inquiry.id);
    if (row) return `/tickets/${row.id}`;
  }
  if (inquiry.service === "visa") {
    const row = desk.visas.find((item) => item.inquiryId === inquiry.id);
    if (row) return `/visas/${row.id}`;
  }
  if (inquiry.service === "rental") {
    const row = desk.rentals.find((item) => item.inquiryId === inquiry.id);
    if (row) return `/rentals/${row.id}`;
  }
  return quote ? `/quotes/${quote.id}` : `/inquiries/${inquiry.id}`;
}

function Month({ marks, today }: { marks: Set<string>; today: string }) {
  const [year, month] = today.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);

  return (
    <section className="card flat calendar">
      <div className="section-head">
        <h2>{label}</h2>
      </div>
      <div className="cal-grid heads">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <span key={`${day}${index}`}>{day}</span>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((day, index) => {
          if (!day) return <span key={`e${index}`} />;
          const key = `${today.slice(0, 8)}${String(day).padStart(2, "0")}`;
          const classes = [key === today ? "today" : "", marks.has(key) ? "marked" : ""].filter(Boolean).join(" ");
          return (
            <span key={key} className={classes}>
              {day}
            </span>
          );
        })}
      </div>
      <p className="cal-legend">
        <i className="today" /> Today
        <i className="marked" /> Collection due
      </p>
    </section>
  );
}
