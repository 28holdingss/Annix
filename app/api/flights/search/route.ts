import { resolvePlace, searchFares, type FlightSearch } from "@/lib/duffel";

const cabins = new Set(["economy", "premium_economy", "business", "first"]);

export async function POST(request: Request) {
  if (!process.env.DUFFEL_ACCESS_TOKEN) {
    return Response.json({
      configured: false,
      message: "Add DUFFEL_ACCESS_TOKEN to .env.local. A test token starts with duffel_test_ and returns sample fares.",
    });
  }

  let body: Partial<FlightSearch>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The search could not be read." }, { status: 400 });
  }

  const fromInput = String(body.from ?? "").trim();
  const toInput = String(body.to ?? "").trim();
  const on = String(body.on ?? "");
  const end = body.end ? String(body.end) : undefined;
  const trip = body.trip === "oneway" ? "oneway" : "return";
  const adults = Math.min(9, Math.max(1, Number(body.adults) || 1));
  const cabin = typeof body.cabin === "string" && cabins.has(body.cabin) ? body.cabin : undefined;

  let from: string;
  let to: string;
  try {
    from = (await resolvePlace(fromInput)).code;
    to = (await resolvePlace(toInput)).code;
  } catch (error) {
    const message = error instanceof Error && error.message !== "missing-token" ? error.message : "Duffel could not look up that place.";
    return Response.json({ error: message }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on) || (trip === "return" && (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)))) {
    return Response.json({ error: "Choose a departure date, and a return date for a round trip." }, { status: 400 });
  }
  if (trip === "return" && end && end < on) {
    return Response.json({ error: "The return date is before the departure." }, { status: 400 });
  }

  try {
    const result = await searchFares({ trip, from, to, on, end, adults, cabin });
    return Response.json({ configured: true, from, to, ...result });
  } catch (error) {
    const message = error instanceof Error && error.message !== "missing-token" ? error.message : "Duffel could not search that route.";
    return Response.json({ error: message }, { status: 502 });
  }
}
