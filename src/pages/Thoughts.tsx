import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { markThoughtSavedForNotifications } from "@/lib/notifications";
import { motion } from "framer-motion";
import {
  loadThoughts,
  saveThought,
  deleteThought,
} from "@/lib/userData";
import { ChevronLeft, Trash2 } from "lucide-react";
import { markPwaEngagement } from "@/lib/pwa";

interface Thought {
  id: string;
  text: string;
  created_at: string;
}


  export function Thoughts() {
    const [thoughts, setThoughts] = useState<Thought[]>([]);
    const [newThought, setNewThought] = useState("");
    const [search, setSearch] = useState("");
  useEffect(() => {
    async function init() {
      const data = await loadThoughts();
      setThoughts(data || []);
    }
  
    init();
  }, []);

  const handleSave = async () => {
    if (!newThought.trim()) return;
  
    const saved = await saveThought(newThought.trim());
  
    if (saved) {
      setThoughts([saved, ...thoughts]);
      markPwaEngagement("saved_thought");
      markThoughtSavedForNotifications();
    }
    setNewThought("");
  };
  const handleDelete = async (id: string) => {
    try {
      await deleteThought(id);
      setThoughts((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Could not delete thought", err);
    }
  };
  const visibleThoughts = thoughts.filter((thought) =>
    thought.text.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
        }}
      >
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          style={{
            marginBottom: 34,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Link href="/home">
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(185, 162, 128, 0.32)",
                padding: 2,
              }}
            >
              <ChevronLeft strokeWidth={1.3} size={24} />
            </button>
          </Link>

          <div>
            <h2
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 25,
                fontWeight: 400,
                color: "rgba(235, 215, 180, 0.90)",
                letterSpacing: "0.03em",
                lineHeight: 1.15,
                marginBottom: 5,
              }}
            >
              Thoughts
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "rgba(185, 162, 128, 0.48)",
                fontWeight: 300,
                lineHeight: 1.5,
                maxWidth: 260,
                letterSpacing: "0.01em",
              }}
            >
              Put it down. Leave it here.
            </p>
          </div>
        </motion.header>
        <input
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="Search thoughts..."
  style={{
    width: "100%",
    marginBottom: 18,
    background: "rgba(255,255,255,0.026)",
    border: "1px solid rgba(255,255,255,0.065)",
    borderRadius: 14,
    padding: "13px 15px",
    color: "rgba(225,210,188,0.84)",
    outline: "none",
    fontSize: 13,
  }}
/>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.7 }}
          style={{ marginBottom: 28 }}
        >
          <textarea
            value={newThought}
            onChange={(e) => setNewThought(e.target.value)}
            placeholder="Leave a thought here..."
            style={{
              width: "100%",
              minHeight: 130,
              resize: "none",
              background: "rgba(255, 255, 255, 0.026)",
              border: "1px solid rgba(255, 255, 255, 0.065)",
              borderRadius: 18,
              padding: 18,
              color: "rgba(225, 210, 188, 0.86)",
              fontSize: 13,
              fontWeight: 300,
              lineHeight: 1.6,
              letterSpacing: "0.01em",
              outline: "none",
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button
              onClick={handleSave}
              disabled={!newThought.trim()}
              style={{
                background: "none",
                border: "none",
                cursor: newThought.trim() ? "pointer" : "default",
                opacity: newThought.trim() ? 1 : 0.3,
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(205, 170, 100, 0.62)",
              }}
            >
              Leave it here
            </button>
          </div>
        </motion.div>

        {visibleThoughts.length > 0 ? (
  <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 32 }}>
    {visibleThoughts.map((thought, i) => (
      <motion.div
        key={thought.id}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, delay: Math.min(0.22 + i * 0.04, 0.55) }}
        style={{
          background: "rgba(255, 255, 255, 0.026)",
          border: "1px solid rgba(255, 255, 255, 0.065)",
          borderRadius: 16,
          padding: "18px 18px",
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 300,
            lineHeight: 1.6,
            color: "rgba(220, 205, 182, 0.74)",
            letterSpacing: "0.01em",
            whiteSpace: "pre-wrap",
            marginBottom: 14,
          }}
        >
          {thought.text}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <time
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "rgba(175, 158, 132, 0.34)",
            }}
          >
            {new Date(thought.created_at).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            {" · "}
            {new Date(thought.created_at).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>

          <button
            onClick={() => handleDelete(thought.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(220,120,120,0.6)",
            }}
          >
            Delete
          </button>
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
        background: "rgba(255, 255, 255, 0.024)",
        border: "1px solid rgba(255, 255, 255, 0.055)",
        borderRadius: 18,
        padding: "22px 24px",
        maxWidth: 260,
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "rgba(175, 158, 132, 0.42)",
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
