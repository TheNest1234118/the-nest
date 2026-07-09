import React, { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";
import { saveMemo } from "@/lib/memos";

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

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function Waveform({ active }: { active: boolean }) {
  const bars = [8, 18, 28, 16, 35, 52, 26, 18, 42, 60, 36, 20, 14, 31, 48, 34];

  return (
    <div
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
            background: "linear-gradient(180deg, rgba(255,202,119,.96), rgba(255,104,95,.82))",
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

export function OnboardingVoice({ onFinished }: { onFinished: () => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

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

          await saveMemo(
            blob,
            duration,
            recorder.mimeType || "audio/webm",
            "Future self reminder",
            true
          );

          localStorage.setItem("nest_first_voice_memo_saved", "true");
          localStorage.setItem("nest_show_mood_after_first_memo", "true");

          setIsSaving(false);
          setRecordingTime(0);
          setIsRecording(false);

          onFinished();
        } catch (err) {
          console.error("Could not save onboarding memo", err);
          setError("Could not save your voice note.");
          setIsSaving(false);
          setIsRecording(false);
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err: any) {
      setError(err?.name === "NotAllowedError" ? "Microphone access denied." : "Could not start recording.");
    }
  };

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setIsRecording(false);
    setIsSaving(true);

    try {
      recorder.requestData();
    } catch {}

    recorder.stop();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",
        background: "#07070b",
        color: "rgba(238,225,204,.92)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 75% 45% at 50% 4%, rgba(222,179,96,.075) 0%, transparent 58%), radial-gradient(circle at 80% 35%, rgba(255,105,85,.065), transparent 36%), radial-gradient(circle at 12% 55%, rgba(90,145,255,.045), transparent 36%)",
        }}
      />

      <div
        style={{
          flex: 1,
          padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 32px",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header style={{ marginBottom: 22 }}>
          <p
            style={{
              fontSize: 10,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "rgba(222,179,96,.48)",
              marginBottom: 8,
            }}
          >
            First Voice Capsule
          </p>

          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 36,
              fontWeight: 400,
              color: "rgba(235,215,180,.94)",
              lineHeight: 1.06,
              margin: 0,
            }}
          >
            Leave your first thoughts.
          </h1>

          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              lineHeight: 1.6,
              color: "rgba(185,162,128,.55)",
            }}
          >
            This is just a short introduction.
          </p>
        </header>

        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 28,
            padding: "22px 18px",
            minHeight: 560,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, rgba(255,255,255,.038), rgba(255,255,255,.018))",
            border: "1px solid rgba(255,255,255,.07)",
            boxShadow: "0 24px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.035)",
          }}
        >
          <div>
            <div
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
                marginBottom: 22,
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
            </div>

            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "rgba(222,179,96,.48)",
                  fontSize: 10,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                Prompt
              </p>

              <h2
                style={{
                  margin: "10px auto 0",
                  maxWidth: 330,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 30,
                  lineHeight: 1.12,
                  fontWeight: 400,
                  color: "rgba(241,224,199,.95)",
                }}
              >
                What is one thing your future self should remember?
              </h2>
            </div>

            <BreathingOrb active={isRecording} />
            <Waveform active={isRecording} />
          </div>

          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: 16,
                marginBottom: 14,
              }}
            >
              <div />

              <motion.button
                type="button"
                disabled={isSaving}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  if (isSaving) return;
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording();
                  }
                }}
                style={{
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
                {isRecording ? <Square size={25} fill="currentColor" /> : <Mic size={32} />}
              </motion.button>

              <div />
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
              {isSaving ? "saving..." : isRecording ? formatTime(recordingTime) : "tap to start"}
            </div>

            {error && (
              <p style={{ marginTop: 12, fontSize: 12, color: "rgba(248,113,113,.68)", textAlign: "center" }}>
                {error}
              </p>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}