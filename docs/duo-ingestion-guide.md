# DUO annual data refresh guide

How to refresh the DUO-derived data in this project each year. Written for the developer maintaining the repo.

DUO (Dienst Uitvoering Onderwijs) publishes open datasets for secondary education (VO) at
<https://duo.nl/open_onderwijsdata/voortgezet-onderwijs/>. We use them to fill the five **provenance field groups**
that the school detail page shows under "Data & bronnen" / "Data & sources".

> **Last run: October 2026.** `scripts/ingest/duo-provenance.ts` is implemented and was first run in October 2026.
> It matched 65 of 87 schools (22 unmatched, mostly special education / VSO / very new schools).
> All 87 schools now have `admissions` and `results` provenance; matched schools also have `identity`, `education` and `enrolment`.

## 1. Overview

| Field group | Facts (see `FACT_FIELDS`) | Source | How it gets into the data |
| --- | --- | --- | --- |
| `identity` | `brin`, `name`, `websiteUrl`, `phone`, `street`, `houseNumber`, `postalCode`, `city`, `lat`, `lon` | DUO vestigingen CSV | `duo-provenance.ts` |
| `enrolment` | `size` | DUO leerlingen per vestiging CSV | `duo-provenance.ts` |
| `education` | `levels`, `concepts`, `denomination` | DUO vestigingen CSV | `duo-provenance.ts` |
| `results` | `results` (exam coverage) | DUO exam CSV | `scripts/ingest/exams.ts` |
| `admissions` | `admissions`, `admissionsInfo` | Kernprocedure PO-VO (OSVO/ELK) | `src/lib/admissions-info.ts` via `scripts/enrich-admissions-info.mjs` |

Flow: raw files in `data/` -> ingest scripts rewrite `data/schools.sample.json` (facts + `provenance` array) ->
`npm run ingest:sample` upserts that file into Postgres using the merge rules in `src/lib/data-provenance.ts`.

Annual calendar (typical):

| When | What |
| --- | --- |
| October | New vestigingen CSV (peildatum 1 October). Vestigingen is refreshed monthly, so re-download any time. |
| December | Leerlingen CSV for the new school year (peildatum 1 October). Exam results for the previous school year (2024-2025 was published 22 December 2025). |
| Autumn/winter | New Kernprocedure PO-VO for the next admissions cycle (the 2025-2026 PDF was uploaded in December 2024). |

## 2. Data sources

### 2.1 Vestigingen (school locations) -> identity + education

- Page: <https://duo.nl/open_onderwijsdata/voortgezet-onderwijs/adressen/vestigingen.jsp>
- File: `02.-alle-vestigingen-vo.csv` (~515 KB, ~1,600 rows nationwide)
- Save as: `data/duo/alle-vestigingen-vo.csv` (no year in the name; it is replaced each time)
- Format: semicolon-separated, header row, CRLF, **latin-1 / Windows-1252** (the committed file is not valid UTF-8)
- Key columns: `INSTELLINGSCODE` (the **BRIN**, 4 chars, e.g. `21AB`), `VESTIGINGSCODE` (BRIN + 2 digits, e.g. `21AB00`),
  `VESTIGINGSNAAM`, `STRAATNAAM`, `HUISNUMMER-TOEVOEGING`, `POSTCODE` (with a space, `1017 RV`), `PLAATSNAAM`,
  `GEMEENTENUMMER`, `GEMEENTENAAM`, `DENOMINATIE`, `TELEFOONNUMMER`, `INTERNETADRES` (often without scheme: `www.barlaeus.nl`),
  `ONDERWIJSSTRUCTUUR`. The remaining columns (correspondence address, NODAAL/RPA/WGR/COROP/RMC regions, `VAKANTIEREGIO`) are not used.
- `ONDERWIJSSTRUCTUUR` is the source for `levels`, and `DENOMINATIE` for `denomination`. Map values onto the
  `SchoolLevel` enum in `prisma/schema.prisma`; `normalizeSchool()` in `scripts/ingest/import-schools.ts` rejects unknown
  levels, folds `VMBO_GL` into `VMBO`, and drops `KOVO`.
