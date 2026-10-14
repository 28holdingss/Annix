"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cover } from "@/components/covers";
import { channelTone, Pill } from "@/components/ui";
import { accra, money } from "@/lib/format";
import { balanceOf, paidOf } from "@/lib/plan";
import { priceQuote } from "@/lib/pricing";
import { useDesk } from "@/lib/store";

export function InquiryDetail({ id }: { id: string }) {
  const desk = useDesk();
  const router = useRouter();
  const inquiry = desk.inquiries.find((row) => row.id === id);
  if (!inquiry) return <p>This inquiry is not on the desk.</p>;
  const quote = desk.quotes.find((row) => row.inquiryId === inquiry.id);
  const booking = desk.bookings.find((row) => row.inquiryId === inquiry.id);
  const thread = desk.messages.filter((row) => row.inquiryId === inquiry.id).slice(-3);
  const follow = desk.followUps.find((row) => row.inquiryId === inquiry.id && row.status === "open");
  const priced = quote ? priceQuote(quote, inquiry.travelers) : null;
  const nextDue = booking?.installments.find((row) => row.status !== "paid");
  const phone = inquiry.phone.replace(/\D/g, "");

  return (
    <div className="file">
      <header className="file-head">
        <div>
          <p className="kicker">
            {inquiry.ref} · {inquiry.kind}
          </p>
          <h1>{inquiry.organisation ?? inquiry.client}</h1>
          <p className="lede">{inquiry.brief}</p>
        </div>
        <div className="toolbar">
          <Pill tone={channelTone(inquiry.channel)}>{inquiry.channel}</Pill>
          <Pill tone={inquiry.status}>{inquiry.status}</Pill>
        </div>
      </header>

      <div className="file-facts">
        <article>
          <p>Going to</p>
          <strong>{inquiry.destination}</strong>
        </article>
        <article>
          <p>Dates</p>
          <strong>{inquiry.dates}</strong>
        </article>
        <article>
          <p>Party</p>
          <strong>{inquiry.travelers} travellers</strong>
        </article>
        <article>
          <p>Opened</p>
          <strong>{accra(inquiry.opened)}</strong>
        </article>
      </div>

      <div className="file-grid">
        <section className="card trip-card">
          <Cover destination={inquiry.destination} label={inquiry.destination} />
          {quote && priced ? (
            <>
              <ol className="file-days">
                {quote.days.map((day) => (
                  <li key={day.id}>
                    <span>{day.day}</span>
                    <div>
                      <strong>{day.city}</strong>
                      <em>{day.title}</em>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="trip-total">
                <div>
                  <p>
                    {quote.ref} · {quote.status}
                  </p>
                  <strong>{money(priced.sellInvoice, quote.invoiceCurrency)}</strong>
                  <span>
                    {money(priced.perPerson, quote.invoiceCurrency)} per person · {quote.days.length} days
                  </span>
                </div>
                <div className="handoff">
                  <Link className="btn primary" href={`/quotes/${quote.id}`}>
                    Open in the studio
                  </Link>
                  <Link className="btn" href={`/quotes/${quote.id}/proposal`}>
                    Client proposal
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="trip-empty">
              <p>No days on the desk yet. The brief above is everything the client has sent.</p>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  const quoteId = desk.createQuote(inquiry.id);
                  if (quoteId) router.push(`/quotes/${quoteId}`);
                }}
              >
                Start the itinerary
              </button>
            </div>
          )}
        </section>

        <aside className="file-side">
          <section className="card person-file">
            <span className="avatar" style={{ background: "#ff8a3d" }}>
              {initials(inquiry.client)}
            </span>
            <div>
              <strong>{inquiry.client}</strong>
              {inquiry.organisation ? <p>{inquiry.organisation}</p> : null}
              <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer">
                +{phone}
              </a>
              <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
            </div>
          </section>

          <section className="card susu-file">
            <h2>Susu</h2>
            {booking ? (
              <>
                <p className="meta">
                  {booking.invoiceNo} · {booking.cadence}
                </p>
                <strong className="susu-figure">{money(balanceOf(booking), booking.currency)}</strong>
                <p className="meta">still to collect of {money(booking.total, booking.currency)}</p>
                <p className="meta">Collected {money(paidOf(booking), booking.currency)}</p>
                {nextDue ? (
                  <p className="susu-next">
                    {nextDue.label} · {money(nextDue.amount, booking.currency)} · {accra(nextDue.due)}
                  </p>
                ) : (
                  <p className="susu-next">Paid in full</p>
                )}
                <Link className="btn primary" href={`/bookings/${booking.id}`}>
                  Open the ledger
                </Link>
              </>
            ) : (
              <p className="empty">Accepting the proposal opens a 30% deposit and four Susu payments on this file.</p>
            )}
          </section>
        </aside>
      </div>

      {follow ? (
        <div className="follow-bar file-follow">
          <span>
            Follow up {accra(follow.due, true)} · {follow.reason}
          </span>
          <Link href={`/messages?with=${inquiry.id}`}>Open the thread</Link>
        </div>
      ) : null}

      <section className="card file-thread">
        <div className="row-line">
          <h2>Latest on the thread</h2>
          <Link href={`/messages?with=${inquiry.id}`}>Open the full thread</Link>
        </div>
        {thread.length === 0 ? <p className="empty">Nothing logged yet.</p> : null}
        <div className="file-bubbles">
          {thread.map((message) => (
            <article key={message.id} className={`bubble ${message.direction}`}>
              <div className="bubble-meta">
                <span>
                  {message.direction === "in" ? inquiry.client.split(" ")[0] : "Annix"} · {message.channel === "whatsapp" ? "WhatsApp" : "Email"}
                  {message.auto ? ` · ${message.auto}` : ""}
                </span>
                <time>{accra(message.at, true)}</time>
              </div>
              <p>{message.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function initials(name: string) {
  const skip = new Set(["elder", "pastor", "rev", "mrs", "mr", "ms", "dr"]);
  const parts = name.split(" ").filter((part) => part && !skip.has(part.toLowerCase().replace(/\./g, "")));
  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
