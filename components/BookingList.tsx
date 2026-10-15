"use client";

import { BotAvatar, type BotAvatarType } from "bot-avatars";
import Link from "next/link";
import { money } from "@/lib/format";
import { balanceOf, paidOf } from "@/lib/plan";
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

export function BookingList() {
  const desk = useDesk();
  return (
    <>
      <header className="file-head">
        <div>
          <p className="kicker">Bookings</p>
          <h1>Reserved trips</h1>
          <p className="lede">A booking opens when the client accepts the proposal. The Susu schedule and receipts live on Payments.</p>
        </div>
        <Link className="btn" href="/payments">
          Open payments
        </Link>
      </header>
      <div className="reserve-grid">
        {desk.bookings.map((booking) => {
          const inquiry = desk.inquiries.find((row) => row.id === booking.inquiryId);
          const paid = paidOf(booking);
          const width = booking.total ? Math.min(100, (paid / booking.total) * 100) : 0;
          const settled = balanceOf(booking) <= 0;
          return (
            <Link key={booking.id} href={`/bookings/${booking.id}`} className="reserve-card">
              <span className="reserve-bot">
                <BotAvatar
                  type={botFor(inquiry)}
                  state={settled ? "sleeping" : "default"}
                  size={96}
                  seed={seedOf(booking.inquiryId)}
                  interactive={false}
                />
              </span>
              <strong>{inquiry?.client ?? "Client"}</strong>
              <p>{inquiry?.destination}</p>
              <em>
                {inquiry?.dates}
                {inquiry ? ` · ${inquiry.travelers} travellers` : ""}
              </em>
              <span className="progress" aria-hidden>
                <span style={{ width: `${width}%` }} />
              </span>
              <em>
                {Math.round(width)}% collected · {booking.invoiceNo}
              </em>
              <b>{money(settled ? booking.total : balanceOf(booking), booking.currency)}</b>
              <span className="reserve-note">{settled ? "Collected in full" : `still to collect of ${money(booking.total, booking.currency)}`}</span>
              <span className="reserve-open">Open</span>
            </Link>
          );
        })}
      </div>
      {desk.bookings.length === 0 ? <p className="empty">No reserved trips yet. Accept a proposal to open a booking.</p> : null}
    </>
  );
}

function botFor(inquiry?: Inquiry): BotAvatarType {
  const family = bots[inquiry?.kind ?? ""] ?? ["clover"];
  return family[(seedOf(inquiry?.id ?? "booking") * family.length) | 0];
}

function seedOf(id: string) {
  let n = 0;
  for (const ch of id) n = (n * 33 + ch.charCodeAt(0)) % 1000;
  return n / 1000;
}