- `dataYear` for the provenance entry: the peildatum year (e.g. `2026`). `sourceUpdatedAt`: the peildatum shown on the page.

### 2.2 Student counts per vestiging -> enrolment

- Page: <https://duo.nl/open_onderwijsdata/voortgezet-onderwijs/aantal-leerlingen/aantal-leerlingen.jsp>
- File: `03.-leerlingen-vo-per-vestiging-en-bestuur-(vavo-apart)-YYYY.csv` (~141 KB)
- Save as: `data/duo/leerlingen-vo-per-vestiging-YYYY.csv` (keep the old years; they are small and useful for year-on-year checks)
- Format: semicolon-separated, every field quote-wrapped, CRLF. DUO serves latin-1; the two files currently in `data/duo/`
  happen to be valid UTF-8 (they were converted or re-saved at some point). **Do not assume either.** The parser should
  detect/handle both (see Troubleshooting).
- Columns: `BEVOEGD GEZAG NUMMER`, `INSTELLINGSCODE`, `VESTIGINGSCODE`, `INSTELLINGSNAAM VESTIGING`, `PLAATSNAAM`,
  `GEMEENTENUMMER`, `GEMEENTENAAM`, `PROVINCIE`, `AANTAL LEERLINGEN`, `AANTAL VO LEERLINGEN UITBESTEED AAN VAVO`.
- `AANTAL LEERLINGEN` is a number, but small counts can be suppressed. The `UITBESTEED AAN VAVO` column contains values like
  `"<5"`. Treat any non-numeric `AANTAL LEERLINGEN` as unknown (`null`), never as 0.
- Published around December, peildatum 1 October. The newest year can be **voorlopig** (provisional); the year before is
  definitive. The 2025 file is still provisional at the time of writing. Record that in `sourceLabel` or in the
  `sourceUpdatedAt`/notes you keep, and re-download the definitive file when DUO replaces it.
- `dataYear` for provenance: the peildatum year (`2025`).

### 2.3 Exam results -> results

- Page: <https://duo.nl/open_onderwijsdata/voortgezet-onderwijs/uitstromers-en-geslaagden/examenkandidaten-geslaagden-en-cijfers.jsp>
  (the release index used by the exam pipeline is `.../examens/examens-vmbo-havo-vwo.jsp`; see `data/exams/README.md`)
- Raw files: `data/exams/duo-YYYY-YYYY.csv`, source URL pattern
  `https://duo.nl/open_onderwijsdata/images/geslaagden-gezakten-en-cijfers-YYYY-YYYY.csv` (see `sourceUrl()` in `scripts/ingest/exam-results.ts`).
- Own pipeline, own docs: `data/exams/README.md`. This guide only covers the annual steps (section 4, step 4).

### 2.4 Admissions -> admissions (kernprocedure)

- Source: Kernprocedure PO-VO Amsterdam, published each year by OSVO / OCO and ELKadam. Look on
  <https://onderwijsconsument.nl> for "KERNPROCEDURE PO-VO". The current code points at the OSVO PDF
  (`src/lib/admissions-priority.json`) and the ELKadam timeline attachment (`src/lib/admissions-info.ts`).
- There is **no CSV**. The text and dates are written by hand in code (see section 4, step 5).
- Provenance `sourceUrl` points at the kernprocedure document; `dataYear` is the procedure year, e.g. `2026-2027`.

## 3. How school matching works

Our schools use short common names ("Barlaeus Gymnasium"); DUO uses long legal names and sometimes a different
branch name. **Never match on name.** Match on address:

1. Normalize our `street` + `houseNumber` and the DUO `STRAATNAAM` + `HUISNUMMER-TOEVOEGING`
   (lowercase, strip accents/punctuation/whitespace, uppercase the postcode and remove its space).
