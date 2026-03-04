export type StatKey = "hp" | "en" | "res" | "water";
export type Stats = Record<StatKey, number>;
export type Delta = Partial<Record<StatKey, number>>;

export type CardBase = {
  id: string;
  title: string;
  prompt: string;
  tag: "Teamwork" | "Communication" | "Decision" | "Resource";
};

export type SituationCard = CardBase & {
  kind: "situation";
  a: { label: string; delta: Delta; outcome: string };
  b: { label: string; delta: Delta; outcome: string };
};

export type CrisisCard = CardBase & {
  kind: "crisis";
  requirementText: string; // shown to class
  success: { delta: Delta; outcome: string };
  fail: { delta: Delta; outcome: string };
};

export type Card = SituationCard | CrisisCard;

/**
 * Rebalancing goals (start at 50):
 * - Early choices: +/- 4 to 10 (mostly one stat, sometimes two)
 * - Mid: introduce bigger swings (up to ~12)
 * - Crises: bigger punishments (up to ~16), but not constant
 * - Avoid always “swap” symmetry; include safer-but-slower options
 */
export const SITUATIONS: SituationCard[] = [
  {
    id: "s1",
    kind: "situation",
    tag: "Decision",
    title: "Situation: First Move",
    prompt:
      "You wake near the wreckage. The sun is rising fast. You need water soon—what’s the move?",
    a: {
      label: "Head into the jungle",
      delta: { water: +10, en: -7 },
      outcome:
        "You push into the jungle. It’s exhausting, but you find damp leaves and a small trickle of water.",
    },
    b: {
      label: "Search the wreckage area",
      delta: { res: +8, water: -6 },
      outcome:
        "You salvage useful supplies, but thirst builds—water is still a problem.",
    },
  },
  {
    id: "s2",
    kind: "situation",
    tag: "Resource",
    title: "Situation: Shelter vs Supplies",
    prompt:
      "Night is coming. You can build now or save supplies and risk the cold.",
    a: {
      label: "Build a shelter now",
      delta: { hp: +7, res: -9 },
      outcome:
        "You build a basic shelter. Safer tonight, but you burn through supplies.",
    },
    b: {
      label: "Hide in a cave, save supplies",
      delta: { res: +6, hp: -8 },
      outcome:
        "You conserve supplies, but the cave is harsh. Stress and minor injuries add up.",
    },
  },
  {
    id: "s3",
    kind: "situation",
    tag: "Decision",
    title: "Situation: The Murky Pond",
    prompt:
      "You find a murky pond. Drinking helps now… but it might make someone sick.",
    a: {
      label: "Drink the water",
      delta: { water: +9, hp: -12 },
      outcome:
        "You drink. Thirst improves fast, but stomach pain hits later. Health drops hard.",
    },
    b: {
      label: "Don’t drink—keep searching",
      delta: { water: -4, en: -6, hp: +4 },
      outcome:
        "You avoid illness, but the search drains you and thirst still hurts.",
    },
  },
  {
    id: "s4",
    kind: "situation",
    tag: "Resource",
    title: "Situation: Food Run",
    prompt:
      "You spot fruit trees deeper in the jungle. Going could refill supplies, but it costs energy.",
    a: {
      label: "Forage for fruit",
      delta: { res: +10, en: -8 },
      outcome:
        "You gather fruit and edible plants. Supplies rise, but you’re exhausted.",
    },
    b: {
      label: "Stay and rest",
      delta: { en: +9, res: -7 },
      outcome: "You recover energy, but supplies run low. Hunger grows.",
    },
  },
  {
    id: "s5",
    kind: "situation",
    tag: "Decision",
    title: "Situation: Driftwood in Strong Current",
    prompt:
      "Driftwood floats past—useful for tools and fire. The current looks dangerous.",
    a: {
      label: "Enter the water to grab driftwood",
      delta: { res: +9, hp: -9 },
      outcome:
        "You secure useful wood, but someone gets scraped and bruised in the waves.",
    },
    b: {
      label: "Don’t risk it",
      delta: { res: -4, hp: +4 },
      outcome:
        "You avoid injury, but you miss a valuable chance to upgrade supplies.",
    },
  },
  {
    id: "s6",
    kind: "situation",
    tag: "Resource",
    title: "Situation: Coconut Grove",
    prompt: "You find coconuts—water + food. Collecting them is tiring work.",
    a: {
      label: "Collect coconuts",
      delta: { water: +8, res: +4, en: -9 },
      outcome:
        "You crack coconuts and share them. Water and supplies improve, but it’s hard work.",
    },
    b: {
      label: "Conserve energy and move on",
      delta: { en: +6, water: -7 },
      outcome: "You save energy now, but thirst becomes urgent again.",
    },
  },
  {
    id: "s7",
    kind: "situation",
    tag: "Communication",
    title: "Situation: Disagreement",
    prompt:
      "Tension rises. People argue over what to do next. Do you slow down to align, or push forward anyway?",
    a: {
      label: "Pause to talk it out",
      delta: { hp: +5, en: -5 },
      outcome:
        "You calm down, agree on a plan, and reduce stress—at the cost of time and energy.",
    },
    b: {
      label: "Ignore conflict and push forward",
      delta: { res: +6, hp: -9 },
      outcome:
        "You move faster, but distrust builds. Stress and mistakes hurt the group.",
    },
  },
  {
    id: "s8",
    kind: "situation",
    tag: "Decision",
    title: "Situation: Planes Overhead",
    prompt:
      "You hear engines—planes overhead. This might be your best rescue window.",
    a: {
      label: "Build a signal fire",
      delta: { hp: +7, res: -10, en: -4 },
      outcome:
        "You build a signal fire. It costs supplies, but hope rises—rescue feels possible.",
    },
    b: {
      label: "Save supplies and stay hidden",
      delta: { res: +5, hp: -8 },
      outcome:
        "You conserve supplies, but you miss the best rescue chance. Morale and health slip.",
    },
  },
  {
    id: "s9",
    kind: "situation",
    tag: "Resource",
    title: "Situation: Rest Day",
    prompt:
      "You’re drained. Do you take a rest day, or keep working to stock up?",
    a: {
      label: "Rest",
      delta: { en: +12, hp: +4, water: -5, res: -6 },
      outcome:
        "You recover well, but supplies and water shrink while you rest.",
    },
    b: {
      label: "Push for supplies",
      delta: { res: +11, water: +4, en: -12, hp: -5 },
      outcome: "You stock up, but you’re exhausted and more prone to injury.",
    },
  },
];

