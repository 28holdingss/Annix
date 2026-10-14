"use client";

import Link from "next/link";
import { Cover, coverKey } from "@/components/covers";
import { needsRevision } from "@/lib/desk";
import { accraDay, money, todayKey } from "@/lib/format";
import { toneOf } from "@/lib/plan";
import { priceQuote } from "@/lib/pricing";
import { useDesk } from "@/lib/store";

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
            <Link key={inquiry.id} href={quote ? `/quotes/${quote.id}` : `/inquiries/${inquiry.id}`} className={`spot ${coverKey(inquiry.destination)}`}>
              <span className="spot-status">{quote?.status ?? inquiry.status}</span>
              <strong>{inquiry.destination}</strong>
              <span>{inquiry.organisation ?? inquiry.client}</span>
              <em>
                {inquiry.dates} · {inquiry.travelers} travellers
              </em>
            </Link>
          );
        })}
      </section>

      <section className="stats">
        <Stat href="/inquiries" label="Open inquiries" value={String(openInquiries)} note="Not yet booked" />
        <Stat href="/quotes" label="With the client" value={String(quoted)} note="Proposals sent" />
        <Stat href="/bookings" label="Susu plans" value={String(booked)} note="Reserved trips" />
        <Stat href="/payments" label="Due this week" value={String(dueSoon.length)} note="Installments" hot={dueSoon.length > 0} />
      </section>

      {revisions.length || follows.length ? (
        <section className="card flat attn">
          {revisions.map((inquiry) => {
            const quote = desk.quotes.find((row) => row.inquiryId === inquiry.id);
            return (
              <Link key={inquiry.id} href={quote ? `/quotes/${quote.id}` : `/inquiries/${inquiry.id}`}>
                <strong>{inquiry.client}</strong>
                <span>asked for a change on {inquiry.destination}</span>
              </Link>
            );
          })}
          {follows.map((follow) => {
            const inquiry = desk.inquiries.find((row) => row.id === follow.inquiryId);
            return (
              <Link key={follow.id} href={`/messages?with=${follow.inquiryId}`}>
                <strong>{inquiry?.client ?? "Follow up"}</strong>
                <span>
                  {follow.reason} · {accraDay(follow.due)}
                </span>
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
            {desk.quotes.map((quote) => {
              const inquiry = desk.inquiries.find((row) => row.id === quote.inquiryId);
              const priced = inquiry ? priceQuote(quote, inquiry.travelers) : null;
              return (
                <Link key={quote.id} href={`/quotes/${quote.id}`} className="package">
                  <Cover destination={inquiry?.destination ?? quote.title} label="" />
                  <div>
                    <strong>{inquiry?.organisation ?? inquiry?.client ?? quote.title}</strong>
                    <span className="meta">
                      {quote.title} · {inquiry?.dates} · {inquiry?.travelers} travellers
                    </span>
                  </div>
                  <div className="pkg-end">
                    <b>
                      {priced ? money(priced.perPerson, quote.invoiceCurrency) : "—"} <em>/ person</em>
                    </b>
                    <span className={`pill ${quote.status}`}>{quote.status}</span>
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

function Stat({ href, label, value, note, hot }: { href: string; label: string; value: string; note: string; hot?: boolean }) {
  return (
    <Link href={href} className="stat">
      <p>{label}</p>
      <div className="stat-row">
        <strong>{value}</strong>
        <span className={hot ? "trend down" : "trend"}>{note}</span>
      </div>
    </Link>
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
