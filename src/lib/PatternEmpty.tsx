import React from "react";
import { Link } from "wouter";

const quickButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(205,170,100,0.14)",
  background: "rgba(205,170,100,0.06)",
  borderRadius: 14,
  padding: "13px 14px",
  color: "rgba(225,205,176,0.78)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
};

export function PatternEmpty() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.026)",
        border: "1px solid rgba(255,255,255,0.065)",
        borderRadius: 20,
        padding: 22,
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontFamily: "Georgia, serif",
          fontWeight: 400,
          color: "rgba(235,215,180,0.90)",
          fontSize: 23,
          marginBottom: 10,
        }}
      >
        Not enough patterns yet.
      </h2>

      <p
        style={{
          color: "rgba(185,162,128,0.52)",
          fontSize: 13,
          lineHeight: 1.65,
          marginBottom: 18,
        }}
      >
        Leave a few more thoughts or voice capsules, and The Nest will start
        noticing what keeps returning.
      </p>

      <div style={{ display: "grid", gap: 9 }}>
        <Link href="/memos">
          <button style={quickButtonStyle}>Record a voice capsule</button>
        </Link>

        <Link href="/thoughts">
          <button style={quickButtonStyle}>Write a thought</button>
        </Link>
      </div>
    </div>
  );
}