2. Expand DUO's street abbreviations before comparing (DUO writes "Takstr" for "Takstraat", "pl" for "plein", "ln" for "laan", etc.).
3. Compare house numbers by their numeric part first; handle additions (`31`, `31-33`, `31 A`) explicitly rather than by equality of raw strings.
4. Restrict candidates to `GEMEENTENAAM = AMSTERDAM` (plus Diemen/Amstelveen if a school really is there) to avoid hits on other towns.
5. If an address yields several vestigingen (a campus shared by several schools), do not guess; report it as ambiguous and
   resolve it by a manual mapping.

Expected outcome: about **66-70 of 87 schools** match. The rest are typically:

- special education (VSO, Orion, Kentalis, Visio, VierTaal, Signis): not in the regular VO dataset,
- very new schools DUO does not list yet,
- schools that recently moved, or whose address in our data differs from DUO's.

A match yields the `VESTIGINGSCODE`; the BRIN is its first four characters (`INSTELLINGSCODE`). Enrolment is looked up by
the same `VESTIGINGSCODE` in the leerlingen file, so a vestiging that matches in the first file but is missing in the second
gets `size = null` and a report line.

Note that the BRINs currently in `data/schools.sample.json` are partly placeholders (for example Barlaeus is `00AA` in our data, while DUO lists it as
`21AB`; `data/exams/README.md` also warns that sample BRINs are not branch evidence). Updating BRINs from the match
is part of this refresh, and it is why you should check BRINs afterwards.

The exam pipeline does **not** use address matching. It uses the reviewed crosswalk `data/exams/branch-mapping.json`.

## 4. Annual update procedure

Work on a branch. Every step ends with a diff of `data/schools.sample.json` that you should read before committing.

### Step 1: Download the new vestigingen CSV (October onwards)

1. Open <https://duo.nl/open_onderwijsdata/voortgezet-onderwijs/adressen/vestigingen.jsp>.
2. Note the peildatum on the page (it is the `sourceUpdatedAt` of the identity/education provenance).
3. Download `02.-alle-vestigingen-vo.csv` and replace `data/duo/alle-vestigingen-vo.csv`.
4. Keep the bytes as DUO delivered them. Do not re-save in a spreadsheet (it changes quoting and encoding).
5. Sanity check: `file data/duo/alle-vestigingen-vo.csv` and `head -1` should show the header listed in section 2.1.
   A different header means DUO changed the schema; fix the parser before continuing.

### Step 2: Download the new leerlingen CSV (December)

1. Open <https://duo.nl/open_onderwijsdata/voortgezet-onderwijs/aantal-leerlingen/aantal-leerlingen.jsp>.
2. Download the **"per vestiging en bestuur (VAVO apart)"** file for the new year (not the per-gemeente or per-onderwijssoort files).
3. Save as `data/duo/leerlingen-vo-per-vestiging-YYYY.csv`.
4. Update the year constant in the ingestion script (the equivalent of `year = '2024-2025'` in `scripts/ingest/exams.ts`;
   enrolment uses a single year such as `'2026'`). Also update the "previous year" file if the script compares years.
5. If the page says the year is provisional ("voorlopig"), keep going, but do not overwrite the definitive previous year's
   file; the new year is simply the newest available. When DUO publishes the definitive version, re-download, overwrite, re-run.

### Step 3: Run the DUO ingestion

```bash
# 1. Look first. Writes nothing. Check matched/unmatched counts and the change report.
npx tsx scripts/ingest/duo-provenance.ts --dry-run

# 2. Apply: rewrites data/schools.sample.json (facts + provenance for identity, enrolment, education).
npx tsx scripts/ingest/duo-provenance.ts --write
```

What to expect from `--dry-run`:

- matched / unmatched counts (about 66-70 of 87 matched); list unmatched schools by name so you can compare with the previous year,
- per-school changes: BRIN, address, website, denomination, levels, `size`,
- warnings for removed values, ambiguous address matches, and non-numeric (suppressed) counts,
- large enrolment swings (rule of thumb: more than 20% year on year) deserve a manual look; a merged or split school
  often shows up as one.

