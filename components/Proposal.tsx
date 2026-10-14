"use client";

import Link from "next/link";
import { accra, addDays, money, splitTotal, todayKey } from "@/lib/format";
import { priceQuote } from "@/lib/pricing";
import { useDesk } from "@/lib/store";

export function Proposal({ id }: { id: string }) {
  const desk = useDesk();
  const quote = desk.quotes.find((row) => row.id === id);
  const inquiry = quote ? desk.inquiries.find((row) => row.id === quote.inquiryId) : undefined;
  if (!quote || !inquiry) return <p>This proposal is not on the desk.</p>;
  const priced = priceQuote(quote, inquiry.travelers);
  const weights = [30, 17.5, 17.5, 17.5, 17.5];
  const plan = splitTotal(priced.sellInvoice, weights);
  const start = todayKey();
  const groups = [
    { title: "Whole journey", lines: priced.presented.filter((line) => line.day == null) },
    ...quote.days.map((day) => ({
      title: `Day ${day.day} · ${day.city}`,
      lines: priced.presented.filter((line) => line.day === day.day),
    })),
  ].filter((group) => group.lines.length > 0);

  return (
    <>
      <div className="toolbar no-print" style={{ marginBottom: 16 }}>
        <Link className="btn" href={`/quotes/${quote.id}`}>Back to the studio</Link>
        <button type="button" className="btn primary" onClick={() => window.print()}>Print / save PDF</button>
      </div>
      <article className="doc">
        <div className="doc-top">
          <div>
            <p className="kicker">Annix Travel & Tours</p>
            <h2>{quote.title}</h2>
            <p className="meta">Prepared for {inquiry.organisation ? `${inquiry.client}, ${inquiry.organisation}` : inquiry.client}</p>
          </div>
          <div className="meta" style={{ textAlign: "right" }}>
            {quote.ref}<br />
            {inquiry.dates}<br />
            {inquiry.travelers} travellers<br />
            Valid {quote.validityDays} days
          </div>
        </div>
        <div className="perforation" />
        {quote.days.map((day) => (
          <section key={day.id} className="day-block">
            <div className="day-no">{String(day.day).padStart(2, "0")}</div>
            <div>
              <strong>{day.title}</strong>
              <div className="meta">{day.city} · {day.stay} · {day.meals}</div>
              <p style={{ margin: "6px 0 0" }}>{day.narrative}</p>
            </div>
          </section>
        ))}
        <div className="rule" />
        <h3>Investment</h3>
        <p className="meta">Figures in {quote.invoiceCurrency}. Supplier currencies were converted at the rate locked {accra(`${quote.fxLocked}T12:00:00.000Z`)}: 1 USD = {quote.fx.USD} GHS, 1 EUR = {quote.fx.EUR} GHS.</p>
        <table>
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {groups.flatMap((group) => [
              <tr key={group.title}>
                <td colSpan={3}><strong>{group.title}</strong></td>
              </tr>,
              ...group.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.description}<div className="meta">{line.category}</div></td>
                  <td>{line.qty} {line.unit}</td>
                  <td>{money(line.client, quote.invoiceCurrency)}</td>
                </tr>
              )),
            ])}
            <tr>
              <td colSpan={2}><strong>Total</strong><div className="meta">{money(priced.perPerson, quote.invoiceCurrency)} per person</div></td>
              <td><strong>{money(priced.sellInvoice, quote.invoiceCurrency)}</strong></td>
            </tr>
          </tbody>
        </table>
        <h3>Suggested Susu plan</h3>
        <p className="meta">Confirmed when you reserve. Weekly or monthly dates can be changed on the ledger.</p>
        <table>
          <tbody>
            {plan.map((amount, index) => (
              <tr key={index}>
                <td>{index === 0 ? "Deposit to reserve" : `Susu ${index}`}</td>
                <td>{accra(`${addDays(start, 30 * index)}T12:00:00.000Z`)}</td>
                <td>{money(amount, quote.invoiceCurrency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div>
            <h3>Included</h3>
            <ul>{quote.inclusions.filter(Boolean).map((line) => <li key={line}>{line}</li>)}</ul>
          </div>
          <div>
            <h3>Not included</h3>
            <ul>{quote.exclusions.filter(Boolean).map((line) => <li key={line}>{line}</li>)}</ul>
          </div>
        </div>
        <div className="rule" />
        <p className="meta">Abena Owusu · Annix Travel & Tours · Madina, Accra · info@annixtravels.com · +233 59 739 3783</p>
      </article>
    </>
  );
}
