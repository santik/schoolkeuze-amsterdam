import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { isValidProfileId } from "@/lib/profile-id";
import { prisma } from "@/server/db";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasAnyDefined(metrics: Record<string, unknown>) {
  return Object.values(metrics).some((v) => v !== null && v !== undefined && v !== "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId");
  const schoolId = url.searchParams.get("schoolId");

  if (!isValidProfileId(profileId)) return badRequest("Invalid profileId");
  if (typeof schoolId !== "string" || !schoolId.trim()) return badRequest("Invalid schoolId");

  const item = await prisma.schoolImpression.findUnique({
    where: { profileId_schoolId: { profileId, schoolId: schoolId.trim() } },
  });

  return NextResponse.json({ metrics: (item?.metrics ?? {}) as Record<string, unknown> });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as {
    profileId?: unknown;
    schoolId?: unknown;
    metrics?: unknown;
  };

  if (!isValidProfileId(body.profileId)) return badRequest("Invalid profileId");
  if (typeof body.schoolId !== "string" || !body.schoolId.trim()) return badRequest("Invalid schoolId");
  if (!isObject(body.metrics)) return badRequest("Invalid metrics");

  const profileId = body.profileId;
  const schoolId = body.schoolId.trim();
  const metrics = body.metrics;

  if (!hasAnyDefined(metrics)) {
    await prisma.schoolImpression.deleteMany({ where: { profileId, schoolId } });
    return NextResponse.json({ ok: true, deleted: true });
  }

  await prisma.schoolImpression.upsert({
    where: { profileId_schoolId: { profileId, schoolId } },
    create: { profileId, schoolId, metrics: metrics as Prisma.InputJsonValue },
    update: { metrics: metrics as Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true });
}
