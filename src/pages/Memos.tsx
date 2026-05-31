import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ChevronLeft, Mic, Square, Play, Pause, Trash2 } from "lucide-react";

interface Memo {
  id: string;
  audioUrl: string;
  mimeType: string;
  duration: number;
  createdAt: number;
}

function getSupportedMimeType(): string {
  const types = [
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
  const [memos, setMemos] = useLocalStorage<Memo[]>("nest_memos_v2", []);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
    };
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
      if (mimeType) options.mimeType = mimeType;

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const actualMime =
          recorder.mimeType || mimeType || "audio/mp4";
        const blob = new Blob(audioChunksRef.current, { type: actualMime });
        const duration = Math.max(
          1,
          Math.round((Date.now() - startTimeRef.current) / 1000)
        );

        const reader = new FileReader();
        reader.onloadend = () => {
          const memo: Memo = {
            id: crypto.randomUUID(),
            audioUrl: reader.result as string,
            mimeType: actualMime,
            duration,
            createdAt: Date.now(),
          };
          setMemos((prev) => [memo, ...prev]);
        };
        reader.readAsDataURL(blob);

        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingTime(0);
        setIsRecording(false);
      };

      recorder.onerror = () => {
        setError("Recording failed. Please try again.");
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
      };

      // iOS Safari needs a timeslice to fire ondataavailable reliably
      if (isIOS()) {
        recorder.start(1000);
      } else {
        recorder.start();
      }

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

    // On iOS, requestData before stop ensures final chunk is captured
    if (isIOS() && recorder.state === "recording") {
      try {
        recorder.requestData();
      } catch (_) {}
    }

    recorder.stop();
  }, []);

  const togglePlay = useCallback(
    (memo: Memo) => {
      if (playingId === memo.id) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      const audio = new Audio();
      // Set type hint for Safari
      audio.preload = "auto";
      audio.src = memo.audioUrl;
      audioRef.current = audio;

      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setPlayingId(null);
        setError("Could not play this memo.");
      };

      audio
        .play()
        .then(() => setPlayingId(memo.id))
        .catch(() => {
          setPlayingId(null);
          setError("Playback failed. Tap play again.");
        });
    },
    [playingId]
  );

  const deleteMemo = (id: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
    setMemos((prev) => prev.filter((m) => m.id !== id));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="min-h-screen bg-background text-foreground p-6 pt-12 flex flex-col max-w-md mx-auto"
    >
      <header className="mb-12 flex items-center gap-4">
        <Link
          href="/home"
          className="text-muted-foreground hover:text-foreground transition-colors duration-500"
        >
          <ChevronLeft strokeWidth={1} size={28} />
        </Link>
        <h2 className="font-serif text-2xl tracking-wider text-primary/80">
          Voice Capsules
        </h2>
      </header>

      {/* Recorder */}
      <div className="mb-12 flex flex-col items-center justify-center bg-card/20 p-8 rounded-3xl border border-border/30">
        <button
          data-testid="button-record-toggle"
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-700 ${
            isRecording
              ? "bg-red-900/20 text-red-400/80 border border-red-800/40"
              : "bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 border border-primary/30"
          }`}
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

        <div className="mt-6 h-6 flex items-center justify-center">
          {isRecording ? (
            <span className="text-red-400/70 font-mono tracking-widest text-sm">
              {formatTime(recordingTime)}
            </span>
          ) : (
            <span className="text-muted-foreground/40 text-xs uppercase tracking-widest">
              Tap to record
            </span>
          )}
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-400/60 text-center">{error}</p>
        )}
      </div>

      {/* Memo list */}
      <div className="flex flex-col gap-4 pb-20">
        {memos.map((memo, i) => (
          <motion.div
            key={memo.id}
            data-testid={`memo-item-${memo.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: Math.min(i * 0.08, 0.4) }}
            className="bg-card/20 p-5 rounded-2xl border border-border/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <button
                data-testid={`button-play-${memo.id}`}
                onClick={() => togglePlay(memo)}
                className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors duration-500 shrink-0"
              >
                {playingId === memo.id ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" className="ml-0.5" />
                )}
              </button>
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest text-muted-foreground/60 font-mono">
                  {formatTime(memo.duration)}
                </span>
                <span className="text-[10px] text-muted-foreground/35">
                  {new Date(memo.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  {" · "}
                  {new Date(memo.createdAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <button
              data-testid={`button-delete-${memo.id}`}
              onClick={() => deleteMemo(memo.id)}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground/30 hover:text-red-400/60 transition-colors duration-500"
            >
              <Trash2 size={15} />
            </button>
          </motion.div>
        ))}

        {memos.length === 0 && (
          <p className="text-center text-muted-foreground/35 text-sm font-light py-10 italic">
            Speak your mind to the void.
          </p>
        )}
      </div>
    </motion.div>
  );
}
