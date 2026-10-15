"use client";

import { useParams } from "next/navigation";
import { VisaFile } from "@/components/Services";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <VisaFile id={params.id} />;
}
