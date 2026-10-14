"use client";

import Link from "next/link";
import { Cover } from "@/components/covers";
import { Pill } from "@/components/ui";
import { money } from "@/lib/format";
import { priceQuote } from "@/lib/pricing";
import { useDesk } from "@/lib/store";

export function QuoteList() {
  const desk = useDesk();
  return (
    <>
      <p className="kicker">Itinerary</p>
      <div className="page-head">
        <h1 className="display">Trip packages</h1>
      </div>
      <div className="packages" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {desk.quotes.map((quote) => {
          const inquiry = desk.inquiries.find((row) => row.id === quote.inquiryId);
          const priced = priceQuote(quote, inquiry?.travelers ?? 1);
          return (
            <article key={quote.id} className="card">
              <Cover destination={inquiry?.destination ?? quote.title} label={quote.title} />
              <div style={{ marginTop: 12 }}>
                <Pill tone={quote.status}>{quote.status}</Pill>
                <h2 style={{ marginTop: 8 }}>{quote.title}</h2>
                <p className="meta">{inquiry?.dates} · {inquiry?.travelers} travellers · {quote.days.length} days</p>
                <p className="money-lg">{money(priced.perPerson, quote.invoiceCurrency)} <span className="meta">/ person</span></p>
              </div>
              <div className="handoff">
                <Link className="btn primary" href={`/quotes/${quote.id}`}>Open studio</Link>
                <Link className="btn" href={`/quotes/${quote.id}/proposal`}>Proposal</Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
