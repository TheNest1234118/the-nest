import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Sparkles } from "lucide-react";
import {
  generateReflection,
  getAiReflectionOptIn,
  loadReflections,
  setAiReflectionOptIn,
  type Reflection,
  type ReflectionType,
} from "@/lib/reflections";

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "rgba(205,170,100,0.42)",
        marginBottom: 8,
      }}>
        {title}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map((item, i) => (
          <p key={i} style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "rgba(220,205,182,0.68)",
          }}>
            • {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function ReflectionCard({ reflection }: { reflection: Reflection }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.026)",
      border: "1px solid rgba(255,255,255,0.065)",
      borderRadius: 18,
      padding: 18,
    }}>
      <p style={{
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "rgba(205,170,100,0.42)",
        marginBottom: 10,
      }}>
        {reflection.type} reflection · {reflection.period_start} → {reflection.period_end}
      </p>

      <p style={{
        fontSize: 14,
        lineHeight: 1.65,
        color: "rgba(235,215,180,0.82)",
        marginBottom: 12,
      }}>
        {reflection.summary}
      </p>

      <ListSection title="Themes" items={reflection.themes || []} />
      <ListSection title="Recurring worries" items={reflection.worries || []} />
      <ListSection title="Positive moments" items={reflection.positive_moments || []} />
      <ListSection title="Things you cared about" items={reflection.cared_about || []} />
      <ListSection title="Open thoughts" items={reflection.open_thoughts || []} />

      {reflection.closing_sentence && (
        <p style={{
          marginTop: 18,
          fontSize: 13,
          lineHeight: 1.6,
          color: "rgba(205,170,100,0.62)",
          fontStyle: "italic",
        }}>
          {reflection.closing_sentence}
        </p>
      )}
    </div>
  );
}

export function Reflections() {
  const [allowAi, setAllowAi] = useState(false);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState<ReflectionType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [optIn, saved] = await Promise.all([
      getAiReflectionOptIn(),
      loadReflections(),
    ]);

    setAllowAi(optIn);
    setReflections(saved);
  }

  useEffect(() => {
    refresh().catch((err) => setError(String(err.message || err)));
  }, []);

  async function handleToggle() {
    const next = !allowAi;
    setAllowAi(next);

    try {
      await setAiReflectionOptIn(next);
    } catch (err: any) {
      setAllowAi(!next);
      setError(String(err.message || err));
    }
  }

  async function handleGenerate(type: ReflectionType) {
    setError(null);
    setLoading(type);

    try {
      const reflection = await generateReflection(type);
      setReflections((prev) => {
        const filtered = prev.filter((r) => r.id !== reflection.id);
        return [reflection, ...filtered];
      });
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setLoading(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      style={{
        minHeight: "100svh",
        background: "#09090d",
        maxWidth: 480,
        margin: "0 auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 36px",
      }}
    >
      <header style={{
        marginBottom: 28,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}>
        <Link href="/home">
          <button style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(185,162,128,0.32)",
            padding: 2,
          }}>
            <ChevronLeft strokeWidth={1.3} size={24} />
          </button>
        </Link>

        <div>
          <h2 style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 25,
            fontWeight: 400,
            color: "rgba(235,215,180,0.90)",
            letterSpacing: "0.03em",
            lineHeight: 1.15,
            marginBottom: 5,
          }}>
            Reflections
          </h2>
          <p style={{
            fontSize: 13,
            color: "rgba(185,162,128,0.48)",
            fontWeight: 300,
            lineHeight: 1.5,
          }}>
            Quiet summaries from your own thoughts over time.
          </p>
        </div>
      </header>

      <section style={{
        background: "rgba(255,255,255,0.026)",
        border: "1px solid rgba(255,255,255,0.065)",
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
      }}>
        <p style={{
          fontSize: 13,
          lineHeight: 1.65,
          color: "rgba(220,205,182,0.68)",
          marginBottom: 14,
        }}>
          Your thoughts stay yours. Your voice notes are private and only used to create your personal reflections. You can delete your data anytime.
        </p>

        <p style={{
          fontSize: 12,
          lineHeight: 1.6,
          color: "rgba(175,158,132,0.50)",
          marginBottom: 16,
        }}>
          If AI reflections are enabled, your written thoughts and voice memo transcripts may be sent to Gemini to create your private summaries.
        </p>

        <button
          onClick={handleToggle}
          style={{
            width: "100%",
            border: "1px solid rgba(205,170,100,0.16)",
            background: allowAi ? "rgba(205,170,100,0.11)" : "rgba(255,255,255,0.028)",
            borderRadius: 14,
            padding: "13px 14px",
            color: "rgba(235,215,180,0.82)",
            cursor: "pointer",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {allowAi ? "AI reflections allowed" : "Allow AI reflections"}
        </button>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <button
          disabled={!allowAi || loading !== null}
          onClick={() => handleGenerate("weekly")}
          style={{
            minHeight: 98,
            border: "1px solid rgba(255,255,255,0.065)",
            background: "rgba(255,255,255,0.026)",
            borderRadius: 16,
            padding: 15,
            color: "rgba(225,210,188,0.80)",
            cursor: allowAi ? "pointer" : "default",
            opacity: allowAi ? 1 : 0.45,
            textAlign: "left",
          }}
        >
          <Sparkles size={16} />
          <div style={{ marginTop: 9, fontSize: 13 }}>Generate weekly reflection</div>
        </button>

        <button
          disabled={!allowAi || loading !== null}
          onClick={() => handleGenerate("monthly")}
          style={{
            minHeight: 98,
            border: "1px solid rgba(255,255,255,0.065)",
            background: "rgba(255,255,255,0.026)",
            borderRadius: 16,
            padding: 15,
            color: "rgba(225,210,188,0.80)",
            cursor: allowAi ? "pointer" : "default",
            opacity: allowAi ? 1 : 0.45,
            textAlign: "left",
          }}
        >
          <Sparkles size={16} />
          <div style={{ marginTop: 9, fontSize: 13 }}>Generate monthly reflection</div>
        </button>
      </div>

      {loading && (
        <p style={{ fontSize: 13, color: "rgba(205,170,100,0.62)", marginBottom: 14 }}>
          Creating your {loading} reflection...
        </p>
      )}

      {error && (
        <p style={{ fontSize: 12, color: "rgba(248,113,113,0.68)", marginBottom: 14 }}>
          {error}
        </p>
      )}

      {reflections.length === 0 ? (
        <div style={{
          background: "rgba(255,255,255,0.024)",
          border: "1px solid rgba(255,255,255,0.055)",
          borderRadius: 18,
          padding: "22px 24px",
          textAlign: "center",
        }}>
          <p style={{
            fontSize: 13,
            color: "rgba(175,158,132,0.42)",
            fontWeight: 300,
            lineHeight: 1.6,
            fontStyle: "italic",
          }}>
            record a few thoughts first. your reflection will appear here when there is enough to look back on.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reflections.map((reflection) => (
            <ReflectionCard key={reflection.id} reflection={reflection} />
          ))}
        </div>
      )}
    </motion.div>
  );
}