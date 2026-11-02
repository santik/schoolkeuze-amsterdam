/**
 * One-off coordinate correction.
 *
 * The stored lat/lon were rough approximations (every school was mis-placed on
 * the map, median ~800m, some >3km off). This re-geocodes every school from its
 * authoritative address via the Dutch government PDOK Locatieserver and writes
 * the corrected coordinates. It touches ONLY lat/lon — no other fact group.
 *
 * Input: a JSON array of { id, name, new: [lat, lon] }.
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/fix-coordinates.ts <mapping.json> [--apply]
 * Without --apply it prints the planned changes and writes nothing.
 */
import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

type Entry = { id: string; name: string; new: [number, number] | null };

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) throw new Error('mapping JSON path required');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const entries: Entry[] = JSON.parse(await fs.readFile(file, 'utf8'));
  const valid = entries.filter((e) => e.new && Number.isFinite(e.new[0]) && Number.isFinite(e.new[1]));
  if (valid.length !== entries.length) throw new Error('Some entries lack valid coordinates; aborting.');

  const prisma = new PrismaClient();
  try {
    let changed = 0;
    for (const e of valid) {
      const before = await prisma.school.findUnique({ where: { id: e.id }, select: { id: true, name: true, lat: true, lon: true } });
      if (!before) { console.error(`MISSING id ${e.id} (${e.name})`); continue; }
      const [lat, lon] = e.new!;
      const same = before.lat === lat && before.lon === lon;
      if (same) continue;
      changed++;
      if (apply) {
        await prisma.school.update({ where: { id: e.id }, data: { lat, lon } });
      } else {
        console.log(`${before.name}: ${before.lat},${before.lon} -> ${lat},${lon}`);
      }
    }
    console.log(apply ? `Applied ${changed} coordinate updates.` : `Would update ${changed} schools (dry run).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
