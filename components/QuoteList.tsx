"use client";

import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/format";
import { priceQuote } from "@/lib/pricing";
import { useDesk } from "@/lib/store";
import type { QuoteStatus } from "@/lib/types";

const packagePhotos = ["/package1.jpg", "/package2.jpg", "/package3.jpg", "/package4.jpg", "/package5.jpg"];

const filters: { id: "all" | QuoteStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "accepted", label: "Accepted" },
];

export function QuoteList() {
  const desk = useDesk();
  const [status, setStatus] = useState<(typeof filters)[number]["id"]>("all");
  const ordered = [...desk.quotes].sort((a, b) => b.updated.localeCompare(a.updated));
  const quotes = ordered.filter((quote) => status === "all" || quote.status === status);

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

      <div className="stay-grid">
        {quotes.map((quote) => {
          const inquiry = desk.inquiries.find((row) => row.id === quote.inquiryId);
          const priced = priceQuote(quote, inquiry?.travelers ?? 1);
          const photo = packagePhotos[ordered.findIndex((row) => row.id === quote.id) % packagePhotos.length];
          return (
            <Link key={quote.id} href={`/quotes/${quote.id}`} className="stay-card" style={{ backgroundImage: `url("${photo}")` }}>
              <span className="stay-state">{quote.status}</span>
              <span className="stay-copy">
                <span className="stay-title">
                  <h2>{quote.title}</h2>
                  <b>{money(priced.perPerson, quote.invoiceCurrency)}</b>
                </span>
                <p>{inquiry?.brief}</p>
                <span className="stay-tags">
                  <em>{inquiry?.kind}</em>
                  <em>
                    {quote.days.length} {quote.days.length === 1 ? "day" : "days"}
                  </em>
                  <em>
                    {inquiry?.travelers} {inquiry?.travelers === 1 ? "traveller" : "travellers"}
                  </em>
                </span>
              </span>
              <span className="stay-book">Open</span>
            </Link>
          );
        })}
      </div>
      {quotes.length === 0 ? <p className="empty">No {status} itineraries on the desk.</p> : null}
    </>
  );
}
