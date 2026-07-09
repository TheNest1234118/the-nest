import { useLocation } from "wouter";
import { motion } from "framer-motion";
import React, { useEffect } from "react";
import { trackNestEvent, events } from "@/lib/analyticsEvents";

export function Landing() {
  const [, navigate] = useLocation();

  useEffect(() => {
    trackNestEvent(events.landing_view);

    const completed = localStorage.getItem("nest_guide_completed") === "true";
    if (completed) navigate("/home");
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
        padding: "22px 22px 18px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 14%, rgba(255,191,73,0.20), transparent 29%), radial-gradient(circle at 50% 55%, rgba(255,171,43,0.10), transparent 45%), linear-gradient(180deg,#09080c 0%,#050507 100%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          maxWidth: 420,
          zIndex: 2,
          textAlign: "center",
        }}
      >
        <div style={{ height: 118, position: "relative", marginBottom: 18 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: 104,
              height: 104,
              borderRadius: "50%",
              border: "1px solid rgba(255,190,74,0.25)",
              boxShadow: "0 0 72px rgba(255,178,48,0.22)",
            }}
          />

          <motion.div
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: 58,
              height: 58,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 28%, #ffe3a4 0%, #f5aa2f 42%, #5b340b 100%)",
              boxShadow:
                "0 0 46px rgba(255,186,66,0.38), inset 0 0 18px rgba(255,255,255,0.16)",
            }}
          />
        </div>

        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(38px, 10vw, 56px)",
            lineHeight: 1.05,
            fontWeight: 700,
            margin: "0 auto 32px",
            letterSpacing: "-0.055em",
            textShadow: "0 2px 12px rgba(0,0,0,0.45)",
          }}
        >
          Get your 
          <br />
          thoughts
          <br /> 
          out of
          <br /> 
          <span style={{ color: "#ffc145" }}>your head.</span>
        </h1>
        <p
 style={{
   fontSize: 16,
   lineHeight: 1.6,
   color: "rgba(245,226,196,0.72)",
   margin: "0 auto 28px",
   maxWidth: 340,
 }}
>
 Some thoughts only make sense once you say them out loud.
<br />
<br />
<strong style={{ color: "#f5e2c4", fontWeight: 600 }}>
   Speak. Remember. Understand yourself over time.
</strong>
</p>
        <img
          src="/landing-comparison.png"
          alt="Without The Nest and With The Nest comparison"
          style={{
            width: "100%",
            display: "block",
            borderRadius: 28,
            marginBottom: 34,
            boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
          }}
        />

        <motion.button
          onClick={() => {
            trackNestEvent(events.landing_enter_clicked);
            navigate("/onboarding");
          }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: "100%",
            height: 64,
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg,#ffd36b,#f4a51f)",
            color: "#1a1205",
            fontSize: 18,
            fontWeight: 950,
            cursor: "pointer",
            boxShadow: "0 18px 55px rgba(255,184,55,0.30)",
          }}
        >
          ENTER THE NEST →
        </motion.button>

        <button
          onClick={() => navigate("/home")}
          style={{
            marginTop: 18,
            background: "none",
            border: "none",
            color: "rgba(238,220,190,0.42)",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          I already have an account
        </button>

        <div
          style={{
            marginTop: 34,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            color: "rgba(238,220,190,0.52)",
            fontSize: 12,
          }}
        >
          <span>♙ Private & secure</span>
          <span>♢ Your data is yours</span>
          <span>ϟ Works in seconds</span>
        </div>
      </motion.div>
    </div>
  );
}