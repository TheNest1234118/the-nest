import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import OneSignal from "react-onesignal";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { exportNestData } from "@/lib/exportNest";
import { motion } from "framer-motion";
import { ChevronLeft, Trash2, Shield } from "lucide-react";

type VoiceIntensity = "off" | "minimal" | "guided";

type LegalPage = "privacy" | "terms" | "ai" | "contact" | "imprint";

function readVoiceIntensity(): VoiceIntensity {
  try {
    const v = localStorage.getItem("nest_voice_intensity");
    if (v === "off" || v === "minimal" || v === "guided") return v;
    if (localStorage.getItem("nest_voice_enabled") === "true") return "guided";
  } catch (_) {}
  return "minimal";
}

interface ConfirmState {
  label: string;
  action: () => void;
}

export function Settings() {
  const [, navigate] = useLocation();
  const [dataOpen, setDataOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState<LegalPage | null>(null);
  const [voiceIntensity, setVoiceIntensity] =
    useState<VoiceIntensity>(readVoiceIntensity);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [cleared, setCleared] = useState<string | null>(null);

  const cycleVoice = () => {
    const next: VoiceIntensity =
      voiceIntensity === "off"
        ? "minimal"
        : voiceIntensity === "minimal"
        ? "guided"
        : "off";

    setVoiceIntensity(next);
    try {
      localStorage.setItem("nest_voice_intensity", next);
      window.speechSynthesis?.cancel();
    } catch (_) {}
  };

  const doConfirm = (label: string, action: () => void) => {
    setConfirm({ label, action });
  };

  const runConfirm = () => {
    if (!confirm) return;
    confirm.action();
    setConfirm(null);
  };

  const flash = (msg: string) => {
    setCleared(msg);
    setTimeout(() => setCleared(null), 2200);
  };

  const clearSessions = () => {
    try {
      localStorage.removeItem("nest_state");
      localStorage.removeItem("nest_state_label");
      localStorage.removeItem("nest_state_date");
      localStorage.removeItem("nest_onboarded");
      localStorage.removeItem("nest_last_session");
      localStorage.removeItem("nest_reset_state");
    } catch (_) {}
    flash("Session data cleared");
  };

  const clearCapsules = () => {
    try {
      localStorage.removeItem("nest_memos");
    } catch (_) {}
    flash("Voice capsules removed");
  };

  const clearAnchors = () => {
    try {
      localStorage.removeItem("nest_anchors");
    } catch (_) {}
    flash("Anchors cleared");
  };

  const clearAtmosphere = () => {
    try {
      localStorage.removeItem("nest_atmo_file");
      localStorage.removeItem("nest_atmo_preset");
      localStorage.removeItem("nest_atmo_ambience");
    } catch (_) {}
    flash("Atmosphere reset");
  };

  const clearThoughts = () => {
    try {
      localStorage.removeItem("nest_thoughts");
    } catch (_) {}
    flash("Thoughts cleared");
  };

  const clearAll = () => {
    try {
      const keep = ["nest_voice_intensity"];
      const keys: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("nest_") && !keep.includes(k)) {
          keys.push(k);
        }
      }

      keys.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
    flash("All data cleared");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      style={{
        minHeight: "100svh",
        background: "#09090d",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <div
        style={{
          flex: 1,
          padding: "0 20px 48px",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 52px)",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <Link href="/home">
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(185,162,128,0.42)",
                padding: 4,
              }}
            >
              <ChevronLeft size={22} strokeWidth={1.4} />
            </button>
          </Link>

          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(205,170,100,0.38)",
              fontWeight: 500,
            }}
          >
            Settings
          </p>
        </motion.div>

        {/* NOTIFICATIONS */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <SectionLabel>Reminders</SectionLabel>
          <NotificationPreferences flash={flash} />
        </motion.div>

        {/* HELP + DATA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* HELP */}
          <SectionLabel>Help & Guide</SectionLabel>
          <div
            style={{
              background: "rgba(255,255,255,0.024)",
              border: "1px solid rgba(255,255,255,0.062)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <SettingRow
              label="Open The Nest Guide"
              description="Revisit the first-time introduction"
              onTap={() => navigate("/onboarding")}
            />
            <SettingRow
              label="What are Capsules?"
              description="Voice notes for moments you don’t want to lose"
            />
            <SettingRow
              label="What are Thoughts?"
              description="Short written notes, ideas or reminders"
            />
            <SettingRow
              label="What are Reflections?"
              description="Weekly and monthly looks back at what you left behind"
            />
            <SettingRow
              label="What are Anchors?"
              description="Grounding reminders for overwhelming moments"
            />
            <SettingRow
              label="Privacy & AI Reflections"
              description="Reflections are created from your own saved thoughts and voice notes"
              last
            />
          </div>

          <div style={{ height: 18 }} />

          {/* LEGAL */}
          <SectionLabel>Legal</SectionLabel>
          <div
            style={{
              background: "rgba(255,255,255,0.024)",
              border: "1px solid rgba(255,255,255,0.062)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <SettingRow
              label="Privacy Policy"
              description="How The Nest protects and uses your data"
              onTap={() => setLegalOpen("privacy")}
            />
            <SettingRow
              label="Terms of Service"
              description="Rules, ownership and availability"
              onTap={() => setLegalOpen("terms")}
            />
            <SettingRow
              label="AI & Your Data"
              description="How reflections are created with AI"
              onTap={() => setLegalOpen("ai")}
            />
            <SettingRow
              label="Contact"
              description="Questions, feedback or privacy concerns"
              onTap={() => setLegalOpen("contact")}
            />
            <SettingRow
              label="Imprint"
              description="Responsible party and legal information"
              last
              onTap={() => setLegalOpen("imprint")}
            />
          </div>

          <div
            style={{
              marginTop: 12,
              padding: "0 4px",
              color: "rgba(175,158,132,0.42)",
              fontSize: 11,
              lineHeight: 1.6,
            }}
          >
            You can permanently delete your account or remove individual data
            such as thoughts, voice capsules and anchors at any time from the
            Settings.
          </div>

          <div style={{ height: 18 }} />

          {/* DATA */}
          <SectionLabel>Data & Security</SectionLabel>
          <button
            onClick={() => setDataOpen(!dataOpen)}
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.062)",
              background: "rgba(255,255,255,0.024)",
              color: "white",
              cursor: "pointer",
            }}
          >
            Data & Security
          </button>

          {dataOpen && (
            <div
              style={{
                background: "rgba(255,255,255,0.024)",
                border: "1px solid rgba(255,255,255,0.062)",
                borderRadius: 16,
                overflow: "hidden",
                marginTop: 10,
              }}
            >
              <SettingRow
                label="Download my Nest"
                onTap={() =>
                  exportNestData().then(() => flash("Backup downloaded"))
                }
              />

              <SettingRow
                label="Clear session history"
                destructive
                onTap={() =>
                  doConfirm("Clear session history?", clearSessions)
                }
              />
              <SettingRow
                label="Clear thoughts"
                destructive
                onTap={() => doConfirm("Clear all thoughts?", clearThoughts)}
              />
              <SettingRow
                label="Remove voice capsules"
                destructive
                onTap={() =>
                  doConfirm("Remove all voice capsules?", clearCapsules)
                }
              />
              <SettingRow
                label="Clear anchors"
                destructive
                onTap={() => doConfirm("Clear all anchors?", clearAnchors)}
              />
              <SettingRow
                label="Reset atmosphere"
                destructive
                onTap={() =>
                  doConfirm("Reset atmosphere settings?", clearAtmosphere)
                }
              />

              <SettingRow
                label="Clear everything"
                description="All local data except voice preference"
                destructive
                danger
                last
                onTap={() =>
                  doConfirm("Clear all data? This cannot be undone.", clearAll)
                }
              />

              <div style={{ padding: 16, display: "flex", gap: 10 }}>
                <Shield
                  size={14}
                  strokeWidth={1.4}
                  color="rgba(185,158,115,0.30)"
                />
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(175,158,132,0.42)",
                    margin: 0,
                  }}
                >
                  Your data stays on-device unless explicitly exported.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* LEGAL MODAL */}
      {legalOpen && (
        <LegalModal page={legalOpen} onClose={() => setLegalOpen(null)} />
      )}

      {/* CONFIRM */}
      {confirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6,5,8,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: 20,
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
          onClick={() => setConfirm(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 360,
              background:
                "linear-gradient(180deg, rgba(22,21,26,0.98), rgba(13,13,17,0.98))",
              border: "1px solid rgba(205,170,100,0.16)",
              padding: 20,
              borderRadius: 22,
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
            }}
          >
            <p
              style={{
                color: "#fff",
                fontSize: 14,
                lineHeight: 1.5,
                margin: 0,
                marginBottom: 18,
              }}
            >
              {confirm.label}
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirm(null)}
                style={{
                  flex: 1,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.72)",
                  borderRadius: 14,
                  padding: "11px 12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={runConfirm}
                style={{
                  flex: 1,
                  border: "1px solid rgba(215,100,80,0.28)",
                  background: "rgba(215,100,80,0.12)",
                  color: "rgba(255,170,150,0.95)",
                  borderRadius: 14,
                  padding: "11px 12px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {cleared && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "fixed",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111",
            border: "1px solid rgba(205,170,100,0.12)",
            padding: "8px 14px",
            borderRadius: 20,
            color: "#fff",
            fontSize: 12,
            zIndex: 80,
          }}
        >
          {cleared}
        </motion.div>
      )}
    </motion.div>
  );
}

