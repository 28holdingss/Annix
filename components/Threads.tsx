"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { latestMessage } from "@/lib/desk";
import { accra, mailLink, waLink } from "@/lib/format";
import { useDesk } from "@/lib/store";

const hues = ["#ff8a3d", "#3d7dff", "#1aae70", "#7a5af8", "#e25b8a", "#0e8f8a"];

export function Threads() {
  const desk = useDesk();
  const router = useRouter();
  const params = useSearchParams();
  const threads = [...desk.inquiries].sort((a, b) => {
    const left = latestMessage(desk, a.id)?.at ?? a.opened;
    const right = latestMessage(desk, b.id)?.at ?? b.opened;
    return right.localeCompare(left);
  });
  const fallback = threads.find((inquiry) => latestMessage(desk, inquiry.id)?.direction === "in")?.id ?? threads[0]?.id;
  const selected = params.get("with") || fallback;
  const inquiry = desk.inquiries.find((row) => row.id === selected) ?? threads[0];
  const [channel, setChannel] = useState<"whatsapp" | "email">(inquiry?.channel === "email" ? "email" : "whatsapp");
  const [subject, setSubject] = useState(`Re: ${inquiry?.destination ?? "your trip"}`);
  const [body, setBody] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const messages = desk.messages.filter((message) => message.inquiryId === inquiry?.id);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [inquiry?.id, messages.length]);

  useEffect(() => {
    if (!inquiry) return;
    setChannel(inquiry.channel === "email" ? "email" : "whatsapp");
    setSubject(`Re: ${inquiry.destination}`);
    setBody("");
  }, [inquiry?.id, inquiry?.channel, inquiry?.destination]);

  if (!inquiry) return <p>No clients on the desk yet.</p>;

  const follow = desk.followUps.find((row) => row.inquiryId === inquiry.id && row.status === "open");

  function handoff(nextChannel: "whatsapp" | "email", text: string, nextSubject?: string) {
    if (!text.trim()) return;
    desk.postMessage(inquiry.id, nextChannel, text, nextSubject);
    const href = nextChannel === "whatsapp" ? waLink(inquiry.phone, text) : mailLink(inquiry.email, nextSubject || "Annix Travels", text);
    if (nextChannel === "whatsapp") window.open(href, "_blank", "noopener,noreferrer");
    else window.location.href = href;
    setBody("");
  }

  return (
    <div className="inbox">
      <aside className="inbox-list">
        <p className="kicker">Threads</p>
        {threads.map((row, index) => {
          const last = latestMessage(desk, row.id);
          const waiting = last?.direction === "in";
          return (
            <button key={row.id} type="button" className={row.id === inquiry.id ? "inbox-item active" : "inbox-item"} onClick={() => router.push(`/messages?with=${row.id}`)}>
              <span className="avatar" style={{ background: hues[index % hues.length] }}>
                {initials(row.client)}
              </span>
              <span>
                <span className="inbox-name">
                  <strong>{row.organisation ?? row.client}</strong>
                  {waiting ? <i /> : null}
                </span>
                <span className="preview">{last ? last.body.replace(/\s+/g, " ") : "No messages yet"}</span>
                <span className="meta">{last ? `${last.channel === "whatsapp" ? "WhatsApp" : "Email"} · ${stamp(last.at)}` : row.channel}</span>
              </span>
            </button>
          );
        })}
      </aside>

      <section className="inbox-main">
        <header className="inbox-head">
          <div>
            <h1>{inquiry.client}</h1>
            <p className="meta">
              {inquiry.destination} · +{inquiry.phone} · {inquiry.email}
            </p>
          </div>
          <span className={`pill ${inquiry.channel}`}>{inquiry.channel}</span>
        </header>

        <div className="bubbles" ref={scroller}>
          {messages.map((message) => (
            <article key={message.id} className={`bubble ${message.direction} ${message.channel}`}>
              <div className="bubble-meta">
                <span>
                  {message.direction === "in" ? inquiry.client.split(" ")[0] : "Annix"} · {message.channel === "whatsapp" ? "WhatsApp" : "Email"}
                  {message.auto ? ` · ${message.auto}` : ""}
                </span>
                <time>{accra(message.at, true)}</time>
              </div>
              {message.subject ? <strong className="bubble-subject">{message.subject}</strong> : null}
              <p>{message.body}</p>
              {message.direction === "out" ? (
                message.channel === "whatsapp" ? (
                  <a href={waLink(inquiry.phone, message.body)} target="_blank" rel="noreferrer">
                    Open in WhatsApp
                  </a>
                ) : (
                  <a href={mailLink(inquiry.email, message.subject ?? "Annix Travels", message.body)}>Open in email</a>
                )
              ) : null}
            </article>
          ))}
        </div>

        {follow ? (
          <div className="follow-bar">
            <span>
              Follow up {stamp(follow.due)} · {follow.reason}
            </span>
            <button type="button" onClick={() => desk.nudge(follow.id)}>
              Log nudge
            </button>
          </div>
        ) : null}

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            handoff(channel, body, subject);
          }}
        >
          <div className="seg" role="group" aria-label="Channel">
            <button type="button" aria-pressed={channel === "whatsapp"} onClick={() => setChannel("whatsapp")}>
              WhatsApp
            </button>
            <button type="button" aria-pressed={channel === "email"} onClick={() => setChannel("email")}>
              Email
            </button>
          </div>
          {channel === "email" ? <input className="field" value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Subject" /> : null}
          <textarea rows={2} placeholder={channel === "whatsapp" ? "Write the WhatsApp reply" : "Write the email"} value={body} onChange={(event) => setBody(event.target.value)} />
          <div className="composer-actions">
            <button className="btn primary" type="submit" disabled={!body.trim()}>
              Log and open {channel === "whatsapp" ? "WhatsApp" : "email"}
            </button>
            <span className="meta">The note stays on this thread, then opens {channel === "whatsapp" ? "WhatsApp" : "email"} with the same text.</span>
          </div>
        </form>
      </section>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function stamp(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
