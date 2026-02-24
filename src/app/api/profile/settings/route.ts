import { NextResponse } from "next/server";

import { isValidProfileId } from "@/lib/profile-id";
import { prisma } from "@/server/db";

const ALLOWED_LEVELS = new Set(["VMBO", "HAVO", "VWO"]);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId");
  if (!isValidProfileId(profileId)) return badRequest("Invalid profileId");

  const settings = await prisma.profileSettings.findUnique({
    where: { profileId },
    select: { adviceLevel: true },
  });

  return NextResponse.json({
    adviceLevel: settings?.adviceLevel ?? "VWO",
  });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as { profileId?: unknown; adviceLevel?: unknown };
  if (!isValidProfileId(body.profileId)) return badRequest("Invalid profileId");
  if (typeof body.adviceLevel !== "string" || !ALLOWED_LEVELS.has(body.adviceLevel)) {
    return badRequest("Invalid adviceLevel");
  }

  const profileId = body.profileId;
  const adviceLevel = body.adviceLevel as "VMBO" | "HAVO" | "VWO";

  await prisma.profileSettings.upsert({
    where: { profileId },
    create: { profileId, adviceLevel },
    update: { adviceLevel },
  });

  return NextResponse.json({ ok: true });
}

