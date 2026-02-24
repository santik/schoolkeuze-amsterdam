import { NextResponse } from "next/server";

import { isValidProfileId } from "@/lib/profile-id";
import { prisma } from "@/server/db";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId");
  if (!isValidProfileId(profileId)) return badRequest("Invalid profileId");

  const notes = await prisma.schoolNote.findMany({
    where: { profileId },
    orderBy: { updatedAt: "desc" },
  });

  const notesById = Object.fromEntries(notes.map((n) => [n.schoolId, n.note]));
  return NextResponse.json({ notesById });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as {
    profileId?: unknown;
    schoolId?: unknown;
    note?: unknown;
  };

  if (!isValidProfileId(body.profileId)) return badRequest("Invalid profileId");
  if (typeof body.schoolId !== "string" || !body.schoolId.trim()) {
    return badRequest("Invalid schoolId");
  }
  if (typeof body.note !== "string") return badRequest("Invalid note");

  const profileId = body.profileId;
  const schoolId = body.schoolId.trim();
  const note = body.note.trim();

  if (!note) {
    await prisma.schoolNote.deleteMany({ where: { profileId, schoolId } });
    return NextResponse.json({ ok: true, deleted: true });
  }

  await prisma.schoolNote.upsert({
    where: {
      profileId_schoolId: { profileId, schoolId },
    },
    create: { profileId, schoolId, note },
    update: { note },
  });

  return NextResponse.json({ ok: true });
}

