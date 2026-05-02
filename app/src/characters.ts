export type Character = { slug: string; displayName: string };

// STUB roster — to be replaced once `characters-roster.json` (full MKWorld
// roster) lands in the repo. Keep slug values URL-safe lowercase ASCII.
export const CHARACTERS: Character[] = [
  { slug: "mario", displayName: "Mario" },
  { slug: "luigi", displayName: "Luigi" },
  { slug: "peach", displayName: "Peach" },
  { slug: "bowser", displayName: "Bowser" },
];

export function isValidAvatarSlug(slug: string): boolean {
  return CHARACTERS.some((c) => c.slug === slug);
}
