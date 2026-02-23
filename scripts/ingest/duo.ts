/**
 * DUO ingestion (scaffold).
 *
 * This file is intentionally a starting point: DUO publishes multiple open datasets
 * and APIs, with different schemas over time.
 *
 * Implementation plan:
 * - Pick authoritative DUO dataset(s) for VO (secondary) institutions, locations and results.
 * - Map DUO identifiers to our `School` model (store source ids in `results` JSON initially).
 * - Enrich coordinates via a geocoder or an address dataset (prefer open data).
 * - Run as a scheduled job (cron) and track `sourceUrl` + update timestamps.
 */

export async function main() {
  throw new Error(
    "DUO ingestion not implemented yet. See README for how to extend ingestion."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

