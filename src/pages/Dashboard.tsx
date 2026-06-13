import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { registerVisitForPwaPrompt } from "@/lib/pwa";
import { AuthModal } from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import {
  loadMoodContinuity,
  saveDailyMood,
  saveDailyIntention,
  completeDailyIntention,
  type MoodKey,
} from "@/lib/dailyNest";
import {
  Feather,
  Mic,
  CircleDot,
  Anchor,
  Sparkles,
  BookOpen,
  Settings,
  ChevronRight,
  ArrowRight,
  Music2,
} from "lucide-react";
import { AudioControls } from "@/components/AudioControls";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface AnchorItem {
  id: string;
  type: "text" | "image";
  content: string;
  createdAt: number;
}

interface LastResetSession {
  key: string;
  label: string;
  completedAt: number;
}

const SESSION_NAMES: Record<string, string> = {
  overstimulated: "Reduce the Noise",
  disconnected:   "Come Back to the Room",
  looping:        "Break the Loop",
  slow_down:      "Slow the Mind",
  numb:           "Warmth Without Pressure",
  scrolling:      "After Scrolling",
  quiet:          "Quiet Mode",
  grounding:      "Grounding",
};

const STATE_NOTES: Record<string, string> = {
  overstimulated: "Your mind still feels online.",
  disconnected:   "You've been in the feed. You're back now.",
  looping:        "Same thoughts, same loop. Time to break it.",
  slow_down:      "Brain still running at internet speed.",
  
  numb:           "Scrolled past feeling. That's okay.",
  scrolling:      "Come down from the noise.",
  quiet:          "No more input needed.",
  grounding:      "Nothing feels real right now. Let's fix that.",
};

const SESSION_NOTES: Record<string, string> = {
  overstimulated: "Less input. Room to decompress.",
  disconnected:   "A quiet path back to the present.",
  looping:        "Break the cycle. Come back to the room.",
  slow_down:      "Longer silences. Internet speed, unwound.",
  numb:           "Warmth without pressure.",
  scrolling:      "A landing place after the feed.",
  quiet:          "Near silence. Nothing more coming in.",
  grounding:      "Back to your body. Back to the room.",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Back again";
}

const TOOLS = [
  { href: "/thoughts", icon: Feather, label: "Thoughts", desc: "Put it down. Leave it here." },
  { href: "/memos", icon: Mic, label: "Capsules", desc: "Voice note before you forget" },

  // 🔒 LOCKED
  {
    href: "#",
    icon: BookOpen,
    label: "Reflections",
    desc: "Coming soon",
    locked: true,
  },

  {
    href: "#",
    icon: Sparkles,
    label: "Rituals",
    desc: "Coming soon",
    locked: true,
  },
  {
  href: "#",
  icon: CircleDot,
  label: "Reality Reset",
  desc: "Coming soon",
  locked: true,
},
  { href: "/anchors", icon: Anchor, label: "Anchors", desc: "Real things. This room. Right now." },
];
function formatRelativeTime(time: number) {
  const diff = Date.now() - time;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
const MOODS: { key: MoodKey; label: string }[] = [
  { key: "calm", label: "🌙 Calm" },
  { key: "good", label: "🌤 Good" },
  { key: "neutral", label: "🌫 Neutral" },
  { key: "overstimulated", label: "⚡ Overstimulated" },
  { key: "anxious", label: "🌧 Anxious" },
  { key: "sad", label: "🖤 Sad" },
];

const INTENTIONS = [
  "Save one thought",
  "Record one voice note",
  "Take a quiet moment",
  "Reflect on something meaningful",
  "Do a Reality Reset",
];

function moodLabel(mood: string | null) {
  return MOODS.find((m) => m.key === mood)?.label.replace(/^.+?\s/, "") ?? mood;
}
const quietSmallButton: React.CSSProperties = {
  marginTop: 12,
  background: "none",
  border: "none",
  borderBottom: "1px solid rgba(205,170,100,0.22)",
  color: "rgba(205,170,100,0.62)",
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  padding: "8px 0",
  cursor: "pointer",
};
export function Dashboard() {
  const [, navigate] = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [streak, setStreak] = useState(0);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [yesterdayMood, setYesterdayMood] = useState<string | null>(null);
  const [dailyIntention, setDailyIntention] = useState<string | null>(null);
  const [intentionDone, setIntentionDone] = useState(false);
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
    fontFamily: "Georgia, serif",
    fontSize: 24,
    fontWeight: 400,
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
useEffect(() => {
  async function init() {
    registerVisitForPwaPrompt();
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);

    if (localStorage.getItem("nest_welcome_seen") !== "true") {
      setWelcomeOpen(true);
    }

    if (localStorage.getItem("nest_daily_checkin_date") !== today) {
      setDailyOpen(true);
    }

    const continuity = await loadMoodContinuity();
    setTodayMood(continuity.todayMood);
    setYesterdayMood(continuity.yesterdayMood);

    const savedIntentionDate = localStorage.getItem("nest_daily_intention_date");
    if (savedIntentionDate === today) {
      setDailyIntention(localStorage.getItem("nest_daily_intention"));
    }

    setIntentionDone(
      localStorage.getItem("nest_daily_intention_completed") === today
    );

    if (data.user) {
      const { data: activity } = await supabase
        .from("nest_daily_activity")
        .select("activity_date")
        .eq("user_id", data.user.id);

      const dates = new Set((activity ?? []).map((d) => d.activity_date));
      let current = 0;
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);

      while (dates.has(cursor.toISOString().slice(0, 10))) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
      }

      setStreak(current);
    }
  }

  init();

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
};
const state = localStorage.getItem("nest_state") || null;
const dashboardMode = localStorage.getItem("nest_dashboard_mode") || null;

