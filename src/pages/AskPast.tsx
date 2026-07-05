import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { getProfile } from "@/lib/subscription";
import { supabase } from "@/lib/supabase";
import { trackNestEvent, events } from "@/lib/analyticsEvents";
import { UpgradeScreen } from "@/components/UpgradeScreen";
import { ArrowUp, CheckCircle2, ChevronLeft, FileText, Search, Sparkles } from "lucide-react";
import { askPast, type AskPastEntry } from "@/lib/askPast";

const EXAMPLES = [
  "What have I been thinking about lately?",
  "What helped me when I felt overwhelmed?",
  "What did I say about work?",
  "What patterns do you notice in my past thoughts?",
];

const truncate = (value: string, length = 190) =>
  value.length > length ? `${value.slice(0, length).trim()}...` : value;

const formatDate = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export function AskPast() {
  const [question, setQuestion] = useState("");
  const [plan, setPlan] = useState<"free" | "supporter">("free");
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [answer, setAnswer] = useState<string | null>(null);
  const [entries, setEntries] = useState<AskPastEntry[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const foundItems = useMemo(() => {
    if (entries.length === 0) return [];
  
    const firstSources = entries.slice(0, 3).map((entry) => truncate(entry.content, 110));
  
    return [
      `${entries.length} ${entries.length === 1 ? "entry matches" : "entries match"} your question and were used as context.`,
      ...firstSources,
    ].slice(0, 4);
  }, [entries]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("ask_past_history")
      .select("*")
      .order("created_at", { ascending: false });

    setHistory(data || []);
  };

  useEffect(() => {
    trackNestEvent(events.opened_ask_past);

    getProfile()
      .then((profile) => setPlan(profile?.plan || "free"))
      .finally(() => setCheckingPlan(false));

    loadHistory().catch(console.error);
  }, []);

  const submit = async (q?: string) => {
    const finalQuestion = (q || question).trim();
    if (!finalQuestion) return;

    trackNestEvent(events.asked_past_question);
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
        <header style={topHeaderStyle}>
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
      <header style={topHeaderStyle}>
        <Link href="/home">
          <button style={backButtonStyle}>
            <ChevronLeft size={24} strokeWidth={1.3} />
          </button>
        </Link>

        <div>
          <h1 style={titleStyle}>Ask the Past</h1>
          <p style={subtitleStyle}>Search your thoughts, anchors, and voice transcripts.</p>
        </div>
      </header>

      {!answer && (
  <>
    <div style={heroCardStyle}>
      <div style={heroIconStyle}>
        <Sparkles size={17} />
      </div>
      <h2 style={heroTitleStyle}>Ask Your Past</h2>
      <p style={heroTextStyle}>
        Ask a question and Nest will search your memories, patterns, and journal entries for answers.
      </p>
    </div>

          <div style={{ marginTop: 18 }}>
            <p style={sectionLabelStyle}>Examples</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    trackNestEvent(events.clicked_ask_past_example);
                    submit(example);
                  }}
                  style={exampleButtonStyle}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {error && <p style={errorStyle}>{error}</p>}

      {answer && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={answerShellStyle}>
          <div style={answerTopRowStyle}>
            <div style={answerLabelStyle}>
              <Sparkles size={13} />
              Answer
            </div>

            <div style={memoryBadgeStyle}>
              <CheckCircle2 size={13} />
              Based on {entries.length || 0} memories
            </div>
          </div>

          <p style={answerTextStyle}>{answer}</p>

          {foundItems.length > 0 && (
            <div style={{ marginTop: 28 }}>
            <p style={greenSectionLabelStyle}>Found</p>
              <div style={foundBoxStyle}>
                {foundItems.map((item, index) => (
                  <div key={`${item}-${index}`} style={foundRowStyle(index === foundItems.length - 1)}>
                    <CheckCircle2 size={18} style={{ flex: "0 0 auto", color: "#24d268" }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {entries.length > 0 && (
        <div style={{ marginTop: 24 }}>
         <p style={blueSectionLabelStyle}>Supporting Entries</p>

          <div style={entriesBoxStyle}>
            {entries.map((entry, index) => (
              <div key={entry.id} style={supportEntryStyle(index === entries.length - 1)}>
                <div style={fileIconStyle}>
                  <FileText size={17} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={entryMetaRowStyle}>
                    <span style={entryTypeStyle}>{entry.source_type || "Memo"}</span>
                    <span style={entryDotStyle}>•</span>
                    <span style={entrySmallDateStyle}>{formatDate(entry.content_created_at)}</span>
                  </div>

                  <p style={entryContentStyle}>“{truncate(entry.content, 220)}”</p>
                </div>

                <span style={entryDateStyle}>{formatDate(entry.content_created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && !answer && (
        <div style={{ marginTop: 34 }}>
          <p style={sectionLabelStyle}>History</p>

          {history.map((item) => (
            <div key={item.id} style={historyCardStyle}>
              <div style={historyQuestionStyle}>{item.question}</div>
              <div style={historyAnswerStyle}>{item.answer}</div>
              <div style={historyDateStyle}>{new Date(item.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      <div style={composerWrapStyle}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your past a question..."
          style={composerTextareaStyle}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />

        <button
          onClick={() => submit()}
          disabled={loading || !question.trim()}
          style={sendButtonStyle(loading || !question.trim())}
          aria-label="Ask"
        >
          {loading ? <Search size={16} /> : <ArrowUp size={17} />}
        </button>
      </div>
    </motion.div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100svh",
  background:
    "radial-gradient(circle at 50% -10%, rgba(24,42,38,0.38), transparent 34%), linear-gradient(180deg, #07090d 0%, #0a0c11 100%)",
  maxWidth: 560,
  margin: "0 auto",
  padding: "calc(env(safe-area-inset-top, 0px) + 28px) 16px calc(env(safe-area-inset-bottom, 0px) + 96px)",
  color: "white",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const topHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginBottom: 24,
};

const backButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  background: "rgba(255,255,255,0.026)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  color: "rgba(203,214,210,0.58)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

const titleStyle: React.CSSProperties = {
  fontSize: 23,
  fontWeight: 650,
  color: "rgba(238,244,240,0.94)",
  margin: 0,
  letterSpacing: "-0.03em",
};

const subtitleStyle: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12,
  color: "rgba(168,179,176,0.52)",
  lineHeight: 1.45,
};

const heroCardStyle: React.CSSProperties = {
  marginTop: 18,
  background: "rgba(255,255,255,0.026)",
  border: "1px solid rgba(255,255,255,0.075)",
  borderRadius: 26,
  padding: "24px 20px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
};

const heroIconStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  color: "#f1bd42",
  background: "rgba(241,189,66,0.10)",
  border: "1px solid rgba(241,189,66,0.12)",
};

const heroTitleStyle: React.CSSProperties = {
  margin: "18px 0 8px",
  color: "rgba(238,244,240,0.94)",
  fontSize: 24,
  letterSpacing: "-0.04em",
  lineHeight: 1.08,
};

const heroTextStyle: React.CSSProperties = {
  margin: 0,
  color: "rgba(190,201,198,0.62)",
  fontSize: 14,
  lineHeight: 1.65,
};

const answerShellStyle: React.CSSProperties = {
  background: "rgba(12,16,20,0.72)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 24,
  padding: "24px 22px 18px",
  boxShadow: "0 24px 90px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.035)",
};

const answerTopRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 20,
};

const answerLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(245,188,45,0.82)",
};

const memoryBadgeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "8px 11px",
  borderRadius: 999,
  border: "1px solid rgba(39,211,105,0.19)",
  background: "rgba(39,211,105,0.075)",
  color: "rgba(117,238,161,0.88)",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const answerTextStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  fontSize: 17,
  lineHeight: 1.55,
  color: "rgba(238,244,240,0.88)",
  margin: 0,
  fontWeight: 520,
  letterSpacing: "-0.015em",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(149,161,255,0.58)",
  margin: "0 0 10px",
  fontWeight: 800,
};

const greenSectionLabelStyle: React.CSSProperties = {
  ...sectionLabelStyle,
  color: "rgba(39,211,105,0.8)",
};

const blueSectionLabelStyle: React.CSSProperties = {
  ...sectionLabelStyle,
  color: "rgba(126,143,255,0.74)",
};

const foundBoxStyle: React.CSSProperties = {
  overflow: "hidden",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.018)",
};

const foundRowStyle = (last: boolean): React.CSSProperties => ({
  display: "flex",
  gap: 13,
  padding: "15px 16px",
  borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.075)",
  color: "rgba(224,233,230,0.78)",
  fontSize: 14,
  lineHeight: 1.45,
});

const entriesBoxStyle: React.CSSProperties = {
  overflow: "hidden",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.075)",
  background: "rgba(255,255,255,0.018)",
};

const supportEntryStyle = (last: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "flex-start",
  gap: 13,
  padding: "16px 14px",
  borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)",
});

const fileIconStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
  color: "rgba(132,151,255,0.92)",
  background: "rgba(75,95,255,0.17)",
};

const entryMetaRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  marginBottom: 6,
  minWidth: 0,
};

const entryTypeStyle: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(230,236,234,0.76)",
  fontWeight: 800,
  textTransform: "capitalize",
};

const entryDotStyle: React.CSSProperties = {
  color: "rgba(170,180,177,0.28)",
  fontSize: 12,
};

const entrySmallDateStyle: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(175,185,182,0.42)",
};

const entryDateStyle: React.CSSProperties = {
  marginLeft: "auto",
  flex: "0 0 auto",
  fontSize: 11,
  color: "rgba(175,185,182,0.42)",
};

const entryContentStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.52,
  color: "rgba(220,228,225,0.66)",
  whiteSpace: "pre-wrap",
};

const composerWrapStyle: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
  transform: "translateX(-50%)",
  width: "min(528px, calc(100% - 32px))",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 10px 10px 16px",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.075)",
  background: "rgba(20,25,30,0.9)",
  boxShadow: "0 20px 70px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.04)",
  backdropFilter: "blur(18px)",
};

const composerTextareaStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: 100,
  resize: "none",
  background: "transparent",
  border: "none",
  padding: "8px 0",
  color: "rgba(235,242,239,0.9)",
  outline: "none",
  fontSize: 13,
  lineHeight: 1.4,
  fontFamily: "inherit",
};

const sendButtonStyle = (disabled: boolean): React.CSSProperties => ({
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "none",
  background: disabled ? "rgba(241,189,66,0.32)" : "#f0b83d",
  color: "#111318",
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.55 : 1,
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
});

const exampleButtonStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  background: "rgba(255,255,255,0.024)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: "13px 14px",
  color: "rgba(220,228,225,0.66)",
  fontSize: 13,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  marginTop: 18,
  color: "rgba(248,113,113,0.78)",
  fontSize: 12,
  lineHeight: 1.5,
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
