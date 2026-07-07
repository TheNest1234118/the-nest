import { useLocation } from "wouter";
import { motion } from "framer-motion";
import React, { useEffect } from "react";
import { trackNestEvent, events } from "@/lib/analyticsEvents";

export function Landing() {
  const [, navigate] = useLocation();

  useEffect(() => {
    trackNestEvent(events.landing_view);

    const completed = localStorage.getItem("nest_guide_completed") === "true";

    if (completed) {
      navigate("/home");
    }
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#07070a",
        color: "rgba(245,226,196,0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: 24,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 14%, rgba(255,191,73,0.20), transparent 30%), radial-gradient(circle at 50% 58%, rgba(255,171,43,0.10), transparent 42%), linear-gradient(180deg,#09080c 0%,#050507 100%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        animate={{ opacity: [0.35, 0.85, 0.35], scale: [0.96, 1.06, 0.96] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "14%",
          width: 190,
          height: 190,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,196,87,0.34), rgba(255,171,43,0.08) 48%, transparent 72%)",
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "18%",
          width: 88,
          height: 88,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 35% 28%, #ffe3a4 0%, #f5aa2f 42%, #5b340b 100%)",
          boxShadow:
            "0 0 58px rgba(255,186,66,0.40), inset 0 0 22px rgba(255,255,255,0.16)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          maxWidth: 390,
          zIndex: 2,
          textAlign: "center",
          paddingTop: 120,
        }}
      >
        <p
          style={{
            color: "rgba(255,197,91,0.72)",
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 800,
          }}
        >
          Voice Journal · AI Insights · Reflections
        </p>

        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 47,
            lineHeight: 1.04,
            fontWeight: 400,
            margin: "0 0 14px",
            letterSpacing: "-0.02em",
          }}
        >
          This is <span style={{ color: "#ffc145" }}>your</span> space.
        </h1>

        <p
          style={{
            color: "rgba(238,220,190,0.68)",
            fontSize: 15,
            lineHeight: 1.65,
            maxWidth: 300,
            margin: "0 auto 28px",
          }}
        >
          Speak freely. Leave your thoughts. Let The Nest help you understand
          yourself over time.
        </p>

        <div
          style={{
            display: "grid",
            gap: 11,
            marginBottom: 30,
          }}
        >
          {[
            ["🎙️", "Voice Capsules", "Say what is in your head."],
            ["✨", "AI Patterns", "See what keeps repeating."],
            ["🌙", "Weekly Reflections", "Understand how your week shaped you."],
          ].map(([icon, title, text], index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                textAlign: "left",
                padding: "13px 15px",
                borderRadius: 18,
                border: "1px solid rgba(255,193,69,0.12)",
                background: "rgba(255,255,255,0.035)",
                boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
              }}
            >
              <div style={{ fontSize: 20 }}>{icon}</div>
              <div>
                <div
                  style={{
                    color: "rgba(255,202,100,0.92)",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    color: "rgba(238,220,190,0.58)",
                    fontSize: 13,
                    marginTop: 3,
                  }}
                >
                  {text}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.button
          onClick={() => {
            trackNestEvent(events.landing_enter_clicked);
            navigate("/onboarding");
          }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: "100%",
            height: 58,
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg,#ffd36b,#f4a51f)",
            color: "#1a1205",
            fontSize: 16,
            fontWeight: 850,
            cursor: "pointer",
            boxShadow: "0 18px 50px rgba(255,184,55,0.28)",
          }}
        >
          Enter The Nest →
        </motion.button>

        <button
          onClick={() => navigate("/home")}
          style={{
            marginTop: 16,
            background: "none",
            border: "none",
            color: "rgba(238,220,190,0.42)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          I already have an account
        </button>
      </motion.div>
    </div>
  );
}
