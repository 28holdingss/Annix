"use client";

import Link from "next/link";
import { Cover } from "@/components/covers";
import { money } from "@/lib/format";
import { balanceOf, paidOf } from "@/lib/plan";
import { useDesk } from "@/lib/store";

export function BookingList() {
  const desk = useDesk();
  return (
    <>
      <p className="kicker">Bookings</p>
      <div className="page-head">
        <h1 className="display">Susu plans</h1>
      </div>
      <div className="stack">
        {desk.bookings.map((booking) => {
          const inquiry = desk.inquiries.find((row) => row.id === booking.inquiryId);
          const paid = paidOf(booking);
          const width = booking.total ? Math.min(100, (paid / booking.total) * 100) : 0;
          return (
            <Link key={booking.id} href={`/bookings/${booking.id}`} className="card inquiry-card">
              <Cover destination={inquiry?.destination ?? "Trip"} label={booking.currency} />
              <div>
                <strong>{inquiry?.client}</strong>
                <p className="meta">{inquiry?.destination} · {booking.invoiceNo}</p>
                <div className="progress" style={{ marginTop: 8 }}><span style={{ width: `${width}%` }} /></div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="money-lg">{money(balanceOf(booking), booking.currency)}</div>
                <div className="meta">left of {money(booking.total, booking.currency)}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
