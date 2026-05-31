import React, { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Feather,
  Mic,
  CircleDot,
  Anchor,
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

interface LastSession {
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
  { href: "/thoughts", icon: Feather,    label: "Thoughts",      desc: "Put it down. Leave it here." },
  { href: "/memos",    icon: Mic,        label: "Capsules",       desc: "Voice note before you forget" },
  { href: "/reset",    icon: CircleDot,  label: "Reality Reset",  desc: "Come down from the noise" },
  { href: "/anchors",  icon: Anchor,     label: "Anchors",        desc: "Real things. This room. Right now." },
];

export function Dashboard() {
  const [, navigate] = useLocation();

  const state      = localStorage.getItem("nest_state") || null;
  const stateNote  = state ? STATE_NOTES[state]  ?? null : null;
  const sessionName = state ? SESSION_NAMES[state] ?? null : null;
  const sessionNote = state ? SESSION_NOTES[state] ?? null : null;

  const lastSession = useMemo<LastSession | null>(() => {
    try {
      const raw = localStorage.getItem("nest_last_session");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LastSession;
      const hoursSince = (Date.now() - parsed.completedAt) / (1000 * 60 * 60);
      return hoursSince < 24 ? parsed : null;
    } catch { return null; }
  }, []);

  const showContinue = !!(lastSession && lastSession.key === state);
  const showSession  = showContinue || !!sessionName;

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
        background: "#09090d",
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
            {stateNote && (
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(185, 162, 128, 0.50)",
                  fontWeight: 300,
                  lineHeight: 1.5,
                  maxWidth: 260,
                  letterSpacing: "0.01em",
                }}
              >
                {stateNote}
              </p>
            )}
          </div>
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

        {/* ── Recommended / Continue session ── */}
        {showSession && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.7 }}
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
              {showContinue ? "Continue where you left off" : "For right now"}
            </p>
            <button
              onClick={() =>
                handleStartSession(showContinue ? lastSession!.key : state)
              }
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
                  {showContinue ? lastSession!.label : sessionName}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(175, 152, 112, 0.45)",
                    fontWeight: 300,
                    letterSpacing: "0.01em",
                  }}
                >
                  {showContinue ? "Continue last session" : sessionNote}
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
            {TOOLS.map((tool, i) => (
              <motion.div
                key={tool.href}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.30 + i * 0.04, duration: 0.6 }}
              >
                <Link href={tool.href}>
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.026)",
                      border: "1px solid rgba(255, 255, 255, 0.065)",
                      borderRadius: 16,
                      padding: "16px 14px",
                      cursor: "pointer",
                      minHeight: 90,
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                    }}
                  >
                    <tool.icon
                      size={16}
                      strokeWidth={1.4}
                      color="rgba(205, 170, 100, 0.60)"
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 400,
                          color: "rgba(225, 210, 188, 0.80)",
                          letterSpacing: "0.01em",
                          marginBottom: 3,
                        }}
                      >
                        {tool.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(175, 158, 132, 0.36)",
                          fontWeight: 300,
                          lineHeight: 1.4,
                          letterSpacing: "0.01em",
                        }}
                      >
                        {tool.desc}
                      </div>
                    </div>
                  </div>
                </Link>
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
    </motion.div>
  );
}