If the unmatched list grows compared with last year, stop and investigate (section 7) rather than writing.

`--write` must not touch the `results` and `admissions` provenance entries; unmatched schools keep their existing facts and provenance untouched.

### Step 4: Run the exam ingestion (when DUO has published a new exam release)

New exam data usually appears in December for the school year that ended the previous summer.

1. Check the release index <https://duo.nl/open_onderwijsdata/voortgezet-onderwijs/examens/examens-vmbo-havo-vwo.jsp>.
   The page's CSV label can be misleading (the 2024-2025 file was labelled "2025-2025"); trust the file name/contents. See `data/exams/README.md`.
2. Download the CSV to `data/exams/duo-YYYY-YYYY.csv`. Keep the previous year's file too; it is used for year-on-year comparison.
3. In `scripts/ingest/exams.ts` update, all by hand:
   - `const year = '2024-2025'` -> new year,
   - the previous-year file name `data/exams/duo-2023-2024.csv` and the `'2023-2024'` in the `sources` list -> the old current year,
   - the two hardcoded `'2025-12-22T00:00:00.000Z'` timestamps (the "newer provenance exists" guard and `sourceUpdatedAt`) -> the new publication date.
   If you miss the guard timestamp, a re-run can throw `Newer exam provenance exists for ...`.
4. Update `data/exams/branch-mapping.json` for new, renamed, or moved branches. Check the address evidence before extending it; no fuzzy matching.
5. Run:

```bash
npm run ingest:exams -- --dry-run     # validates both releases, prints the reconciliation report
npm run ingest:exams -- --write       # updates data/schools.sample.json and data/exams/ingestion-summary.json
```

   The run aborts if candidate/passed totals do not reconcile. For a database that already has data you can also run
   `npm run ingest:exams:db -- --dry-run` then `-- --apply`.
6. Update the "Chosen reporting year" paragraph and links in `data/exams/README.md`.

Skip this step if no new exam release exists; `results` provenance will then show as stale per section 6.

### Step 5: Update the admissions info (when the kernprocedure changes)

The Kernprocedure PO-VO for the next admissions cycle is normally published in the autumn/winter before the March aanmeldweek.

1. Find the new PDF (OSVO / onderwijsconsument.nl / ELKadam). Read the timeline attachment ("tijdpad").
2. `src/lib/admissions-priority.json`: update `procedureYear`, `annualProcedureUrl` (the `#page=` anchor points at the priority rules) and `annualProcedureLabel`. Re-check the priority-rule wording against the new PDF.
3. `src/lib/admissions-info.ts`: update the dates in the NL and EN `timeline`, `summary` and `notes` (final advice deadline, central application week, round-1 result date, school decision deadline), and the ELKadam timeline source URL labelled "Kernprocedure 2025-2026 (timeline)".
4. **The same text is duplicated in `scripts/enrich-admissions-info.mjs`** (it is a standalone copy of `buildAdmissionsInfo`).
   Apply identical edits there, otherwise the stored `admissionsInfo` and the runtime builder disagree.
5. Regenerate the stored text in the data file: `node scripts/enrich-admissions-info.mjs` (rewrites `admissionsInfo` for every school in `data/schools.sample.json`).
6. Set the `admissions` provenance entry for each school: `dataYear` = procedure year (`2026-2027`), `sourceUrl` = the kernprocedure PDF, `sourceLabel` e.g. "OSVO Kernprocedure PO-VO 2026-2027", `method: 'automatic'`, `authority: 'authoritative'`
   (or `method: 'manual'` with `verifiedAt` set if you checked it by hand; `parseProvenance` requires `verifiedAt` for manual entries).
   The DUO script is expected to do this too ("Update the kernprocedure URL in the ingestion script").

Note the freshness rule for admissions (section 6): a `2025-2026` entry goes **stale on 1 September 2026**, so it is already
past due as of October 2026.

### Step 6: Import into the database (if using Postgres)

