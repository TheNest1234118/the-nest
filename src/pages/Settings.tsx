import React, { useState } from "react";
import { Link } from "wouter";
import OneSignal from "react-onesignal";
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
  const [voiceIntensity, setVoiceIntensity] = useState<VoiceIntensity>(readVoiceIntensity);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [cleared, setCleared] = useState<string | null>(null);

  const cycleVoice = () => {
    const next: VoiceIntensity =
      voiceIntensity === "off" ? "minimal" :
      voiceIntensity === "minimal" ? "guided" : "off";
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
    try { localStorage.removeItem("nest_memos"); } catch (_) {}
    flash("Voice capsules removed");
  };

  const clearAnchors = () => {
    try { localStorage.removeItem("nest_anchors"); } catch (_) {}
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
    try { localStorage.removeItem("nest_thoughts"); } catch (_) {}
    flash("Thoughts cleared");
  };

  const clearAll = () => {
    try {
      const keep = ["nest_voice_intensity"];
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("nest_") && !keep.includes(k)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
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

        {/* Voice section */}
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

        {/* Data section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.6 }}
        >
          <SectionLabel>Data</SectionLabel>
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
  onTap={() => exportNestData().then(() => flash("Backup downloaded"))}
/>
<SettingRow
  label="Test notification"
  description="Sends a test reminder after 10 seconds"
  onTap={async () => {
    if (!("Notification" in window)) {
      flash("Notifications are not supported here");
      return;
    }

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        flash("Notifications not allowed");
        return;
      }
    }

    flash("Test notification in 10 seconds");

    setTimeout(() => {
      new Notification("The Nest", {
        body: "This is a test notification.",
        icon: "/icons/icon-192.png",
      });
    }, 10000);
  }}
/>
<SettingRow
  label="Enable gentle reminders"
  description="Receive occasional reminders from The Nest"
  onTap={async () => {
    await OneSignal.Notifications.requestPermission();
  }}
/><SettingRow
  label="Test push setup"
  description="Check if notifications are connected"
  onTap={async () => {
    const id = await OneSignal.User.PushSubscription.id;

    console.log("Player ID:", id);

    flash(id ? "Connected to OneSignal" : "Not connected");
  }}
/>
            <SettingRow
              label="Clear session history"
              description="Check-ins, last session, state memory"
              destructive
              onTap={() => doConfirm("Clear session history?", clearSessions)}
            />
            <SettingRow
              label="Clear thoughts"
              description="All written thoughts"
              destructive
              onTap={() => doConfirm("Clear all thoughts?", clearThoughts)}
            />
            <SettingRow
              label="Remove voice capsules"
              description="All recorded audio memos"
              destructive
              onTap={() => doConfirm("Remove all voice capsules?", clearCapsules)}
            />
            <SettingRow
              label="Clear anchors"
              description="Your reality anchor list"
              destructive
              onTap={() => doConfirm("Clear all anchors?", clearAnchors)}
            />
            <SettingRow
              label="Reset atmosphere"
              description="Uploaded track reference and preset"
              destructive
              onTap={() => doConfirm("Reset atmosphere settings?", clearAtmosphere)}
            />
            <SettingRow
              label="Clear everything"
              description="All local data except voice preference"
              destructive
              danger
              onTap={() => doConfirm("Clear all data? This cannot be undone.", clearAll)}
              last
            />
          </div>
        </motion.div>

        {/* Privacy section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.6 }}
        >
          <SectionLabel>Privacy</SectionLabel>
          <div
            style={{
              background: "rgba(255,255,255,0.016)",
              border: "1px solid rgba(255,255,255,0.048)",
              borderRadius: 16,
              padding: "16px 18px",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <Shield size={14} strokeWidth={1.4} color="rgba(185,158,115,0.30)" style={{ marginTop: 1, flexShrink: 0 }} />
            <p
              style={{
                fontSize: 12,
                fontWeight: 300,
                color: "rgba(175,158,132,0.42)",
                lineHeight: 1.65,
                letterSpacing: "0.01em",
              }}
            >
            </p>
          </div>
        </motion.div>
      </div>

      {/* Confirmation overlay */}
      {confirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6,5,8,0.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "0 32px",
            backdropFilter: "blur(8px)",
          }}
          onClick={() => setConfirm(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(18,15,12,0.96)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: "28px 24px",
              maxWidth: 320,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: "rgba(225,205,178,0.80)",
                lineHeight: 1.5,
                textAlign: "center",
                letterSpacing: "0.01em",
              }}
            >
              {confirm.label}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirm(null)}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.040)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 11,
                  padding: "12px",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "rgba(185,168,145,0.55)",
                  letterSpacing: "0.08em",
                }}
              >
                Cancel
              </button>
              <button
                onClick={runConfirm}
                style={{
                  flex: 1,
                  background: "rgba(190,80,60,0.12)",
                  border: "1px solid rgba(190,80,60,0.22)",
                  borderRadius: 11,
                  padding: "12px",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "rgba(215,110,90,0.75)",
                  letterSpacing: "0.08em",
                }}
              >
                Clear
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Flash toast */}
      {cleared && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            bottom: 36,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20,17,13,0.94)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 32,
            padding: "10px 20px",
            fontSize: 12,
            color: "rgba(185,162,128,0.60)",
            letterSpacing: "0.06em",
            fontWeight: 300,
            zIndex: 200,
            backdropFilter: "blur(10px)",
            whiteSpace: "nowrap",
          }}
        >
          {cleared}
        </motion.div>
      )}
    </motion.div>
  );
}

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

function SettingRow({ label, description, value, destructive, danger, last, onTap }: SettingRowProps) {
  return (
    <button
      onClick={onTap}
      style={{
        width: "100%",
        background: "none",
        border: "none",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.044)",
        padding: "15px 18px",
        cursor: onTap ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        textAlign: "left",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: danger
              ? "rgba(215,100,80,0.62)"
              : destructive
              ? "rgba(210,185,155,0.55)"
              : "rgba(220,205,182,0.78)",
            letterSpacing: "0.01em",
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: 11,
              color: "rgba(155,140,118,0.36)",
              fontWeight: 300,
              marginTop: 2,
              letterSpacing: "0.01em",
            }}
          >
            {description}
          </div>
        )}
      </div>
      {value && (
        <span
          style={{
            fontSize: 12,
            color: "rgba(205,170,100,0.52)",
            fontWeight: 300,
            letterSpacing: "0.06em",
            flexShrink: 0,
          }}
        >
          {value}
        </span>
      )}
      {destructive && !value && (
        <Trash2 size={13} strokeWidth={1.4} color={danger ? "rgba(215,100,80,0.45)" : "rgba(175,155,128,0.28)"} style={{ flexShrink: 0 }} />
      )}
    </button>
    
  );
}
