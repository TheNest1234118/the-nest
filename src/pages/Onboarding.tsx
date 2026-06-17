import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const GUIDE_STEPS = [
  {
    title: "Welcome to The Nest",
    text: "A quiet place for thoughts, voice notes and reflections.\n\nNothing here is public. Move at your own pace.",
    button: "Continue",
  },
  {
    title: "Start with a daily check-in",
    text: "Each day begins with a simple mood check.\n\nNo streaks. No pressure. Just notice how you feel today.",
    button: "Continue",
  },
  {
    title: "Capture what matters",
    text: "Thoughts are short written notes.\n\nVoice lets you record moments, ideas and reflections in your own words.",
    button: "Continue",
  },
  {
    title: "Look back gently",
    text: "Weekly and monthly reflections are created from your own entries.\n\nOver time they help you notice patterns, memories and themes that stayed with you.",
    button: "Continue",
  },
  {
    title: "Make it feel like yours",
    text: "Customize your atmosphere with rain sounds, ambient audio or your own MP3 and WAV files.\n\nUse Anchors for grounding moments, explore Nest to revisit your reflections, and adjust everything in Settings.",
    button: "Start Exploring",
  },
];

export function Onboarding() {
  const [, navigate] = useLocation();
  const [index, setIndex] = useState(0);

  const step = GUIDE_STEPS[index];

  const finishGuide = () => {
    try {
      localStorage.setItem("nest_guide_completed", "true");
    } catch (_) {}

    navigate("/home");
  };

  const next = () => {
    if (index >= GUIDE_STEPS.length - 1) {
      finishGuide();
      return;
    }

    setIndex((current) => current + 1);
  };

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#09090d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        animate={{
          opacity: [0.28, 0.48, 0.28],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "rgba(185,120,35,0.12)",
          filter: "blur(80px)",
          top: "28%",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 380,
          position: "relative",
          zIndex: 1,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "rgba(18,15,12,0.72)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 26,
              padding: "30px 26px 24px",
              boxShadow: "0 24px 90px rgba(0,0,0,0.42)",
              backdropFilter: "blur(12px)",
            }}
          >
            <p
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(205,170,100,0.38)",
                marginBottom: 14,
                fontWeight: 500,
              }}
            >
              Guide {index + 1} / {GUIDE_STEPS.length}
            </p>

            <h1
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 28,
                fontWeight: 400,
                lineHeight: 1.18,
                color: "rgba(235,218,192,0.92)",
                marginBottom: 18,
              }}
            >
              {step.title}
            </h1>

            <p
              style={{
                whiteSpace: "pre-line",
                fontSize: 14,
                lineHeight: 1.75,
                color: "rgba(198,178,150,0.62)",
                fontWeight: 300,
                marginBottom: 28,
              }}
            >
              {step.text}
            </p>

            <button
              onClick={next}
              style={{
                width: "100%",
                background: "rgba(205,170,100,0.09)",
                border: "1px solid rgba(205,170,100,0.18)",
                borderRadius: 15,
                padding: "15px 16px",
                color: "rgba(225,205,176,0.82)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {step.button}
            </button>
            <button
  onClick={finishGuide}
  style={{
    width: "100%",
    marginTop: 12,
    background: "none",
    border: "none",
    color: "rgba(185,162,128,0.42)",
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    cursor: "pointer",
  }}
>
  Skip
</button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}