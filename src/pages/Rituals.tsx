import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Plus, Play, Trash2 } from "lucide-react";
import { loadRituals, saveRitual, deleteRitual, type Ritual } from "@/lib/rituals";

const ATMOSPHERES = ["rain", "storm", "wind", "cafe", "night city", "quiet room"];
const MOODS = ["warm dark", "blue night", "soft amber", "almost black"];

export function Rituals() {
  const [, navigate] = useLocation();
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌙");
  const [atmosphere, setAtmosphere] = useState("rain");
  const [lightMood, setLightMood] = useState("warm dark");
  const [slowed, setSlowed] = useState(true);
  const [foggy, setFoggy] = useState(true);
  const [text, setText] = useState("let everything slow down for a moment.");

  useEffect(() => {
    loadRituals().then((data) => setRituals(data as Ritual[])).catch(console.error);
  }, []);

  const createRitual = async () => {
    if (!name.trim()) return;

    const saved = await saveRitual({
      name: name.trim(),
      emoji,
      atmosphere,
      music_track_id: null,
      slowed,
      foggy,
      light_mood: lightMood,
      steps: [
        { type: "text", text },
        { type: "breath", duration: 60, label: "breathe for one minute" },
        { type: "memo", label: "let it out" },
      ],
    });

    if (saved) setRituals([saved as Ritual, ...rituals]);

    setName("");
    setCreating(false);
  };

  const removeRitual = async (id: string) => {
    await deleteRitual(id);
    setRituals((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",
        background: "#09090d",
        maxWidth: 480,
        margin: "0 auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 36px",
        color: "rgba(235, 220, 198, 0.88)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 34 }}>
        <Link href="/home">
          <button style={iconButton}>
            <ChevronLeft size={23} strokeWidth={1.3} />
          </button>
        </Link>

        <button onClick={() => setCreating(!creating)} style={iconButton}>
          <Plus size={18} strokeWidth={1.4} />
        </button>
      </div>

      <p style={eyebrow}>Personal rituals</p>
      <h1 style={title}>Your own way down.</h1>
      <p style={sub}>
        Small quiet sequences for coming back to yourself.
      </p>

      {creating && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={card}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ritual name"
            style={input}
          />

          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
            placeholder="emoji"
            style={{ ...input, marginTop: 10 }}
          />

          <select value={atmosphere} onChange={(e) => setAtmosphere(e.target.value)} style={input}>
            {ATMOSPHERES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select value={lightMood} onChange={(e) => setLightMood(e.target.value)} style={input}>
            {MOODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <label style={check}>
            <input type="checkbox" checked={slowed} onChange={(e) => setSlowed(e.target.checked)} />
            slowed music
          </label>

          <label style={check}>
            <input type="checkbox" checked={foggy} onChange={(e) => setFoggy(e.target.checked)} />
            foggy screen
          </label>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ ...input, minHeight: 88, resize: "none" }}
          />

          <button onClick={createRitual} disabled={!name.trim()} style={saveButton}>
            Save ritual
          </button>
        </motion.div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
        {rituals.map((ritual) => (
          <motion.div key={ritual.id} style={ritualCard}>
            <button
              onClick={() => navigate(`/rituals/${ritual.id}`)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 25, marginBottom: 8 }}>{ritual.emoji}</div>
              <div style={{ fontSize: 16, color: "rgba(235,215,180,0.88)", fontFamily: "Georgia, serif" }}>
                {ritual.name}
              </div>
              <div style={{ fontSize: 11, color: "rgba(175,158,132,0.38)", marginTop: 5 }}>
                {ritual.atmosphere} · {ritual.slowed ? "slowed" : "normal"} · {ritual.light_mood}
              </div>
            </button>

            <button onClick={() => navigate(`/rituals/${ritual.id}`)} style={smallButton}>
              <Play size={14} fill="currentColor" />
            </button>

            <button onClick={() => removeRitual(ritual.id)} style={smallButton}>
              <Trash2 size={14} />
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

const iconButton: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "rgba(185,162,128,0.42)",
  cursor: "pointer",
};

const eyebrow: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "rgba(205,170,100,0.36)",
  marginBottom: 14,
};

const title: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 30,
  fontWeight: 400,
  color: "rgba(235,215,180,0.90)",
  marginBottom: 10,
};

const sub: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(185,162,128,0.48)",
  lineHeight: 1.6,
  maxWidth: 300,
};

const card: React.CSSProperties = {
  marginTop: 26,
  background: "rgba(255,255,255,0.026)",
  border: "1px solid rgba(255,255,255,0.065)",
  borderRadius: 20,
  padding: 18,
};

const ritualCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.024)",
  border: "1px solid rgba(255,255,255,0.058)",
  borderRadius: 18,
  padding: 16,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const input: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.075)",
  borderRadius: 13,
  padding: "13px 14px",
  color: "rgba(235,218,192,0.88)",
  outline: "none",
  fontSize: 13,
  marginTop: 10,
};

const check: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 12,
  color: "rgba(185,162,128,0.52)",
  fontSize: 12,
};

const saveButton: React.CSSProperties = {
  width: "100%",
  marginTop: 16,
  padding: 14,
  borderRadius: 13,
  border: "1px solid rgba(205,170,100,0.18)",
  background: "rgba(205,170,100,0.07)",
  color: "rgba(220,195,150,0.82)",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  border: "1px solid rgba(205,170,100,0.10)",
  background: "rgba(205,170,100,0.04)",
  color: "rgba(205,170,100,0.48)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};