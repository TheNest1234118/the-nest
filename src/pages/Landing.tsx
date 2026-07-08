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

  const chaosLines = [
    "M58 92 C20 42, 130 18, 108 88 C86 158, 14 118, 62 58 C110 -2, 150 88, 82 132 C14 176, 8 54, 92 44",
    "M34 104 C92 20, 162 70, 108 128 C54 186, 0 94, 72 60 C144 26, 150 142, 44 132",
    "M78 36 C4 68, 32 164, 112 132 C192 100, 116 8, 52 80 C-12 152, 132 178, 126 74",
    "M26 72 C78 4, 172 56, 118 112 C64 168, 8 124, 48 54 C88 -16, 160 118, 72 142",
    "M96 42 C28 20, 0 112, 70 132 C140 152, 166 50, 84 62 C2 74, 32 172, 128 118",
  ];

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
        padding: "20px 20px 16px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 16%, rgba(255,191,73,0.18), transparent 30%), radial-gradient(circle at 50% 60%, rgba(255,171,43,0.10), transparent 44%), linear-gradient(180deg,#09080c 0%,#050507 100%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          maxWidth: 350,
          zIndex: 2,
          textAlign: "center",
        }}
      >
        <div style={{ height: 104, position: "relative", marginBottom: 14 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: 96,
              height: 96,
              borderRadius: "50%",
              border: "1px solid rgba(255,190,74,0.22)",
              boxShadow: "0 0 62px rgba(255,178,48,0.2)",
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
                "0 0 42px rgba(255,186,66,0.36), inset 0 0 18px rgba(255,255,255,0.16)",
            }}
          />
        </div>

        <h1
          style={{
            fontSize: 29,
            lineHeight: 1.2,
            fontWeight: 900,
            margin: "0 auto 26px",
            letterSpacing: "-0.055em",
            maxWidth: 340,
          }}
        >
          Your thoughts.
          <br />
          Organized. Understood.
          <br />
          <span style={{ color: "#ffc145" }}>Growth.</span>
        </h1>

        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,193,69,0.14)",
            background: "rgba(255,255,255,0.025)",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            height: 268,
            position: "relative",
            marginBottom: 30,
          }}
        >
          <div
            style={{
              padding: "21px 12px",
              borderRight: "1px solid rgba(255,193,69,0.14)",
              position: "relative",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 850 }}>
              <span style={{ color: "#ff4d4d", marginRight: 6 }}>✕</span>
              Without The Nest
            </div>

            <div style={{ position: "relative", height: 190, marginTop: 20 }}>
              {[
                ["Overthinking", 4, 20],
                ["Lost ideas", 100, 20],
                ["No clarity", 0, 114],
                ["No progress", 112, 136],
              ].map(([text, left, top]) => (
                <div
                  key={String(text)}
                  style={{
                    position: "absolute",
                    left: Number(left),
                    top: Number(top),
                    padding: "8px 8px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.055)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "rgba(248,230,202,0.68)",
                    fontSize: 9,
                    zIndex: 2,
                  }}
                >
                  {text}
                </div>
              ))}

              <svg
                viewBox="0 0 170 170"
                style={{
                  position: "absolute",
                  left: 20,
                  top: 52,
                  width: 128,
                  height: 128,
                  opacity: 0.42,
                }}
              >
                {chaosLines.map((d) => (
                  <path
                    key={d}
                    d={d}
                    fill="none"
                    stroke="rgba(255,255,255,0.62)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ))}
              </svg>

              <div
                style={{
                  position: "absolute",
                  left: 70,
                  top: 150,
                  fontSize: 27,
                  opacity: 0.65,
                }}
              >
                😟
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "21px 12px",
              background:
                "radial-gradient(circle at 52% 55%, rgba(255,193,69,0.22), transparent 42%)",
              position: "relative",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 850 }}>
              <span style={{ color: "#48c763", marginRight: 6 }}>✓</span>
              With The Nest
            </div>

            <div style={{ position: "relative", height: 202, marginTop: 18 }}>
              <motion.div
                animate={{ y: [0, -5, 0], scale: [1, 1.04, 1] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 72,
                  transform: "translateX(-50%)",
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 28%, #ffe3a4 0%, #f5aa2f 42%, #5b340b 100%)",
                  boxShadow: "0 0 38px rgba(255,186,66,0.42)",
                }}
              />

              {[
                ["🧠", "Clear mind", 74, 16],
                ["🎙️", "Captured ideas", 18, 84],
                ["✨", "AI insights", 112, 84],
                ["📈", "Real growth", 70, 148],
              ].map(([icon, text, left, top]) => (
                <div
                  key={String(text)}
                  style={{
                    position: "absolute",
                    left: Number(left),
                    top: Number(top),
                    padding: "8px 8px",
                    borderRadius: 9,
                    background: "rgba(255,193,69,0.09)",
                    border: "1px solid rgba(255,193,69,0.12)",
                    color: "rgba(248,230,202,0.76)",
                    fontSize: 9,
                    width: 58,
                    display: "grid",
                    gap: 3,
                    placeItems: "center",
                    zIndex: 2,
                  }}
                >
                  <div style={{ fontSize: 14 }}>{icon}</div>
                  <div>{text}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "47%",
              transform: "translate(-50%, -50%)",
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#0b0b0f",
              border: "1px solid rgba(255,193,69,0.14)",
              display: "grid",
              placeItems: "center",
              fontSize: 22,
              zIndex: 5,
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
            height: 52,
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg,#ffd36b,#f4a51f)",
            color: "#1a1205",
            fontSize: 14,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 18px 50px rgba(255,184,55,0.28)",
          }}
        >
          ENTER THE NEST →
        </motion.button>

        <button
          onClick={() => navigate("/home")}
          style={{
            marginTop: 14,
            background: "none",
            border: "none",
            color: "rgba(238,220,190,0.38)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          I already have an account
        </button>

        <div
          style={{
            marginTop: 26,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            color: "rgba(238,220,190,0.42)",
            fontSize: 9,
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