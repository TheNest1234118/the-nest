import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Folder,
  Heart,
  Leaf,
  Mic,
  PencilLine,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  generateReflectionV2,
  loadReflectionV2History,
} from "@/lib/reflectionV2";

import type {
  ReflectionKind,
  ReflectionV2Generation,
  ReflectionV2Result,
} from "@/lib/reflectionV2Types";

const c = {
  bg: "#09090d",
  card: "rgba(255,255,255,.026)",
  border: "rgba(255,255,255,.07)",
  gold: "rgba(215,178,103,.88)",
  goldSoft: "rgba(205,170,100,.54)",
  text: "rgba(242,231,213,.94)",
  textDim: "rgba(210,194,166,.74)",
  soft: "rgba(185,162,128,.56)",
  faint: "rgba(185,162,128,.34)",
  green: "rgba(149,218,157,.86)",
  red: "rgba(245,140,120,.78)",
};

const serif: React.CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontWeight: 400,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: ".18em",
  textTransform: "uppercase",
  color: c.goldSoft,
  margin: 0,
  fontWeight: 700,
};

function getNextWeeklyUnlock() {
  const now = new Date();
  const next = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7;

  next.setDate(now.getDate() + daysUntilSunday);

  if (daysUntilSunday === 0 && now.getHours() >= 20) {
    next.setDate(next.getDate() + 7);
  }

  next.setHours(20, 0, 0, 0);
  return next;
}

function isWeeklyUnlockedNow() {
  const now = new Date();
  return now.getDay() === 0 && now.getHours() >= 20;
}

