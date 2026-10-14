import { Suspense } from "react";
import { Threads } from "@/components/Threads";

export default function Page() {
  return (
    <Suspense fallback={<p className="lede">Opening threads…</p>}>
      <Threads />
    </Suspense>
  );
}
