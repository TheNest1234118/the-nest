import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Sparkles,
  Repeat,
  Brain,
  Moon,
  Clock3,
  Leaf,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  generateAIPatterns,
  loadAIPatternHistory,
} from "@/lib/aiPatterns";
import type {
  AIPattern,
  AIPatternGeneration,
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
            background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.18), transparent)",
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

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `Generated ${sec} seconds ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Generated ${min} minutes ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Generated ${h} hours ago`;
  return `Generated ${Math.floor(h / 24)} days ago`;
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
  const [showConfidence, setShowConfidence] = useState(false);

  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.05, 0.35), duration: 0.55 }}
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
              onClick={(e) => {
                e.stopPropagation();
                setShowConfidence((v) => !v);
              }}
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

          {showConfidence && (
            <p style={{ fontSize: 11, lineHeight: 1.5, color: colors.textSoft, marginBottom: 10 }}>
              {pattern.confidence_reason}
            </p>
          )}

          <p style={{ color: "rgba(220,205,182,0.68)", fontSize: 13, lineHeight: 1.6, marginBottom: 13 }}>
            {pattern.description}
          </p>

          <div style={{ display: "grid", gap: 7, marginBottom: 13 }}>
            {pattern.evidence.slice(0, 2).map((item, i) => (
              <div
                key={`${item.entry_id}-${i}`}
                style={{
                  background: "rgba(255,255,255,0.022)",
                  border: "1px solid rgba(255,255,255,0.052)",
                  borderRadius: 14,
                  padding: "10px 11px",
                }}
              >
                <p style={{ color: "rgba(225,210,188,0.72)", fontSize: 12, lineHeight: 1.5, fontStyle: "italic" }}>
                  “{item.quote}”
                </p>
                <p style={{ color: colors.textFaint, fontSize: 10, marginTop: 5 }}>
                  {item.date}
                </p>
              </div>
            ))}
          </div>

          <p style={{ color: "rgba(205,170,100,0.68)", fontSize: 13, lineHeight: 1.55 }}>
            {pattern.suggestion}
          </p>
        </div>

        <ChevronRight size={17} color={colors.goldSoft} />
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
    <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
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

      <h1
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 30,
          fontWeight: 400,
          lineHeight: 1.15,
          color: colors.text,
          marginBottom: 10,
        }}
      >
        {pattern.title}
      </h1>

      <p style={{ color: colors.textSoft, fontSize: 13, lineHeight: 1.65, marginBottom: 22 }}>
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
        <p style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: colors.goldSoft, marginBottom: 16 }}>
          Timeline
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          {pattern.evidence
            .slice()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((item, i) => (
              <div key={`${item.entry_id}-${i}`} style={{ display: "flex", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 9, height: 9, borderRadius: 999, background: colors.gold }} />
                  {i < pattern.evidence.length - 1 && (
                    <div style={{ width: 1, flex: 1, minHeight: 44, background: "rgba(205,170,100,0.16)", marginTop: 6 }} />
                  )}
                </div>

                <div style={{ flex: 1, paddingBottom: 12 }}>
                  <p style={{ color: colors.goldSoft, fontSize: 11, marginBottom: 6 }}>
                    {item.date} · {item.entry_type}
                  </p>
                  <p style={{ color: "rgba(225,210,188,0.74)", fontSize: 13, lineHeight: 1.6, fontStyle: "italic" }}>
                    “{item.quote}”
                  </p>
                  {item.mood && (
                    <p style={{ color: colors.textFaint, fontSize: 10, marginTop: 6 }}>
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
          background: "linear-gradient(145deg, rgba(205,170,100,0.08), rgba(255,255,255,0.022))",
          border: "1px solid rgba(205,170,100,0.14)",
          borderRadius: 20,
          padding: 18,
        }}
      >
        <p style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: colors.goldSoft, marginBottom: 10 }}>
          AI Insight
        </p>
        <p style={{ color: colors.text, fontSize: 14, lineHeight: 1.7, marginBottom: 14 }}>
          {pattern.description}
        </p>
        <p style={{ color: colors.gold, fontSize: 13, lineHeight: 1.6 }}>
          {pattern.suggestion}
        </p>
      </section>
    </motion.div>
  );
}

const loadingSteps = [
  "Looking through what you’ve left behind…",
  "Finding recurring thoughts…",
  "Connecting memories…",
  "Looking for patterns…",
];

