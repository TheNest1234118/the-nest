import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { loadMemos, type SupabaseMemo } from "@/lib/memos";
import { motion } from "framer-motion";
import { trackNestEvent, events } from "@/lib/analyticsEvents";
import { loadThoughts, saveThought } from "@/lib/userData";
import { registerVisitForPwaPrompt } from "@/lib/pwa";
import { AuthModal } from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import {
  loadMoodContinuity,
  saveDailyMood,
  type MoodKey,
} from "@/lib/dailyNest";
import {
  BarChart3,
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  CloudRain,
  Crown,
  Download,
  Feather,
  FileText,
  Home,
  Lock,
  Mic,
  Palette,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AudioControls } from "@/components/AudioControls";

type DashboardMoodKey =
  | MoodKey
  | "tired"
  | "frustrated"
  | "foggy"
  | "motivated";

  
const MOODS: { key: DashboardMoodKey; label: string }[] = [
  { key: "calm", label: "🌙 Calm" },
  { key: "good", label: "🌤 Good" },
  { key: "neutral", label: "🌫 Neutral" },
  { key: "tired", label: "🕯 Tired" },
  { key: "overstimulated", label: "⚡ Overstimulated" },
  { key: "anxious", label: "🌧 Anxious" },
  { key: "sad", label: "🖤 Sad" },
  { key: "frustrated", label: "🌑 Frustrated" },
  { key: "foggy", label: "🌫 Foggy" },
  { key: "motivated", label: "✨ Motivated" },
];

const DAILY_CHECKIN_VARIANTS: Record<
  string,
  {
    titles: string[];
    invitations: string[];
  }
> = {
  calm: {
    titles: ["A Quiet Start", "Still Here", "Soft Morning"],
    invitations: [
      "Capture something worth remembering",
      "Write one thought",
      "Notice one real thing around you",
    ],
  },
  good: {
    titles: ["Something Light", "A Good Place", "Keep This Close"],
    invitations: [
      "Capture something worth remembering",
      "Record one voice note",
      "Write one thought",
    ],
  },
  neutral: {
    titles: ["A New Day", "Start Gently", "Nothing Forced"],
    invitations: [
      "Write one thought",
      "Pause for one minute",
      "Leave one thing behind",
    ],
  },
  tired: {
    titles: ["Move Slowly", "Still Enough", "Low Flame"],
    invitations: [
      "Pause for one minute",
      "Leave one thing behind",
      "Record one voice note",
    ],
  },
  overstimulated: {
    titles: ["Less Noise", "Come Back Slowly", "Room To Breathe"],
    invitations: [
      "Pause for one minute",
      "Notice one real thing around you",
      "Leave one thing behind",
    ],
  },
  anxious: {
    titles: ["One Small Place", "Still Here", "A Softer Minute"],
    invitations: [
      "Notice one real thing around you",
      "Write one thought",
      "Pause for one minute",
    ],
  },
  sad: {
    titles: ["Still Here", "A Gentle Place", "No Pressure"],
    invitations: [
      "Leave one thing behind",
      "Record one voice note",
      "Write one thought",
    ],
  },
  frustrated: {
    titles: ["Set It Down", "Without Force", "Let It Land"],
    invitations: [
      "Leave one thing behind",
      "Record one voice note",
      "Write one thought",
    ],
  },
  foggy: {
    titles: ["Through The Fog", "One Clear Thing", "Slow Return"],
    invitations: [
      "Notice one real thing around you",
      "Pause for one minute",
      "Write one thought",
    ],
  },
  motivated: {
    titles: ["Keep The Spark", "Something To Keep", "Clear Energy"],
    invitations: [
      "Capture something worth remembering",
      "Record one voice note",
      "Write one thought",
    ],
  },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Back again";
}

function moodLabel(mood: string | null) {
  return MOODS.find((m) => m.key === mood)?.label.replace(/^.+?\s/, "") ?? mood;
}
function formatMemoTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}
function cleanMoodLabel(mood: string | null) {
  return (moodLabel(mood) || "").toLowerCase();
}

function pickDailyItem(items: string[], mood: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  const seed = `${today}-${mood || "neutral"}`;
  const total = seed
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[total % items.length];
}

function getDailyCheckin(todayMood: string | null, yesterdayMood: string | null) {
  const moodForTone = todayMood || yesterdayMood || "neutral";
  const variants =
    DAILY_CHECKIN_VARIANTS[moodForTone] || DAILY_CHECKIN_VARIANTS.neutral;

  return {
    title: pickDailyItem(variants.titles, moodForTone),
    yesterday: yesterdayMood
      ? `Yesterday you checked in as ${cleanMoodLabel(yesterdayMood)}.`
      : "",
    question: "How does your mind feel right now?",
    invitation: pickDailyItem(variants.invitations, moodForTone),
  };
}

const colors = {
  bg: "rgba(9, 9, 13, 0.94)",
  card: "rgba(255,255,255,0.027)",
  cardStrong: "rgba(205,170,100,0.055)",
  border: "rgba(255,255,255,0.065)",
  goldBorder: "rgba(205,170,100,0.20)",
  gold: "rgba(205,170,100,0.78)",
  goldSoft: "rgba(205,170,100,0.48)",
  text: "rgba(240,232,218,0.90)",
  textSoft: "rgba(198,178,150,0.58)",
  textFaint: "rgba(185,162,128,0.40)",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.17em",
  textTransform: "uppercase",
  color: colors.goldSoft,
  marginBottom: 6,
  fontWeight: 600,
};

const sectionDescription: React.CSSProperties = {
  fontSize: 12,
  color: colors.textSoft,
  lineHeight: 1.5,
  marginBottom: 13,
};

const serif: React.CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontWeight: 400,
};

function CalmModal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(6,5,8,0.86)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "rgba(18,15,12,0.96)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

const modalEyebrow: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(205,170,100,0.42)",
  marginBottom: 10,
};

const modalTitle: React.CSSProperties = {
  ...serif,
  fontSize: 24,
  lineHeight: 1.25,
  color: "rgba(235,215,180,0.92)",
  marginBottom: 14,
};

const modalText: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.65,
  color: "rgba(198,178,150,0.62)",
  marginBottom: 16,
};