```bash
npm run ingest:sample -- --dry-run                        # validates every record, writes nothing
npm run ingest:sample -- --file data/schools.sample.json  # needs DATABASE_URL
```

The import validates every record first and aborts without writing anything if one is rejected. It merges through
`mergeFacts()`, stores a snapshot plus change report per school in `SchoolImport`, and skips groups whose provenance would
go backwards (`regressing`). Read the JSON lines it prints: `changed`, `removed`, `stale`, `missing`, `regressing`.

## 5. Checks after updating

- [ ] `git diff --stat data/schools.sample.json`: only expected schools changed; no mass removals.
- [ ] `npm run dev`, open several school detail pages (a gymnasium, a VMBO school, a school that did **not** match).
- [ ] Expand **Data & bronnen**: all 5 groups (Adres en contact, Aantal leerlingen, Onderwijsaanbod, Examenresultaten, Toelating) show a source link and year. A group without provenance shows "Bron en/of jaar ontbreken" and its annual data is hidden.
- [ ] No "Mogelijk verouderd" / "May be outdated" warning on a group you just refreshed.
- [ ] Student counts are plausible: typically 200-2,500 for a regular school, and within about 15% of last year's value unless there is a known reason.
- [ ] BRINs: spot-check 5 schools against the vestigingen CSV (`iconv -f latin1 -t utf8 data/duo/alle-vestigingen-vo.csv | grep "Weteringschans"`). BRIN = first 4 characters of `VESTIGINGSCODE`.
- [ ] Websites/phones were normalized (scheme added to `INTERNETADRES`, postcode without a space). Note that phones are currently absent from the sample data.
- [ ] `npm run lint` and the existing tests pass (see `tests/` and `playwright.config.ts`; there are provenance and exam tests).
- [ ] Dry-run of `ingest:sample` passes with no `rejected` lines.

## 6. Provenance and freshness rules (`src/lib/data-provenance.ts`)

Each school has a `provenance` array with at most one entry per field group:

```json
{
  "fieldGroup": "enrolment",
  "dataYear": "2025",
  "sourceLabel": "DUO - leerlingen VO per vestiging",
  "sourceUrl": "https://duo.nl/open_onderwijsdata/voortgezet-onderwijs/aantal-leerlingen/aantal-leerlingen.jsp",
  "sourceUpdatedAt": "2025-10-01T00:00:00.000Z",
  "importedAt": "2026-10-07T00:00:00.000Z",
  "verifiedAt": null,
  "method": "automatic",
  "authority": "authoritative"
}
```

- `dataYear` is `YYYY` or a school year `YYYY-YYYY` (the second year must be the first + 1). Anything else throws.
- `sourceUrl` must be http(s) without credentials; `utm_*`, `fbclid`, `gclid` and fragments are stripped.
- `manual` entries need `verifiedAt`.
- **Regression guard**: an import is skipped for a group (reported as `regressing`) if its `dataYear` is older, its
  `sourceUpdatedAt` is older, or it would swap `authoritative` for `fallback` in the same year. This is why re-running last year's CSV after a
  newer import does nothing, and why exams.ts throws on older data.
- **Group integrity**: a changed provenance entry requires all previously populated facts of that group to be present in
  the incoming record, so a partial update cannot silently re-date other facts. Provide every field of the group for matched schools.
- `FACT_FIELDS` defines which facts belong to which group. `missingProvenance()` flags a populated fact with no provenance.

Freshness (`freshness()`):

| Group | Rule |
| --- | --- |
| `identity`, `education` | `evergreen`, never flagged stale |
| `enrolment`, `results` | stale when `currentYear - endYear > 1` (`FRESHNESS_YEARS`). A `2025` enrolment entry turns stale in 2027; a `2024-2025` exam entry in 2027. |
| `admissions` | school-year value (`2025-2026`): stale from **1 September of the end year**. Single year (`2025`): stale from 1 January of the following year (2026). |

The UI shows the stale warning, and `ingest:sample` prints `stale` lines.