/* helpers */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10,
        letterSpacing: "0.18em",
        color: "rgba(185,158,115,0.36)",
        marginBottom: 10,
        textTransform: "uppercase",
      }}
    >
      {children}
    </p>
  );
}

function SettingRow({
  label,
  description,
  destructive,
  danger,
  last,
  onTap,
}: any) {
  return (
    <button
      onClick={onTap}
      style={{
        width: "100%",
        border: "none",
        background: "none",
        padding: 14,
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
        textAlign: "left",
        cursor: onTap ? "pointer" : "default",
        color: danger ? "rgba(215,100,80,0.8)" : "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 13 }}>{label}</div>
        {description && (
          <div
            style={{
              fontSize: 11,
              opacity: 0.5,
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        )}
      </div>

      {destructive && (
        <Trash2
          size={12}
          strokeWidth={1.5}
          color={danger ? "rgba(215,100,80,0.62)" : "rgba(215,100,80,0.45)"}
        />
      )}
    </button>
  );
}

function LegalModal({
  page,
  onClose,
}: {
  page: LegalPage;
  onClose: () => void;
}) {
  const content = LEGAL_CONTENT[page];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background:
          "radial-gradient(circle at top, rgba(185,158,115,0.12), transparent 34%), rgba(5,5,8,0.86)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(env(safe-area-inset-top, 0px) + 18px) 18px calc(env(safe-area-inset-bottom, 0px) + 18px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 430,
          maxHeight: "82svh",
          borderRadius: 26,
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(22,21,26,0.98), rgba(10,10,14,0.98))",
          border: "1px solid rgba(205,170,100,0.16)",
          boxShadow:
            "0 28px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "rgba(15,15,20,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "18px 18px 14px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                marginBottom: 6,
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(205,170,100,0.52)",
              }}
            >
              Legal
            </p>
            <h2
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.94)",
                fontSize: 19,
                fontWeight: 500,
                letterSpacing: "-0.02em",
              }}
            >
              {content.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close legal modal"
            style={{
              width: 34,
              height: 34,
              flex: "0 0 auto",
              borderRadius: 999,
              border: "1px solid rgba(205,170,100,0.14)",
              background: "rgba(255,255,255,0.035)",
              color: "rgba(255,255,255,0.72)",
              cursor: "pointer",
              fontSize: 22,
              lineHeight: "30px",
            }}
          >
            ×
          </button>
        </div>

        <div
  className="nest-legal-scroll"
  style={{
    maxHeight: "calc(82svh - 86px)",
    overflowY: "auto",
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(205,170,100,0.28) transparent",
            padding: "20px 18px 24px",
            color: "rgba(240,232,218,0.78)",
            fontSize: 13,
            lineHeight: 1.72,
          }}
        >
          <style>{`
  .nest-legal-scroll::-webkit-scrollbar {
    width: 6px;
  }

  .nest-legal-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .nest-legal-scroll::-webkit-scrollbar-thumb {
    background: rgba(205, 170, 100, 0.22);
    border-radius: 999px;
  }

  .nest-legal-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(205, 170, 100, 0.36);
  }
`}</style>
          {content.body}
        </div>
      </motion.div>
    </motion.div>
  );
}