const modalButton: React.CSSProperties = {
  width: "100%",
  background: "none",
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  padding: "14px 0",
  color: "rgba(220,205,182,0.68)",
  fontSize: 12,
  letterSpacing: "0.08em",
  cursor: "pointer",
  textAlign: "left",
};


function formatFloatingThoughtDate(value?: string) {
  if (!value) return "Last thought";

  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch (_) {
    return "Last thought";
  }
}

function LastThoughtFlight({
  thought,
  onDone,
}: {
  thought: { text: string; created_at?: string } | null;
  onDone: () => void;
}) {
  if (!thought?.text?.trim()) return null;

  const text =
    thought.text.trim().length > 92
      ? `${thought.text.trim().slice(0, 92)}…`
      : thought.text.trim();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 12000,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ opacity: 0, x: -260, y: -110, rotate: -9, scale: 0.88 }}
        animate={{
          opacity: [0, 1, 1, 0.92, 0],
          x: ["-42vw", "8vw", "24vw", "46vw", "92vw"],
          y: ["-9vh", "14vh", "28vh", "47vh", "78vh"],
          rotate: [-9, -4, 2, 7, 13],
          scale: [0.88, 1, 1.04, 0.98, 0.86],
        }}
        transition={{
          duration: 8.5,
          times: [0, 0.22, 0.55, 0.82, 1],
          ease: [0.22, 1, 0.36, 1],
        }}
        onAnimationComplete={onDone}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "min(330px, 74vw)",
          borderRadius: 24,
          padding: "18px 18px 17px",
          background:
            "linear-gradient(145deg, rgba(31,25,18,0.86), rgba(11,10,13,0.82))",
          border: "1px solid rgba(205,170,100,0.22)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.035), 0 24px 90px rgba(0,0,0,0.55), 0 0 58px rgba(205,145,45,0.20)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          transformOrigin: "50% 50%",
        }}
      >
        <motion.div
          animate={{ opacity: [0.35, 0.9, 0.35], scale: [0.96, 1.08, 0.96] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: 24,
            background:
              "radial-gradient(circle at 50% 0%, rgba(255,220,150,0.18), transparent 62%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "rgba(205,170,100,0.74)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
            <Sparkles size={13} strokeWidth={1.5} /> Last thought
          </div>

          <div
            style={{
              ...serif,
              color: "rgba(245,232,210,0.94)",
              fontSize: 22,
              lineHeight: 1.25,
              letterSpacing: "-0.025em",
              textShadow: "0 8px 28px rgba(0,0,0,0.4)",
            }}
          >
            “{text}”
          </div>

          <div
            style={{
              marginTop: 13,
              color: "rgba(198,178,150,0.52)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {formatFloatingThoughtDate(thought.created_at)}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RainLayer() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {Array.from({ length: 38 }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: "115svh", opacity: [0, 0.22, 0.08, 0] }}
          transition={{
            duration: 4.8 + (i % 7) * 0.5,
            repeat: Infinity,
            delay: (i % 13) * 0.35,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            left: `${(i * 37) % 100}%`,
            top: -80,
            width: 1,
            height: 48 + (i % 5) * 14,
            borderRadius: 999,
            background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.22), transparent)",
            transform: "rotate(12deg)",
          }}
        />
      ))}
    </div>
  );
}

function SectionHeader({ label, description }: { label: string; description?: string }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <p style={sectionLabel}>{label}</p>
      {description && <p style={sectionDescription}>{description}</p>}
    </div>
  );
}

type NestTab = "home" | "history" | "insights" | "profile";

function navColor(active: boolean) {
  return active ? colors.gold : "rgba(215,205,190,0.46)";
}

function BottomNav({
  activeTab,
  setActiveTab,
  onCapture,
}: {
  activeTab: NestTab;
  setActiveTab: (tab: NestTab) => void;
  onCapture: () => void;
}) {
  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    minWidth: 54,
    background: "none",
    border: "none",
    color: navColor(active),
    fontSize: 10,
    cursor: "pointer",
    transition: "color 220ms ease, opacity 220ms ease",
    opacity: active ? 1 : 0.78,
  });

  return (
    <div
    style={{
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
      width: "min(480px, calc(100vw - 24px))",
      padding: "10px 18px calc(env(safe-area-inset-bottom, 0px) + 10px)",
      background:
        "linear-gradient(to top, rgba(10,9,11,0.96), rgba(10,9,11,0.74))",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 24,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 -10px 40px rgba(0,0,0,.45)",
      zIndex: 9999,
      boxSizing: "border-box",
    }}
    >
      <button onClick={() => setActiveTab("home")} style={itemStyle(activeTab === "home")}>
        <Home size={20} strokeWidth={1.55} />
        <span>Home</span>
      </button>

      <button
  data-tour="history"
  onClick={() => setActiveTab("history")}
  style={itemStyle(activeTab === "history")}
>
<Clock3 size={20} strokeWidth={1.45} />
        <span>History</span>
      </button>

      <motion.button
      data-tour="mic"
        whileTap={{ scale: 0.94 }}
        onClick={onCapture}
        aria-label="Capture everything"
        style={{
          width: 66,
          height: 66,
          borderRadius: 999,
          border: "1px solid rgba(205,170,100,0.38)",
          background:
            "radial-gradient(circle at 50% 28%, rgba(245,220,170,0.50), rgba(205,170,100,0.34) 48%, rgba(65,38,12,0.76))",
          boxShadow: "0 0 34px rgba(205,170,100,0.25), inset 0 1px 0 rgba(255,255,255,0.16)",
          color: "rgba(255,238,205,0.96)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginTop: -28,
        }}
      >
        <Plus size={31} strokeWidth={1.55} />
      </motion.button>

      <button
  onClick={() => {

    trackNestEvent(events.opened_insights);

    setActiveTab("insights");

  }}
  style={itemStyle(activeTab === "insights")}
>
        <BarChart3 size={20} strokeWidth={1.45} />
        <span>Insights</span>
      </button>

      <button onClick={() => setActiveTab("profile")} style={itemStyle(activeTab === "profile")}>
        <UserRound size={20} strokeWidth={1.45} />
        <span>Profile</span>
      </button>
    </div>
  );
}

