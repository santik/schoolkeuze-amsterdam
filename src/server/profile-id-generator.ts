import { randomInt } from "node:crypto";

import adjectives from "../../data/profile-id/adjectives.json";
import nouns from "../../data/profile-id/nouns.json";

function pick<T>(items: T[]): T {
  return items[randomInt(0, items.length)];
}

function toTitleCase(value: string) {
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1).toLowerCase();
}

export function generateProfileId() {
  const adjective = toTitleCase(String(pick(adjectives)));
  const noun = toTitleCase(String(pick(nouns)));
  const digits = randomInt(1000, 10000);
  return `${adjective}${noun}${digits}`;
}

