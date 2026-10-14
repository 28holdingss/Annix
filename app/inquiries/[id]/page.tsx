import { InquiryDetail } from "@/components/InquiryDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InquiryDetail id={id} />;
}