## 7. Troubleshooting

**Garbled characters (Ã©, ï¿½, missing diacritics).**
DUO CSVs are latin-1/Windows-1252, not UTF-8. `fs.readFile(path, 'utf8')` mangles them. Read as a buffer and decode with
`new TextDecoder('windows-1252')` (or `iconv-lite`), or try strict UTF-8 first (`new TextDecoder('utf-8', {fatal: true})`) and fall back, because
the two leerlingen files currently on disk are already UTF-8 while the vestigingen file is not. Check with
`file data/duo/*.csv` and `iconv -f latin1 -t utf8 <file> | head`. The exam CSVs are read as UTF-8 by `exams.ts`, so they are a different case.

**CSV parsing.**
Fields are separated by `;`. The leerlingen file quotes every field; vestigingen is mostly unquoted. A hand-rolled `split(';')` breaks
on quoted delimiters; reuse the RFC-style parser `parseDuoCsv()` in `scripts/ingest/exam-results.ts` as a pattern (strips a BOM, handles quotes and CRLF).
Always validate the header row and fail loudly on a mismatch.

**A new school does not match.**
Check whether it is in the vestigingen CSV at all (search by street or by name). If DUO has it under another address, add a manual mapping
(a small `data/duo/manual-mapping.json` keyed by our school name -> `VESTIGINGSCODE` is the simplest). If DUO does not list it yet
(typical for a school that opened this August), leave it unmatched and re-run when DUO updates (monthly). Keep its existing facts; do not invent provenance.

**A school moved or has an address discrepancy.**
Address matching fails when our address is outdated or DUO's differs (for example a correspondence address vs the
visiting address; we use the visiting address columns, not the `CORRESPONDENTIEADRES` ones). Look up the school's website for the true address, then either fix
`street`/`houseNumber`/`postalCode`/`lat`/`lon` in `data/schools.sample.json` (and set identity provenance `method: 'manual'` with `verifiedAt`)
or add a manual mapping.

**Street abbreviations.**
If a street fails to match, print the normalized DUO and normalized own value side by side. New abbreviations are added to the expansion table in the script.

**Special education schools never match.**
Expected (VSO, Orion, Kentalis, Visio, VierTaal, Signis). They are not part of this VO file. Keep them on their existing/manual data; do not treat
them as regressions.

**Provisional vs definitive data.**
The newest leerlingen file (2025 at the time of writing) is provisional. When DUO publishes the definitive release it replaces the file at the same
URL pattern: re-download, overwrite the CSV, re-run. The regression guard allows this because the `dataYear` is equal and `sourceUpdatedAt` is newer. If the figures
change a lot, say so in the commit message.
The latest exam release is a provisional BRON snapshot as well (`data/exams/README.md`).

**`Newer exam provenance exists for ...` (exams.ts).**
The hardcoded date guard in `scripts/ingest/exams.ts` considers existing data newer than what you are importing. Update `year` and the guard timestamp as in step 4.

**`regressing` in the `ingest:sample` output.**
The incoming provenance is older than what is in the database. Usually you imported an old file or forgot to update `dataYear`/`sourceUpdatedAt`.

**`changed provenance requires all previously populated facts` (thrown by `mergeFacts`).**
The script updated a group's provenance but omitted a fact the school already had (for example `concepts`, or `phone`). Carry existing values over
for fields DUO does not supply, or write the full set for the group.

**`Unknown school level: ...` on import.**
DUO introduced or renamed an `ONDERWIJSSTRUCTUUR` value. Extend the mapping in the DUO script, and add the enum value in `prisma/schema.prisma` (with a migration) if it is a genuinely new level.

**DUO changed URLs or file names.**
The file names above change over time (the leading number, the year suffix). Navigate from the page links, not from a bookmarked file URL, and update
the URLs in this guide, in the script's `sourceUrl`, and in `data/exams/README.md`. The page URLs have been stable for years, the direct file links less so.

