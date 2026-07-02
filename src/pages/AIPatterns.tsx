import React, { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Sparkles,
  Repeat,
  Brain,
  Moon,
  Flame,
  Clock3,
  Leaf,
  AlertTriangle,
} from "lucide-react";
import {
  generateAIPatterns,
  loadPatternEntries,
} from "@/lib/aiPatterns";
import type {
  AIPattern,
  AIPatternResponse,
  AIPatternTimeRange,
} from "@/lib/aiPatternTypes";

const colors = {
  bg: "#09090d",
  card: "rgba(255,255,255,0.026)",
  border: "rgba(255,255,255,0.065)",
  gold: "rgba(205,170,100,0.72)",
  goldSoft: "rgba(205,170,100,0.42)",
  text: "rgba(235,215,180,0.90)",
  textSoft: "rgba(185,162,128,0.52)",
  textFaint: "rgba(175,158,132,0.34)",
};

function RainLayer() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: 34 }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: "115svh", opacity: [0, 0.18, 0.06, 0] }}
          transition={{
            duration: 5 + (i % 7) * 0.45,
            repeat: Infinity,
            delay: (i % 13) * 0.35,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            left: `${(i * 37) % 100}%`,
            top: -80,
            width: 1,
            height: 46 + (i % 5) * 12,
            borderRadius: 999,
            background:
              "linear-gradient(to bottom, transparent, rgba(255,255,255,0.18), transparent)",
            transform: "rotate(12deg)",
          }}
        />
      ))}
    </div>
  );
}

function iconFor(type: AIPattern["type"]) {
  if (type === "creative_pattern" || type === "time_of_day_pattern") return <Moon size={17} />;
  if (type === "stress_pattern" || type === "negative_loop") return <AlertTriangle size={17} />;
  if (type === "growth_pattern" || type === "positive_change") return <Leaf size={17} />;
  if (type === "habit_pattern") return <Clock3 size={17} />;
  if (type === "recurring_topic" || type === "recently_started") return <Repeat size={17} />;
  return <Brain size={17} />;
}

function labelForRange(range: AIPatternTimeRange) {
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  if (range === "90d") return "Last 90 days";
  return "All time";
}

function PatternCard({ pattern, index }: { pattern: AIPattern; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.05, 0.35), duration: 0.55 }}
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            background: "rgba(205,170,100,0.07)",
            border: "1px solid rgba(205,170,100,0.12)",
            color: colors.gold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {iconFor(pattern.type)}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <h3
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 400,
                fontSize: 19,
                lineHeight: 1.25,
                color: colors.text,
                marginBottom: 7,
              }}
            >
              {pattern.title}
            </h3>

            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: colors.goldSoft,
                whiteSpace: "nowrap",
                marginTop: 4,
              }}
            >
              {pattern.confidence}
            </span>
          </div>

          <p
            style={{
              color: "rgba(220,205,182,0.68)",
              fontSize: 13,
              lineHeight: 1.65,
              marginBottom: 15,
            }}
          >
            {pattern.description}
          </p>

          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: colors.goldSoft,
              marginBottom: 8,
            }}
          >
            Evidence
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            {pattern.evidence.map((item, i) => (
              <div
                key={`${item.entry_id}-${i}`}
                style={{
                  background: "rgba(255,255,255,0.022)",
                  border: "1px solid rgba(255,255,255,0.052)",
                  borderRadius: 14,
                  padding: "11px 12px",
                }}
              >
                <p
                  style={{
                    color: "rgba(225,210,188,0.72)",
                    fontSize: 12,
                    lineHeight: 1.55,
                    fontStyle: "italic",
                  }}
                >
                  “{item.quote}”
                </p>
                <p
                  style={{
                    color: colors.textFaint,
                    fontSize: 10,
                    marginTop: 6,
                  }}
                >
                  {item.date}
                </p>
              </div>
            ))}
          </div>

          {pattern.suggestion && (
            <div
              style={{
                marginTop: 14,
                borderTop: "1px solid rgba(255,255,255,0.055)",
                paddingTop: 13,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: colors.goldSoft,
                  marginBottom: 6,
                }}
              >
                Gentle suggestion
              </p>
              <p
                style={{
                  color: "rgba(205,170,100,0.68)",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {pattern.suggestion}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function AIPatterns() {
  const [range, setRange] = useState<AIPatternTimeRange>("30d");
  const [result, setResult] = useState<AIPatternResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedEmpty, setCheckedEmpty] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate(nextRange = range) {
    setError("");
    setLoading(true);
    setCheckedEmpty(false);

    try {
      const entries = await loadPatternEntries(nextRange);

      if (entries.length < 3) {
        setResult({ summary: "", patterns: [] });
        setCheckedEmpty(true);
        return;
      }

      const data = await generateAIPatterns(nextRange);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Could not generate patterns.");
    } finally {
      setLoading(false);
    }
  }

  const ranges: AIPatternTimeRange[] = ["7d", "30d", "90d", "all"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",
        background: colors.bg,
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <RainLayer />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 42px",
        }}
      >
        <header style={{ display: "flex", gap: 14, marginBottom: 28 }}>
          <Link href="/home">
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(185,162,128,0.32)",
                padding: 2,
              }}
            >
              <ChevronLeft strokeWidth={1.3} size={24} />
            </button>
          </Link>

          <div>
            <h1
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 31,
                fontWeight: 400,
                color: colors.text,
                lineHeight: 1.08,
                marginBottom: 8,
              }}
            >
              AI Patterns
            </h1>
            <p
              style={{
                fontSize: 13,
                color: colors.textSoft,
                lineHeight: 1.55,
              }}
            >
              Notice what keeps returning.
            </p>
          </div>
        </header>

        <div
  style={{
    display: "flex",
    gap: 8,
    overflowX: "auto",
    overflowY: "hidden",
    marginBottom: 16,
    paddingBottom: 6,

    scrollbarWidth: "thin", // Firefox
    scrollbarColor: "rgba(205,170,100,.35) transparent",

    WebkitOverflowScrolling: "touch",
  }}
