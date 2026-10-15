export type FlightOffer = {
  id: string;
  airline: string;
  marketedBy?: string;
  flight: string;
  total: string;
  currency: string;
  cabin: string;
  depart: string;
  arrive: string;
  returns?: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  stops: number;
  passengers: number;
};

export type FlightSearch = {
  trip: "return" | "oneway";
  from: string;
  to: string;
  on: string;
  end?: string;
  adults: number;
  cabin?: "economy" | "premium_economy" | "business" | "first";
};

type DuffelSegment = {
  departing_at?: string;
  arriving_at?: string;
  origin?: { iata_code?: string; city_name?: string };
  destination?: { iata_code?: string; city_name?: string };
  operating_carrier?: { name?: string };
  marketing_carrier?: { name?: string; iata_code?: string };
  marketing_carrier_flight_number?: string;
  passengers?: { cabin_class_marketing_name?: string; cabin_class?: string }[];
};

type DuffelOffer = {
  id: string;
  total_amount: string;
  total_currency: string;
  owner?: { name?: string };
  slices?: { segments?: DuffelSegment[] }[];
};

type DuffelPlace = {
  type?: string;
  name?: string;
  iata_code?: string | null;
  city_name?: string | null;
};

export async function resolvePlace(input: string): Promise<{ code: string; name: string }> {
  const query = input.trim();
  if (/^[A-Za-z]{3}$/.test(query)) return { code: query.toUpperCase(), name: query.toUpperCase() };
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) throw new Error("missing-token");
  const response = await fetch(`https://api.duffel.com/places/suggestions?query=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": "v2",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  const payload = (await response.json()) as { data?: DuffelPlace[]; errors?: { message?: string }[] };
  if (!response.ok) throw new Error(payload.errors?.[0]?.message || "Duffel could not look up that place.");
  const places = payload.data ?? [];
  const needle = query.toLowerCase();
  const match =
    places.find((place) => place.type === "city" && place.iata_code && place.name?.toLowerCase() === needle) ??
    places.find((place) => place.type === "airport" && place.iata_code && place.city_name?.toLowerCase() === needle) ??
    places.find((place) => place.type === "city" && place.iata_code) ??
    places.find((place) => place.type === "airport" && place.iata_code);
  if (!match?.iata_code) throw new Error(`No airport found for ${query}.`);
  return { code: match.iata_code, name: match.city_name || match.name || match.iata_code };
}

export async function searchFares(search: FlightSearch): Promise<{ live: boolean; offers: FlightOffer[] }> {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) throw new Error("missing-token");

  const slices = [
    { origin: search.from, destination: search.to, departure_date: search.on },
    ...(search.trip === "return" && search.end ? [{ origin: search.to, destination: search.from, departure_date: search.end }] : []),
  ];
  const response = await fetch("https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=12000", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        slices,
        passengers: Array.from({ length: search.adults }, () => ({ type: "adult" })),
        ...(search.cabin ? { cabin_class: search.cabin } : {}),
      },
    }),
    signal: AbortSignal.timeout(20000),
  });
  const payload = (await response.json()) as {
    data?: { live_mode?: boolean; offers?: DuffelOffer[] };
    errors?: { message?: string; title?: string }[];
  };
  if (!response.ok) {
    const message = payload.errors?.[0]?.message || payload.errors?.[0]?.title || "Duffel could not search that route.";
    throw new Error(message);
  }
  const offers = (payload.data?.offers ?? [])
    .map((offer) => toOffer(offer, search.adults))
    .filter((offer): offer is FlightOffer => Boolean(offer))
    .sort((a, b) => Number(a.total) - Number(b.total))
    .slice(0, 8);
  return { live: payload.data?.live_mode === true, offers };
}

function toOffer(offer: DuffelOffer, passengers: number): FlightOffer | null {
  const outbound = offer.slices?.[0]?.segments ?? [];
  const inbound = offer.slices?.[1]?.segments ?? [];
  const first = outbound[0];
  const last = outbound[outbound.length - 1];
  if (!first || !last) return null;
  const airline = first.operating_carrier?.name || offer.owner?.name || "Airline";
  const marketed = first.marketing_carrier?.name;
  return {
    id: offer.id,
    airline,
    marketedBy: marketed && marketed !== airline ? marketed : undefined,
    flight: [first.marketing_carrier?.iata_code, first.marketing_carrier_flight_number].filter(Boolean).join(" "),
    total: offer.total_amount,
    currency: offer.total_currency,
    cabin: first.passengers?.[0]?.cabin_class_marketing_name || first.passengers?.[0]?.cabin_class || "Economy",
    depart: first.departing_at ?? "",
    arrive: last.arriving_at ?? "",
    returns: inbound[0]?.departing_at,
    origin: first.origin?.iata_code ?? "",
    originCity: first.origin?.city_name ?? "",
    destination: last.destination?.iata_code ?? "",
    destinationCity: last.destination?.city_name ?? "",
    stops: Math.max(0, outbound.length - 1),
    passengers,
  };
}