## 8. Contract for `scripts/ingest/duo-provenance.ts` (to be implemented)

Until this exists the procedure above cannot be run end to end. Design it to match the exam script's conventions:

- CLI: exactly one of `--dry-run` / `--write`; reject unknown flags with a usage message (same as `exams.ts`).
- Read `data/schools.sample.json`, `data/duo/alle-vestigingen-vo.csv`, and `data/duo/leerlingen-vo-per-vestiging-YYYY.csv`.
  Keep the year and the source URLs in constants at the top of the file (they are the only things that change annually).
- Decode latin-1 vs UTF-8 as described in section 7. Fail on header mismatch, empty files, or duplicated `VESTIGINGSCODE`.
- Match by normalized address (section 3); apply manual mappings last; never match by name; never fall back to vestiging `00`.
- For each matched school produce `identity` (brin, websiteUrl with scheme, phone, street, houseNumber, postalCode, city), `education`
  (levels, denomination, keep concepts) and `enrolment` (size or null) facts. Do not overwrite `lat`/`lon` unless the address changed
  (then flag it, since coordinates need re-geocoding).
- Build provenance with `FIELD_GROUPS` entries (`sourceLabel`, `sourceUrl`, `dataYear`, `sourceUpdatedAt`, `importedAt`, `method: 'automatic'`, `authority: 'authoritative'`) and validate with `parseProvenance()`.
  Replace only the groups it owns, like `exams.ts` filters `fieldGroup !== 'results'`.
- Use `mergeFacts()` for the previous -> incoming comparison so the dry run reports `changed`, `removed`, `stale` and `regressing` exactly as the DB import will.
- Add the `admissions` provenance entry pointing at the kernprocedure URL (from `src/lib/admissions-priority.json`) so that all five groups are present.
- Write atomically (temp file + rename, and re-read the input to detect concurrent edits), as `exams.ts` does. In `--dry-run`, print a JSON summary
  (matched, unmatched with names, changes, warnings) and write nothing.
- Add an npm script (for example `"ingest:duo-provenance": "tsx scripts/ingest/duo-provenance.ts"`) and a unit test around the address normalizer and CSV decoding.
- Replace the stale `duo.ts` placeholder and the README "Data ingestion" section when this lands.

## 9. Quick reference

```bash
# Annual refresh, short version
# download vestigingen + leerlingen CSV from the DUO pages -> data/duo/
# edit year constants in scripts/ingest/duo-provenance.ts
npx tsx scripts/ingest/duo-provenance.ts --dry-run
npx tsx scripts/ingest/duo-provenance.ts --write

# exams (when a new release exists)
# edit year + timestamps in scripts/ingest/exams.ts, update data/exams/branch-mapping.json
npm run ingest:exams -- --dry-run && npm run ingest:exams -- --write

# admissions (when the kernprocedure changed)
# edit src/lib/admissions-info.ts, scripts/enrich-admissions-info.mjs, src/lib/admissions-priority.json
node scripts/enrich-admissions-info.mjs

# database
npm run ingest:sample -- --dry-run
npm run ingest:sample -- --file data/schools.sample.json
```

| File | Purpose |
| --- | --- |
| `data/duo/` | Raw DUO downloads (vestigingen, leerlingen per year) |
| `data/exams/` | Raw exam CSVs, `branch-mapping.json`, `ingestion-summary.json`, exam README |
| `data/schools.sample.json` | The school facts + provenance that every script reads and rewrites |
| `src/lib/data-provenance.ts` | Provenance types, validation, freshness, `mergeFacts` |
| `src/components/data-sources.tsx` | "Data & bronnen" UI |
| `scripts/ingest/import-schools.ts` | DB import (`npm run ingest:sample`) |
| `scripts/ingest/exams.ts`, `exam-results.ts`, `exams-db.ts` | Exam pipeline |
| `scripts/enrich-admissions-info.mjs`, `src/lib/admissions-info.ts`, `src/lib/admissions-priority.json` | Admissions text and kernprocedure reference |
