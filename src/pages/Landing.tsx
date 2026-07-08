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
            "radial-gradient(circle at 50% 18%, rgba(255,191,73,0.20), transparent 28%), radial-gradient(circle at 50% 58%, rgba(255,171,43,0.10), transparent 42%), linear-gradient(180deg,#09080c 0%,#050507 100%)",
        }}
      />

      <motion.div
        animate={{ opacity: [0.4, 0.85, 0.4], scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "18%",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,196,87,0.35), rgba(255,171,43,0.08) 45%, transparent 70%)",
          filter: "blur(2px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          maxWidth: 390,
          zIndex: 2,
          textAlign: "center",
        }}
      >
        <div style={{ height: 120, position: "relative", marginBottom: 18 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: 118,
              height: 118,
              borderRadius: "50%",
              border: "1px solid rgba(255,190,74,0.22)",
              boxShadow: "0 0 70px rgba(255,178,48,0.18)",
            }}
          />

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: 68,
              height: 68,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 28%, #ffe3a4 0%, #f5aa2f 42%, #5b340b 100%)",
              boxShadow:
                "0 0 46px rgba(255,186,66,0.36), inset 0 0 20px rgba(255,255,255,0.16)",
            }}
          />
        </div>

        <h1
          style={{
            fontSize: 31,
            lineHeight: 1.28,
            fontWeight: 900,
            margin: "0 auto 30px",
            letterSpacing: "-0.05em",
            maxWidth: 360,
          }}
        >
          Your thoughts.
          <br />
          Organized. Understood. <span style={{ color: "#ffc145" }}>Growth.</span>
        </h1>

        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,193,69,0.14)",
            background: "rgba(255,255,255,0.025)",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            minHeight: 322,
            position: "relative",
            marginBottom: 36,
          }}
        >
          <div
            style={{
              padding: "26px 16px",
              borderRight: "1px solid rgba(255,193,69,0.14)",
              position: "relative",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800 }}>
              <span style={{ color: "#ff4d4d", marginRight: 8 }}>✕</span>
              Without The Nest
            </div>

            <div style={{ marginTop: 46, position: "relative", height: 165 }}>
              {[
                ["Overthinking", 4, 0],
                ["Lost ideas", 124, 0],
                ["No clarity", 0, 100],
                ["No progress", 130, 132],
              ].map(([text, left, top]) => (
                <div
                  key={String(text)}
                  style={{
                    position: "absolute",
                    left: Number(left),
                    top: Number(top),
                    padding: "9px 10px",
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.055)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "rgba(248,230,202,0.7)",
                    fontSize: 10,
                  }}
                >
                  {text}
                </div>
              ))}

              <div
                style={{
                  position: "absolute",
                  left: 48,
                  top: 42,
                  width: 112,
                  height: 112,
                  borderRadius: "50%",
                  opacity: 0.45,
                  background:
                    "repeating-radial-gradient(circle, transparent 0 9px, rgba(255,255,255,0.28) 10px 11px)",
                  transform: "rotate(18deg)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: 82,
                  top: 158,
                  fontSize: 34,
                  opacity: 0.5,
                }}
              >
                ☹️
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "26px 16px",
              background:
                "radial-gradient(circle at 50% 52%, rgba(255,193,69,0.22), transparent 38%)",
              position: "relative",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800 }}>
              <span style={{ color: "#48c763", marginRight: 8 }}>✓</span>
              With The Nest
            </div>

            <div style={{ position: "relative", height: 210, marginTop: 28 }}>
              <motion.div
                animate={{ y: [0, -5, 0], scale: [1, 1.04, 1] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 76,
                  transform: "translateX(-50%)",
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 28%, #ffe3a4 0%, #f5aa2f 42%, #5b340b 100%)",
                  boxShadow: "0 0 44px rgba(255,186,66,0.38)",
                }}
              />

              {[
                ["🧠", "Clear mind", 72, 0],
                ["🎙️", "Captured ideas", 20, 72],
                ["✨", "AI insights", 142, 72],
                ["📈", "Real growth", 84, 150],
              ].map(([icon, text, left, top]) => (
                <div
                  key={String(text)}
                  style={{
                    position: "absolute",
                    left: Number(left),
                    top: Number(top),
                    padding: "10px 11px",
                    borderRadius: 11,
                    background: "rgba(255,193,69,0.09)",
                    border: "1px solid rgba(255,193,69,0.12)",
                    color: "rgba(248,230,202,0.76)",
                    fontSize: 10,
                    minWidth: 70,
                    display: "grid",
                    gap: 4,
                    placeItems: "center",
                  }}
                >
                  <div style={{ fontSize: 18 }}>{icon}</div>
                  <div>{text}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "45%",
              transform: "translate(-50%, -50%)",
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#0b0b0f",
              border: "1px solid rgba(255,193,69,0.13)",
              display: "grid",
              placeItems: "center",
              fontSize: 30,
            }}
          >
            →
          </div>
        </div>

        <motion.button
          onClick={() => {
            trackNestEvent(events.landing_enter_clicked);
            navigate("/onboarding");
          }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: "100%",
            height: 62,
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg,#ffd36b,#f4a51f)",
            color: "#1a1205",
            fontSize: 16,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 18px 50px rgba(255,184,55,0.28)",
            textTransform: "uppercase",
          }}
        >
          ENTER THE NEST →
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

        <div
          style={{
            marginTop: 30,
            display: "flex",
            justifyContent: "space-between",
            color: "rgba(238,220,190,0.44)",
            fontSize: 11,
          }}
        >
          <span>🔒 Private & secure</span>
          <span>🛡️ Your data is yours</span>
          <span>⚡ Works in seconds</span>
        </div>
      </motion.div>
    </div>
  );
}