import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import OneSignal from "react-onesignal";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { exportNestData } from "@/lib/exportNest";
import { motion } from "framer-motion";
import { ChevronLeft, Trash2, Shield } from "lucide-react";

type VoiceIntensity = "off" | "minimal" | "guided";

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
 
  const [voiceIntensity, setVoiceIntensity] =
    useState<VoiceIntensity>(readVoiceIntensity);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [cleared, setCleared] = useState<string | null>(null);

  const [openDataSecurity, setOpenDataSecurity] = useState(false);

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

  const VOICE_LABELS: Record<VoiceIntensity, string> = {
    off: "Off",
    minimal: "Minimal",
    guided: "Guided",
  };

  const VOICE_DESC: Record<VoiceIntensity, string> = {
    off: "No voice during sessions",
    minimal: "One quiet phrase, once",
    guided: "A few short lines with long pauses",
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.6 }}
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

        {/* Voice */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.6 }}
        >
          <SectionLabel>Voice</SectionLabel>

          <div
            style={{
              background: "rgba(255,255,255,0.024)",
              border: "1px solid rgba(255,255,255,0.062)",
              borderRadius: 16,
            }}
          >
            <SettingRow
              label="Voice during sessions"
              value={VOICE_LABELS[voiceIntensity]}
              description={VOICE_DESC[voiceIntensity]}
              onTap={cycleVoice}
              last
            />
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.6 }}
        >
          <SectionLabel>Notifications</SectionLabel>
          <NotificationPreferences flash={flash} />
        </motion.div>

        {/* DATA + SECURITY */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.6 }}
        >
          {/* Help & Guide */}
<motion.div

initial={{ opacity: 0, y: 8 }}

animate={{ opacity: 1, y: 0 }}

transition={{ delay: 0.17, duration: 0.6 }}
>
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
</motion.div>

          <SectionLabel>Data & Security</SectionLabel>

          <button
            onClick={() => setOpenDataSecurity(!openDataSecurity)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "14px 16px",
              cursor: "pointer",
              color: "rgba(220,205,182,0.78)",
              marginBottom: 8,
            }}
          >
            {openDataSecurity
              ? "Hide options"
              : "Manage stored data & privacy"}
          </button>

          {openDataSecurity && (
            <div
              style={{
                background: "rgba(255,255,255,0.024)",
                border: "1px solid rgba(255,255,255,0.062)",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <SettingRow
                label="Download my Nest"
                description="Export thoughts, memos, anchors, tags and sessions"
                onTap={() =>
                  exportNestData().then(() =>
                    flash("Backup downloaded")
                  )
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
                onTap={() =>
                  doConfirm("Clear all thoughts?", clearThoughts)
                }
              />

              <SettingRow
                label="Remove voice capsules"
                destructive
                onTap={() =>
                  doConfirm(
                    "Remove all voice capsules?",
                    clearCapsules
                  )
                }
              />

              <SettingRow
                label="Clear anchors"
                destructive
                onTap={() =>
                  doConfirm("Clear all anchors?", clearAnchors)
                }
              />

              <SettingRow
                label="Reset atmosphere"
                destructive
                onTap={() =>
                  doConfirm(
                    "Reset atmosphere settings?",
                    clearAtmosphere
                  )
                }
              />

              <SettingRow
                label="Clear everything"
                description="All local data except voice preference"
                destructive
                danger
                onTap={() =>
                  doConfirm(
                    "Clear all data? This cannot be undone.",
                    clearAll
                  )
                }
                last
              />

              <div
                style={{
                  padding: 16,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <Shield
                  size={14}
                  strokeWidth={1.4}
                  color="rgba(185,158,115,0.30)"
                  style={{ marginTop: 1 }}
                />
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 300,
                    color: "rgba(175,158,132,0.42)",
                    lineHeight: 1.65,
                  }}
                >
                  Your data stays on-device unless explicitly exported.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

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
            zIndex: 100,
          }}
          onClick={() => setConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(18,15,12,0.96)",
              padding: 24,
              borderRadius: 16,
              maxWidth: 320,
              width: "100%",
            }}
          >
            <p style={{ color: "#fff", marginBottom: 12 }}>
              {confirm.label}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirm(null)}>Cancel</button>
              <button onClick={runConfirm}>Clear</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* TOAST */}
      {cleared && (
        <div
          style={{
            position: "fixed",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111",
            padding: "8px 14px",
            borderRadius: 20,
            color: "#fff",
          }}
        >
          {cleared}
        </div>
      )}
    </motion.div>
  );
}

/* UI helpers */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(185,158,115,0.36)",
        fontWeight: 500,
        marginBottom: 10,
        paddingLeft: 4,
      }}
    >
      {children}
    </p>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  value?: string;
  destructive?: boolean;
  danger?: boolean;
  last?: boolean;
  onTap?: () => void;
}

function SettingRow({
  label,
  description,
  value,
  destructive,
  danger,
  last,
  onTap,
}: SettingRowProps) {
  return (
    <button
      onClick={onTap}
      style={{
        width: "100%",
        background: "none",
        border: "none",
        borderBottom: last
          ? "none"
          : "1px solid rgba(255,255,255,0.044)",
        padding: "15px 18px",
        cursor: onTap ? "pointer" : "default",
        display: "flex",
        justifyContent: "space-between",
        textAlign: "left",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13,
            color: danger
              ? "rgba(215,100,80,0.62)"
              : destructive
              ? "rgba(210,185,155,0.55)"
              : "rgba(220,205,182,0.78)",
          }}
        >
          {label}
        </div>

        {description && (
          <div style={{ fontSize: 11, opacity: 0.5 }}>
            {description}
          </div>
        )}
      </div>

      {value && <span style={{ fontSize: 12 }}>{value}</span>}

      {destructive && !value && (
        <Trash2 size={13} strokeWidth={1.4} opacity={0.5} />
      )}
    </button>
  );
}