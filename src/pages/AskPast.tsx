import React, { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { getProfile } from "@/lib/subscription";
import { UpgradeScreen } from "@/components/UpgradeScreen";
import { ChevronLeft, Search } from "lucide-react";
import { askPast, type AskPastEntry } from "@/lib/askPast";

const EXAMPLES = [
  "What have I been thinking about lately?",
  "What helped me when I felt overwhelmed?",
  "What did I say about work?",
  "What patterns do you notice in my past thoughts?",
];

export function AskPast() {
  const [question, setQuestion] = useState("");
  const [plan, setPlan] = useState<"free" | "supporter">("free");
const [checkingPlan, setCheckingPlan] = useState(true);

React.useEffect(() => {
  getProfile()
    .then((profile) => {
      setPlan(profile?.plan || "free");
    })
    .finally(() => setCheckingPlan(false));
}, []);
  const [answer, setAnswer] = useState<string | null>(null);
  const [entries, setEntries] = useState<AskPastEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (q?: string) => {
    const finalQuestion = (q || question).trim();
    if (!finalQuestion) return;

    setQuestion(finalQuestion);
    setLoading(true);
    setError(null);
    setAnswer(null);
    setEntries([]);

    try {
      const result = await askPast(finalQuestion);
      setAnswer(result.answer);
      setEntries(result.entries || []);
    } catch (err: any) {
      setError(err.message || "Could not ask the past.");
    } finally {
      setLoading(false);
    }
  };
  if (!checkingPlan && plan !== "supporter") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          minHeight: "100svh",
          background: "#09090d",
          maxWidth: 480,
          margin: "0 auto",
          padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 42px",
          color: "white",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <Link href="/home">
            <button
              style={{
                background: "none",
                border: "none",
                color: "rgba(185,162,128,0.42)",
                cursor: "pointer",
                padding: 2,
              }}
            >
              <ChevronLeft size={24} strokeWidth={1.3} />
            </button>
          </Link>
  
          <div>
            <h1
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 25,
                fontWeight: 400,
                color: "rgba(235,215,180,0.92)",
                margin: 0,
              }}
            >
              Ask Your Past
            </h1>
          </div>
        </header>
  
        <UpgradeScreen
          title="Ask Your Past"
          feature="Ask Your Past searches your memories with AI"
        />
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",
        background: "#09090d",
        maxWidth: 480,
        margin: "0 auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 42px",
        color: "white",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link href="/home">
          <button
            style={{
              background: "none",
              border: "none",
              color: "rgba(185,162,128,0.42)",
              cursor: "pointer",
              padding: 2,
            }}
          >
            <ChevronLeft size={24} strokeWidth={1.3} />
          </button>
        </Link>

        <div>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 25,
              fontWeight: 400,
              color: "rgba(235,215,180,0.92)",
              margin: 0,
            }}
          >
            Ask the Past
          </h1>
          <p
            style={{
              marginTop: 5,
              fontSize: 13,
              color: "rgba(185,162,128,0.48)",
              lineHeight: 1.5,
            }}
          >
            Search your thoughts, anchors, and voice transcripts.
          </p>
        </div>
      </header>

      <div
        style={{
          marginTop: 30,
          background: "rgba(255,255,255,0.026)",
          border: "1px solid rgba(255,255,255,0.065)",
          borderRadius: 22,
          padding: 16,
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something about your past..."
          style={{
            width: "100%",
            minHeight: 92,
            resize: "vertical",
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.075)",
            borderRadius: 14,
            padding: 14,
            color: "rgba(235,218,192,0.9)",
            outline: "none",
            fontSize: 13,
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />

        <button
          onClick={() => submit()}
          disabled={loading || !question.trim()}
          style={{
            width: "100%",
            marginTop: 12,
            border: "1px solid rgba(205,170,100,0.16)",
            background: "rgba(205,170,100,0.07)",
            color: "rgba(230,205,165,0.82)",
            borderRadius: 14,
            padding: "13px 14px",
            cursor: loading || !question.trim() ? "default" : "pointer",
            opacity: loading || !question.trim() ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <Search size={14} />
          {loading ? "Searching..." : "Ask"}
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(185,158,115,0.36)",
            marginBottom: 10,
          }}
        >
          Examples
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => submit(example)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "rgba(255,255,255,0.024)",
                border: "1px solid rgba(255,255,255,0.055)",
                borderRadius: 14,
                padding: "12px 13px",
                color: "rgba(220,205,182,0.68)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p
          style={{
            marginTop: 18,
            color: "rgba(248,113,113,0.68)",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {error}
        </p>
      )}

      {answer && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 24,
            background: "rgba(255,255,255,0.026)",
            border: "1px solid rgba(205,170,100,0.10)",
            borderRadius: 22,
            padding: 18,
          }}
        >
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(205,170,100,0.42)",
              marginBottom: 10,
            }}
          >
            Answer
          </p>

          <p
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 14,
              lineHeight: 1.7,
              color: "rgba(235,225,210,0.82)",
            }}
          >
            {answer}
          </p>
        </motion.div>
      )}

      {entries.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(185,158,115,0.36)",
              marginBottom: 10,
            }}
          >
            Supporting entries
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: "rgba(255,255,255,0.024)",
                  border: "1px solid rgba(255,255,255,0.055)",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "rgba(205,170,100,0.48)",
                    }}
                  >
                    {entry.source_type}
                  </span>

                  <span
                    style={{
                      fontSize: 10,
                      color: "rgba(175,158,132,0.32)",
                    }}
                  >
                    {entry.content_created_at
                      ? new Date(entry.content_created_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: "rgba(220,205,182,0.62)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {entry.content.length > 320
                    ? `${entry.content.slice(0, 320)}...`
                    : entry.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}