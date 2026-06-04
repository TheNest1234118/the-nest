import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";

// ─── Types & constants ────────────────────────────────────────────────────────

export interface Preset {
  key: string;
  label: string;
  description: string;
  lowpassFreq: number;
  highshelfGain: number;
  bassGain: number;
  masterGain: number;
  reverbAmount: number;
  reverbDecay: number;
}

export const PRESETS: Preset[] = [
  { key: "deep_night",     label: "Deep Night",     description: "Slow, heavy, distant",       lowpassFreq: 800,  highshelfGain: -8,  bassGain: 4, masterGain: 0.82, reverbAmount: 0.35, reverbDecay: 4 },
  { key: "quiet_rain",     label: "Quiet Rain",     description: "Soft edges, warmth",         lowpassFreq: 3500, highshelfGain: -3,  bassGain: 2, masterGain: 0.88, reverbAmount: 0.18, reverbDecay: 2 },
  { key: "foggy",          label: "Foggy",          description: "Blurred and far away",       lowpassFreq: 1200, highshelfGain: -11, bassGain: 3, masterGain: 0.75, reverbAmount: 0.55, reverbDecay: 5 },
  { key: "warm_room",      label: "Warm Room",      description: "Close and still",            lowpassFreq: 5000, highshelfGain: -5,  bassGain: 6, masterGain: 0.90, reverbAmount: 0.12, reverbDecay: 2 },
  { key: "midnight_train", label: "Midnight Train", description: "Moving through the dark",    lowpassFreq: 2200, highshelfGain: -7,  bassGain: 3, masterGain: 0.82, reverbAmount: 0.10, reverbDecay: 2 },
  { key: "heavy_mind",     label: "Heavy Mind",     description: "Slowed, submerged",          lowpassFreq: 650,  highshelfGain: -14, bassGain: 2, masterGain: 0.72, reverbAmount: 0.45, reverbDecay: 5 },
  { key: "soft_distance",  label: "Soft Distance",  description: "As if from another room",    lowpassFreq: 1400, highshelfGain: -10, bassGain: 4, masterGain: 0.72, reverbAmount: 0.65, reverbDecay: 6 },
  { key: "ocean_drift",    label: "Ocean Drift",    description: "Open and floating",          lowpassFreq: 2800, highshelfGain: -5,  bassGain: 3, masterGain: 0.84, reverbAmount: 0.30, reverbDecay: 3 },
];

export const SPEEDS = {
  normal: { label: "Normal", rate: 1.00 },
  slowed: { label: "Slowed", rate: 0.88 },
  deep:   { label: "Deep",   rate: 0.76 },
} as const;
export type SpeedKey = keyof typeof SPEEDS;

export type AmbienceKey = "off" | "rain" | "night" | "wind";
export const AMBIENCE_LIST: { key: AmbienceKey; label: string }[] = [
  { key: "off",   label: "None"  },
  { key: "rain",  label: "Rain"  },
  { key: "night", label: "Night" },
  { key: "wind",  label: "Wind"  },
];

// Ambience base gain per type (before user volume multiplier)
const AMBIENCE_BASE_GAIN: Record<Exclude<AmbienceKey, "off">, number> = {
  rain:  0.22,
  night: 0.12,
  wind:  0.20,
};

// ─── Audio helpers (pure, no hooks) ──────────────────────────────────────────

function createReverb(ctx: AudioContext, decaySeconds: number): ConvolverNode {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * decaySeconds);
  const impulse = ctx.createBuffer(2, length, sr);
  for (let c = 0; c < 2; c++) {
    const d = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = impulse;
  return conv;
}

interface MusicChain {
  source: AudioBufferSourceNode;
  masterGain: GainNode;
}

