import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Sparkles,
  Moon,
  Sun,
  Cloud,
  Zap,
  Square,
} from "lucide-react";
import { loadMoodLog } from "@/lib/dailyNest";

interface MoodEntry {
  id: string;
  mood: string;
  mood_date: string;
  created_at: string;
  note?: string;
}

type MoodKey =
  | "calm"
  | "good"
  | "neutral"
  | "overstimulated"
  | "anxious"
  | "sad"
  | "tired"
  | "foggy"
  | "stressed";

const MOODS: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    glow: string;
    note: string;
    tag: string;
  }
> = {
  calm: {
    label: "Calm",
    icon: <Moon size={34} fill="currentColor" />,
    color: "#FFD86B",
    glow: "rgba(255,216,107,.32)",
    note: "A peaceful end to a productive day.",
    tag: "Evening reflection",
  },
  good: {
    label: "Good",
    icon: <Sun size={34} fill="currentColor" />,
    color: "#FF9B2F",
    glow: "rgba(255,155,47,.32)",
    note: "Great conversations and good energy.",
    tag: "Grateful",
  },
  tired: {
    label: "Tired",
    icon: <Cloud size={34} fill="currentColor" />,
    color: "#9C86FF",
    glow: "rgba(156,134,255,.34)",
    note: "Mentally drained but still showing up.",
    tag: "Long day",
  },
  foggy: {
    label: "Foggy",
    icon: <Cloud size={34} fill="currentColor" />,
    color: "#FF83CA",
    glow: "rgba(255,131,202,.34)",
    note: "Brain’s all over the place.",
    tag: "Low clarity",
  },
  neutral: {
    label: "Neutral",
    icon: <Square size={31} fill="currentColor" />,
    color: "#9EADFF",
    glow: "rgba(158,173,255,.30)",
    note: "Not bad, not great. Just a regular day.",
    tag: "Just okay",
  },
  overstimulated: {
    label: "Overstimulated",
    icon: <Zap size={36} fill="currentColor" />,
    color: "#FFE05C",
    glow: "rgba(255,224,92,.35)",
    note: "Everything feels a bit too loud.",
    tag: "Too much",
  },
  stressed: {
    label: "Stressed",
    icon: <Zap size={36} fill="currentColor" />,
    color: "#FFE05C",
    glow: "rgba(255,224,92,.35)",
    note: "Everything feels a bit too loud.",
    tag: "Too much",
  },
  anxious: {
    label: "Foggy",
    icon: <Cloud size={34} fill="currentColor" />,
    color: "#FF83CA",
    glow: "rgba(255,131,202,.34)",
    note: "Brain’s all over the place.",
    tag: "Low clarity",
  },
  sad: {
    label: "Tired",
    icon: <Cloud size={34} fill="currentColor" />,
    color: "#9C86FF",
    glow: "rgba(156,134,255,.34)",
    note: "A heavy day, but still moving.",
    tag: "Soft day",
  },
};

const FILTERS = [
  { key: "all", label: "All", icon: <Sparkles size={15} /> },
  { key: "calm", label: "Calm", icon: <Moon size={15} /> },
  { key: "good", label: "Good", icon: <Sun size={15} /> },
  { key: "tired", label: "Tired", icon: <Cloud size={15} /> },
  { key: "stressed", label: "Stressed", icon: <Zap size={15} /> },
];

