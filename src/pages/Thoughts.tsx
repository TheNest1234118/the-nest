import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { markThoughtSavedForNotifications } from "@/lib/notifications";
import { motion, AnimatePresence } from "framer-motion";
import { loadThoughts, saveThought, deleteThought } from "@/lib/userData";
import {
  ChevronLeft,
  MoreVertical,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { markPwaEngagement } from "@/lib/pwa";

interface Thought {
  id: string;
  text: string;
  created_at: string;
}

const prompts = [
  "What did you learn today?",
  "What is still on your mind?",
  "What should your future self remember?",
  "What changed how you feel today?",
];

const gold = "rgba(218, 178, 105, 0.92)";
const softGold = "rgba(235, 215, 180, 0.90)";
const mutedGold = "rgba(185, 162, 128, 0.50)";
const border = "rgba(255,255,255,0.075)";
const card = "rgba(255,255,255,0.028)";

export function Thoughts() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [newThought, setNewThought] = useState("");
  const [search, setSearch] = useState("");
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const data = await loadThoughts();
      setThoughts(data || []);
    }

    init();
  }, []);

  const handleSave = async () => {
    if (!newThought.trim() || isSaving) return;

    try {
      setIsSaving(true);
      const saved = await saveThought(newThought.trim());

      if (saved) {
        setThoughts((prev) => [saved, ...prev]);
        markPwaEngagement("saved_thought");
        markThoughtSavedForNotifications();
      }

      setNewThought("");
      setIsFocused(false);
    } finally {
      setTimeout(() => setIsSaving(false), 350);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteThought(id);
      setThoughts((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Could not delete thought", err);
    }
  };

  const visibleThoughts = useMemo(() => {
    return thoughts
      .filter((thought) =>
        thought.text.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
  
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [thoughts, search, sortOrder]);

  const activePrompt = prompts[activePromptIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.75, ease: "easeOut" }}
      style={{
        minHeight: "100svh",
        background: "#050507",
        position: "relative",
        overflow: "hidden",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        color: softGold,
      }}
    >
      <style>{`
        @keyframes nestFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .72; }
          50% { transform: translate3d(0, -8px, 0) scale(1.035); opacity: .96; }
        }

        @keyframes horizonGlow {
          0%, 100% { opacity: .36; transform: scaleX(.95); }
          50% { opacity: .82; transform: scaleX(1.05); }
        }

        @keyframes tinyStars {
          0% { transform: translateY(0); opacity: .18; }
          50% { opacity: .42; }
          100% { transform: translateY(-18px); opacity: .12; }
        }

        .thought-input::placeholder,
        .thought-search::placeholder {
          color: rgba(185,162,128,.42);
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% -5%, rgba(223,166,75,.13) 0%, rgba(223,166,75,.04) 30%, transparent 62%), radial-gradient(circle at 12% 18%, rgba(255,255,255,.035) 0%, transparent 22%), linear-gradient(180deg, #08080b 0%, #050507 45%, #060608 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
          backgroundSize: "88px 88px",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 14%, black 70%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          flex: 1,
          padding: "0 20px 116px",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 46px)",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.75, ease: "easeOut" }}
          style={{
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
            <Link href="/home">
              <motion.button
                whileTap={{ scale: 0.92 }}
                style={{
                  marginTop: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(185, 162, 128, 0.38)",
                  padding: 0,
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronLeft strokeWidth={1.35} size={25} />
              </motion.button>
            </Link>

            <div>
              <h2
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 34,
                  fontWeight: 400,
                  color: "rgba(244, 226, 194, 0.95)",
                  letterSpacing: "0.015em",
                  lineHeight: 1.05,
                  margin: 0,
                  textShadow: "0 0 24px rgba(226,175,95,.12)",
                }}
              >
                Thoughts
              </h2>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 14,
                  color: "rgba(185, 162, 128, 0.55)",
                  fontWeight: 300,
                  lineHeight: 1.5,
                  letterSpacing: "0.01em",
                }}
              >
                Put it down. Leave it here.
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            animate={{ opacity: [0.72, 1, 0.72] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              marginTop: 4,
              width: 42,
              height: 42,
              borderRadius: 999,
              border: "1px solid rgba(218,178,105,.16)",
              background: "rgba(255,255,255,.025)",
              color: "rgba(232,195,128,.82)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 28px rgba(218,178,105,.07)",
            }}
          >
            <Sparkles size={17} strokeWidth={1.55} />
          </motion.button>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.14, duration: 0.8, ease: "easeOut" }}
          style={{
            position: "relative",
            minHeight: isFocused ? 360 : 292,
            borderRadius: 30,
            border: `1px solid ${isFocused ? "rgba(218,178,105,.25)" : "rgba(255,255,255,.08)"}`,
            background:
              "linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.018)), radial-gradient(circle at 50% 38%, rgba(220,145,45,.13), transparent 40%)",
            overflow: "hidden",
            boxShadow: isFocused
              ? "0 28px 110px rgba(0,0,0,.42), inset 0 0 0 1px rgba(255,255,255,.025), 0 0 44px rgba(218,178,105,.08)"
              : "0 24px 92px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.018)",
            marginBottom: 18,
            transition: "all .45s ease",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 30,
              width: 168,
              height: 168,
              transform: "translateX(-50%)",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 50% 52%, rgba(255,205,128,.07) 0%, rgba(215,150,65,.13) 38%, rgba(12,10,8,.02) 70%), linear-gradient(180deg, rgba(255,216,145,.11), rgba(255,216,145,.01))",
              border: "1px solid rgba(238,190,105,.22)",
              boxShadow: "0 0 42px rgba(218,158,67,.15), inset 0 0 32px rgba(255,210,140,.08)",
              filter: "blur(.1px)",
              animation: "nestFloat 5.2s ease-in-out infinite",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 42,
              right: 42,
              top: 178,
              height: 58,
              borderRadius: "50%",
              background:
                "radial-gradient(ellipse at center, rgba(229,171,82,.28) 0%, rgba(229,171,82,.06) 44%, transparent 72%)",
              filter: "blur(8px)",
              animation: "horizonGlow 4.4s ease-in-out infinite",
            }}
          />

          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              style={{
                position: "absolute",
                left: `${14 + n * 14}%`,
                top: `${60 + (n % 3) * 18}px`,
                width: 2,
                height: 2,
                borderRadius: 99,
                background: "rgba(235,190,110,.62)",
                boxShadow: "0 0 10px rgba(235,190,110,.55)",
                animation: `tinyStars ${4 + n * 0.4}s ease-in-out infinite`,
                animationDelay: `${n * 0.35}s`,
              }}
            />
          ))}

          <div
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              minHeight: isFocused ? 360 : 292,
              padding: "56px 20px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ textAlign: "center", width: "100%" }}>
              <motion.h1
                animate={{ y: isFocused ? -2 : 0 }}
                transition={{ duration: 0.35 }}
                style={{
                  margin: 0,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontWeight: 400,
                  fontSize: 30,
                  lineHeight: 1.12,
                  color: "rgba(245,230,204,.95)",
                  textShadow: "0 0 22px rgba(218,178,105,.12)",
                }}
              >
                What&apos;s on
                <br />
                <span style={{ color: "rgba(231,164,105,.95)" }}>your mind?</span>
              </motion.h1>

              <textarea
                className="thought-input"
                value={newThought}
                onChange={(e) => setNewThought(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  if (!newThought.trim()) setIsFocused(false);
                }}
                placeholder="Write your thoughts..."
                style={{
                  width: "100%",
                  marginTop: 22,
                  minHeight: isFocused || newThought ? 104 : 48,
                  resize: "none",
                  textAlign: "center",
                  background: "transparent",
                  border: "none",
                  color: "rgba(238,222,198,.88)",
                  fontSize: isFocused || newThought ? 17 : 14,
                  fontWeight: 300,
                  lineHeight: 1.55,
                  outline: "none",
                  transition: "all .35s ease",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ width: "100%" }}>
              <div
                style={{
                  height: 1,
                  width: "100%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(218,178,105,.18), transparent)",
                  marginBottom: 17,
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActivePromptIndex((i) => (i - 1 + prompts.length) % prompts.length)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "rgba(218,178,105,.78)",
                    fontSize: 13,
                    cursor: "pointer",
                    padding: "8px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  ‹ Previous
                </motion.button>

                <AnimatePresence mode="wait">
                  <motion.button
                    key={activePrompt}
                    initial={{ opacity: 0, y: 8, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(5px)" }}
                    transition={{ duration: 0.32, ease: "easeOut" }}
                    onClick={() => setNewThought((value) => (value.trim() ? value : activePrompt + "\n"))}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "rgba(238,222,198,.88)",
                      fontSize: 14,
                      fontWeight: 300,
                      cursor: "pointer",
                      textAlign: "center",
                      lineHeight: 1.35,
                      padding: "8px 4px",
                    }}
                  >
                    {activePrompt}
                  </motion.button>
                </AnimatePresence>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActivePromptIndex((i) => (i + 1) % prompts.length)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "rgba(218,178,105,.78)",
                    fontSize: 13,
                    cursor: "pointer",
                    padding: "8px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  Next ›
                </motion.button>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 7,
                  marginTop: 7,
                }}
              >
                {prompts.map((_, i) => (
                  <motion.span
                    key={i}
                    animate={{
                      width: i === activePromptIndex ? 8 : 6,
                      opacity: i === activePromptIndex ? 1 : 0.28,
                    }}
                    style={{
                      height: 6,
                      borderRadius: 999,
                      background: i === activePromptIndex ? gold : "rgba(185,162,128,.55)",
                    }}
                  />
                ))}
              </div>

              <AnimatePresence>
                {(newThought.trim() || isFocused) && (
                  <motion.button
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    disabled={!newThought.trim() || isSaving}
                    style={{
                      width: "100%",
                      marginTop: 16,
                      border: "1px solid rgba(241,187,104,.24)",
                      borderRadius: 999,
                      padding: "15px 18px",
                      background:
                        "linear-gradient(135deg, rgba(225,170,88,.22), rgba(120,54,43,.32))",
                      color: "rgba(255,236,205,.94)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 9,
                      fontSize: 13,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      cursor: newThought.trim() && !isSaving ? "pointer" : "default",
                      opacity: newThought.trim() && !isSaving ? 1 : 0.55,
                      boxShadow: "0 18px 45px rgba(201,109,64,.17)",
                    }}
                  >
                    {isSaving ? "Leaving it here..." : "Leave it here"}
                    <Send size={15} strokeWidth={1.7} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          style={{ display: "flex", gap: 10, marginBottom: 22 }}
        >
          <div
            style={{
              flex: 1,
              height: 56,
              borderRadius: 18,
              background: "rgba(255,255,255,.026)",
              border: "1px solid rgba(255,255,255,.068)",
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "0 15px",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,.012)",
            }}
          >
            <Search size={19} strokeWidth={1.5} color="rgba(185,162,128,.62)" />
            <input
              className="thought-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search thoughts..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "rgba(225,210,188,0.86)",
                fontSize: 15,
                fontWeight: 300,
                minWidth: 0,
              }}
            />
          </div>

        
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.7 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
            padding: "0 2px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: ".22em",
              color: "rgba(185,162,128,.56)",
              textTransform: "uppercase",
            }}
          >
            Your thoughts
          </p>

          <button
  onClick={() =>
    setSortOrder((current) => (current === "newest" ? "oldest" : "newest"))
  }
  style={{
    border: "none",
    background: "transparent",
    color: "rgba(185,162,128,.60)",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
  }}
>
  {sortOrder === "newest" ? "Newest⌄" : "Oldest⌃"}
</button>
        </motion.div>

        {visibleThoughts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleThoughts.map((thought, i) => (
              <motion.div
                key={thought.id}
                initial={{ opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.58, delay: Math.min(0.3 + i * 0.045, 0.58), ease: "easeOut" }}
                whileTap={{ scale: 0.992 }}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: "linear-gradient(180deg, rgba(255,255,255,.033), rgba(255,255,255,.022))",
                  border: `1px solid ${border}`,
                  borderRadius: 18,
                  padding: "17px 16px 15px",
                  boxShadow: "0 16px 42px rgba(0,0,0,.22), inset 0 0 0 1px rgba(255,255,255,.012)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: "0 auto 0 0",
                    width: 3,
                    background:
                      i === 0
                        ? "linear-gradient(180deg, transparent, rgba(218,178,105,.55), transparent)"
                        : "transparent",
                  }}
                />

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 300,
                        lineHeight: 1.48,
                        color: "rgba(229,213,190,0.84)",
                        letterSpacing: "0.005em",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {thought.text}
                    </p>

                    <time
                      style={{
                        display: "block",
                        marginTop: 12,
                        fontSize: 11,
                        letterSpacing: "0.13em",
                        color: "rgba(175, 158, 132, 0.36)",
                      }}
                    >
                      {new Date(thought.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                      {" · "}
                      {new Date(thought.created_at).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => handleDelete(thought.id)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        border: "none",
                        background: "transparent",
                        color: "rgba(210,120,120,0.52)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={15} strokeWidth={1.45} />
                    </button>
                   
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.7 }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingBottom: 80,
            }}
          >
            <div
              style={{
                background: card,
                border: `1px solid ${border}`,
                borderRadius: 20,
                padding: "24px 26px",
                maxWidth: 270,
                textAlign: "center",
                boxShadow: "0 18px 60px rgba(0,0,0,.24)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "rgba(175, 158, 132, 0.48)",
                  fontWeight: 300,
                  lineHeight: 1.6,
                  fontStyle: "italic",
                }}
              >
                Your mind is quiet for now.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