function CaptureSheet({
  open,
  onClose,
  navigate,
}: {
  open: boolean;
  onClose: () => void;
  navigate: (path: string) => void;
}) {
  if (!open) return null;

  const options = [
    { icon: <Mic size={20} strokeWidth={1.45} />, label: "Voice", path: "/memos", available: true },
    { icon: <Feather size={20} strokeWidth={1.45} />, label: "Thought", path: "/thoughts", available: true },
    { icon: <Camera size={20} strokeWidth={1.45} />, label: "Photo", path: "", available: false },
    { icon: <FileText size={20} strokeWidth={1.45} />, label: "Note", path: "", available: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 260,
        background: "rgba(5,4,7,0.62)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "20px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)",
          borderRadius: "30px 30px 0 0",
          borderTop: "1px solid rgba(205,170,100,0.18)",
          background:
            "linear-gradient(160deg, rgba(23,19,14,0.98), rgba(10,9,12,0.98))",
          boxShadow: "0 -28px 90px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ width: 42, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.12)", margin: "0 auto 18px" }} />
        <p style={modalEyebrow}>Capture Everything</p>
        <h2 style={{ ...modalTitle, marginBottom: 18 }}>Capture</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {options.map((option, index) => (
            <motion.button
              key={option.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + index * 0.045 }}
              disabled={!option.available}
              onClick={() => {
                if (!option.available) return;
                onClose();
                navigate(option.path);
              }}
              style={{
                width: "100%",
                minHeight: 62,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.065)",
                background: option.available ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.018)",
                color: option.available ? colors.text : colors.textFaint,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                padding: "0 16px",
                cursor: option.available ? "pointer" : "default",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <span style={{ color: option.available ? colors.gold : colors.textFaint }}>{option.icon}</span>
                <span style={{ fontSize: 15 }}>{option.label}</span>
              </span>
              {!option.available ? (
                <span style={{ fontSize: 10, color: colors.textFaint, letterSpacing: "0.13em", textTransform: "uppercase" }}>Coming Soon</span>
              ) : (
                <ChevronRight size={17} strokeWidth={1.4} color={colors.goldSoft} />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SoftCard({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 18,
        padding: "17px 16px",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
      <p style={sectionLabel}>{eyebrow}</p>
      <h1 style={{ ...serif, color: colors.text, fontSize: 30, lineHeight: 1.12, margin: "0 0 10px" }}>{title}</h1>
      <p style={{ color: colors.textSoft, fontSize: 13, lineHeight: 1.6, maxWidth: 360 }}>{description}</p>
    </motion.section>
  );
}
type HistoryItem = {
  id: string;
  type: "voice" | "thought" | "memory";
  title: string;
  text?: string;
  mood?: string;
  date?: string;
  path: string;
};
function HistoryPage({
  search,
  setSearch,
  filter,
  setFilter,
  navigate,
  items,
}: {
  search: string;
  setSearch: (value: string) => void;
  filter: string;
  setFilter: (value: string) => void;
  navigate: (path: string) => void;
  items: HistoryItem[];
}) {
  const filters = ["Voice", "Thoughts", "Mood", "Date"];
  const query = search.trim().toLowerCase();

const filteredItems = items.filter((item) => {
  const matchesSearch =
    !query ||
    item.title.toLowerCase().includes(query) ||
    item.text?.toLowerCase().includes(query) ||
    item.mood?.toLowerCase().includes(query) ||
    item.date?.toLowerCase().includes(query);

  const matchesFilter =
    !filter ||
    (filter === "Voice" && item.type === "voice") ||
    (filter === "Thoughts" && item.type === "thought") ||
    (filter === "Mood" && item.mood) ||
    (filter === "Date" && item.date);

  return matchesSearch && matchesFilter;
});


  return (
    <>
      <PageIntro eyebrow="Remember" title="Your complete archive." description="Search, filter and return to every voice capsule, thought and memory you have saved." />
      <SoftCard>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Search size={18} strokeWidth={1.45} color={colors.goldSoft} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your Nest..."
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: colors.text, fontSize: 15 }}
          />
        </div>
      </SoftCard>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {filters.map((item) => (
          <button key={item} onClick={() => setFilter(filter === item ? "" : item)} style={{
            border: filter === item ? "1px solid rgba(205,170,100,0.26)" : `1px solid ${colors.border}`,
            background: filter === item ? "rgba(205,170,100,0.09)" : colors.card,
            color: filter === item ? colors.gold : colors.textSoft,
            borderRadius: 999,
            padding: "9px 13px",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}>{item}</button>
        ))}
      </div>
      <div style={{ display: "grid", gap: 11 }}>
  {filteredItems.length > 0 ? (
    filteredItems.map((item) => (
      <SoftCard key={item.id} onClick={() => navigate(item.path)}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 42, height: 42, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", color: colors.gold, background: "rgba(205,170,100,0.07)", border: "1px solid rgba(205,170,100,0.12)" }}>
              {item.type === "voice" ? <Mic size={18} /> : item.type === "thought" ? <Feather size={18} /> : <BookOpen size={18} />}
            </div>

            <div>
              <div style={{ color: colors.text, fontSize: 15, marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ color: colors.textSoft, fontSize: 12 }}>
                {item.type === "voice" ? "Voice" : item.type === "thought" ? "Thought" : "Memory"}
                {item.mood ? ` • ${item.mood}` : ""}
                {item.date ? ` • ${item.date}` : ""}
              </div>
            </div>
          </div>

          <ChevronRight size={18} color={colors.goldSoft} />
        </div>
      </SoftCard>
    ))
  ) : (
    <SoftCard>
      <div style={{ color: colors.textSoft, fontSize: 13 }}>
        No matching items found.
      </div>
    </SoftCard>
  )}
</div>
    </>
  );
}
function InsightsPage({ navigate }: { navigate: (path: string) => void }) {
  const insights = [
    { title: "AI Patterns", path: "/insights/ai-patterns", stars: "", enabled: true },
    { title: "Weekly Reflection", path: "/insights/weekly", stars: "", enabled: true },
    { title: "Topics", path: "/insights/topics", stars: "", enabled: false },
    { title: "Statistics", path: "/insights/statistics", stars: "", enabled: false },
    { title: "Monthly Reflection", path: "/insights/monthly", stars: "", enabled: false },

    { title: "Mood Trends", path: "", stars: "Coming Soon", enabled: false },
    { title: "Heatmap", path: "", stars: "Coming Soon", enabled: false },
    { title: "Word Cloud", path: "", stars: "Coming Soon", enabled: false },
    { title: "Emotional Timeline", path: "", stars: "Coming Soon", enabled: false },
  ];

  return (
    <>
      <PageIntro
        eyebrow="Understand Yourself"
        title="A place for reflection."
        description="Patterns, moods and meaning from everything you have captured."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {insights.map((item) => (
         <SoftCard
         key={item.title}
         onClick={
           item.enabled
             ? () => {
     
                 if (item.title === "AI Patterns") {
                   trackNestEvent(events.opened_ai_patterns);
                 }
     
                 if (item.title === "Weekly Reflection") {
                   trackNestEvent(events.opened_weekly_reflection);
                 }
     
                 navigate(item.path);
     
               }
             : undefined
         }
     >
            <div
              style={{
                minHeight: 82,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                opacity: item.enabled ? 1 : 0.42,
              }}
            >
              <BarChart3 size={18} strokeWidth={1.45} color={colors.goldSoft} />

              <div style={{ color: colors.text, fontSize: 14, lineHeight: 1.35 }}>
                {item.title}
              </div>

              <div
                style={{
                  color: item.enabled ? colors.goldSoft : colors.textFaint,
                  fontSize: item.enabled ? 11 : 10,
                  letterSpacing: item.enabled ? "0" : "0.12em",
                  textTransform: item.enabled ? "none" : "uppercase",
                }}
              >
                {item.stars}
              </div>
            </div>
          </SoftCard>
        ))}
      </div>
    </>
  );
}
function ProfilePage({
  user,
  onLogin,
  onLogout,
  navigate,
}: {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  navigate: (path: string) => void;
}) {
  const rows = [
    {
      label: "Voice Prompts",
      icon: <Mic size={18} />,
      action: () => navigate("/profile/voice-prompts"),
    },
    {
      label: "Account",
      icon: <UserRound size={18} />,
      action: user ? onLogout : onLogin,
      value: user ? "Logout" : "Login",
    },
    {
      label: "Notifications",
      icon: <Bell size={18} />,
      action: () => navigate("/profile/notifications"),
    },
    {
      label: "Atmosphere",
      icon: <CloudRain size={18} />,
      action: () => navigate("/atmosphere"),
    },
    {
      label: "Privacy",
      icon: <Shield size={18} />,
      action: () => navigate("/profile/privacy"),
    },
    {
      label: "Export Data",
      icon: <Download size={18} />,
      action: () => navigate("/profile/data"),
    },
    {
      label: "Premium",
      icon: <Crown size={18} />,
      action: () => navigate("/profile/premium"),
    },
    {
      label: "Help & Guide",
      icon: <BookOpen size={18} />,
      action: () => navigate("/profile/help"),
    },
  ];

  return (
    <>
      <PageIntro
        eyebrow="Profile"
        title="Your account and settings."
        description="Technical controls live here, away from journaling content."
      />

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <SoftCard key={row.label} onClick={row.action}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13, color: colors.text }}>
                <span style={{ color: colors.goldSoft }}>{row.icon}</span>
                <span style={{ fontSize: 15 }}>{row.label}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 9, color: colors.textSoft, fontSize: 12 }}>
                {row.value && <span>{row.value}</span>}
                <ChevronRight size={17} color={colors.goldSoft} />
              </div>
            </div>
          </SoftCard>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, color: colors.textFaint, fontSize: 12, lineHeight: 1.5 }}>
        <Lock size={14} /> No journaling content is shown on this page.
      </div>
    </>
  );
}
const TOUR_STEPS = [
  {
    selector: '[data-tour="mic"]',
    title: "🎤 Voice",
    text: "Whenever something is on your mind, start here.",
  },
  {
    selector: '[data-tour="history"]',
    title: "📚 History",
    text: "Every thought you save will appear here.",
  },
  {
    selector: '[data-tour="reflections"]',
    title: "🧠 Reflections",
    text: "Over time, The Nest finds patterns in your thoughts.",
  },
  {
    selector: '[data-tour="mood"]',
    title: "🙂 Mood",
    text: "Track how your days really felt.",
  },
];

