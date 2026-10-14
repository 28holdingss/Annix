"use client";

import Link from "next/link";
import { useState } from "react";
import { Cover } from "@/components/covers";
import { channelTone, Pill } from "@/components/ui";
import { useDesk } from "@/lib/store";

const filters = ["All", "Needs a proposal", "With the client", "Booked"] as const;

export function InquiryList() {
  const desk = useDesk();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const rows = desk.inquiries.filter((inquiry) => {
    const quote = desk.quotes.find((item) => item.inquiryId === inquiry.id);
    if (filter === "Needs a proposal") return !quote || quote.status === "draft";
    if (filter === "With the client") return quote?.status === "sent";
    if (filter === "Booked") return inquiry.status === "booked";
    return true;
  });

  return (
    <>
      <p className="kicker">Inquiries</p>
      <div className="page-head">
        <div>
          <h1 className="display">Who is travelling</h1>
          <p className="lede">Every request, from the first WhatsApp to a reserved Susu plan.</p>
        </div>
      </div>
      <div className="filters">
        {filters.map((item) => (
          <button key={item} type="button" className="btn small" aria-pressed={filter === item} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="inquiry-cards">
        {rows.map((inquiry) => (
          <Link key={inquiry.id} href={`/inquiries/${inquiry.id}`} className="card inquiry-card">
            <Cover destination={inquiry.destination} label={inquiry.kind} />
            <div>
              <span className="who">{inquiry.organisation ?? inquiry.client}</span>
              <span className="meta" style={{ display: "block" }}>{inquiry.destination} · {inquiry.dates} · {inquiry.travelers} travellers</span>
            </div>
            <div className="toolbar">
              <Pill tone={channelTone(inquiry.channel)}>{inquiry.channel}</Pill>
              <Pill tone={inquiry.status}>{inquiry.status}</Pill>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
