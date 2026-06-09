import React, { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { loadRituals, type Ritual } from "@/lib/rituals";

export function RitualPlayer() {
  const [, params] = useRoute<{ id: string }>("/rituals/:id");
  const id = params?.id ?? "";

  const [ritual, setRitual] = useState<Ritual | null>(null);
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    loadRituals().then((items) => {
      const found = (items as Ritual[]).find((r) => r.id === id);
      setRitual(found ?? null);
    });
  }, [id]);

  const step = useMemo(() => {
    if (!ritual) return null;
    return ritual.steps?.[stepIndex] ?? null;
  }, [ritual, stepIndex]);

  useEffect(() => {
    if (!started || !ritual) return;

    const timer = setTimeout(() => {
      setStepIndex((prev) => {
        if (prev >= ritual.steps.length - 1) return prev;
        return prev + 1;
      });
    }, step?.type === "breath" ? 60000 : 4200);

    return () => clearTimeout(timer);
  }, [started, stepIndex, ritual, step]);

  if (!ritual) {
    return (
      <div style={page}>
        <Link href="/rituals">
          <button style={back}><ChevronLeft size={22} /></button>
        </Link>
        <p style={muted}>Ritual not found.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        ...page,
        background:
          ritual.light_mood === "blue night"
            ? "#070a12"
            : ritual.light_mood === "almost black"
            ? "#050506"
            : "#09080c",
      }}
    >
      <div style={glow} />

      {ritual.foggy && <div style={fog} />}

      <Link href="/rituals">
        <button style={back}><ChevronLeft size={22} /></button>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        style={center}
      >
        <div style={{ fontSize: 46, marginBottom: 18 }}>{ritual.emoji}</div>

        <h1 style={title}>{ritual.name}</h1>

        {!started ? (
          <>
            <p style={muted}>
              {ritual.atmosphere} · {ritual.slowed ? "slowed" : "normal"} · {ritual.light_mood}
            </p>

            <button onClick={() => setStarted(true)} style={startButton}>
              Begin
            </button>
          </>
        ) : (
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2 }}
            style={{ marginTop: 34, width: "100%" }}
          >
            {step?.type === "text" && (
              <p style={ritualText}>{step.text}</p>
            )}

            {step?.type === "breath" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <motion.div
                  animate={{ scale: [1, 1.32, 1], opacity: [0.42, 0.78, 0.42] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  style={breathCircle}
                />
                <p style={{ ...muted, marginTop: 24 }}>{step.label}</p>
              </div>
            )}

            {step?.type === "memo" && (
              <p style={ritualText}>{step.label}</p>
            )}

            {stepIndex >= ritual.steps.length - 1 && (
              <p style={{ ...muted, marginTop: 34 }}>
                stay here as long as you need.
              </p>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

const page: React.CSSProperties = {
  minHeight: "100svh",
  maxWidth: 480,
  margin: "0 auto",
  position: "relative",
  overflow: "hidden",
  color: "rgba(235,218,192,0.88)",
};

const back: React.CSSProperties = {
  position: "absolute",
  top: "calc(env(safe-area-inset-top, 0px) + 44px)",
  left: 20,
  zIndex: 10,
  background: "none",
  border: "none",
  color: "rgba(185,162,128,0.42)",
  cursor: "pointer",
};

const center: React.CSSProperties = {
  minHeight: "100svh",
  padding: "0 32px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  position: "relative",
  zIndex: 2,
};

const title: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 31,
  fontWeight: 400,
  color: "rgba(235,215,180,0.92)",
  marginBottom: 14,
};

const muted: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(185,162,128,0.46)",
  lineHeight: 1.7,
};

const startButton: React.CSSProperties = {
  marginTop: 38,
  background: "rgba(205,170,100,0.07)",
  border: "1px solid rgba(205,170,100,0.16)",
  borderRadius: 999,
  padding: "13px 28px",
  color: "rgba(220,195,150,0.82)",
  fontSize: 10,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const ritualText: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 23,
  lineHeight: 1.55,
  color: "rgba(235,218,192,0.82)",
};

const breathCircle: React.CSSProperties = {
  width: 130,
  height: 130,
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(205,170,100,0.16) 0%, rgba(205,170,100,0.05) 55%, transparent 72%)",
  border: "1px solid rgba(205,170,100,0.16)",
};

const glow: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(ellipse 65% 45% at 50% 55%, rgba(190,125,38,0.10) 0%, transparent 72%)",
  pointerEvents: "none",
};

const fog: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(ellipse 90% 50% at 50% 45%, rgba(255,255,255,0.035) 0%, transparent 70%)",
  backdropFilter: "blur(3px)",
  pointerEvents: "none",
};