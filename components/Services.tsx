"use client";

import Link from "next/link";
import { useState } from "react";
import { Pill } from "@/components/ui";
import type { FlightOffer } from "@/lib/duffel";
import { accraDay, money, todayKey } from "@/lib/format";
import { useDesk } from "@/lib/store";
import type { DocState, Rental, Ticket, VisaCase } from "@/lib/types";

const docLabel: Record<DocState, string> = { missing: "Missing", in: "Received", checked: "Checked" };

const serviceTabs = [
  { id: "ticket", href: "/tickets", label: "Flight tickets", icon: <PlaneIcon /> },
  { id: "visa", href: "/visas", label: "Visas", icon: <VisaIcon /> },
  { id: "rental", href: "/rentals", label: "Cars", icon: <CarIcon /> },
] as const;

function ServiceMenu({ current }: { current: "ticket" | "visa" | "rental" }) {
  return (
    <nav className="service-menu" aria-label="Services">
      {serviceTabs.map((tab) => (
        <Link key={tab.id} href={tab.href} className={tab.id === current ? "active" : undefined} aria-current={tab.id === current ? "page" : undefined}>
          {tab.icon}
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

function VisaIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="6" y="3.5" width="12" height="17" rx="2" />
      <path d="M9 8.5h6M9 12h6M9 15.5h4" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 16h16v2.5a1 1 0 0 1-1 1h-1.2M4 16l1.8-5.2A2 2 0 0 1 7.7 9.5h8.6a2 2 0 0 1 1.9 1.3L20 16" />
      <path d="M6.2 19.5H5a1 1 0 0 1-1-1V16" />
      <circle cx="7.5" cy="16.5" r="1.3" />
      <circle cx="16.5" cy="16.5" r="1.3" />
    </svg>
  );
}

const places: Record<string, string> = {
  ACC: "Accra",
  LHR: "London",
};

export function TicketList() {
  const desk = useDesk();
  const sample = desk.tickets[0];
  const sampleStops = stopsOf(sample);
  const [trip, setTrip] = useState<"return" | "oneway">("return");
  const [from, setFrom] = useState(sampleStops[0] ?? "");
  const [to, setTo] = useState(sampleStops[1] ?? "");
  const [on, setOn] = useState(sample?.depart ?? "");
  const [end, setEnd] = useState(sample?.returns ?? "");
  const [party, setParty] = useState(sample ? String(sample.passengers.length) : "any");
  const [cabin, setCabin] = useState(sample?.cabin ?? "any");
  const [query, setQuery] = useState<FareQuery | null>(null);
  const [picked, setPicked] = useState(sample?.id ?? "");
  const [offers, setOffers] = useState<FlightOffer[] | null>(null);
  const [pickedOffer, setPickedOffer] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${todayKey()}T00:00:00Z`));
  const shown = desk.tickets.filter((ticket) => !query || matchesFare(ticket, query));
  const active = shown.find((ticket) => ticket.id === picked) ?? shown[0];
  const offer = offers?.find((row) => row.id === pickedOffer) ?? offers?.[0];

  return (
    <>
      <section className="flight-hero">
        <div className="hero-copy">
          <p className="kicker">{today}</p>
          <h1>Flight tickets</h1>
          <p className="lede">Search asks Duffel. Holds and issued tickets on this desk stay with the airline.</p>
        </div>
        <div className="plane-stage" role="img" aria-label="Aircraft" />
        <form
          className="fare-search"
          onSubmit={async (event) => {
            event.preventDefault();
            const next = { trip, from, to, on, end, party, cabin };
            setQuery(next);
            setSearching(true);
            setSearchNote(null);
            try {
              const response = await fetch("/api/flights/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  trip,
                  from,
                  to,
                  on,
                  end: trip === "return" ? end : undefined,
                  adults: party === "any" ? 1 : Number(party),
                  cabin: cabinCode(cabin),
                }),
              });
              const data = (await response.json()) as {
                configured?: boolean;
                offers?: FlightOffer[];
                from?: string;
                to?: string;
                message?: string;
                error?: string;
              };
              if (!response.ok) throw new Error(data.error || "Duffel could not search that route.");
              if (data.from) setFrom(data.from);
              if (data.to) setTo(data.to);
              if (!data.configured) {
                setOffers(null);
                setSearchNote(data.message ?? "Duffel is not connected.");
                return;
              }
              setOffers(data.offers ?? []);
              setPickedOffer(data.offers?.[0]?.id ?? "");
            } catch (error) {
              setOffers(null);
              setSearchNote(error instanceof Error ? error.message : "Duffel could not search that route.");
            } finally {
              setSearching(false);
            }
          }}
        >
          <div className="trip-kind" role="group" aria-label="Journey">
            <button type="button" aria-pressed={trip === "return"} onClick={() => setTrip("return")}>
              Round trip
            </button>
            <button type="button" aria-pressed={trip === "oneway"} onClick={() => setTrip("oneway")}>
              One way
            </button>
          </div>
          <label>
            From
            <input className="field" value={from} onChange={(event) => setFrom(event.target.value)} placeholder="Accra or ACC" />
          </label>
          <label>
            To
            <input className="field" value={to} onChange={(event) => setTo(event.target.value)} placeholder="Kigali or KGL" />
          </label>
          <label>
            On
            <input className="field" type="date" value={on} onChange={(event) => setOn(event.target.value)} />
          </label>
          <label>
            End
            <input className="field" type="date" value={end} onChange={(event) => setEnd(event.target.value)} disabled={trip === "oneway"} />
          </label>
          <label>
            Party
            <select className="field" value={party} onChange={(event) => setParty(event.target.value)}>
              <option value="any">Any</option>
              <option value="1">1 adult</option>
              <option value="2">2 adults</option>
              <option value="3">3 adults</option>
              <option value="4">4 adults</option>
            </select>
          </label>
          <label>
            Cabin
            <select className="field" value={cabin} onChange={(event) => setCabin(event.target.value)}>
              <option value="any">Any</option>
              <option value="Economy">Economy</option>
              <option value="Premium economy">Premium economy</option>
              <option value="Business">Business</option>
            </select>
          </label>
          <button className="btn ink" type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
      </section>
      <ServiceMenu current="ticket" />
      <div className="flight-board">
        <section className="stack">
          {searchNote ? <p className="lede">{searchNote}</p> : null}
          {offers && !searchNote ? (
            <>
              {offers.length === 0 ? <p className="lede">No fare came back for that search.</p> : null}
              {offers.map((row) => (
                <OfferRow key={row.id} offer={row} selected={row.id === offer?.id} onPick={() => setPickedOffer(row.id)} />
              ))}
            </>
          ) : null}
          {shown.length === 0 && !offers ? <p className="lede">No fare on the desk matches that search.</p> : null}
          {offers && shown.length > 0 ? <p className="kicker">On this desk</p> : null}
          {shown.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              client={desk.inquiries.find((row) => row.id === ticket.inquiryId)?.client ?? ""}
              selected={!offers && ticket.id === active?.id}
              onPick={() => setPicked(ticket.id)}
            />
          ))}
        </section>
        {offers ? <OfferPreview offer={offer} /> : <ItineraryPreview ticket={active} client={active ? desk.inquiries.find((row) => row.id === active.inquiryId) : undefined} />}
      </div>
    </>
  );
}

function cabinCode(cabin: string) {
  if (cabin === "Economy") return "economy";
  if (cabin === "Premium economy") return "premium_economy";
  if (cabin === "Business") return "business";
  return undefined;
}

function fareMoney(amount: string, currency: string) {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat("en-GH", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${amount}`;
  }
}

function OfferRow({ offer, selected, onPick }: { offer: FlightOffer; selected: boolean; onPick: () => void }) {
  const stops = offer.stops === 0 ? "Direct" : offer.stops === 1 ? "1 stop" : `${offer.stops} stops`;
  return (
    <button type="button" className={selected ? "fare-result on" : "fare-result"} onClick={onPick}>
      <span className="fare-top">
        <strong>{offer.airline}</strong>
        <b>{fareMoney(offer.total, offer.currency)}</b>
      </span>
      <span className="fare-route">
        <span>
          <strong>{clock(offer.depart)}</strong>
          <em>{offer.origin}</em>
          <em>{offer.originCity}</em>
        </span>
        <span className="fare-path">
          <em>{stops}</em>
          <i />
          <em>{offer.flight}</em>
        </span>
        <span>
          <strong>{clock(offer.arrive)}</strong>
          <em>{offer.destination}</em>
          <em>{offer.destinationCity}</em>
        </span>
      </span>
      <span className="fare-meta">
        {softDay(offer.depart.slice(0, 10))} · {niceCabin(offer.cabin)}
        {offer.marketedBy ? ` · Sold by ${offer.marketedBy}` : ""} · {offer.passengers} {offer.passengers === 1 ? "adult" : "adults"}
      </span>
    </button>
  );
}

function OfferPreview({ offer }: { offer?: FlightOffer }) {
  if (!offer) {
    return (
      <aside className="itin-preview">
        <header>
          <h2>Itinerary</h2>
        </header>
        <p className="lede">Choose a fare to see the journey.</p>
      </aside>
    );
  }
  return (
    <aside className="itin-preview">
      <header>
        <h2>Itinerary</h2>
        <b>{fareMoney(offer.total, offer.currency)}</b>
      </header>
      <ol>
        <li>
          <strong>
            {softDay(offer.depart.slice(0, 10))} · {clock(offer.depart)} · {offer.originCity}
          </strong>
          <em>
            {offer.airline}
            {offer.flight ? ` · ${offer.flight}` : ""} · {niceCabin(offer.cabin)}
          </em>
        </li>
        <li>
          <strong>
            {clock(offer.arrive)} · {offer.destinationCity}
          </strong>
          <em>
            {offer.origin}–{offer.destination} · {offer.passengers} {offer.passengers === 1 ? "adult" : "adults"}
          </em>
        </li>
        {offer.returns ? (
          <li>
            <strong>
              {softDay(offer.returns.slice(0, 10))} · Return {clock(offer.returns)}
            </strong>
            <em>
              {offer.destination}–{offer.origin}
            </em>
          </li>
        ) : null}
      </ol>
    </aside>
  );
}

function niceCabin(cabin: string) {
  const words = cabin.toLowerCase().replace(/_/g, " ");
  return words.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function softDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

function clock(iso: string) {
  return iso.split("T")[1]?.slice(0, 5) ?? shortDay(iso);
}

type FareQuery = {
  trip: "return" | "oneway";
  from: string;
  to: string;
  on: string;
  end: string;
  party: string;
  cabin: string;
};

function matchesFare(ticket: Ticket, query: FareQuery) {
  const [origin, dest] = stopsOf(ticket);
  if (query.trip === "return" && !ticket.returns) return false;
  if (query.trip === "oneway" && ticket.returns) return false;
  if (query.from && !includesPlace(origin, query.from)) return false;
  if (query.to && !includesPlace(dest, query.to)) return false;
  if (query.on && ticket.depart !== query.on) return false;
  if (query.trip === "return" && query.end && ticket.returns !== query.end) return false;
  if (query.cabin !== "any" && ticket.cabin !== query.cabin) return false;
  if (query.party !== "any" && ticket.passengers.length !== Number(query.party)) return false;
  return true;
}

function TicketRow({ ticket, client, selected, onPick }: { ticket: Ticket; client: string; selected: boolean; onPick: () => void }) {
  const [from, to] = stopsOf(ticket);
  const back = Boolean(ticket.returns);
  return (
    <article className={selected ? "flight-card on" : "flight-card"}>
      <p className="flight-date">{banner(ticket.depart)}</p>
      <div className="flight-leg">
        <button type="button" className="leg-main" onClick={onPick}>
          <span className="flight-mark" aria-hidden>
            {initials(ticket.airline)}
          </span>
          <span className="leg-end">
            <strong>{shortDay(ticket.depart)}</strong>
            <em>
              {from} · {placeName(from)}
            </em>
          </span>
          <span className="leg-mid">
            <em>{back ? nights(ticket.depart, ticket.returns) : "One way"}</em>
            <i />
            <em>{ticket.airline}</em>
          </span>
          <span className="leg-end">
            <strong>{back && ticket.returns ? shortDay(ticket.returns) : "—"}</strong>
            <em>
              {to || "—"} · {placeName(to)}
            </em>
          </span>
        </button>
        <span className="leg-price">
          <strong>{money(ticket.fare, ticket.currency)}</strong>
          <Pill tone={ticket.status}>{ticket.status}</Pill>
          <Link href={`/tickets/${ticket.id}`} className="btn ink small">
            Open
          </Link>
        </span>
      </div>
      <p className="leg-note">
        {ticket.cabin}
        {client ? ` · ${client}` : ""} · {ticket.passengers.length} {ticket.passengers.length === 1 ? "passenger" : "passengers"}
      </p>
    </article>
  );
}

function ItineraryPreview({ ticket, client }: { ticket?: Ticket; client?: { id: string; client: string; destination: string } }) {
  if (!ticket) {
    return (
      <aside className="itin-preview">
        <header>
          <h2>Live itinerary</h2>
        </header>
        <p className="lede">Choose a fare to see the journey.</p>
      </aside>
    );
  }
  const [from, to] = stopsOf(ticket);
  const names = ticket.passengers.join(" · ");
  return (
    <aside className="itin-preview">
      <header>
        <h2>Live itinerary</h2>
        {client ? <Link href={`/inquiries/${client.id}`}>{client.client}</Link> : null}
      </header>
      <ol>
        <li>
          <strong>
            {banner(ticket.depart)} · Leave {placeName(from)} ({from})
          </strong>
          <em>
            {ticket.airline} · {ticket.cabin}
          </em>
        </li>
        <li>
          <strong>
            In {placeName(to)} ({to || "—"})
          </strong>
          <em>
            {names}
            {ticket.returns ? ` · until ${shortDay(ticket.returns)}` : ""}
          </em>
        </li>
        {ticket.returns ? (
          <li>
            <strong>
              {banner(ticket.returns)} · Return to {placeName(from)} ({from})
            </strong>
            <em>
              {to}–{from} · {ticket.cabin}
            </em>
          </li>
        ) : null}
      </ol>
    </aside>
  );
}

function stopsOf(ticket?: Ticket) {
  if (!ticket) return [];
  return ticket.route.split(/[–—-]/).map((part) => part.trim()).filter(Boolean);
}

function placeName(code: string) {
  return places[code] ?? code;
}

function includesPlace(code: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return code.toLowerCase().includes(needle) || placeName(code).toLowerCase().includes(needle);
}

function nights(start: string, end?: string) {
  if (!end) return "One way";
  const span = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
  if (span <= 0) return "Return";
  return span === 1 ? "1 night" : `${span} nights`;
}

function banner(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`))
    .toUpperCase();
}

function shortDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function TicketFile({ id }: { id: string }) {
  const desk = useDesk();
  const ticket = desk.tickets.find((row) => row.id === id);
  const [pnr, setPnr] = useState(ticket?.pnr ?? "");
  if (!ticket) return <p>This ticket is not on the desk.</p>;
  const inquiry = desk.inquiries.find((row) => row.id === ticket.inquiryId);
  return (
    <div className="file">
      <header className="file-head">
        <div>
          <p className="kicker">{ticket.ref} · Ticketing</p>
          <h1>{ticket.route}</h1>
          <p className="lede">{ticket.note}</p>
        </div>
        <Pill tone={ticket.status}>{ticket.status}</Pill>
      </header>
      <div className="file-facts">
        <article>
          <p>Airline</p>
          <strong>{ticket.airline}</strong>
        </article>
        <article>
          <p>Cabin</p>
          <strong>{ticket.cabin}</strong>
        </article>
        <article>
          <p>Out</p>
          <strong>{accraDay(ticket.depart)}</strong>
        </article>
        <article>
          <p>Back</p>
          <strong>{ticket.returns ? accraDay(ticket.returns) : "One way"}</strong>
        </article>
      </div>
      <div className="file-grid">
        <section className="card stack">
          <h2>Passengers</h2>
          <ul className="doc-list">
            {ticket.passengers.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p className="trip-total">
            <strong>{money(ticket.fare, ticket.currency)}</strong>
            <span>Quoted fare for the party</span>
          </p>
        </section>
        <aside className="card stack">
          <h2>Reservation</h2>
          <label className="pnr">
            PNR
            <input className="field" value={pnr} onChange={(event) => setPnr(event.target.value.toUpperCase())} placeholder="Not held yet" />
          </label>
          <div className="handoff">
            <button className="btn" type="button" onClick={() => desk.setTicket(ticket.id, { status: "held", pnr })}>
              Hold the fare
            </button>
            <button className="btn primary" type="button" onClick={() => desk.setTicket(ticket.id, { status: "ticketed", pnr })}>
              Mark ticketed
            </button>
          </div>
          {inquiry ? (
            <Link href={`/inquiries/${inquiry.id}`}>Client file · {inquiry.client}</Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

const visaStages: { id: VisaCase["status"]; label: string }[] = [
  { id: "checklist", label: "Checklist" },
  { id: "documents", label: "Papers" },
  { id: "submitted", label: "Submitted" },
  { id: "issued", label: "Issued" },
];

export function VisaList() {
  const desk = useDesk();
  const sample = desk.visas[0];
  const [stage, setStage] = useState<VisaCase["status"]>(sample?.status ?? "documents");
  const [destination, setDestination] = useState(sample?.destination ?? "");
  const [kind, setKind] = useState(sample?.visaType ?? "");
  const [travel, setTravel] = useState(sample?.travelDate ?? "");
  const [applicant, setApplicant] = useState(sample?.applicants[0] ?? "");
  const [query, setQuery] = useState<VisaQuery | null>(null);
  const [picked, setPicked] = useState(sample?.id ?? "");
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${todayKey()}T00:00:00Z`));
  const shown = desk.visas.filter((visa) => !query || matchesVisa(visa, query));
  const active = shown.find((visa) => visa.id === picked) ?? shown[0];

  return (
    <>
      <section className="flight-hero visa-hero">
        <div className="hero-copy">
          <p className="kicker">{today}</p>
          <h1>Visas</h1>
          <p className="lede">Annix checks the papers and tracks the application. The embassy issues the visa.</p>
        </div>
        <div className="plane-stage" role="img" aria-label="Passport" />
        <form
          className="fare-search visa-search"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery({ stage, destination, kind, travel, applicant });
          }}
        >
          <div className="trip-kind" role="group" aria-label="Application">
            {visaStages.map((item) => (
              <button key={item.id} type="button" aria-pressed={stage === item.id} onClick={() => setStage(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="search-fields">
            <label>
              Destination
              <input className="field" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Dubai" />
            </label>
            <label>
              Visa
              <input className="field" value={kind} onChange={(event) => setKind(event.target.value)} placeholder="Visit visa" />
            </label>
            <label>
              Travel
              <input className="field" type="date" value={travel} onChange={(event) => setTravel(event.target.value)} />
            </label>
            <label>
              Applicant
              <input className="field" value={applicant} onChange={(event) => setApplicant(event.target.value)} placeholder="Name" />
            </label>
            <button className="btn ink" type="submit">
              Search
            </button>
          </div>
        </form>
      </section>
      <ServiceMenu current="visa" />
      <div className="flight-board">
        <section className="stack">
          {shown.length === 0 ? <p className="lede">No visa file on the desk matches that search.</p> : null}
          {shown.map((visa) => (
            <VisaRow
              key={visa.id}
              visa={visa}
              client={desk.inquiries.find((row) => row.id === visa.inquiryId)?.client ?? ""}
              selected={visa.id === active?.id}
              onPick={() => setPicked(visa.id)}
            />
          ))}
        </section>
        <VisaPreview visa={active} client={active ? desk.inquiries.find((row) => row.id === active.inquiryId) : undefined} />
      </div>
    </>
  );
}

type VisaQuery = {
  stage: VisaCase["status"];
  destination: string;
  kind: string;
  travel: string;
  applicant: string;
};

function matchesVisa(visa: VisaCase, query: VisaQuery) {
  if (visa.status !== query.stage) return false;
  if (query.destination && !visa.destination.toLowerCase().includes(query.destination.trim().toLowerCase())) return false;
  if (query.kind && !visa.visaType.toLowerCase().includes(query.kind.trim().toLowerCase())) return false;
  if (query.travel && visa.travelDate !== query.travel) return false;
  if (query.applicant && !visa.applicants.some((name) => name.toLowerCase().includes(query.applicant.trim().toLowerCase()))) return false;
  return true;
}

function VisaRow({ visa, client, selected, onPick }: { visa: VisaCase; client: string; selected: boolean; onPick: () => void }) {
  const ready = visa.documents.filter((doc) => doc.state === "checked").length;
  const stage = visaStages.find((item) => item.id === visa.status)?.label ?? visa.status;
  return (
    <article className={selected ? "flight-card on" : "flight-card"}>
      <p className="flight-date">{banner(visa.travelDate)}</p>
      <div className="flight-leg">
        <button type="button" className="leg-main" onClick={onPick}>
          <span className="flight-mark" aria-hidden>
            {initials(visa.destination)}
          </span>
          <span className="leg-end">
            <strong>{shortDay(visa.travelDate)}</strong>
            <em>{visa.destination}</em>
          </span>
          <span className="leg-mid">
            <em>
              {ready} of {visa.documents.length} checked
            </em>
            <i />
            <em>{stage}</em>
          </span>
          <span className="leg-end">
            <strong>{visa.applicants.length === 1 ? "1 applicant" : `${visa.applicants.length} applicants`}</strong>
            <em>{client || visa.applicants[0]}</em>
          </span>
        </button>
        <span className="leg-price">
          <strong>{money(visa.fee, visa.currency)}</strong>
          <Pill tone={visa.status}>{visa.status}</Pill>
          <Link href={`/visas/${visa.id}`} className="btn ink small">
            Open
          </Link>
        </span>
      </div>
      <p className="leg-note">{visa.visaType}</p>
    </article>
  );
}

function VisaPreview({ visa, client }: { visa?: VisaCase; client?: { id: string; client: string } }) {
  if (!visa) {
    return (
      <aside className="itin-preview">
        <header>
          <h2>Live itinerary</h2>
        </header>
        <p className="lede">Choose a visa file to see the papers.</p>
      </aside>
    );
  }
  const missing = visa.documents.filter((doc) => doc.state !== "checked");
  return (
    <aside className="itin-preview">
      <header>
        <h2>Live itinerary</h2>
        {client ? <Link href={`/inquiries/${client.id}`}>{client.client}</Link> : null}
      </header>
      <ol>
        <li>
          <strong>
            {banner(visa.travelDate)} · {visa.destination}
          </strong>
          <em>{visa.visaType}</em>
        </li>
        {visa.documents.map((doc) => (
          <li key={doc.id}>
            <strong>{doc.label}</strong>
            <em>{docLabel[doc.state]}</em>
          </li>
        ))}
        <li>
          <strong>{missing.length === 0 ? "Ready to submit" : "Still open"}</strong>
          <em>{missing.length === 0 ? "Every paper is checked." : missing.map((doc) => doc.label).join(" · ")}</em>
        </li>
      </ol>
    </aside>
  );
}

export function VisaFile({ id }: { id: string }) {
  const desk = useDesk();
  const visa = desk.visas.find((row) => row.id === id);
  if (!visa) return <p>This visa file is not on the desk.</p>;
  const inquiry = desk.inquiries.find((row) => row.id === visa.inquiryId);
  const ready = visa.documents.every((doc) => doc.state === "checked");
  return (
    <div className="file">
      <header className="file-head">
        <div>
          <p className="kicker">{visa.ref} · Visa assistance</p>
          <h1>{visa.visaType}</h1>
          <p className="lede">Click a document to move it from missing, to received, to checked. Annix does not issue the visa.</p>
        </div>
        <Pill tone={visa.status}>{visa.status}</Pill>
      </header>
      <div className="file-facts">
        <article>
          <p>Destination</p>
          <strong>{visa.destination}</strong>
        </article>
        <article>
          <p>Travel</p>
          <strong>{accraDay(visa.travelDate)}</strong>
        </article>
        <article>
          <p>Applicants</p>
          <strong>{visa.applicants.join(", ")}</strong>
        </article>
        <article>
          <p>Service fee</p>
          <strong>{money(visa.fee, visa.currency)}</strong>
        </article>
      </div>
      <div className="file-grid">
        <section className="card stack">
          <h2>Checklist</h2>
          <ul className="doc-list">
            {visa.documents.map((doc) => (
              <li key={doc.id}>
                <button type="button" className={`doc-row ${doc.state}`} onClick={() => desk.cycleDocument(visa.id, doc.id)} disabled={visa.status === "issued"}>
                  <strong>{doc.label}</strong>
                  <em>{docLabel[doc.state]}</em>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <aside className="card stack">
          <h2>Application</h2>
          <p>{ready ? "Every document is checked. The file can go in." : "Still waiting on papers before this can be submitted."}</p>
          <div className="handoff">
            <button className="btn" type="button" disabled={!ready || visa.status === "issued"} onClick={() => desk.setVisaStatus(visa.id, "submitted")}>
              Mark submitted
            </button>
            <button className="btn primary" type="button" disabled={visa.status !== "submitted"} onClick={() => desk.setVisaStatus(visa.id, "issued")}>
              Mark issued
            </button>
          </div>
          {inquiry ? <Link href={`/inquiries/${inquiry.id}`}>Client file · {inquiry.client}</Link> : null}
        </aside>
      </div>
    </div>
  );
}

const hireModes: { id: Rental["mode"]; label: string }[] = [
  { id: "chauffeur", label: "Chauffeur" },
  { id: "self-drive", label: "Self-drive" },
  { id: "airport", label: "Airport" },
];

export function RentalList() {
  const desk = useDesk();
  const sample = desk.rentals[0];
  const [mode, setMode] = useState<Rental["mode"]>(sample?.mode ?? "chauffeur");
  const [pickup, setPickup] = useState(sample?.pickup ?? "");
  const [dropoff, setDropoff] = useState(sample?.dropoff ?? "");
  const [from, setFrom] = useState(sample?.start ?? "");
  const [until, setUntil] = useState(sample?.end ?? "");
  const [query, setQuery] = useState<HireQuery | null>(null);
  const [picked, setPicked] = useState(sample?.id ?? "");
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${todayKey()}T00:00:00Z`));
  const shown = desk.rentals.filter((rental) => !query || matchesHire(rental, query));
  const active = shown.find((rental) => rental.id === picked) ?? shown[0];

  return (
    <>
      <section className="flight-hero car-hero">
        <div className="hero-copy">
          <p className="kicker">{today}</p>
          <h1>Cars</h1>
          <p className="lede">Airport pickups, a driver, or a self-drive car anywhere in Ghana.</p>
        </div>
        <div className="plane-stage" role="img" aria-label="Hire car" />
        <form
          className="fare-search car-search"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery({ mode, pickup, dropoff, from, until });
          }}
        >
          <div className="trip-kind" role="group" aria-label="Hire">
            {hireModes.map((item) => (
              <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="search-fields">
            <label>
              Pickup
              <input className="field" value={pickup} onChange={(event) => setPickup(event.target.value)} placeholder="Kotoka" />
            </label>
            <label>
              Drop-off
              <input className="field" value={dropoff} onChange={(event) => setDropoff(event.target.value)} placeholder="Kotoka" />
            </label>
            <label>
              From
              <input className="field" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label>
              Until
              <input className="field" type="date" value={until} onChange={(event) => setUntil(event.target.value)} />
            </label>
            <button className="btn ink" type="submit">
              Search
            </button>
          </div>
        </form>
      </section>
      <ServiceMenu current="rental" />
      <div className="flight-board">
        <section className="stack">
          {shown.length === 0 ? <p className="lede">No hire on the desk matches that search.</p> : null}
          {shown.map((rental) => (
            <RentalRow
              key={rental.id}
              rental={rental}
              client={desk.inquiries.find((row) => row.id === rental.inquiryId)?.client ?? ""}
              selected={rental.id === active?.id}
              onPick={() => setPicked(rental.id)}
            />
          ))}
        </section>
        <HirePreview rental={active} client={active ? desk.inquiries.find((row) => row.id === active.inquiryId) : undefined} />
      </div>
    </>
  );
}

type HireQuery = {
  mode: Rental["mode"];
  pickup: string;
  dropoff: string;
  from: string;
  until: string;
};

function matchesHire(rental: Rental, query: HireQuery) {
  if (rental.mode !== query.mode) return false;
  if (query.pickup && !rental.pickup.toLowerCase().includes(query.pickup.trim().toLowerCase())) return false;
  if (query.dropoff && !rental.dropoff.toLowerCase().includes(query.dropoff.trim().toLowerCase())) return false;
  if (query.from && rental.start !== query.from) return false;
  if (query.until && rental.end !== query.until) return false;
  return true;
}

function RentalRow({ rental, client, selected, onPick }: { rental: Rental; client: string; selected: boolean; onPick: () => void }) {
  const mode = hireModes.find((item) => item.id === rental.mode)?.label ?? rental.mode;
  return (
    <article className={selected ? "flight-card on" : "flight-card"}>
      <p className="flight-date">{banner(rental.start)}</p>
      <div className="flight-leg">
        <button type="button" className="leg-main" onClick={onPick}>
          <span className="flight-mark" aria-hidden>
            {initials(rental.vehicle)}
          </span>
          <span className="leg-end">
            <strong>{shortDay(rental.start)}</strong>
            <em>{rental.pickup}</em>
          </span>
          <span className="leg-mid">
            <em>{nights(rental.start, rental.end)}</em>
            <i />
            <em>{mode}</em>
          </span>
          <span className="leg-end">
            <strong>{shortDay(rental.end)}</strong>
            <em>{rental.dropoff}</em>
          </span>
        </button>
        <span className="leg-price">
          <strong>{money(rental.rate, rental.currency)}</strong>
          <Pill tone={rental.status}>{rental.status}</Pill>
          <Link href={`/rentals/${rental.id}`} className="btn ink small">
            Open
          </Link>
        </span>
      </div>
      <p className="leg-note">
        {rental.vehicle}
        {client ? ` · ${client}` : ""}
      </p>
    </article>
  );
}

function HirePreview({ rental, client }: { rental?: Rental; client?: { id: string; client: string } }) {
  if (!rental) {
    return (
      <aside className="itin-preview">
        <header>
          <h2>Live itinerary</h2>
        </header>
        <p className="lede">Choose a hire to see the journey.</p>
      </aside>
    );
  }
  const mode = hireModes.find((item) => item.id === rental.mode)?.label ?? rental.mode;
  return (
    <aside className="itin-preview">
      <header>
        <h2>Live itinerary</h2>
        {client ? <Link href={`/inquiries/${client.id}`}>{client.client}</Link> : null}
      </header>
      <ol>
        <li>
          <strong>
            {banner(rental.start)} · Pickup at {rental.pickup}
          </strong>
          <em>
            {rental.vehicle} · {mode}
          </em>
        </li>
        <li>
          <strong>On the road</strong>
          <em>{rental.note}</em>
        </li>
        <li>
          <strong>
            {banner(rental.end)} · Drop-off at {rental.dropoff}
          </strong>
          <em>{client ? client.client : "The party"}</em>
        </li>
      </ol>
    </aside>
  );
}

export function RentalFile({ id }: { id: string }) {
  const desk = useDesk();
  const rental = desk.rentals.find((row) => row.id === id);
  if (!rental) return <p>This rental is not on the desk.</p>;
  const inquiry = desk.inquiries.find((row) => row.id === rental.inquiryId);
  return (
    <div className="file">
      <header className="file-head">
        <div>
          <p className="kicker">{rental.ref} · {rental.mode}</p>
          <h1>{rental.vehicle}</h1>
          <p className="lede">{rental.note}</p>
        </div>
        <Pill tone={rental.status}>{rental.status}</Pill>
      </header>
      <div className="file-facts">
        <article>
          <p>Pickup</p>
          <strong>{rental.pickup}</strong>
        </article>
        <article>
          <p>Drop-off</p>
          <strong>{rental.dropoff}</strong>
        </article>
        <article>
          <p>From</p>
          <strong>{accraDay(rental.start)}</strong>
        </article>
        <article>
          <p>Until</p>
          <strong>{accraDay(rental.end)}</strong>
        </article>
      </div>
      <section className="card stack">
        <p className="trip-total">
          <strong>{money(rental.rate, rental.currency)}</strong>
          <span>Rate for the hire</span>
        </p>
        <div className="handoff">
          <button className="btn" type="button" onClick={() => desk.setRentalStatus(rental.id, "confirmed")}>
            Confirm
          </button>
          <button className="btn" type="button" onClick={() => desk.setRentalStatus(rental.id, "out")}>
            Out with the client
          </button>
          <button className="btn primary" type="button" onClick={() => desk.setRentalStatus(rental.id, "returned")}>
            Returned
          </button>
        </div>
        {inquiry ? <Link href={`/inquiries/${inquiry.id}`}>Client file · {inquiry.client}</Link> : null}
      </section>
    </div>
  );
}
