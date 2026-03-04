"use client";

import Image from "next/image";
import {
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";

// ============================================================
// TYPES
// ============================================================

type StatKey = "health" | "energy" | "resources" | "thirst";
type Stats = Record<StatKey, number>;
type Effects = Partial<Stats>;

interface StatMetaEntry {
  emoji: string;
  color: string;
  label: string;
}

interface Option {
  label: string;
  effects: Effects;
  sublabel?: string;
}

interface Situation {
  text: string;
  optionA: Option;
  optionB: Option;
}

interface Crisis {
  text: string;
  peopleNeeded: number;
  optionA: Option & { sublabel: string };
  optionB: Option & { sublabel: string };
}

interface Phase {
  type:
    | "title"
    | "howtoplay"
    | "situation"
    | "crisis_intro"
    | "crisis"
    | "ending"
    | "thinking"
    | "learning";
  index?: number;
}

// ============================================================
// GAME DATA (BALANCED)
// ============================================================

const STAT_KEYS: StatKey[] = ["health", "energy", "resources", "thirst"];

const INITIAL_STATS: Stats = {
  health: 50,
  energy: 50,
  resources: 50,
  thirst: 50,
};

const STAT_META: Record<StatKey, StatMetaEntry> = {
  health: { emoji: "❤️", color: "#4CAF50", label: "Health" },
  energy: { emoji: "⚡", color: "#FFC107", label: "Energy" },
  resources: { emoji: "🎒", color: "#E53935", label: "Resources" },
  thirst: { emoji: "💧", color: "#2196F3", label: "Thirst" },
};

const SITUATIONS: Situation[] = [
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

const CRISES: Crisis[] = [
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

const THINKING_QUESTIONS: string[] = [
  "How did you decide on which stat to prioritise? Would you change any decisions now? Why?",
  "How did communication and teamwork play in your group's survival?",
  "How did unexpected crises change your decision making?",
];

const LEARNING_POINTS: { icon: string; text: string }[] = [
  { icon: "🤝", text: "Teamwork & Cooperation" },
  { icon: "💬", text: "Trust & Communication" },
  { icon: "🧭", text: "Decision Making" },
  { icon: "📦", text: "Resource Management" },
];

// ============================================================
// PHASE ORDER
// ============================================================

function buildPhaseOrder(): Phase[] {
  const phases: Phase[] = [];
  phases.push({ type: "title" });
  phases.push({ type: "howtoplay" });
  let crisisIdx = 0;
  for (let i = 0; i < SITUATIONS.length; i++) {
    phases.push({ type: "situation", index: i });
    if ((i + 1) % 2 === 0 && crisisIdx < CRISES.length) {
      phases.push({ type: "crisis_intro", index: crisisIdx });
      phases.push({ type: "crisis", index: crisisIdx });
      crisisIdx++;
    }
  }
  phases.push({ type: "ending" });
  phases.push({ type: "thinking" });
  phases.push({ type: "learning" });
  return phases;
}

const PHASES = buildPhaseOrder();

// ============================================================
// UTILITY
// ============================================================

function computeNewStats(oldStats: Stats, effects: Effects): Stats {
  const n = { ...oldStats };
  (Object.entries(effects) as [StatKey, number][]).forEach(([s, v]) => {
    n[s] = Math.max(0, Math.min(100, n[s] + v));
  });
  return n;
}

const font = (weight: number = 700, size: number = 16): CSSProperties => ({
  fontFamily: "'Nunito', sans-serif",
  fontWeight: weight,
  fontSize: size,
});

// ============================================================
// BIG BAR CHART
// ============================================================

interface StatsChartProps {
  stats: Stats;
  size?: "large" | "small";
}

function StatsChart({ stats, size = "large" }: StatsChartProps) {
  const isLarge = size === "large";
  const barH = isLarge ? 40 : 28;
  const gap = isLarge ? 18 : 10;
  const labelW = isLarge ? 120 : 90;
  const valW = isLarge ? 54 : 40;
  const fs = isLarge ? 16 : 13;
  const valFs = isLarge ? 22 : 16;
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const totalH = STAT_KEYS.length * (barH + gap) + gap;

  return (
    <div
      style={{
        background: "white",
        borderRadius: isLarge ? 18 : 12,
        padding: isLarge ? "28px 24px 20px" : "16px 14px 12px",
        boxShadow: "0 4px 28px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.05)",
        width: "100%",
      }}
    >
      <div
        style={{ position: "relative", height: totalH + (isLarge ? 28 : 18) }}
      >
        {ticks.map((v) => {
          const isDanger = v === 10;
          return (
            <div
              key={v}
              style={{
                position: "absolute",
                left: labelW,
                right: valW,
                top: 0,
                height: totalH,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: `${v}%`,
                  top: 0,
                  bottom: 0,
                  width: isDanger ? 2 : 1,
                  background: isDanger
                    ? "rgba(229,57,53,0.25)"
                    : "rgba(0,0,0,0.06)",
                  borderLeft: isDanger
                    ? "2px dashed rgba(229,57,53,0.45)"
                    : "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: `${v}%`,
                  bottom: -(isLarge ? 22 : 16),
                  transform: "translateX(-50%)",
                  fontSize: isLarge ? 12 : 9,
                  fontFamily: "'Nunito', sans-serif",
                  color: isDanger ? "#e53935" : "#aaa",
                  fontWeight: isDanger ? 800 : 400,
                }}
              >
                {v}
              </div>
            </div>
          );
        })}
        {STAT_KEYS.map((stat, i) => {
          const meta = STAT_META[stat];
          const value = stats[stat];
          const y = gap + i * (barH + gap);
          const isDanger = value <= 10;
          return (
            <div
              key={stat}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: y,
                height: barH,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: labelW,
                  textAlign: "right" as const,
                  paddingRight: 14,
                  ...font(800, fs),
                  color: isDanger ? "#e53935" : "#3a2a14",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 6,
                  whiteSpace: "nowrap" as const,
                }}
              >
                {meta.label}{" "}
                <span style={{ fontSize: fs + 2 }}>{meta.emoji}</span>
              </div>
              <div
                style={{
                  flex: 1,
                  height: barH,
                  marginRight: valW,
                  background: "rgba(0,0,0,0.04)",
                  borderRadius: barH / 2,
                  overflow: "hidden",
                  position: "relative" as const,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(0, Math.min(100, value))}%`,
                    background: isDanger
                      ? `repeating-linear-gradient(45deg, ${meta.color}, ${meta.color} 6px, ${meta.color}aa 6px, ${meta.color}aa 12px)`
                      : `linear-gradient(90deg, ${meta.color}bb, ${meta.color})`,
                    borderRadius: barH / 2,
                    transition: "width 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: isDanger
                      ? `0 0 14px ${meta.color}55`
                      : `0 2px 10px ${meta.color}30`,
                    animation: isDanger ? "pulse 1.5s infinite" : "none",
                  }}
                />
              </div>
              <div
                style={{
                  position: "absolute" as const,
                  right: 0,
                  width: valW,
                  textAlign: "center" as const,
                  ...font(900, valFs),
                  color: isDanger ? "#e53935" : meta.color,
                }}
              >
                {value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// SMALL COMPONENTS
// ============================================================

function EffectBadge({ stat, value }: { stat: StatKey; value: number }) {
  const meta = STAT_META[stat];
  if (!value || value === 0) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        ...font(800, 17),
        color: value > 0 ? "#2e7d32" : "#c62828",
      }}
    >
      {value > 0 ? "+" : ""}
      {value} {meta.emoji}
    </span>
  );
}

interface OptionButtonProps {
  label: string;
  sublabel?: string | null;
  letter: string;
  color: string;
  effects: Effects;
  onClick: () => void;
  disabled: boolean;
  selected: boolean;
  showEffects: boolean;
}

function OptionButton({
  label,
  sublabel,
  letter,
  color,
  effects,
  onClick,
  disabled,
  selected,
  showEffects,
}: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "22px 28px",
        background: selected ? `${color}12` : "rgba(255,255,255,0.95)",
        border: selected ? `3px solid ${color}` : "2px solid rgba(0,0,0,0.07)",
        borderRadius: 20,
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.3s ease",
        opacity: disabled && !selected ? 0.3 : 1,
        transform: selected ? "scale(1.03)" : "scale(1)",
        boxShadow: selected
          ? `0 8px 28px ${color}28`
          : "0 4px 16px rgba(0,0,0,0.05)",
        minWidth: 190,
        flex: "1 1 190px",
        maxWidth: 260,
      }}
      onMouseOver={(e: ReactMouseEvent<HTMLButtonElement>) => {
        if (!disabled) e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseOut={(e: ReactMouseEvent<HTMLButtonElement>) => {
        if (!disabled)
          e.currentTarget.style.transform = selected ? "scale(1.03)" : "";
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: color,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...font(900, 22),
          boxShadow: `0 4px 14px ${color}44`,
        }}
      >
        {letter}
      </div>
      <span style={{ ...font(800, 20), color: "#3a2a14" }}>{label}</span>
      {sublabel && (
        <span
          style={{
            ...font(900, 13),
            color: sublabel === "SUCCESS" ? "#2e7d32" : "#c62828",
            background: sublabel === "SUCCESS" ? "#e8f5e9" : "#ffebee",
            padding: "3px 14px",
            borderRadius: 8,
          }}
        >
          {sublabel}
        </span>
      )}
      {showEffects && (
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {(Object.entries(effects) as [StatKey, number][]).map(([s, v]) => (
            <EffectBadge key={s} stat={s} value={v} />
          ))}
        </div>
      )}
    </button>
  );
}

// ============================================================
// ISLAND BACKGROUND
// ============================================================

function IslandBackground({ dark }: { dark: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: dark
            ? "linear-gradient(180deg, #1a2332 0%, #2d3e50 40%, #3a4f63 100%)"
            : "linear-gradient(180deg, #a8e0ff 0%, #c5edff 40%, #daf2ff 100%)",
        }}
      />
      {!dark && (
        <div
          style={{
            position: "absolute",
            top: 35,
            right: "14%",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "radial-gradient(circle, #FFD54F 30%, #FFB300 100%)",
            boxShadow: "0 0 60px #FFD54F88",
          }}
        />
      )}
      {!dark ? (
        <>
          <div
            style={{
              position: "absolute",
              top: 55,
              left: "58%",
              width: 160,
              height: 50,
              borderRadius: 40,
              background: "rgba(255,255,255,0.75)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 40,
              left: "62%",
              width: 90,
              height: 40,
              borderRadius: 30,
              background: "rgba(255,255,255,0.85)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 85,
              left: "22%",
              width: 120,
              height: 38,
              borderRadius: 30,
              background: "rgba(255,255,255,0.5)",
            }}
          />
        </>
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              top: 40,
              left: "8%",
              width: 200,
              height: 70,
              borderRadius: 40,
              background: "rgba(20,30,45,0.6)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 25,
              left: "65%",
              width: 220,
              height: 75,
              borderRadius: 40,
              background: "rgba(20,30,45,0.5)",
            }}
          />
        </>
      )}
      <svg
        style={{
          position: "absolute",
          bottom: 0,
          left: "-5%",
          width: "110%",
          zIndex: 2,
        }}
        viewBox="0 0 1440 180"
        preserveAspectRatio="none"
      >
        <path
          fill="#fbe5bb"
          d="M0,100L80,92C160,84,320,72,480,80C640,88,800,112,960,118C1120,124,1280,108,1360,98L1440,88L1440,180L0,180Z"
        />
      </svg>
      <svg
        style={{
          position: "absolute",
          bottom: 0,
          left: "-5%",
          width: "110%",
          zIndex: 1,
        }}
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
      >
        <path
          fill={dark ? "#1a3a5c" : "#3d8ab8"}
          fillOpacity="0.7"
          d="M0,30L60,40C120,50,240,70,360,75C480,80,600,70,720,60C840,50,960,40,1080,45C1200,50,1320,70,1380,80L1440,90L1440,100L0,100Z"
        />
      </svg>
      <div className="h-100 fixed left-0 bottom-10 z-30">
        <Image
          src="/palmtree.png"
          width={200}
          height={200}
          alt="palmtree"
          className="w-full h-full aspect-200/267 object-contain palmSway"
        />
      </div>
      <div className="h-80 fixed right-10 bottom-15 z-10 -scale-x-100 rotate-20">
        <Image
          src="/palmtree.png"
          width={200}
          height={200}
          alt="palmtree"
          className="w-full h-full aspect-200/267 object-contain palmSway"
        />
      </div>
      <div className="h-50 fixed right-0 rotate-30 bottom-10 z-10 -scale-x-100">
        <Image
          src="/palmtree.png"
          width={200}
          height={200}
          alt="palmtree"
          className="w-full h-full aspect-200/267 object-contain palmSway"
        />
      </div>
    </div>
  );
}

// ============================================================
// SHARED LAYOUT
// ============================================================

function Card({
  children,
  maxWidth = 700,
  animation = "fadeInUp 0.6s ease",
}: {
  children: ReactNode;
  maxWidth?: number;
  animation?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        position: "relative",
        zIndex: 10,
        padding: "20px 16px",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.93)",
          backdropFilter: "blur(16px)",
          borderRadius: 24,
          padding: "32px 36px",
          maxWidth,
          width: "100%",
          boxShadow: "0 12px 48px rgba(0,0,0,0.1)",
          animation,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ContinueBtn({
  onClick,
  label = "Continue →",
  gradient = "linear-gradient(135deg, #e65100, #ff8f00)",
}: {
  onClick: () => void;
  label?: string;
  gradient?: string;
}) {
  return (
    <div style={{ textAlign: "center", marginTop: 22 }}>
      <button
        onClick={onClick}
        style={{
          padding: "14px 42px",
          fontSize: 18,
          ...font(800),
          color: "white",
          background: gradient,
          border: "none",
          borderRadius: 50,
          cursor: "pointer",
          boxShadow: "0 4px 18px rgba(0,0,0,0.15)",
          transition: "all 0.3s ease",
        }}
        onMouseOver={(e: ReactMouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
        }}
        onMouseOut={(e: ReactMouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.transform = "";
        }}
      >
        {label}
      </button>
    </div>
  );
}

// ============================================================
// SCREEN: TITLE
// ============================================================

function TitleScreen({ onNext }: { onNext: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        position: "relative",
        zIndex: 10,
        padding: 20,
      }}
    >
      <div style={{ textAlign: "center", animation: "fadeInDown 1s ease" }}>
        <h1
          style={{
            fontFamily: "'Pacifico', cursive",
            fontSize: "clamp(52px, 11vw, 100px)",
            color: "#6d4c1d",
            textShadow:
              "3px 3px 0 rgba(255,255,255,0.4), 0 8px 24px rgba(0,0,0,0.15)",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Stranded
        </h1>
        <p
          style={{
            fontFamily: "'Pacifico', cursive",
            fontSize: "clamp(22px, 4.5vw, 38px)",
            color: "#005870",
            marginTop: 8,
            textShadow: "1px 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          Will You Survive?
        </p>
      </div>
      <button
        onClick={onNext}
        style={{
          marginTop: 48,
          padding: "16px 52px",
          ...font(800, 21),
          color: "white",
          background: "linear-gradient(135deg, #e65100, #ff8f00)",
          border: "none",
          borderRadius: 50,
          cursor: "pointer",
          boxShadow: "0 6px 28px rgba(230,81,0,0.35)",
          transition: "all 0.3s ease",
          animation: "fadeInUp 1.2s ease",
        }}
        onMouseOver={(e: ReactMouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
        }}
        onMouseOut={(e: ReactMouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.transform = "";
        }}
      >
        Start Game 🏝️
      </button>
    </div>
  );
}

// ============================================================
// SCREEN: HOW TO PLAY (simplified for P5/P6 kids)
// ============================================================

function HowToPlayScreen({ onNext }: { onNext: () => void }) {
  const ruleCards: {
    icon: string;
    title: string;
    desc: string;
    color: string;
  }[] = [
    {
      icon: "🎯",
      title: "Goal",
      desc: "Keep all 4 stats above 10 to survive!",
      color: "#e65100",
    },
    {
      icon: "🅰️🅱️",
      title: "Choose A or B",
      desc: "Each round, pick an option. It will change your stats!",
      color: "#5c7cfa",
    },
    {
      icon: "🗣️",
      title: "Spokesperson",
      desc: "One person explains your group's choice. Take turns!",
      color: "#00796b",
    },
    {
      icon: "⚠️",
      title: "Crisis!",
      desc: "Surprise events need volunteers. Can your team step up?",
      color: "#d84315",
    },
  ];

  return (
    <Card maxWidth={700}>
      <h2
        style={{
          fontFamily: "'Pacifico', cursive",
          fontSize: 42,
          color: "#005870",
          textAlign: "center",
          margin: "0 0 10px",
        }}
      >
        How To Play
      </h2>

      <p
        style={{
          textAlign: "center",
          ...font(700, 16),
          color: "#666",
          marginBottom: 24,
        }}
      >
        Your group is stranded on an island. Work together to survive!
      </p>

      {/* Stat icons row */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 28,
        }}
      >
        {STAT_KEYS.map((s) => {
          const m = STAT_META[s];
          return (
            <div
              key={s}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                background: `${m.color}12`,
                border: `2px solid ${m.color}33`,
                borderRadius: 16,
                padding: "12px 18px",
                minWidth: 100,
              }}
            >
              <span style={{ fontSize: 32 }}>{m.emoji}</span>
              <span style={{ ...font(800, 15), color: m.color }}>
                {m.label}
              </span>
              <span style={{ ...font(900, 20), color: "#3a2a14" }}>50</span>
            </div>
          );
        })}
      </div>

      {/* Danger line callout */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 24,
          background: "#ffebee",
          borderRadius: 14,
          padding: "10px 20px",
          border: "2px solid #ef9a9a",
        }}
      >
        <span style={{ ...font(900, 18), color: "#c62828" }}>
          ⚠️ If any stat drops to 0 — Game Over!
        </span>
      </div>

      {/* Rule cards — 2x2 grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {ruleCards.map((card) => (
          <div
            key={card.title}
            style={{
              background: `${card.color}08`,
              border: `2px solid ${card.color}22`,
              borderRadius: 16,
              padding: "16px 14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 6 }}>{card.icon}</div>
            <div
              style={{ ...font(900, 16), color: card.color, marginBottom: 4 }}
            >
              {card.title}
            </div>
            <div
              style={{ ...font(600, 14), color: "#3a2a14", lineHeight: 1.4 }}
            >
              {card.desc}
            </div>
          </div>
        ))}
      </div>

      {/* How choices work — visual example */}
      <div
        style={{
          background: "rgba(0,88,112,0.04)",
          borderRadius: 16,
          padding: "16px 20px",
          border: "1px solid rgba(0,88,112,0.1)",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            ...font(800, 15),
            color: "#005870",
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          Example: Your choice changes the stats like this
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ ...font(800, 22), color: "#2e7d32" }}>+20</span>
            <span style={{ fontSize: 20 }}>💧</span>
            <span style={{ ...font(600, 13), color: "#666" }}>= good!</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ ...font(800, 22), color: "#c62828" }}>-10</span>
            <span style={{ fontSize: 20 }}>⚡</span>
            <span style={{ ...font(600, 13), color: "#666" }}>
              = be careful!
            </span>
          </div>
        </div>
      </div>

      <ContinueBtn
        onClick={onNext}
        label="Let's Go! 🚀"
        gradient="linear-gradient(135deg, #00796b, #26a69a)"
      />
    </Card>
  );
}

// ============================================================
// SCREEN: SITUATION
// ============================================================

function SituationScreen({
  situation,
  stats,
  onChoose,
  roundNum,
}: {
  situation: Situation;
  stats: Stats;
  onChoose: (effects: Effects) => void;
  roundNum: number;
}) {
  const [selected, setSelected] = useState<"A" | "B" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const handleChoice = (c: "A" | "B") => {
    if (selected) return;
    setSelected(c);
    setTimeout(() => setRevealed(true), 500);
  };
  const effects =
    selected === "A"
      ? situation.optionA.effects
      : selected === "B"
        ? situation.optionB.effects
        : null;
  const preview = effects ? computeNewStats(stats, effects) : stats;

  return (
    <Card maxWidth={760}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            ...font(800, 13),
            background: "#005870",
            color: "white",
            padding: "4px 16px",
            borderRadius: 20,
          }}
        >
          Round {roundNum}
        </span>
      </div>
      <h2
        style={{
          fontFamily: "'Pacifico', cursive",
          fontSize: 34,
          color: "#005870",
          margin: "0 0 14px",
        }}
      >
        Situation
      </h2>
      <p
        style={{
          ...font(400, 18),
          color: "#3a2a14",
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        {situation.text}
      </p>
      <div
        style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <OptionButton
          letter="A"
          label={situation.optionA.label}
          color="#5c7cfa"
          effects={situation.optionA.effects}
          showEffects={revealed}
          onClick={() => handleChoice("A")}
          disabled={!!selected}
          selected={selected === "A"}
        />
        <OptionButton
          letter="B"
          label={situation.optionB.label}
          color="#e53935"
          effects={situation.optionB.effects}
          showEffects={revealed}
          onClick={() => handleChoice("B")}
          disabled={!!selected}
          selected={selected === "B"}
        />
      </div>
      {!selected && (
        <p
          style={{
            textAlign: "center",
            ...font(400, 14),
            color: "#999",
            fontStyle: "italic",
          }}
        >
          Discuss with your group, then choose...
        </p>
      )}
      {revealed && effects && (
        <div style={{ animation: "fadeInUp 0.5s ease" }}>
          <StatsChart stats={preview} />
          <ContinueBtn onClick={() => onChoose(effects)} />
        </div>
      )}
    </Card>
  );
}

// ============================================================
// SCREEN: CRISIS INTRO
// ============================================================

function CrisisIntroScreen({ onNext }: { onNext: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        position: "relative",
        zIndex: 10,
        padding: 20,
      }}
    >
      <div style={{ textAlign: "center", animation: "shakeIn 0.8s ease" }}>
        <h1
          style={{
            ...font(900),
            fontFamily: "'Nunito', sans-serif",
            fontSize: "clamp(60px, 14vw, 110px)",
            color: "#FF8F00",
            textShadow:
              "4px 4px 0 rgba(0,0,0,0.25), 0 0 50px rgba(255,143,0,0.4)",
            letterSpacing: 6,
            margin: 0,
          }}
        >
          CRISIS!!!!
        </h1>
      </div>
      <button
        onClick={onNext}
        style={{
          marginTop: 44,
          padding: "16px 44px",
          ...font(800, 19),
          color: "white",
          background: "linear-gradient(135deg, #d84315, #ff6d00)",
          border: "none",
          borderRadius: 50,
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(216,67,21,0.45)",
          animation: "fadeInUp 1.2s ease",
          transition: "all 0.3s ease",
        }}
        onMouseOver={(e: ReactMouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.transform = "translateY(-3px)";
        }}
        onMouseOut={(e: ReactMouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.transform = "";
        }}
      >
        What happened?! 😰
      </button>
    </div>
  );
}

// ============================================================
// SCREEN: CRISIS (A/B VOTE)
// ============================================================

function CrisisScreen({
  crisis,
  stats,
  onResolve,
}: {
  crisis: Crisis;
  stats: Stats;
  onResolve: (effects: Effects) => void;
}) {
  const [selected, setSelected] = useState<"A" | "B" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const handleChoice = (c: "A" | "B") => {
    if (selected) return;
    setSelected(c);
    setTimeout(() => setRevealed(true), 500);
  };
  const effects =
    selected === "A"
      ? crisis.optionA.effects
      : selected === "B"
        ? crisis.optionB.effects
        : null;
  const preview = effects ? computeNewStats(stats, effects) : stats;

  return (
    <Card maxWidth={740}>
      <h2
        style={{
          ...font(900, 34),
          color: "#e65100",
          textAlign: "center",
          margin: "0 0 14px",
        }}
      >
        CRISIS!
      </h2>
      <p
        style={{
          ...font(400, 18),
          color: "#3a2a14",
          lineHeight: 1.6,
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        {crisis.text}
      </p>
      <div
        style={{
          textAlign: "center",
          marginBottom: 24,
          ...font(900, 22),
          color: "#005870",
          background: "rgba(0,88,112,0.06)",
          padding: "12px 24px",
          borderRadius: 16,
        }}
      >
        🙋 Do you have{" "}
        <span style={{ color: "#e65100", fontSize: 30 }}>
          {crisis.peopleNeeded}
        </span>{" "}
        volunteers?
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <OptionButton
          letter="A"
          label={crisis.optionA.label}
          sublabel={revealed ? crisis.optionA.sublabel : null}
          color="#4caf50"
          effects={crisis.optionA.effects}
          showEffects={revealed}
          onClick={() => handleChoice("A")}
          disabled={!!selected}
          selected={selected === "A"}
        />
        <OptionButton
          letter="B"
          label={crisis.optionB.label}
          sublabel={revealed ? crisis.optionB.sublabel : null}
          color="#e53935"
          effects={crisis.optionB.effects}
          showEffects={revealed}
          onClick={() => handleChoice("B")}
          disabled={!!selected}
          selected={selected === "B"}
        />
      </div>
      {!selected && (
        <p
          style={{
            textAlign: "center",
            ...font(400, 14),
            color: "#999",
            fontStyle: "italic",
          }}
        >
          Count your volunteers and decide...
        </p>
      )}
      {revealed && effects && (
        <div style={{ animation: "fadeInUp 0.5s ease" }}>
          <div
            style={{
              textAlign: "center",
              marginBottom: 16,
              ...font(900, 22),
              color: selected === "A" ? "#2e7d32" : "#c62828",
            }}
          >
            {selected === "A"
              ? "✅ The volunteers pulled through!"
              : "❌ Not enough help..."}
          </div>
          <StatsChart stats={preview} />
          <ContinueBtn onClick={() => onResolve(effects)} />
        </div>
      )}
    </Card>
  );
}

// ============================================================
// SCREEN: ENDING
// ============================================================

function EndingScreen({ stats, onNext }: { stats: Stats; onNext: () => void }) {
  const survived = Object.values(stats).every((v) => v > 10);
  return (
    <Card maxWidth={620} animation="fadeInUp 0.8s ease">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>
          {survived ? "🎉" : "💀"}
        </div>
        <h2
          style={{
            fontFamily: "'Pacifico', cursive",
            fontSize: 44,
            color: survived ? "#005870" : "#c62828",
            margin: "0 0 8px",
          }}
        >
          {survived ? "You Survived!" : "Game Over"}
        </h2>
        <p style={{ ...font(400, 16), color: "#666", marginBottom: 20 }}>
          {survived
            ? "Your group made it off the island alive!"
            : "The island claimed your group..."}
        </p>
      </div>
      <StatsChart stats={stats} />
      {!survived && (
        <p
          style={{
            textAlign: "center",
            ...font(700, 14),
            color: "#e53935",
            marginTop: 10,
          }}
        >
          Stats at or below 10:{" "}
          {STAT_KEYS.filter((s) => stats[s] <= 10)
            .map((s) => STAT_META[s].label)
            .join(", ")}
        </p>
      )}
      <ContinueBtn
        onClick={onNext}
        label="Reflect 💭"
        gradient="linear-gradient(135deg, #00796b, #26a69a)"
      />
    </Card>
  );
}

// ============================================================
// SCREEN: THINKING
// ============================================================

function ThinkingScreen({ onNext }: { onNext: () => void }) {
  return (
    <Card maxWidth={640} animation="fadeInUp 0.8s ease">
      <h2
        style={{
          fontFamily: "'Pacifico', cursive",
          fontSize: 38,
          color: "#005870",
          margin: "0 0 24px",
          textAlign: "center",
        }}
      >
        Thinking Questions 🐦
      </h2>
      {THINKING_QUESTIONS.map((q, i) => (
        <div
          key={i}
          style={{
            ...font(700, 17),
            color: "#3a2a14",
            padding: "14px 0",
            borderBottom:
              i < THINKING_QUESTIONS.length - 1
                ? "1px solid rgba(0,0,0,0.08)"
                : "none",
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: "#e65100", marginRight: 8, fontWeight: 900 }}>
            {i + 1}.
          </span>
          {q}
        </div>
      ))}
      <ContinueBtn
        onClick={onNext}
        label="See Takeaways →"
        gradient="linear-gradient(135deg, #5c6bc0, #7986cb)"
      />
    </Card>
  );
}

// ============================================================
// SCREEN: LEARNING
// ============================================================

function LearningScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <Card maxWidth={560} animation="fadeInUp 0.8s ease">
      <h2
        style={{
          fontFamily: "'Pacifico', cursive",
          fontSize: 38,
          color: "#005870",
          margin: "0 0 24px",
          textAlign: "center",
        }}
      >
        Learning Points
      </h2>
      {LEARNING_POINTS.map((p, i) => (
        <div
          key={i}
          style={{
            ...font(800, 20),
            color: "#3a2a14",
            padding: "14px 20px",
            margin: "8px 0",
            background: "rgba(0,88,112,0.06)",
            borderRadius: 14,
            borderLeft: "5px solid #005870",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 28 }}>{p.icon}</span>
          {p.text}
        </div>
      ))}
      <div style={{ fontSize: 42, textAlign: "center", margin: "20px 0 8px" }}>
        🏝️🚤🌅
      </div>
      <ContinueBtn onClick={onRestart} label="Play Again 🔄" />
    </Card>
  );
}

// ============================================================
// SCREEN: GAME OVER
// ============================================================

function GameOverScreen({
  stats,
  onRestart,
}: {
  stats: Stats;
  onRestart: () => void;
}) {
  return (
    <Card maxWidth={540} animation="shakeIn 0.6s ease">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>💀</div>
        <h2 style={{ ...font(900, 36), color: "#c62828", margin: "0 0 8px" }}>
          You Didn&apos;t Survive
        </h2>
        <p style={{ ...font(400, 16), color: "#666", marginBottom: 20 }}>
          A stat dropped to zero. The island claimed your group...
        </p>
      </div>
      <StatsChart stats={stats} />
      <ContinueBtn onClick={onRestart} label="Try Again 🔄" />
    </Card>
  );
}

// ============================================================
// HOTKEY PANEL
// ============================================================

function HotkeyPanel({
  phaseIndex,
  phase,
  onClose,
}: {
  phaseIndex: number;
  phase: Phase | undefined;
  onClose: () => void;
}) {
  const groups = [
    {
      section: "Navigation",
      items: [
        { keys: ["→", "N"], desc: "Next slide" },
        { keys: ["←", "P"], desc: "Previous slide" },
      ],
    },
    {
      section: "Jump to Slide",
      items: [
        { keys: ["1–6"], desc: "Situation rounds 1–6" },
        { keys: ["F1–F3"], desc: "Crisis events 1–3" },
        { keys: ["H"], desc: "How to Play" },
        { keys: ["E"], desc: "Ending" },
        { keys: ["T"], desc: "Thinking Questions" },
        { keys: ["L"], desc: "Learning Points" },
      ],
    },
    {
      section: "Other",
      items: [
        { keys: ["R"], desc: "Restart game" },
        { keys: ["?", "/"], desc: "Toggle this panel" },
        { keys: ["Esc"], desc: "Close this panel" },
      ],
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeInUp 0.25s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: "28px 32px",
          maxWidth: 420,
          width: "90%",
          boxShadow: "0 16px 64px rgba(0,0,0,0.2)",
          fontFamily: "'Nunito', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <h3 style={{ ...font(900, 22), color: "#005870", margin: 0 }}>
            ⌨️ Keyboard Shortcuts
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "#999",
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        {groups.map((group) => (
          <div key={group.section} style={{ marginBottom: 14 }}>
            <div
              style={{
                ...font(800, 11),
                color: "#999",
                textTransform: "uppercase" as const,
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              {group.section}
            </div>
            {group.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "5px 0",
                }}
              >
                <div style={{ display: "flex", gap: 4 }}>
                  {item.keys.map((k) => (
                    <span
                      key={k}
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        background: "#f0f0f0",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#333",
                        border: "1px solid #ddd",
                        fontFamily: "monospace",
                        minWidth: 28,
                        textAlign: "center",
                      }}
                    >
                      {k}
                    </span>
                  ))}
                </div>
                <span style={{ ...font(400, 14), color: "#555" }}>
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        ))}
        <div
          style={{
            ...font(400, 12),
            color: "#bbb",
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Phase {phaseIndex + 1} / {PHASES.length} • {phase?.type ?? "—"}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN GAME
// ============================================================

export default function StrandedGame() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [stats, setStats] = useState<Stats>({ ...INITIAL_STATS });
  const [gameOver, setGameOver] = useState(false);
  const [key, setKey] = useState(0);
  const [roundNum, setRoundNum] = useState(1);
  const [showHotkeys, setShowHotkeys] = useState(false);

  const phase = PHASES[phaseIndex];
  const isDark = phase?.type === "crisis_intro" || phase?.type === "crisis";

  const goToPhase = useCallback((idx: number) => {
    setPhaseIndex(Math.max(0, Math.min(idx, PHASES.length - 1)));
    setKey((k) => k + 1);
    setGameOver(false);
  }, []);

  const nextPhase = useCallback(() => {
    setPhaseIndex((i) => Math.min(i + 1, PHASES.length - 1));
    setKey((k) => k + 1);
  }, []);

  const restart = useCallback(() => {
    setPhaseIndex(0);
    setStats({ ...INITIAL_STATS });
    setGameOver(false);
    setKey(0);
    setRoundNum(1);
  }, []);

  const applyEffects = useCallback(
    (effects: Effects) => {
      setStats((prev) => {
        const next = computeNewStats(prev, effects);
        if (Object.values(next).some((v) => v <= 0))
          setTimeout(() => setGameOver(true), 100);
        return next;
      });
      nextPhase();
    },
    [nextPhase],
  );

  // Hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const k = e.key.toLowerCase();

      if (k === "arrowright" || k === "n") {
        e.preventDefault();
        goToPhase(phaseIndex + 1);
      }
      if (k === "arrowleft" || k === "p") {
        e.preventDefault();
        goToPhase(phaseIndex - 1);
      }
      if (k === "e") {
        e.preventDefault();
        const idx = PHASES.findIndex((p) => p.type === "ending");
        if (idx >= 0) goToPhase(idx);
      }
      if (k === "t") {
        e.preventDefault();
        const idx = PHASES.findIndex((p) => p.type === "thinking");
        if (idx >= 0) goToPhase(idx);
      }
      if (k === "l") {
        e.preventDefault();
        const idx = PHASES.findIndex((p) => p.type === "learning");
        if (idx >= 0) goToPhase(idx);
      }
      if (k === "h") {
        e.preventDefault();
        const idx = PHASES.findIndex((p) => p.type === "howtoplay");
        if (idx >= 0) goToPhase(idx);
      }
      if (k === "r") {
        e.preventDefault();
        restart();
      }
      if (["1", "2", "3", "4", "5", "6"].includes(k)) {
        e.preventDefault();
        const idx = PHASES.findIndex(
          (p) => p.type === "situation" && p.index === parseInt(k) - 1,
        );
        if (idx >= 0) goToPhase(idx);
      }
      if (k === "f1") {
        e.preventDefault();
        const idx = PHASES.findIndex(
          (p) => p.type === "crisis" && p.index === 0,
        );
        if (idx >= 0) goToPhase(idx);
      }
      if (k === "f2") {
        e.preventDefault();
        const idx = PHASES.findIndex(
          (p) => p.type === "crisis" && p.index === 1,
        );
        if (idx >= 0) goToPhase(idx);
      }
      if (k === "f3") {
        e.preventDefault();
        const idx = PHASES.findIndex(
          (p) => p.type === "crisis" && p.index === 2,
        );
        if (idx >= 0) goToPhase(idx);
      }
      if (k === "?" || k === "/") {
        e.preventDefault();
        setShowHotkeys((v) => !v);
      }
      if (k === "escape") {
        setShowHotkeys(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phaseIndex, goToPhase, restart]);

  useEffect(() => {
    if (phase?.type === "situation" && phase.index !== undefined)
      setRoundNum(phase.index + 1);
  }, [phase]);

  const showMini =
    !gameOver &&
    phase &&
    !["title", "howtoplay", "ending", "thinking", "learning"].includes(
      phase.type,
    );

  const renderPhase = () => {
    if (gameOver) return <GameOverScreen stats={stats} onRestart={restart} />;
    if (!phase) return null;
    switch (phase.type) {
      case "title":
        return <TitleScreen onNext={nextPhase} />;
      case "howtoplay":
        return <HowToPlayScreen onNext={nextPhase} />;
      case "situation":
        return (
          <SituationScreen
            key={key}
            situation={SITUATIONS[phase.index!]}
            stats={stats}
            onChoose={applyEffects}
            roundNum={roundNum}
          />
        );
      case "crisis_intro":
        return <CrisisIntroScreen onNext={nextPhase} />;
      case "crisis":
        return (
          <CrisisScreen
            key={key}
            crisis={CRISES[phase.index!]}
            stats={stats}
            onResolve={applyEffects}
          />
        );
      case "ending":
        return <EndingScreen stats={stats} onNext={nextPhase} />;
      case "thinking":
        return <ThinkingScreen onNext={nextPhase} />;
      case "learning":
        return <LearningScreen onRestart={restart} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Pacifico&family=Nunito:wght@400;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <IslandBackground dark={isDark} />
      <div style={{ position: "relative", zIndex: 5, minHeight: "100vh" }}>
        {renderPhase()}
      </div>

      {/* Mini stats HUD */}
      {showMini && (
        <div
          style={{
            position: "fixed",
            top: 14,
            right: 14,
            zIndex: 50,
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(10px)",
            borderRadius: 14,
            padding: "10px 14px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.06)",
            fontFamily: "'Nunito', sans-serif",
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          {STAT_KEYS.map((stat) => {
            const meta = STAT_META[stat];
            const val = stats[stat];
            return (
              <div
                key={stat}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                  color: val <= 10 ? "#e53935" : "#3a2a14",
                  fontWeight: val <= 10 ? 900 : 700,
                }}
              >
                <span>{meta.emoji}</span>
                <div
                  style={{
                    width: 64,
                    height: 8,
                    background: "rgba(0,0,0,0.06)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${val}%`,
                      height: "100%",
                      background: val <= 10 ? "#e53935" : meta.color,
                      borderRadius: 4,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <span style={{ fontSize: 13, width: 24, textAlign: "right" }}>
                  {val}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Hotkey toggle button */}
      <button
        onClick={() => setShowHotkeys((v) => !v)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 60,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          color: "white",
          border: "none",
          cursor: "pointer",
          ...font(900, 18),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
          transition: "all 0.2s ease",
        }}
        onMouseOver={(e: ReactMouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.background = "rgba(0,0,0,0.7)";
        }}
        onMouseOut={(e: ReactMouseEvent<HTMLButtonElement>) => {
          e.currentTarget.style.background = "rgba(0,0,0,0.5)";
        }}
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>

      {/* Hotkey panel */}
      {showHotkeys && (
        <HotkeyPanel
          phaseIndex={phaseIndex}
          phase={phase}
          onClose={() => setShowHotkeys(false)}
        />
      )}
    </>
  );
}
