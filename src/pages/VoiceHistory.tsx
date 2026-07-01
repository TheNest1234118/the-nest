import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Pause, Play, Trash2 } from "lucide-react";
import {
  loadMemos,
  deleteMemoFromSupabase,
  getMemoAudioUrl,
  type SupabaseMemo,
} from "@/lib/memos";

type Memo = SupabaseMemo;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export function VoiceHistory() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function init() {
      const data = await loadMemos();
      setMemos(data as Memo[]);
    }

    init();

    return () => {
      audio?.pause();
    };
  }, []);

  const visibleMemos = memos.filter((memo) =>
    (memo.title || "Voice capsule").toLowerCase().includes(search.toLowerCase())
  );

  const togglePlay = async (memo: Memo) => {
    if (playingId === memo.id) {
      audio?.pause();
      setPlayingId(null);
      return;
    }

    audio?.pause();

    const audioUrl = memo.storage_path
      ? await getMemoAudioUrl(memo.storage_path)
      : memo.audio_url;

    if (!audioUrl) return;

    const nextAudio = new Audio(audioUrl);
    nextAudio.onended = () => setPlayingId(null);
    await nextAudio.play();

    setAudio(nextAudio);
    setPlayingId(memo.id);
  };

  const deleteMemo = async (id: string) => {
    audio?.pause();
    setPlayingId(null);
    await deleteMemoFromSupabase(id);
    setMemos((prev) => prev.filter((m) => m.id !== id));
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
        padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 32px",
      }}
    >
      <header style={{ marginBottom: 28, display: "flex", gap: 14 }}>
        <Link href="/home">
          <button style={{ background: "none", border: "none", color: "rgba(185,162,128,.32)" }}>
            <ChevronLeft size={24} />
          </button>
        </Link>

        <div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 25, color: "rgba(235,215,180,.9)" }}>
            Voice Capsules
          </h2>
          <p style={{ fontSize: 13, color: "rgba(185,162,128,.48)" }}>
            Your saved voice notes.
          </p>
        </div>
      </header>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search voice capsules..."
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

      {visibleMemos.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleMemos.map((memo) => (
            <div
              key={memo.id}
              style={{
                background: "rgba(255,255,255,0.026)",
                border: "1px solid rgba(255,255,255,0.065)",
                borderRadius: 16,
                padding: "16px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button
                  onClick={() => togglePlay(memo)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    border: "1px solid rgba(205,170,100,.12)",
                    background: "rgba(205,170,100,.045)",
                    color: "rgba(205,170,100,.62)",
                  }}
                >
                  {playingId === memo.id ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <div>
                  <div style={{ color: "rgba(225,210,188,.78)", fontSize: 13 }}>
                    {memo.title || "Voice capsule"}
                  </div>
                  <div style={{ color: "rgba(175,158,132,.34)", fontSize: 10 }}>
                    {formatTime(memo.duration)} ·{" "}
                    {new Date(memo.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => deleteMemo(memo.id)}
                style={{ background: "none", border: "none", color: "rgba(175,158,132,.28)" }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "rgba(175,158,132,.42)", textAlign: "center", marginTop: 60 }}>
          No voice capsules found.
        </p>
      )}
    </motion.div>
  );
}