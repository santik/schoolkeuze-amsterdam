# DUO exam release and branch matching

Chosen reporting year: **2024–2025**. DUO's exam page listed this as the latest
complete release when checked on 2 October 2026, published 22 December 2025.
The page's CSV label says “2025–2025”, but its file and corresponding Excel link
identify 2024–2025. The latest release is a provisional BRON snapshot; complete
release coverage does not mean accountant-final figures.

- [Release index](https://duo.nl/open_onderwijsdata/voortgezet-onderwijs/examens/examens-vmbo-havo-vwo.jsp)
- [2024–2025 CSV](https://duo.nl/open_onderwijsdata/images/geslaagden-gezakten-en-cijfers-2024-2025.csv)
- [2023–2024 CSV](https://duo.nl/open_onderwijsdata/images/geslaagden-gezakten-en-cijfers-2023-2024.csv)
- [Definitions](https://duo.nl/open_onderwijsdata/images/toelichting-07-geslaagden-gezakten-en-cijfers.pdf)
- [Suppression policy](https://duo.nl/open_onderwijsdata/statistische-beveiliging.jsp)

Raw CSV files are retained unchanged. `ingestion-summary.json` records SHA-256
hashes, coverage categories, large annual changes and reconciled count totals.
`branch-mapping.json` is an explicit crosswalk reviewed against the release's
unique branch names and municipalities. Name matches include obvious expanded
school names and abbreviations (e.g. IVKO). Generic holding names such as
“Esprit Scholengroep” are deliberately not resolved from a shared BRIN. There
is no fuzzy matching or automatic fallback to branch 00. Sample BRIN placeholders
are not used as branch evidence. Check authoritative location/address evidence
before extending this crosswalk, especially for a relocation or renamed school.
A source branch can belong to only one displayed school.

## Meaning of the data

Rows describe mutually exclusive departments/profile combinations. Counts are
summed within branch and track. VMBO-B, K, GL and T remain separate. Any suppressed
constituent count (`<5`, or API-style `-1`) keeps its total and dependent percentage
suppressed. Unknown counts stay unknown, and missing rows do not establish an
empty cohort. No hidden count is reconstructed from another metric.

Rates are calculated as passed / candidates × 100, rounded to one decimal.
Department average grades have grade-specific denominators absent from this CSV;
only single-row track grades are retained. Multi-row track grades are unavailable.
The summary's “complete” means all relevant track counts/rates are available or
explicitly have zero candidates; it does not imply comparable average grades.
Candidate and passed reconciliation totals have different eligible groups and
must **not** be divided to form an overall rate.

## Running the import

`npm run ingest:exams -- --dry-run` validates both releases and prints the report.
`npm run ingest:exams -- --write` updates only local sample exam coverage and its
results provenance, preserving other fields, and saves the report. It never
opens a database connection. Legacy 2023–2024 fields remain stored but are not
presented as current results.

For an existing database, after deploying the provenance migration:

- `npm run ingest:exams:db -- --dry-run` previews coverage for its existing schools.
- `npm run ingest:exams:db -- --apply` updates results and their provenance in one
  serializable transaction and records prior snapshots in `SchoolImport`.

The database path preserves school IDs and all unrelated facts, creates/deletes
no schools, and uses the provenance merge rules to prevent older data replacing
newer data. No live database import was run during this feature implementation.

## Independent spot checks

The following checks sum the original CSV rows (header is row 1), separately
from the TypeScript importer:

| School | Branch | Track | Source rows | Candidates | Passed | Rate |
| --- | --- | --- | --- | ---: | ---: | ---: |
| Het Amsterdams Lyceum | 02AP00 | VWO | 1691–1696 | 186 | 160 | 86.0% |
| Lumion | 21GD01 | HAVO | 9510–9515 | 141 | 93 | 66.0% |
| College De Meer | 14RF03 | VMBO-K | 4833–4834 | 49 | 46 | 93.9% |

Independent raw-source grouping reconciled 1,821 known candidates and 1,330
known passed counts in their respective complete matched track groups. The
remaining source groups are excluded from these totals rather than estimated.
