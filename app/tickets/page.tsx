import { Suspense } from "react";
import TicketsClient from "./tickets-client";

export default function TicketsPage() {
  return (
    <Suspense fallback={<TicketsLoading />}>
      <TicketsClient />
    </Suspense>
  );
}

function TicketsLoading() {
  return (
    <div className="px-8 py-8 w-full">
      <div className="text-[13.5px] text-gray-400">Loading tickets…</div>
    </div>
  );
}
