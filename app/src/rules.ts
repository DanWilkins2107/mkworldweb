export type RuleSection = {
  heading: string;
  items: string[];
};

export const RULES: RuleSection[] = [
  {
    heading: "Format",
    items: [
      "The tournament runs for 30 weeks.",
      "Each week, one track is picked at random for everyone to race on.",
      "At the end of the 30 weeks, we will do a 30 track VS race, and combine the scores with the time trial period to determine a winner",
    ],
  },
  {
    heading: "Racing",
    items: [
      "You get two attempts to run the track in time trials, submit your best time.",
      "Do not run against a ghost.",
      "You may not restart a run unless you have technical difficulties.",
    ],
  },
  {
    heading: "Scoring",
    items: [
      "Points per finishing position follow the Mario Kart Wii table: 1st = 15, 2nd = 12, 3rd = 10, 4th = 8, 5th = 7, 6th = 6, 7th = 5, 8th = 4, 9th = 3, 10th = 2, 11th = 1, 12th and below = 0.",
      "Tied times share the higher position and both receive that position's points.",
      "Players tied on overall points share the same overall position.",
      "Miss a week and you score 0 points for that week.",
    ],
  },
];
