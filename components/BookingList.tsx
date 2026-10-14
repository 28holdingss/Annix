"use client";

import Link from "next/link";
import { money } from "@/lib/format";
import { balanceOf, paidOf } from "@/lib/plan";
import { useDesk } from "@/lib/store";

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
      <div className="pay-board">
        {desk.bookings.map((booking) => {
          const inquiry = desk.inquiries.find((row) => row.id === booking.inquiryId);
          const paid = paidOf(booking);
          const width = booking.total ? Math.min(100, (paid / booking.total) * 100) : 0;
          return (
            <Link key={booking.id} href={`/bookings/${booking.id}`} className="booking-row">
              <span>
                <strong>{inquiry?.client}</strong>
                <em>
                  {inquiry?.destination} · {inquiry?.dates}
                  {inquiry ? ` · ${inquiry.travelers} travellers` : ""}
                </em>
                <span className="book-bar">
                  <span className="progress" aria-hidden>
                    <span style={{ width: `${width}%` }} />
                  </span>
                  <em>
                    {Math.round(width)}% collected · {booking.invoiceNo}
                  </em>
                </span>
              </span>
              <b>
                {money(balanceOf(booking), booking.currency)}
                <em>still to collect of {money(booking.total, booking.currency)}</em>
              </b>
            </Link>
          );
        })}
        {desk.bookings.length === 0 ? <p className="empty">No reserved trips yet. Accept a proposal to open a booking.</p> : null}
      </div>
    </>
  );
}
