import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  Heart,
  Leaf,
  Lock,
  Moon,
  Repeat,
  Sparkles,
} from "lucide-react";

import {
  loadAIPatternPageData,
  markAIPatternsSeen,
  type AIPatternPageData,
} from "@/lib/aiPatterns";

import { startSupporterCheckout } from "@/lib/subscription";

import type {
  AIPattern,
  AIPatternGeneration,
  LifeTheme,
} from "@/lib/aiPatternTypes";

const colors = {
  bg: "#09090d",
  card: "rgba(255,255,255,0.026)",
  border: "rgba(255,255,255,0.065)",
  gold: "rgba(205,170,100,0.78)",
  goldSoft: "rgba(205,170,100,0.46)",
  text: "rgba(235,215,180,0.92)",
  textSoft: "rgba(185,162,128,0.58)",
  textFaint: "rgba(175,158,132,0.36)",
  green: "rgba(138,220,151,0.92)",
  greenSoft: "rgba(138,220,151,0.10)",
  greenBorder: "rgba(138,220,151,0.24)",
  red: "rgba(248,113,113,0.78)",
};

const serif: React.CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontWeight: 400,
};

function RainLayer() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: 30 }).map((_, index) => (
        <motion.span
          key={index}
          initial={{
            y: -80,
            opacity: 0,
          }}
          animate={{
            y: "115svh",
            opacity: [0, 0.16, 0.05, 0],
          }}
          transition={{
            duration: 5 + (index % 7) * 0.45,
            repeat: Infinity,
            delay: (index % 13) * 0.35,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            left: `${(index * 37) % 100}%`,
            top: -80,
            width: 1,
            height: 46 + (index % 5) * 12,
            borderRadius: 999,
            background:
              "linear-gradient(to bottom, transparent, rgba(255,255,255,0.16), transparent)",
            transform: "rotate(12deg)",
          }}
        />
      ))}
    </div>
  );
}

function iconFor(type: AIPattern["type"]) {
  if (
    type === "creative_pattern" ||
    type === "time_of_day_pattern"
  ) {
    return <Moon size={18} />;
  }

  if (
    type === "stress_pattern" ||
    type === "negative_loop"
  ) {
    return <AlertTriangle size={18} />;
  }

  if (
    type === "growth_pattern" ||
    type === "positive_change" ||
    type === "confidence_change"
  ) {
    return <Leaf size={18} />;
  }

  if (type === "habit_pattern") {
    return <Clock3 size={18} />;
  }

  if (
    type === "recurring_topic" ||
    type === "recently_started" ||
    type === "priority_change"
  ) {
    return <Repeat size={18} />;
  }

  return <Brain size={18} />;
}

