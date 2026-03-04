"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import {
  CRISES,
  SITUATIONS,
  START_STATS,
  type Card,
  type Delta,
  type Stats,
} from "@/app/game";

type Phase = "idle" | "reveal" | "crisis";

type Snapshot = {
  stats: Stats;
  current: Card;
  phase: Phase;
  revealText: string | null;
};

type GameState = Snapshot & {
  gmOpen: boolean;
  history: Snapshot[];
};

const STORAGE_KEY = "stranded_v2_session";

const MIN_STAT = 0;
const MAX_STAT = 80;
const DANGER_THRESHOLD = 10;

// ---------- helpers ----------
function clamp(n: number) {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, n));
}

function applyDelta(stats: Stats, delta: Delta): Stats {
  return {
    hp: clamp(stats.hp + (delta.hp ?? 0)),
    en: clamp(stats.en + (delta.en ?? 0)),
    res: clamp(stats.res + (delta.res ?? 0)),
    water: clamp(stats.water + (delta.water ?? 0)),
  };
}

function isDanger(s: Stats) {
  return (
    s.hp <= DANGER_THRESHOLD ||
    s.en <= DANGER_THRESHOLD ||
    s.res <= DANGER_THRESHOLD ||
    s.water <= DANGER_THRESHOLD
  );
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadSaved(): GameState | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export default function DisplayPage() {
  // animations
  const lightning = useAnimation();
  const shake = useAnimation();

  // hydration-safe mount gate
  const [mounted, setMounted] = useState(false);

  // bags (no repeats until exhausted)
  const [sBag, setSBag] = useState<string[]>([]);
  const [cBag, setCBag] = useState<string[]>([]);

  const init: GameState = {
    stats: START_STATS,
    current: SITUATIONS[0],
    phase: "idle",
    revealText: null,
    gmOpen: false,
    history: [],
  };

  const [state, setState] = useState<GameState>(init);

  // init after mount (fix hydration)
  useEffect(() => {
    setMounted(true);

    // init fresh bags
    setSBag(shuffle(SITUATIONS.map((s) => s.id)));
    setCBag(shuffle(CRISES.map((c) => c.id)));

    // restore saved session
    const saved = loadSaved();
    if (saved) setState(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist (only after mount)
  useEffect(() => {
    if (!mounted) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [mounted, state]);

  const danger = useMemo(() => isDanger(state.stats), [state.stats]);

  // ---------- state helpers ----------
  const push = (next: Partial<GameState>) => {
    setState((prev) => {
      const snap: Snapshot = {
        stats: prev.stats,
        current: prev.current,
        phase: prev.phase,
        revealText: prev.revealText,
      };
      return {
        ...prev,
        ...next,
        history: [...prev.history, snap].slice(-30),
      };
    });
  };

  const undo = () => {
    setState((prev) => {
      const last = prev.history[prev.history.length - 1];
      if (!last) return prev;
      return {
        ...prev,
        ...last,
        history: prev.history.slice(0, -1),
      };
    });
  };

  const reset = () => {
    setSBag(shuffle(SITUATIONS.map((s) => s.id)));
    setCBag(shuffle(CRISES.map((c) => c.id)));
    setState(init);
  };

  // pull next from bag, avoid repeating current
  const drawSituation = (): Card => {
    const refill = () => shuffle(SITUATIONS.map((s) => s.id));
    let bag = sBag.length ? [...sBag] : refill();

    let id = bag.shift()!;
    if (id === state.current.id && bag.length) id = bag.shift()!;

    setSBag(bag.length ? bag : refill());
    return SITUATIONS.find((s) => s.id === id) ?? SITUATIONS[0];
  };

  const drawCrisis = (): Card => {
    const refill = () => shuffle(CRISES.map((c) => c.id));
    let bag = cBag.length ? [...cBag] : refill();

    let id = bag.shift()!;
    if (id === state.current.id && bag.length) id = bag.shift()!;

    setCBag(bag.length ? bag : refill());
    return CRISES.find((c) => c.id === id) ?? CRISES[0];
  };

  const nextSituation = () => {
    push({ current: drawSituation(), phase: "idle", revealText: null });
  };

  const triggerCrisis = async () => {
    push({ current: drawCrisis(), phase: "crisis", revealText: null });

    // crazy: lightning + shake
    await lightning.start({
      opacity: [0, 0.95, 0.15, 0.85, 0],
      transition: { duration: 0.85 },
    });
    await shake.start({
      x: [0, -18, 18, -14, 14, -8, 8, 0],
      y: [0, 8, -8, 6, -6, 3, -3, 0],
      transition: { duration: 0.6 },
    });
  };

  const choose = async (choice: "A" | "B") => {
    if (state.current.kind !== "situation") return;
    const picked = choice === "A" ? state.current.a : state.current.b;

    push({
      stats: applyDelta(state.stats, picked.delta),
      phase: "reveal",
      revealText: picked.outcome,
    });

    await shake.start({
      scale: [1, 1.03, 0.995, 1.01, 1],
      transition: { duration: 0.35 },
    });
  };

  const resolveCrisis = async (success: boolean) => {
    if (state.current.kind !== "crisis") return;
    const result = success ? state.current.success : state.current.fail;

    push({
      stats: applyDelta(state.stats, result.delta),
      phase: "reveal",
      revealText: result.outcome,
    });

    await shake.start({
      scale: [1, 1.02, 0.99, 1.01, 1],
      transition: { duration: 0.35 },
    });
  };

  // IMPORTANT: reveal close also advances (no “stuck”)
  const continueAfterReveal = () => {
    // hide reveal and go next
    push({ phase: "idle", revealText: null });
    nextSituation();
  };

  // hotkeys
  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (k === "g") setState((p) => ({ ...p, gmOpen: !p.gmOpen }));
      if (k === "u") undo();
      if (k === "0") reset();

      if (k === "n") nextSituation();
      if (k === "c") triggerCrisis();

      if (k === "a") choose("A");
      if (k === "b") choose("B");

      if (k === "r" && state.phase === "reveal") continueAfterReveal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, state.phase, state.current, sBag, cBag]);

  // projector-safe: render blank until mounted (prevents any mismatch)
  if (!mounted) return <div className="min-h-screen bg-[#bfeaf6]" />;

  // UI pieces
  const statCard = (label: string, emoji: string, val: number) => (
    <div className="rounded-3xl bg-white/85 backdrop-blur border border-black/10 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold text-[#005870]">
          {emoji} {label}
        </div>
        <div className="text-4xl font-extrabold tabular-nums text-black">
          {val}
        </div>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-black/10 overflow-hidden">
        <div
          className="h-full bg-black/60 rounded-full transition-all"
          style={{
            width: `${Math.max(0, Math.min(100, (val / MAX_STAT) * 100))}%`,
          }}
        />
      </div>
      <div className="mt-2 text-xs text-black/60">
        Max {MAX_STAT} • Danger ≤ {DANGER_THRESHOLD}
      </div>
    </div>
  );

  return (
    <motion.div
      animate={shake}
      className="relative min-h-screen overflow-hidden bg-[#bfeaf6]"
    >
      {/* lightning flash */}
      <motion.div
        animate={lightning}
        initial={{ opacity: 0 }}
        className="pointer-events-none absolute inset-0 z-[60] bg-white"
      />

      {/* title */}
      <h1 className="text-center w-full text-6xl mt-8 font-extrabold text-[#005870] drop-shadow-sm">
        {state.current.title}
      </h1>

      {/* prompt */}
      <div className="mx-auto mt-6 max-w-6xl px-10 text-center text-3xl leading-snug text-[#7a4a1d]">
        {state.current.prompt}
      </div>

      {/* main card area */}
      <div className="mx-auto mt-10 max-w-6xl px-10">
        {state.current.kind === "situation" ? (
          <div className="grid grid-cols-2 gap-10">
            <button
              onClick={() => choose("A")}
              className="rounded-3xl bg-white/70 hover:bg-white/85 backdrop-blur border border-black/10 p-8 shadow-sm transition"
            >
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-[#5f7cff] text-white flex items-center justify-center text-3xl font-black">
                  A
                </div>
                <div className="text-5xl font-extrabold text-[#7a4a1d]">
                  {state.current.a.label}
                </div>
              </div>
              <div className="mt-3 text-left text-sm text-black/50">
                (Hotkey: A)
              </div>
            </button>

            <button
              onClick={() => choose("B")}
              className="rounded-3xl bg-white/70 hover:bg-white/85 backdrop-blur border border-black/10 p-8 shadow-sm transition"
            >
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-[#e35b4f] text-white flex items-center justify-center text-3xl font-black">
                  B
                </div>
                <div className="text-5xl font-extrabold text-[#7a4a1d]">
                  {state.current.b.label}
                </div>
              </div>
              <div className="mt-3 text-left text-sm text-black/50">
                (Hotkey: B)
              </div>
            </button>
          </div>
        ) : (
          <div className="rounded-[2rem] bg-white/75 backdrop-blur border border-black/10 p-10 shadow-lg">
            <div className="flex items-center justify-between gap-8">
              <div>
                <div className="text-sm uppercase tracking-wider text-black/60">
                  Requirement
                </div>
                <div className="mt-2 text-4xl font-extrabold text-[#7a4a1d]">
                  {state.current.requirementText}
                </div>
                <div className="mt-4 text-xl text-black/70">
                  Shout “GO!” and count hands up. Then resolve success/fail.
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="text-6xl font-black text-[#005870] rotate-[-6deg]">
                  CRISIS!!!
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* stats */}
      <div className="fixed left-10 bottom-12 z-40 w-[520px] grid grid-cols-2 gap-4">
        {statCard("Health", "❤️", state.stats.hp)}
        {statCard("Stamina", "⚡", state.stats.en)}
        {statCard("Supplies", "🎒", state.stats.res)}
        {statCard("Water", "💧", state.stats.water)}
      </div>

      {/* status */}
      <div className="fixed right-10 bottom-12 z-40 w-[520px] rounded-3xl bg-white/80 backdrop-blur border border-black/10 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-[#005870]">Status</div>
          <div className="text-xs uppercase tracking-wider text-black/60">
            Tag: <span className="font-semibold">{state.current.tag}</span>
          </div>
        </div>
        <div className="mt-2 text-xl text-black/70">
          {danger
            ? "⚠️ Critical — at least one stat is at or below 10."
            : "✅ Stable — keep making smart choices."}
        </div>
        <div className="mt-3 text-sm text-black/50">
          Hotkeys: A/B choose • N next • C crisis • U undo • 0 reset • G GM
          panel • R continue
        </div>
      </div>

      {/* reveal overlay */}
      <AnimatePresence>
        {state.phase === "reveal" && state.revealText && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/35"
              onClick={continueAfterReveal}
            />
            <motion.div
              className="relative mx-6 max-w-4xl rounded-[2.5rem] bg-white p-10 shadow-2xl border border-black/10"
              initial={{ scale: 0.75, y: 40, rotate: -2 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.85, y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
            >
              <div className="text-xs uppercase tracking-wider text-black/60">
                Outcome
              </div>
              <div className="mt-3 text-4xl font-extrabold text-[#005870] leading-tight">
                {state.revealText}
              </div>
              <div className="mt-6 text-lg text-black/60">
                Click anywhere or press <span className="font-semibold">R</span>{" "}
                to continue.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GM overlay */}
      <AnimatePresence>
        {state.gmOpen && (
          <motion.div
            className="fixed top-5 left-5 z-[90] w-[420px] rounded-3xl bg-black/80 text-white p-5 shadow-2xl"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="flex items-center justify-between">
              <div className="font-bold">GM Panel</div>
              <button
                className="text-white/80 hover:text-white text-sm"
                onClick={() => setState((p) => ({ ...p, gmOpen: false }))}
              >
                Close (G)
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={nextSituation}
                className="rounded-2xl bg-white/15 hover:bg-white/25 p-3 text-left"
              >
                <div className="font-semibold">Next Situation</div>
                <div className="text-xs text-white/70">N</div>
              </button>

              <button
                onClick={triggerCrisis}
                className="rounded-2xl bg-white/15 hover:bg-white/25 p-3 text-left"
              >
                <div className="font-semibold">Trigger Crisis</div>
                <div className="text-xs text-white/70">C</div>
              </button>

              <button
                onClick={() => resolveCrisis(true)}
                disabled={state.current.kind !== "crisis"}
                className="rounded-2xl bg-green-500/40 hover:bg-green-500/55 disabled:opacity-40 p-3 text-left"
              >
                <div className="font-semibold">Crisis Success</div>
              </button>

              <button
                onClick={() => resolveCrisis(false)}
                disabled={state.current.kind !== "crisis"}
                className="rounded-2xl bg-red-500/40 hover:bg-red-500/55 disabled:opacity-40 p-3 text-left"
              >
                <div className="font-semibold">Crisis Fail</div>
              </button>

              <button
                onClick={undo}
                className="rounded-2xl bg-white/15 hover:bg-white/25 p-3 text-left"
              >
                <div className="font-semibold">Undo</div>
                <div className="text-xs text-white/70">U</div>
              </button>

              <button
                onClick={reset}
                className="rounded-2xl bg-white/15 hover:bg-white/25 p-3 text-left"
              >
                <div className="font-semibold">Reset</div>
                <div className="text-xs text-white/70">0</div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* your beach vibes */}
      <div className="h-100 fixed left-0 bottom-10 z-30">
        <Image
          src="/palmtree.png"
          width={200}
          height={200}
          alt="palmtree"
          className="w-full h-full object-contain palmSway"
        />
      </div>
      <div className="h-80 fixed right-10 bottom-15 z-10 -scale-x-100 rotate-20">
        <Image
          src="/palmtree.png"
          width={200}
          height={200}
          alt="palmtree"
          className="w-full h-full object-contain palmSway"
        />
      </div>
      <div className="h-50 fixed right-0 rotate-30 bottom-10 z-10 -scale-x-100">
        <Image
          src="/palmtree.png"
          width={200}
          height={200}
          alt="palmtree"
          className="w-full h-full object-contain palmSway"
        />
      </div>
      <div className="w-[120dvw] fixed bottom-0 left-1/2 -translate-x-1/2 z-20">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path
            fill="#fbe5bb"
            fillOpacity="1"
            d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,250.7C1248,256,1344,288,1392,304L1440,320L1440,320L0,320Z"
          />
        </svg>
      </div>
    </motion.div>
  );
}
