import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { getProfile } from "@/lib/subscription";
import { trackNestEvent, events } from "@/lib/analyticsEvents";
import { motion } from "framer-motion";
import { getEnabledVoicePrompts } from "@/lib/voicePrompts";
import { supabase } from "@/lib/supabase";
import {
  loadMemos,
  saveMemo,
  deleteMemoFromSupabase,
  getMemoAudioUrl,
  retryMemoTranscription,
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
  const [, navigate] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [plan, setPlan] = useState<"free" | "supporter">("free");
const [transcriptionCount, setTranscriptionCount] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedTranscript, setSelectedTranscript] = useState<Memo | null>(null);
  const [memoTitle, setMemoTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [createTranscript, setCreateTranscript] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const MAX_RECORDING_SECONDS = 15 * 60;
  const [promptIntroOpen, setPromptIntroOpen] = useState(false);
  const [voicePrompts, setVoicePrompts] = useState<ReturnType<typeof getEnabledVoicePrompts>>([]);
const [activePromptIndex, setActivePromptIndex] = useState(0);
  const CHUNK_SECONDS = 5 * 60;
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
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(Boolean(data.user));
      if (!data.user) setCreateTranscript(false);
    });
  }, []);
  useEffect(() => {
    setVoicePrompts(getEnabledVoicePrompts(4));
  }, []);
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
  useEffect(() => {
    async function loadUsage() {
      try {
        const profile = await getProfile();
  
        setPlan(profile?.plan || "free");
        setTranscriptionCount(profile?.transcriptions_this_month || 0);
      } catch (err) {
        console.error("Could not load transcription usage", err);
      }
    }
  
    loadUsage();
  }, []);
  useEffect(() => {
    const interval = setInterval(async () => {
      const hasProcessing = memos.some((m) => m.status === "processing");
  
      if (!hasProcessing) return;
  
      try {
        const data = await loadMemos();
        setMemos(data as Memo[]);
      } catch (err) {
        console.error("Could not refresh memos", err);
      }
    }, 5000);
  
    return () => clearInterval(interval);
  }, [memos]);
  const startRecording = async () => {
    setError(null);
    trackNestEvent(events.started_recording, {
      prompt_enabled: voicePrompts.length > 0,
    });
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
      finalTitle,
      createTranscript
    );
  
    // 4. UI updaten
    // 4. UI updaten
if (saved) {
  setMemos((prev) => [saved, ...prev]);
  const wasFirstVoiceMemo =
  localStorage.getItem("nest_first_voice_memo_saved") !== "true";

localStorage.setItem("nest_first_voice_memo_saved", "true");

if (wasFirstVoiceMemo) {
  localStorage.setItem("nest_show_mood_after_first_memo", "true");
}
  if (createTranscript && plan !== "supporter") {
    setTranscriptionCount((current) => Math.min(current + 1, 30));
  }

  if (createTranscript && plan === "supporter") {
    setTranscriptionCount((current) => current + 1);
  }

  setTimeout(() => {
    setIsSaving(false);
  
    if (wasFirstVoiceMemo) {
      navigate("/home");
    }
  }, 1200);
} else {
  setIsSaving(false);
}

// 5. cleanup
audioChunksRef.current = [];
setMemoTitle("");
setCreateTranscript(true);
setRecordingTime(0);

