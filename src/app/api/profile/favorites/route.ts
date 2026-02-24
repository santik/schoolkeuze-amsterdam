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

  await prisma.$transaction(async (tx) => {
    await tx.favorite.deleteMany({ where: { profileId } });
    if (uniqueIds.length === 0) return;
    await tx.favorite.createMany({
      data: uniqueIds.map((schoolId, idx) => ({
        profileId,
        schoolId,
        rank: idx,
      })),
    });
  });

  return NextResponse.json({ ok: true, ids: uniqueIds });
}

