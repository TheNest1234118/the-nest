
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import React, { useEffect } from "react";
import { trackNestEvent, events } from "@/lib/analyticsEvents";


export function Landing() {
  const [, navigate] = useLocation();
  useEffect(() => {

    trackNestEvent(events.landing_view);
  
    const completed =
      localStorage.getItem("nest_guide_completed") === "true";
  
    if (completed) {
      navigate("/home");
    }
  
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#09080c",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 45% at 50% 52%, rgba(190, 125, 38, 0.09) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        animate={{ opacity: [0.35, 0.52, 0.35], scale: [1, 1.06, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(200, 135, 42, 0.11) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -52%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        style={{
          textAlign: "center",
          zIndex: 10,
          padding: "0 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <p
          style={{
            color: "rgba(205, 170, 100, 0.45)",
            fontSize: 10,
            letterSpacing: "0.30em",
            textTransform: "uppercase",
            marginBottom: 22,
            fontWeight: 500,
          }}
        >
          Recovery space
        </p>

        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 46,
            fontWeight: 400,
            color: "rgba(235, 218, 192, 0.90)",
            letterSpacing: "0.05em",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          The Nest
        </h1>

        <p
          style={{
            color: "rgba(175, 158, 132, 0.45)",
            fontSize: 14,
            fontWeight: 300,
            lineHeight: 1.65,
            maxWidth: 240,
            margin: "0 auto 60px",
            letterSpacing: "0.01em",
          }}
        >
          For when your brain won't slow down after the internet.
        </p>

        <motion.button
  onClick={() => {
    trackNestEvent(events.landing_enter_clicked);
    navigate("/onboarding");
  }}
  whileHover={{ opacity: 1 }}
  whileTap={{ scale: 0.97 }}
  style={{
    background: "none",
    border: "none",
    borderBottom: "1px solid rgba(205, 170, 100, 0.28)",
    cursor: "pointer",
    color: "rgba(205, 170, 100, 0.65)",
    fontSize: 11,
    letterSpacing: "0.30em",
    textTransform: "uppercase",
    fontWeight: 500,
    padding: "10px 4px 11px",
  }}
>
  Beginn
</motion.button>
      </motion.div>

  
    </div>
  );
}