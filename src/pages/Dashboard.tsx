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
  type MoodKey,
} from "@/lib/dailyNest";
import {
  Feather,
  Mic,
  Anchor,
  BookOpen,
  Settings,
  ChevronRight,
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Back again";
}

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

const INTENTIONS = [
  "Record one voice note",
  "Write one thought",
  "Pause for one minute",
  "Notice one real thing around you",
  "Leave one thing behind",
  "Capture something worth remembering",
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

function moodLabel(mood: string | null) {
  return MOODS.find((m) => m.key === mood)?.label.replace(/^.+?\s/, "") ?? mood;
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
    question: "How does your mind feel today?",
    invitation: pickDailyItem(variants.invitations, moodForTone),
  };
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

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(185, 158, 115, 0.38)",
  marginBottom: 8,
  fontWeight: 500,
};

const sectionDescription: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(185, 162, 128, 0.42)",
  lineHeight: 1.5,
  marginBottom: 12,
};

export function Dashboard() {
  const [selectedDailyMood, setSelectedDailyMood] =
  useState<DashboardMoodKey | null>(null);
  const [, navigate] = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  if (localStorage.getItem("nest_guide_completed") !== "true") {
    setTimeout(() => setGuideOpen(true), 450);
   }
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [yesterdayMood, setYesterdayMood] = useState<string | null>(null);
  const [dailyIntention, setDailyIntention] = useState<string | null>(null);

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

  function NestEggPreview() {
    return (
      <div
        style={{
          position: "absolute",
          right: 14,
          top: 18,
          width: 150,
          height: 115,
          pointerEvents: "none",
        }}
      >
        <motion.div
          animate={{ opacity: [0.65, 1, 0.65], scale: [1, 1.04, 1] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            right: 38,
            top: 28,
            width: 42,
            height: 52,
            borderRadius: "48% 48% 52% 52%",
            background:
              "radial-gradient(circle at 38% 28%, rgba(255,232,164,0.95), rgba(218,151,48,0.95) 48%, rgba(102,55,14,0.28) 100%)",
            boxShadow:
              "0 0 30px rgba(218,151,48,0.42), 0 16px 34px rgba(0,0,0,0.38)",
            zIndex: 3,
          }}
        />
  
        <motion.div
          animate={{ rotate: [0, 2, 0], opacity: [0.72, 0.9, 0.72] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            right: 4,
            top: 50,
            width: 132,
            height: 54,
            borderRadius: "50%",
            background:
              "repeating-radial-gradient(ellipse at center, transparent 0 7px, rgba(176,112,34,0.34) 8px 9px, transparent 10px 14px)",
            transform: "rotate(-7deg)",
            filter: "blur(0.2px)",
            zIndex: 2,
          }}
        />
  
        <div
          style={{
            position: "absolute",
            right: 8,
            top: 62,
            width: 125,
            height: 40,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(205,130,38,0.24), transparent 68%)",
            filter: "blur(8px)",
            zIndex: 1,
          }}
        />
      </div>
    );
  }
  const [anchors] = useLocalStorage<AnchorItem[]>("nest_anchors", []);
  const previewAnchors = useMemo(() => anchors.slice(0, 2), [anchors]);

  const dailyCheckin = useMemo(
    () => getDailyCheckin(todayMood, yesterdayMood),
    [todayMood, yesterdayMood]
  );

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
          gap: 22,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 22,
                fontWeight: 300,
                color: "rgba(235, 220, 198, 0.88)",
                letterSpacing: "0.01em",
                marginBottom: 5,
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
                ? `Yesterday you felt ${moodLabel(yesterdayMood)}. You can leave something here today.`
                : "Your Nest is here if you need it."}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NestEggPreview />
            <button
              onClick={user ? handleLogout : () => setAuthOpen(true)}
              style={{
                background: "rgba(205, 170, 100, 0.045)",
                border: "1px solid rgba(205, 170, 100, 0.12)",
                borderRadius: 999,
                cursor: "pointer",
                color: user
                  ? "rgba(185, 162, 128, 0.45)"
                  : "rgba(205, 170, 100, 0.62)",
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.8 }}
        >
          <Link href="/nest">
            <div
              style={{
                borderRadius: 24,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
                minHeight: 132,
                background:
                  "linear-gradient(165deg, #141009 0%, #191108 55%, #110d06 100%)",
                border: "1px solid rgba(200, 155, 60, 0.11)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "18px 18px",
              }}
            >
              <motion.div
                animate={{ opacity: [0.72, 1, 0.72] }}
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
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: 27,
                        fontWeight: 400,
                        color: "rgba(235, 215, 180, 0.92)",
                        letterSpacing: "0.03em",
                        lineHeight: 1.15,
                        marginBottom: 5,
                      }}
                    >
                      The Nest
                    </h2>

                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(185, 158, 115, 0.48)",
                        fontWeight: 300,
                        letterSpacing: "0.02em",
                      }}
                    >
                      A place to leave what would otherwise disappear.
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
          transition={{ delay: 0.2, duration: 0.7 }}
          style={{
            background: "rgba(255,255,255,0.022)",
            border: "1px solid rgba(255,255,255,0.055)",
            borderRadius: 16,
            padding: "15px 18px",
          }}
        >
          <p style={sectionLabel}>Today</p>

          <p
            style={{
              fontSize: 13,
              color: "rgba(220,205,182,0.66)",
              lineHeight: 1.6,
            }}
          >
            {dailyIntention || dailyCheckin.invitation}
          </p>

          <button onClick={() => setDailyOpen(true)} style={quietSmallButton}>
            Choose gently
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.7 }}
        >
          <p style={sectionLabel}>Capture</p>
          <p style={sectionDescription}>The things you want to keep.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/memos">
              <div
                style={{
                  background:
                    "linear-gradient(145deg, rgba(205,170,100,0.105), rgba(255,255,255,0.028))",
                  border: "1px solid rgba(205,170,100,0.16)",
                  borderRadius: 20,
                  padding: "22px 20px",
                  cursor: "pointer",
                  minHeight: 118,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <Mic
                    size={19}
                    strokeWidth={1.4}
                    color="rgba(205, 170, 100, 0.72)"
                    style={{ marginBottom: 14 }}
                  />

                  <div
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: 22,
                      fontWeight: 400,
                      color: "rgba(235, 215, 180, 0.92)",
                      marginBottom: 6,
                    }}
                  >
                    Capsules
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(185, 158, 115, 0.48)",
                      lineHeight: 1.5,
                    }}
                  >
                    Voice notes before they disappear.
                  </div>
                </div>

                <ChevronRight
                  size={17}
                  color="rgba(200, 165, 95, 0.38)"
                  strokeWidth={1.3}
                />
              </div>
            </Link>

            <Link href="/thoughts">
              <div
                style={{
                  background: "rgba(255,255,255,0.028)",
                  border: "1px solid rgba(255,255,255,0.065)",
                  borderRadius: 18,
                  padding: "18px 18px",
                  cursor: "pointer",
                  minHeight: 92,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <Feather
                    size={17}
                    strokeWidth={1.4}
                    color="rgba(205, 170, 100, 0.58)"
                    style={{ marginBottom: 10 }}
                  />

                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 400,
                      color: "rgba(225, 210, 188, 0.82)",
                      marginBottom: 5,
                    }}
                  >
                    Thoughts
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(175, 158, 132, 0.42)",
                      lineHeight: 1.45,
                    }}
                  >
                    A place to put it down.
                  </div>
                </div>

                <ChevronRight
                  size={15}
                  strokeWidth={1.3}
                  color="rgba(200, 165, 95, 0.28)"
                />
              </div>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <p style={sectionLabel}>Looking back</p>
          <p style={sectionDescription}>Made from what you’ve left behind.</p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <Link href="/reflections">
              <div
                style={{
                  background: "rgba(255,255,255,0.024)",
                  border: "1px solid rgba(255,255,255,0.058)",
                  borderRadius: 16,
                  padding: "16px 14px",
                  cursor: "pointer",
                  minHeight: 96,
                }}
              >
                <BookOpen
                  size={16}
                  strokeWidth={1.4}
                  color="rgba(205, 170, 100, 0.50)"
                  style={{ marginBottom: 12 }}
                />

                <div
                  style={{
                    fontSize: 14,
                    color: "rgba(225, 210, 188, 0.78)",
                    marginBottom: 5,
                  }}
                >
                  Weekly Reflection
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(175, 158, 132, 0.36)",
                    lineHeight: 1.45,
                  }}
                >
                  A quiet look at your week.
                </div>
              </div>
            </Link>

            <Link href="/reflections">
              <div
                style={{
                  background: "rgba(255,255,255,0.020)",
                  border: "1px solid rgba(255,255,255,0.052)",
                  borderRadius: 16,
                  padding: "16px 14px",
                  cursor: "pointer",
                  minHeight: 96,
                }}
              >
                <BookOpen
                  size={16}
                  strokeWidth={1.4}
                  color="rgba(205, 170, 100, 0.42)"
                  style={{ marginBottom: 12 }}
                />

                <div
                  style={{
                    fontSize: 14,
                    color: "rgba(225, 210, 188, 0.70)",
                    marginBottom: 5,
                  }}
                >
                  Monthly Reflection
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(175, 158, 132, 0.34)",
                    lineHeight: 1.45,
                  }}
                >
                  See what stayed with you.
                </div>
              </div>
            </Link>
          </div>
          <Link href="/ask-past">
  <div
    style={{
      marginTop: 12,
      background: "rgba(205,170,100,0.035)",
      border: "1px solid rgba(205,170,100,0.10)",
      borderRadius: 16,
      padding: "16px 16px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 14,
          color: "rgba(230,215,190,0.82)",
          marginBottom: 5,
        }}
      >
        Ask your past
      </div>

      <div
        style={{
          fontSize: 11,
          color: "rgba(175,158,132,0.40)",
          lineHeight: 1.45,
        }}
      >
        Search your thoughts, voice capsules and anchors with AI.
      </div>
    </div>

    <ChevronRight
      size={16}
      strokeWidth={1.3}
      color="rgba(205,170,100,0.42)"
    />
  </div>
