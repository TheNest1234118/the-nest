import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { getProfile } from "@/lib/subscription";
import { trackNestEvent, events } from "@/lib/analyticsEvents";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  ChevronLeft,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  X,
  Check,
  Sparkles,
  Wand2,
} from "lucide-react";
type MemosProps = {
  onboarding?: boolean;
  onFinished?: () => void;
};

type Memo = SupabaseMemo;


function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/aac",
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

const styles = {
  page: {
    minHeight: "100svh",
    background: "#07070b",
    position: "relative" as const,
    overflow: "hidden",
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    color: "rgba(238,225,204,.92)",
  },
  gold: "rgba(222, 179, 96, .88)",
  softGold: "rgba(235, 215, 180, .92)",
  muted: "rgba(185,162,128,.52)",
  card: {
    background: "linear-gradient(180deg, rgba(255,255,255,.038), rgba(255,255,255,.018))",
    border: "1px solid rgba(255,255,255,.07)",
    boxShadow: "0 24px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.035)",
  },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function Waveform({ active }: { active: boolean }) {
  const bars = [8, 18, 28, 16, 35, 52, 26, 18, 42, 60, 36, 20, 14, 31, 48, 34, 22, 12];

  return (
    <div
      aria-hidden
      style={{
        height: 66,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        opacity: active ? 1 : 0.58,
      }}
    >
      {bars.map((h, i) => (
        <motion.div
          key={i}
          animate={
            active
              ? {
                  height: [h * 0.45, h, h * 0.62, h * 0.9, h * 0.5],
                  opacity: [0.45, 1, 0.7, 0.95, 0.55],
                }
              : { height: h * 0.32, opacity: 0.32 }
          }
          transition={{
            duration: 0.9 + (i % 5) * 0.12,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.025,
          }}
          style={{
            width: 3,
            borderRadius: 999,
            background:
              "linear-gradient(180deg, rgba(255,202,119,.96), rgba(255,104,95,.82))",
            boxShadow: active ? "0 0 14px rgba(255,139,83,.34)" : "none",
          }}
        />
      ))}
    </div>
  );
}

function BreathingOrb({ active }: { active: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        width: 210,
        height: 210,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "8px auto 0",
      }}
    >
      <motion.div
        animate={
          active
            ? { scale: [1, 1.08, 1], rotate: [0, 12, 0], opacity: [0.85, 1, 0.9] }
            : { scale: [1, 1.03, 1], rotate: [0, 6, 0], opacity: [0.72, 0.86, 0.72] }
        }
        transition={{ duration: active ? 3.2 : 5.6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 185,
          height: 185,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 32%, rgba(255,218,147,.58), rgba(255,138,87,.16) 38%, rgba(130,70,35,.08) 62%, transparent 72%)",
          filter: "blur(.2px)",
          boxShadow: active
            ? "0 0 60px rgba(255,137,82,.25), inset 0 0 45px rgba(255,207,128,.14)"
            : "0 0 38px rgba(255,137,82,.14), inset 0 0 32px rgba(255,207,128,.08)",
        }}
      />

      {[0, 1, 2].map((n) => (
        <motion.div
          key={n}
          animate={{
            rotate: active ? [0, 360] : [0, 160],
            scale: active ? [0.96, 1.05, 0.98] : [0.95, 1, 0.95],
          }}
          transition={{
            rotate: { duration: 14 + n * 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 4 + n, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{
            position: "absolute",
            width: 145 + n * 18,
            height: 145 + n * 18,
            borderRadius: "46% 54% 57% 43% / 47% 40% 60% 53%",
            border: "1px solid rgba(255,190,108,.18)",
            boxShadow: "0 0 18px rgba(255,170,92,.07)",
          }}
        />
      ))}

      <motion.div
        animate={active ? { opacity: [0.45, 1, 0.45], scale: [0.96, 1.06, 0.96] } : {}}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "rgba(255,207,128,.95)",
          boxShadow: "0 0 24px rgba(255,191,105,.75)",
        }}
      />
    </div>
  );
}

