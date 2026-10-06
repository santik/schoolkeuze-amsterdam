/** Stable public provenance contract. Dates are ISO timestamps; years may be school years. */
export const FIELD_GROUPS = ['identity', 'enrolment', 'education', 'results', 'admissions'] as const;
export type FieldGroup = typeof FIELD_GROUPS[number];
export type DataProvenance = {
  fieldGroup: FieldGroup;
  dataYear: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceUpdatedAt: string | null;
  importedAt: string;
  verifiedAt: string | null;
  method: 'automatic' | 'manual';
  authority: 'authoritative' | 'fallback';
};
export const FACT_FIELDS: Record<FieldGroup, readonly string[]> = {
  identity: ['brin', 'name', 'websiteUrl', 'phone', 'street', 'houseNumber', 'postalCode', 'city', 'lat', 'lon'],
  enrolment: ['size'],
  education: ['levels', 'concepts', 'denomination'],
  results: ['results'],
  admissions: ['admissions', 'admissionsInfo'],
};
export const FRESHNESS_YEARS = { enrolment: 1, results: 1 };
function yearEnd(year: string) {
  const normalized = year.trim().replaceAll('–', '-');
  if (!/^\d{4}(-\d{4})?$/.test(normalized)) throw new Error('Invalid dataYear');
  const [start, end = start] = normalized.split('-').map(Number);
  if (start < 1900 || start > 2200 || end < start || end > start + 1) throw new Error('Invalid dataYear range');
  return end;
}
export function normalizeSourceUrl(value: string): string {
  const url = new URL(value.trim());
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Source URL must be HTTP(S) without credentials');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || ['fbclid', 'gclid'].includes(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}
function timestamp(value: unknown, nullable: boolean): string | null {
  if (value === null && nullable) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Invalid provenance timestamp');
  return new Date(value).toISOString();
}
export function parseProvenance(value: unknown): DataProvenance[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('Provenance must be an array');
  const seen = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid provenance entry');
    const p = entry as DataProvenance;
    if (!FIELD_GROUPS.includes(p.fieldGroup) || seen.has(p.fieldGroup)) throw new Error('Unknown or duplicate provenance category');
    seen.add(p.fieldGroup);
    if (typeof p.dataYear !== 'string') throw new Error('Missing dataYear');
    yearEnd(p.dataYear);
    if (typeof p.sourceLabel !== 'string' || !p.sourceLabel.trim() || typeof p.sourceUrl !== 'string') throw new Error('Missing sourceLabel/sourceUrl');
    if (!['automatic', 'manual'].includes(p.method) || !['authoritative', 'fallback'].includes(p.authority)) throw new Error('Missing method/authority');
    const verifiedAt = timestamp(p.verifiedAt, true);
    if (p.method === 'manual' && !verifiedAt) throw new Error('Manual provenance requires verifiedAt');
    return {
      fieldGroup: p.fieldGroup, dataYear: p.dataYear.trim().replaceAll('–', '-'),
      sourceLabel: p.sourceLabel.trim(), sourceUrl: normalizeSourceUrl(p.sourceUrl),
      sourceUpdatedAt: timestamp(p.sourceUpdatedAt, true), importedAt: timestamp(p.importedAt, false)!,
      verifiedAt, method: p.method, authority: p.authority,
    };
  });
}
export function readProvenance(value: unknown): DataProvenance[] {
  // A broken category must not hide valid metadata belonging to other categories.
  if (!Array.isArray(value)) return [];
  return FIELD_GROUPS.flatMap(group => {
    const entries = value.filter(p => p?.fieldGroup === group);
    try { return parseProvenance(entries); } catch { return []; }
  });
}
export function freshness(p: DataProvenance, now = new Date()): 'current' | 'stale' | 'evergreen' {
  if (p.fieldGroup === 'identity' || p.fieldGroup === 'education') return 'evergreen';
  const end = yearEnd(p.dataYear);
  if (p.fieldGroup === 'admissions') {
    const expires = p.dataYear.includes('-') || p.dataYear.includes('–')
      ? Date.UTC(end, 8, 1) : Date.UTC(end + 1, 0, 1);
    return now.getTime() >= expires ? 'stale' : 'current';
  }
  return now.getUTCFullYear() - end > FRESHNESS_YEARS[p.fieldGroup] ? 'stale' : 'current';
}
export type ImportIssue = { kind: 'missing' | 'stale' | 'regressing' | 'removed' | 'changed'; fieldGroup: FieldGroup; field?: string };
export type FactRecord = Record<string, unknown> & { provenance?: unknown };
function populated(value: unknown) {
  return value != null && value !== '' && (!Array.isArray(value) || value.length > 0);
}
export function missingProvenance(record: FactRecord): FieldGroup[] {
  const provenance = readProvenance(record.provenance);
  return FIELD_GROUPS.filter(group => FACT_FIELDS[group].some(field => populated(record[field])) && !provenance.some(p => p.fieldGroup === group));
}
function regresses(previous: DataProvenance, next: DataProvenance) {
  if (yearEnd(next.dataYear) < yearEnd(previous.dataYear)) return true;
  if (previous.sourceUpdatedAt && next.sourceUpdatedAt) {
    const difference = Date.parse(next.sourceUpdatedAt) - Date.parse(previous.sourceUpdatedAt);
    if (difference !== 0) return difference < 0;
  } else if (yearEnd(next.dataYear) === yearEnd(previous.dataYear) && previous.sourceUpdatedAt) return true;
  return yearEnd(next.dataYear) === yearEnd(previous.dataYear)
    && previous.authority === 'authoritative' && next.authority === 'fallback';
}
export function mergeFacts(previous: FactRecord, incoming: FactRecord, now = new Date()) {
  const nextProvenance = parseProvenance(incoming.provenance);
  const oldProvenance = readProvenance(previous.provenance);
  const data: FactRecord = { ...previous };
  const provenance = [...oldProvenance];
  const report: ImportIssue[] = [];
  for (const group of FIELD_GROUPS) {
    const fields = FACT_FIELDS[group].filter(field => Object.hasOwn(incoming, field) && incoming[field] !== undefined);
    const next = nextProvenance.find(p => p.fieldGroup === group);
    if (!fields.length) {
      if (next) throw new Error(`${group}: provenance without facts`);
      continue;
    }
    if (!next) throw new Error(`${group}: missing provenance (dataYear, sourceLabel, sourceUrl required)`);
    const old = oldProvenance.find(p => p.fieldGroup === group);
    if (freshness(next, now) === 'stale') report.push({ kind: 'stale', fieldGroup: group });
    if (old && regresses(old, next)) {
      report.push({ kind: 'regressing', fieldGroup: group });
      continue;
    }
    // Group metadata cannot silently re-date omitted populated facts.
    if (old && JSON.stringify({...old, importedAt:''}) !== JSON.stringify({...next, importedAt:''})
        && FACT_FIELDS[group].some(field => populated(previous[field]) && !fields.includes(field))) {
      throw new Error(`${group}: changed provenance requires all previously populated facts`);
    }
    for (const field of fields) {
      if (populated(previous[field]) && !populated(incoming[field])) report.push({kind:'removed', fieldGroup:group, field});
      else if (JSON.stringify(previous[field]) !== JSON.stringify(incoming[field])) report.push({kind:'changed', fieldGroup:group, field});
      data[field] = incoming[field];
    }
    const index = provenance.findIndex(p => p.fieldGroup === group);
    const accepted = { ...next, importedAt: now.toISOString() };
    if (index < 0) provenance.push(accepted); else provenance[index] = accepted;
  }
  data.provenance = provenance;
  for (const group of missingProvenance(data)) report.push({kind:'missing', fieldGroup:group});
  return {data, report};
}
