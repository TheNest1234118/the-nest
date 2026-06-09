import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { loadMoodLog } from "@/lib/dailyNest";

interface MoodEntry {
  id: string;
  mood: string;
  mood_date: string;
  created_at: string;
}

const MOOD_LABELS: Record<string, string> = {
  calm: "🌙 Calm",
  good: "🌤 Good",
  neutral: "🌫 Neutral",
  overstimulated: "⚡ Overstimulated",
  anxious: "🌧 Anxious",
  sad: "🖤 Sad",
};

export function MoodLog() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);

  useEffect(() => {
    loadMoodLog().then(setEntries).catch(console.error);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",
        background: "#09090d",
        maxWidth: 480,
        margin: "0 auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 80px",
      }}
    >
      <Link href="/nest">
        <button style={{
          background: "none",
          border: "none",
          color: "rgba(185,162,128,0.42)",
          marginBottom: 26,
          cursor: "pointer",
        }}>
          <ChevronLeft size={24} strokeWidth={1.3} />
        </button>
      </Link>

      <p style={{
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(205,170,100,0.38)",
        marginBottom: 10,
      }}>
        Mood Log
      </p>

      <h1 style={{
        fontFamily: "Georgia, serif",
        fontSize: 28,
        fontWeight: 400,
        color: "rgba(235,215,180,0.90)",
        marginBottom: 8,
      }}>
        How your days felt.
      </h1>

      <p style={{
        fontSize: 13,
        lineHeight: 1.6,
        color: "rgba(185,162,128,0.48)",
        marginBottom: 28,
      }}>
        A quiet record of how you arrived each day.
      </p>

      {entries.length === 0 ? (
        <div style={{
          background: "rgba(255,255,255,0.024)",
          border: "1px solid rgba(255,255,255,0.055)",
          borderRadius: 18,
          padding: 22,
          color: "rgba(175,158,132,0.42)",
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          Your mood log will appear here after your first daily check-in.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: "rgba(255,255,255,0.024)",
                border: "1px solid rgba(255,255,255,0.055)",
                borderRadius: 16,
                padding: "15px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <div style={{
                fontSize: 14,
                color: "rgba(225,210,188,0.82)",
              }}>
                {MOOD_LABELS[entry.mood] ?? entry.mood}
              </div>

              <time style={{
                fontSize: 11,
                color: "rgba(175,158,132,0.38)",
                letterSpacing: "0.06em",
              }}>
                {new Date(entry.mood_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}