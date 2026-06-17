import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  loadMemos,
  saveMemo,
  deleteMemoFromSupabase,
  getMemoAudioUrl,
  type SupabaseMemo,
} from "@/lib/memos";
import { ChevronLeft, Mic, Square, Play, Pause, Trash2 } from "lucide-react";
type Memo = SupabaseMemo;

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/aac",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
}

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function Memos() {
  const [memos, setMemos] = useState<Memo[]>([]);
    const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [memoTitle, setMemoTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const MAX_RECORDING_SECONDS = 3 * 60 * 60;
  const CHUNK_SECONDS = 15 * 60;
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const chunkIndexRef = useRef(0);
const lastChunkTimeRef = useRef(0);
const [search, setSearch] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
    };
  }, []);
  useEffect(() => {
    async function init() {
      try {
        const data = await loadMemos();
        setMemos(data as Memo[]);
      } catch (err) {
        console.error("Could not load memos", err);
      }
    }
  
    init();
  }, []);
  const startRecording = async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      const mimeType = getSupportedMimeType();

      const options: MediaRecorderOptions = {};
      
      if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
        options.mimeType = mimeType;
        console.log("Using mimeType:", mimeType);
      } else {
        console.warn("No supported mimeType found, using default");
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();
      chunkIndexRef.current = 0;
lastChunkTimeRef.current = Date.now();

recorder.ondataavailable = (e) => {
  if (!e.data || e.data.size === 0) return;
  audioChunksRef.current.push(e.data);
};

recorder.onstop = async () => {
  streamRef.current?.getTracks().forEach((t) => t.stop());
  streamRef.current = null;

  if (timerRef.current) clearInterval(timerRef.current);

  try {
    const duration = Math.max(
      1,
      Math.round((Date.now() - startTimeRef.current) / 1000)
    );

    // 1. Blob aus Chunks bauen
    const blob = new Blob(audioChunksRef.current, {
      type: recorder.mimeType || "audio/webm",
    });

    // 2. optional: Titel fallback
    const finalTitle =
      memoTitle.trim().length > 0 ? memoTitle : "Voice capsule";
      console.log("chunks:", audioChunksRef.current.length);
      console.log("blob size:", blob.size);
    // 3. SPEICHERN (Supabase + Storage)
    const saved = await saveMemo(
      blob,
      duration,
      recorder.mimeType || "audio/webm",
      finalTitle
    );
  
    // 4. UI updaten
    if (saved) {
      setMemos((prev) => [saved, ...prev]);
    }

    // 5. cleanup
    audioChunksRef.current = [];
    setMemoTitle("");
    setRecordingTime(0);
    setIsRecording(false);
    setIsSaving(false);
  } catch (err) {
    console.error("Could not save memo", err);
    setError("Could not save memo.");
    setIsRecording(false);
  }
};
      recorder.start(1000);

      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          const next = t + 1;
      
          if (next >= MAX_RECORDING_SECONDS) {
            stopRecording();
            setError("Recording stopped after 3 hours.");          }
      
          return next;
        });
      }, 1000);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setError("Microphone access denied.");
      } else {
        setError("Could not start recording.");
      }
    }
  };

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
  
    setIsRecording(false);
    setIsSaving(true);
  
    try {
      recorder.requestData();
    } catch (_) {}
  
    recorder.stop();
  }, []);

  const togglePlay = useCallback(
    async (memo: Memo) => {
      if (playingId === memo.id) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }
  
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
  
      try {
        const audioUrl = await getMemoAudioUrl(memo.storage_path);
  
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = audioUrl;
        audioRef.current = audio;
  
        audio.onended = () => setPlayingId(null);
  
        audio.onerror = () => {
          setPlayingId(null);
          setError("Could not play this memo.");
        };
  
        await audio.play();
        setPlayingId(memo.id);
      } catch (err) {
        console.error("Playback failed", err);
        setPlayingId(null);
        setError("Playback failed. Tap play again.");
      }
    },
    [playingId]
  );

  const deleteMemo = async (id: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
  
    try {
      await deleteMemoFromSupabase(id);
      setMemos((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Could not delete memo", err);
      setError("Could not delete this memo.");
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };
  const visibleMemos = memos.filter((memo) =>
    (memo.title || "Voice capsule")
      .toLowerCase()
      .includes(search.toLowerCase())
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
              Voice Capsules
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
              Voice note before you forget.
            </p>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.7 }}
          style={{
            marginBottom: 28,
            background: "rgba(255, 255, 255, 0.026)",
            border: "1px solid rgba(255, 255, 255, 0.065)",
            borderRadius: 22,
            padding: "30px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <input
  value={memoTitle}
  onChange={(e) => setMemoTitle(e.target.value)}
  placeholder="title this capsule..."
  style={{
    width: "100%",
    marginBottom: 18,
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.075)",
    borderRadius: 13,
    padding: "13px 14px",
    color: "rgba(235,218,192,0.88)",
    outline: "none",
    fontSize: 13,
  }}
/>
<p
  style={{
    fontSize: 11,
    lineHeight: 1.6,
    color: "rgba(175,158,132,0.42)",
    marginBottom: 14,
    textAlign: "center",
  }}
>
  A gentle tip:
  <br />
  For longer voice capsules, recording in ~10 minute parts helps keep your memories safe if your connection is interrupted.
</p>
          <button
            data-testid="button-record-toggle"
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              width: 82,
              height: 82,
              borderRadius: 999,
              border: isRecording
                ? "1px solid rgba(248, 113, 113, 0.32)"
                : "1px solid rgba(205, 170, 100, 0.18)",
              background: isRecording
                ? "rgba(127, 29, 29, 0.22)"
                : "rgba(205, 170, 100, 0.065)",
              color: isRecording
                ? "rgba(248, 113, 113, 0.78)"
                : "rgba(205, 170, 100, 0.68)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 700ms ease",
            }}
          >
            {isRecording ? (
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Square size={24} fill="currentColor" />
              </motion.div>
            ) : (
              <Mic size={28} />
            )}
          </button>

          <div
            style={{
              marginTop: 22,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isRecording ? (
              <span
                style={{
                  color: "rgba(248, 113, 113, 0.72)",
                  fontFamily: "monospace",
                  letterSpacing: "0.16em",
                  fontSize: 13,
                }}
              >
                {formatTime(recordingTime)}
              </span>
            ) : (
              <span
                style={{
                  color: "rgba(175, 158, 132, 0.34)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                }}
              >
                Tap to record
              </span>
            )}
          </div>

          {error && (
            <p
              style={{
                marginTop: 14,
                fontSize: 12,
                color: "rgba(248, 113, 113, 0.62)",
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}
        </motion.div>

        {visibleMemos.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 32 }}>
            {visibleMemos.map((memo, i) => (
              <motion.div
                key={memo.id}
                data-testid={`memo-item-${memo.id}`}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.65, delay: Math.min(0.22 + i * 0.04, 0.55) }}
                style={{
                  background: "rgba(255, 255, 255, 0.026)",
                  border: "1px solid rgba(255, 255, 255, 0.065)",
                  borderRadius: 16,
                  padding: "16px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button
                    data-testid={`button-play-${memo.id}`}
                    onClick={() => togglePlay(memo)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      border: "1px solid rgba(205, 170, 100, 0.12)",
                      background: "rgba(205, 170, 100, 0.045)",
                      color: "rgba(205, 170, 100, 0.62)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {playingId === memo.id ? (
                      <Pause size={16} fill="currentColor" />
                    ) : (
                      <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
                    )}
                  </button>
                  <span
  style={{
    fontSize: 13,
    color: "rgba(225,210,188,0.78)",
    maxWidth: 190,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }}
>
  {memo.title || "Voice capsule"}
</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.16em",
                        color: "rgba(175, 158, 132, 0.52)",
                        fontFamily: "monospace",
                      }}
                    >
                      {formatTime(memo.duration)}
                    </span>
                    {memo.status === "processing" && (
  <span style={{ fontSize: 10, color: "rgba(205,170,100,0.45)" }}>
    Transcribing...
  </span>
)}

{memo.status === "ready" && memo.transcript_text && (
  <span style={{ fontSize: 10, color: "rgba(175,158,132,0.38)" }}>
    Transcript ready
  </span>
)}

{memo.status === "failed" && (
  <span style={{ fontSize: 10, color: "rgba(248,113,113,0.55)" }}>
    Transcription failed
  </span>
)}
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(175, 158, 132, 0.30)",
                      }}
                    >
                      {new Date(memo.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {new Date(memo.created_at).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <button
                  data-testid={`button-delete-${memo.id}`}
                  onClick={() => deleteMemo(memo.id)}
                  style={{
                    width: 34,
                    height: 34,
                    border: "none",
                    background: "none",
                    color: "rgba(175, 158, 132, 0.28)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={15} />
                </button>
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
                Speak your mind to the void.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
