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
    "M42 88 C10 35, 132 10, 120 82 C108 154, 8 126, 55 55 C102 -16, 160 95, 78 145 C-4 195, 10 42, 115 45",
    "M28 108 C95 14, 176 68, 115 138 C54 208, -14 88, 72 54 C158 20, 150 166, 35 140",
    "M82 30 C0 68, 35 178, 125 132 C215 86, 120 -8, 52 82 C-16 172, 142 194, 138 72",
    "M25 72 C84 -8, 188 58, 125 120 C62 182, -10 132, 48 52 C106 -28, 170 138, 68 152",
    "M102 42 C28 10, -8 118, 72 140 C152 162, 184 45, 88 60 C-8 75, 28 188, 142 116",
    "M54 36 C140 10, 160 120, 78 134 C-4 148, 18 58, 104 76 C190 94, 104 184, 46 116",
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
          Your thoughts.
          <br />
          Organized. Understood.
          <br />
          <span style={{ color: "#ffc145" }}>Growth.</span>
        </h1>

        <div
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,193,69,0.18)",
            background: "rgba(255,255,255,0.018)",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            height: 280,
            position: "relative",
            marginBottom: 34,
            boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
          }}
        >
          <div
            style={{
              padding: "28px 18px",
              borderRight: "1px solid rgba(255,193,69,0.16)",
              position: "relative",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 850 }}>
              <span style={{ color: "#ff4d4d", marginRight: 8, fontSize: 18 }}>×</span>
              Without The Nest
            </div>

            <div style={{ position: "relative", height: 210, marginTop: 16 }}>
              {[
                ["Overthinking", 4, 28],
                ["Lost ideas", 122, 26],
                ["No clarity", 0, 154],
                ["No progress", 118, 166],
              ].map(([text, left, top]) => (
                <div
                  key={String(text)}
                  style={{
                    position: "absolute",
                    left: Number(left),
                    top: Number(top),
                    padding: "9px 10px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.055)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "rgba(248,230,202,0.78)",
                    fontSize: 10,
                    zIndex: 3,
                    boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
                  }}
                >
                  {text}
                </div>
              ))}

              <svg
                viewBox="0 0 190 190"
                style={{
                  position: "absolute",
                  left: 24,
                  top: 46,
                  width: 148,
                  height: 148,
                  opacity: 0.58,
                  zIndex: 1,
                }}
              >
                {chaosLines.map((d) => (
                  <path
                    key={d}
                    d={d}
                    fill="none"
                    stroke="rgba(238,220,190,0.66)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                ))}

                {[30, 55, 155, 168].map((x, i) => (
                  <circle
                    key={x}
                    cx={x}
                    cy={[62, 138, 56, 128][i]}
                    r="3"
                    fill="#ffc145"
                    opacity="0.85"
                  />
                ))}
              </svg>

              <div
                style={{
                  position: "absolute",
                  left: 76,
                  top: 98,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 28%, #f6d98b 0%, #d99b2a 48%, #5f3510 100%)",
                  border: "1px solid rgba(255,193,69,0.35)",
                  display: "grid",
                  placeItems: "center",
                  color: "#201204",
                  fontSize: 27,
                  fontWeight: 900,
                  zIndex: 2,
                  boxShadow: "0 0 24px rgba(255,193,69,0.28)",
                }}
              >
                ?
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "28px 18px",
              background:
                "radial-gradient(circle at 52% 54%, rgba(255,193,69,0.23), transparent 43%)",
              position: "relative",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 850 }}>
              <span style={{ color: "#48c763", marginRight: 8, fontSize: 18 }}>✓</span>
              With The Nest
            </div>

            <div style={{ position: "relative", height: 210, marginTop: 16 }}>
              <motion.div
                animate={{ y: [0, -4, 0], scale: [1, 1.035, 1] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 83,
                  transform: "translateX(-50%)",
                  width: 66,
                  height: 66,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 35% 28%, #ffe3a4 0%, #f5aa2f 42%, #5b340b 100%)",
                  boxShadow: "0 0 44px rgba(255,186,66,0.46)",
                  zIndex: 2,
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 54,
                  width: 1,
                  height: 104,
                  background: "rgba(255,193,69,0.42)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 47,
                  top: 116,
                  width: 126,
                  height: 1,
                  background: "rgba(255,193,69,0.42)",
                }}
              />

              {[
                ["✿", "Clear mind", 74, 24],
                ["♬", "Captured ideas", 18, 90],
                ["✦", "AI insights", 138, 90],
                ["↗", "Real growth", 78, 158],
              ].map(([icon, text, left, top]) => (
                <div
                  key={String(text)}
                  style={{
                    position: "absolute",
                    left: Number(left),
                    top: Number(top),
                    padding: "10px 9px",
                    borderRadius: 12,
                    background: "rgba(255,193,69,0.08)",
                    border: "1px solid rgba(255,193,69,0.22)",
                    color: "rgba(248,230,202,0.86)",
                    fontSize: 10,
                    width: 72,
                    minHeight: 54,
                    display: "grid",
                    gap: 4,
                    placeItems: "center",
                    zIndex: 3,
                    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                  }}
                >
                  <div style={{ fontSize: 21, color: "#ffc145", lineHeight: 1 }}>
                    {icon}
                  </div>
                  <div>{text}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#0b0b0f",
              border: "1px solid rgba(255,193,69,0.18)",
              display: "grid",
              placeItems: "center",
              fontSize: 27,
              zIndex: 10,
              boxShadow: "0 0 24px rgba(0,0,0,0.45)",
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