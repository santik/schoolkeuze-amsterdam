import { NextResponse } from "next/server";

const DUTCH_ZIP_REGEX = /^\d{4}\s?[A-Za-z]{2}$/;

function normalizeZip(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const zipRaw = url.searchParams.get("zip") ?? "";
  const zip = normalizeZip(zipRaw);

  if (!DUTCH_ZIP_REGEX.test(zip)) {
    return NextResponse.json({ error: "Invalid zip code" }, { status: 400 });
  }

  const query = `${zip} Amsterdam Netherlands`;
  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("q", query);
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("limit", "1");
  nominatimUrl.searchParams.set("countrycodes", "nl");

  const res = await fetch(nominatimUrl.toString(), {
    headers: {
      "Accept": "application/json",
      "User-Agent": "AmsterdamSchoolChoice/1.0 (geocoding zip)",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }

  const body = (await res.json()) as Array<{ lat: string; lon: string }>;
  const first = body[0];
  if (!first) {
    return NextResponse.json({ error: "Zip code not found" }, { status: 404 });
  }

  const lat = Number(first.lat);
  const lon = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Invalid geocoding result" }, { status: 502 });
  }

  return NextResponse.json({ lat, lon, zip });
}

