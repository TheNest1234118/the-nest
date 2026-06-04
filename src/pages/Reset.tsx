import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Mic, MicOff } from "lucide-react";
import {
  loadUserSettings,
  saveVoiceIntensity,
  saveLastSession,
  type VoiceIntensity,
} from "@/lib/userSettings";


type StateKey =
  | "overstimulated"
  | "disconnected"
  | "looping"
  | "slow_down"
  | "numb"
  | "scrolling"
  | "quiet"
  | "grounding";

interface StateProfile {
  key: StateKey;
  label: string;
  overlayColor: string;
  overlayOpacity: number;
  breatheDuration: number;
  breatheScale: [number, number];
  breatheOpacity: [number, number];
  glowColor: string;
  noiseFilter: number;
  noiseSoft: boolean;
  phrases: string[];
  minimalLine: string;
  guidedLines: string[];
  guidedPause: number;
  phrasePause: number;
  initialSilence: number;
}

const STATES: StateProfile[] = [
  {
    key: "overstimulated",
    label: "I feel overstimulated",
    overlayColor: "0 0 0",
    overlayOpacity: 0.45,
    breatheDuration: 10,
    breatheScale: [1, 1.28],
    breatheOpacity: [0.06, 0.16],
    glowColor: "hsl(25 30% 25%)",
    noiseFilter: 300,
    noiseSoft: true,
    phrases: ["Less is okay.", "Let it settle."],
    minimalLine: "Less. Right now.",
    guidedLines: ["Less is okay.", "You don't need to figure anything out.", "Let it settle."],
    guidedPause: 22000,
    phrasePause: 22000,
    initialSilence: 10000,
  },
  {
    key: "disconnected",
    label: "I feel disconnected",
    overlayColor: "20 10 5",
    overlayOpacity: 0.10,
    breatheDuration: 8,
    breatheScale: [1, 1.40],
    breatheOpacity: [0.12, 0.32],
    glowColor: "hsl(35 65% 42%)",
    noiseFilter: 900,
    noiseSoft: true,
    phrases: ["You're still here.", "Stay with the room."],
    minimalLine: "You're here.",
    guidedLines: ["You're still here.", "Notice one thing near you.", "Stay with the room."],
    guidedPause: 20000,
    phrasePause: 20000,
    initialSilence: 10000,
  },
  {
    key: "looping",
    label: "Thoughts keep looping",
    overlayColor: "30 25 20",
    overlayOpacity: 0.20,
    breatheDuration: 7,
    breatheScale: [1, 1.25],
    breatheOpacity: [0.10, 0.28],
    glowColor: "hsl(200 25% 30%)",
    noiseFilter: 800,
    noiseSoft: false,
    phrases: ["Come back to the room.", "Feel your feet on the floor.", "The room is real."],
    minimalLine: "Come back to the room.",
    guidedLines: ["Come back.", "Feel your feet.", "The room is real."],
    guidedPause: 20000,
    phrasePause: 18000,
    initialSilence: 8000,
  },
  {
    key: "slow_down",
    label: "I can't mentally slow down",
    overlayColor: "5 5 8",
    overlayOpacity: 0.40,
    breatheDuration: 14,
    breatheScale: [1, 1.20],
    breatheOpacity: [0.05, 0.15],
    glowColor: "hsl(220 20% 22%)",
    noiseFilter: 350,
    noiseSoft: true,
    phrases: ["Slower.", "Nothing urgent right now."],
    minimalLine: "Slower.",
    guidedLines: ["Slower.", "Nothing urgent right now.", "One thing at a time."],
    guidedPause: 25000,
    phrasePause: 25000,
    initialSilence: 12000,
  },
  {
    key: "numb",
    label: "I feel emotionally numb",
    overlayColor: "10 8 6",
    overlayOpacity: 0.25,
    breatheDuration: 10,
    breatheScale: [1, 1.25],
    breatheOpacity: [0.08, 0.20],
    glowColor: "hsl(35 42% 28%)",
    noiseFilter: 650,
    noiseSoft: true,
    phrases: ["No pressure.", "That's enough."],
    minimalLine: "Stay near something warm.",
    guidedLines: ["No pressure.", "Just stay here.", "That's enough."],
    guidedPause: 22000,
    phrasePause: 22000,
    initialSilence: 11000,
  },
  {
    key: "scrolling",
    label: "I've been scrolling too long",
    overlayColor: "10 8 5",
    overlayOpacity: 0.30,
    breatheDuration: 9,
    breatheScale: [1, 1.30],
    breatheOpacity: [0.08, 0.22],
    glowColor: "hsl(30 50% 35%)",
    noiseFilter: 600,
    noiseSoft: true,
    phrases: ["Nothing left to find.", "Rest your eyes.", "This is quieter."],
    minimalLine: "Nothing left to find.",
    guidedLines: ["Put it down.", "Nothing online needs you.", "Rest your eyes."],
    guidedPause: 20000,
    phrasePause: 18000,
    initialSilence: 9000,
  },
  {
    key: "quiet",
    label: "I need quiet",
    overlayColor: "0 0 0",
    overlayOpacity: 0.44,
    breatheDuration: 13,
    breatheScale: [1, 1.14],
    breatheOpacity: [0.04, 0.10],
    glowColor: "hsl(220 12% 18%)",
    noiseFilter: 200,
    noiseSoft: true,
    phrases: ["No more input.", "Just quiet."],
    minimalLine: "Just quiet.",
    guidedLines: ["No more input.", "Let the room be enough."],
    guidedPause: 28000,
    phrasePause: 28000,
    initialSilence: 14000,
  },
  {
    key: "grounding",
    label: "I need grounding",
    overlayColor: "8 5 2",
    overlayOpacity: 0.15,
    breatheDuration: 8,
    breatheScale: [1, 1.28],
    breatheOpacity: [0.10, 0.26],
    glowColor: "hsl(30 52% 33%)",
    noiseFilter: 820,
    noiseSoft: true,
    phrases: ["Feel where you're sitting.", "One real thing near you.", "You're here."],
    minimalLine: "Feel the floor.",
    guidedLines: ["Feel where you're sitting.", "One thing near you.", "You're here."],
    guidedPause: 20000,
    phrasePause: 18000,
    initialSilence: 8000,
  },
];

