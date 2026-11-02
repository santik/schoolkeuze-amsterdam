/**
 * One-off address correction for a small set of schools whose stored
 * street/postcode were wrong (e.g. Voort College's street was incorrect, and
 * several postcodes were stale). Verified against DUO/allecijfers and PDOK.
 * Touches ONLY street/houseNumber/postalCode — no other fact group.
 *
 * Input: JSON array of { id, name, street, houseNumber, postalCode }.
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/fix-addresses.ts <mapping.json> [--apply]
 * Without --apply it prints the planned changes and writes nothing.
 */
import fs from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

type Entry = { id: string; name: string; street: string; houseNumber: string; postalCode: string };

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) throw new Error('mapping JSON path required');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const entries: Entry[] = JSON.parse(await fs.readFile(file, 'utf8'));
  const prisma = new PrismaClient();
  try {
    let changed = 0;
    for (const e of entries) {
      const before = await prisma.school.findUnique({
        where: { id: e.id },
        select: { id: true, name: true, street: true, houseNumber: true, postalCode: true },
      });
      if (!before) { console.error(`MISSING id ${e.id} (${e.name})`); continue; }
      const postalCode = e.postalCode.replace(/\s+/g, '').toUpperCase();
      const same = before.street === e.street && before.houseNumber === e.houseNumber && before.postalCode === postalCode;
      if (same) continue;
      changed++;
      console.log(`${before.name}: ${before.street} ${before.houseNumber} ${before.postalCode} -> ${e.street} ${e.houseNumber} ${postalCode}`);
      if (apply) {
        await prisma.school.update({ where: { id: e.id }, data: { street: e.street, houseNumber: e.houseNumber, postalCode } });
      }
    }
    console.log(apply ? `Applied ${changed} address updates.` : `Would update ${changed} schools (dry run).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
