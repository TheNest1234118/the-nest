import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Sparkles } from "lucide-react";
import {
  generateReflectionV2,
  loadReflectionV2History,
} from "@/lib/reflectionV2";
import type { ReflectionKind, ReflectionV2Generation } from "@/lib/reflectionV2Types";

const c = {
  bg: "#09090d",
  card: "rgba(255,255,255,.026)",
  border: "rgba(255,255,255,.065)",
  gold: "rgba(205,170,100,.72)",
  goldSoft: "rgba(205,170,100,.42)",
  text: "rgba(235,215,180,.9)",
  soft: "rgba(185,162,128,.52)",
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 18, padding: 18 }}>
      <p style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: c.goldSoft, marginBottom: 10 }}>{title}</p>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(220,205,182,.72)" }}>{children}</div>
    </section>
  );
}

export function ReflectionExperience({ kind }: { kind: ReflectionKind }) {
  const [item, setItem] = useState<ReflectionV2Generation | null>(null);
  const [history, setHistory] = useState<ReflectionV2Generation[]>([]);
  const [loading, setLoading] = useState(false);
  const isWeekly = kind === "weekly";

  useEffect(() => {
    const saved = loadReflectionV2History(kind);
    setHistory(saved);
    setItem(saved[0] || null);
  }, [kind]);

  async function generate() {
    setLoading(true);
    try {
      const next = await generateReflectionV2(kind);
      setItem(next);
      setHistory(loadReflectionV2History(kind));
    } finally {
      setLoading(false);
    }
  }

  const r = item?.result;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ minHeight: "100svh", background: c.bg, maxWidth: 480, margin: "0 auto", padding: "calc(env(safe-area-inset-top,0px)+52px) 20px 42px" }}>
      <header style={{ display: "flex", gap: 14, marginBottom: 28 }}>
        <Link href="/home">
          <button style={{ background: "none", border: "none", color: "rgba(185,162,128,.32)" }}>
            <ChevronLeft size={24} />
          </button>
        </Link>
        <div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: 31, fontWeight: 400, color: c.text }}>
            {isWeekly ? "Your Week" : "Your Month"}
          </h1>
          <p style={{ fontSize: 13, color: c.soft }}>
            {isWeekly ? "Here’s what quietly shaped your week." : "Looking back at what stayed with you."}
          </p>
        </div>
      </header>

      <button onClick={generate} disabled={loading} style={{ width: "100%", marginBottom: 16, border: "1px solid rgba(205,170,100,.18)", background: "rgba(205,170,100,.08)", borderRadius: 16, padding: 15, color: c.text }}>
        <Sparkles size={16} /> {loading ? "Looking back through your entries..." : `Generate ${isWeekly ? "Weekly" : "Monthly"} Reflection`}
      </button>

      {item && (
        <p style={{ color: "rgba(175,158,132,.34)", fontSize: 11, marginBottom: 14 }}>
          Generated {new Date(item.created_at).toLocaleString()} · Based on {item.voice_count} Voice Capsules, {item.thought_count} Thoughts, {item.mood_count} Mood Check-ins.
        </p>
      )}

      {!r || !r.story ? (
        <Block title="Not enough yet">Leave a few more thoughts or voice capsules and The Nest will create a more meaningful reflection.</Block>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <Block title={isWeekly ? "Week Story" : "Month Story"}>{r.story}</Block>

          {isWeekly ? (
            <>
              <Block title="Biggest Wins">{r.wins.map((x, i) => <p key={i}>✓ {x}</p>)}</Block>
              <Block title="Biggest Challenges">{r.challenges.map((x, i) => <p key={i}>• {x}</p>)}</Block>
            </>
          ) : (
            <>
              <Block title="Biggest Themes">
                {(r.monthly_themes || []).map((x, i) => (
                  <p key={i}>• {x.title} — {x.importance} · {x.mentions} mentions · {x.change}</p>
                ))}
              </Block>
              <Block title="Growth">{(r.month_growth || []).map((x, i) => <p key={i}>{x.label}: {x.value}</p>)}</Block>
            </>
          )}

          <Block title="Emotional Journey">
            {r.emotional_journey.map((x, i) => (
              <p key={i}>{x.day} — {x.mood} · {x.note}</p>
            ))}
          </Block>

          <Block title="What Changed">
            {r.what_changed.map((x, i) => (
              <p key={i}>{x.label} {x.direction === "up" ? "↑" : x.direction === "down" ? "↓" : "→"}</p>
            ))}
          </Block>

          <Block title={isWeekly ? "Moments Worth Remembering" : "Month Highlights"}>
            {r.moments.map((x, i) => (
              <p key={i}>{x.date} — “{x.quote}”</p>
            ))}
          </Block>

          <Block title={isWeekly ? "Gentle Reflection" : "What You Learned"}>{r.gentle_reflection}</Block>
          <Block title={isWeekly ? "Next Week Suggestion" : "AI Advice For Next Month"}>{r.next_suggestion}</Block>

          {!isWeekly && r.closing_sentence && (
            <section style={{ border: "1px solid rgba(205,170,100,.18)", background: "rgba(205,170,100,.08)", borderRadius: 22, padding: 22 }}>
              <p style={{ fontFamily: "Georgia,serif", fontSize: 24, lineHeight: 1.35, color: c.text }}>“{r.closing_sentence}”</p>
            </section>
          )}

          <Link href="/ask-past">
            <button style={{ width: "100%", border: "1px solid rgba(205,170,100,.18)", background: "rgba(205,170,100,.07)", borderRadius: 16, padding: 15, color: c.gold }}>
              Talk to this reflection
            </button>
          </Link>
        </div>
      )}

      {history.length > 1 && (
        <section style={{ marginTop: 22 }}>
          <p style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: c.goldSoft, marginBottom: 10 }}>
            Previous {isWeekly ? "Weeks" : "Months"}
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {history.map((h) => (
              <button key={h.id} onClick={() => setItem(h)} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 13, color: c.soft, textAlign: "left" }}>
                {new Date(h.created_at).toLocaleDateString()}
              </button>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}