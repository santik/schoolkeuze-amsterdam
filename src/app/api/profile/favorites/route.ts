import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { isValidProfileId } from "@/lib/profile-id";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId");
  if (!isValidProfileId(profileId)) return badRequest("Invalid profileId");
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { profileId },
    orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ ids: favorites.map((x) => x.schoolId) });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as { profileId?: unknown; ids?: unknown };
  if (!isValidProfileId(body.profileId)) return badRequest("Invalid profileId");
  if (!Array.isArray(body.ids) || !body.ids.every((x) => typeof x === "string")) {
    return badRequest("Invalid ids");
  }

  const ids = body.ids.map((x) => x.trim()).filter(Boolean).slice(0, 100);
  const uniqueIds = Array.from(new Set(ids));
  const profileId = body.profileId;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.favorite.deleteMany({ where: { profileId } });
    if (uniqueIds.length === 0) return;
    await tx.favorite.createMany({
      data: uniqueIds.map((schoolId, idx) => ({
        profileId,
        schoolId,
        rank: idx,
      })),
      // The client fires an unawaited PUT on every change, so two requests for
      // the same profile can overlap and both try to insert the same
      // (profileId, schoolId). skipDuplicates keeps that race from throwing a
      // unique-constraint error (P2002); the last write still wins.
      skipDuplicates: true,
    });
  });

  return NextResponse.json({ ok: true, ids: uniqueIds });
}
