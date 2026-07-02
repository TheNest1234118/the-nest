import React from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

export function PatternLoading() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2.2, repeat: Infinity }}
      style={{
        background: "rgba(255,255,255,0.026)",
        border: "1px solid rgba(255,255,255,0.065)",
        borderRadius: 20,
        padding: 22,
        textAlign: "center",
        marginBottom: 16,
      }}
    >
      <Flame size={20} color="rgba(205,170,100,0.72)" />
      <p
        style={{
          marginTop: 10,
          color: "rgba(185,162,128,0.52)",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        Listening for patterns…
      </p>
    </motion.div>
  );
}