import React from "react";

export function PatternHero({ summary }: { summary: string }) {
  if (!summary) return null;

  return (
    <section
      style={{
        borderRadius: 24,
        border: "1px solid rgba(205,170,100,0.16)",
        background:
          "linear-gradient(145deg, rgba(205,170,100,0.10), rgba(255,255,255,0.024))",
        padding: 22,
        marginBottom: 16,
      }}
    >
      <p
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(205,170,100,0.42)",
          marginBottom: 10,
        }}
      >
        What the AI noticed
      </p>

      <p
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "rgba(235,215,180,0.90)",
          fontSize: 22,
          lineHeight: 1.35,
        }}
      >
        “{summary}”
      </p>
    </section>
  );
}