function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h3
        style={{
          margin: "0 0 8px",
          color: "rgba(205,170,100,0.78)",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function LegalP({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 12px" }}>{children}</p>;
}

function LegalList({ children }: { children: React.ReactNode }) {
  return (
    <ul
      style={{
        margin: "8px 0 0",
        paddingLeft: 18,
        color: "rgba(240,232,218,0.74)",
      }}
    >
      {children}
    </ul>
  );
}

function LegalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      style={{
        color: "rgba(219,184,118,0.92)",
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

const LEGAL_CONTENT: Record<
  LegalPage,
  { title: string; body: React.ReactNode }
> = {
  privacy: {
    title: "Privacy Policy",
    body: (
      <>
        <LegalSection title="Overview">
          <LegalP>
            This Privacy Policy explains how The Nest handles your personal data.
            The Nest is designed as a quiet, private space for your thoughts,
            voice capsules, moods, anchors and reflections.
          </LegalP>
          <LegalP>
            App: The Nest
            <br />
            Website:{" "}
            <LegalLink href="https://thenestapp.space">
              https://thenestapp.space
            </LegalLink>
            <br />
            Contact:{" "}
            <LegalLink href="mailto:thenestsupport@gmail.com">
              thenestsupport@gmail.com
            </LegalLink>
          </LegalP>
        </LegalSection>

        <LegalSection title="Responsible party">
          <LegalP>
            The Nest
            <br />
            Elisabethenanlage 9
            <br />
            4051 Basel
            <br />
            Switzerland
          </LegalP>
        </LegalSection>

        <LegalSection title="What data is stored">
          <LegalP>The Nest may store the following data:</LegalP>
          <LegalList>
            <li>Account information, including your email address</li>
            <li>Thoughts</li>
            <li>Voice Capsules</li>
            <li>Mood Check-ins</li>
            <li>Anchors</li>
            <li>Reflections</li>
            <li>Settings and preferences</li>
          </LegalList>
        </LegalSection>

        <LegalSection title="Why this data is stored">
          <LegalP>
            This data is stored so the app can provide its core features:
            saving your personal entries, showing your history, creating weekly
            and monthly reflections, keeping your preferences and allowing you to
            return to your own content across sessions.
          </LegalP>
        </LegalSection>

        <LegalSection title="How your data is used">
          <LegalP>
            Your data is used only to operate The Nest and to provide the
            features you choose to use. Your thoughts, voice capsules, moods,
            anchors and reflections are personal to you.
          </LegalP>
          <LegalP>
            Only you have access to your personal content through your account.
            The Nest does not sell your personal content and does not use it for
            advertising.
          </LegalP>
        </LegalSection>

        <LegalSection title="Deletion">
          <LegalP>
            You can delete your data at any time. You may remove individual
            content such as thoughts, voice capsules or anchors, or permanently
            delete your complete account and associated data from the Settings.
          </LegalP>
        </LegalSection>

        <LegalSection title="Cookies">
          <LegalP>The Nest does not use cookies.</LegalP>
        </LegalSection>

        <LegalSection title="Third-party services">
          <LegalP>The Nest uses selected third-party services:</LegalP>
          <LegalList>
            <li>OneSignal for push notifications</li>
            <li>Vercel Analytics for anonymous usage statistics</li>
            <li>Supabase for authentication, database and storage</li>
            <li>OpenAI only for weekly and monthly reflections</li>
          </LegalList>
        </LegalSection>
      </>
    ),
  },

  terms: {
    title: "Terms of Service",
    body: (
      <>
        <LegalSection title="Use of The Nest">
          <LegalP>
            The Nest is a personal wellbeing and reflection app. By using The
            Nest, you agree to use it respectfully, lawfully and only for its
            intended purpose.
          </LegalP>
        </LegalSection>

        <LegalSection title="Minimum age">
          <LegalP>
            You must be at least 13 years old to use The Nest. If you are under
            the required age in your country, you may not use the app.
          </LegalP>
        </LegalSection>

        <LegalSection title="Your content">
          <LegalP>
            You remain the owner of your content. This includes your thoughts,
            voice capsules, mood check-ins, anchors and reflections.
          </LegalP>
          <LegalP>
            You give The Nest permission to store and process your content only
            as needed to provide the app’s features.
          </LegalP>
        </LegalSection>

        <LegalSection title="Prohibited use">
          <LegalP>You agree not to use The Nest for:</LegalP>
          <LegalList>
            <li>Illegal content or illegal activities</li>
            <li>Harassment, abuse or harmful behavior</li>
            <li>Attempts to disrupt, overload or misuse the service</li>
            <li>Accessing data or systems without permission</li>
          </LegalList>
        </LegalSection>

        <LegalSection title="Availability">
          <LegalP>
            The Nest is provided with care, but we cannot guarantee that the app
            will always be available, uninterrupted or error-free. Features may
            change, pause or be removed over time.
          </LegalP>
        </LegalSection>

        <LegalSection title="Limitation of liability">
          <LegalP>
            The Nest is provided “as is”. To the extent permitted by law, The
            Nest is not liable for indirect, incidental or consequential damages,
            loss of data, service interruptions or issues caused by third-party
            services.
          </LegalP>
        </LegalSection>

        <LegalSection title="Account and data deletion">
          <LegalP>
            You can delete your account at any time. You can also delete
            individual data such as thoughts, voice capsules, anchors and other
            saved content from the Settings.
          </LegalP>
        </LegalSection>
      </>
    ),
  },

  ai: {
    title: "AI & Your Data",
    body: (
      <>
        <LegalSection title="How AI is used">
          <LegalP>
            The Nest uses OpenAI exclusively to create personal reflections.
            AI is used only for Weekly Reflections and Monthly Reflections.
          </LegalP>
        </LegalSection>

        <LegalSection title="What is sent to OpenAI">
          <LegalP>
            Only text is sent to OpenAI when a reflection is generated. This may
            include written thoughts, mood check-ins, anchors and text
            transcripts from voice capsules.
          </LegalP>
          <LegalP>
            No voice recordings, no audio files, no images and no personal
            account data are sent to OpenAI.
          </LegalP>
        </LegalSection>

        <LegalSection title="Voice capsules">
          <LegalP>
            Voice memos are first transcribed or converted into text. Only this
            text may then be used to create Weekly or Monthly Reflections.
          </LegalP>
        </LegalSection>

        <LegalSection title="Model improvement">
          <LegalP>
            OpenAI does not permanently store your personal content to improve
            its models. The Nest only sends the text required to create the
            reflection you requested.
          </LegalP>
        </LegalSection>

        <LegalSection title="Third-party services">
          <LegalP>The Nest uses these providers for specific purposes:</LegalP>
          <LegalList>
            <li>OpenAI for Weekly and Monthly Reflections only</li>
            <li>Supabase for authentication, database and storage</li>
            <li>OneSignal for push notifications</li>
            <li>Vercel Analytics for anonymous usage statistics</li>
          </LegalList>
        </LegalSection>
      </>
    ),
  },

  contact: {
    title: "Questions?",
    body: (
      <>
        <LegalSection title="Questions?">
          <LegalP>
            If you have questions, feedback or privacy concerns, feel free to
            contact us.
          </LegalP>
          <LegalP>
            E-Mail:{" "}
            <LegalLink href="mailto:thenestsupport@gmail.com">
              thenestsupport@gmail.com
            </LegalLink>
            <br />
            Website:{" "}
            <LegalLink href="https://thenestapp.space">
              https://thenestapp.space
            </LegalLink>
          </LegalP>
        </LegalSection>
      </>
    ),
  },

  imprint: {
    title: "Imprint",
    body: (
      <>
        <LegalSection title="App">
          <LegalP>The Nest</LegalP>
        </LegalSection>

        <LegalSection title="Responsible">
          <LegalP>The Nest</LegalP>
        </LegalSection>

        <LegalSection title="Address">
          <LegalP>
            Elisabethenanlage 9
            <br />
            4051 Basel
            <br />
            Switzerland
          </LegalP>
        </LegalSection>

        <LegalSection title="Contact">
          <LegalP>
            <LegalLink href="mailto:thenestsupport@gmail.com">
              thenestsupport@gmail.com
            </LegalLink>
            <br />
            <LegalLink href="https://thenestapp.space">
              https://thenestapp.space
            </LegalLink>
          </LegalP>
        </LegalSection>
      </>
    ),
  },
};