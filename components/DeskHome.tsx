"use client";

import Link from "next/link";
import { Cover } from "@/components/covers";
import { needsRevision } from "@/lib/desk";
import { accraDay, money, todayKey } from "@/lib/format";
import { balanceOf, toneOf } from "@/lib/plan";
import { priceQuote } from "@/lib/pricing";
import { useDesk } from "@/lib/store";

const hues = ["#ff8a3d", "#3d7dff", "#1aae70", "#7a5af8", "#e25b8a", "#0e8f8a"];

export function DeskHome() {
  const desk = useDesk();
  const today = todayKey();
  const attention =
    desk.followUps.filter((row) => row.status === "open").length +
    desk.inquiries.filter((inquiry) => needsRevision(desk, inquiry.id)).length;
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
  const revisions = desk.inquiries.filter((inquiry) => needsRevision(desk, inquiry.id));
  const spotlight = desk.inquiries.slice(0, 4);

  return (
    <>
      <header className="topbar">
        <div className="hello">
          <span className="avatar lg">AO</span>
          <div>
            <h1>Abena Owusu</h1>
            <p>Hey, plan the next Annix itinerary.</p>
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
            <Link key={inquiry.id} href={quote ? `/quotes/${quote.id}` : `/inquiries/${inquiry.id}`} className="spot">
              <Cover destination={inquiry.destination} label={inquiry.destination} />
              <div className="spot-cap">
                <strong>{inquiry.organisation ?? inquiry.client}</strong>
                <span>{inquiry.dates}</span>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="stats">
        <Stat label="Open inquiries" value={String(openInquiries)} note="Not yet booked" tone="down" />
        <Stat label="With the client" value={String(quoted)} note="Proposals sent" tone="up" />
        <Stat label="Susu plans" value={String(booked)} note="Reserved trips" tone="up" />
        <Stat label="Due this week" value={String(dueSoon.length)} note="Installments" tone={dueSoon.length ? "down" : "up"} />
      </section>

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
                  <Cover destination={inquiry?.destination ?? quote.title} label={inquiry?.destination.split(",")[0] ?? quote.title} />
                  <div>
                    <strong>{quote.title}</strong>
                    <span className="meta">
                      {inquiry?.dates} · {inquiry?.travelers} travellers
                    </span>
                    <b>{priced ? money(priced.perPerson, quote.invoiceCurrency) : "—"} <em>/ person</em></b>
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
              <Link href="/bookings">Ledger</Link>
            </div>
            <div className="timeline">
              {due.slice(0, 4).map(({ booking, row, tone }) => {
                const inquiry = desk.inquiries.find((item) => item.id === booking.inquiryId);
                return (
                  <Link key={row.id} href={`/bookings/${booking.id}`} className="trip-row">
                    <span className={`dot ${tone}`} />
                    <span>
                      <strong>{inquiry?.client}</strong>
                      <span className="meta">{row.label}</span>
                    </span>
                    <span className={`chip ${tone}`}>{money(row.amount, booking.currency)}</span>
                    <span className="meta when">{accraDay(row.due)}</span>
                  </Link>
                );
              })}
              {due.length === 0 ? <p className="empty">Every installment is paid.</p> : null}
            </div>
          </section>
        </aside>
      </div>

      <section className="card flat">
        <div className="section-head">
          <h2>Clients waiting</h2>
          <Link href="/messages">See more</Link>
        </div>
        <div className="people">
          {desk.inquiries.map((inquiry, index) => (
            <Link key={inquiry.id} href={`/messages?with=${inquiry.id}`} className="person-card">
              <span className="avatar" style={{ background: hues[index % hues.length] }}>
                {initials(inquiry.client)}
              </span>
              <strong>{inquiry.client.split(" ")[0]}</strong>
              <span className="meta">{inquiry.channel}</span>
            </Link>
          ))}
          {revisions.map((inquiry) => (
            <Link key={`${inquiry.id}-rev`} href={`/quotes/${desk.quotes.find((quote) => quote.inquiryId === inquiry.id)?.id ?? ""}`} className="person-card alert">
              <span className="avatar" style={{ background: "#ff7a1a" }}>!</span>
              <strong>Revise</strong>
              <span className="meta">{inquiry.client.split(" ")[0]}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone: "up" | "down" }) {
  return (
    <article className="stat">
      <p>{label}</p>
      <div className="stat-row">
        <strong>{value}</strong>
        <span className={`trend ${tone}`}>{note}</span>
      </div>
    </article>
  );
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
    </section>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
