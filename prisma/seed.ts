// Seed and ingestion share provenance validation and preserve previous imports.
// Admissions must be supplied with matching provenance; generated prose must not
// silently replace a sourced annual record.
import { importSchools } from '../scripts/ingest/import-schools';

importSchools().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
