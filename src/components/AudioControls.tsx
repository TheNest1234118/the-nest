import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useAudioContext } from "@/hooks/use-audio-context";
import { Slider } from "@/components/ui/slider";

interface AudioControlsProps {
  minimal?: boolean;
}

export function AudioControls({ minimal = false }: AudioControlsProps) {
  const { isMuted, toggleMute, volume, setVolume } = useAudioContext();

  if (minimal) {
    return (
      <button
        data-testid="button-audio-minimal"
        onClick={toggleMute}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 4,
          flexShrink: 0,
          color: "rgba(180,155,110,0.45)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {isMuted
          ? <VolumeX size={16} strokeWidth={1.5} />
          : <Volume2 size={16} strokeWidth={1.5} />}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 group">
      <div className="w-24 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <Slider
          value={[volume * 100]}
          max={100}
          step={1}
          onValueChange={(v) => setVolume(v[0] / 100)}
          className="cursor-pointer"
        />
      </div>
      <button
        data-testid="button-audio-toggle"
        onClick={toggleMute}
        className="text-muted-foreground hover:text-foreground transition-colors duration-700 w-10 h-10 flex items-center justify-center rounded-full"
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
}
