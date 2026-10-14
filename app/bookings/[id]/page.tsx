import { BookingDesk } from "@/components/BookingDesk";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookingDesk id={id} />;
}
