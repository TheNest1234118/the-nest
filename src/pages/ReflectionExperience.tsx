import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Folder,
  Leaf,
  Mic,
  PencilLine,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  generateReflectionV2,
  loadReflectionV2History,
} from "@/lib/reflectionV2";
import type {
  ReflectionKind,
  ReflectionV2Generation,
} from "@/lib/reflectionV2Types";

const c = {
  bg: "#09090d",
  card: "rgba(255,255,255,.026)",
  cardStrong: "rgba(205,170,100,.07)",
  border: "rgba(255,255,255,.07)",
  goldBorder: "rgba(205,170,100,.20)",
  gold: "rgba(215,178,103,.86)",
  goldSoft: "rgba(205,170,100,.52)",
  text: "rgba(242,231,213,.92)",
  textDim: "rgba(210,194,166,.72)",
  soft: "rgba(185,162,128,.52)",
  faint: "rgba(185,162,128,.34)",
  danger: "rgba(245,140,120,.78)",
  green: "rgba(160,210,115,.78)",
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
  marginBottom: 11,
  fontWeight: 700,
};

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

function getWeekRange(item: ReflectionV2Generation | null) {
  const base = item?.created_at ? new Date(item.created_at) : new Date();
  const day = base.getDay(); // Sunday = 0
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(base);
  start.setDate(base.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString(undefined, {
    day: "numeric",
    month: sameMonth ? undefined : "short",
  });
  const endLabel = end.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

function formatMemoCount(n: number, label: string) {
  return `${n} ${label}${n === 1 ? "" : "s"}`;
}

function moodEmoji(mood?: string) {
  const m = (mood || "").toLowerCase();
  if (m.includes("calm")) return "🌙";
  if (m.includes("good") || m.includes("joy") || m.includes("positive")) return "😊";
  if (m.includes("neutral")) return "🌫️";
  if (m.includes("tired")) return "🕯️";
  if (m.includes("anxious") || m.includes("stress")) return "😟";
  if (m.includes("sad")) return "🖤";
  if (m.includes("frustrated")) return "🌑";
  if (m.includes("foggy")) return "🌫️";
  if (m.includes("motivated") || m.includes("creative")) return "✨";
  return "🙂";
}

function directionIcon(direction?: string) {
  if (direction === "up") return <TrendingUp size={15} color={c.danger} />;
  if (direction === "down") return <TrendingDown size={15} color={c.green} />;
  return <ChevronRight size={15} color={c.goldSoft} />;
}

function OrbBackground() {
  return (
    <>
      <motion.div
        animate={{ opacity: [0.45, 0.75, 0.45], scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 20%, rgba(225,176,86,.18), rgba(225,176,86,.04) 34%, transparent 62%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        animate={{ x: [-18, 18, -18], opacity: [0.35, 0.75, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: "15% -15% auto",
          height: 110,
          background:
            "repeating-linear-gradient(105deg, transparent 0 12px, rgba(215,178,103,.12) 13px, transparent 14px)",
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

function Block({
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
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {icon && (
          <span
            style={{
              color: c.gold,
              display: "flex",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            {icon}
          </span>
        )}
        <p style={sectionLabel}>{title}</p>
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.72,
          color: c.textDim,
        }}
      >
        {children}
      </div>
    </motion.section>
  );
}

function OverviewCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div
      style={{
        minHeight: 88,
        borderRadius: 17,
        border: "1px solid rgba(255,255,255,.06)",
        background:
          "linear-gradient(145deg, rgba(255,255,255,.035), rgba(255,255,255,.018))",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
      }}
    >
      <div style={{ color: c.gold }}>{icon}</div>
      <div style={{ color: c.text, fontSize: 21, fontWeight: 700 }}>{value}</div>
      <div style={{ color: c.soft, fontSize: 11 }}>{label}</div>
    </div>
  );
}

function ListLine({
  children,
  type = "check",
}: {
  children: React.ReactNode;
  type?: "check" | "dot" | "warning";
}) {
  const icon =
    type === "check" ? (
      <CheckCircle2 size={16} fill="rgba(215,178,103,.92)" color="#09090d" />
    ) : type === "warning" ? (
      <AlertTriangle size={16} color={c.gold} />
    ) : (
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 999,
          background: c.gold,
          marginTop: 9,
          flex: "0 0 auto",
        }}
      />
    );

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 10 }}>
      <span style={{ flex: "0 0 auto", marginTop: type === "dot" ? 0 : 2 }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function WeekStory({
  story,
  isWeekly,
}: {
  story: string;
  isWeekly: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = story.length > 330;
  const shown = !shouldCollapse || expanded ? story : `${story.slice(0, 330).trim()}…`;

  return (
    <Block
      title={isWeekly ? "Week Story" : "Month Story"}
      icon={<BookOpen size={17} strokeWidth={1.5} />}
      delay={0.1}
    >
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
          onClick={() => setExpanded((v) => !v)}
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
          {expanded ? "Show less" : "Show more"}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown size={15} />
          </motion.span>
        </button>
      )}
    </Block>
  );
}
function EmotionalJourney({
  journey,
}: {
  journey: Array<{
    day: string;
    has_entry?: boolean;
    mood?: string;
    emoji?: string;
    note?: string;
    chart_score?: number | null;
  }>;
}) {
  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const points = weekDays.map((day) => {
    const found = journey.find((x) => {
      const value = String(x.day || "").toLowerCase();
      const short = day.toLowerCase().slice(0, 3);
    
      return value === day.toLowerCase() || value.startsWith(short);
    });

    return (
      found || {
        day,
        has_entry: false,
        mood: "",
        emoji: "",
        note: "",
        chart_score: null,
      }
    );
  });

  return (
    <Block title="Emotional Journey" icon={<Sparkles size={17} />} delay={0.16}>
      <div style={{ display: "grid", gap: 8 }}>
        {points.map((x, i) => {
          const hasEntry = x.has_entry !== false;

          return (
            <div
              key={`${x.day}-${i}`}
              style={{
                border: "1px solid rgba(255,255,255,.06)",
                background: hasEntry
                  ? "rgba(255,255,255,.026)"
                  : "rgba(255,255,255,.012)",
                borderRadius: 14,
                padding: "11px 12px",
                display: "flex",
                alignItems: "center",
                gap: 11,
                opacity: hasEntry ? 1 : 0.42,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: hasEntry
                    ? "rgba(205,170,100,.08)"
                    : "rgba(255,255,255,.025)",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {hasEntry ? x.emoji || moodEmoji(x.mood || x.note) : ""}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ color: c.textDim, fontSize: 13 }}>
                  {x.day}
                </div>

                <div style={{ color: c.soft, fontSize: 12, marginTop: 2 }}>
                  {hasEntry
                    ? `${x.mood || "Mood"}${x.note ? ` · ${x.note}` : ""}`
                    : "No entries"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Block>
  );
}

function WhatChanged({
  changes,
}: {
  changes: Array<{ label: string; direction?: "up" | "down" | "same" | string }>;
}) {
  return (
    <Block title="What Changed" icon={<TrendingUp size={17} />} delay={0.18}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {(changes || []).slice(0, 4).map((x, i) => (
          <div
            key={`${x.label}-${i}`}
            style={{
              border: "1px solid rgba(255,255,255,.06)",
              background: "rgba(255,255,255,.026)",
              borderRadius: 15,
              padding: "12px 13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ color: c.textDim, fontSize: 13 }}>{x.label}</span>
            {directionIcon(x.direction)}
          </div>
        ))}
      </div>
    </Block>
  );
}

function HeroReflectionCard({
  item,
  isWeekly,
}: {
  item: ReflectionV2Generation | null;
  isWeekly: boolean;
}) {
  const title = isWeekly ? getWeekRange(item) : item ? formatDate(item.created_at) : "Your Reflection";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 23,
        padding: "22px 19px",
        minHeight: 136,
        border: "1px solid rgba(205,170,100,.18)",
        background:
          "linear-gradient(145deg, rgba(205,170,100,.11), rgba(255,255,255,.026))",
        boxShadow: "0 22px 90px rgba(0,0,0,.28)",
      }}
    >
      <OrbBackground />

      <div style={{ position: "relative", zIndex: 1 }}>
        <p style={{ ...sectionLabel, marginBottom: 13 }}>
          {isWeekly ? "Week Reflection" : "Month Reflection"}
        </p>

        <h2
          style={{
            ...serif,
            color: c.text,
            fontSize: 30,
            lineHeight: 1.12,
            margin: "0 0 9px",
          }}
        >
          {title}
        </h2>

        <p style={{ color: c.soft, fontSize: 12, lineHeight: 1.55, margin: 0 }}>
          {item
            ? `Generated ${new Date(item.created_at).toLocaleString()}`
            : "Generate a reflection when you have enough memories."}
        </p>
      </div>
    </motion.section>
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
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.26 }}
      style={{
        borderRadius: 22,
        border: "1px solid rgba(205,170,100,.20)",
        background:
          "linear-gradient(145deg, rgba(205,170,100,.075), rgba(255,255,255,.022))",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => {
          const el = document.getElementById("reflection-archive-list");
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        style={{
          width: "100%",
          minHeight: 70,
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
            <span style={{ display: "block", color: c.gold, fontSize: 15, marginBottom: 2 }}>
              All Reflections
            </span>
            <span style={{ display: "block", color: c.soft, fontSize: 12 }}>
              Browse your past {isWeekly ? "weekly" : "monthly"} reflections.
            </span>
          </span>
        </span>
        <ChevronRight size={18} color={c.goldSoft} />
      </button>

      {history.length > 0 && (
        <div
          id="reflection-archive-list"
          style={{
            borderTop: "1px solid rgba(255,255,255,.055)",
            padding: 12,
            display: "grid",
            gap: 8,
          }}
        >
          {history.map((h) => (
            <button
              key={h.id}
              onClick={() => onSelect(h)}
              style={{
                width: "100%",
                border: `1px solid ${c.border}`,
                background: "rgba(255,255,255,.025)",
                borderRadius: 15,
                padding: "13px 13px",
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
                    {isWeekly ? getWeekRange(h) : formatDate(h.created_at)}
                  </span>
                  <span style={{ display: "block", color: c.faint, fontSize: 11, marginTop: 2 }}>
                    Generated {formatDate(h.created_at)}
                  </span>
                </span>
              </span>
              <ChevronRight size={16} color={c.goldSoft} />
            </button>
          ))}
        </div>
      )}
    </motion.section>
  );
}

export function ReflectionExperience({ kind }: { kind: ReflectionKind }) {
  const [item, setItem] = useState<ReflectionV2Generation | null>(null);
  const [history, setHistory] = useState<ReflectionV2Generation[]>([]);
  const [loading, setLoading] = useState(false);
  const isWeekly = kind === "weekly";

  useEffect(() => {
    async function init() {
      const saved = await loadReflectionV2History(kind);
      setHistory(saved);
      setItem(saved[0] || null);
    }
  
    init();
  }, [kind]);

  async function generate() {
    setLoading(true);
    try {
      const next = await generateReflectionV2(kind);
      setItem(next);
      const saved = await loadReflectionV2History(kind);
setHistory(saved);
    } finally {
      setLoading(false);
    }
  }

  const r = item?.result as any;

  const overview = useMemo(
    () => ({
      voices: item?.voice_count || 0,
      thoughts: item?.thought_count || 0,
      moods: item?.mood_count || 0,
      days:
        (r?.emotional_journey && Array.isArray(r.emotional_journey)
          ? r.emotional_journey.length
          : 0) || (isWeekly ? 7 : 30),
    }),
    [item, r, isWeekly]
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
          padding: "calc(env(safe-area-inset-top,0px)+28px) 18px 42px",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Link href="/home">
              <motion.button
                whileTap={{ scale: 0.94 }}
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
                }}
              >
                <ChevronLeft size={22} strokeWidth={1.35} />
              </motion.button>
            </Link>

            <div>
              <h1
                style={{
                  ...serif,
                  fontSize: 42,
                  lineHeight: 1.04,
                  color: c.text,
                  margin: "0 0 8px",
                }}
              >
                {isWeekly ? "Your Week" : "Your Month"}
              </h1>
              <p style={{ color: c.soft, fontSize: 14, lineHeight: 1.45, margin: 0 }}>
                {isWeekly
                  ? "A calm reflection of your week."
                  : "Looking back at what stayed with you."}
              </p>
            </div>
          </div>

          <button
            aria-label="Reflection options"
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              background: "rgba(255,255,255,.035)",
              border: "1px solid rgba(255,255,255,.07)",
              color: c.textDim,
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            …
          </button>
        </header>

        <motion.button
          onClick={generate}
          disabled={loading}
          whileTap={{ scale: 0.985 }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 15,
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
            fontSize: 16,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.72 : 1,
            boxShadow: "0 18px 70px rgba(0,0,0,.20)",
          }}
        >
          <motion.span
            animate={loading ? { rotate: 360 } : { rotate: 0 }}
            transition={loading ? { duration: 1.1, repeat: Infinity, ease: "linear" } : undefined}
            style={{ display: "flex", color: c.gold }}
          >
            <Sparkles size={18} />
          </motion.span>
          {loading
            ? "Looking back through your entries..."
            : `Generate ${isWeekly ? "Weekly" : "Monthly"} Reflection`}
        </motion.button>

        <div style={{ display: "grid", gap: 13 }}>
          <HeroReflectionCard item={item} isWeekly={isWeekly} />

          {item && (
            <p style={{ color: c.faint, fontSize: 11, lineHeight: 1.5, margin: "-2px 0 0" }}>
              Based on {formatMemoCount(item.voice_count, "Voice Capsule")},{" "}
              {formatMemoCount(item.thought_count, "Thought")},{" "}
              {formatMemoCount(item.mood_count, "Mood Check-in")}.
            </p>
          )}

          {!r || !r.story ? (
            <Block title="Not enough yet" icon={<Sparkles size={17} />}>
              Leave a few more thoughts or voice capsules and The Nest will create a more meaningful reflection.
            </Block>
          ) : (
            <>
              <Block title="Overview" icon={<CalendarDays size={17} />} delay={0.08}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 9 }}>
                  <OverviewCard icon={<Mic size={20} />} value={overview.voices} label="Voice" />
                  <OverviewCard icon={<PencilLine size={20} />} value={overview.thoughts} label="Thoughts" />
                  <OverviewCard icon={<Sparkles size={20} />} value={overview.moods} label="Moods" />
                  <OverviewCard icon={<CalendarDays size={20} />} value={overview.days} label="Days" />
                </div>
              </Block>

              <WeekStory story={r.story} isWeekly={isWeekly} />

              {isWeekly ? (
                <>
                  <Block title="Highlights" icon={<CheckCircle2 size={17} />} delay={0.12}>
                    {(r.wins || []).slice(0, 4).map((x: string, i: number) => (
                      <ListLine key={i}>{x}</ListLine>
                    ))}
                  </Block>

                  <Block title="Challenges" icon={<AlertTriangle size={17} />} delay={0.14}>
                    {(r.challenges || []).slice(0, 4).map((x: string, i: number) => (
                      <ListLine key={i} type="dot">
                        {x}
                      </ListLine>
                    ))}
                  </Block>
                </>
              ) : (
                <>
                  <Block title="Biggest Themes" icon={<BookOpen size={17} />} delay={0.12}>
                    {(r.monthly_themes || []).map((x: any, i: number) => (
                      <ListLine key={i} type="dot">
                        <strong style={{ color: c.text }}>{x.title}</strong> — {x.importance} · {x.mentions} mentions · {x.change}
                      </ListLine>
                    ))}
                  </Block>

                  <Block title="Growth" icon={<TrendingUp size={17} />} delay={0.14}>
                    {(r.month_growth || []).map((x: any, i: number) => (
                      <ListLine key={i}>
                        {x.label}: {x.value}
                      </ListLine>
                    ))}
                  </Block>
                </>
              )}

              <EmotionalJourney journey={r.emotional_journey || []} />

              <WhatChanged changes={r.what_changed || []} />

              <Block
                title={isWeekly ? "Moments Worth Remembering" : "Month Highlights"}
                icon={<Clock3 size={17} />}
                delay={0.2}
              >
                {(r.moments || []).slice(0, 5).map((x: any, i: number) => (
                  <p key={i} style={{ margin: "0 0 9px" }}>
                    <span style={{ color: c.soft }}>{x.date}</span> — “{x.quote}”
                  </p>
                ))}
              </Block>

              <Block title={isWeekly ? "Gentle Reflection" : "What You Learned"} icon={<BookOpen size={17} />} delay={0.22}>
                {r.gentle_reflection}
              </Block>

              <Block title={isWeekly ? "Next Week Focus" : "AI Advice For Next Month"} icon={<Target size={17} />} delay={0.24}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                  <div style={{ flex: 1 }}>{r.next_suggestion}</div>
                  <motion.div
                    animate={{ y: [0, -4, 0], opacity: [0.68, 1, 0.68] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      width: 48,
                      height: 58,
                      flex: "0 0 auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: c.gold,
                      filter: "drop-shadow(0 0 18px rgba(205,170,100,.26))",
                    }}
                  >
                    <Leaf size={42} strokeWidth={1.25} />
                  </motion.div>
                </div>
              </Block>

              {!isWeekly && r.closing_sentence && (
                <section
                  style={{
                    border: "1px solid rgba(205,170,100,.18)",
                    background: "rgba(205,170,100,.08)",
                    borderRadius: 22,
                    padding: 22,
                  }}
                >
                  <p style={{ ...serif, fontSize: 24, lineHeight: 1.35, color: c.text }}>
                    “{r.closing_sentence}”
                  </p>
                </section>
              )}

              <Link href="/ask-past">
                <motion.button
                  whileTap={{ scale: 0.985 }}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(205,170,100,.20)",
                    background: "rgba(205,170,100,.07)",
                    borderRadius: 18,
                    padding: "16px 16px",
                    color: c.gold,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  Talk to this reflection
                </motion.button>
              </Link>
            </>
          )}

          <ArchiveCard history={history} isWeekly={isWeekly} onSelect={setItem} />
        </div>
      </div>
    </motion.div>
  );
}