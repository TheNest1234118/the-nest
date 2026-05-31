import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Mic, MicOff } from "lucide-react";

type VoiceIntensity = "off" | "minimal" | "guided";

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
    phrases: [
      "Less is okay.",
      "Let it settle.",
    ],
    minimalLine: "Less. Right now.",
    guidedLines: [
      "Less is okay.",
      "You don't need to figure anything out.",
      "Let it settle.",
    ],
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
    phrases: [
      "You're still here.",
      "Stay with the room.",
    ],
    minimalLine: "You're here.",
    guidedLines: [
      "You're still here.",
      "Notice one thing near you.",
      "Stay with the room.",
    ],
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
    phrases: [
      "Come back to the room.",
      "Feel your feet on the floor.",
      "The room is real.",
    ],
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
    phrases: [
      "Slower.",
      "Nothing urgent right now.",
    ],
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
    phrases: [
      "No pressure.",
      "That's enough.",
    ],
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
    phrases: [
      "Nothing left to find.",
      "Rest your eyes.",
      "This is quieter.",
    ],
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
    phrases: [
      "No more input.",
      "Just quiet.",
    ],
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
    phrases: [
      "Feel where you're sitting.",
      "One real thing near you.",
      "You're here.",
    ],
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
      // Audio temporarily disabled for recording/testing
    },
    [stop, playBassImpact]
  );

  const speakLine = useCallback((text: string) => {
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
  }, [voiceIntensityRef]);

  return { start, stop, speakLine };
}

export function Reset() {
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
    voiceIntensityRef.current = voiceIntensity;
  }, [voiceIntensity]);

  const { start, stop, speakLine } = useSessionAudio(voiceIntensityRef);

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
    } else {
      const t = setTimeout(() => {
        stop();
        setDone(true);
        setSessionActive(false);
      }, 10000);
      return () => clearTimeout(t);
    }
  }, [phraseIndex, selected, stop]);

  // Voice temporarily disabled for recording/testing
  // useEffect(() => { ... }, [sessionActive, selected, speakLine]);

  useEffect(() => {
    if (!done || !selected) return;
    try {
      localStorage.setItem(
        "nest_last_session",
        JSON.stringify({ key: selected.key, label: selected.label, completedAt: Date.now() })
      );
    } catch (_) {}
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
      voiceIntensity === "off" ? "minimal" :
      voiceIntensity === "minimal" ? "guided" : "off";
    setVoiceIntensity(next);
    try { localStorage.setItem("nest_voice_intensity", next); } catch (_) {}
    if (next === "off") window.speechSynthesis?.cancel();
  };

  const handleExit = () => {
    stop();
    setSelected(null);
    setSessionActive(false);
    setPhraseIndex(-1);
    setDone(false);
  };

  const profile = selected;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden"
      style={{ maxWidth: "480px", margin: "0 auto" }}
    >
      <AnimatePresence mode="wait">
        {!sessionActive && !done ? (
          <motion.div
            key="selector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.5 } }}
            className="flex-1 flex flex-col px-6 pt-12 pb-12"
          >
            <header className="mb-14 flex items-center justify-between">
              <Link
                href="/home"
                className="text-muted-foreground hover:text-foreground transition-colors duration-500"
              >
                <ChevronLeft strokeWidth={1} size={28} />
              </Link>
              <button
                data-testid="button-voice-toggle"
                onClick={cycleVoiceIntensity}
                title={`Voice: ${voiceIntensity}`}
                className={`flex items-center gap-2 text-xs tracking-[0.14em] transition-colors duration-500 ${
                  voiceIntensity === "off"
                    ? "text-muted-foreground/35"
                    : voiceIntensity === "minimal"
                    ? "text-muted-foreground/55"
                    : "text-primary/75"
                }`}
              >
                {voiceIntensity === "off" ? (
                  <MicOff size={13} strokeWidth={1.5} />
                ) : (
                  <Mic size={13} strokeWidth={1.5} />
                )}
                <span style={{ letterSpacing: "0.14em", textTransform: "lowercase" }}>
                  {voiceIntensity === "off" ? "voice off" : voiceIntensity}
                </span>
              </button>
            </header>

            <p className="font-serif text-2xl text-foreground/70 tracking-wide mb-14 leading-relaxed">
              How are you
              <br />
              feeling right now?
            </p>

            <div className="flex flex-col gap-3">
              {STATES.map((s, i) => (
                <motion.button
                  key={s.key}
                  data-testid={`button-state-${s.key}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: i * 0.07 }}
                  onClick={() => handleSelect(s)}
                  className="p-5 rounded-2xl border border-border/30 bg-card/10 text-sm font-light tracking-wide text-muted-foreground text-left transition-all duration-700 hover:bg-card/30 hover:text-foreground hover:border-border/50 active:scale-[0.99]"
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
            transition={{ duration: 2.5 }}
            className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: profile.overlayOpacity }}
              transition={{ duration: 3 }}
              className="absolute inset-0 z-0"
              style={{ backgroundColor: `rgb(${profile.overlayColor})` }}
            />

            <motion.div
              animate={{
                scale: [profile.breatheScale[0], profile.breatheScale[1], profile.breatheScale[0]],
                opacity: [profile.breatheOpacity[0], profile.breatheOpacity[1], profile.breatheOpacity[0]],
              }}
              transition={{ duration: profile.breatheDuration, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-72 h-72 rounded-full z-0 blur-[90px]"
              style={{ backgroundColor: profile.glowColor }}
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
              className="absolute w-36 h-36 rounded-full z-0 blur-[30px]"
              style={{ backgroundColor: profile.glowColor }}
            />

            <motion.div
              animate={{
                scale: [profile.breatheScale[0], profile.breatheScale[1], profile.breatheScale[0]],
                opacity: [0.06, 0.20, 0.06],
              }}
              transition={{ duration: profile.breatheDuration, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-44 h-44 rounded-full border z-0"
              style={{ borderColor: profile.glowColor }}
            />

            <div className="z-10 flex flex-col items-center gap-16 px-8">
              <div className="h-24 flex items-center justify-center text-center">
                <AnimatePresence mode="wait">
                  {phraseIndex >= 0 && phraseIndex < profile.phrases.length && (
                    <motion.p
                      key={phraseIndex}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 2.5, ease: "easeInOut" }}
                      className="font-serif text-xl tracking-wide leading-relaxed text-foreground/80"
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
              className="absolute bottom-10 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground/60 transition-colors duration-700 z-20"
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
            className="min-h-screen flex flex-col items-center justify-center gap-12 px-8"
          >
            <motion.div
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-64 h-64 rounded-full blur-[80px]"
              style={{ backgroundColor: "hsl(35 50% 35%)" }}
            />
            <p className="font-serif text-xl text-foreground/60 tracking-wide text-center z-10">
              Stay here as long as you need.
            </p>
            <Link
              href="/home"
              data-testid="button-return-nest"
              className="text-xs uppercase tracking-[0.25em] text-muted-foreground/50 hover:text-foreground/50 transition-colors duration-700 z-10"
            >
              return home
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