function DashboardTour({
  step,
  onNext,
}: {
  step: number;
  onNext: () => void;
}) {
  const item = TOUR_STEPS[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(5,4,7,0.56)",
          backdropFilter: "blur(3px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{
          position: "absolute",
          left: 22,
          right: 22,
          bottom: step === 0 ? 128 : 108,
          maxWidth: 360,
          margin: "0 auto",
          pointerEvents: "auto",
          borderRadius: 24,
          padding: 20,
          background: "rgba(18,15,12,0.96)",
          border: "1px solid rgba(205,170,100,0.18)",
          boxShadow: "0 24px 90px rgba(0,0,0,0.55)",
          color: colors.text,
        }}
      >
        <div
          style={{
            position: "absolute",
            left:
              step === 0
                ? "50%"
                : step === 1
                ? "28%"
                : step === 2
                ? "72%"
                : "88%",
            bottom: -18,
            transform: "translateX(-50%) rotate(45deg)",
            width: 34,
            height: 34,
            background: "rgba(18,15,12,0.96)",
            borderRight: "1px solid rgba(205,170,100,0.18)",
            borderBottom: "1px solid rgba(205,170,100,0.18)",
          }}
        />

        <p
          style={{
            margin: "0 0 8px",
            color: colors.gold,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 800,
          }}
        >
          Step {step + 1} of 4
        </p>

        <h3
          style={{
            ...serif,
            margin: "0 0 8px",
            fontSize: 25,
            color: "rgba(245,230,205,0.94)",
          }}
        >
          {item.title}
        </h3>

        <p
          style={{
            margin: "0 0 18px",
            color: colors.textSoft,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {item.text}
        </p>

        <button
          onClick={onNext}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 999,
            border: "1px solid rgba(205,170,100,0.28)",
            background:
              "linear-gradient(135deg, rgba(245,205,120,0.95), rgba(205,145,45,0.88))",
            color: "rgba(18,12,5,0.92)",
            fontSize: 13,
            fontWeight: 850,
            cursor: "pointer",
          }}
        >
          {step === 3 ? "You’re ready →" : "Next →"}
        </button>
      </motion.div>
    </motion.div>
  );
}
export function Dashboard() {
  const [, navigate] = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [selectedDailyMood, setSelectedDailyMood] = useState<DashboardMoodKey | null>(null);
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [yesterdayMood, setYesterdayMood] = useState<string | null>(null);
  const [dailyIntention, setDailyIntention] = useState<string | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [quickThought, setQuickThought] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [latestMemo, setLatestMemo] = useState<SupabaseMemo | null>(null);
  const [quickSaved, setQuickSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<NestTab>("home");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [floatingThought, setFloatingThought] = useState<{ text: string; created_at?: string } | null>(null);
  const [showFloatingThought, setShowFloatingThought] = useState(false);
  const historyItems: HistoryItem[] = [
    {
      id: "voice-latest",
      type: "voice",
      title: "Voice Capsules",
      text: "Your saved voice notes",
      path: "/history/voice",
    },
    {
      id: "thoughts",
      type: "thought",
      title: "Thoughts",
      text: "Your saved thoughts",
      path: "/history/thoughts",
    },
    {
      id: "memories",
      type: "memory",
      title: "Memories",
      text: "Moments worth returning to",
      path: "/nest",
    },
  ];
  const dailyCheckin = useMemo(
    () => getDailyCheckin(todayMood, yesterdayMood),
    [todayMood, yesterdayMood]
  );
  const startDashboardTour = () => {
    localStorage.removeItem("nest_start_dashboard_tour");
    setActiveTab("home");
    setTourStep(0);
  };
  
  const finishDashboardTour = () => {
    localStorage.setItem("nest_dashboard_tour_done", "true");
    setTourStep(null);
  };
  const saveQuickThought = async () => {
    const text = quickThought.trim();
    if (!text || quickSaving) return;

    setQuickSaving(true);
    setQuickSaved(false);

    try {
      await saveThought(text);
      setQuickThought("");
      setQuickSaved(true);
      setTimeout(() => setQuickSaved(false), 1800);
    } catch (err) {
      console.error("Could not save quick thought", err);
    } finally {
      setQuickSaving(false);
    }
  };

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
  
    setIsStandalone(standalone);
  }, []);
  useEffect(() => {
    async function init() {
      registerVisitForPwaPrompt();

      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      const memos = await loadMemos();
      setLatestMemo((memos || [])[0] ?? null);

      try {
        const thoughtData = await loadThoughts();
        const latestThought = (thoughtData || [])[0];
        const alreadyPlayed = sessionStorage.getItem("nest_last_thought_flight_seen") === "true";

        if (latestThought?.text && !alreadyPlayed) {
          setFloatingThought({
            text: latestThought.text,
            created_at: latestThought.created_at,
          });
          sessionStorage.setItem("nest_last_thought_flight_seen", "true");
          setTimeout(() => setShowFloatingThought(true), 650);
        }
      } catch (err) {
        console.error("Could not load latest thought for flight", err);
      }
      const hasFirstVoiceMemo =
      localStorage.getItem("nest_first_voice_memo_saved") === "true";
    
    if (
      hasFirstVoiceMemo &&
      localStorage.getItem("nest_welcome_seen") !== "true"
    ) {
      setWelcomeOpen(true);
    }

    
      const shouldShowMoodAfterFirstMemo =
      localStorage.getItem("nest_show_mood_after_first_memo") === "true";
    
    if (
      hasFirstVoiceMemo &&
      shouldShowMoodAfterFirstMemo &&
      localStorage.getItem("nest_daily_checkin_date") !== today
    ) {
      setDailyOpen(true);
    }

      if (localStorage.getItem("nest_guide_completed") !== "true") {
        setTimeout(() => setGuideOpen(true), 450);
      }

      const continuity = await loadMoodContinuity();
      setTodayMood(continuity.todayMood);
      setYesterdayMood(continuity.yesterdayMood);

      const savedIntentionDate = localStorage.getItem("nest_daily_intention_date");
      if (savedIntentionDate === today) {
        setDailyIntention(localStorage.getItem("nest_daily_intention"));
      }
    }

    init();
    const shouldStartTour =
    localStorage.getItem("nest_start_dashboard_tour") === "true" &&
    localStorage.getItem("nest_show_mood_after_first_memo") !== "true" &&
    localStorage.getItem("nest_dashboard_tour_done") !== "true";
  
  if (shouldStartTour) {
    setTimeout(() => startDashboardTour(), 700);
  }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setQuickThought("");
    setQuickSaved(false);
    setTodayMood(null);
    setYesterdayMood(null);
    setDailyIntention(null);
  };
  const openAccountAfterMood = () => {
    localStorage.removeItem("nest_show_mood_after_first_memo");
  
    if (!user) {
      trackNestEvent(events.opened_signup);
      setAuthOpen(true);
      return;
    }
  
    startDashboardTour();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      style={{
        minHeight: "100svh",
        background: colors.bg,
        position: "relative",
        overflow: "hidden",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <RainLayer />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 85% 35% at 50% 0%, rgba(205, 145, 45, 0.075) 0%, transparent 68%), linear-gradient(90deg, rgba(255,255,255,0.025), transparent 15%, transparent 85%, rgba(255,255,255,0.018))",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {showFloatingThought && (
        <LastThoughtFlight
          thought={floatingThought}
          onDone={() => setShowFloatingThought(false)}
        />
      )}

      <div
      
       style={{
         flex: 1,
         padding: "0 20px 0",
         paddingTop: "calc(env(safe-area-inset-top, 0px) + 46px)",
         paddingBottom: "180px",
         overflowY: "auto",
         position: "relative",
         zIndex: 1,
         display: "flex",
         flexDirection: "column",
         gap: 25,
       }}
     >
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.65 }}
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: colors.text,
                letterSpacing: "-0.035em",
                marginBottom: 5,
                lineHeight: 1.08,
              }}
            >
              {getGreeting()}.
            </p>
            <p
              style={{
                fontSize: 13,
                color: colors.textSoft,
                fontWeight: 300,
                lineHeight: 1.5,
                maxWidth: 300,
              }}
            >
              {yesterdayMood && !todayMood
                ? `Yesterday you felt ${moodLabel(yesterdayMood)}. Leave something here today.`
                : "Your Nest is here if you need it."}
            </p>
          </div>

          <button
            onClick={() => setActiveTab("profile")}
            style={{
              background: "rgba(205, 170, 100, 0.045)",
              border: "1px solid rgba(205, 170, 100, 0.12)",
              borderRadius: 999,
              cursor: "pointer",
              color: colors.goldSoft,
              padding: "8px 11px",
              fontSize: 9,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Profile
          </button>
        </motion.header>

        {activeTab === "home" && (
          
          <>
        {!isStandalone && (
  <motion.section
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1, duration: 0.6 }}
  >
    <SoftCard onClick={() => setInstallGuideOpen(true)}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div>
          <div style={{ color: colors.text, fontSize: 15, marginBottom: 5 }}>
            Add The Nest to your Home Screen
          </div>
          <div style={{ color: colors.textSoft, fontSize: 12, lineHeight: 1.5 }}>
            Install the app on iPhone, Android or Windows.
          </div>
        </div>

        <ChevronRight size={18} color={colors.goldSoft} />
      </div>
    </SoftCard>
  </motion.section>
)}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13, duration: 0.7 }}
          style={{
            background:
              "linear-gradient(145deg, rgba(205,170,100,0.095), rgba(255,255,255,0.024))",
            border: `1px solid ${colors.goldBorder}`,
            borderRadius: 18,
            padding: "20px 18px",
            boxShadow: "0 18px 70px rgba(0,0,0,0.18)",
          }}
        >
          <div
            style={{
              fontSize: 21,
              color: "rgba(245,222,184,0.92)",
              marginBottom: 16,
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            What’s on your mind?
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
            <textarea
              autoFocus
              value={quickThought}
              onChange={(e) => setQuickThought(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Begin" && !e.shiftKey) {
                  e.preventDefault();
                  saveQuickThought();
                }
              }}
              placeholder="Start typing..."
              rows={quickThought.length > 70 ? 3 : 1}
              style={{
                flex: 1,
                resize: "none",
                background: "transparent",
                border: "none",
                padding: 0,
                color: colors.text,
                fontSize: 16,
                lineHeight: 1.55,
                outline: "none",
                fontFamily: "inherit",
                minHeight: 44,
              }}
            />

            <button
              onClick={saveQuickThought}
              disabled={!quickThought.trim() || quickSaving}
              aria-label="Save thought"
              style={{
                width: 56,
                height: 56,
                flex: "0 0 auto",
                borderRadius: 999,
                border: "1px solid rgba(205,170,100,0.16)",
                background:
                  "radial-gradient(circle at 50% 35%, rgba(205,170,100,0.22), rgba(90,55,18,0.38))",
                color: "rgba(255,235,195,0.86)",
                cursor: !quickThought.trim() || quickSaving ? "default" : "pointer",
                opacity: !quickThought.trim() || quickSaving ? 0.45 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {quickSaving ? <Check size={20} /> : <Send size={21} strokeWidth={1.7} />}
            </button>
          </div>

          {quickSaved && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 10,
                fontSize: 11,
                color: colors.goldSoft,
              }}
            >
              Saved to Thoughts.
            </motion.div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.65 }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <Link href="/memos">
            <div
              style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 16,
                minHeight: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                cursor: "pointer",
                color: colors.gold,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              <Mic size={20} strokeWidth={1.55} />
              Record voice
            </div>
          </Link>

          <Link href="/thoughts">
            <div
              style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 16,
                minHeight: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                cursor: "pointer",
                color: colors.gold,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              <Feather size={20} strokeWidth={1.55} />
              Write thought
            </div>
          </Link>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.23, duration: 0.65 }}
        >
         <SectionHeader
  label="Last voice capsule"
  description={user ? "Continue your latest recording" : "Sign in to continue your recordings"}