function formatDate(value?: string) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatDateTime(value?: string) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function getRangeLabel(item: ReflectionV2Generation | null) {
  if (!item) return "";

  if (item.range_start && item.range_end) {
    const start = new Date(item.range_start);
    const end = new Date(item.range_end);
    end.setDate(end.getDate() - 1);

    return `${start.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    })} – ${end.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }

  return formatDate(item.created_at);
}

function formatCount(value: number, singular: string) {
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

function OrbBackground() {
  return (
    <>
      <motion.div
        animate={{ opacity: [0.42, 0.72, 0.42], scale: [0.98, 1.03, 0.98] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 20%, rgba(225,176,86,.19), rgba(225,176,86,.04) 34%, transparent 62%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        animate={{ x: [-18, 18, -18], opacity: [0.28, 0.62, 0.28] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: "17% -15% auto",
          height: 110,
          background:
            "repeating-linear-gradient(105deg, transparent 0 12px, rgba(215,178,103,.11) 13px, transparent 14px)",
          maskImage:
            "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
          filter: "blur(.5px)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function Section({
  title,
  icon,
  children,
  delay = 0,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background:
          "linear-gradient(145deg, rgba(255,255,255,.033), rgba(255,255,255,.018))",
        border: `1px solid ${c.border}`,
        borderRadius: 22,
        padding: "18px 17px",
        boxShadow: "0 18px 55px rgba(0,0,0,.18)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        {icon && (
          <span style={{ color: c.gold, display: "flex", alignItems: "center" }}>
            {icon}
          </span>
        )}
        <p style={sectionLabel}>{title}</p>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.72, color: c.textDim }}>
        {children}
      </div>
    </motion.section>
  );
}

function DigestHero({
  item,
  result,
  isWeekly,
}: {
  item: ReflectionV2Generation;
  result: ReflectionV2Result;
  isWeekly: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 26,
        padding: "24px 21px",
        border: "1px solid rgba(205,170,100,.20)",
        background:
          "linear-gradient(145deg, rgba(205,170,100,.12), rgba(255,255,255,.026))",
        boxShadow: "0 24px 95px rgba(0,0,0,.30)",
      }}
    >
      <OrbBackground />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.gold, marginBottom: 13 }}>
          <Sparkles size={16} />
          <p style={sectionLabel}>{isWeekly ? "The Nest Digest" : "Monthly Chapter"}</p>
        </div>

        <h2 style={{ ...serif, color: c.text, fontSize: 29, lineHeight: 1.16, margin: "0 0 11px" }}>
          {result.digest_title || (isWeekly ? "Your weekly story" : "The story of your month")}
        </h2>

        <p style={{ color: c.soft, fontSize: 12, lineHeight: 1.55, margin: "0 0 14px" }}>
          {getRangeLabel(item)} · Created {formatDateTime(item.created_at)}
        </p>

        <p style={{ color: c.textDim, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
          Based on {formatCount(item.voice_count, "voice capsule")}, {formatCount(item.thought_count, "thought")} and {formatCount(item.mood_count, "mood check-in")}.
        </p>
      </div>
    </motion.section>
  );
}

function StorySection({ story, isWeekly }: { story: string; isWeekly: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = story.length > 560;
  const shown = !shouldCollapse || expanded ? story : `${story.slice(0, 560).trim()}…`;

  return (
    <Section title={isWeekly ? "The Story of Your Week" : "The Story of Your Month"} icon={<BookOpen size={17} strokeWidth={1.5} />} delay={0.1}>
      <AnimatePresence mode="wait">
        <motion.p
          key={expanded ? "expanded" : "collapsed"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          style={{ margin: 0, whiteSpace: "pre-wrap" }}
        >
          {shown}
        </motion.p>
      </AnimatePresence>

      {shouldCollapse && (
        <button
          onClick={() => setExpanded((current) => !current)}
          style={{
            margin: "16px auto 0",
            display: "flex",
            alignItems: "center",
            gap: 7,
            border: "1px solid rgba(205,170,100,.16)",
            background: "rgba(205,170,100,.055)",
            color: c.text,
            borderRadius: 999,
            padding: "10px 14px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {expanded ? "Show less" : "Read the full story"}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown size={15} />
          </motion.span>
        </button>
      )}
    </Section>
  );
}

function QuoteSection({ quote, isWeekly }: { quote: string; isWeekly: boolean }) {
  if (!quote) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.13 }}
      style={{
        borderRadius: 22,
        padding: "21px 19px",
        border: "1px solid rgba(205,170,100,.18)",
        background:
          "linear-gradient(145deg, rgba(205,170,100,.08), rgba(255,255,255,.02))",
      }}
    >
      <p style={{ ...sectionLabel, marginBottom: 13 }}>
        {isWeekly ? "Sentence of the Week" : "Sentence of the Month"}
      </p>
      <p style={{ ...serif, color: c.text, fontSize: 23, lineHeight: 1.45, margin: 0 }}>
        “{quote}”
      </p>
    </motion.section>
  );
}

function InsightSection({ insight }: { insight: ReflectionV2Result["integrated_insight"] }) {
  if (!insight) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.15 }}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 22,
        padding: "20px 18px",
        border: "1px solid rgba(205,170,100,.20)",
        background:
          "linear-gradient(145deg, rgba(205,170,100,.10), rgba(255,255,255,.022))",
      }}
    >
      <div style={{ position: "absolute", top: -60, right: -45, width: 160, height: 160, borderRadius: 999, background: "radial-gradient(circle, rgba(205,170,100,.16), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: c.gold, marginBottom: 11 }}>
          <Sparkles size={16} />
          <p style={sectionLabel}>The Nest Noticed</p>
        </div>

        <h3 style={{ ...serif, color: c.text, fontSize: 23, lineHeight: 1.28, margin: "0 0 10px" }}>
          {insight.title}
        </h3>

        <p style={{ color: c.textDim, fontSize: 13, lineHeight: 1.68, margin: 0 }}>
          {insight.explanation}
        </p>
      </div>
    </motion.section>
  );
}

function BiggestChangeSection({ value }: { value: string }) {
  if (!value) return null;

  return (
    <Section title="The Biggest Change" icon={<TrendingUp size={17} />} delay={0.17}>
      <p style={{ margin: 0 }}>{value}</p>
    </Section>
  );
}

function HighlightsSection({ wins, challenges }: { wins: string[]; challenges: string[] }) {
  if (wins.length === 0 && challenges.length === 0) return null;

  return (
    <section style={{ display: "grid", gap: 13 }}>
      {wins.length > 0 && (
        <Section title="What Mattered" icon={<Heart size={17} />} delay={0.18}>
          <div style={{ display: "grid", gap: 10 }}>
            {wins.slice(0, 4).map((value, index) => (
              <div key={`${value}-${index}`} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: c.gold, marginTop: 9, flexShrink: 0 }} />
                <span>{value}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {challenges.length > 0 && (
        <Section title="What Felt Heavy" icon={<Leaf size={17} />} delay={0.2}>
          <div style={{ display: "grid", gap: 10 }}>
            {challenges.slice(0, 4).map((value, index) => (
              <div key={`${value}-${index}`} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(245,140,120,.72)", marginTop: 9, flexShrink: 0 }} />
                <span>{value}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </section>
  );
}

function MomentsSection({ moments }: { moments: ReflectionV2Result["moments"] }) {
  if (!moments.length) return null;

  return (
    <Section title="Moments Worth Keeping" icon={<Clock3 size={17} />} delay={0.22}>
      <div style={{ display: "grid", gap: 12 }}>
        {moments.slice(0, 4).map((moment, index) => (
          <div key={`${moment.entry_id}-${index}`} style={{ borderRadius: 15, border: "1px solid rgba(255,255,255,.055)", background: "rgba(255,255,255,.022)", padding: "12px 13px" }}>
            <p style={{ color: c.soft, fontSize: 10, margin: "0 0 7px" }}>
              {formatDate(moment.date)}
            </p>
            <p style={{ color: c.textDim, fontSize: 13, lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>
              “{moment.quote}”
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function NextStepSection({ result, isWeekly }: { result: ReflectionV2Result; isWeekly: boolean }) {
  const mainText = result.one_small_step || result.next_suggestion || result.gentle_reflection;

  if (!mainText && !result.closing_sentence) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.24 }}
      style={{
        borderRadius: 22,
        padding: "20px 18px",
        border: "1px solid rgba(205,170,100,.18)",
        background:
          "linear-gradient(145deg, rgba(205,170,100,.08), rgba(255,255,255,.02))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <Target size={17} color={c.gold} />
        <p style={sectionLabel}>{isWeekly ? "Carry Into Next Week" : "Carry Forward"}</p>
      </div>

      {mainText && <p style={{ color: c.textDim, fontSize: 14, lineHeight: 1.72, margin: 0 }}>{mainText}</p>}

      {result.closing_sentence && (
        <p style={{ ...serif, color: c.text, fontSize: 22, lineHeight: 1.4, margin: mainText ? "18px 0 0" : 0 }}>
          {result.closing_sentence}
        </p>
      )}
    </motion.section>
  );
}

function EmptyState({ isWeekly }: { isWeekly: boolean }) {
  return (
    <Section title="Not enough yet" icon={<Sparkles size={17} />}>
      Leave a few more voice capsules, thoughts or mood check-ins. {isWeekly ? "The Nest Digest becomes meaningful when your week has enough material." : "Your monthly chapter becomes meaningful when the month has enough material."}
    </Section>
  );
}

function ArchiveCard({
  history,
  isWeekly,
  onSelect,
}: {
  history: ReflectionV2Generation[];
  isWeekly: boolean;
  onSelect: (item: ReflectionV2Generation) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.27 }}
      style={{
        borderRadius: 22,
        border: "1px solid rgba(205,170,100,.18)",
        background:
          "linear-gradient(145deg, rgba(205,170,100,.07), rgba(255,255,255,.02))",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded((current) => !current)}
        style={{
          width: "100%",
          minHeight: 72,
          background: "transparent",
          border: "none",
          padding: "0 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          color: c.text,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <Folder size={22} strokeWidth={1.45} color={c.gold} />
          <span>
            <span style={{ display: "block", color: c.gold, fontSize: 15, marginBottom: 2, textAlign: "left" }}>
              {isWeekly ? "Past Digests" : "Past Monthly Chapters"}
            </span>
            <span style={{ display: "block", color: c.soft, fontSize: 12, textAlign: "left" }}>
              {history.length} saved {history.length === 1 ? "chapter" : "chapters"}
            </span>
          </span>
        </span>

        <motion.span animate={{ rotate: expanded ? 90 : 0 }}>
          <ChevronRight size={18} color={c.goldSoft} />
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && history.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ borderTop: "1px solid rgba(255,255,255,.055)", padding: 12, display: "grid", gap: 8 }}>
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => onSelect(entry)}
                  style={{
                    width: "100%",
                    border: `1px solid ${c.border}`,
                    background: "rgba(255,255,255,.025)",
                    borderRadius: 15,
                    padding: "13px",
                    color: c.textDim,
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <CalendarDays size={17} color={c.goldSoft} />
                    <span>
                      <span style={{ display: "block", color: c.text, fontSize: 13 }}>
                        {entry.result.digest_title || getRangeLabel(entry)}
                      </span>
                      <span style={{ display: "block", color: c.faint, fontSize: 11, marginTop: 3 }}>
                        {getRangeLabel(entry)}
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={16} color={c.goldSoft} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export function ReflectionExperience({ kind }: { kind: ReflectionKind }) {
  const isWeekly = kind === "weekly";
  const [item, setItem] = useState<ReflectionV2Generation | null>(null);
  const [history, setHistory] = useState<ReflectionV2Generation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const weeklyUnlocked = !isWeekly || isWeeklyUnlockedNow();
  const nextWeeklyUnlock = getNextWeeklyUnlock();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const saved = await loadReflectionV2History(kind);
        if (cancelled) return;
        setHistory(saved);
        setItem(saved[0] || null);
      } catch (loadError: any) {
        if (cancelled) return;
        setError(loadError.message || "Could not load your reflections.");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  async function generate() {
    if (loading || !weeklyUnlocked) return;

    setLoading(true);
    setError("");

    try {
      const next = await generateReflectionV2(kind);
      const hasStory = Boolean(next.result?.story);

      if (hasStory) {
        setItem(next);
        const saved = await loadReflectionV2History(kind);
        setHistory(saved);
      }
    } catch (generationError: any) {
      setError(generationError.message || "Could not create your reflection.");
    } finally {
      setLoading(false);
    }
  }

  const result = item?.result as ReflectionV2Result | undefined;

  const overview = useMemo(
    () => ({
      voices: item?.voice_count || 0,
      thoughts: item?.thought_count || 0,
      moods: item?.mood_count || 0,
    }),
    [item]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",
        background: c.bg,
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 85% 32% at 50% 0%, rgba(205,145,45,.08), transparent 68%), linear-gradient(90deg, rgba(255,255,255,.018), transparent 16%, transparent 84%, rgba(255,255,255,.016))",
          pointerEvents: "none",
        }}
      />

      <motion.div
        animate={{ opacity: [0.18, 0.32, 0.18] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: 30,
          right: -80,
          width: 210,
          height: 210,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(205,170,100,.16), rgba(205,170,100,.03) 44%, transparent 70%)",
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "calc(env(safe-area-inset-top,0px) + 28px) 18px 42px",
        }}
      >
        <header style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
          <Link href="/home">
            <motion.button
              whileTap={{ scale: 0.94 }}
              aria-label="Back"
              style={{
                width: 42,
                height: 42,
                borderRadius: 999,
                background: "rgba(255,255,255,.035)",
                border: "1px solid rgba(255,255,255,.07)",
                color: "rgba(230,215,188,.72)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <ChevronLeft size={22} strokeWidth={1.35} />
            </motion.button>
          </Link>

          <div style={{ flex: 1 }}>
            <p style={{ ...sectionLabel, marginBottom: 8 }}>
              {isWeekly ? "Understand your week" : "See how your month changed"}
            </p>

            <h1 style={{ ...serif, fontSize: isWeekly ? 38 : 35, lineHeight: 1.06, color: c.text, margin: "0 0 9px" }}>
              {isWeekly ? "The Nest Digest" : "Your Monthly Chapter"}
            </h1>

            <p style={{ color: c.soft, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              {isWeekly ? "Your week, written as a story." : "A calm chapter about what shaped your month."}
            </p>
          </div>
        </header>

        {error && (
          <p style={{ color: c.red, fontSize: 12, lineHeight: 1.5, margin: "0 0 14px" }}>
            {error}
          </p>
        )}

        <motion.button
          onClick={generate}
          disabled={loading || !weeklyUnlocked}
          whileTap={loading || !weeklyUnlocked ? undefined : { scale: 0.985 }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 13,
            border: "1px solid rgba(205,170,100,.22)",
            background:
              "linear-gradient(145deg, rgba(205,170,100,.11), rgba(255,255,255,.024))",
            borderRadius: 20,
            padding: "17px 18px",
            color: c.text,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            fontSize: 15,
            cursor: loading || !weeklyUnlocked ? "default" : "pointer",
            opacity: loading || !weeklyUnlocked ? 0.45 : 1,
            boxShadow: "0 18px 70px rgba(0,0,0,.20)",
          }}
        >
          <motion.span
            animate={loading ? { rotate: 360 } : { rotate: 0 }}
            transition={
              loading
                ? { duration: 1.1, repeat: Infinity, ease: "linear" }
                : undefined
            }
            style={{ display: "flex", color: c.gold }}
          >
            <Sparkles size={18} />
          </motion.span>

          {loading
            ? "Reading your entries..."
            : isWeekly && !weeklyUnlocked
            ? "Available Sunday"
            : isWeekly
            ? "Create The Nest Digest"
            : "Create Monthly Chapter"}
        </motion.button>

        {isWeekly && !weeklyUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: "center",
              marginBottom: 18,
              color: c.soft,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <div style={{ marginBottom: 4 }}>
              A new Digest becomes available every Sunday at 8:00 PM.
            </div>
            <div style={{ color: c.gold }}>
              Next unlock: {nextWeeklyUnlock.toLocaleString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
          </motion.div>
        )}

        <div style={{ display: "grid", gap: 13 }}>
          {!item || !result?.story ? (
            <EmptyState isWeekly={isWeekly} />
          ) : (
            <>
              <DigestHero item={item} result={result} isWeekly={isWeekly} />
              <StorySection story={result.story} isWeekly={isWeekly} />
              <InsightSection insight={result.integrated_insight} />
              <QuoteSection quote={result.quote_of_the_week} isWeekly={isWeekly} />
              <BiggestChangeSection value={result.biggest_change} />
              <HighlightsSection wins={result.wins || []} challenges={result.challenges || []} />
              <MomentsSection moments={result.moments || []} />
              <NextStepSection result={result} isWeekly={isWeekly} />

              <Link href="/ask-past">
                <motion.button
                  whileTap={{ scale: 0.985 }}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(205,170,100,.20)",
                    background: "rgba(205,170,100,.07)",
                    borderRadius: 18,
                    padding: "16px",
                    color: c.gold,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  Talk to this chapter
                </motion.button>
              </Link>
            </>
          )}

          <ArchiveCard history={history} isWeekly={isWeekly} onSelect={setItem} />
        </div>

        {item && (
          <section
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 9,
            }}
          >
            {[
              { icon: <Mic size={18} />, value: overview.voices, label: "Voice" },
              { icon: <PencilLine size={18} />, value: overview.thoughts, label: "Thoughts" },
              { icon: <Sparkles size={18} />, value: overview.moods, label: "Moods" },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,.055)",
                  background: "rgba(255,255,255,.02)",
                  minHeight: 82,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <div style={{ color: c.gold }}>{card.icon}</div>
                <div style={{ color: c.text, fontSize: 18, fontWeight: 700 }}>{card.value}</div>
                <div style={{ color: c.faint, fontSize: 10 }}>{card.label}</div>
              </div>
            ))}
          </section>
        )}
      </div>
    </motion.div>
  );
}