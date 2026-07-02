import React from "react";
import { motion } from "framer-motion";
import {
  Repeat,
  Brain,
  Moon,
  Clock3,
  Leaf,
  AlertTriangle,
} from "lucide-react";
import type { AIPattern } from "@/lib/aiPatternTypes";

function iconFor(type: AIPattern["type"]) {
  if (type === "creative_pattern" || type === "time_of_day_pattern") {
    return <Moon size={17} />;
  }

  if (type === "stress_pattern" || type === "negative_loop") {
    return <AlertTriangle size={17} />;
  }

  if (type === "growth_pattern" || type === "positive_change") {
    return <Leaf size={17} />;
  }

  if (type === "habit_pattern") {
    return <Clock3 size={17} />;
  }

  if (type === "recurring_topic" || type === "recently_started") {
    return <Repeat size={17} />;
  }

  return <Brain size={17} />;
}

export function PatternCard({
  pattern,
  index,
}: {
  pattern: AIPattern;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.05, 0.35), duration: 0.55 }}
      style={{
        background: "rgba(255,255,255,0.026)",
        border: "1px solid rgba(255,255,255,0.065)",
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            background: "rgba(205,170,100,0.07)",
            border: "1px solid rgba(205,170,100,0.12)",
            color: "rgba(205,170,100,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {iconFor(pattern.type)}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <h3
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 400,
                fontSize: 19,
                lineHeight: 1.25,
                color: "rgba(235,215,180,0.90)",
                marginBottom: 7,
              }}
            >
              {pattern.title}
            </h3>

            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(205,170,100,0.42)",
                whiteSpace: "nowrap",
                marginTop: 4,
              }}
            >
              {pattern.confidence}
            </span>
          </div>

          <p
            style={{
              color: "rgba(220,205,182,0.68)",
              fontSize: 13,
              lineHeight: 1.65,
              marginBottom: 15,
            }}
          >
            {pattern.description}
          </p>

          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(205,170,100,0.42)",
              marginBottom: 8,
            }}
          >
            Evidence
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            {pattern.evidence.map((item, i) => (
              <div
                key={`${item.entry_id}-${i}`}
                style={{
                  background: "rgba(255,255,255,0.022)",
                  border: "1px solid rgba(255,255,255,0.052)",
                  borderRadius: 14,
                  padding: "11px 12px",
                }}
              >
                <p
                  style={{
                    color: "rgba(225,210,188,0.72)",
                    fontSize: 12,
                    lineHeight: 1.55,
                    fontStyle: "italic",
                  }}
                >
                  “{item.quote}”
                </p>

                <p
                  style={{
                    color: "rgba(175,158,132,0.34)",
                    fontSize: 10,
                    marginTop: 6,
                  }}
                >
                  {item.date}
                </p>
              </div>
            ))}
          </div>

          {pattern.suggestion && (
            <div
              style={{
                marginTop: 14,
                borderTop: "1px solid rgba(255,255,255,0.055)",
                paddingTop: 13,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(205,170,100,0.42)",
                  marginBottom: 6,
                }}
              >
                Gentle suggestion
              </p>

              <p
                style={{
                  color: "rgba(205,170,100,0.68)",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {pattern.suggestion}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}