/>

{user && latestMemo ? (
  <Link href="/memos">
            <div
              style={{
                background: "rgba(255,255,255,0.030)",
                border: `1px solid ${colors.border}`,
                borderRadius: 18,
                padding: "18px 18px",
                minHeight: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    background: "rgba(205,170,100,0.075)",
                    color: colors.gold,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(205,170,100,0.10)",
                  }}
                >
                  <Mic size={20} strokeWidth={1.5} />
                </div>
                <div>
  <div style={{ color: colors.text, fontSize: 15, marginBottom: 4 }}>
    {latestMemo?.title || "Voice capsule"}
  </div>

  <div style={{ color: colors.textSoft, fontSize: 12 }}>
    {latestMemo ? formatMemoTime(latestMemo.duration) : ""}
  </div>
</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                <span style={{ color: colors.textSoft, fontSize: 12 }}>Today</span>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    background: "rgba(205,170,100,0.08)",
                    color: colors.gold,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(205,170,100,0.12)",
                  }}
                >
                  <Play size={18} fill="rgba(205,170,100,0.65)" strokeWidth={1.2} />
                </div>
              </div>
            </div>
          </Link>
          ) : (
            <div
              style={{
                background: "rgba(255,255,255,0.030)",
                border: `1px solid ${colors.border}`,
                borderRadius: 18,
                padding: "18px 18px",
                minHeight: 72,
                display: "flex",
                alignItems: "center",
                color: colors.textSoft,
                fontSize: 13,
              }}
            >
              No voice capsule loaded.
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.65 }}
        >
          <SectionHeader label="Memory from the past" description="A moment worth remembering." />
          <Link href="/nest">
            <div
              style={{
                position: "relative",
                minHeight: 150,
                overflow: "hidden",
                borderRadius: 18,
                padding: "20px 18px",
                border: "1px solid rgba(205,170,100,0.14)",
                background:
                  "linear-gradient(135deg, rgba(205,170,100,0.075), rgba(255,255,255,0.020))",
                cursor: "pointer",
              }}
            >
              <motion.div
                animate={{ opacity: [0.52, 0.82, 0.52], scale: [0.98, 1.04, 0.98] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  right: 22,
                  bottom: 14,
                  width: 150,
                  height: 92,
                  background:
                    "radial-gradient(ellipse at center, rgba(210,155,60,0.40), rgba(210,155,60,0.10) 42%, transparent 72%)",
                  filter: "blur(2px)",
                  borderRadius: "50%",
                }}
              />
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  right: 72,
                  bottom: 43,
                  width: 38,
                  height: 48,
                  borderRadius: "50% 50% 45% 45%",
                  background:
                    "radial-gradient(circle at 40% 25%, rgba(255,235,185,0.95), rgba(205,145,45,0.75) 55%, rgba(95,55,15,0.25) 85%)",
                  boxShadow: "0 0 35px rgba(205,145,45,0.30)",
                }}
              />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: colors.textSoft, fontSize: 12, marginBottom: 16 }}>
                  <Clock3 size={14} strokeWidth={1.4} />
                  8 days ago
                </div>
                <div style={{ color: colors.text, fontSize: 18, lineHeight: 1.4, marginBottom: 20 }}>
                  “My head is loud again.”
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid rgba(205,170,100,0.18)",
                    borderRadius: 999,
                    padding: "10px 14px",
                    color: colors.gold,
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  View then <ChevronRight size={14} strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </Link>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.33, duration: 0.65 }}
        >
          <SectionHeader label="Ask your past" description="Ask anything. Your past knows." />
          <Link href="/ask-past">
            <div
              style={{
                background: "rgba(255,255,255,0.030)",
                border: `1px solid ${colors.border}`,
                borderRadius: 16,
                minHeight: 64,
                padding: "0 15px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                <Sparkles size={20} strokeWidth={1.45} color={colors.gold} />
                <span
                  style={{
                    color: "rgba(220,210,195,0.68)",
                    fontSize: 15,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  When did I first mention this idea?
                </span>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  background: "rgba(205,170,100,0.08)",
                  color: colors.gold,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(205,170,100,0.12)",
                  flex: "0 0 auto",
                }}
              >
                <ChevronRight size={18} strokeWidth={1.5} />
              </div>
            </div>
          </Link>
        </motion.section>

        <div style={{ paddingTop: 4, paddingBottom: 4 }}>
          <AudioControls minimal />
        </div>

          </>
        )}

        {activeTab === "history" && (
    <HistoryPage
    search={historySearch}
    setSearch={setHistorySearch}
    filter={historyFilter}
    setFilter={setHistoryFilter}
    navigate={navigate}
    items={historyItems}
  />
        )}

        {activeTab === "insights" && <InsightsPage navigate={navigate} />}

        {activeTab === "profile" && (
          <ProfilePage
            user={user}
            onLogin={() =>  setAuthOpen(true)}
            onLogout={handleLogout}
            navigate={navigate}
          />
        )}

        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onCapture={() => setCaptureOpen(true)}
        />
      </div>
      {tourStep !== null && (
  <DashboardTour
    step={tourStep}
    onNext={() => {
      if (tourStep >= 3) {
        finishDashboardTour();
      } else {
        setTourStep((s) => (s === null ? null : s + 1));
      }
    }}
  />
)}
      <CaptureSheet
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        navigate={navigate}
      />

      {welcomeOpen && (
        <CalmModal>
          <p style={modalEyebrow}>Welcome</p>
          <h2 style={modalTitle}>This is your place to slow down.</h2>
          <p style={modalText}>
            You can use The Nest without an account.
            <br />
            <br />
            Creating a free account lets your Nest remember your thoughts,
            voice capsules, anchors and reflections across devices.
          </p>
          <button
         onClick={() => {
          localStorage.setItem("nest_welcome_seen", "true");
          localStorage.setItem("nest_continue_without_account", "true");
        
          setWelcomeOpen(false);
          setAuthOpen(false);
        
          setTimeout(() => startDashboardTour(), 300);
        }}
            style={modalButton}
          >
            Continue without account
          </button>
          <button
            onClick={() => {
              localStorage.setItem("nest_welcome_seen", "true");
              setWelcomeOpen(false);
              trackNestEvent(events.opened_signup);

              setAuthOpen(true);
            }}
            style={{ ...modalButton, color: "rgba(205,170,100,0.76)" }}
          >
            Create free account
          </button>
        </CalmModal>
      )}