function RecordButton({
  isRecording,
  isSaving,
  onClick,
}: {
  isRecording: boolean;
  isSaving: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      data-testid="button-record-toggle"
      type="button"
      disabled={isSaving}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      style={{
        position: "relative",
        width: 88,
        height: 88,
        borderRadius: 999,
        border: isRecording
          ? "1px solid rgba(255,112,102,.44)"
          : "1px solid rgba(222,179,96,.24)",
        background: isRecording
          ? "radial-gradient(circle at 50% 45%, rgba(255,116,104,.36), rgba(125,30,30,.24) 68%, rgba(255,255,255,.03))"
          : "radial-gradient(circle at 50% 42%, rgba(222,179,96,.18), rgba(222,179,96,.055) 68%, rgba(255,255,255,.025))",
        color: isRecording ? "rgba(255,129,119,.92)" : "rgba(239,214,171,.86)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isSaving ? "default" : "pointer",
        opacity: isSaving ? 0.45 : 1,
        boxShadow: isRecording
          ? "0 0 42px rgba(255,86,76,.18), inset 0 0 28px rgba(255,255,255,.035)"
          : "0 0 42px rgba(222,179,96,.12), inset 0 0 28px rgba(255,255,255,.035)",
      }}
    >
      {isRecording && (
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.35, 1], opacity: [0.34, 0.05, 0.34] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: -12,
            borderRadius: 999,
            border: "1px solid rgba(255,112,102,.35)",
          }}
        />
      )}

      {isRecording ? (
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <Square size={25} fill="currentColor" />
        </motion.div>
      ) : (
        <Mic size={32} />
      )}
    </motion.button>
  );
}

