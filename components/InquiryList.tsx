"use client";

import { BotAvatar, type BotAvatarType } from "bot-avatars";
import Link from "next/link";
import { useState } from "react";
import { channelTone, Pill } from "@/components/ui";
import { useDesk } from "@/lib/store";
import type { Inquiry } from "@/lib/types";

const bots: Record<string, BotAvatarType[]> = {
  "Group tour": ["clover", "flower", "cloud"],
  Bespoke: ["blob", "pebble", "drop"],
  Heritage: ["cat", "star"],
  Corporate: ["hexagon", "droid", "square"],
  Ticketing: ["star", "circle"],
  Visa: ["drop", "pill"],
  "Car rental": ["mech", "droid"],
};

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
            <span className="inquiry-bot">
              <BotAvatar type={botFor(inquiry)} state={botState(inquiry)} size={48} seed={seedOf(inquiry.id)} interactive={false} />
            </span>
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

function botFor(inquiry: Inquiry): BotAvatarType {
  const family = bots[inquiry.kind] ?? ["clover"];
  return family[seedOf(inquiry.id) * family.length | 0];
}

function botState(inquiry: Inquiry) {
  if (inquiry.status === "booked") return "sleeping" as const;
  if (inquiry.status === "quoting" || inquiry.status === "qualifying") return "working" as const;
  return "default" as const;
}

function seedOf(id: string) {
  let n = 0;
  for (const ch of id) n = (n * 33 + ch.charCodeAt(0)) % 1000;
  return n / 1000;
}
