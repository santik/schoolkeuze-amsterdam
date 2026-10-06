export type SearchableSchool = {
  name?: string | null;
  brin?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  concepts?: string[] | null;
};

// Lowercase, strip accents, turn punctuation into spaces and collapse Dutch
// postcodes ("1017 RV" -> "1017rv") so stored and typed forms compare equal.
export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
    .replaceAll(/\b(\d{4}) ([a-z]{2})\b/g, "$1$2")
    .trim();
}

export function searchTokens(query: string) {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

// Every query token must occur somewhere in the searchable fields, in any order.
export function matchesSchoolSearch(school: SearchableSchool, query: string) {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;
  const haystack = normalizeSearchText(
    [
      school.name,
      ...(school.concepts ?? []),
      school.street,
      school.houseNumber,
      school.postalCode,
      school.city,
      school.brin,
    ]
      .filter(Boolean)
      .join(" ")
  );
  return tokens.every((token) => haystack.includes(token));
}
