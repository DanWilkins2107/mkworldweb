export type Track = { slug: string; displayName: string };

export const TRACKS: Track[] = [
  { slug: "mario-bros-circuit", displayName: "Mario Bros. Circuit" },
  { slug: "crown-city", displayName: "Crown City" },
  { slug: "whistlestop-summit", displayName: "Whistlestop Summit" },
  { slug: "dk-spaceport", displayName: "DK Spaceport" },
  { slug: "desert-hills", displayName: "Desert Hills" },
  { slug: "shy-guy-bazaar", displayName: "Shy Guy Bazaar" },
  { slug: "wario-stadium", displayName: "Wario Stadium" },
  { slug: "airship-fortress", displayName: "Airship Fortress" },
  { slug: "dk-pass", displayName: "DK Pass" },
  { slug: "starview-peak", displayName: "Starview Peak" },
  { slug: "sky-high-sundae", displayName: "Sky-High Sundae" },
  { slug: "wario-shipyard", displayName: "Wario Shipyard" },
  { slug: "koopa-troopa-beach", displayName: "Koopa Troopa Beach" },
  { slug: "faraway-oasis", displayName: "Faraway Oasis" },
  { slug: "peach-beach", displayName: "Peach Beach" },
  { slug: "salty-salty-speedway", displayName: "Salty Salty Speedway" },
  { slug: "dino-dino-jungle", displayName: "Dino Dino Jungle" },
  { slug: "great-question-block-ruins", displayName: "Great ? Block Ruins" },
  { slug: "cheep-cheep-falls", displayName: "Cheep Cheep Falls" },
  { slug: "dandelion-depths", displayName: "Dandelion Depths" },
  { slug: "boo-cinema", displayName: "Boo Cinema" },
  { slug: "dry-bones-burnout", displayName: "Dry Bones Burnout" },
  { slug: "moo-moo-meadows", displayName: "Moo Moo Meadows" },
  { slug: "choco-mountain", displayName: "Choco Mountain" },
  { slug: "toads-factory", displayName: "Toad's Factory" },
  { slug: "bowsers-castle", displayName: "Bowser's Castle" },
  { slug: "acorn-heights", displayName: "Acorn Heights" },
  { slug: "mario-circuit", displayName: "Mario Circuit" },
  { slug: "peach-stadium", displayName: "Peach Stadium" },
  { slug: "rainbow-road", displayName: "Rainbow Road" },
];

export function isValidTrackSlug(slug: string): boolean {
  return TRACKS.some((t) => t.slug === slug);
}
