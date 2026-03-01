import { NextResponse } from "next/server";

import { listSchools } from "@/server/schoolsStore";

function toFloat(v: string | null) {
  if (v == null) return undefined;
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const levelsRaw = url.searchParams.get("levels");
    const levels = levelsRaw
      ? levelsRaw
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean)
      : undefined;

    const schools = await listSchools({
      q: url.searchParams.get("q") ?? undefined,
      levels,
      lat: toFloat(url.searchParams.get("lat")),
      lon: toFloat(url.searchParams.get("lon")),
      bikeMinutes: toFloat(url.searchParams.get("bikeMinutes")),
      take: toFloat(url.searchParams.get("take")),
    });

    return NextResponse.json({ schools });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load schools";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
