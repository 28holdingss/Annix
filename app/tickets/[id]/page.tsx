"use client";

import { useParams } from "next/navigation";
import { TicketFile } from "@/components/Services";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <TicketFile id={params.id} />;
}
