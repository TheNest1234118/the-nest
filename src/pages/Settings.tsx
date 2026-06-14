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
          <SectionLabel>Notifications</SectionLabel>
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
            <SettingRow label="Open The Nest Guide" description="Revisit the first-time introduction" onTap={() => navigate("/onboarding")} />
            <SettingRow label="What are Capsules?" description="Voice notes for moments you don’t want to lose" />
            <SettingRow label="What are Thoughts?" description="Short written notes, ideas or reminders" />
            <SettingRow label="What are Reflections?" description="Weekly and monthly looks back at what you left behind" />
            <SettingRow label="What are Anchors?" description="Grounding reminders for overwhelming moments" />
            <SettingRow label="Privacy & AI Reflections" description="Reflections are created from your own saved thoughts and voice notes" last />
          </div>

          {/* DATA */}
          <SectionLabel>Data & Security</SectionLabel>
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
              onTap={() => exportNestData().then(() => flash("Backup downloaded"))}
            />

            <SettingRow label="Clear session history" destructive onTap={() => doConfirm("Clear session history?", clearSessions)} />
            <SettingRow label="Clear thoughts" destructive onTap={() => doConfirm("Clear all thoughts?", clearThoughts)} />
            <SettingRow label="Remove voice capsules" destructive onTap={() => doConfirm("Remove all voice capsules?", clearCapsules)} />
            <SettingRow label="Clear anchors" destructive onTap={() => doConfirm("Clear all anchors?", clearAnchors)} />
            <SettingRow label="Reset atmosphere" destructive onTap={() => doConfirm("Reset atmosphere settings?", clearAtmosphere)} />

            <SettingRow
              label="Clear everything"
              description="All local data except voice preference"
              destructive
              danger
              last
              onTap={() => doConfirm("Clear all data? This cannot be undone.", clearAll)}
            />

            <div style={{ padding: 16, display: "flex", gap: 10 }}>
              <Shield size={14} strokeWidth={1.4} color="rgba(185,158,115,0.30)" />
              <p style={{ fontSize: 12, color: "rgba(175,158,132,0.42)" }}>
                Your data stays on-device unless explicitly exported.
              </p>
            </div>
          </div>
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
          }}
          onClick={() => setConfirm(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#111", padding: 20, borderRadius: 12 }}>
            <p style={{ color: "#fff" }}>{confirm.label}</p>
            <button onClick={() => setConfirm(null)}>Cancel</button>
            <button onClick={runConfirm}>Clear</button>
          </div>
        </motion.div>
      )}

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

/* helpers */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(185,158,115,0.36)", marginBottom: 10 }}>
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
      }}
    >
      <div style={{ fontSize: 13 }}>{label}</div>
      {description && <div style={{ fontSize: 11, opacity: 0.5 }}>{description}</div>}
      {destructive && <Trash2 size={12} />}
    </button>
  );
}