// Connects: source → filters → masterGain → output
function buildMusicChain(
  ctx: AudioContext,
  buffer: AudioBuffer,
  preset: Preset,
  rate: number,
  offset: number,
  output: AudioNode,
  initialGain?: number,
): MusicChain {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.playbackRate.value = rate;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = preset.lowpassFreq;

  const highshelf = ctx.createBiquadFilter();
  highshelf.type = "highshelf";
  highshelf.frequency.value = 3500;
  highshelf.gain.value = preset.highshelfGain;

  const bass = ctx.createBiquadFilter();
  bass.type = "peaking";
  bass.frequency.value = 200;
  bass.Q.value = 0.8;
  bass.gain.value = preset.bassGain;

  const dryGain = ctx.createGain();
  dryGain.gain.value = 1 - preset.reverbAmount;
  const wetGain = ctx.createGain();
  wetGain.gain.value = preset.reverbAmount;
  const conv = createReverb(ctx, preset.reverbDecay);

  const master = ctx.createGain();
  master.gain.value = initialGain !== undefined ? initialGain : preset.masterGain;

  source.connect(lowpass);
  lowpass.connect(highshelf);
  highshelf.connect(bass);
  bass.connect(dryGain);
  bass.connect(conv);
  dryGain.connect(master);
  conv.connect(wetGain);
  wetGain.connect(master);
  master.connect(output);

  const safeOffset = buffer.duration > 0 ? offset % buffer.duration : 0;
  source.start(0, safeOffset);

  return { source, masterGain: master };
}

interface AmbienceNodes {
  src: AudioBufferSourceNode;
  lfo: OscillatorNode | null;
}

