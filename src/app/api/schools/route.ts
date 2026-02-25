import { NextResponse } from "next/server";

import { listSchools } from "@/server/schoolsStore";

function toFloat(v: string | null) {
  if (v == null) return undefined;
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const levelsRaw = url.searchParams.get("levels");
  const levels = levelsRaw ? levelsRaw.split(',').filter(l => l.trim()) : undefined;

  const schools = await listSchools({
    q: url.searchParams.get("q") ?? undefined,
    levels: levels,
    lat: toFloat(url.searchParams.get("lat")),
    lon: toFloat(url.searchParams.get("lon")),
    bikeMinutes: toFloat(url.searchParams.get("bikeMinutes")),
    take: toFloat(url.searchParams.get("take")),
  });

  return NextResponse.json({ schools });
}