function timeAgo(date?: string | null) {
  if (!date) return "Not checked yet";

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const difference = Date.now() - timestamp;
  const seconds = Math.max(
    0,
    Math.floor(difference / 1000)
  );

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatDate(date?: string | null) {
  if (!date) return "";

  try {
    return new Date(date).toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return date;
  }
}

function formatChangeType(value?: string) {
  return String(value || "")
    .replace(/_/g, " ")
    .trim();
}

function formatDirection(
  direction: LifeTheme["direction"]
) {
  if (direction === "rising") {
    return "Rising";
  }

  if (direction === "falling") {
    return "Fading";
  }

  if (direction === "new") {
    return "New";
  }

  return "Steady";
}

function ActiveStatus({
  lastCheckedAt,
}: {
  lastCheckedAt?: string | null;
}) {
  return (
    <section
      style={{
        borderRadius: 20,
        padding: "16px 17px",
        marginBottom: 18,
        border: `1px solid ${colors.greenBorder}`,
        background:
          "linear-gradient(145deg, rgba(138,220,151,0.10), rgba(255,255,255,0.018))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <motion.div
          animate={{
            opacity: [0.55, 1, 0.55],
            scale: [0.94, 1.06, 0.94],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            marginTop: 5,
            flexShrink: 0,
            background: colors.green,
            boxShadow:
              "0 0 15px rgba(138,220,151,0.58)",
          }}
        />

        <div style={{ flex: 1 }}>
          <div
            style={{
              color: colors.green,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Active
          </div>

          <p
            style={{
              margin: 0,
              color: "rgba(205,225,207,0.76)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            The Nest quietly looks for meaningful
            changes in your recent entries.
          </p>

          <p
            style={{
              margin: "8px 0 0",
              color: colors.textFaint,
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            It only creates an insight when something
            is supported by multiple entries.
          </p>

          {lastCheckedAt && (
            <p
              style={{
                margin: "7px 0 0",
                color: "rgba(138,220,151,0.52)",
                fontSize: 10,
              }}
            >
              Last checked {timeAgo(lastCheckedAt)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function InsightHero({
  pattern,
  onOpen,
}: {
  pattern: AIPattern;
  onOpen: () => void;
}) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 14,
        scale: 0.985,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 26,
        border:
          "1px solid rgba(205,170,100,0.18)",
        background:
          "linear-gradient(145deg, rgba(205,170,100,0.12), rgba(255,255,255,0.024))",
        padding: "23px 21px",
        marginBottom: 17,
        boxShadow:
          "0 25px 90px rgba(0,0,0,0.28)",
      }}
    >
      <motion.div
        animate={{
          opacity: [0.32, 0.65, 0.32],
          scale: [0.97, 1.03, 0.97],
        }}
        transition={{
          duration: 5.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          top: -90,
          right: -55,
          width: 220,
          height: 220,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(218,174,91,0.20), transparent 68%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: colors.gold,
            marginBottom: 13,
          }}
        >
          <Sparkles size={16} />

          <p
            style={{
              margin: 0,
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            The Nest noticed
          </p>
        </div>

        <h2
          style={{
            ...serif,
            fontSize: 27,
            lineHeight: 1.2,
            color: colors.text,
            margin: "0 0 12px",
          }}
        >
          {pattern.title}
        </h2>

        <p
          style={{
            color: colors.textSoft,
            fontSize: 14,
            lineHeight: 1.7,
            margin: "0 0 18px",
          }}
        >
          {pattern.description}
        </p>

        <button
          onClick={onOpen}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: colors.gold,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          See why →
        </button>
      </div>
    </motion.section>
  );
}

function LifeThemesSection({
  themes,
}: {
  themes: LifeTheme[];
}) {
  if (themes.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        borderRadius: 22,
        border: `1px solid ${colors.border}`,
        background: colors.card,
        padding: 17,
        marginBottom: 17,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginBottom: 13,
        }}
      >
        <Heart
          size={17}
          color={colors.gold}
          strokeWidth={1.5}
        />

        <div>
          <p
            style={{
              color: colors.goldSoft,
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              margin: "0 0 3px",
              fontWeight: 700,
            }}
          >
            Your Life Themes
          </p>

          <p
            style={{
              color: colors.textFaint,
              fontSize: 11,
              margin: 0,
            }}
          >
            The parts of life appearing most often.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        {themes.slice(0, 5).map((theme) => (
          <div
            key={theme.id || theme.name}
            style={{
              borderRadius: 16,
              border:
                "1px solid rgba(255,255,255,0.055)",
              background:
                "rgba(255,255,255,0.021)",
              padding: "13px 14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  color: colors.text,
                  fontSize: 14,
                }}
              >
                {theme.name}
              </span>

              <span
                style={{
                  color: colors.goldSoft,
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {formatDirection(theme.direction)}
              </span>
            </div>

            <div
              style={{
                height: 4,
                borderRadius: 999,
                background:
                  "rgba(255,255,255,0.05)",
                overflow: "hidden",
                marginBottom: 9,
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(
                    100,
                    Math.max(0, theme.strength)
                  )}%`,
                }}
                transition={{
                  duration: 0.9,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background:
                    "linear-gradient(to right, rgba(205,170,100,0.34), rgba(225,190,116,0.84))",
                }}
              />
            </div>

            <p
              style={{
                color: colors.textSoft,
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {theme.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PatternCard({
  pattern,
  onOpen,
}: {
  pattern: AIPattern;
  onOpen: () => void;
}) {
  const changeType = formatChangeType(
    pattern.change_type
  );

  return (
    <motion.button
      onClick={onOpen}
      whileTap={{ scale: 0.985 }}
      style={{
        width: "100%",
        textAlign: "left",
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 20,
        padding: 17,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 13,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            background:
              "rgba(205,170,100,0.07)",
            border:
              "1px solid rgba(205,170,100,0.12)",
            color: colors.gold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {iconFor(pattern.type)}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          {changeType && (
            <p
              style={{
                color: colors.goldSoft,
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                margin: "0 0 6px",
              }}
            >
              {changeType}
            </p>
          )}

          <h3
            style={{
              ...serif,
              color: colors.text,
              fontSize: 19,
              lineHeight: 1.25,
              margin: "0 0 8px",
            }}
          >
            {pattern.title}
          </h3>

          <p
            style={{
              color: colors.textSoft,
              fontSize: 12,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {pattern.description}
          </p>
        </div>

        <ChevronRight
          size={17}
          color={colors.goldSoft}
        />
      </div>
    </motion.button>
  );
}

function PatternDetail({
  pattern,
  onBack,
}: {
  pattern: AIPattern;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: 18,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: colors.gold,
          fontSize: 12,
          marginBottom: 20,
          padding: 0,
          cursor: "pointer",
        }}
      >
        ← Back to The Nest Noticed
      </button>

      <p
        style={{
          color: colors.goldSoft,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          margin: "0 0 9px",
        }}
      >
        What The Nest noticed
      </p>

      <h1
        style={{
          ...serif,
          fontSize: 31,
          lineHeight: 1.16,
          color: colors.text,
          margin: "0 0 12px",
        }}
      >
        {pattern.title}
      </h1>

      <p
        style={{
          color: colors.textSoft,
          fontSize: 14,
          lineHeight: 1.7,
          margin: "0 0 22px",
        }}
      >
        {pattern.description}
      </p>

      <section
        style={{
          borderRadius: 20,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            color: colors.goldSoft,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            margin: "0 0 11px",
          }}
        >
          Why The Nest noticed this
        </p>

        <p
          style={{
            color: colors.textSoft,
            fontSize: 12,
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          {pattern.confidence_reason}
        </p>

        <p
          style={{
            color: colors.textFaint,
            fontSize: 10,
            lineHeight: 1.5,
            margin: "9px 0 0",
          }}
        >
          Confidence: {pattern.confidence_score}%
        </p>
      </section>

      <section
        style={{
          borderRadius: 20,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            color: colors.goldSoft,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            margin: "0 0 16px",
          }}
        >
          What supports this
        </p>

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          {pattern.evidence.map(
            (evidence, index) => (
              <div
                key={`${evidence.entry_id}-${index}`}
                style={{
                  display: "flex",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 999,
                      background: colors.gold,
                    }}
                  />

                  {index <
                    pattern.evidence.length - 1 && (
                    <div
                      style={{
                        width: 1,
                        flex: 1,
                        minHeight: 48,
                        background:
                          "rgba(205,170,100,0.16)",
                        marginTop: 6,
                      }}
                    />
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    paddingBottom: 12,
                  }}
                >
                  <p
                    style={{
                      color: colors.goldSoft,
                      fontSize: 10,
                      margin: "0 0 7px",
                    }}
                  >
                    {formatDate(evidence.date)} ·{" "}
                    {evidence.entry_type}
                  </p>

                  <p
                    style={{
                      color:
                        "rgba(225,210,188,0.76)",
                      fontSize: 13,
                      lineHeight: 1.65,
                      fontStyle: "italic",
                      margin: 0,
                    }}
                  >
                    “{evidence.quote}”
                  </p>

                  {evidence.mood && (
                    <p
                      style={{
                        color: colors.textFaint,
                        fontSize: 10,
                        margin: "7px 0 0",
                      }}
                    >
                      Mood: {evidence.mood}
                    </p>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </section>

      {pattern.suggestion && (
        <section
          style={{
            borderRadius: 20,
            background:
              "linear-gradient(145deg, rgba(205,170,100,0.08), rgba(255,255,255,0.022))",
            border:
              "1px solid rgba(205,170,100,0.14)",
            padding: 18,
          }}
        >
          <p
            style={{
              color: colors.goldSoft,
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              margin: "0 0 10px",
            }}
          >
            Something to notice
          </p>

          <p
            style={{
              color: colors.gold,
              fontSize: 13,
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {pattern.suggestion}
          </p>
        </section>
      )}
    </motion.div>
  );
}

function LockedCard({
  signedIn,
  onUpgrade,
  upgradeLoading,
}: {
  signedIn: boolean;
  onUpgrade: () => void;
  upgradeLoading: boolean;
}) {
  return (
    <section
      style={{
        borderRadius: 24,
        padding: 22,
        border:
          "1px solid rgba(205,170,100,0.16)",
        background:
          "linear-gradient(145deg, rgba(205,170,100,0.08), rgba(255,255,255,0.022))",
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.gold,
          background:
            "rgba(205,170,100,0.08)",
          border:
            "1px solid rgba(205,170,100,0.14)",
          marginBottom: 17,
        }}
      >
        {signedIn ? (
          <Crown size={23} />
        ) : (
          <Lock size={21} />
        )}
      </div>

      <h2
        style={{
          ...serif,
          fontSize: 25,
          color: colors.text,
          margin: "0 0 10px",
        }}
      >
        {signedIn
          ? "Discover what you don't notice."
          : "Sign in to unlock The Nest Noticed."}
      </h2>

      <p
        style={{
          color: colors.textSoft,
          fontSize: 13,
          lineHeight: 1.65,
          margin: "0 0 18px",
        }}
      >
        {signedIn
          ? "Supporter lets The Nest quietly compare new voice capsules and thoughts over time. You only hear from it when something meaningful appears."
          : "A private account is needed so your entries and discoveries stay connected securely."}
      </p>

      {signedIn ? (
        <button
          onClick={onUpgrade}
          disabled={upgradeLoading}
          style={{
            width: "100%",
            minHeight: 50,
            borderRadius: 15,
            border:
              "1px solid rgba(205,170,100,0.20)",
            background:
              "rgba(205,170,100,0.09)",
            color: colors.gold,
            fontSize: 13,
            cursor: upgradeLoading
              ? "default"
              : "pointer",
            opacity: upgradeLoading ? 0.55 : 1,
          }}
        >
          {upgradeLoading
            ? "Opening Supporter…"
            : "Unlock automatic insights"}
        </button>
      ) : (
        <Link href="/home">
          <button
            style={{
              width: "100%",
              minHeight: 50,
              borderRadius: 15,
              border:
                "1px solid rgba(205,170,100,0.20)",
              background:
                "rgba(205,170,100,0.09)",
              color: colors.gold,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Go to Profile to sign in
          </button>
        </Link>
      )}
    </section>
  );
}

function EmptyActiveState() {
  return (
    <section
      style={{
        borderRadius: 24,
        padding: "31px 22px",
        textAlign: "center",
        border: `1px solid ${colors.border}`,
        background: colors.card,
      }}
    >
      <motion.div
        animate={{
          opacity: [0.45, 1, 0.45],
          scale: [0.96, 1.06, 0.96],
        }}
        transition={{
          duration: 3.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          width: 72,
          height: 72,
          borderRadius: 999,
          margin: "0 auto 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle, rgba(205,170,100,0.18), rgba(205,170,100,0.04) 58%, transparent)",
          color: colors.gold,
        }}
      >
        <Brain size={30} strokeWidth={1.35} />
      </motion.div>

      <h2
        style={{
          ...serif,
          fontSize: 25,
          color: colors.text,
          margin: "0 0 10px",
        }}
      >
        Nothing strong enough yet.
      </h2>

      <p
        style={{
          color: colors.textSoft,
          fontSize: 13,
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        The Nest will stay quiet until several entries
        reveal something genuinely meaningful.
      </p>
    </section>
  );
}

function InsightHistory({
  history,
  onOpen,
}: {
  history: AIPatternGeneration[];
  onOpen: (pattern: AIPattern) => void;
}) {
  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const historyWithInsights = history.filter(
    (generation) =>
      generation.result.patterns.length > 0
  );

  if (historyWithInsights.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        marginTop: 27,
      }}
    >
      <p
        style={{
          color: colors.goldSoft,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          margin: "0 0 10px",
        }}
      >
        Earlier discoveries
      </p>

      <div
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        {historyWithInsights.map((generation) => {
          const expanded =
            expandedId === generation.id;

          const pattern =
            generation.result.patterns[0];

          return (
            <div
              key={generation.id}
              style={{
                borderRadius: 18,
                overflow: "hidden",
                background: expanded
                  ? "rgba(205,170,100,0.06)"
                  : colors.card,
                border: expanded
                  ? "1px solid rgba(205,170,100,0.22)"
                  : `1px solid ${colors.border}`,
              }}
            >
              <button
                onClick={() =>
                  setExpandedId(
                    expanded ? null : generation.id
                  )
                }
                style={{
                  width: "100%",
                  minHeight: 72,
                  background: "transparent",
                  border: "none",
                  padding: 15,
                  color: colors.textSoft,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      color: expanded
                        ? colors.gold
                        : colors.text,
                      fontSize: 14,
                      marginBottom: 5,
                    }}
                  >
                    {pattern.title}
                  </div>

                  <div
                    style={{
                      color: colors.textFaint,
                      fontSize: 11,
                    }}
                  >
                    {formatDate(
                      generation.created_at
                    )}{" "}
                    · {generation.entry_count} entries
                  </div>
                </div>

                <motion.div
                  animate={{
                    rotate: expanded ? 90 : 0,
                  }}
                >
                  <ChevronRight
                    size={18}
                    color={colors.goldSoft}
                  />
                </motion.div>
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{
                      height: 0,
                      opacity: 0,
                    }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                    }}
                    style={{
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "0 13px 13px",
                      }}
                    >
                      <PatternCard
                        pattern={pattern}
                        onOpen={() => onOpen(pattern)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AIPatterns() {
  const [pageData, setPageData] =
    useState<AIPatternPageData | null>(null);

  const [selectedPattern, setSelectedPattern] =
    useState<AIPattern | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [upgradeLoading, setUpgradeLoading] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result =
          await loadAIPatternPageData();

        if (cancelled) {
          return;
        }

        setPageData(result);

        if (result.hasUnseenInsights) {
          await markAIPatternsSeen();
        }
      } catch (loadError: any) {
        if (cancelled) {
          return;
        }

        console.error(
          "Could not load The Nest Noticed:",
          loadError
        );

        setError(
          loadError.message ||
            "Could not load The Nest Noticed."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpgrade() {
    if (upgradeLoading) {
      return;
    }

    setUpgradeLoading(true);
    setError("");

    try {
      await startSupporterCheckout();
    } catch (checkoutError: any) {
      setError(
        checkoutError.message ||
          "Could not open Supporter checkout."
      );

      setUpgradeLoading(false);
    }
  }

  if (selectedPattern) {
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
            padding:
              "calc(env(safe-area-inset-top, 0px) + 52px) 20px 42px",
          }}
        >
          <PatternDetail
            pattern={selectedPattern}
            onBack={() =>
              setSelectedPattern(null)
            }
          />
        </div>
      </motion.div>
    );
  }

  const latestInsight =
    pageData?.latestInsight || null;

  const lifeThemes =
    pageData?.lifeThemes || [];

  const history =
    pageData?.history || [];

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
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 0%, rgba(205,170,100,0.10), transparent 36%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding:
            "calc(env(safe-area-inset-top, 0px) + 52px) 20px 42px",
        }}
      >
        <header
          style={{
            display: "flex",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <Link href="/home">
            <button
              aria-label="Back"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color:
                  "rgba(185,162,128,0.42)",
                padding: 2,
              }}
            >
              <ChevronLeft
                strokeWidth={1.3}
                size={24}
              />
            </button>
          </Link>

          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: "0 0 7px",
                color: colors.goldSoft,
                fontSize: 10,
                letterSpacing: "0.17em",
                textTransform: "uppercase",
              }}
            >
              Discover what you don't notice
            </p>

            <h1
              style={{
                ...serif,
                fontSize: 32,
                color: colors.text,
                lineHeight: 1.08,
                margin: "0 0 9px",
              }}
            >
              The Nest Noticed
            </h1>

            <p
              style={{
                fontSize: 13,
                color: colors.textSoft,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Quiet observations drawn from your own
              voice capsules and thoughts.
            </p>
          </div>
        </header>

        {loading && (
          <section
            style={{
              borderRadius: 22,
              padding: 24,
              textAlign: "center",
              border: `1px solid ${colors.border}`,
              background: colors.card,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                display: "inline-flex",
                color: colors.gold,
                marginBottom: 12,
              }}
            >
              <Sparkles size={22} />
            </motion.div>

            <p
              style={{
                color: colors.textSoft,
                fontSize: 13,
                margin: 0,
              }}
            >
              Opening what The Nest noticed…
            </p>
          </section>
        )}

        {!loading && error && (
          <p
            style={{
              color: colors.red,
              fontSize: 12,
              lineHeight: 1.5,
              marginBottom: 15,
            }}
          >
            {error}
          </p>
        )}

        {!loading &&
          pageData &&
          pageData.status !== "active" && (
            <LockedCard
              signedIn={pageData.signedIn}
              onUpgrade={handleUpgrade}
              upgradeLoading={upgradeLoading}
            />
          )}

        {!loading &&
          pageData?.status === "active" && (
            <>
              <ActiveStatus
                lastCheckedAt={
                  pageData.lastCheckedAt
                }
              />

              {latestInsight ? (
                <InsightHero
                  pattern={latestInsight}
                  onOpen={() =>
                    setSelectedPattern(
                      latestInsight
                    )
                  }
                />
              ) : (
                <EmptyActiveState />
              )}

              <LifeThemesSection
                themes={lifeThemes}
              />

              <InsightHistory
                history={history}
                onOpen={setSelectedPattern}
              />
            </>
          )}
      </div>
    </motion.div>
  );
}