const visibleTools = TOOLS;

const stateNote = state ? STATE_NOTES[state] ?? null : null;
const sessionName = state ? SESSION_NAMES[state] ?? null : null;
const sessionNote = state ? SESSION_NOTES[state] ?? null : null;

const lastResetSession = useMemo<LastResetSession | null>(() => {
  try {
    const raw = localStorage.getItem("nest_last_reset_session");
    if (!raw) return null;
    return JSON.parse(raw) as LastResetSession;
  } catch {
    return null;
  }
}, []);

const showSession = !!sessionName;

  const [anchors] = useLocalStorage<AnchorItem[]>("nest_anchors", []);
  const previewAnchors = useMemo(() => anchors.slice(0, 3), [anchors]);

  const handleStartSession = (key: string | null) => {
    if (!key) return;
    try { localStorage.setItem("nest_reset_state", key); } catch (_) {}
    navigate("/reset");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      style={{
        minHeight: "100svh",
        background: "rgba(9, 9, 13, 0.88)",
        position: "relative",
        overflow: "hidden",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 35% at 50% 10%, rgba(185, 120, 35, 0.05) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          flex: 1,
          padding: "0 20px 32px",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 52px)",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10, duration: 0.7 }}
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}
        >
          <div>
            <p
              style={{
                fontSize: 22,
                fontWeight: 300,
                color: "rgba(235, 220, 198, 0.88)",
                letterSpacing: "0.01em",
                marginBottom: stateNote ? 5 : 0,
                lineHeight: 1.2,
              }}
            >
              {getGreeting()}.
            </p>
            <p
  style={{
    fontSize: 13,
    color: "rgba(185, 162, 128, 0.50)",
    fontWeight: 300,
    lineHeight: 1.5,
    maxWidth: 280,
    letterSpacing: "0.01em",
  }}
>
  {yesterdayMood && !todayMood
    ? `Yesterday you felt ${moodLabel(yesterdayMood)}. How are you today?`
    : stateNote || "Your Nest is here if you need it."}
</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
  <button
    onClick={user ? handleLogout : () => setAuthOpen(true)}
    style={{
      background: "rgba(205, 170, 100, 0.045)",
      border: "1px solid rgba(205, 170, 100, 0.12)",
      borderRadius: 999,
      cursor: "pointer",
      color: user ? "rgba(185, 162, 128, 0.45)" : "rgba(205, 170, 100, 0.62)",
      padding: "7px 10px",
      fontSize: 9,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
    }}
  >
    {user ? "Logout" : "Login"}
  </button>

  <button
    onClick={() => navigate("/settings")}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "rgba(185, 162, 128, 0.32)",
      padding: 4,
      marginTop: 3,
    }}
  >
    <Settings size={17} strokeWidth={1.4} />
  </button>
