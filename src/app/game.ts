const SITUATIONS = [
  {
    text: "The group looks around their surroundings. Should the group search for water in the jungle or remain and stay by the wreckage?",
    optionA: { label: "Jungle", effects: { thirst: 20, energy: -10 } },
    optionB: {
      label: "Wreckage",
      effects: { energy: 15, resources: 10, thirst: -10 },
    },
  },
  {
    text: "You find a stream but it looks murky. Do you purify it using resources, or drink it as-is and save supplies?",
    optionA: {
      label: "Purify It",
      effects: { resources: -10, thirst: 20, health: 5 },
    },
    optionB: { label: "Drink Raw", effects: { thirst: 15, health: -10 } },
  },
  {
    text: "A group member spots fruit high up in the trees. Do you climb for food or forage on the ground?",
    optionA: {
      label: "Climb",
      effects: { energy: -10, health: 10, resources: 10 },
    },
    optionB: {
      label: "Forage",
      effects: { energy: -5, resources: 5, thirst: -5 },
    },
  },
  {
    text: "Night is falling. Should the group build a shelter using resources, or sleep in the open to conserve energy?",
    optionA: {
      label: "Build Shelter",
      effects: { resources: -15, energy: -5, health: 15 },
    },
    optionB: { label: "Sleep Outside", effects: { health: -10, energy: 10 } },
  },
  {
    text: "You discover a cave. Do you explore it for supplies, or set up camp at the entrance?",
    optionA: {
      label: "Explore",
      effects: { energy: -10, resources: 20, health: -5 },
    },
    optionB: { label: "Camp Here", effects: { energy: 10, health: 5 } },
  },
  {
    text: "A distant ship is spotted on the horizon. Do you light a signal fire using resources, or conserve and hope they see you?",
    optionA: {
      label: "Signal Fire",
      effects: { resources: -15, energy: -5, health: 5 },
    },
    optionB: { label: "Wait & Hope", effects: { thirst: -5, energy: 5 } },
  },
];

const CRISES = [
  {
    text: "A fierce storm is approaching. The group needs volunteers to build an emergency barrier to protect everyone.",
    peopleNeeded: 7,
    optionA: {
      label: "We have enough!",
      sublabel: "SUCCESS",
      effects: { resources: -10, energy: -5 },
    },
    optionB: {
      label: "We don't...",
      sublabel: "FAILURE",
      effects: { resources: -20, energy: -10, health: -10 },
    },
  },
  {
    text: "A venomous snake bit a group member! You need volunteers to search for medicinal herbs in the jungle.",
    peopleNeeded: 5,
    optionA: {
      label: "We have enough!",
      sublabel: "SUCCESS",
      effects: { energy: -10, resources: -5 },
    },
    optionB: {
      label: "We don't...",
      sublabel: "FAILURE",
      effects: { health: -20, energy: -10 },
    },
  },
  {
    text: "The water source has dried up! You need a search party of volunteers to trek inland and find a new one.",
    peopleNeeded: 6,
    optionA: {
      label: "We have enough!",
      sublabel: "SUCCESS",
      effects: { energy: -10, thirst: -5 },
    },
    optionB: {
      label: "We don't...",
      sublabel: "FAILURE",
      effects: { thirst: -20, health: -10, energy: -5 },
    },
  },
];

const THINKING_QUESTIONS = [
  "How did you decide on which stat to prioritise? Would you change any decisions now? Why?",
  "How did communication and teamwork play in your group's survival?",
  "How did unexpected crises change your decision making?",
];
