import React from "react";
import type { AIPatternTimeRange } from "@/lib/aiPatternTypes";
const style = document.createElement("style");
style.innerHTML = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;
document.head.appendChild(style);
function labelForRange(range: AIPatternTimeRange) {
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  if (range === "90d") return "Last 90 days";
  return "All time";
}

export function TimeRangePicker({
  value,
  onChange,
}: {
  value: AIPatternTimeRange;
  onChange: (value: AIPatternTimeRange) => void;
}) {
  const ranges: AIPatternTimeRange[] = ["7d", "30d", "90d", "all"];

  return (
    <div
  className="hide-scrollbar"
  style={{
    display: "flex",
    gap: 8,
    overflowX: "auto",
    marginBottom: 16,
    paddingBottom: 2,
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  }}
>
      {ranges.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          style={{
            border:
              value === item
                ? "1px solid rgba(205,170,100,0.28)"
                : "1px solid rgba(255,255,255,0.065)",
            background:
              value === item
                ? "rgba(205,170,100,0.10)"
                : "rgba(255,255,255,0.026)",
            color:
              value === item
                ? "rgba(205,170,100,0.72)"
                : "rgba(185,162,128,0.52)",
            borderRadius: 999,
            padding: "9px 13px",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {labelForRange(item)}
        </button>
      ))}
    </div>
  );
}