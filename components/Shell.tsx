"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { needsRevision } from "@/lib/desk";
import { useDesk } from "@/lib/store";

const links: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "Dashboard", icon: <DashIcon /> },
  { href: "/inquiries", label: "Inquiries", icon: <PinIcon /> },
  { href: "/services", label: "Services", icon: <BagIcon /> },
  { href: "/quotes", label: "Itinerary", icon: <PathIcon /> },
  { href: "/bookings", label: "Bookings", icon: <CardIcon /> },
  { href: "/payments", label: "Payments", icon: <PayIcon /> },
  { href: "/messages", label: "Threads", icon: <ChatIcon /> },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const desk = useDesk();
  const attention =
    desk.followUps.filter((row) => row.status === "open").length +
    desk.inquiries.filter((inquiry) => needsRevision(desk, inquiry.id)).length;

  return (
    <div className="app">
      <aside className="rail">
        <Link href="/" className="brand">
          <span className="logo-mark" aria-hidden>
            A
          </span>
          <span>
            <strong>Annix</strong>
            <em>Skyland desk</em>
          </span>
        </Link>
        <p className="menu-label">Menu</p>
        <nav className="nav">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? path === "/"
                : link.href === "/services"
                  ? path.startsWith("/services") || path.startsWith("/tickets") || path.startsWith("/visas") || path.startsWith("/rentals")
                  : path.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
                <span className="ico">{link.icon}</span>
                {link.label}
                {link.label === "Threads" && attention > 0 ? <span className="badge">{attention}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="rail-foot">
          <div className="consultant">
            <span className="avatar">AO</span>
            <span>
              <strong>Abena Owusu</strong>
              Madina · sample rates
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Restore the sample desk? Edits on this browser will be cleared.")) desk.reset();
            }}
          >
            Restore sample
          </button>
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}

function DashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}
function PathIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 18c2-6 5-8 8-8h6" />
      <path d="M15 7l4 3-4 3" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}
function PayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 7h14v10H5z" />
      <path d="M5 11h14" />
      <path d="M8 15h3" />
    </svg>
  );
}
function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M8 8V7a4 4 0 0 1 8 0v1" />
      <path d="M5 8h14l-1 12H6L5 8z" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M6 17.5 4 20V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6z" />
    </svg>
  );
}
