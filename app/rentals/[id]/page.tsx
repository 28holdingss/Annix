"use client";

import { useParams } from "next/navigation";
import { RentalFile } from "@/components/Services";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <RentalFile id={params.id} />;
}