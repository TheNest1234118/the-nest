import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

const CHECK_IN_STATES = [
  { key: "overstimulated", label: "I feel overstimulated",       sub: "Too much came in. The screen didn't help." },
  { key: "disconnected",   label: "I feel disconnected",          sub: "Online all day, but not really present" },
  { key: "looping",        label: "Thoughts keep looping",        sub: "The same ones, cycling again" },
  { key: "slow_down",      label: "I can't mentally slow down",   sub: "Brain still running at internet speed" },
  { key: "numb",           label: "I feel emotionally numb",      sub: "Scrolled past feeling anything" },
  { key: "scrolling",      label: "I've been scrolling too long", sub: "Stuck in the feed, now I can't come down" },
  { key: "quiet",          label: "I need quiet",                 sub: "No more input. Just off." },
  { key: "grounding",      label: "I need grounding",             sub: "Nothing feels real right now" },
];

export function Onboarding() {
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    const stateItem = CHECK_IN_STATES.find((s) => s.key === selected);
    if (!stateItem) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      localStorage.setItem("nest_state", stateItem.key);
      localStorage.setItem("nest_state_label", stateItem.label);
      localStorage.setItem("nest_state_date", today);
      localStorage.setItem("nest_onboarded", "true");
    } catch (_) {}
    navigate("/home");
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 55% 40% at 50% 30%, rgba(185, 120, 35, 0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
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
            color: "rgba(205, 170, 100, 0.38)",
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
            color: "rgba(235, 218, 192, 0.88)",
            letterSpacing: "0.01em",
            lineHeight: 1.3,
            marginBottom: 30,
          }}
        >
          Where are you right now?
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 9,
            flex: 1,
            overflowY: "auto",
          }}
        >
          {CHECK_IN_STATES.map((opt) => {
            const isSelected = selected === opt.key;
            return (
              <motion.button
                key={opt.key}
                onClick={() => setSelected(opt.key)}
                whileTap={{ scale: 0.99 }}
                style={{
                  background: isSelected
                    ? "rgba(205, 170, 100, 0.07)"
                    : "transparent",
                  border: `1px solid ${
                    isSelected
                      ? "rgba(205, 170, 100, 0.28)"
                      : "rgba(255, 255, 255, 0.07)"
                  }`,
                  borderRadius: 13,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.20s ease, border-color 0.20s ease",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: isSelected
                        ? "rgba(225, 195, 135, 0.92)"
                        : "rgba(215, 200, 178, 0.68)",
                      letterSpacing: "0.01em",
                      marginBottom: 2,
                      transition: "color 0.20s ease",
                    }}
                  >
                    {opt.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(165, 148, 122, 0.40)",
                      fontWeight: 300,
                      letterSpacing: "0.01em",
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
                    background: isSelected
                      ? "rgba(205, 170, 100, 0.85)"
                      : "transparent",
                    border: isSelected
                      ? "none"
                      : "1px solid rgba(255, 255, 255, 0.13)",
                    flexShrink: 0,
                    marginLeft: 14,
                    transition: "background 0.20s ease, border-color 0.20s ease",
                  }}
                />
              </motion.button>
            );
          })}
        </div>

        <motion.div
          animate={{ opacity: selected ? 1 : 0, y: selected ? 0 : 5 }}
          transition={{ duration: 0.30 }}
          style={{ marginTop: 24, flexShrink: 0 }}
        >
          <button
            onClick={handleContinue}
            disabled={!selected}
            style={{
              width: "100%",
              background: "rgba(205, 170, 100, 0.09)",
              border: "1px solid rgba(205, 170, 100, 0.20)",
              borderRadius: 13,
              padding: "15px",
              color: "rgba(205, 170, 100, 0.78)",
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
    </div>
  );
}
