"use client";

import Link from "next/link";
import { useState } from "react";
import { Cover } from "@/components/covers";
import { Pill } from "@/components/ui";
import { money } from "@/lib/format";
import { priceQuote } from "@/lib/pricing";
import { useDesk } from "@/lib/store";
import type { QuoteStatus } from "@/lib/types";

const filters: { id: "all" | QuoteStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "accepted", label: "Accepted" },
];

export function QuoteList() {
  const desk = useDesk();
  const [status, setStatus] = useState<(typeof filters)[number]["id"]>("all");
  const quotes = [...desk.quotes]
    .filter((quote) => status === "all" || quote.status === status)
    .sort((a, b) => b.updated.localeCompare(a.updated));

  return (
    <>
      <header className="file-head">
        <div>
          <p className="kicker">Itinerary</p>
          <h1>Trip packages</h1>
        </div>
        <div className="filters" role="group" aria-label="Status">
          {filters.map((filter) => (
            <button key={filter.id} type="button" className="btn small" aria-pressed={status === filter.id} onClick={() => setStatus(filter.id)}>
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      <div className="itin-list">
        {quotes.map((quote) => {
          const inquiry = desk.inquiries.find((row) => row.id === quote.inquiryId);
          const priced = priceQuote(quote, inquiry?.travelers ?? 1);
          return (
            <article key={quote.id} className="itin-row">
              <Link href={`/quotes/${quote.id}`} className="itin-open">
                <Cover destination={inquiry?.destination ?? quote.title} label="" />
                <div>
                  <h2>{quote.title}</h2>
                  <p className="meta">
                    {inquiry?.organisation ?? inquiry?.client} · {inquiry?.dates} · {inquiry?.travelers} travellers · {quote.days.length} days
                  </p>
                </div>
                <div className="itin-price">
                  <strong>{money(priced.perPerson, quote.invoiceCurrency)}</strong>
                  <span>per person</span>
                  <em>{money(priced.sellInvoice, quote.invoiceCurrency)} total</em>
                </div>
                <Pill tone={quote.status}>{quote.status}</Pill>
              </Link>
              <Link className="btn" href={`/quotes/${quote.id}/proposal`}>
                Proposal
              </Link>
            </article>
          );
        })}
        {quotes.length === 0 ? <p className="empty">No {status} itineraries on the desk.</p> : null}
      </div>
    </>
  );
}