</div>
        </motion.div>

        {/* ── Enter the Nest card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.8 }}
        >
          <Link href="/nest">
            <div
              style={{
                borderRadius: 22,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
                minHeight: 180,
                background:
                  "linear-gradient(165deg, #141009 0%, #191108 55%, #110d06 100%)",
                border: "1px solid rgba(200, 155, 60, 0.10)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "20px 22px",
              }}
            >
              <motion.div
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(ellipse 70% 55% at 50% 100%, rgba(195, 130, 38, 0.22) 0%, rgba(150, 90, 25, 0.06) 55%, transparent 75%)",
                  pointerEvents: "none",
                }}
              />
             
              <motion.div
                animate={{ opacity: [0.55, 0.75, 0.55] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                style={{
                  position: "absolute",
                  top: "35%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 56,
                  height: 64,
                  borderRadius: "45% 45% 50% 50%",
                  background:
                    "radial-gradient(ellipse at 50% 65%, rgba(195, 130, 38, 0.32) 0%, rgba(140, 85, 20, 0.08) 60%, transparent 80%)",
                }}
              />
              <div style={{ position: "relative", zIndex: 2 }}>
                <p
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(200, 165, 95, 0.50)",
                    marginBottom: 7,
                    fontWeight: 500,
                  }}
                >
                  Nest mode
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: 24,
                        fontWeight: 400,
                        color: "rgba(235, 215, 180, 0.90)",
                        letterSpacing: "0.03em",
                        lineHeight: 1.15,
                        marginBottom: 4,
                      }}
                    >
                      The Nest
                    </h2>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(185, 158, 115, 0.45)",
                        fontWeight: 300,
                        letterSpacing: "0.02em",
                      }}
                    >
                      A place to land after the noise
                    </p>
                  </div>
                  <ChevronRight
                    size={17}
                    color="rgba(200, 165, 95, 0.38)"
                    strokeWidth={1.3}
                    style={{ marginBottom: 2 }}
                  />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
        <motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.18, duration: 0.7 }}
  style={{
    background: "rgba(255,255,255,0.022)",
    border: "1px solid rgba(255,255,255,0.055)",
    borderRadius: 16,
    padding: "16px 18px",
  }}
>
  <p style={{
    fontSize: 10,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "rgba(205,170,100,0.40)",
    marginBottom: 8,
  }}>
    Today
  </p>

  {dailyIntention ? (
    <>
      <p style={{
        fontSize: 13,
        color: "rgba(220,205,182,0.72)",
        lineHeight: 1.6,
      }}>
        {intentionDone ? "Done gently." : dailyIntention}
      </p>

      {!intentionDone && (
        <button
          onClick={async () => {
            await completeDailyIntention();
            setIntentionDone(true);
          }}
          style={quietSmallButton}
        >
          Complete gently
        </button>
      )}
    </>
  ) : (
    <>
      <p style={{
        fontSize: 13,
        color: "rgba(220,205,182,0.62)",
        lineHeight: 1.6,
      }}>
        You don’t have to do anything. But you can choose one quiet intention.
      </p>

      <button onClick={() => setDailyOpen(true)} style={quietSmallButton}>
        Set intention
      </button>
    </>
  )}
</motion.div>
  {/*  {lastResetSession && (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.20, duration: 0.7 }}
  >
    <p
      style={{
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "rgba(185, 158, 115, 0.36)",
        marginBottom: 10,
        fontWeight: 500,
      }}
    >
      Continue where you left off
    </p>

    <button
      onClick={() => handleStartSession(lastResetSession.key)}
      style={{
        width: "100%",
        background: "rgba(205, 170, 100, 0.05)",
        border: "1px solid rgba(205, 170, 100, 0.12)",
        borderRadius: 16,
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: "rgba(225, 200, 155, 0.88)",
            letterSpacing: "0.01em",
            marginBottom: 5,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          Last session:
        </div>

        <div
          style={{
            fontSize: 13,
            color: "rgba(220, 205, 182, 0.72)",
            fontWeight: 300,
            lineHeight: 1.45,
          }}
        >
          “{lastResetSession.label}”
        </div>

        <div
          style={{
            fontSize: 11,
            color: "rgba(175, 152, 112, 0.42)",
            fontWeight: 300,
            marginTop: 6,
            letterSpacing: "0.01em",
          }}
        >
          {formatRelativeTime(lastResetSession.completedAt)}
        </div>
      </div>

      <ArrowRight
        size={15}
        color="rgba(205, 170, 100, 0.40)"
        strokeWidth={1.5}
      />
    </button>
  </motion.div>
)}
*/}
{showSession && (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.24, duration: 0.7 }}
  >
    <p
      style={{
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "rgba(185, 158, 115, 0.36)",
        marginBottom: 10,
        fontWeight: 500,
      }}
    >
      For right now
    </p>

    <button
      onClick={() => handleStartSession(state)}
      style={{
        width: "100%",
        background: "rgba(255, 255, 255, 0.024)",
        border: "1px solid rgba(255, 255, 255, 0.058)",
        borderRadius: 16,
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: "rgba(225, 200, 155, 0.80)",
            letterSpacing: "0.01em",
            marginBottom: 5,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          {sessionName}
        </div>

        <div
          style={{
            fontSize: 12,
            color: "rgba(175, 152, 112, 0.45)",
            fontWeight: 300,
            letterSpacing: "0.01em",
          }}
        >
          {sessionNote}
        </div>
      </div>

      <ArrowRight
        size={15}
        color="rgba(205, 170, 100, 0.32)"
        strokeWidth={1.5}
      />
    </button>
  </motion.div>
)}
        <motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.19, duration: 0.7 }}
  style={{
    background: "rgba(255,255,255,0.022)",
    border: "1px solid rgba(255,255,255,0.055)",
    borderRadius: 16,
    padding: "15px 18px",
  }}
