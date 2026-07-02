import React from "react";
import { Sparkles } from "lucide-react";
import { getProfile, startSupporterCheckout } from "@/lib/subscription";
import { ProfileShell, SectionLabel } from "@/pages/ProfileShell";

export function ProfilePremium() {
  const [plan, setPlan] = React.useState<"free" | "supporter">("free");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    getProfile().then((p) => setPlan(p?.plan || "free")).catch(console.error);
  }, []);

  async function upgrade() {
    setLoading(true);
    try {
      await startSupporterCheckout();
    } catch {
      setLoading(false);
    }
  }

  return (
    <ProfileShell title="Premium" subtitle="Support The Nest and unlock deeper reflection.">
      <SectionLabel>Supporter Plan</SectionLabel>

      <div
        style={{
          background: "rgba(255,255,255,0.024)",
          border: "1px solid rgba(255,255,255,0.062)",
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Sparkles size={17} strokeWidth={1.4} color="rgba(205,170,100,0.52)" />

          <div>
            <div style={{ fontSize: 14, color: "rgba(225,210,188,0.78)", marginBottom: 4 }}>
              {plan === "supporter" ? "Supporter active" : "Free Plan"}
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.55, color: "rgba(175,158,132,0.42)" }}>
              {plan === "supporter"
                ? "Thank you for helping keep The Nest sustainable."
                : "Free includes core features, 30 transcriptions per month and weekly reflections."}
            </div>
          </div>
        </div>

        {plan !== "supporter" && (
          <>
            <div style={{ marginTop: 14, fontSize: 12, lineHeight: 1.65, color: "rgba(198,178,150,0.58)" }}>
              Supporter unlocks unlimited transcriptions, unlimited weekly reflections, monthly reflections, Ask Your Past and future premium AI features.
            </div>

            <button
              onClick={upgrade}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: 14,
                border: "1px solid rgba(205,170,100,0.18)",
                background: "rgba(205,170,100,0.09)",
                color: "rgba(235,215,180,0.88)",
                borderRadius: 999,
                padding: "13px 16px",
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.55 : 1,
              }}
            >
              {loading ? "Opening..." : "Become a Supporter · 4.99 CHF/month"}
            </button>
          </>
        )}
      </div>
    </ProfileShell>
  );
}