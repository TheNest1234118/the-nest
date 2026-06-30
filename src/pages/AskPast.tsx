import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { getProfile } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
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
  const [answer, setAnswer] = useState<string | null>(null);
  const [entries, setEntries] = useState<AskPastEntry[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("ask_past_history")
      .select("*")
      .order("created_at", { ascending: false });

    setHistory(data || []);
  };

  useEffect(() => {
    getProfile()
      .then((profile) => setPlan(profile?.plan || "free"))
      .finally(() => setCheckingPlan(false));

    loadHistory().catch(console.error);
  }, []);

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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("ask_past_history").insert({
          user_id: user.id,
          question: finalQuestion,
          answer: result.answer,
        });

        await loadHistory();
      }
    } catch (err: any) {
      setError(err.message || "Could not ask the past.");
    } finally {
      setLoading(false);
    }
  };

  if (!checkingPlan && plan !== "supporter") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={pageStyle}>
        <header style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <Link href="/home">
            <button style={backButtonStyle}>
              <ChevronLeft size={24} strokeWidth={1.3} />
            </button>
          </Link>

          <h1 style={titleStyle}>Ask Your Past</h1>
        </header>

        <UpgradeScreen
          title="Ask Your Past"
          feature="Ask Your Past searches your memories with AI"
        />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={pageStyle}>
      <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link href="/home">
          <button style={backButtonStyle}>
            <ChevronLeft size={24} strokeWidth={1.3} />
          </button>
        </Link>

        <div>
          <h1 style={titleStyle}>Ask the Past</h1>
          <p style={subtitleStyle}>
            Search your thoughts, anchors, and voice transcripts.
          </p>
        </div>
      </header>

      <div style={inputCardStyle}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something about your past..."
          style={textareaStyle}
        />

        <button onClick={() => submit()} disabled={loading || !question.trim()} style={askButtonStyle(loading || !question.trim())}>
          <Search size={14} />
          {loading ? "Searching..." : "Ask"}
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <p style={sectionLabelStyle}>Examples</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {EXAMPLES.map((example) => (
            <button key={example} onClick={() => submit(example)} style={exampleButtonStyle}>
              {example}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      {answer && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={answerCardStyle}>
          <p style={sectionLabelStyle}>Answer</p>
          <p style={answerTextStyle}>{answer}</p>
        </motion.div>
      )}

      {entries.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <p style={sectionLabelStyle}>Supporting entries</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.map((entry) => (
              <div key={entry.id} style={entryCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <span style={entryTypeStyle}>{entry.source_type}</span>
                  <span style={entryDateStyle}>
                    {entry.content_created_at
                      ? new Date(entry.content_created_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>

                <p style={entryContentStyle}>
                  {entry.content.length > 320
                    ? `${entry.content.slice(0, 320)}...`
                    : entry.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 34 }}>
          <p style={sectionLabelStyle}>History</p>

          {history.map((item) => (
            <div key={item.id} style={historyCardStyle}>
              <div style={historyQuestionStyle}>{item.question}</div>

              <div style={historyAnswerStyle}>{item.answer}</div>

              <div style={historyDateStyle}>
                {new Date(item.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100svh",
  background: "#09090d",
  maxWidth: 480,
  margin: "0 auto",
  padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 42px",
  color: "white",
};

const backButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "rgba(185,162,128,0.42)",
  cursor: "pointer",
  padding: 2,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 25,
  fontWeight: 400,
  color: "rgba(235,215,180,0.92)",
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 5,
  fontSize: 13,
  color: "rgba(185,162,128,0.48)",
  lineHeight: 1.5,
};

const inputCardStyle: React.CSSProperties = {
  marginTop: 30,
  background: "rgba(255,255,255,0.026)",
  border: "1px solid rgba(255,255,255,0.065)",
  borderRadius: 22,
  padding: 16,
};

const textareaStyle: React.CSSProperties = {
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
};

const askButtonStyle = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  marginTop: 12,
  border: "1px solid rgba(205,170,100,0.16)",
  background: "rgba(205,170,100,0.07)",
  color: "rgba(230,205,165,0.82)",
  borderRadius: 14,
  padding: "13px 14px",
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.5 : 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
});

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(185,158,115,0.36)",
  marginBottom: 10,
};

const exampleButtonStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  background: "rgba(255,255,255,0.024)",
  border: "1px solid rgba(255,255,255,0.055)",
  borderRadius: 14,
  padding: "12px 13px",
  color: "rgba(220,205,182,0.68)",
  fontSize: 12,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  marginTop: 18,
  color: "rgba(248,113,113,0.68)",
  fontSize: 12,
  lineHeight: 1.5,
};

const answerCardStyle: React.CSSProperties = {
  marginTop: 24,
  background: "rgba(255,255,255,0.026)",
  border: "1px solid rgba(205,170,100,0.10)",
  borderRadius: 22,
  padding: 18,
};

const answerTextStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  fontSize: 14,
  lineHeight: 1.7,
  color: "rgba(235,225,210,0.82)",
};

const entryCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.024)",
  border: "1px solid rgba(255,255,255,0.055)",
  borderRadius: 16,
  padding: 14,
};

const entryTypeStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(205,170,100,0.48)",
};

const entryDateStyle: React.CSSProperties = {
  fontSize: 10,
  color: "rgba(175,158,132,0.32)",
};

const entryContentStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.6,
  color: "rgba(220,205,182,0.62)",
  whiteSpace: "pre-wrap",
};

const historyCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.024)",
  border: "1px solid rgba(255,255,255,0.055)",
  borderRadius: 18,
  padding: 16,
  marginBottom: 14,
};

const historyQuestionStyle: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(205,170,100,.65)",
  marginBottom: 8,
  fontWeight: 600,
};

const historyAnswerStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  color: "rgba(235,225,210,.82)",
  fontSize: 13,
  lineHeight: 1.7,
};

const historyDateStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 10,
  color: "rgba(175,158,132,.35)",
};