function formatDate(date: string) {
  const d = new Date(date);
  const today = new Date();

  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Today • ${time}`;

  return `${d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} • ${time}`;
}

function MiniTrend({ color }: { color: string }) {
  return (
    <svg width="62" height="42" viewBox="0 0 62 42" fill="none">
      <path
        d="M4 24 C12 12 18 30 26 28 C36 26 38 13 48 13 C54 13 56 8 58 6"
        stroke="rgba(255,255,255,.18)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M4 24 C12 12 18 30 26 28 C36 26 38 13 48 13 C54 13 56 8 58 6"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="58" cy="6" r="4" fill={color} />
    </svg>
  );
}
function ProgressRing({ percent }: { percent: number }) {
  const radius = 33;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div style={{ position: "relative", width: 82, height: 82 }}>
      <svg width="82" height="82" viewBox="0 0 82 82">
        <circle cx="41" cy="41" r={radius} stroke="rgba(255,255,255,.06)" strokeWidth="7" fill="none" />
        <circle
          cx="41"
          cy="41"
          r={radius}
          stroke="#FFD86B"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 41 41)"
        />
      </svg>

      <div style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        fontSize: 22,
        color: "rgba(244,225,190,.92)",
        fontWeight: 600,
      }}>
        {percent}%
      </div>
    </div>
  );
}
function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day + 1);
  return d;
}

function isSameOrAfter(a: Date, b: Date) {
  return a.getTime() >= b.getTime();
}

function mostCommonMood(entries: MoodEntry[]) {
  const counts: Record<string, number> = {};

  entries.forEach((entry) => {
    counts[entry.mood] = (counts[entry.mood] || 0) + 1;
  });

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  return top?.[0] ?? "neutral";
}
export function MoodLog() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadMoodLog().then(setEntries).catch(console.error);
  }, []);

  const stats = useMemo(() => {
    if (!entries.length) {
      return {
        topMood: "neutral",
        topMoodPercent: 0,
        trendPercent: 0,
        hasLastWeek: false,
        trendLabel: "No trend yet",
        insight:
          "Your patterns will appear after a few check-ins.",
      };
    }
  
    const now = new Date();
  
    const thisWeekStart =
      getWeekStart(now);
  
    const lastWeekStart =
      new Date(thisWeekStart);
  
    lastWeekStart.setDate(
      lastWeekStart.getDate() - 7
    );
  
    const thisWeek = entries.filter(
      (entry) => {
        const d = new Date(
          entry.mood_date ||
            entry.created_at
        );
  
        return d >= thisWeekStart;
      }
    );
  
    const lastWeek = entries.filter(
      (entry) => {
        const d = new Date(
          entry.mood_date ||
            entry.created_at
        );
  
        return (
          d >= lastWeekStart &&
          d < thisWeekStart
        );
      }
    );
  
    const activeEntries =
      thisWeek.length
        ? thisWeek
        : entries;
  
    const topMood =
      mostCommonMood(activeEntries);
  
    const topMoodThisWeekCount =
      thisWeek.filter(
        (entry) =>
          entry.mood === topMood
      ).length;
  
    const topMoodLastWeekCount =
      lastWeek.filter(
        (entry) =>
          entry.mood === topMood
      ).length;
  
    const topMoodPercent =
      thisWeek.length
        ? Math.round(
            (
              topMoodThisWeekCount /
              thisWeek.length
            ) * 100
          )
        : 0;
  
    const topMoodLastPercent =
      lastWeek.length
        ? Math.round(
            (
              topMoodLastWeekCount /
              lastWeek.length
            ) * 100
          )
        : 0;
  
    const trendPercent =
      lastWeek.length
        ? topMoodPercent -
          topMoodLastPercent
        : 0;
  
    const moodLabel =
      MOODS[topMood]?.label ??
      topMood;
  
    let trendLabel =
      "No trend yet";
  
    if (lastWeek.length) {
      if (trendPercent > 0) {
        trendLabel =
          `+${trendPercent}% more ${moodLabel}`;
      } else if (
        trendPercent < 0
      ) {
        trendLabel =
          `${Math.abs(
            trendPercent
          )}% less ${moodLabel}`;
      } else {
        trendLabel =
          `Same ${moodLabel} level`;
      }
    }
  
    return {
      topMood,
      topMoodPercent,
      trendPercent,
      hasLastWeek:
        lastWeek.length > 0,
      trendLabel,
  
      insight:
        thisWeek.length > 0
          ? `${moodLabel} appeared on ${topMoodPercent}% of your check-ins this week.`
          : `Your most common mood was ${moodLabel}.`,
    };
  }, [entries]);
  const topMoodData =
  MOODS[stats.topMood] ??
  MOODS.neutral;

  const displayEntries = useMemo(() => {
    const source = entries;

    if (filter === "all") return source;

    if (filter === "stressed") {
      return source.filter(
        (e) => e.mood === "stressed" || e.mood === "overstimulated"
      );
    }

    return source.filter((e) => e.mood === filter);
  }, [entries, filter]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",
        background:
          "radial-gradient(circle at top left, rgba(255,216,107,.07), transparent 28%), radial-gradient(circle at 90% 20%, rgba(122,102,255,.06), transparent 28%), #07080d",
        maxWidth: 480,
        margin: "0 auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 26px) 24px 70px",
        color: "rgba(240,224,196,.9)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Link href="/nest">
          <button
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.05)",
              background: "rgba(255,255,255,.055)",
              color: "rgba(235,215,180,.82)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={25} strokeWidth={1.6} />
          </button>
        </Link>

        <button
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.08)",
            background: "rgba(255,255,255,.035)",
            color: "rgba(235,215,180,.8)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <BarChart3 size={21} strokeWidth={1.6} />
        </button>
      </div>

      <p
        style={{
          fontSize: 12,
          letterSpacing: "0.36em",
          textTransform: "uppercase",
          color: "rgba(232,190,108,.78)",
          marginBottom: 14,
        }}
      >
        Mood Log
      </p>

      <h1
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 42,
          lineHeight: 1.02,
          fontWeight: 400,
          color: "rgba(250,230,194,.96)",
          margin: 0,
          marginBottom: 12,
          textShadow: "0 0 28px rgba(255,216,107,.08)",
        }}
      >
        How your days felt.
      </h1>

      <p
        style={{
          fontSize: 17,
          lineHeight: 1.55,
          color: "rgba(190,172,143,.58)",
          marginBottom: 26,
        }}
      >
        A quiet record of how you arrived each day.
      </p>

      <section
        style={{
          borderRadius: 30,
          padding: 22,
          marginBottom: 16,
          border: "1px solid rgba(255,255,255,.075)",
          background:
            "linear-gradient(135deg, rgba(255,255,255,.065), rgba(255,255,255,.022))",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.04)",
          display: "grid",
          gridTemplateColumns: "1.2fr .9fr 1.2fr",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
  style={{
    width: 62,
    height: 62,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",

    color:
      topMoodData.color,

    background:
      `radial-gradient(circle, ${topMoodData.glow}, rgba(255,255,255,.035) 58%, transparent 72%)`,

    boxShadow:
      `0 0 28px ${topMoodData.glow}`,
  }}
>
  {topMoodData.icon}
</div>

          <div>
            <div style={{ fontSize: 15, color: "rgba(244,225,190,.84)" }}>
              This week
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                marginTop: 5,
                color: "rgba(255,239,210,.96)",
              }}
            >
              {MOODS[stats.topMood]?.label ?? stats.topMood}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "rgba(190,172,143,.55)",
                marginTop: 3,
              }}
            >
              most common mood
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
        <ProgressRing
  percent={
    stats.topMoodPercent
  }
/>
          <div
            style={{
              fontSize: 13,
              color: "rgba(190,172,143,.72)",
              marginTop: 3,
            }}
          >
            {topMoodData.label} days
          </div>
        </div>

        <div
          style={{
            borderLeft: "1px solid rgba(255,255,255,.055)",
            paddingLeft: 18,
          }}
        >
          <div style={{ fontSize: 15, color: "rgba(244,225,190,.86)" }}>
            Mood trend
          </div>
          <MiniTrend
  color={
    topMoodData.color
  }
/>
<div
  style={{
    fontSize: 16,
    color:
      stats.trendPercent > 0
        ? "#64DE77"
        : stats.trendPercent < 0
        ? "#FF8D8D"
        : "rgba(244,225,190,.72)",
    fontWeight: 600,
    marginTop: 2,
  }}
>
  {stats.trendLabel}
</div>

{stats.hasLastWeek && (
  <div
    style={{
      fontSize: 13,
      color: "rgba(190,172,143,.52)",
    }}
  >
    than last week
  </div>
)}
        </div>
      </section>

      <div
  style={{
    display: "flex",
    gap: 8,
    overflowX: "auto",
    overflowY: "hidden",
    padding: "8px 0 18px",
    marginBottom: 4,

    scrollbarWidth: "none",      // Firefox
    msOverflowStyle: "none",     // IE/Edge
    WebkitOverflowScrolling: "touch",
  }}
  className="hide-scrollbar"
>
        {FILTERS.map((item) => {
          const active = filter === item.key;

          return (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              style={{
                border: "1px solid rgba(255,255,255,.07)",
                borderRadius: 999,
                padding: "12px 17px",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
                background: active
                  ? "rgba(255,216,107,.115)"
                  : "rgba(255,255,255,.03)",
                color: active
                  ? "rgba(255,239,210,.96)"
                  : "rgba(218,199,170,.70)",
                boxShadow: active
                  ? "0 0 24px rgba(255,216,107,.12), inset 0 0 18px rgba(255,216,107,.05)"
                  : "none",
                cursor: "pointer",
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {displayEntries.map((entry, index) => {
          const mood = MOODS[entry.mood] ?? MOODS.calm;

          return (
            <motion.article
              key={entry.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.045, duration: 0.38 }}
              style={{
                borderRadius: 28,
                padding: 18,
                minHeight: 104,
                border: "1px solid rgba(255,255,255,.07)",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,.055), rgba(255,255,255,.018))",
                display: "grid",
                gridTemplateColumns: "76px 1.2fr 1.1fr 34px",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  color: mood.color,
                  background: `radial-gradient(circle, ${mood.glow}, rgba(255,255,255,.035) 58%, transparent 74%)`,
                  boxShadow: `0 0 30px ${mood.glow}`,
                }}
              >
                {mood.icon}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 23,
                    fontWeight: 600,
                    color: mood.color,
                    marginBottom: 6,
                  }}
                >
                  {mood.label}
                </div>
{stats.hasLastWeek && (
  <div
    style={{
      fontSize: 13,
      color:
        "rgba(190,172,143,.52)",
    }}
  >
    than last week
  </div>
)}

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    padding: "5px 10px",
                    background: `${mood.glow.replace(".32", ".13").replace(".34", ".13").replace(".30", ".13").replace(".35", ".13")}`,
                    color: mood.color,
                    fontSize: 11,
                  }}
                >
                  <span>{mood.label === "Good" ? "🧡" : mood.label === "Neutral" ? "◻️" : mood.label === "Tired" ? "💼" : mood.label === "Foggy" ? "☁️" : mood.label === "Overstimulated" ? "⚡" : "🌙"}</span>
                  {mood.tag}
                </div>
              </div>

              <div
                style={{
                  fontSize: 16,
                  lineHeight: 1.55,
                  color: "rgba(224,211,194,.76)",
                }}
              >
                {entry.note || "No note added for this check-in."}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 16,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: mood.color,
                    boxShadow: `0 0 15px ${mood.color}`,
                  }}
                />
                <ChevronRight
                  size={21}
                  strokeWidth={1.5}
                  color="rgba(190,172,143,.35)"
                />
              </div>
            </motion.article>
          );
        })}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{
          marginTop: 16,
          borderRadius: 30,
          padding: 20,
          border: "1px solid rgba(255,255,255,.08)",
          background:
            "linear-gradient(135deg, rgba(156,84,255,.18), rgba(255,255,255,.025))",
          display: "grid",
          gridTemplateColumns: "72px 1fr auto",
          gap: 14,
          alignItems: "center",
          boxShadow: "0 0 32px rgba(156,84,255,.08)",
        }}
      >
        <div
          style={{
            width: 66,
            height: 66,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            color: "#C68BFF",
            background:
              "radial-gradient(circle, rgba(198,139,255,.30), rgba(198,139,255,.06) 60%, transparent 74%)",
            boxShadow: "0 0 28px rgba(198,139,255,.2)",
          }}
        >
          <Sparkles size={32} fill="currentColor" />
        </div>

        <div>
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,239,210,.94)",
              marginBottom: 7,
            }}
          >
            Notice a pattern?
          </div>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: "rgba(215,196,174,.60)",
            }}
          >
           {stats.insight}
          </div>
        </div>

        <button
          style={{
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.08)",
            background: "rgba(255,255,255,.045)",
            color: "rgba(255,239,210,.9)",
            padding: "12px 16px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          View insights
          <ChevronRight size={18} />
        </button>
      </motion.section>
    </motion.div>
  );
}