{dailyOpen && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 300,
      background:
        "radial-gradient(circle at 50% 18%, rgba(205,170,100,0.16), transparent 30%), rgba(5,4,7,0.88)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: "100%",
        maxWidth: 390,
        position: "relative",
        overflow: "hidden",
        borderRadius: 32,
        padding: "26px 22px 22px",
        background:
          "linear-gradient(165deg, rgba(25,20,14,0.98), rgba(10,9,13,0.98))",
        border: "1px solid rgba(205,170,100,0.18)",
        boxShadow:
          "0 28px 100px rgba(0,0,0,0.58), 0 0 70px rgba(205,145,45,0.13), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <motion.div
        aria-hidden
        animate={{ opacity: [0.32, 0.62, 0.32], scale: [0.92, 1.08, 0.92] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: -86,
          left: "50%",
          transform: "translateX(-50%)",
          width: 230,
          height: 230,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,210,135,0.28), rgba(205,145,45,0.08) 42%, transparent 72%)",
          filter: "blur(4px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            width: 84,
            height: 84,
            margin: "0 auto 18px",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "46% 54% 56% 44% / 50% 44% 56% 50%",
              border: "1px solid rgba(205,170,100,0.20)",
              boxShadow: "0 0 34px rgba(205,170,100,0.12)",
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.82, 1, 0.82] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 26%, rgba(255,235,185,0.96), rgba(205,170,100,0.70) 52%, rgba(78,45,14,0.42) 100%)",
              boxShadow:
                "0 0 38px rgba(205,170,100,0.28), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          />
        </div>

        <p
          style={{
            margin: "0 0 9px",
            textAlign: "center",
            color: "rgba(205,170,100,0.52)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {dailyCheckin.title}
        </p>

        <h2
          style={{
            ...serif,
            margin: "0 auto 10px",
            maxWidth: 300,
            color: "rgba(245,230,205,0.94)",
            fontSize: 30,
            lineHeight: 1.12,
            textAlign: "center",
            letterSpacing: "-0.035em",
          }}
        >
          How are you feeling today?
        </h2>

        <p
          style={{
            margin: "0 auto 20px",
            maxWidth: 300,
            color: "rgba(198,178,150,0.60)",
            fontSize: 13,
            lineHeight: 1.55,
            textAlign: "center",
          }}
        >
          {dailyCheckin.yesterday || "A quick check-in helps your reflections understand the shape of your day."}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 9,
            marginBottom: 16,
          }}
        >
          {MOODS.map((mood) => {
            const selected = selectedDailyMood === mood.key;

            return (
              <motion.button
                key={mood.key}
                type="button"
                onClick={() => setSelectedDailyMood(mood.key)}
                whileTap={{ scale: 0.97 }}
                animate={
                  selected
                    ? {
                        scale: [1, 1.025, 1],
                        boxShadow: [
                          "0 0 0 rgba(205,170,100,0)",
                          "0 0 30px rgba(205,170,100,0.16)",
                          "0 0 0 rgba(205,170,100,0)",
                        ],
                      }
                    : {}
                }
                transition={{ duration: 1.8, repeat: selected ? Infinity : 0 }}
                style={{
                  minHeight: 54,
                  borderRadius: 18,
                  padding: "12px 10px",
                  cursor: "pointer",
                  border: selected
                    ? "1px solid rgba(205,170,100,0.36)"
                    : "1px solid rgba(255,255,255,0.065)",
                  background: selected
                    ? "linear-gradient(145deg, rgba(205,170,100,0.16), rgba(255,255,255,0.045))"
                    : "rgba(255,255,255,0.032)",
                  color: selected
                    ? "rgba(245,225,195,0.94)"
                    : "rgba(225,210,188,0.70)",
                  fontSize: 13,
                  fontWeight: selected ? 700 : 500,
                  textAlign: "center",
                }}
              >
                {mood.label}
              </motion.button>
            );
          })}
        </div>

        {selectedDailyMood && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginBottom: 14,
              borderRadius: 18,
              padding: "13px 14px",
              background: "rgba(205,170,100,0.06)",
              border: "1px solid rgba(205,170,100,0.12)",
              color: "rgba(215,195,165,0.72)",
              fontSize: 12,
              lineHeight: 1.55,
              textAlign: "center",
            }}
          >
            {dailyCheckin.invitation}
          </motion.div>
        )}

        <motion.button
          type="button"
          disabled={!selectedDailyMood}
          onClick={async () => {
            if (!selectedDailyMood) return;
            await saveDailyMood(selectedDailyMood as MoodKey);

            const today = new Date().toISOString().slice(0, 10);

            if (user?.id) {
              await supabase.from("nest_daily_activity").upsert({
                user_id: user.id,
                activity_date: today,
              });
            }

            setTodayMood(selectedDailyMood);
            localStorage.setItem("nest_daily_checkin_date", today);
            localStorage.removeItem("nest_show_mood_after_first_memo");
            setSelectedDailyMood(null);
            setDailyOpen(false);
            openAccountAfterMood();
          }}
          whileTap={selectedDailyMood ? { scale: 0.98 } : undefined}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 999,
            border: selectedDailyMood
              ? "1px solid rgba(205,170,100,0.34)"
              : "1px solid rgba(255,255,255,0.055)",
            background: selectedDailyMood
              ? "linear-gradient(135deg, rgba(245,205,120,0.95), rgba(205,145,45,0.88))"
              : "rgba(255,255,255,0.030)",
            color: selectedDailyMood ? "rgba(18,12,5,0.92)" : "rgba(175,158,132,0.34)",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            cursor: selectedDailyMood ? "pointer" : "default",
            boxShadow: selectedDailyMood
              ? "0 18px 52px rgba(205,145,45,0.22)"
              : "none",
          }}
        >
          Continue to My Nest →
        </motion.button>

        <button
          type="button"
          onClick={() => {
            localStorage.setItem(
              "nest_daily_checkin_date",
              new Date().toISOString().slice(0, 10)
            );
          
            localStorage.removeItem("nest_show_mood_after_first_memo");
          
            setDailyOpen(false);
            openAccountAfterMood();
          }}
          style={{
            width: "100%",
            marginTop: 12,
            background: "none",
            border: "none",
            color: "rgba(175,158,132,0.42)",
            fontSize: 12,
            cursor: "pointer",
            padding: "10px 0 0",
          }}
        >
          Skip for now
        </button>

        <p
          style={{
            margin: "14px 0 0",
            color: "rgba(185,162,128,0.32)",
            fontSize: 11,
            lineHeight: 1.45,
            textAlign: "center",
          }}
        >
          Your check-in only helps your own reflections feel more personal.
        </p>
      </div>
    </motion.div>
  </motion.div>
)}


    
{installGuideOpen && (
  <CalmModal>
    <p style={modalEyebrow}>Install The Nest</p>
    <h2 style={modalTitle}>Add it to your Home Screen.</h2>

    <p style={modalText}>
      <strong>iPhone</strong>
      <br />
      Open The Nest in Safari → tap Share → Add to Home Screen.
      <br />
      <br />
      <strong>Android</strong>
      <br />
      Open The Nest in Chrome → tap ⋮ → Add to Home screen or Install app.
      <br />
      <br />
      <strong>Windows</strong>
      <br />
      Open The Nest in Edge or Chrome → tap install icon in the address bar → Install.
    </p>

    <button
      onClick={() => setInstallGuideOpen(false)}
      style={{ ...modalButton, color: "rgba(205,170,100,0.76)" }}
    >
      Done
    </button>
  </CalmModal>
)}

<AuthModal
  open={authOpen}
  onClose={() => {
    setAuthOpen(false);

    if (
      localStorage.getItem("nest_show_mood_after_first_memo") !== "true" &&
      localStorage.getItem("nest_dashboard_tour_done") !== "true"
    ) {
      setTimeout(() => startDashboardTour(), 300);
    }
  }}
  onSuccess={() => {
    trackNestEvent(events.created_account);
    setAuthOpen(false);

    setTimeout(() => startDashboardTour(), 300);
  }}
/>
    </motion.div>
  );
}