function useSessionAudio(voiceIntensityRef: React.MutableRefObject<VoiceIntensity>) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);

  const stop = useCallback(() => {
    try { noiseRef.current?.stop(); } catch (_) {}
    noiseRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    gainRef.current = null;
    window.speechSynthesis?.cancel();
  }, []);

  const playBassImpact = useCallback((ctx: AudioContext, gain: GainNode) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.frequency.value = 55;
    osc.type = "sine";

    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.05);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

    osc.connect(env);
    env.connect(gain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2.5);
  }, []);

  const start = useCallback(
    (_p: StateProfile) => {
      stop();
    },
    [stop, playBassImpact]
  );

  const speakLine = useCallback(
    (text: string) => {
      if (voiceIntensityRef.current === "off" || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();

      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.88;
      utt.pitch = 1.0;
      utt.volume = 0.72;

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.name === "Samantha" && v.lang.startsWith("en")) ??
        voices.find((v) => v.name.includes("Google US English")) ??
        voices.find((v) => v.name === "Alex" && v.lang.startsWith("en")) ??
        voices.find((v) => v.name.includes("Karen") && v.lang.startsWith("en")) ??
        voices.find((v) => v.name.includes("Moira") && v.lang.startsWith("en")) ??
        voices.find((v) => v.lang.startsWith("en-US")) ??
        voices.find((v) => v.lang.startsWith("en"));

      if (preferred) utt.voice = preferred;

      window.speechSynthesis.speak(utt);
    },
    [voiceIntensityRef]
  );

  return { start, stop, speakLine };
}