</Link>
        </motion.div>

       {/* <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.7 }}
        >
          <Link href="/anchors">
            <div
              style={{
                background: "rgba(255,255,255,0.020)",
                border: "1px solid rgba(255,255,255,0.055)",
                borderRadius: 16,
                padding: "15px 18px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <Anchor
                    size={15}
                    strokeWidth={1.4}
                    color="rgba(205, 170, 100, 0.46)"
                  />

                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 400,
                        color: "rgba(225, 210, 188, 0.74)",
                      }}
                    >
                      Anchors
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(175, 158, 132, 0.34)",
                        marginTop: 2,
                        lineHeight: 1.4,
                      }}
                    >
                      Real things. This room. Right now.
                    </div>
                  </div>
                </div>

                <ChevronRight
                  size={15}
                  strokeWidth={1.3}
                  color="rgba(200, 165, 95, 0.26)"
                />
              </div>

              {previewAnchors.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                  }}
                >
                  {previewAnchors.map((anchor) => (
                    <div
                      key={anchor.id}
                      style={{
                        background: "rgba(255, 255, 255, 0.020)",
                        border: "1px solid rgba(255, 255, 255, 0.045)",
                        borderRadius: 11,
                        padding: "10px 12px",
                      }}
                    >
                      {anchor.type === "text" ? (
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 300,
                            color: "rgba(220, 205, 182, 0.58)",
                            lineHeight: 1.45,
                          }}
                        >
                          {anchor.content}
                        </p>
                      ) : (
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(185, 158, 115, 0.38)",
                            fontStyle: "italic",
                          }}
                        >
                          Photo anchor
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Link>
        </motion.div>
*/}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.7 }}
        >
          <Link href="/atmosphere">
            <div
              style={{
                background: "rgba(255, 255, 255, 0.016)",
                border: "1px solid rgba(255, 255, 255, 0.048)",
                borderRadius: 16,
                padding: "14px 18px",
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
                  color="rgba(205, 170, 100, 0.40)"
                />

                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: "rgba(225, 210, 188, 0.68)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    Atmosphere
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(175, 158, 132, 0.30)",
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
                            deep_night: "Deep Night",
                            quiet_rain: "Quiet Rain",
                            foggy: "Foggy",
                            warm_room: "Warm Room",
                            midnight_train: "Midnight Train",
                            heavy_mind: "Heavy Mind",
                            soft_distance: "Soft Distance",
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
                color="rgba(200, 165, 95, 0.22)"
              />
            </div>
          </Link>
        </motion.div>

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
            <br />
            <br />
            Creating a free account lets your Nest remember your thoughts,
            voice capsules, anchors and reflections across devices.
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
          <p style={modalEyebrow}>{dailyCheckin.title}</p>

          {dailyCheckin.yesterday && (
            <p style={{ ...modalText, marginBottom: 10 }}>
              {dailyCheckin.yesterday}
            </p>
          )}

          <h2 style={modalTitle}>{dailyCheckin.question}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {MOODS.map((mood) => (
              <button
                key={mood.key}
                onClick={() => setSelectedDailyMood(mood.key)}
                style={{
                  background:
                  selectedDailyMood === mood.key
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
          <button
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
setSelectedDailyMood(null);
setDailyOpen(false);
  }}
  style={{
    width: "100%",
    marginTop: 14,
    background: selectedDailyMood
      ? "rgba(205,170,100,0.10)"
      : "rgba(255,255,255,0.025)",
    border: selectedDailyMood
      ? "1px solid rgba(205,170,100,0.18)"
      : "1px solid rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: "14px 16px",
    color: selectedDailyMood
      ? "rgba(225,205,176,0.82)"
      : "rgba(175,158,132,0.36)",
    fontSize: 11,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    cursor: selectedDailyMood ? "pointer" : "default",
  }}
>
  Continue
</button>
{/*
         <p style={{ ...modalText, marginTop: 18 }}>
            One quiet invitation for today:
          </p>

          {[dailyCheckin.invitation, ...INTENTIONS.filter((item) => item !== dailyCheckin.invitation)].map((item) => (
            <button
              key={item}
              onClick={async () => {
                await saveDailyIntention(item);

                const today = new Date().toISOString().slice(0, 10);

                if (user?.id) {
                  await supabase.from("nest_daily_activity").upsert({
                    user_id: user.id,
                    activity_date: today,
                  });
                }

                setDailyIntention(item);

                localStorage.setItem("nest_daily_checkin_date", today);

                setDailyOpen(false);
              }}
              style={modalButton}
            >
              {item}
            </button>
          ))}
*/}
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
{guideOpen && (
<CalmModal>
<p style={modalEyebrow}>Welcome</p>
<h2 style={modalTitle}>A short guide to The Nest.</h2>
<p style={modalText}>
     Take less than 30 seconds to understand what this place is for.
</p>
<button
     onClick={() => {
       setGuideOpen(false);
       navigate("/onboarding");
     }}
     style={{ ...modalButton, color: "rgba(205,170,100,0.76)" }}
>
     Open guide
</button>
<button
     onClick={() => {
       localStorage.setItem("nest_guide_completed", "true");
       setGuideOpen(false);
     }}
     style={{ ...modalButton, color: "rgba(175,158,132,0.44)" }}
>
     Skip
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
