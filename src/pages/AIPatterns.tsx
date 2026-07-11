import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
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
  green: "rgba(138,220,151,0.92)",
  greenSoft: "rgba(138,220,151,0.12)",
  greenBorder: "rgba(138,220,151,0.24)",
  red: "rgba(248,113,113,0.76)",
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
      {Array.from({ length: 34 }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ y: -80, opacity: 0 }}
          animate={{
            y: "115svh",
            opacity: [0, 0.18, 0.06, 0],
          }}
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
  if (
    type === "creative_pattern" ||
    type === "time_of_day_pattern"
  ) {
    return <Moon size={17} />;
  }

  if (
    type === "stress_pattern" ||
    type === "negative_loop"
  ) {
    return <AlertTriangle size={17} />;
  }

  if (
    type === "growth_pattern" ||
    type === "positive_change"
  ) {
    return <Leaf size={17} />;
  }

  if (type === "habit_pattern") {
    return <Clock3 size={17} />;
  }

  if (
    type === "recurring_topic" ||
    type === "recently_started"
  ) {
    return <Repeat size={17} />;
  }

  return <Brain size={17} />;
}

function timeAgo(date?: string | null) {
  if (!date) return "Not analyzed yet";

  const difference =
    Date.now() - new Date(date).getTime();

  const seconds = Math.max(
    0,
    Math.floor(difference / 1000)
  );

  if (seconds < 60) {
    return "Just now";
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
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Active
          </div>

          <p
            style={{
              margin: 0,
              color: "rgba(205,225,207,0.74)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            The Nest quietly analyzes new entries in
            the background.
          </p>

          <p
            style={{
              margin: "8px 0 0",
              color: colors.textFaint,
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            Analysis begins after at least 3 new
            entries or 500 new words.
          </p>

          {lastCheckedAt && (
            <p
              style={{
                margin: "7px 0 0",
                color: "rgba(138,220,151,0.50)",
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

function PatternCard({
  pattern,
  index,
  onOpen,
}: {
  pattern: AIPattern;
  index: number;
  onOpen: () => void;
}) {
  const [showConfidence, setShowConfidence] =
    useState(false);

  const confidenceScore = Number(
    (pattern as any).confidence_score || 0
  );

  const changeType = String(
    (pattern as any).change_type || ""
  );

  return (
    <motion.button
      onClick={onOpen}
      initial={{
        opacity: 0,
        y: 10,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        delay: Math.min(index * 0.05, 0.35),
        duration: 0.55,
      }}
      style={{
        width: "100%",
        textAlign: "left",
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 20,
        padding: 18,
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

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <h3
              style={{
                fontFamily:
                  "Georgia, 'Times New Roman', serif",
                fontWeight: 400,
                fontSize: 19,
                lineHeight: 1.25,
                color: colors.text,
                margin: "0 0 7px",
              }}
            >
              {pattern.title}
            </h3>

            <span
              onClick={(event) => {
                event.stopPropagation();
                setShowConfidence((current) => !current);
              }}
              style={{
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: colors.goldSoft,
                whiteSpace: "nowrap",
                marginTop: 4,
              }}
            >
              {confidenceScore > 0
                ? `${confidenceScore}%`
                : pattern.confidence}
            </span>
          </div>

          {changeType && (
            <div
              style={{
                display: "inline-flex",
                borderRadius: 999,
                padding: "5px 8px",
                marginBottom: 9,
                background:
                  "rgba(205,170,100,0.06)",
                border:
                  "1px solid rgba(205,170,100,0.12)",
                color: colors.goldSoft,
                fontSize: 9,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
              }}
            >
            {changeType.replace(/_/g, " ")}
            </div>
          )}

          {showConfidence && (
            <p
              style={{
                fontSize: 11,
                lineHeight: 1.5,
                color: colors.textSoft,
                margin: "0 0 10px",
              }}
            >
              {pattern.confidence_reason}
            </p>
          )}

          <p
            style={{
              color:
                "rgba(220,205,182,0.68)",
              fontSize: 13,
              lineHeight: 1.6,
              margin: "0 0 13px",
            }}
          >
            {pattern.description}
          </p>

          <div
            style={{
              display: "grid",
              gap: 7,
              marginBottom: 13,
            }}
          >
            {pattern.evidence
              .slice(0, 2)
              .map((item, evidenceIndex) => (
                <div
                  key={`${item.entry_id}-${evidenceIndex}`}
                  style={{
                    background:
                      "rgba(255,255,255,0.022)",
                    border:
                      "1px solid rgba(255,255,255,0.052)",
                    borderRadius: 14,
                    padding: "10px 11px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color:
                        "rgba(225,210,188,0.72)",
                      fontSize: 12,
                      lineHeight: 1.5,
                      fontStyle: "italic",
                    }}
                  >
                    “{item.quote}”
                  </p>

                  <p
                    style={{
                      color: colors.textFaint,
                      fontSize: 10,
                      margin: "5px 0 0",
                    }}
                  >
                    {item.date}
                  </p>
                </div>
              ))}
          </div>

          <p
            style={{
              margin: 0,
              color:
                "rgba(205,170,100,0.68)",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            {pattern.suggestion}
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
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: colors.gold,
          fontSize: 12,
          marginBottom: 18,
          cursor: "pointer",
        }}
      >
        ← Back to AI Patterns
      </button>

      <p
        style={{
          color: colors.goldSoft,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: 9,
        }}
      >
        New Insight
      </p>

      <h1
        style={{
          fontFamily:
            "Georgia, 'Times New Roman', serif",
          fontSize: 30,
          fontWeight: 400,
          lineHeight: 1.15,
          color: colors.text,
          margin: "0 0 10px",
        }}
      >
        {pattern.title}
      </h1>

      <p
        style={{
          color: colors.textSoft,
          fontSize: 13,
          lineHeight: 1.65,
          margin: "0 0 22px",
        }}
      >
        {pattern.description}
      </p>

      <section
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: colors.goldSoft,
            margin: "0 0 16px",
          }}
        >
          Why The Nest thinks this
        </p>

        <p
          style={{
            color: colors.textSoft,
            fontSize: 12,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {pattern.confidence_reason}
        </p>
      </section>

      <section
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: colors.goldSoft,
            margin: "0 0 16px",
          }}
        >
          Timeline
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          {pattern.evidence
            .slice()
            .sort(
              (a, b) =>
                new Date(b.date).getTime() -
                new Date(a.date).getTime()
            )
            .map((item, index) => (
              <div
                key={`${item.entry_id}-${index}`}
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
                        minHeight: 44,
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
                      fontSize: 11,
                      margin: "0 0 6px",
                    }}
                  >
                    {item.date} · {item.entry_type}
                  </p>

                  <p
                    style={{
                      color:
                        "rgba(225,210,188,0.74)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      fontStyle: "italic",
                      margin: 0,
                    }}
                  >
                    “{item.quote}”
                  </p>

                  {item.mood && (
                    <p
                      style={{
                        color: colors.textFaint,
                        fontSize: 10,
                        margin: "6px 0 0",
                      }}
                    >
                      Mood: {item.mood}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>

      <section
        style={{
          background:
            "linear-gradient(145deg, rgba(205,170,100,0.08), rgba(255,255,255,0.022))",
          border:
            "1px solid rgba(205,170,100,0.14)",
          borderRadius: 20,
          padding: 18,
        }}
      >
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: colors.goldSoft,
            margin: "0 0 10px",
          }}
        >
          Something to try
        </p>

        <p
          style={{
            color: colors.gold,
            fontSize: 13,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {pattern.suggestion}
        </p>
      </section>
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
          fontFamily: "Georgia, serif",
          fontSize: 25,
          fontWeight: 400,
          color: colors.text,
          margin: "0 0 10px",
        }}
      >
        {signedIn
          ? "Let The Nest notice what changes."
          : "Sign in to unlock AI Patterns."}
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
          ? "Supporter automatically analyzes new voice capsules and thoughts in the background. You only hear from The Nest when something meaningful appears."
          : "AI Patterns need a private account so your entries and insights can stay connected securely."}
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
        padding: "30px 22px",
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
          fontFamily: "Georgia, serif",
          fontSize: 25,
          fontWeight: 400,
          color: colors.text,
          margin: "0 0 10px",
        }}
      >
        The Nest is listening.
      </h2>

      <p
        style={{
          color: colors.textSoft,
          fontSize: 13,
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        A new insight will appear here when several
        entries reveal something meaningful.
      </p>
    </section>
  );
}

export function AIPatterns() {
  const [pageData, setPageData] =
    useState<AIPatternPageData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const [selectedPattern, setSelectedPattern] =
    useState<AIPattern | null>(null);

  const [
    expandedHistoryId,
    setExpandedHistoryId,
  ] = useState<string | null>(null);

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

        if (cancelled) return;

        setPageData(result);

        if (result.hasUnseenInsights) {
          await markAIPatternsSeen();
        }
      } catch (loadError: any) {
        if (cancelled) return;

        console.error(
          "Could not load AI Patterns:",
          loadError
        );

        setError(
          loadError.message ||
            "Could not load AI Patterns."
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

  const generation =
    pageData?.latestGeneration || null;

  const history = pageData?.history || [];

  const visiblePatterns = useMemo(() => {
    const patterns =
      generation?.result.patterns || [];

    return showAll
      ? patterns
      : patterns.slice(0, 3);
  }, [generation, showAll]);

  async function handleUpgrade() {
    if (upgradeLoading) return;

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
            "radial-gradient(circle at 50% 0%, rgba(205,170,100,0.09), transparent 35%)",
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
              What The Nest noticed
            </p>

            <h1
              style={{
                fontFamily:
                  "Georgia, 'Times New Roman', serif",
                fontSize: 31,
                fontWeight: 400,
                color: colors.text,
                lineHeight: 1.08,
                margin: "0 0 8px",
              }}
            >
              AI Patterns
            </h1>

            <p
              style={{
                fontSize: 13,
                color: colors.textSoft,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              Insights appear only when something
              meaningful changes.
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
              Opening your insights…
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

              {!generation ? (
                <EmptyActiveState />
              ) : (
                <AnimatePresence>
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 12,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.7,
                    }}
                  >
                    <p
                      style={{
                        color: colors.textFaint,
                        fontSize: 11,
                        margin: "0 0 14px",
                      }}
                    >
                      Discovered{" "}
                      {timeAgo(
                        generation.created_at
                      )}{" "}
                      · Based on{" "}
                      {generation.voice_count} voice
                      capsules and{" "}
                      {generation.thought_count} thoughts.
                    </p>

                    {generation.result.patterns
                      .length > 0 && (
                      <section
                        style={{
                          borderRadius: 24,
                          border:
                            "1px solid rgba(205,170,100,0.16)",
                          background:
                            "linear-gradient(145deg, rgba(205,170,100,0.10), rgba(255,255,255,0.024))",
                          padding: 22,
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 11,
                            color: colors.gold,
                          }}
                        >
                          <Sparkles size={16} />

                          <p
                            style={{
                              margin: 0,
                              fontSize: 10,
                              letterSpacing:
                                "0.18em",
                              textTransform:
                                "uppercase",
                            }}
                          >
                            New Insight
                          </p>
                        </div>

                        <h2
                          style={{
                            fontFamily:
                              "Georgia, serif",
                            fontSize: 25,
                            fontWeight: 400,
                            lineHeight: 1.25,
                            color: colors.text,
                            margin: "0 0 10px",
                          }}
                        >
                          {
                            generation.result
                              .patterns[0].title
                          }
                        </h2>

                        <p
                          style={{
                            color:
                              colors.textSoft,
                            fontSize: 13,
                            lineHeight: 1.65,
                            margin: "0 0 16px",
                          }}
                        >
                          {
                            generation.result
                              .patterns[0]
                              .description
                          }
                        </p>

                        <button
                          onClick={() =>
                            setSelectedPattern(
                              generation.result
                                .patterns[0]
                            )
                          }
                          style={{
                            border: "none",
                            background: "none",
                            padding: 0,
                            color: colors.gold,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Discover why →
                        </button>
                      </section>
                    )}

                    {generation.result.summary && (
                      <section
                        style={{
                          background: colors.card,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 18,
                          padding: 16,
                          marginBottom: 16,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            letterSpacing:
                              "0.16em",
                            textTransform:
                              "uppercase",
                            color:
                              colors.goldSoft,
                            margin: "0 0 8px",
                          }}
                        >
                          What changed
                        </p>

                        <p
                          style={{
                            color:
                              colors.textSoft,
                            fontSize: 13,
                            lineHeight: 1.65,
                            margin: 0,
                          }}
                        >
                          {
                            generation.result
                              .summary
                          }
                        </p>
                      </section>
                    )}

                    {generation.result
                      .hero_themes.length > 0 && (
                      <section
                        style={{
                          background: colors.card,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 18,
                          padding: 16,
                          marginBottom: 16,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            letterSpacing:
                              "0.16em",
                            textTransform:
                              "uppercase",
                            color:
                              colors.goldSoft,
                            margin: "0 0 11px",
                          }}
                        >
                          Themes appearing lately
                        </p>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          {generation.result.hero_themes.map(
                            (theme) => (
                              <span
                                key={theme}
                                style={{
                                  borderRadius:
                                    999,
                                  border:
                                    "1px solid rgba(205,170,100,0.13)",
                                  background:
                                    "rgba(205,170,100,0.055)",
                                  padding:
                                    "8px 11px",
                                  color:
                                    colors.textSoft,
                                  fontSize: 11,
                                }}
                              >
                                {theme}
                              </span>
                            )
                          )}
                        </div>
                      </section>
                    )}

                    {generation.result.patterns
                      .length === 0 ? (
                      <EmptyActiveState />
                    ) : (
                      <>
                        <p
                          style={{
                            fontSize: 10,
                            letterSpacing:
                              "0.16em",
                            textTransform:
                              "uppercase",
                            color:
                              colors.goldSoft,
                            margin: "0 0 10px",
                          }}
                        >
                          Recent discoveries
                        </p>

                        <div
                          style={{
                            display: "grid",
                            gap: 12,
                          }}
                        >
                          {visiblePatterns.map(
                            (
                              pattern,
                              index
                            ) => (
                              <PatternCard
                                key={`${pattern.id}-${index}`}
                                pattern={pattern}
                                index={index}
                                onOpen={() =>
                                  setSelectedPattern(
                                    pattern
                                  )
                                }
                              />
                            )
                          )}
                        </div>

                        {!showAll &&
                          generation.result.patterns
                            .length > 3 && (
                            <button
                              onClick={() =>
                                setShowAll(true)
                              }
                              style={{
                                width: "100%",
                                marginTop: 14,
                                border:
                                  "1px solid rgba(205,170,100,0.14)",
                                background:
                                  "rgba(205,170,100,0.06)",
                                borderRadius: 16,
                                padding:
                                  "14px 16px",
                                color:
                                  colors.gold,
                                fontSize: 11,
                                letterSpacing:
                                  "0.14em",
                                textTransform:
                                  "uppercase",
                                cursor:
                                  "pointer",
                              }}
                            >
                              Show all insights
                            </button>
                          )}
                      </>
                    )}

                    {history.length > 0 && (
                      <section
                        style={{
                          marginTop: 27,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            letterSpacing:
                              "0.16em",
                            textTransform:
                              "uppercase",
                            color:
                              colors.goldSoft,
                            margin: "0 0 10px",
                          }}
                        >
                          Insight History
                        </p>

                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          {history.map(
                            (
                              historyItem: AIPatternGeneration
                            ) => {
                              const expanded =
                                expandedHistoryId ===
                                historyItem.id;

                              return (
                                <div
                                  key={
                                    historyItem.id
                                  }
                                  style={{
                                    background:
                                      expanded
                                        ? "rgba(205,170,100,0.06)"
                                        : colors.card,
                                    border: expanded
                                      ? "1px solid rgba(205,170,100,0.22)"
                                      : `1px solid ${colors.border}`,
                                    borderRadius: 18,
                                    overflow:
                                      "hidden",
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      setExpandedHistoryId(
                                        expanded
                                          ? null
                                          : historyItem.id
                                      )
                                    }
                                    style={{
                                      width:
                                        "100%",
                                      minHeight: 72,
                                      background:
                                        "transparent",
                                      border: "none",
                                      padding:
                                        "15px",
                                      color:
                                        colors.textSoft,
                                      textAlign:
                                        "left",
                                      cursor:
                                        "pointer",
                                      display:
                                        "flex",
                                      alignItems:
                                        "center",
                                      justifyContent:
                                        "space-between",
                                      gap: 12,
                                    }}
                                  >
                                    <div>
                                      <div
                                        style={{
                                          color:
                                            expanded
                                              ? colors.gold
                                              : colors.text,
                                          fontSize: 14,
                                          marginBottom: 5,
                                        }}
                                      >
                                        {formatDate(
                                          historyItem.created_at
                                        )}
                                      </div>

                                      <div
                                        style={{
                                          color:
                                            colors.textFaint,
                                          fontSize: 11,
                                        }}
                                      >
                                        {
                                          historyItem
                                            .result
                                            .patterns
                                            .length
                                        }{" "}
                                        insight
                                        {historyItem
                                          .result
                                          .patterns
                                          .length ===
                                        1
                                          ? ""
                                          : "s"}{" "}
                                        ·{" "}
                                        {
                                          historyItem.entry_count
                                        }{" "}
                                        entries
                                      </div>
                                    </div>

                                    <motion.div
                                      animate={{
                                        rotate:
                                          expanded
                                            ? 90
                                            : 0,
                                      }}
                                    >
                                      <ChevronRight
                                        size={18}
                                        color={
                                          colors.goldSoft
                                        }
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
                                          height:
                                            "auto",
                                          opacity: 1,
                                        }}
                                        exit={{
                                          height: 0,
                                          opacity: 0,
                                        }}
                                        style={{
                                          overflow:
                                            "hidden",
                                        }}
                                      >
                                        <div
                                          style={{
                                            padding:
                                              "0 13px 13px",
                                            display:
                                              "grid",
                                            gap: 10,
                                          }}
                                        >
                                          {historyItem.result.patterns.map(
                                            (
                                              pattern,
                                              index
                                            ) => (
                                              <PatternCard
                                                key={`${historyItem.id}-${pattern.id}-${index}`}
                                                pattern={
                                                  pattern
                                                }
                                                index={
                                                  index
                                                }
                                                onOpen={() =>
                                                  setSelectedPattern(
                                                    pattern
                                                  )
                                                }
                                              />
                                            )
                                          )}

                                          {historyItem
                                            .result
                                            .patterns
                                            .length ===
                                            0 && (
                                            <div
                                              style={{
                                                borderRadius: 15,
                                                border: `1px solid ${colors.border}`,
                                                padding: 14,
                                                color:
                                                  colors.textSoft,
                                                fontSize: 12,
                                              }}
                                            >
                                              No strong
                                              insights
                                              were found in
                                              this analysis.
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </section>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </>
          )}
      </div>
    </motion.div>
  );
}