export function AIPatterns() {
  const [range, setRange] = useState<AIPatternTimeRange>("30d");
  const [generation, setGeneration] = useState<AIPatternGeneration | null>(null);
  const [history, setHistory] = useState<AIPatternGeneration[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<AIPattern | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function refreshHistory(selected?: AIPatternGeneration) {
    const saved = await Promise.resolve(loadAIPatternHistory());
    setHistory(saved);
    setGeneration(selected || saved[0] || null);
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setLoadingStep((current) => (current + 1) % loadingSteps.length);
    }, 1600);

    return () => clearInterval(interval);
  }, [loading]);

  async function handleGenerate() {
    setError("");
    setLoading(true);
    setLoadingStep(0);
    setShowAll(false);
    setSelectedPattern(null);
    setExpandedHistoryId(null);

    const started = Date.now();

    try {
      const next = await generateAIPatterns(range);
      const elapsed = Date.now() - started;
      const delay = Math.max(0, 5200 - elapsed);

      setTimeout(() => {
        refreshHistory(next);
        setLoading(false);
      }, delay);
    } catch (err: any) {
      setError(err.message || "Could not generate patterns.");
      setLoading(false);
    }
  }

  const ranges: AIPatternTimeRange[] = ["7d", "30d", "90d", "all"];

  const visiblePatterns = useMemo(() => {
    const patterns = generation?.result.patterns || [];
    return showAll ? patterns : patterns.slice(0, 3);
  }, [generation, showAll]);

  const previous = history.find((item) => item.id !== generation?.id);

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
        <div style={{ position: "relative", zIndex: 1, padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 42px" }}>
          <PatternDetail pattern={selectedPattern} onBack={() => setSelectedPattern(null)} />
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
            <p style={{ fontSize: 13, color: colors.textSoft, lineHeight: 1.55 }}>
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
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(205,170,100,.35) transparent",
          }}
        >
          {ranges.map((item) => (
            <button
              key={item}
              onClick={() => {
                setRange(item);
                setShowAll(false);
              }}
              style={{
                border:
                  range === item
                    ? "1px solid rgba(205,170,100,0.28)"
                    : `1px solid ${colors.border}`,
                background: range === item ? "rgba(205,170,100,0.10)" : colors.card,
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
          onClick={handleGenerate}
          disabled={loading}
          style={{
            width: "100%",
            minHeight: 62,
            borderRadius: 18,
            border: "1px solid rgba(205,170,100,0.18)",
            background: "linear-gradient(145deg, rgba(205,170,100,0.10), rgba(255,255,255,0.026))",
            color: colors.text,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.78 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <Sparkles size={17} color={colors.gold} />
          <AnimatePresence mode="wait">
            <motion.span
              key={loading ? loadingSteps[loadingStep] : "generate"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35 }}
            >
              {loading ? loadingSteps[loadingStep] : "Generate AI Patterns"}
            </motion.span>
          </AnimatePresence>
        </button>

        {error && (
          <p style={{ color: "rgba(248,113,113,0.68)", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
            {error}
          </p>
        )}

        {generation && !loading && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <p style={{ color: colors.textFaint, fontSize: 11, marginBottom: 14 }}>
                {timeAgo(generation.created_at)} · Based on {generation.voice_count} voice capsules and {generation.thought_count} thoughts.
              </p>

              {generation.result.hero_themes.length > 0 && (
                <section
                  style={{
                    borderRadius: 24,
                    border: "1px solid rgba(205,170,100,0.16)",
                    background: "linear-gradient(145deg, rgba(205,170,100,0.10), rgba(255,255,255,0.024))",
                    padding: 22,
                    marginBottom: 16,
                  }}
                >
                  <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: colors.goldSoft, marginBottom: 10 }}>
                    What the AI noticed
                  </p>

                  <p style={{ color: colors.text, fontSize: 14, lineHeight: 1.7, marginBottom: 10 }}>
                    This period your thoughts returned again and again to:
                  </p>

                  <div style={{ display: "grid", gap: 6 }}>
                    {generation.result.hero_themes.map((theme) => (
                      <p key={theme} style={{ color: colors.text, fontFamily: "Georgia,serif", fontSize: 20 }}>
                        • {theme}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              {previous && (
                <section
                  style={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <p style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: colors.goldSoft, marginBottom: 8 }}>
                    Compare with previous analysis
                  </p>
                  <p style={{ color: colors.textSoft, fontSize: 13, lineHeight: 1.6 }}>
                    Previous analysis: {new Date(previous.created_at).toLocaleDateString()} ·{" "}
                    {previous.result.hero_themes.slice(0, 3).join(" · ") || "No strong themes detected."}
                  </p>
                </section>
              )}

              {generation.result.patterns.length === 0 ? (
                <div
                  style={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 20,
                    padding: 22,
                    textAlign: "center",
                  }}
                >
                  <h2 style={{ fontFamily: "Georgia, serif", fontWeight: 400, color: colors.text, fontSize: 23, marginBottom: 10 }}>
                    Not enough patterns yet.
                  </h2>
                  <p style={{ color: colors.textSoft, fontSize: 13, lineHeight: 1.65, marginBottom: 18 }}>
                    Leave a few more thoughts or voice capsules and The Nest will begin noticing what keeps returning.
                  </p>
                  <Link href="/memos">
                    <button
                      style={{
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
                      }}
                    >
                      Capture Something
                    </button>
                  </Link>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: colors.goldSoft, marginBottom: 10 }}>
                    Top 3 Patterns
                  </p>

                  <div style={{ display: "grid", gap: 12 }}>
                    {visiblePatterns.map((pattern, index) => (
                      <PatternCard
                        key={`${pattern.id}-${index}`}
                        pattern={pattern}
                        index={index}
                        onOpen={() => setSelectedPattern(pattern)}
                      />
                    ))}
                  </div>

                  {!showAll && generation.result.patterns.length > 3 && (
                    <button
                      onClick={() => setShowAll(true)}
                      style={{
                        width: "100%",
                        marginTop: 14,
                        border: "1px solid rgba(205,170,100,0.14)",
                        background: "rgba(205,170,100,0.06)",
                        borderRadius: 16,
                        padding: "14px 16px",
                        color: colors.gold,
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      Show all patterns
                    </button>
                  )}
                </>
              )}

              {history.length > 0 && (
                <section style={{ marginTop: 26 }}>
                  <p
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: colors.goldSoft,
                      marginBottom: 10,
                    }}
                  >
                    Pattern History
                  </p>

                  <div style={{ display: "grid", gap: 10 }}>
                    {history.map((item) => {
                      const expanded = expandedHistoryId === item.id;

                      return (
                        <div
                          key={item.id}
                          style={{
                            background: expanded ? "rgba(205,170,100,0.06)" : "rgba(255,255,255,0.028)",
                            border: expanded ? "1px solid rgba(205,170,100,0.22)" : `1px solid ${colors.border}`,
                            borderRadius: 18,
                            overflow: "hidden",
                          }}
                        >
                          <button
                            onClick={() => {
                              setExpandedHistoryId(expanded ? null : item.id);
                            }}
                            style={{
                              width: "100%",
                              minHeight: 76,
                              background: "transparent",
                              border: "none",
                              padding: "16px 15px",
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
                                  fontSize: 10,
                                  letterSpacing: "0.16em",
                                  textTransform: "uppercase",
                                  color: expanded ? colors.gold : colors.goldSoft,
                                  marginBottom: 7,
                                }}
                              >
                                AI Pattern Folder
                              </div>

                              <div
                                style={{
                                  fontSize: 15,
                                  color: expanded ? colors.text : colors.textSoft,
                                  marginBottom: 4,
                                }}
                              >
                                {new Date(item.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>

                              <div style={{ fontSize: 11, color: colors.textFaint }}>
                                {labelForRange(item.range)} · {item.result.patterns.length} patterns ·{" "}
                                {item.voice_count} voice · {item.thought_count} thoughts
                              </div>
                            </div>

                            <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.25 }}>
                              <ChevronRight size={18} strokeWidth={1.4} color={expanded ? colors.gold : colors.goldSoft} />
                            </motion.div>
                          </button>

                          <AnimatePresence>
                            {expanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.35, ease: "easeInOut" }}
                                style={{ overflow: "hidden" }}
                              >
                                <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
                                  {item.result.hero_themes.length > 0 && (
                                    <section
                                      style={{
                                        borderRadius: 16,
                                        border: "1px solid rgba(205,170,100,0.12)",
                                        background: "rgba(205,170,100,0.045)",
                                        padding: 14,
                                      }}
                                    >
                                      <p
                                        style={{
                                          fontSize: 10,
                                          letterSpacing: "0.16em",
                                          textTransform: "uppercase",
                                          color: colors.goldSoft,
                                          marginBottom: 8,
                                        }}
                                      >
                                        Themes
                                      </p>

                                      <div style={{ display: "grid", gap: 5 }}>
                                        {item.result.hero_themes.map((theme) => (
                                          <p
                                            key={theme}
                                            style={{
                                              color: colors.text,
                                              fontFamily: "Georgia,serif",
                                              fontSize: 17,
                                            }}
                                          >
                                            • {theme}
                                          </p>
                                        ))}
                                      </div>
                                    </section>
                                  )}

                                  {item.result.patterns.length > 0 ? (
                                    item.result.patterns.map((pattern, index) => (
                                      <PatternCard
                                        key={`${item.id}-${pattern.id}-${index}`}
                                        pattern={pattern}
                                        index={index}
                                        onOpen={() => setSelectedPattern(pattern)}
                                      />
                                    ))
                                  ) : (
                                    <div
                                      style={{
                                        borderRadius: 16,
                                        border: `1px solid ${colors.border}`,
                                        background: colors.card,
                                        padding: 14,
                                        color: colors.textSoft,
                                        fontSize: 13,
                                      }}
                                    >
                                      No patterns found in this folder.
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}