export const PROFILE_ID_STORAGE_KEY = "schoolkeuze:profile:id:v1";

export function isValidProfileId(profileId: unknown): profileId is string {
  if (typeof profileId !== "string") return false;
  const trimmed = profileId.trim();
  if (!trimmed) return false;
  return trimmed.length <= 128;
}
