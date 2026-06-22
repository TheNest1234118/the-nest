import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { startSupporterCheckout } from "@/lib/subscription";

export function UpgradeScreen({
  title = "Supporter Plan",
  feature = "This feature",
}: {
  title?: string;
  feature?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const upgrade = async () => {
    setLoading(true);
    setError("");

    try {
      await startSupporterCheckout();
    } catch (err: any) {
      setError(err.message || "Could not start checkout.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.026)",
        border: "1px solid rgba(205,170,100,0.12)",
        borderRadius: 22,
        padding: 24,
        textAlign: "center",
      }}
    >
      <Sparkles
        size={20}
        strokeWidth={1.4}
        color="rgba(205,170,100,0.58)"
        style={{ marginBottom: 14 }}
      />

      <p
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(205,170,100,0.46)",
          marginBottom: 12,
        }}
      >
        {title}
      </p>

      <h2
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 25,
          fontWeight: 400,
          color: "rgba(235,215,180,0.92)",
          marginBottom: 14,
        }}
      >
        Included in Supporter
      </h2>

      <p
        style={{
          fontSize: 13,
          lineHeight: 1.7,
          color: "rgba(198,178,150,0.62)",
          marginBottom: 18,
        }}
      >
        {feature} uses AI processing and is included in the Supporter Plan.
        <br />
        <br />
        The Nest is built and maintained by a single developer. The Supporter
        Plan helps cover AI costs and keeps The Nest sustainable.
      </p>

      <button
        onClick={upgrade}
        disabled={loading}
        style={{
          width: "100%",
          border: "1px solid rgba(205,170,100,0.18)",
          background: "rgba(205,170,100,0.09)",
          color: "rgba(235,215,180,0.88)",
          borderRadius: 999,
          padding: "14px 18px",
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.55 : 1,
        }}
      >
        {loading ? "Opening..." : "Become a Supporter · 4.99 CHF/month"}
      </button>

      {error && (
        <p
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "rgba(248,113,113,0.68)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}