export function Memos({ onboarding = false, onFinished }: MemosProps) {
  const [, navigate] = useLocation();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [plan, setPlan] = useState<"free" | "supporter">("free");
  const [transcriptionCount, setTranscriptionCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedTranscript, setSelectedTranscript] = useState<Memo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createTranscript, setCreateTranscript] = useState(true);
  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  
  const [pendingMemo, setPendingMemo] = useState<Memo | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [titleLoading, setTitleLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
const [authOpen, setAuthOpen] = useState(false);
const [authEmail, setAuthEmail] = useState("");
const [authPassword, setAuthPassword] = useState("");
  const [promptIntroOpen, setPromptIntroOpen] = useState(false);
  const [voicePrompts, setVoicePrompts] = useState<ReturnType<typeof getEnabledVoicePrompts>>([]);
  const [activePromptIndex, setActivePromptIndex] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const search = "";
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setCreateTranscript(Boolean(data.user));
    });
  
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
  
      setUser(nextUser);
      setCreateTranscript(Boolean(nextUser));
  
      if (nextUser) {
        setAuthOpen(false);
      }
    });
  
    return () => subscription.unsubscribe();
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
    setPromptIntroOpen(false);

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

      recorder.ondataavailable = (e) => {
        if (!e.data || e.data.size === 0) return;
        audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (timerRef.current) clearInterval(timerRef.current);

        try {
          const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });

          const finalTitle = createTranscript ? "Generating title..." : "Voice capsule";

          const saved = await saveMemo(
            blob,
            duration,
            recorder.mimeType || "audio/webm",
            finalTitle,
            createTranscript
          );

          setPendingMemo(saved);
          setTitleOptions([]);
          setCustomTitle("");
          
          if (createTranscript) {
            setTitleModalOpen(true);
            waitForTranscriptAndGenerateTitles(saved.id);
          } else {
            setTitleLoading(false);
            setTitleModalOpen(true);
          }
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

          setMemos((prev) => [saved, ...prev]);

          setTimeout(() => {
            setIsSaving(false);
          }, 1200);

          audioChunksRef.current = [];
          const {
            data: { user },
          } = await supabase.auth.getUser();
          
          setCreateTranscript(Boolean(user));
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
        setRecordingTime((t) => t + 1);
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
  }, [recordingTime, voicePrompts.length]);

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
        const audioUrl = memo.storage_path ? await getMemoAudioUrl(memo.storage_path) : memo.audio_url;

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
    (memo.title || "Voice capsule").toLowerCase().includes(search.toLowerCase())
  );

  async function waitForTranscriptAndGenerateTitles(memoId: string) {
    setTitleLoading(true);

    for (let i = 0; i < 12; i++) {
      const data = await loadMemos();
      const freshMemo = (data as Memo[]).find((m) => m.id === memoId);

      if (freshMemo?.transcript_text) {
        setPendingMemo(freshMemo);

        const res = await fetch("/api/generate-memo-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: freshMemo.transcript_text }),
        });

        const json = await res.json();
        setTitleOptions(json.titles || []);
        setTitleLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    setTitleOptions([]);
    setTitleLoading(false);
  }

  const transcriptionLimitLabel =
    plan === "supporter" ? `${transcriptionCount} / ∞` : `${transcriptionCount} / 30`;

  const transcriptionLimitReached = plan !== "supporter" && transcriptionCount >= 30;

  const currentPrompt = voicePrompts[activePromptIndex]?.text || "What's on your mind?";

  const goNextPrompt = () => {
    trackNestEvent(events.changed_voice_prompt);
    setActivePromptIndex((i) => (voicePrompts.length ? (i + 1) % voicePrompts.length : 0));
  };
  async function handleLogin() {
    setError(null);
  
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
  
    if (error) {
      setError(error.message);
    }
  }
  
  async function handleRegister() {
    setError(null);
  
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });
  
    if (error) {
      setError(error.message);
    }
  }
  function finishTitleFlow() {
    setTitleModalOpen(false);
    setPendingMemo(null);
    setCustomTitle("");
    setTitleOptions([]);
  
    if (onboarding) {
      onFinished?.();
      return;
    }
  
    const shouldGoHomeAfterTitle =
      localStorage.getItem("nest_show_mood_after_first_memo") === "true";
  
    if (shouldGoHomeAfterTitle) {
      navigate("/home");
    }
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55 }}
      style={styles.page}
    >
      <style>{`
        @keyframes nestSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes softNoise {
          0% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(-1%, 1%, 0); }
          100% { transform: translate3d(0,0,0); }
        }

        @keyframes goldShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .nest-scroll::-webkit-scrollbar { width: 0; height: 0; }
        button { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 75% 45% at 50% 4%, rgba(222,179,96,.075) 0%, transparent 58%), radial-gradient(circle at 80% 35%, rgba(255,105,85,.065), transparent 36%), radial-gradient(circle at 12% 55%, rgba(90,145,255,.045), transparent 36%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <motion.div
        aria-hidden
        animate={{ opacity: [0.22, 0.36, 0.22] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px)",
          backgroundSize: "78px 78px",
          maskImage: "radial-gradient(circle at 50% 45%, black, transparent 72%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        className="nest-scroll"
        style={{
          flex: 1,
          padding: "0 20px 32px",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 46px)",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.65 }}
          style={{
            marginBottom: 22,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
         {!onboarding && (
  <Link href="/home">
            <button
              aria-label="Back home"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: "rgba(255,255,255,.028)",
                border: "1px solid rgba(255,255,255,.055)",
                cursor: "pointer",
                color: "rgba(235,215,180,.52)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft strokeWidth={1.45} size={22} />
            </button>
          </Link>
)}
          <div>
            <p
              style={{
                fontSize: 10,
                letterSpacing: ".22em",
                textTransform: "uppercase",
                color: "rgba(222,179,96,.48)",
                marginBottom: 6,
              }}
            >
              Voice Capsules
            </p>
            <h2
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 31,
                fontWeight: 400,
                color: "rgba(235, 215, 180, 0.94)",
                letterSpacing: "0.025em",
                lineHeight: 1.06,
                margin: 0,
              }}
            >
              What's on your mind?
            </h2>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.65 }}
          style={{
            ...styles.card,
            marginBottom: 16,
            borderRadius: 18,
            padding: "13px 15px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "rgba(229,213,189,.82)" }}>
              Searchable transcripts
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(155,140,118,0.48)",
                marginTop: 3,
                lineHeight: 1.45,
              }}
            >
              AI can remember and connect your voice capsules.
            </div>
          </div>

          <span
  onClick={() => {
    if (!user) setAuthOpen(true);
  }}
  style={{
    fontSize: 13,
    color: transcriptionLimitReached
      ? "rgba(248,113,113,0.72)"
      : "rgba(222,179,96,0.72)",
    fontFamily: "monospace",
    cursor: user ? "default" : "pointer",
  }}
>
  {user ? transcriptionLimitLabel : "Sign in"}
</span>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.7 }}
          style={{
            ...styles.card,
            position: "relative",
            overflow: "hidden",
            marginBottom: 18,
            borderRadius: 28,
            padding: "20px 18px 22px",
            minHeight: 560,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <motion.div
            aria-hidden
            animate={
              isRecording
                ? { opacity: [0.2, 0.4, 0.2], scale: [1, 1.08, 1] }
                : { opacity: [0.08, 0.16, 0.08], scale: [1, 1.03, 1] }
            }
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              width: 290,
              height: 290,
              left: "50%",
              top: 126,
              transform: "translateX(-50%)",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,144,82,.22), rgba(222,179,96,.08) 42%, transparent 70%)",
              filter: "blur(16px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <motion.div
                animate={isRecording ? { opacity: [0.72, 1, 0.72] } : { opacity: 0.66 }}
                transition={{ duration: 1.4, repeat: isRecording ? Infinity : 0 }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid rgba(255,255,255,.07)",
                  background: "rgba(255,255,255,.035)",
                  borderRadius: 999,
                  padding: "8px 12px",
                  color: "rgba(231,214,188,.76)",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: isRecording ? "rgba(255,102,94,.92)" : "rgba(222,179,96,.72)",
                    boxShadow: isRecording ? "0 0 14px rgba(255,102,94,.75)" : "none",
                  }}
                />
                {isRecording ? "Recording" : "Ready when you are"}
              </motion.div>

              <button
                type="button"
                onClick={() => {
                  if (!isRecording && voicePrompts.length > 0) {
                    setPromptIntroOpen(true);
                  }
                }}
                style={{
                  border: "1px solid rgba(255,255,255,.065)",
                  background: "rgba(255,255,255,.03)",
                  color: "rgba(222,179,96,.78)",
                  borderRadius: 999,
                  padding: "8px 11px",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  cursor: "pointer",
                }}
              >
                <Sparkles size={14} />
                prompts
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={isRecording ? `recording-${activePromptIndex}` : "idle"}
                initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                transition={{ duration: 0.45 }}
                style={{ textAlign: "center" }}
              >
                <p
                  style={{
                    color: "rgba(222,179,96,.48)",
                    fontSize: 10,
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    margin: 0,
                  }}
                >
                  {isRecording ? "Current prompt" : "Begin"}
                </p>

                <h3
                  style={{
                    margin: "10px auto 0",
                    maxWidth: 330,
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: isRecording ? 28 : 34,
                    lineHeight: 1.12,
                    fontWeight: 400,
                    color: "rgba(241,224,199,.95)",
                  }}
                >
                  {isRecording ? currentPrompt : "What’s on your mind?"}
                </h3>

                {!isRecording && (
                  <p
                    style={{
                      margin: "12px auto 0",
                      maxWidth: 290,
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "rgba(185,162,128,.55)",
                    }}
                  >
                    Talk freely. The Nest will hold the thought for you.
                  </p>
                )}
              </motion.div>
            </AnimatePresence>

            <BreathingOrb active={isRecording} />
            <Waveform active={isRecording} />

            {isRecording && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  margin: "0 auto 12px",
                  textAlign: "center",
                  color: "rgba(185,162,128,.55)",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Keep going. I’m listening.
              </motion.p>
            )}
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: 16,
                marginBottom: 14,
              }}
            >
              <button
                type="button"
                onClick={isRecording ? goNextPrompt : () => setPromptIntroOpen(true)}
                style={{
                  height: 52,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.07)",
                  background: "rgba(255,255,255,.028)",
                  color: "rgba(235,215,180,.72)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <Wand2 size={15} />
                {isRecording ? "Next" : "Prompt"}
              </button>

              <RecordButton
                isRecording={isRecording}
                isSaving={isSaving}
                onClick={() => {
                  if (isSaving) return;

                  if (isRecording) {
                    stopRecording();
                    return;
                  }

                  startRecording();
                }}
              />

              <button
                type="button"
                onClick={() => {
                  if (isRecording) stopRecording();
                }}
                style={{
                  height: 52,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.07)",
                  background: isRecording ? "rgba(222,179,96,.055)" : "rgba(255,255,255,.02)",
                  color: isRecording ? "rgba(235,215,180,.86)" : "rgba(185,162,128,.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: isRecording ? "pointer" : "default",
                  fontSize: 12,
                }}
              >
                <Check size={16} />
                Finish
              </button>
            </div>

            <div
              style={{
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isRecording ? "rgba(255,126,112,.82)" : "rgba(175,158,132,.36)",
                fontFamily: "monospace",
                letterSpacing: ".16em",
                fontSize: 13,
              }}
            >
              {isRecording ? formatTime(recordingTime) : "tap to start"}
            </div>

            {error && (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "rgba(248,113,113,.68)",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}
          </div>
        </motion.section>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              setAuthOpen(true);
              return;
            }
          
            if (transcriptionLimitReached && !createTranscript) return;
            setCreateTranscript(!createTranscript);
          }}
          style={{
            width: "100%",
            marginBottom: 12,
            ...styles.card,
            border: createTranscript
              ? "1px solid rgba(222,179,96,.18)"
              : "1px solid rgba(255,255,255,.06)",
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
            <div style={{ color: "rgba(230,215,190,.88)", fontSize: 13 }}>
              Create searchable transcript
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                lineHeight: 1.5,
                color: "rgba(175,158,132,.46)",
              }}
            >
          {!user
  ? "Create an account to enable AI transcription."
  : transcriptionLimitReached
  ? "Free monthly transcription limit reached. Audio recording still works."
  : "Makes this voice capsule searchable with AI."}
            </div>
          </div>

          {user ? (
  <div
    style={{
      width: 24,
      height: 24,
      borderRadius: 999,
      border: createTranscript
        ? "1px solid rgba(222,179,96,.58)"
        : "1px solid rgba(255,255,255,.12)",
      background: createTranscript
        ? "rgba(222,179,96,.18)"
        : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    {createTranscript && (
      <div
        style={{
          width: 9,
          height: 9,
          borderRadius: 999,
          background: "rgba(240,218,179,.95)",
        }}
      />
    )}
  </div>
) : (
  <div
    style={{
      width: 24,
      height: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "rgba(222,179,96,.45)",
      fontSize: 18,
    }}
  >
    🔒
  </div>
)}
        </button>

        <p
          style={{
            fontSize: 11,
            lineHeight: 1.6,
            color: "rgba(175,158,132,.38)",
            margin: "0 0 18px",
            textAlign: "center",
          }}
        >
          For longer voice capsules, recording in ~10 minute parts helps keep your memories safe.
        </p>

        {visibleMemos.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 32 }}>
            {visibleMemos.map((memo, i) => (
              <motion.div
                key={memo.id}
                data-testid={`memo-item-${memo.id}`}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, delay: Math.min(0.08 + i * 0.035, 0.45) }}
                style={{
                  ...styles.card,
                  borderRadius: 18,
                  padding: "14px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <button
                    data-testid={`button-play-${memo.id}`}
                    onClick={() => togglePlay(memo)}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 999,
                      border: "1px solid rgba(222,179,96,.13)",
                      background: "rgba(222,179,96,.055)",
                      color: "rgba(222,179,96,.68)",
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

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(225,210,188,.82)",
                        maxWidth: 210,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {memo.title || "Voice capsule"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 5,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          letterSpacing: ".12em",
                          color: "rgba(175,158,132,.48)",
                          fontFamily: "monospace",
                        }}
                      >
                        {formatTime(memo.duration)}
                      </span>

                      {memo.status === "processing" && (
                        <span style={{ fontSize: 10, color: "rgba(222,179,96,.54)" }}>
                          Transcribing...
                        </span>
                      )}

                      {memo.status === "local" && (
                        <span style={{ fontSize: 10, color: "rgba(175,158,132,.42)" }}>
                          Saved locally
                        </span>
                      )}

                      {memo.status === "ready" && memo.transcript_text && (
                        <button
                          onClick={() => setSelectedTranscript(memo)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "rgba(222,179,96,.62)",
                            fontSize: 10,
                            letterSpacing: ".12em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          View transcript
                        </button>
                      )}

                      {memo.status === "failed" && (
                        <button
                          onClick={() => retryTranscription(memo.id)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "rgba(248,113,113,.62)",
                            fontSize: 10,
                            cursor: "pointer",
                          }}
                        >
                          Retry transcription
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 10,
                        color: "rgba(175,158,132,.30)",
                      }}
                    >
                      {formatDate(memo.created_at)} · {formatClock(memo.created_at)}
                    </div>
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
                    color: "rgba(175,158,132,.28)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
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
                ...styles.card,
                borderRadius: 18,
                padding: "22px 24px",
                maxWidth: 270,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(175,158,132,.46)",
                  fontWeight: 300,
                  lineHeight: 1.6,
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                Speak your mind. The Nest will hold it.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {promptIntroOpen && !isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPromptIntroOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "rgba(6,5,8,.82)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 380,
                ...styles.card,
                background: "rgba(18,15,12,.96)",
                borderRadius: 28,
                padding: 22,
              }}
            >
              <button
                onClick={() => setPromptIntroOpen(false)}
                style={{
                  float: "right",
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.07)",
                  background: "rgba(255,255,255,.03)",
                  color: "rgba(235,215,180,.65)",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>

              <p
                style={{
                  color: "rgba(222,179,96,.52)",
                  fontSize: 10,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Guided Voice Prompts
              </p>

              <h2
                style={{
                  fontFamily: "Georgia, serif",
                  color: "rgba(235,215,180,.94)",
                  fontWeight: 400,
                  fontSize: 28,
                  margin: "0 0 8px",
                }}
              >
                Need a starting point?
              </h2>

              <p
                style={{
                  color: "rgba(185,162,128,.58)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  marginBottom: 18,
                }}
              >
                Pick a question, or start freely. Nothing is forced.
              </p>

              <div style={{ display: "grid", gap: 10 }}>
                {voicePrompts.map((prompt, index) => (
                  <button
                    type="button"
                    disabled={!user}
                    key={prompt.id}
                    onClick={() => {
                      setActivePromptIndex(index);
                      startRecording();
                    }}
                    style={{
                      background: "rgba(255,255,255,.028)",
                      border: "1px solid rgba(255,255,255,.06)",
                      borderRadius: 16,
                      padding: "13px 14px",
                      color: "rgba(225,210,188,.84)",
                      fontSize: 13,
                      textAlign: "left",
                      cursor: user ? "pointer" : "default",
opacity: user ? 1 : 0.45,
                    }}
                  >
                    {prompt.text}
                  </button>
                ))}
              </div>

              <button
                onClick={startRecording}
                style={{
                  width: "100%",
                  marginTop: 18,
                  border: "1px solid rgba(222,179,96,.20)",
                  background:
                    "linear-gradient(135deg, rgba(222,179,96,.16), rgba(255,103,91,.10))",
                  borderRadius: 18,
                  padding: "15px",
                  color: "rgba(235,215,180,.88)",
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Start Freely
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSaving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "rgba(6,5,8,.88)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.96 }}
              style={{
                width: "100%",
                maxWidth: 340,
                ...styles.card,
                background: "rgba(18,15,12,.96)",
                borderRadius: 26,
                padding: 26,
                textAlign: "center",
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  margin: "0 auto 18px",
                  border: "1px solid rgba(222,179,96,.22)",
                  background:
                    "conic-gradient(from 0deg, transparent, rgba(222,179,96,.75), transparent, rgba(255,112,102,.65), transparent)",
                  boxShadow: "0 0 42px rgba(222,179,96,.12)",
                }}
              />

              <p
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 24,
                  color: "rgba(235,215,180,.94)",
                  margin: "0 0 10px",
                }}
              >
                Saving your voice capsule
              </p>

              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: "rgba(198,178,150,.62)",
                  margin: 0,
                }}
              >
                The Nest is holding your thought. This may take a few moments.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedTranscript && (
        <div
          onClick={() => setSelectedTranscript(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "rgba(6,5,8,.88)",
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
              background: "rgba(18,15,12,.96)",
              border: "1px solid rgba(222,179,96,.12)",
              borderRadius: 24,
              padding: 22,
              boxShadow: "0 20px 80px rgba(0,0,0,.45)",
            }}
          >
            <p
              style={{
                fontSize: 10,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "rgba(222,179,96,.48)",
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
                color: "rgba(235,215,180,.92)",
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
                color: "rgba(220,205,182,.72)",
              }}
            >
              {selectedTranscript.transcript_text}
            </p>

            <button
              onClick={() => setSelectedTranscript(null)}
              style={{
                width: "100%",
                marginTop: 20,
                border: "1px solid rgba(222,179,96,.14)",
                background: "rgba(222,179,96,.06)",
                borderRadius: 14,
                padding: "13px 14px",
                color: "rgba(225,205,176,.78)",
                fontSize: 11,
                letterSpacing: ".16em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {titleModalOpen && pendingMemo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(6,5,8,.88)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              background: "rgba(18,15,12,.96)",
              border: "1px solid rgba(222,179,96,.12)",
              borderRadius: 24,
              padding: 22,
            }}
          >
            <p
              style={{
                fontSize: 10,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "rgba(222,179,96,.48)",
              }}
            >
              {createTranscript ? "AI Title" : "Title"}
            </p>

            <h2
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 24,
                fontWeight: 400,
                color: "rgba(235,215,180,.92)",
              }}
            >
             {createTranscript ? "Choose a title" : "Add a title"}
            </h2>

            {titleLoading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  padding: "28px 0",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    border: "3px solid rgba(222,179,96,.18)",
                    borderTop: "3px solid rgba(222,179,96,.9)",
                    animation: "nestSpin 1s linear infinite",
                  }}
                />

                <div
                  style={{
                    color: "rgba(235,215,180,.82)",
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  Creating title ideas…
                </div>

                <div
                  style={{
                    color: "rgba(185,162,128,.55)",
                    fontSize: 12,
                    textAlign: "center",
                    lineHeight: 1.5,
                    maxWidth: 220,
                  }}
                >
                  We're transcribing your recording and generating a few title suggestions.
                </div>
              </div>
            ) : titleOptions.length > 0 ? (
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {titleOptions.map((title) => (
                  <button
                    key={title}
                    onClick={async () => {
                      if (pendingMemo.id.startsWith("local-")) {
                        const updated = {
                          ...pendingMemo,
                          title,
                        };
                    
                        setMemos((prev) =>
                          prev.map((m) => (m.id === pendingMemo.id ? updated : m))
                        );
                    
                        const localMemos = JSON.parse(
                          localStorage.getItem("nest_local_memos") || "[]"
                        );
                    
                        localStorage.setItem(
                          "nest_local_memos",
                          JSON.stringify(
                            localMemos.map((m: any) =>
                              m.id === pendingMemo.id ? { ...m, title } : m
                            )
                          )
                        );
                        finishTitleFlow();
                        return;
                      }
                    
                      console.log("TITLE DEBUG before update", {
                        title,
                        pendingMemoId: pendingMemo.id,
                      });
                      
                      const { data, error } = await supabase
                        .from("memos")
                        .update({ title })
                        .eq("id", pendingMemo.id)
                        .select("id,title")
                        .maybeSingle();
                      
                      console.log("TITLE DEBUG after update", { data, error });
                      
                      if (error || !data) {
                        alert(error?.message || "No memo row updated");
                        return;
                      }
                      const fresh = await loadMemos();
                      setMemos(fresh as Memo[]);
                    
                      finishTitleFlow();
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "rgba(255,255,255,.026)",
                      border: "1px solid rgba(255,255,255,.065)",
                      borderRadius: 14,
                      padding: "13px 14px",
                      color: "rgba(225,210,188,.82)",
                      fontSize: 13,
                    }}
                  >
                    {title}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ color: "rgba(185,162,128,.52)", fontSize: 13, marginTop: 14 }}>
                {createTranscript
  ? "No AI titles yet. Write your own title below."
  : "Add your own title below."}
              </p>
            )}

            <input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Write your own title..."
              style={{
                width: "100%",
                marginTop: 14,
                background: "rgba(255,255,255,.026)",
                border: "1px solid rgba(255,255,255,.065)",
                borderRadius: 14,
                padding: "13px 14px",
                color: "rgba(225,210,188,.82)",
                outline: "none",
              }}
            />

<button
  disabled={!customTitle.trim()}
  onClick={async () => {
    const title = customTitle.trim();
    if (!title) return;
  
    if (pendingMemo.id.startsWith("local-")) {
      const updated = {
        ...pendingMemo,
        title,
      };
  
      setMemos((prev) =>
        prev.map((m) => (m.id === pendingMemo.id ? updated : m))
      );
  
      const localMemos = JSON.parse(
        localStorage.getItem("nest_local_memos") || "[]"
      );
  
      localStorage.setItem(
        "nest_local_memos",
        JSON.stringify(
          localMemos.map((m: any) =>
            m.id === pendingMemo.id ? { ...m, title } : m
          )
        )
      );
  
      finishTitleFlow();
      return;
    }
  
    console.log("CUSTOM TITLE DEBUG before update", {

      title,
    
      pendingMemoId: pendingMemo.id,
    
    });
    
    
    
    const { data, error } = await supabase
    
      .from("memos")
    
      .update({ title })
    
      .eq("id", pendingMemo.id)
    
      .select("id,title")
      .maybeSingle();
    
    
    
    console.log("CUSTOM TITLE DEBUG after update", { data, error });
    
    
    
    if (error || !data) {
    
      alert(error?.message || "No memo row updated");
    
      return;
    
    }
  
    const fresh = await loadMemos();
    setMemos(fresh as Memo[]);
  
    finishTitleFlow();
  }}
  style={{
    width: "100%",
    marginTop: 12,
    border: "1px solid rgba(222,179,96,.16)",
    background: "rgba(222,179,96,.07)",
    borderRadius: 14,
    padding: "13px 14px",
    color: "rgba(225,205,176,.78)",
    opacity: customTitle.trim() ? 1 : 0.45,
  }}
>
  Save custom title
</button>
          </div>
        </div>
      )}
      {authOpen && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 1400,
      background: "rgba(6,5,8,.88)",
      backdropFilter: "blur(10px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 360,
        background: "rgba(18,15,12,.96)",
        border: "1px solid rgba(222,179,96,.12)",
        borderRadius: 24,
        padding: 22,
      }}
    >
      <button
        onClick={() => setAuthOpen(false)}
        style={{
          float: "right",
          width: 34,
          height: 34,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.07)",
          background: "rgba(255,255,255,.03)",
          color: "rgba(235,215,180,.65)",
          cursor: "pointer",
        }}
      >
        <X size={16} />
      </button>

      <p
        style={{
          fontSize: 10,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: "rgba(222,179,96,.48)",
        }}
      >
        Account
      </p>

      <h2
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 26,
          fontWeight: 400,
          color: "rgba(235,215,180,.92)",
          marginBottom: 10,
        }}
      >
        Enable AI transcription
      </h2>

      <p
        style={{
          color: "rgba(185,162,128,.58)",
          fontSize: 13,
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        Create an account or log in to save this voice capsule with searchable AI transcription.
      </p>

      <input
        value={authEmail}
        onChange={(e) => setAuthEmail(e.target.value)}
        placeholder="Email"
        type="email"
        style={{
          width: "100%",
          marginBottom: 10,
          background: "rgba(255,255,255,.026)",
          border: "1px solid rgba(255,255,255,.065)",
          borderRadius: 14,
          padding: "13px 14px",
          color: "rgba(225,210,188,.82)",
          outline: "none",
        }}
      />

      <input
        value={authPassword}
        onChange={(e) => setAuthPassword(e.target.value)}
        placeholder="Password"
        type="password"
        style={{
          width: "100%",
          marginBottom: 14,
          background: "rgba(255,255,255,.026)",
          border: "1px solid rgba(255,255,255,.065)",
          borderRadius: 14,
          padding: "13px 14px",
          color: "rgba(225,210,188,.82)",
          outline: "none",
        }}
      />

      <button
        onClick={handleRegister}
        style={{
          width: "100%",
          border: "1px solid rgba(222,179,96,.16)",
          background: "rgba(222,179,96,.07)",
          borderRadius: 14,
          padding: "13px 14px",
          color: "rgba(225,205,176,.88)",
          marginBottom: 10,
          cursor: "pointer",
        }}
      >
        Create account
      </button>

      <button
        onClick={handleLogin}
        style={{
          width: "100%",
          border: "1px solid rgba(255,255,255,.07)",
          background: "rgba(255,255,255,.03)",
          borderRadius: 14,
          padding: "13px 14px",
          color: "rgba(225,205,176,.74)",
          cursor: "pointer",
        }}
      >
        Log in
      </button>
    </div>
  </div>
)}
    </motion.div>
  );
}
