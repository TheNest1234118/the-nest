import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Square, X } from "lucide-react";
import { saveMemo } from "@/lib/memos";
import { supabase } from "@/lib/supabase";

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
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }

  return "";
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);

  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

const card = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,.038), rgba(255,255,255,.018))",
  border: "1px solid rgba(255,255,255,.07)",
  boxShadow:
    "0 20px 60px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.035)",
};

function Waveform({ active }: { active: boolean }) {
  const bars = [
    6, 13, 20, 12, 25, 34, 19, 13, 27, 38, 24, 14, 10, 22, 31, 23,
  ];

  return (
    <div
      style={{
        height: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        opacity: active ? 1 : 0.58,
      }}
    >
      {bars.map((height, index) => (
        <motion.div
          key={index}
          animate={
            active
              ? {
                  height: [
                    height * 0.45,
                    height,
                    height * 0.62,
                    height * 0.9,
                    height * 0.5,
                  ],
                  opacity: [0.45, 1, 0.7, 0.95, 0.55],
                }
              : {
                  height: height * 0.32,
                  opacity: 0.32,
                }
          }
          transition={{
            duration: 0.9 + (index % 5) * 0.12,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
            delay: index * 0.025,
          }}
          style={{
            width: 3,
            borderRadius: 999,
            background:
              "linear-gradient(180deg, rgba(255,202,119,.96), rgba(255,104,95,.82))",
            boxShadow: active
              ? "0 0 12px rgba(255,139,83,.30)"
              : "none",
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
        width: 160,
        height: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "4px auto 0",
      }}
    >
      <motion.div
        animate={
          active
            ? {
                scale: [1, 1.08, 1],
                rotate: [0, 12, 0],
                opacity: [0.85, 1, 0.9],
              }
            : {
                scale: [1, 1.03, 1],
                rotate: [0, 6, 0],
                opacity: [0.72, 0.86, 0.72],
              }
        }
        transition={{
          duration: active ? 3.2 : 5.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          width: 140,
          height: 140,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 32%, rgba(255,218,147,.58), rgba(255,138,87,.16) 38%, rgba(130,70,35,.08) 62%, transparent 72%)",
          boxShadow: active
            ? "0 0 50px rgba(255,137,82,.25), inset 0 0 35px rgba(255,207,128,.14)"
            : "0 0 32px rgba(255,137,82,.14), inset 0 0 26px rgba(255,207,128,.08)",
        }}
      />

      {[0, 1, 2].map((number) => (
        <motion.div
          key={number}
          animate={{
            rotate: active ? [0, 360] : [0, 160],
            scale: active ? [0.96, 1.05, 0.98] : [0.95, 1, 0.95],
          }}
          transition={{
            rotate: {
              duration: 14 + number * 3,
              repeat: Infinity,
              ease: "linear",
            },
            scale: {
              duration: 4 + number,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          style={{
            position: "absolute",
            width: 108 + number * 14,
            height: 108 + number * 14,
            borderRadius: "46% 54% 57% 43% / 47% 40% 60% 53%",
            border: "1px solid rgba(255,190,108,.18)",
          }}
        />
      ))}

      <motion.div
        animate={
          active
            ? {
                opacity: [0.45, 1, 0.45],
                scale: [0.96, 1.06, 0.96],
              }
            : {}
        }
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "rgba(255,207,128,.95)",
          boxShadow: "0 0 20px rgba(255,191,105,.75)",
        }}
      />
    </div>
  );
}

export function OnboardingVoice({
  onFinished,
}: {
  onFinished: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [createTranscript, setCreateTranscript] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

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

    return () => {
      subscription.unsubscribe();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function handleLogin() {
    setError(null);

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

    if (loginError) {
      setError(loginError.message);
    }
  }

  async function handleRegister() {
    setError(null);

    const { error: registerError } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });

    if (registerError) {
      setError(registerError.message);
    }
  }

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

      recorder.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0) {
          return;
        }

        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        try {
          const duration = Math.max(
            1,
            Math.round((Date.now() - startTimeRef.current) / 1000)
          );

          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });

          await saveMemo(
            blob,
            duration,
            recorder.mimeType || "audio/webm",
            "Future self reminder",
            createTranscript
          );

          localStorage.setItem("nest_first_voice_memo_saved", "true");
          localStorage.setItem(
            "nest_show_mood_after_first_memo",
            "true"
          );

          setIsSaving(false);
          setRecordingTime(0);
          setIsRecording(false);

          onFinished();
        } catch (saveError) {
          console.error(
            "Could not save onboarding memo",
            saveError
          );

          setError("Could not save your voice note.");
          setIsSaving(false);
          setIsRecording(false);
        }
      };

      recorder.start(1000);

      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((currentTime) => currentTime + 1);
      }, 1000);
    } catch (recordingError: any) {
      setError(
        recordingError?.name === "NotAllowedError"
          ? "Microphone access denied."
          : "Could not start recording."
      );
    }
  };

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      return;
    }

    setIsRecording(false);
    setIsSaving(true);

    try {
      recorder.requestData();
    } catch {
      // requestData ist nicht in jedem Browser notwendig.
    }

    recorder.stop();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",
        height: "100svh",
        background: "#07070b",
        position: "relative",
        overflow: "hidden",
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        color: "rgba(238,225,204,.92)",
      }}
    >
      <style>{`
        .nest-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        input {
          box-sizing: border-box;
        }

        @media (max-height: 760px) {
          .nest-main-header {
            margin-bottom: 12px !important;
          }

          .nest-transcript-summary {
            margin-bottom: 10px !important;
          }

          .nest-recording-card {
            min-height: 430px !important;
          }
        }

        @media (max-height: 680px) {
          .nest-page-content {
            padding-top: calc(
              env(safe-area-inset-top, 0px) + 20px
            ) !important;
          }

          .nest-recording-card {
            min-height: 405px !important;
          }

          .nest-main-title {
            font-size: 29px !important;
          }

          .nest-prompt-title {
            font-size: 23px !important;
          }
        }
      `}</style>

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 75% 45% at 50% 4%, rgba(222,179,96,.075) 0%, transparent 58%), radial-gradient(circle at 80% 35%, rgba(255,105,85,.065), transparent 36%), radial-gradient(circle at 12% 55%, rgba(90,145,255,.045), transparent 36%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="nest-scroll nest-page-content"
        style={{
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
          padding: "0 20px 20px",
          paddingTop:
            "calc(env(safe-area-inset-top, 0px) + 28px)",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        <header
          className="nest-main-header"
          style={{ marginBottom: 14 }}
        >
          <p
            style={{
              fontSize: 9,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "rgba(222,179,96,.48)",
              margin: "0 0 6px",
            }}
          >
            First Voice Capsule
          </p>

          <h1
            className="nest-main-title"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 32,
              fontWeight: 400,
              color: "rgba(235,215,180,.94)",
              lineHeight: 1.03,
              margin: 0,
            }}
          >
            Leave your first thoughts.
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 13,
              lineHeight: 1.45,
              color: "rgba(185,162,128,.55)",
            }}
          >
            This is just a short introduction.
          </p>
        </header>

        <motion.div
          className="nest-transcript-summary"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.65 }}
          style={{
            ...card,
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 12,
            borderRadius: 16,
            padding: "10px 13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                color: "rgba(229,213,189,.82)",
              }}
            >
              Searchable transcripts
            </div>

            <div
              style={{
                fontSize: 10,
                color: "rgba(155,140,118,0.48)",
                marginTop: 2,
                lineHeight: 1.35,
              }}
            >
              AI can remember and connect your voice capsules.
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!user) {
                setAuthOpen(true);
              }
            }}
            style={{
              padding: 0,
              border: "none",
              background: "transparent",
              fontSize: 12,
              color: "rgba(222,179,96,0.72)",
              fontFamily: "monospace",
              cursor: user ? "default" : "pointer",
              flexShrink: 0,
            }}
          >
            {user ? "0 / ∞" : "Sign in"}
          </button>
        </motion.div>

        <section
          className="nest-recording-card"
          style={{
            ...card,
            position: "relative",
            overflow: "hidden",
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 10,
            borderRadius: 24,
            padding: "14px 16px 14px",
            minHeight: 455,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                border: "1px solid rgba(255,255,255,.07)",
                background: "rgba(255,255,255,.035)",
                borderRadius: 999,
                padding: "6px 10px",
                color: "rgba(231,214,188,.76)",
                fontSize: 11,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: isRecording
                    ? "rgba(255,102,94,.92)"
                    : "rgba(222,179,96,.72)",
                  boxShadow: isRecording
                    ? "0 0 12px rgba(255,102,94,.75)"
                    : "none",
                }}
              />

              {isRecording ? "Recording" : "Ready when you are"}
            </div>

            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "rgba(222,179,96,.48)",
                  fontSize: 9,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                Prompt
              </p>

              <h2
                className="nest-prompt-title"
                style={{
                  margin: "7px auto 0",
                  width: "100%",
                  maxWidth: 320,
                  fontFamily:
                    "Georgia, 'Times New Roman', serif",
                  fontSize: 26,
                  lineHeight: 1.04,
                  fontWeight: 400,
                  color: "rgba(241,224,199,.95)",
                }}
              >
                What is one thing your future self should
                remember?
              </h2>
            </div>

            <BreathingOrb active={isRecording} />

            <Waveform active={isRecording} />
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 7,
              }}
            >
              <motion.button
                type="button"
                disabled={isSaving}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  if (isSaving) {
                    return;
                  }

                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording();
                  }
                }}
                aria-label={
                  isRecording
                    ? "Stop recording"
                    : "Start recording"
                }
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  border: isRecording
                    ? "1px solid rgba(255,112,102,.44)"
                    : "1px solid rgba(222,179,96,.24)",
                  background: isRecording
                    ? "radial-gradient(circle at 50% 45%, rgba(255,116,104,.36), rgba(125,30,30,.24) 68%, rgba(255,255,255,.03))"
                    : "radial-gradient(circle at 50% 42%, rgba(222,179,96,.18), rgba(222,179,96,.055) 68%, rgba(255,255,255,.025))",
                  color: isRecording
                    ? "rgba(255,129,119,.92)"
                    : "rgba(239,214,171,.86)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isSaving ? "default" : "pointer",
                  opacity: isSaving ? 0.45 : 1,
                  boxShadow: isRecording
                    ? "0 0 34px rgba(255,86,76,.18), inset 0 0 22px rgba(255,255,255,.035)"
                    : "0 0 34px rgba(222,179,96,.12), inset 0 0 22px rgba(255,255,255,.035)",
                }}
              >
                {isRecording ? (
                  <Square size={21} fill="currentColor" />
                ) : (
                  <Mic size={27} />
                )}
              </motion.button>
            </div>

            <div
              style={{
                minHeight: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isRecording
                  ? "rgba(255,126,112,.82)"
                  : "rgba(175,158,132,.48)",
                fontFamily: "monospace",
                letterSpacing: ".14em",
                fontSize: 11,
              }}
            >
              {isSaving
                ? "saving..."
                : isRecording
                  ? formatTime(recordingTime)
                  : "tap to start"}
            </div>

            {error && (
              <p
                style={{
                  margin: "7px 0 0",
                  fontSize: 11,
                  color: "rgba(248,113,113,.68)",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}
          </div>
        </section>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              setAuthOpen(true);
              return;
            }

            setCreateTranscript(!createTranscript);
          }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            marginBottom:
              "calc(env(safe-area-inset-bottom, 0px) + 6px)",
            ...card,
            border: createTranscript
              ? "1px solid rgba(222,179,96,.18)"
              : "1px solid rgba(255,255,255,.06)",
            borderRadius: 16,
            padding: "11px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <div style={{ textAlign: "left", minWidth: 0 }}>
            <div
              style={{
                color: "rgba(230,215,190,.88)",
                fontSize: 12,
              }}
            >
              Create searchable transcript
            </div>

            <div
              style={{
                marginTop: 3,
                fontSize: 10,
                lineHeight: 1.35,
                color: "rgba(175,158,132,.46)",
              }}
            >
              {!user
                ? "Create an account to enable AI transcription."
                : "Makes this voice capsule searchable with AI."}
            </div>
          </div>

          {user ? (
            <div
              style={{
                width: 22,
                height: 22,
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
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "rgba(240,218,179,.95)",
                  }}
                />
              )}
            </div>
          ) : (
            <div
              style={{
                width: 22,
                height: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(222,179,96,.45)",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              🔒
            </div>
          )}
        </button>
      </div>

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
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              boxSizing: "border-box",
              background: "rgba(18,15,12,.96)",
              border: "1px solid rgba(222,179,96,.12)",
              borderRadius: 22,
              padding: 20,
            }}
          >
            <button
              type="button"
              onClick={() => setAuthOpen(false)}
              aria-label="Close account window"
              style={{
                float: "right",
                width: 32,
                height: 32,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.07)",
                background: "rgba(255,255,255,.03)",
                color: "rgba(235,215,180,.65)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={15} />
            </button>

            <p
              style={{
                fontSize: 9,
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
                fontSize: 24,
                lineHeight: 1.1,
                fontWeight: 400,
                color: "rgba(235,215,180,.92)",
                marginBottom: 12,
              }}
            >
              Enable AI transcription
            </h2>

            <input
              value={authEmail}
              onChange={(event) =>
                setAuthEmail(event.target.value)
              }
              placeholder="Email"
              type="email"
              autoComplete="email"
              style={{
                width: "100%",
                marginBottom: 9,
                background: "rgba(255,255,255,.026)",
                border: "1px solid rgba(255,255,255,.065)",
                borderRadius: 13,
                padding: "12px 13px",
                color: "rgba(225,210,188,.82)",
                outline: "none",
              }}
            />

            <input
              value={authPassword}
              onChange={(event) =>
                setAuthPassword(event.target.value)
              }
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              style={{
                width: "100%",
                marginBottom: 12,
                background: "rgba(255,255,255,.026)",
                border: "1px solid rgba(255,255,255,.065)",
                borderRadius: 13,
                padding: "12px 13px",
                color: "rgba(225,210,188,.82)",
                outline: "none",
              }}
            />

            <button
              type="button"
              onClick={handleRegister}
              style={{
                width: "100%",
                border: "1px solid rgba(222,179,96,.16)",
                background: "rgba(222,179,96,.07)",
                borderRadius: 13,
                padding: "12px 13px",
                color: "rgba(225,205,176,.88)",
                marginBottom: 9,
                cursor: "pointer",
              }}
            >
              Create account
            </button>

            <button
              type="button"
              onClick={handleLogin}
              style={{
                width: "100%",
                border: "1px solid rgba(255,255,255,.07)",
                background: "rgba(255,255,255,.03)",
                borderRadius: 13,
                padding: "12px 13px",
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