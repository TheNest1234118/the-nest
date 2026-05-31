import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

type Preset = "rainy_forest" | "train" | "city" | "storm";

interface AudioContextValue {
  isMuted: boolean;
  toggleMute: () => void;
  volume: number;
  setVolume: (v: number) => void;
  preset: Preset;
  setPreset: (p: Preset) => void;
}

const AudioContextContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [preset, setPreset] = useState<Preset>("rainy_forest");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (isMuted || audioCtxRef.current) return;
    {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.connect(audioCtxRef.current.destination);
      masterGainRef.current.gain.value = volume;

      const bufferSize = audioCtxRef.current.sampleRate * 2;
      const buffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = audioCtxRef.current.createBufferSource();
      whiteNoise.buffer = buffer;
      whiteNoise.loop = true;

      const filter = audioCtxRef.current.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = preset === "storm" ? 1400 : preset === "train" ? 600 : preset === "city" ? 1800 : 1000;

      whiteNoise.connect(filter);
      filter.connect(masterGainRef.current);
      whiteNoise.start();

      return () => {
        whiteNoise.stop();
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
      };
    }
  }, [isMuted]);

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(volume, audioCtxRef.current?.currentTime || 0, 0.1);
    }
  }, [volume]);

  const toggleMute = useCallback(() => {
    setIsMuted(m => !m);
    if (audioCtxRef.current?.state === "suspended" && isMuted) {
      audioCtxRef.current.resume();
    }
  }, [isMuted]);

  return React.createElement(
    AudioContextContext.Provider,
    { value: { isMuted, toggleMute, volume, setVolume, preset, setPreset } },
    children
  );
}

export const useAudioContext = () => {
  const ctx = useContext(AudioContextContext);
  if (!ctx) throw new Error("useAudioContext must be used within AudioProvider");
  return ctx;
};