export function Reset() {
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<StateProfile | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(-1);
  const [voiceIntensity, setVoiceIntensity] = useState<VoiceIntensity>(() => {
    try {
      const stored = localStorage.getItem("nest_voice_intensity");
      if (stored === "off" || stored === "minimal" || stored === "guided") return stored;
      if (localStorage.getItem("nest_voice_enabled") === "true") return "guided";
    } catch (_) {}
    return "minimal";
  });
  const voiceIntensityRef = useRef<VoiceIntensity>(voiceIntensity);
  const [done, setDone] = useState(false);
  useEffect(() => {
    async function initSettings() {
      try {
        const settings = await loadUserSettings();
  
        if (
          settings?.voice_intensity === "off" ||
          settings?.voice_intensity === "minimal" ||
          settings?.voice_intensity === "guided"
        ) {
          setVoiceIntensity(settings.voice_intensity);
          return;
        }
  
        const localVoice = localStorage.getItem("nest_voice_intensity");
        if (
          localVoice === "off" ||
          localVoice === "minimal" ||
          localVoice === "guided"
        ) {
          setVoiceIntensity(localVoice);
        }
      } catch (err) {
        console.error("Could not load reset settings", err);
      }
    }
  
    initSettings();
  }, []);

  useEffect(() => {
    voiceIntensityRef.current = voiceIntensity;
  }, [voiceIntensity]);

  const { start, stop } = useSessionAudio(voiceIntensityRef);

  const handleSelect = (p: StateProfile) => {
    setSelected(p);
    setDone(false);

    setTimeout(() => {
      setSessionActive(true);
      start(p);
    }, 1200);
  };

  useEffect(() => {
    if (!sessionActive || !selected) return;
    const t = setTimeout(() => setPhraseIndex(0), selected.initialSilence);
    return () => clearTimeout(t);
  }, [sessionActive, selected]);

  useEffect(() => {
    if (!selected || phraseIndex < 0) return;

    const lines = selected.phrases;

    if (phraseIndex < lines.length) {
      const t = setTimeout(() => setPhraseIndex((i) => i + 1), selected.phrasePause);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      stop();
      setDone(true);
      setSessionActive(false);
    }, 10000);

    return () => clearTimeout(t);
  }, [phraseIndex, selected, stop]);

  useEffect(() => {
    if (!done || !selected) return;
  
    saveLastSession({
      key: selected.key,
      label: selected.label,
      completedAt: Date.now(),
    }).catch((err) => {
      console.error("Could not save last session", err);
    });
  }, [done, selected]);

  useEffect(() => {
    const requestedKey = localStorage.getItem("nest_reset_state");
    if (!requestedKey) return;

    localStorage.removeItem("nest_reset_state");

    const found = STATES.find((s) => s.key === requestedKey);
    if (!found) return;

    const t = setTimeout(() => handleSelect(found), 300);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cycleVoiceIntensity = () => {
    const next: VoiceIntensity =
      voiceIntensity === "off"
        ? "minimal"
        : voiceIntensity === "minimal"
        ? "guided"
        : "off";
  
    setVoiceIntensity(next);
  
    saveVoiceIntensity(next).catch((err) => {
      console.error("Could not save voice intensity", err);
    });
  
    if (next === "off") window.speechSynthesis?.cancel();
  };
  const handleExit = () => {
    stop();
    setSelected(null);
    setSessionActive(false);
    setPhraseIndex(-1);
    setDone(false);
    navigate("/home");
  };

  const profile = selected;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9 }}
      style={{
        minHeight: "100svh",
        background: "#09090d",
        position: "relative",
        overflow: "hidden",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        color: "rgba(235, 220, 198, 0.88)",
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

      <AnimatePresence mode="wait">
        {!sessionActive && !done ? (
          <motion.div
            key="selector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.2 } }}
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
                marginBottom: 42,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
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

              <button
                data-testid="button-voice-toggle"
                onClick={cycleVoiceIntensity}
                title={`Voice: ${voiceIntensity}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(205, 170, 100, 0.04)",
                  border: "1px solid rgba(205, 170, 100, 0.10)",
                  borderRadius: 999,
                  padding: "8px 11px",
                  cursor: "pointer",
                  color:
                    voiceIntensity === "off"
                      ? "rgba(175, 158, 132, 0.35)"
                      : voiceIntensity === "minimal"
                      ? "rgba(175, 158, 132, 0.55)"
                      : "rgba(205, 170, 100, 0.72)",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "lowercase",
                }}
              >
                {voiceIntensity === "off" ? (
                  <MicOff size={13} strokeWidth={1.5} />
                ) : (
                  <Mic size={13} strokeWidth={1.5} />
                )}
                {voiceIntensity === "off" ? "voice off" : voiceIntensity}
              </button>
            </motion.header>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.7 }}
              style={{ marginBottom: 30 }}
            >
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(185, 158, 115, 0.36)",
                  marginBottom: 10,
                  fontWeight: 500,
                }}
              >
                Reality Reset
              </p>

              <h2
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 28,
                  fontWeight: 400,
                  color: "rgba(235, 215, 180, 0.90)",
                  letterSpacing: "0.03em",
                  lineHeight: 1.22,
                  marginBottom: 8,
                }}
              >
                How are you
                <br />
                feeling right now?
              </h2>

              <p
                style={{
                  fontSize: 13,
                  color: "rgba(185, 162, 128, 0.48)",
                  fontWeight: 300,
                  lineHeight: 1.5,
                  maxWidth: 280,
                  letterSpacing: "0.01em",
                }}
              >
                Choose one. Let the room get quieter.
              </p>
            </motion.div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {STATES.map((s, i) => (
                <motion.button
                  key={s.key}
                  data-testid={`button-state-${s.key}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: Math.min(0.22 + i * 0.04, 0.55) }}
                  onClick={() => handleSelect(s)}
                  style={{
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.026)",
                    border: "1px solid rgba(255, 255, 255, 0.065)",
                    borderRadius: 16,
                    padding: "17px 18px",
                    textAlign: "left",
                    cursor: "pointer",
                    color: "rgba(220, 205, 182, 0.74)",
                    fontSize: 13,
                    fontWeight: 300,
                    letterSpacing: "0.01em",
                  }}
                >
                  {s.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : sessionActive && profile ? (
          <motion.div
            key={`session-${profile.key}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.0 }}
            style={{
              minHeight: "100svh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: profile.overlayOpacity }}
              transition={{ duration: 3 }}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 0,
                backgroundColor: `rgb(${profile.overlayColor})`,
              }}
            />

            <motion.div
              animate={{
                scale: [profile.breatheScale[0], profile.breatheScale[1], profile.breatheScale[0]],
                opacity: [profile.breatheOpacity[0], profile.breatheOpacity[1], profile.breatheOpacity[0]],
              }}
              transition={{ duration: profile.breatheDuration, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                width: 288,
                height: 288,
                borderRadius: 999,
                zIndex: 0,
                filter: "blur(90px)",
                backgroundColor: profile.glowColor,
              }}
            />

            <motion.div
              animate={{
                scale: [
                  profile.breatheScale[0] * 0.6,
                  profile.breatheScale[1] * 0.6,
                  profile.breatheScale[0] * 0.6,
                ],
                opacity: [
                  profile.breatheOpacity[0] * 2,
                  profile.breatheOpacity[1] * 2,
                  profile.breatheOpacity[0] * 2,
                ],
              }}
              transition={{ duration: profile.breatheDuration, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                width: 144,
                height: 144,
                borderRadius: 999,
                zIndex: 0,
                filter: "blur(30px)",
                backgroundColor: profile.glowColor,
              }}
            />

            <motion.div
              animate={{
                scale: [profile.breatheScale[0], profile.breatheScale[1], profile.breatheScale[0]],
                opacity: [0.06, 0.20, 0.06],
              }}
              transition={{ duration: profile.breatheDuration, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                width: 176,
                height: 176,
                borderRadius: 999,
                border: `1px solid ${profile.glowColor}`,
                zIndex: 0,
              }}
            />

            <div
              style={{
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 64,
                padding: "0 32px",
              }}
            >
              <div
                style={{
                  height: 96,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <AnimatePresence mode="wait">
                  {phraseIndex >= 0 && phraseIndex < profile.phrases.length && (
                    <motion.p
                      key={phraseIndex}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 2.5, ease: "easeInOut" }}
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: 21,
                        letterSpacing: "0.03em",
                        lineHeight: 1.5,
                        color: "rgba(235, 220, 198, 0.82)",
                      }}
                    >
                      {profile.phrases[phraseIndex]}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.30 }}
              transition={{ delay: 6, duration: 2 }}
              onClick={handleExit}
              data-testid="button-exit-session"
              style={{
                position: "absolute",
                bottom: 96,
                zIndex: 20,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(175, 158, 132, 0.45)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.25em",
              }}
            >
              leave
            </motion.button>
          </motion.div>
        ) : done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            style={{
              minHeight: "100svh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 48,
              padding: "0 32px",
              position: "relative",
            }}
          >
            <motion.div
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                width: 256,
                height: 256,
                borderRadius: 999,
                filter: "blur(80px)",
                backgroundColor: "hsl(35 50% 35%)",
              }}
            />

            <p
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 21,
                color: "rgba(235, 220, 198, 0.62)",
                letterSpacing: "0.03em",
                textAlign: "center",
                zIndex: 10,
              }}
            >
              Stay here as long as you need.
            </p>

            <Link href="/home" data-testid="button-return-nest">
              <span
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.25em",
                  color: "rgba(175, 158, 132, 0.50)",
                  zIndex: 10,
                }}
              >
                return home
              </span>
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
