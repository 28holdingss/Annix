"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pill } from "@/components/ui";
import { handoffLinks } from "@/lib/desk";
import { convert, money } from "@/lib/format";
import { priceQuote } from "@/lib/pricing";
import { useDesk } from "@/lib/store";
import { CURRENCIES, type Category, type Currency, type Unit } from "@/lib/types";

const categories: Category[] = ["Flight", "Stay", "Transfer", "Activity", "Meals", "Guide", "Visa", "Insurance", "Fee"];
const units: Unit[] = ["person", "room-night", "day", "group"];

function num(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function LineList({
  tone,
  title,
  lines,
  locked,
  placeholder,
  onChange,
}: {
  tone: "in" | "out";
  title: string;
  lines: string[];
  locked: boolean;
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className={`terms-col ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {lines.map((line, index) => (
          <li key={`${tone}-${index}`}>
            <span className="mark" aria-hidden>
              {tone === "in" ? "✓" : "–"}
            </span>
            <input
              aria-label={`${title} ${index + 1}`}
              value={line}
              placeholder={placeholder}
              onChange={(event) => {
                const next = [...lines];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
            {!locked ? (
              <button type="button" className="icon-btn" aria-label={`Remove ${title.toLowerCase()} item`} onClick={() => onChange(lines.filter((_, item) => item !== index))}>
                ×
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {!locked ? (
        <button type="button" className="terms-add" onClick={() => onChange([...lines, ""])}>
          + Add
        </button>
      ) : null}
    </div>
  );
}

export function QuoteStudio({ id }: { id: string }) {
  const desk = useDesk();
  const router = useRouter();
  const [sentNote, setSentNote] = useState(false);
  const [openLine, setOpenLine] = useState<string | null>(null);
  const quote = desk.quotes.find((row) => row.id === id);
  const inquiry = quote ? desk.inquiries.find((row) => row.id === quote.inquiryId) : undefined;
  if (!quote || !inquiry) return <p>This proposal is not on the desk.</p>;

  const priced = priceQuote(quote, inquiry.travelers);
  const locked = quote.status === "accepted";
  const booking = desk.bookings.find((row) => row.quoteId === quote.id);
  const asked = desk.messages.some((message) => message.inquiryId === inquiry.id && message.direction === "in" && /balloon/i.test(message.body));
  const hasBalloon = quote.items.some((item) => /balloon/i.test(item.description));
  const copyTotal = `${money(priced.sellInvoice, quote.invoiceCurrency)} (${money(priced.perPerson, quote.invoiceCurrency)} per person)`;
  const links = handoffLinks(
    inquiry,
    `Hello ${inquiry.client}, proposal ${quote.ref} for ${quote.title} is ${copyTotal}. — Abena, Annix Travels`,
    `Proposal ${quote.ref}`,
    `Proposal ${quote.ref} for ${quote.title}: ${copyTotal}.`,
  );

  return (
    <div className="studio">
      <header className="studio-head">
        <div>
          <p className="kicker">
            {quote.ref} · {inquiry.organisation ?? inquiry.client}
          </p>
          <h1>{quote.title}</h1>
          <p className="meta">
            {inquiry.dates} · {inquiry.travelers} travellers · {inquiry.destination}
          </p>
        </div>
        <div className="studio-actions no-print">
          <Pill tone={quote.status}>{quote.status}</Pill>
          <Link className="btn" href={`/quotes/${quote.id}/proposal`}>
            Preview
          </Link>
          {booking ? (
            <Link className="btn ink" href={`/bookings/${booking.id}`}>
              Susu plan
            </Link>
          ) : null}
          {!locked ? (
            <>
              <button
                type="button"
                className="btn"
                disabled={priced.sellInvoice <= 0}
                onClick={() => {
                  desk.sendQuote(quote.id);
                  setSentNote(true);
                }}
              >
                {quote.status === "sent" ? "Send update" : "Send"}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={priced.sellInvoice <= 0}
                onClick={() => {
                  desk.acceptQuote(quote.id);
                  router.push(`/bookings/b_${quote.id}`);
                }}
              >
                Accept
              </button>
            </>
          ) : null}
        </div>
      </header>

      {sentNote ? (
        <div className="banner no-print">
          <span>Logged on WhatsApp and email. A follow-up sits on the desk if they stay quiet for two days.</span>
          <span className="handoff">
            <a className="btn small" href={links.whatsapp} target="_blank" rel="noreferrer">
              Open WhatsApp
            </a>
            <a className="btn small" href={links.email}>
              Open email
            </a>
          </span>
        </div>
      ) : null}
      {locked ? <div className="banner">This proposal is the booking contract. The Susu total stays as reserved.</div> : null}

      <fieldset disabled={locked}>
        <div className="studio-grid">
          <section>
            <div className="section-head">
              <h2>Itinerary</h2>
              <span className="meta">{quote.days.length} days</span>
            </div>
            <ol className="journey">
              {quote.days.map((day) => {
                const daySpend = priced.presented.filter((line) => line.day === day.day).reduce((sum, line) => sum + line.client, 0);
                return (
                  <li key={day.id} className="journey-day">
                    <div className="journey-mark" aria-hidden>
                      {day.day}
                    </div>
                    <article className="journey-body">
                      <div className="journey-top">
                        <input
                          className="city-field"
                          aria-label={`Day ${day.day} place`}
                          value={day.city}
                          onChange={(event) => desk.patchDay(quote.id, day.id, { city: event.target.value })}
                        />
                        {daySpend > 0 ? <span className="meta">{money(daySpend, quote.invoiceCurrency)}</span> : null}
                        {!locked ? (
                          <button type="button" className="icon-btn" aria-label={`Remove day ${day.day}`} onClick={() => desk.removeDay(quote.id, day.id)}>
                            ×
                          </button>
                        ) : null}
                      </div>
                      <input
                        className="title-field"
                        aria-label={`Day ${day.day} title`}
                        value={day.title}
                        onChange={(event) => desk.patchDay(quote.id, day.id, { title: event.target.value })}
                      />
                      <textarea
                        className="story-field"
                        aria-label={`Day ${day.day} story`}
                        rows={2}
                        value={day.narrative}
                        onChange={(event) => desk.patchDay(quote.id, day.id, { narrative: event.target.value })}
                      />
                      <div className="stay-row">
                        <label>
                          <span>Stay</span>
                          <input value={day.stay} onChange={(event) => desk.patchDay(quote.id, day.id, { stay: event.target.value })} />
                        </label>
                        <label>
                          <span>Meals</span>
                          <input value={day.meals} onChange={(event) => desk.patchDay(quote.id, day.id, { meals: event.target.value })} />
                        </label>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
            {!locked ? (
              <button type="button" className="add-day" onClick={() => desk.addDay(quote.id)}>
                + Add a day
              </button>
            ) : null}

            <section className="terms">
              <LineList
                tone="in"
                title="Included"
                lines={quote.inclusions}
                locked={locked}
                placeholder="Add something the price covers"
                onChange={(inclusions) => desk.patchQuote(quote.id, { inclusions })}
              />
              <LineList
                tone="out"
                title="Not included"
                lines={quote.exclusions}
                locked={locked}
                placeholder="Add something the client pays themselves"
                onChange={(exclusions) => desk.patchQuote(quote.id, { exclusions })}
              />
              <label className="terms-note">
                <span>Note for the file</span>
                <textarea rows={2} value={quote.notes} placeholder="Only the desk sees this. It does not go on the proposal." onChange={(event) => desk.patchQuote(quote.id, { notes: event.target.value })} />
              </label>
            </section>
          </section>

          <aside className="cost-col">
            <div className="ticket">
              <p className="kicker">Client total</p>
              <strong>{money(priced.sellInvoice, quote.invoiceCurrency)}</strong>
              <p>
                {money(priced.perPerson, quote.invoiceCurrency)} per person · {inquiry.travelers} travellers
              </p>
              <div className="eq">
                {CURRENCIES.map((currency) => (
                  <span key={currency} className={currency === quote.invoiceCurrency ? "on" : undefined}>
                    {money(convert(priced.sellInvoice, quote.invoiceCurrency, currency, quote.fx), currency)}
                  </span>
                ))}
              </div>
            </div>

            <div className="rate-strip">
              <label>
                Invoice
                <select value={quote.invoiceCurrency} onChange={(event) => desk.patchQuote(quote.id, { invoiceCurrency: event.target.value as Currency })}>
                  {CURRENCIES.map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
              </label>
              <label>
                Margin
                <input type="number" min={0} max={40} value={quote.marginPct} onChange={(event) => desk.patchQuote(quote.id, { marginPct: num(event.target.value) })} />
                <span>%</span>
              </label>
              <label>
                Valid
                <input type="number" min={1} value={quote.validityDays} onChange={(event) => desk.patchQuote(quote.id, { validityDays: num(event.target.value) })} />
                <span>days</span>
              </label>
              <label>
                USD
                <input type="number" step="0.01" value={quote.fx.USD} onChange={(event) => desk.patchQuote(quote.id, { fx: { ...quote.fx, USD: num(event.target.value) || quote.fx.USD } })} />
              </label>
              <label>
                EUR
                <input type="number" step="0.01" value={quote.fx.EUR} onChange={(event) => desk.patchQuote(quote.id, { fx: { ...quote.fx, EUR: num(event.target.value) || quote.fx.EUR } })} />
              </label>
            </div>

            <section className="ledger-card">
              <div className="section-head">
                <h2>Costing</h2>
                <span className="meta">{quote.items.length} lines</span>
              </div>
              {asked && !hasBalloon && !locked ? (
                <div className="suggest">
                  <div>
                    <strong>Desert balloon</strong>
                    <span className="meta">Nana asked on WhatsApp · day 5 · 2 × US$185</span>
                  </div>
                  <button
                    type="button"
                    className="btn primary small"
                    onClick={() =>
                      desk.addItem(quote.id, {
                        description: "Dubai desert balloon flight",
                        category: "Activity",
                        day: 5,
                        qty: inquiry.travelers,
                        unit: "person",
                        unitPrice: 185,
                        currency: "USD",
                      })
                    }
                  >
                    Add
                  </button>
                </div>
              ) : null}
              <ul className="ledger">
                {quote.items.map((item) => {
                  const open = openLine === item.id;
                  const line = item.qty * item.unitPrice;
                  return (
                    <li key={item.id} className={open ? "open" : undefined}>
                      <button type="button" className="ledger-summary" onClick={() => setOpenLine(open ? null : item.id)} aria-expanded={open}>
                        <span className="cat">{item.category}</span>
                        <span className="ledger-name">{item.description || "Untitled line"}</span>
                        <span className="ledger-sub">
                          {item.day ? `Day ${item.day}` : "Whole trip"} · {item.qty} {item.unit}
                        </span>
                        <span className="ledger-amt">{money(line, item.currency)}</span>
                      </button>
                      {open ? (
                        <div className="ledger-edit">
                          <label className="wide">
                            <span className="lbl">Description</span>
                            <input className="field" value={item.description} onChange={(event) => desk.patchItem(quote.id, item.id, { description: event.target.value })} />
                          </label>
                          <label>
                            <span className="lbl">Day</span>
                            <select className="field" value={item.day ?? ""} onChange={(event) => desk.patchItem(quote.id, item.id, { day: event.target.value ? Number(event.target.value) : null })}>
                              <option value="">Whole trip</option>
                              {quote.days.map((day) => (
                                <option key={day.id} value={day.day}>
                                  Day {day.day}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className="lbl">Category</span>
                            <select className="field" value={item.category} onChange={(event) => desk.patchItem(quote.id, item.id, { category: event.target.value as Category })}>
                              {categories.map((category) => (
                                <option key={category}>{category}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className="lbl">Qty</span>
                            <input className="field" type="number" min={0} value={item.qty} onChange={(event) => desk.patchItem(quote.id, item.id, { qty: num(event.target.value) })} />
                          </label>
                          <label>
                            <span className="lbl">Unit</span>
                            <select className="field" value={item.unit} onChange={(event) => desk.patchItem(quote.id, item.id, { unit: event.target.value as Unit })}>
                              {units.map((unit) => (
                                <option key={unit}>{unit}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className="lbl">Price</span>
                            <input className="field" type="number" min={0} step="0.01" value={item.unitPrice} onChange={(event) => desk.patchItem(quote.id, item.id, { unitPrice: num(event.target.value) })} />
                          </label>
                          <label>
                            <span className="lbl">Currency</span>
                            <select className="field" value={item.currency} onChange={(event) => desk.patchItem(quote.id, item.id, { currency: event.target.value as Currency })}>
                              {CURRENCIES.map((currency) => (
                                <option key={currency}>{currency}</option>
                              ))}
                            </select>
                          </label>
                          {!locked ? (
                            <button type="button" className="btn small" onClick={() => desk.removeItem(quote.id, item.id)}>
                              Remove line
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {!locked ? (
                <button type="button" className="add-day" onClick={() => desk.addItem(quote.id, { qty: inquiry.travelers, unit: "person" })}>
                  + Add a cost line
                </button>
              ) : null}
            </section>
          </aside>
        </div>
      </fieldset>
    </div>
  );
}
