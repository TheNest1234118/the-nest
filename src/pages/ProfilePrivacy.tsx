import React from "react";
import { ProfileShell, ProfileCard, SectionLabel, SettingRow } from "@/pages/ProfileShell";

export function ProfilePrivacy() {
  const [open, setOpen] = React.useState<string | null>(null);

  const text: Record<string, string> = {
    privacy: "The Nest stores account information, thoughts, voice capsules, moods, anchors, reflections and preferences so the app can work.",
    terms: "By using The Nest, you agree to use it respectfully, lawfully and only for its intended purpose.",
    ai: "OpenAI is used for AI features such as reflections and patterns. Only text required for the feature is sent.",
    contact: "Contact: thenestsupport@gmail.com",
    imprint: "The Nest, Elisabethenanlage 9, 4051 Basel, Switzerland.",
  };

  return (
    <ProfileShell title="Privacy" subtitle="Legal information and AI data use.">
      <SectionLabel>Legal</SectionLabel>
      <ProfileCard>
        <SettingRow label="Privacy Policy" description="How The Nest protects and uses your data" onTap={() => setOpen("privacy")} />
        <SettingRow label="Terms of Service" description="Rules, ownership and availability" onTap={() => setOpen("terms")} />
        <SettingRow label="AI & Your Data" description="How reflections and patterns are created with AI" onTap={() => setOpen("ai")} />
        <SettingRow label="Contact" description="Questions, feedback or privacy concerns" onTap={() => setOpen("contact")} />
        <SettingRow label="Imprint" description="Responsible party and legal information" last onTap={() => setOpen("imprint")} />
      </ProfileCard>

      {open && (
        <div
          onClick={() => setOpen(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(6,5,8,.88)",
            backdropFilter: "blur(18px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 380,
              background: "rgba(18,15,12,.96)",
              border: "1px solid rgba(205,170,100,.14)",
              borderRadius: 22,
              padding: 20,
              color: "rgba(220,205,182,.72)",
              lineHeight: 1.65,
              fontSize: 13,
            }}
          >
            {text[open]}
            <button
              onClick={() => setOpen(null)}
              style={{
                width: "100%",
                marginTop: 18,
                border: "1px solid rgba(205,170,100,.14)",
                background: "rgba(205,170,100,.06)",
                borderRadius: 14,
                padding: 12,
                color: "rgba(225,205,176,.78)",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </ProfileShell>
  );
}