import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const CHECK_IN_STATES = [
  {
    key: "slow_down",
    label: "I can't mentally slow down",
    sub: "Brain still running at internet speed",
    line1: "you don’t need to catch up with your thoughts right now.",
    delay: 3600,
  },
  {
    key: "scrolling",
    label: "I've been scrolling too long",
    sub: "Stuck in the feed, now I can't come down",
    line1: "your brain is still moving at feed speed.",
    line2: "let it slow down.",
    delay: 5200,
  },
  {
    key: "looping",
    label: "Thoughts keep looping",
    sub: "The same ones, cycling again",
    line1: "not every thought needs an answer tonight.",
    delay: 4200,
  },
  {
    key: "quiet",
    label: "I need quiet",
    sub: "No more input. Just off.",
    line1: "no more input for now.",
    delay: 4800,
  },
];

function applyStateAtmosphere(key: string) {
  try {
    if (key === "quiet") {
      localStorage.setItem("nest_dashboard_mode", "quiet");
      localStorage.setItem("nest_weather_settings", JSON.stringify({
        enabled: false, rain: 0, wind: 0, lightning: 0, thunder: 0, storm: 0,
      }));
    }

    if (key === "scrolling") {
      localStorage.setItem("nest_dashboard_mode", "soft");
      localStorage.setItem("nest_weather_settings", JSON.stringify({
        enabled: true, rain: 0.25, wind: 0.08, lightning: 0, thunder: 0, storm: 0.05,
      }));
    }

    if (key === "looping") {
      localStorage.setItem("nest_dashboard_mode", "rain");
      localStorage.setItem("nest_weather_settings", JSON.stringify({
        enabled: true, rain: 0.38, wind: 0.04, lightning: 0, thunder: 0, storm: 0.08,
      }));
    }

    if (key === "slow_down") {
      localStorage.setItem("nest_dashboard_mode", "slow");
      localStorage.setItem("nest_weather_settings", JSON.stringify({
        enabled: true, rain: 0.12, wind: 0.02, lightning: 0, thunder: 0, storm: 0.03,
      }));
    }
  } catch (_) {}
}

export function Onboarding() {
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const selectedItem = CHECK_IN_STATES.find((s) => s.key === selected);

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: 8 + Math.random() * 84,
        top: 8 + Math.random() * 84,
        delay: Math.random() * 4,
        duration: 7 + Math.random() * 8,
      })),
    []
  );

  const handleContinue = () => {
    if (!selectedItem) return;

    const today = new Date().toISOString().slice(0, 10);

    try {
      localStorage.setItem("nest_state", selectedItem.key);
      localStorage.setItem("nest_state_label", selectedItem.label);
      localStorage.setItem("nest_state_date", today);
      localStorage.setItem("nest_onboarded", "true");
      applyStateAtmosphere(selectedItem.key);
    } catch (_) {}

    setTransitioning(true);

    setTimeout(() => {
      navigate("/home");
    }, selectedItem.delay);
  };

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#09080c",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* soft moving haze */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.35, 0.55, 0.35],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: "-20%",
          background:
            "radial-gradient(ellipse 55% 40% at 50% 35%, rgba(185,120,35,0.10) 0%, rgba(90,55,25,0.035) 45%, transparent 72%)",
          pointerEvents: "none",
        }}
      />

      {/* breathing glow */}
      <motion.div
        animate={{
          scale: selected === "slow_down" ? [1, 1.12, 1] : [1, 1.06, 1],
          opacity: selected === "quiet" ? [0.04, 0.10, 0.04] : [0.06, 0.16, 0.06],
        }}
        transition={{
          duration: selected === "slow_down" ? 8 : selected === "quiet" ? 10 : 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          left: "50%",
          top: "42%",
          transform: "translate(-50%, -50%)",
          background: "rgba(185,120,35,0.20)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      {/* slow particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          animate={{
            y: [-8, 8, -8],
            opacity: [0.04, 0.13, 0.04],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: 2,
            height: 2,
            borderRadius: "50%",
            background: "rgba(205,170,100,0.55)",
            pointerEvents: "none",
          }}
        />
      ))}

      <AnimatePresence mode="wait">
        {!transitioning ? (
          <motion.div
            key="checkin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, filter: "blur(8px)", scale: 0.985 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "0 24px 48px",
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 52px)",
              maxWidth: 480,
              margin: "0 auto",
              width: "100%",
              zIndex: 1,
              position: "relative",
            }}
          >
            <p
              style={{
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "rgba(205,170,100,0.38)",
                marginBottom: 26,
                fontWeight: 500,
              }}
            >
              Today's check-in
            </p>

            <h2
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 26,
                fontWeight: 400,
                color: "rgba(235,218,192,0.88)",
                letterSpacing: "0.01em",
                lineHeight: 1.3,
                marginBottom: 30,
              }}
            >
              Where are you right now?
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
              {CHECK_IN_STATES.map((opt) => {
                const isSelected = selected === opt.key;

                return (
                  <motion.button
                    key={opt.key}
                    onClick={() => setSelected(opt.key)}
                    whileTap={{ scale: 0.99 }}
                    animate={{
                      opacity: selected && !isSelected ? 0.42 : 1,
                    }}
                    style={{
                      background: isSelected ? "rgba(205,170,100,0.07)" : "rgba(255,255,255,0.012)",
                      border: `1px solid ${
                        isSelected ? "rgba(205,170,100,0.28)" : "rgba(255,255,255,0.07)"
                      }`,
                      borderRadius: 13,
                      padding: "14px 16px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 400,
                            color: isSelected
                              ? "rgba(225,195,135,0.92)"
                              : "rgba(215,200,178,0.68)",
                            marginBottom: 2,
                          }}
                        >
                          {opt.label}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(165,148,122,0.40)",
                            fontWeight: 300,
                          }}
                        >
                          {opt.sub}
                        </div>
                      </div>

                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: isSelected ? "rgba(205,170,100,0.85)" : "transparent",
                          border: isSelected ? "none" : "1px solid rgba(255,255,255,0.13)",
                          marginTop: 5,
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <motion.div
              animate={{ opacity: selected ? 1 : 0, y: selected ? 0 : 5 }}
              transition={{ duration: 0.3 }}
              style={{ marginTop: 24 }}
            >
              <button
                onClick={handleContinue}
                disabled={!selected}
                style={{
                  width: "100%",
                  background: "rgba(205,170,100,0.09)",
                  border: "1px solid rgba(205,170,100,0.20)",
                  borderRadius: 13,
                  padding: 15,
                  color: "rgba(205,170,100,0.78)",
                  fontSize: 11,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  cursor: selected ? "pointer" : "default",
                }}
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="transition"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 32,
              textAlign: "center",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 1.4 }}
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: selected === "quiet" ? 18 : 19,
                  lineHeight: 1.55,
                  color: "rgba(230,212,188,0.72)",
                  fontWeight: 300,
                  maxWidth: 310,
                }}
              >
                {selectedItem?.line1}
              </motion.p>

              {selectedItem?.line2 && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 3.0, duration: 1.4 }}
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: 18,
                    lineHeight: 1.55,
                    color: "rgba(230,212,188,0.58)",
                    fontWeight: 300,
                    marginTop: 18,
                  }}
                >
                  {selectedItem.line2}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}