// Connects: noise → filter → baseGain → output
function buildAmbienceNodes(ctx: AudioContext, type: AmbienceKey, output: AudioNode): AmbienceNodes | null {
  if (type === "off") return null;

  const bufSize = ctx.sampleRate * 5;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);

  if (type === "rain" || type === "night") {
    let last = 0;
    for (let i = 0; i < bufSize; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  let lfo: OscillatorNode | null = null;

  if (type === "rain") {
    filter.type = "lowpass";
    filter.frequency.value = 500;
  } else if (type === "night") {
    filter.type = "lowpass";
    filter.frequency.value = 160;
  } else {
    filter.type = "bandpass";
    filter.frequency.value = 300;
    filter.Q.value = 0.5;
    lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
  }

  const baseGain = ctx.createGain();
  baseGain.gain.value = AMBIENCE_BASE_GAIN[type];

  src.connect(filter);
  filter.connect(baseGain);
  baseGain.connect(output);
  src.start();

  return { src, lfo };
}

// ─── Context ──────────────────────────────────────────────────────────────────

export interface AtmosphereCtxValue {
  loadRemoteTrack: (
    url: string,
    name: string
  ) => Promise<void>;
  fileName: string | null;
  selectedPreset: string;
  ambience: AmbienceKey;
  speed: SpeedKey;
  isPlaying: boolean;
  hasBuffer: boolean;
  currentTime: number;
  duration: number;
  musicVolume: number;
  ambienceVolume: number;
  loadFile: (file: File) => Promise<void>;
  togglePlay: () => void;
  setPreset: (key: string) => void;
  setAmbience: (key: AmbienceKey) => void;
  setSpeed: (key: SpeedKey) => void;
  setMusicVolume: (v: number) => void;
  setAmbienceVolume: (v: number) => void;
  seek: (seconds: number) => void;
  getAnalyserNode: () => AnalyserNode | null;
}

const AtmosphereContext = createContext<AtmosphereCtxValue | null>(null);

function loadNum(key: string, fallback: number): number {
  try {
    const s = localStorage.getItem(key);
    if (s === null) return fallback;
    const n = parseFloat(s);
    return isNaN(n) ? fallback : n;
  } catch { return fallback; }
}

export function AtmosphereProvider({ children }: { children: React.ReactNode }) {
  // ── Persisted state ───────────────────────────────────────────────────────
  const [fileName, _setFileName]       = useState<string | null>(() => { try { return localStorage.getItem("nest_atmo_file"); } catch { return null; } });
  const [trackUrl, setTrackUrl] =
  useState<string | null>(null);
  const [selectedPreset, _setPreset]   = useState<string>(() => { try { return localStorage.getItem("nest_atmo_preset") || "deep_night"; } catch { return "deep_night"; } });
  const [ambience, _setAmbience]       = useState<AmbienceKey>(() => { try { return (localStorage.getItem("nest_atmo_ambience") as AmbienceKey) || "off"; } catch { return "off"; } });
  const [speed, _setSpeed]             = useState<SpeedKey>(() => { try { return (localStorage.getItem("nest_atmo_speed") as SpeedKey) || "normal"; } catch { return "normal"; } });
  const [musicVolume, _setMusicVol]    = useState<number>(() => loadNum("nest_atmo_mvol", 1.0));
  const [ambienceVolume, _setAmbVol]   = useState<number>(() => loadNum("nest_atmo_avol", 0.80));

  // ── Transient state ───────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying]   = useState(false);
  const [hasBuffer, setHasBuffer]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);

  // ── Refs (mirror state for callbacks; audio nodes) ─────────────────────────
  const presetKeyRef    = useRef(selectedPreset);
  const ambienceKeyRef  = useRef(ambience);
  const speedKeyRef     = useRef(speed);
  const musicVolRef     = useRef(musicVolume);
  const ambVolRef       = useRef(ambienceVolume);
  const isPlayingRef    = useRef(false);

  const audioCtxRef        = useRef<AudioContext | null>(null);
  const bufferRef          = useRef<AudioBuffer | null>(null);
  const sourceRef          = useRef<AudioBufferSourceNode | null>(null);
  const masterGainRef      = useRef<GainNode | null>(null);
  const userMusicGainRef   = useRef<GainNode | null>(null);  // persistent, user volume
  const userAmbienceGainRef = useRef<GainNode | null>(null); // persistent, user volume
  const analyserRef        = useRef<AnalyserNode | null>(null); // passive tap for visualisation
  const ambienceNodesRef   = useRef<AmbienceNodes | null>(null);
  const startTimeRef       = useRef(0);
  const offsetRef          = useRef(0);
  const xfadeTimer         = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── State-sync helpers ────────────────────────────────────────────────────
  const saveFileName = (v: string | null) => { _setFileName(v); try { v ? localStorage.setItem("nest_atmo_file", v) : localStorage.removeItem("nest_atmo_file"); } catch (_) {} };
  const savePreset   = (v: string)        => { presetKeyRef.current = v;   _setPreset(v);   try { localStorage.setItem("nest_atmo_preset",   v);    } catch (_) {} };
  const saveAmbience = (v: AmbienceKey)   => { ambienceKeyRef.current = v; _setAmbience(v); try { localStorage.setItem("nest_atmo_ambience", v);    } catch (_) {} };
  const saveSpeed    = (v: SpeedKey)      => { speedKeyRef.current = v;    _setSpeed(v);    try { localStorage.setItem("nest_atmo_speed",    v);    } catch (_) {} };
  const saveMusicVol = (v: number)        => { musicVolRef.current = v;    _setMusicVol(v); try { localStorage.setItem("nest_atmo_mvol", String(v)); } catch (_) {} };
  const saveAmbVol   = (v: number)        => { ambVolRef.current = v;      _setAmbVol(v);   try { localStorage.setItem("nest_atmo_avol", String(v)); } catch (_) {} };

  // ── Core audio helpers ────────────────────────────────────────────────────

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      // Invalidate persistent gain nodes when ctx is recreated
      userMusicGainRef.current = null;
      userAmbienceGainRef.current = null;
      analyserRef.current = null;
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  // Returns persistent output gain nodes, creating them lazily
  const getOutputGains = useCallback((): { music: GainNode; amb: GainNode } => {
    const ctx = getCtx();
    if (!userMusicGainRef.current) {
      userMusicGainRef.current = ctx.createGain();
      userMusicGainRef.current.gain.value = musicVolRef.current;
      userMusicGainRef.current.connect(ctx.destination);
    }
    if (!userAmbienceGainRef.current) {
      userAmbienceGainRef.current = ctx.createGain();
      userAmbienceGainRef.current.gain.value = ambVolRef.current;
      userAmbienceGainRef.current.connect(ctx.destination);
    }
    // Passive analyser tap — reads signal without affecting routing
    if (!analyserRef.current && userMusicGainRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      userMusicGainRef.current.connect(analyser);
      analyserRef.current = analyser;
    }
    return { music: userMusicGainRef.current, amb: userAmbienceGainRef.current };
  }, [getCtx]);

  const snapshotOffset = useCallback((): number => {
    if (!audioCtxRef.current || !bufferRef.current || !isPlayingRef.current) return offsetRef.current;
    const rate = SPEEDS[speedKeyRef.current].rate;
    const elapsed = (audioCtxRef.current.currentTime - startTimeRef.current) * rate;
    return elapsed % bufferRef.current.duration;
  }, []);

  const stopMusic = useCallback(() => {
    try { sourceRef.current?.stop(); } catch (_) {}
    sourceRef.current = null;
    masterGainRef.current = null;
  }, []);

  const stopAmbience = useCallback(() => {
    try { ambienceNodesRef.current?.src.stop(); } catch (_) {}
    try { ambienceNodesRef.current?.lfo?.stop(); } catch (_) {}
    ambienceNodesRef.current = null;
  }, []);

  const launchMusic = useCallback((offset: number) => {
    const buf = bufferRef.current;
    if (!buf) return;
    const ctx = getCtx();
    const { music } = getOutputGains();
    const preset = PRESETS.find(p => p.key === presetKeyRef.current) ?? PRESETS[0];
    const rate = SPEEDS[speedKeyRef.current].rate;
    const chain = buildMusicChain(ctx, buf, preset, rate, offset, music);
    sourceRef.current = chain.source;
    masterGainRef.current = chain.masterGain;
    startTimeRef.current = ctx.currentTime;
  }, [getCtx, getOutputGains]);

  const launchAmbience = useCallback(() => {
    const ctx = getCtx();
    const { amb } = getOutputGains();
    ambienceNodesRef.current = buildAmbienceNodes(ctx, ambienceKeyRef.current, amb);
  }, [getCtx, getOutputGains]);

  // ── Current-time ticker (updates every 100ms when playing) ────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      if (!audioCtxRef.current || !bufferRef.current || !isPlayingRef.current) return;
      const rate = SPEEDS[speedKeyRef.current].rate;
      const elapsed = (audioCtxRef.current.currentTime - startTimeRef.current) * rate;
      setCurrentTime(elapsed % bufferRef.current.duration);
    }, 100);
    return () => clearInterval(id);
  }, [isPlaying]);

  // ── Public API ────────────────────────────────────────────────────────────

  const loadFile = useCallback(async (file: File) => {
    const ctx = getCtx();
    const ab = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(ab);
    bufferRef.current = decoded;
    offsetRef.current = 0;
    setHasBuffer(true);
    setDuration(decoded.duration);
    setCurrentTime(0);
    const name = file.name.replace(/\.[^.]+$/, "");
    saveFileName(name);
  }, [getCtx]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      offsetRef.current = snapshotOffset();
      setCurrentTime(offsetRef.current);
      stopMusic();
      stopAmbience();
      isPlayingRef.current = false;
      setIsPlaying(false);
    } else {
      if (!bufferRef.current) return;
      launchMusic(offsetRef.current);
      launchAmbience();
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
  }, [snapshotOffset, stopMusic, stopAmbience, launchMusic, launchAmbience]);

  const setPreset = useCallback((key: string) => {
    savePreset(key); // eslint-disable-line react-hooks/exhaustive-deps
    if (!isPlayingRef.current || !bufferRef.current || !audioCtxRef.current) return;

    if (xfadeTimer.current) clearTimeout(xfadeTimer.current);
    const ctx = audioCtxRef.current;
    const capturedOffset = snapshotOffset();

    if (masterGainRef.current) {
      masterGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    }

    xfadeTimer.current = setTimeout(() => {
      stopMusic();
      offsetRef.current = capturedOffset;
      const preset = PRESETS.find(p => p.key === key) ?? PRESETS[0];
      const rate = SPEEDS[speedKeyRef.current].rate;
      const { music } = getOutputGains();
      const chain = buildMusicChain(ctx, bufferRef.current!, preset, rate, capturedOffset, music, 0);
      sourceRef.current = chain.source;
      masterGainRef.current = chain.masterGain;
      startTimeRef.current = ctx.currentTime;
      chain.masterGain.gain.linearRampToValueAtTime(preset.masterGain, ctx.currentTime + 0.25);
    }, 180);
  }, [snapshotOffset, stopMusic, getOutputGains]);

  const setAmbience = useCallback((key: AmbienceKey) => {
    saveAmbience(key); // eslint-disable-line react-hooks/exhaustive-deps
    stopAmbience();
    if (isPlayingRef.current) {
      const ctx = getCtx();
      const { amb } = getOutputGains();
      ambienceNodesRef.current = buildAmbienceNodes(ctx, key, amb);
    }
  }, [stopAmbience, getCtx, getOutputGains]);

  const setSpeed = useCallback((key: SpeedKey) => {
  
    const rate = SPEEDS[key].rate;
    if (sourceRef.current && audioCtxRef.current) {
      const t = audioCtxRef.current.currentTime;
      sourceRef.current.playbackRate.linearRampToValueAtTime(rate, t + 0.4);
    }
  }, []);

  const setMusicVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    saveMusicVol(clamped); // eslint-disable-line react-hooks/exhaustive-deps
    if (userMusicGainRef.current) {
      userMusicGainRef.current.gain.value = clamped;
    }
  
  }, []);

  const setAmbienceVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    saveAmbVol(clamped); // eslint-disable-line react-hooks/exhaustive-deps
    if (userAmbienceGainRef.current) {
      userAmbienceGainRef.current.gain.value = clamped;
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const dur = bufferRef.current?.duration ?? 0;
    const clamped = Math.max(0, Math.min(dur, seconds));
    offsetRef.current = clamped;
    setCurrentTime(clamped);
  
    if (isPlayingRef.current && bufferRef.current) {
      stopMusic();
      launchMusic(clamped);
    }
  }, [stopMusic, launchMusic]);
  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (xfadeTimer.current) clearTimeout(xfadeTimer.current);
      stopMusic();
      stopAmbience();
      try { audioCtxRef.current?.close(); } catch (_) {}
    };
  }, [stopMusic, stopAmbience]);

  const getAnalyserNode = useCallback(() => analyserRef.current, []);
  const loadRemoteTrack = useCallback(
    async (url: string, name: string) => {
      const ctx = getCtx();
  
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(ab);
  
      stopMusic();
      stopAmbience();
  
      bufferRef.current = decoded;
      offsetRef.current = 0;
  
      setHasBuffer(true);
      setDuration(decoded.duration);
      setCurrentTime(0);
  
      saveFileName(name);
      setTrackUrl(url);
  
      launchMusic(0);
      launchAmbience();
  
      isPlayingRef.current = true;
      setIsPlaying(true);
    },
    [getCtx, stopMusic, stopAmbience, launchMusic, launchAmbience]
  );
  const value: AtmosphereCtxValue = {
    loadRemoteTrack,
    fileName,
    selectedPreset,
    ambience,
    speed,
    isPlaying,
    hasBuffer,
    currentTime,
    duration,
    musicVolume,
    ambienceVolume,
    loadFile,
    togglePlay,
    setPreset,
    setAmbience,
    setSpeed,
    setMusicVolume,
    setAmbienceVolume,
    seek,
    getAnalyserNode,
  };

  return (
    <AtmosphereContext.Provider value={value}>
      {children}
    </AtmosphereContext.Provider>
  );
}

export function useAtmosphere(): AtmosphereCtxValue {
  const ctx = useContext(AtmosphereContext);
  if (!ctx) throw new Error("useAtmosphere must be inside AtmosphereProvider");
  return ctx;
}