>
  <p style={{
    fontSize: 10,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "rgba(205,170,100,0.40)",
    marginBottom: 6,
  }}>
    Consistency
  </p>
  <p style={{
    fontSize: 13,
    color: "rgba(220,205,182,0.68)",
    lineHeight: 1.6,
  }}>
    🔥 You have returned for {streak} {streak === 1 ? "day" : "days"}.
  </p>
</motion.div>

        {/* ── Atmosphere card ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.7 }}
        >
          <Link href="/atmosphere">
            <div
              style={{
                background: "rgba(255, 255, 255, 0.020)",
                border: "1px solid rgba(255, 255, 255, 0.058)",
                borderRadius: 16,
                padding: "16px 18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <Music2
                  size={15}
                  strokeWidth={1.4}
                  color="rgba(205, 170, 100, 0.55)"
                />
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: "rgba(225, 210, 188, 0.78)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Atmosphere
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(175, 158, 132, 0.34)",
                      fontWeight: 300,
                      marginTop: 2,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {(() => {
                      try {
                        const p = localStorage.getItem("nest_atmo_preset");
                        const f = localStorage.getItem("nest_atmo_file");
                        if (f && p) {
                          const labels: Record<string, string> = {
                            deep_night: "Deep Night", quiet_rain: "Quiet Rain", foggy: "Foggy",
                            warm_room: "Warm Room", midnight_train: "Midnight Train",
                            heavy_mind: "Heavy Mind", soft_distance: "Soft Distance",
                            ocean_drift: "Ocean Drift",
                          };
                          return `${f} — ${labels[p] ?? p}`;
                        }
                        if (f) return f;
                      } catch (_) {}
                      return "Shape the sound around you";
                    })()}
                  </div>
                </div>
              </div>
              <ChevronRight
                size={15}
                strokeWidth={1.3}
                color="rgba(200, 165, 95, 0.28)"
              />
            </div>
          </Link>
        </motion.div>

        {/* ── Quick tools grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.7 }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(185, 158, 115, 0.36)",
              marginBottom: 12,
              fontWeight: 500,
            }}
          >
            Tools
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {visibleTools.map((tool, i) => (
  <motion.div key={tool.href}>
    {tool.locked ? (
      <div
        style={{
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.04)",
          borderRadius: 16,
          padding: "16px 14px",
          opacity: 0.45,
          cursor: "not-allowed",
          filter: "grayscale(1)",
        }}
      >
        <tool.icon size={16} strokeWidth={1.4} color="rgba(200,200,200,0.3)" />
        <div>
          <div style={{ fontSize: 13, color: "rgba(200,200,200,0.5)" }}>
            {tool.label} 🔒
          </div>
          <div style={{ fontSize: 11, color: "rgba(200,200,200,0.3)" }}>
            Coming soon
          </div>
        </div>
      </div>
    ) : (
      <Link href={tool.href}>
        <div
          style={{
            background: "rgba(255,255,255,0.026)",
            border: "1px solid rgba(255,255,255,0.065)",
            borderRadius: 16,
            padding: "16px 14px",
            cursor: "pointer",
          }}
        >
          <tool.icon size={16} strokeWidth={1.4} />
          <div>
            <div style={{ fontSize: 13 }}>{tool.label}</div>
            <div style={{ fontSize: 11 }}>{tool.desc}</div>
          </div>
        </div>
      </Link>
    )}
  </motion.div>
))}
          </div>
        </motion.div>

        {/* ── Reality Anchors preview ── */}
        {previewAnchors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.40, duration: 0.7 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(185, 158, 115, 0.36)",
                  fontWeight: 500,
                }}
              >
                Your anchors
              </p>
              <Link href="/anchors">
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(205, 170, 100, 0.42)",
                    letterSpacing: "0.06em",
                  }}
                >
                  See all
                </span>
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {previewAnchors.map((anchor) => (
                <div
                  key={anchor.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.024)",
                    border: "1px solid rgba(255, 255, 255, 0.055)",
                    borderRadius: 12,
                    padding: "12px 16px",
                  }}
                >
                  {anchor.type === "text" ? (
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 300,
                        color: "rgba(220, 205, 182, 0.72)",
                        lineHeight: 1.5,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {anchor.content}
                    </p>
                  ) : (
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(185, 158, 115, 0.42)",
                        fontStyle: "italic",
                      }}
                    >
                      Photo anchor
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

<div style={{ marginTop: "auto", paddingTop: 8 }}>
          <AudioControls minimal />
        </div>
      </div>
      {welcomeOpen && (
  <CalmModal>
    <p style={modalEyebrow}>Welcome</p>
    <h2 style={modalTitle}>This is your place to slow down.</h2>
    <p style={modalText}>
      You can use The Nest without an account.
      <br /><br />
      Creating a free account lets your Nest remember your thoughts, voice capsules,
      streaks, rituals and reflections across devices.
    </p>

    <button
      onClick={() => {
        localStorage.setItem("nest_welcome_seen", "true");
        setWelcomeOpen(false);
      }}
      style={modalButton}
    >
      Continue without account
    </button>

    <button
      onClick={() => {
        localStorage.setItem("nest_welcome_seen", "true");
        setWelcomeOpen(false);
        setAuthOpen(true);
      }}
      style={{ ...modalButton, color: "rgba(205,170,100,0.76)" }}
    >
      Create free account
    </button>
  </CalmModal>
)}
{dailyOpen && (
  <CalmModal>
    <p style={modalEyebrow}>A new day</p>
    <h2 style={modalTitle}>
      {yesterdayMood
        ? `Yesterday felt ${moodLabel(yesterdayMood)}.`
        : "Good morning."}
    </h2>
    <p style={modalText}>How does your mind feel today?</p>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {MOODS.map((mood) => (
        <button
          key={mood.key}
          onClick={async () => {
            await saveDailyMood(mood.key);
          
            const today = new Date().toISOString().slice(0, 10);
          
            await supabase.from("nest_daily_activity").upsert({
              user_id: user?.id,
              activity_date: today,
            });
          
            setTodayMood(mood.key);
          }}
          style={{
            background:
              todayMood === mood.key
                ? "rgba(205,170,100,0.12)"
                : "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.065)",
            borderRadius: 13,
            padding: "12px 10px",
            color: "rgba(225,210,188,0.78)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {mood.label}
        </button>
      ))}
    </div>

    <p style={{ ...modalText, marginTop: 18 }}>Choose a gentle intention?</p>

    {INTENTIONS.map((item) => (
      <button
        key={item}
        onClick={async () => {
          await saveDailyIntention(item);
        
          const today = new Date().toISOString().slice(0, 10);
        
          await supabase.from("nest_daily_activity").upsert({
            user_id: user?.id,
            activity_date: today,
          });
        
          setDailyIntention(item);
        
          localStorage.setItem(
            "nest_daily_checkin_date",
            new Date().toISOString().slice(0, 10)
          );
        
          setDailyOpen(false);
        }}
        style={modalButton}
      >
        {item}
      </button>
    ))}

    <button
      onClick={() => {
        localStorage.setItem(
          "nest_daily_checkin_date",
          new Date().toISOString().slice(0, 10)
        );
        setDailyOpen(false);
      }}
      style={{ ...modalButton, color: "rgba(175,158,132,0.44)" }}
    >
      Skip for now
    </button>
  </CalmModal>
)}
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => setAuthOpen(false)}
      />
    </motion.div>
  );
}