export const CRISES: CrisisCard[] = [
  {
    id: "c1",
    kind: "crisis",
    tag: "Teamwork",
    title: "CRISIS: Storm Incoming",
    prompt:
      "A fierce storm hits suddenly. You must reinforce your shelter NOW.",
    requirementText: "Need 7 volunteers in 5 seconds to reinforce the shelter!",
    success: {
      delta: { res: -8, en: -6 },
      outcome:
        "You reinforce the shelter in time. You lose some supplies and energy—but you stay safe.",
    },
    fail: {
      delta: { hp: -14, res: -10, en: -6 },
      outcome:
        "The storm tears through your camp. People get hurt and supplies are damaged.",
    },
  },
  {
    id: "c2",
    kind: "crisis",
    tag: "Teamwork",
    title: "CRISIS: Wild Boars",
    prompt:
      "Wild boars charge toward your camp. Defend your supplies or lose everything!",
    requirementText: "Need 6 volunteers in 5 seconds to defend the shelter!",
    success: {
      delta: { hp: -8, res: -6 },
      outcome:
        "You scare them off, but someone gets knocked down and supplies are scattered.",
    },
    fail: {
      delta: { res: -14, hp: -12 },
      outcome:
        "They raid your camp. Supplies are destroyed and injuries mount.",
    },
  },
  {
    id: "c3",
    kind: "crisis",
    tag: "Communication",
    title: "CRISIS: Group Rift",
    prompt:
      "Arguments explode into a rift. If you don’t mediate, the group falls apart.",
    requirementText: "Need 4 volunteers in 5 seconds to mediate the conflict!",
    success: {
      delta: { hp: +5, en: -6 },
      outcome:
        "You calm everyone down and restore trust—at the cost of energy and time.",
    },
    fail: {
      delta: { hp: -13, en: -8 },
      outcome:
        "The group fractures. Bad decisions follow. Stress wrecks your health.",
    },
  },
  {
    id: "c4",
    kind: "crisis",
    tag: "Resource",
    title: "CRISIS: Sudden Illness",
    prompt:
      "Several people fall ill. If you don’t care for them, things get worse fast.",
    requirementText: "Need 6 volunteers in 5 seconds to care for the sick!",
    success: {
      delta: { res: -7, en: -6, hp: +4 },
      outcome:
        "You spend supplies and energy, but prevent the illness from spreading.",
    },
    fail: {
      delta: { hp: -16, en: -8 },
      outcome: "The illness spreads. Health collapses and the group weakens.",
    },
  },
];