>
          {ranges.map((item) => (
            <button
              key={item}
              onClick={() => {
                setRange(item);
                setResult(null);
                setCheckedEmpty(false);
              }}
              style={{
                border:
                  range === item
                    ? "1px solid rgba(205,170,100,0.28)"
                    : `1px solid ${colors.border}`,
                background:
                  range === item ? "rgba(205,170,100,0.10)" : colors.card,
                color: range === item ? colors.gold : colors.textSoft,
                borderRadius: 999,
                padding: "9px 13px",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {labelForRange(item)}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleGenerate(range)}
          disabled={loading}
          style={{
            width: "100%",
            minHeight: 62,
            borderRadius: 18,
            border: "1px solid rgba(205,170,100,0.18)",
            background:
              "linear-gradient(145deg, rgba(205,170,100,0.10), rgba(255,255,255,0.026))",
            color: colors.text,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <Sparkles size={17} color={colors.gold} />
          {loading ? "Looking through what you’ve left behind…" : "Generate AI Patterns"}
        </button>

        {loading && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 20,
              padding: 22,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            <Flame size={20} color={colors.gold} />
            <p
              style={{
                marginTop: 10,
                color: colors.textSoft,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Listening for patterns…
            </p>
          </motion.div>
        )}

        {error && (
          <p
            style={{
              color: "rgba(248,113,113,0.68)",
              fontSize: 12,
              lineHeight: 1.5,
              marginBottom: 14,
            }}
          >
            {error}
          </p>
        )}

        {result?.summary && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              borderRadius: 24,
              border: "1px solid rgba(205,170,100,0.16)",
              background:
                "linear-gradient(145deg, rgba(205,170,100,0.10), rgba(255,255,255,0.024))",
              padding: 22,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: colors.goldSoft,
                marginBottom: 10,
              }}
            >
              What the AI noticed
            </p>
            <p
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                color: colors.text,
                fontSize: 22,
                lineHeight: 1.35,
              }}
            >
              “{result.summary}”
            </p>
          </motion.section>
        )}

        {checkedEmpty && result?.patterns.length === 0 && (
          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 20,
              padding: 22,
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontFamily: "Georgia, serif",
                fontWeight: 400,
                color: colors.text,
                fontSize: 23,
                marginBottom: 10,
              }}
            >
              Not enough patterns yet.
            </h2>
            <p
              style={{
                color: colors.textSoft,
                fontSize: 13,
                lineHeight: 1.65,
                marginBottom: 18,
              }}
            >
              Leave a few more thoughts or voice capsules, and The Nest will start noticing what keeps returning.
            </p>

            <div style={{ display: "grid", gap: 9 }}>
              <Link href="/memos">
                <button style={quickButtonStyle}>Record a voice capsule</button>
              </Link>
              <Link href="/thoughts">
                <button style={quickButtonStyle}>Write a thought</button>
              </Link>
            </div>
          </div>
        )}

        {result?.patterns?.length ? (
          <div style={{ display: "grid", gap: 12 }}>
            {result.patterns.map((pattern, index) => (
              <PatternCard
                key={`${pattern.title}-${index}`}
                pattern={pattern}
                index={index}
              />
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

const quickButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(205,170,100,0.14)",
  background: "rgba(205,170,100,0.06)",
  borderRadius: 14,
  padding: "13px 14px",
  color: "rgba(225,205,176,0.78)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
};