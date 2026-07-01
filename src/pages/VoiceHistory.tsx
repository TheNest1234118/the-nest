import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Pause, Play, Trash2, FileText } from "lucide-react";
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
  const [selectedTranscript, setSelectedTranscript] = useState<Memo | null>(null);
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
    width: 44,
    height: 44,
    borderRadius: 999,
    border: "1px solid rgba(205,170,100,0.20)",
    background:
      playingId === memo.id
        ? "rgba(205,170,100,0.14)"
        : "rgba(205,170,100,0.06)",
    color: "rgba(225,205,176,0.78)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
  }}
>
  {playingId === memo.id ? (
    <Pause size={16} strokeWidth={1.6} />
  ) : (
    <Play
      size={15}
      fill="currentColor"
      strokeWidth={1.6}
      style={{ marginLeft: 2 }}
    />
  )}
</button>

                <div>
                  <div style={{ color: "rgba(225,210,188,.78)", fontSize: 13 }}>
                    {memo.title || "Voice capsule"}
                  </div>
                  <div style={{ color: "rgba(175,158,132,.34)", fontSize: 10 }}>
                    {formatTime(memo.duration)} ·{" "}
                    {new Date(memo.created_at).toLocaleDateString()}
                  </div>
                  {memo.status === "ready" && memo.transcript_text && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      setSelectedTranscript(memo);
    }}
    style={{
      marginTop: 7,
      background: "none",
      border: "none",
      padding: 0,
      color: "rgba(205,170,100,0.58)",
      fontSize: 10,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 6,
    }}
  >
    <FileText size={12} strokeWidth={1.5} />
    View transcript
  </button>
)}
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
      {selectedTranscript && (
  <div
    onClick={() => setSelectedTranscript(null)}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 999,
      background: "rgba(6,5,8,0.88)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: 380,
        maxHeight: "72vh",
        overflowY: "auto",
        background: "rgba(18,15,12,0.96)",
        border: "1px solid rgba(205,170,100,0.12)",
        borderRadius: 24,
        padding: 22,
        boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
      }}
    >
      <p
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(205,170,100,0.42)",
          marginBottom: 10,
        }}
      >
        Transcript
      </p>

      <h2
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 22,
          fontWeight: 400,
          color: "rgba(235,215,180,0.92)",
          marginBottom: 14,
        }}
      >
        {selectedTranscript.title || "Voice capsule"}
      </h2>

      <p
        style={{
          whiteSpace: "pre-wrap",
          fontSize: 13,
          lineHeight: 1.7,
          color: "rgba(220,205,182,0.72)",
        }}
      >
        {selectedTranscript.transcript_text}
      </p>

      <button
        onClick={() => setSelectedTranscript(null)}
        style={{
          width: "100%",
          marginTop: 20,
          border: "1px solid rgba(205,170,100,0.14)",
          background: "rgba(205,170,100,0.06)",
          borderRadius: 14,
          padding: "13px 14px",
          color: "rgba(225,205,176,0.78)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        Close
      </button>
    </div>
  </div>
)}
    </motion.div>
  );
}