setIsRecording(false);
  } catch (err) {
    console.error("Could not save memo", err);
    setError("Could not save memo.");
    setIsRecording(false);
    setIsSaving(false);
  }
};
      recorder.start(1000);

      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          const next = t + 1;
      

      
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
    trackNestEvent(events.finished_recording, {
      seconds: recordingTime,
      prompt_enabled: voicePrompts.length > 0,
    });
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
        const audioUrl = memo.storage_path
        ? await getMemoAudioUrl(memo.storage_path)
        : memo.audio_url;
        if (!audioUrl) {
          throw new Error("Missing audio URL");
        }
  
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

    trackNestEvent(events.deleted_recording);
  
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
  const retryTranscription = async (id: string) => {
    try {
      setError(null);
  
      await retryMemoTranscription(id);
  
      setMemos((prev) =>
        prev.map((memo) =>
          memo.id === id
            ? {
                ...memo,
                status: "processing",
                transcript_error: null,
              }
            : memo
        )
      );
    } catch (err: any) {
      console.error("Could not retry transcription", err);
      setError(err.message || "Could not retry transcription.");
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
  const transcriptionLimitLabel =
  plan === "supporter"
    ? `${transcriptionCount} / ∞`
    : `${transcriptionCount} / 30`;

const transcriptionLimitReached =
  plan !== "supporter" && transcriptionCount >= 30;
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
        <div
  style={{
    marginBottom: 16,
    background: "rgba(255,255,255,0.024)",
    border: "1px solid rgba(255,255,255,0.055)",
    borderRadius: 16,
    padding: "14px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  }}
>
  <div>
    <div
      style={{
        fontSize: 13,
        color: "rgba(220,205,182,0.78)",
      }}
    >
      Searchable transcripts
    </div>

    <div
      style={{
        fontSize: 11,
        color: "rgba(155,140,118,0.42)",
        marginTop: 3,
        lineHeight: 1.45,
      }}
    >
      Only voice capsules with transcript enabled count.
    </div>
  </div>

  <span
    style={{
      fontSize: 13,
      color: transcriptionLimitReached
        ? "rgba(248,113,113,0.68)"
        : "rgba(205,170,100,0.62)",
      fontFamily: "monospace",
    }}
  >
    {transcriptionLimitLabel}
  </span>
</div>
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
          {promptIntroOpen && !isRecording && (
  <div
    style={{
      marginBottom: 24,
      background: "rgba(255,255,255,0.026)",
      border: "1px solid rgba(255,255,255,0.065)",
      borderRadius: 22,
      padding: 22,
    }}
  >
    <p
      style={{
        color: "rgba(205,170,100,0.46)",
        fontSize: 10,
        letterSpacing: ".16em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      Guided Voice Prompts
    </p>

    <h2
      style={{
        fontFamily: "Georgia, serif",
        color: "rgba(235,215,180,.92)",
        fontWeight: 400,
        fontSize: 24,
        marginBottom: 8,
      }}
    >
      Need a starting point?
    </h2>

    <p
      style={{
        color: "rgba(185,162,128,.52)",
        fontSize: 13,
        lineHeight: 1.6,
        marginBottom: 18,
      }}
    >
      These prompts are optional. They're simply here to help you capture what matters.
    </p>

    <div style={{ display: "grid", gap: 10 }}>
      {voicePrompts.map((prompt) => (
        <div
          key={prompt.id}
          style={{
            background: "rgba(255,255,255,.025)",
            border: "1px solid rgba(255,255,255,.055)",
            borderRadius: 14,
            padding: "12px 14px",
            color: "rgba(225,210,188,.8)",
            fontSize: 13,
          }}
        >
          • {prompt.text}
        </div>
      ))}
    </div>

    <button
      onClick={() => {
        setPromptIntroOpen(false);
        startRecording();
      }}
      style={{
        width: "100%",
        marginTop: 20,
        border: "1px solid rgba(205,170,100,.18)",
        background: "rgba(205,170,100,.08)",
        borderRadius: 16,
        padding: "14px",
        color: "rgba(225,205,176,.82)",
        letterSpacing: ".14em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      Start Recording
    </button>
  </div>
)}
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
<button
  type="button"
  onClick={() => {
    if (transcriptionLimitReached && !createTranscript) return;
    setCreateTranscript(!createTranscript);
  }}
  style={{
    width: "100%",
    marginTop: 18,
    background: "rgba(255,255,255,0.026)",
    border: createTranscript
      ? "1px solid rgba(205,170,100,0.20)"
      : "1px solid rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    transition: "all .25s ease",
  }}
>
  <div style={{ textAlign: "left" }}>
    <div
      style={{
        color: "rgba(230,215,190,0.88)",
        fontSize: 13,
      }}
    >
      Create searchable transcript
    </div>

    <div
      style={{
        marginTop: 4,
        fontSize: 11,
        lineHeight: 1.5,
        color: "rgba(175,158,132,0.42)",
      }}
    >
     {transcriptionLimitReached
  ? "Free monthly transcription limit reached. Audio recording still works."
  : "Makes this voice capsule searchable with AI."}
    </div>
  </div>

  <div
    style={{
      width: 22,
      height: 22,
      borderRadius: 999,
      border: createTranscript
        ? "1px solid rgba(205,170,100,.55)"
        : "1px solid rgba(255,255,255,.12)",
      background: createTranscript
        ? "rgba(205,170,100,.18)"
        : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all .25s ease",
      flexShrink: 0,
    }}
  >
    {createTranscript && (
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: "rgba(225,205,170,.95)",
        }}
      />
    )}
  </div>
</button>
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
{isRecording && voicePrompts.length > 0 && (
  <div
    style={{
      marginBottom: 18,
      textAlign: "center",
    }}
  >
    <p
      style={{
        color: "rgba(205,170,100,.46)",
        fontSize: 10,
        letterSpacing: ".16em",
        textTransform: "uppercase",
      }}
    >
      Prompt
    </p>

    <h3
      style={{
        marginTop: 8,
        color: "rgba(235,215,180,.88)",
        fontWeight: 400,
        fontSize: 20,
        fontFamily: "Georgia, serif",
      }}
    >
      {voicePrompts[activePromptIndex]?.text}
    </h3>

    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 10,
        marginTop: 18,
      }}
    >
     <button
  onClick={() => {
    trackNestEvent(events.changed_voice_prompt);

    setActivePromptIndex((i) =>
      Math.min(i + 1, voicePrompts.length - 1)
    );
  }}
>
  Next Prompt
</button>

<button
  onClick={() => {
    trackNestEvent(events.changed_voice_prompt);

    setActivePromptIndex((i) =>
      Math.min(i + 1, voicePrompts.length - 1)
    );
  }}
>
  Skip
</button>
    </div>
  </div>
)}
          <button
            data-testid="button-record-toggle"
            onClick={() => {
              if (isSaving) return;
            
              if (isRecording) {
                stopRecording();
                return;
              }
            
              if (voicePrompts.length > 0) {
                setPromptIntroOpen(true);
                return;
              }
            
              startRecording();
            }}
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
              cursor: isSaving ? "default" : "pointer",
opacity: isSaving ? 0.45 : 1,
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
          {isSaving && (
  <div
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
      style={{
        width: "100%",
        maxWidth: 340,
        background: "rgba(18,15,12,0.96)",
        border: "1px solid rgba(205,170,100,0.12)",
        borderRadius: 24,
        padding: 24,
        textAlign: "center",
        boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
      }}
    >
      <p
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 22,
          color: "rgba(235,215,180,0.92)",
          marginBottom: 10,
        }}
      >
        Saving your voice capsule
      </p>

      <p
        style={{
          fontSize: 13,
          lineHeight: 1.65,
          color: "rgba(198,178,150,0.62)",
        }}
      >
        Please wait until it appears in your list before leaving The Nest.
        <br />
        This may take a few moments.
      </p>
    </div>
  </div>
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
  <>
    <span style={{ fontSize: 10, color: "rgba(205,170,100,0.45)" }}>
      Transcribing...
    </span>

    <button
      onClick={() => retryTranscription(memo.id)}
      style={{
        marginTop: 4,
        background: "none",
        border: "none",
        padding: 0,
        color: "rgba(205,170,100,0.58)",
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      Retry transcription
    </button>
  </>
)}
{memo.status === "local" && (
  <span style={{ fontSize: 10, color: "rgba(175,158,132,0.38)" }}>
    Saved locally · no transcript
  </span>
)}
{memo.status === "ready" && memo.transcript_text && (
  <span style={{ fontSize: 10, color: "rgba(175,158,132,0.38)" }}>
    Transcript ready
  </span>
)}
{memo.status === "ready" && memo.transcript_text && (
  <button
    onClick={() => setSelectedTranscript(memo)}
    style={{
      marginTop: 4,
      background: "none",
      border: "none",
      padding: 0,
      color: "rgba(205,170,100,0.58)",
      fontSize: 10,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      cursor: "pointer",
      textAlign: "left",
    }}
  >
    View transcript
  </button>
)}
{memo.status === "failed" && (
  <span style={{ fontSize: 10, color: "rgba(248,113,113,0.55)" }}>
    Transcription failed
  </span>
)}
{memo.transcript_error?.includes("Free monthly transcription limit") && (
  <span style={{ fontSize: 10, color: "rgba(205,170,100,0.52)" }}>
    Audio saved · transcription limit reached
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
