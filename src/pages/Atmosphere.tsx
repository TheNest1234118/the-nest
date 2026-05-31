import React, { useRef, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Upload, Play, Pause, Music2 } from "lucide-react";
import {
  useAtmosphere,
  PRESETS,
  SPEEDS,
  AMBIENCE_LIST,
  type SpeedKey,
  type AmbienceKey,
} from "@/hooks/use-atmosphere";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Seek bar ─────────────────────────────────────────────────────────────────

function SeekBar({
  currentTime,
  duration,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  onSeek: (s: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [dragPct, setDragPct] = useState<number | null>(null);

  const pctFromEvent = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const displayPct = dragPct !== null ? dragPct : (duration > 0 ? currentTime / duration : 0);
  const displayTime = dragPct !== null ? dragPct * duration : currentTime;

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragPct(pctFromEvent(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setDragPct(pctFromEvent(e.clientX));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const p = pctFromEvent(e.clientX);
    setDragPct(null);
    onSeek(p * duration);
  };

  return (
    <div style={{ userSelect: "none" }}>
      {/* Track — tall touch area, thin visual */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ padding: "13px 0", cursor: "pointer", touchAction: "none" }}
      >
        <div
          style={{
            height: 2,
            background: "rgba(255,255,255,0.07)",
            borderRadius: 2,
            position: "relative",
          }}
        >
          {/* Fill */}
          <div
            style={{
              width: `${displayPct * 100}%`,
              height: "100%",
              background: "rgba(205,170,100,0.42)",
              borderRadius: 2,
              transition: dragPct !== null ? "none" : "width 0.1s linear",
            }}
          />
          {/* Thumb */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${displayPct * 100}%`,
              transform: "translate(-50%, -50%)",
              width: dragPct !== null ? 14 : 11,
              height: dragPct !== null ? 14 : 11,
              borderRadius: "50%",
              background: "rgba(205,170,100,0.78)",
              transition: "width 0.12s, height 0.12s",
            }}
          />
        </div>
      </div>

      {/* Time labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: -6,
        }}
      >
        <span style={{ fontSize: 10, color: "rgba(165,148,118,0.45)", fontWeight: 300, letterSpacing: "0.05em" }}>
          {fmtTime(displayTime)}
        </span>
        <span style={{ fontSize: 10, color: "rgba(145,130,108,0.28)", fontWeight: 300, letterSpacing: "0.05em" }}>
          {fmtTime(duration)}
        </span>
      </div>
    </div>
  );
}

// ─── Volume slider ────────────────────────────────────────────────────────────

function VolumeSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const valueFromEvent = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return value;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onChange(valueFromEvent(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    onChange(valueFromEvent(e.clientX));
  };
  const onPointerUp = () => { dragging.current = false; };

  return (
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ padding: "13px 0", cursor: "pointer", touchAction: "none", userSelect: "none" }}
    >
      <div
        style={{
          height: 2,
          background: "rgba(255,255,255,0.07)",
          borderRadius: 2,
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${value * 100}%`,
            height: "100%",
            background: "rgba(205,170,100,0.38)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${value * 100}%`,
            transform: "translate(-50%, -50%)",
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: "rgba(205,170,100,0.72)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Atmosphere() {
  const {
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
  } = useAtmosphere();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      await loadFile(file);
    } catch (_) {
      setError("Could not read that file. Try an MP3 or WAV.");
    } finally {
      setLoading(false);
    }
    if (e.target) e.target.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      style={{
        minHeight: "100svh",
        background: "#09090d",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 65% 35% at 50% 0%, rgba(180,115,30,0.055) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          flex: 1,
          padding: "0 20px",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 52px)",
          paddingBottom: 96,
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.6 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <Link href="/home">
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(185,162,128,0.40)", padding: 4 }}>
              <ChevronLeft size={22} strokeWidth={1.4} />
            </button>
          </Link>
          <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(205,170,100,0.36)", fontWeight: 500 }}>
            Atmosphere
          </p>
          <div style={{ width: 30 }} />
        </motion.div>

        {/* Upload */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.6 }}>
          <input
 id="audio-upload"
 ref={fileInputRef}
 type="file"
 accept="audio/*,.mp3,.wav,.m4a"
 onChange={handleFileChange}
 style={{
   position: "absolute",
   opacity: 0,
   width: 1,
   height: 1,
   pointerEvents: "none",
 }}
/>
<label
 htmlFor="audio-upload"
            style={{
              width: "100%",
              background: fileName ? "rgba(205,170,100,0.036)" : "rgba(255,255,255,0.020)",
              border: `1px solid ${fileName ? "rgba(205,170,100,0.12)" : "rgba(255,255,255,0.065)"}`,
              borderRadius: 15,
              padding: "16px 18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              textAlign: "left",
            }}
          >
            {loading ? (
              <span style={{ fontSize: 12, color: "rgba(205,170,100,0.42)", fontWeight: 300 }}>Reading audio...</span>
            ) : fileName ? (
              <>
                <Music2 size={14} strokeWidth={1.4} color="rgba(205,170,100,0.52)" />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 13, fontWeight: 400, color: "rgba(225,205,175,0.80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {fileName}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(165,148,122,0.34)", fontWeight: 300, marginTop: 2 }}>Tap to change</div>
                </div>
              </>
            ) : (
              <>
                <Upload size={14} strokeWidth={1.4} color="rgba(165,148,122,0.36)" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 400, color: "rgba(210,192,165,0.58)" }}>Upload a track</div>
                  <div style={{ fontSize: 10, color: "rgba(148,134,112,0.32)", fontWeight: 300, marginTop: 2 }}>MP3, WAV or M4A</div>
                </div>
              </>
            )}
          </label>
          {error && <p style={{ fontSize: 11, color: "rgba(200,100,70,0.55)", marginTop: 7, paddingLeft: 2 }}>{error}</p>}
        </motion.div>

        {/* Presets */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.6 }}>
          <SectionLabel>Shape</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PRESETS.map(p => {
              const active = p.key === selectedPreset;
              return (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  style={{
                    background: active ? "rgba(205,170,100,0.075)" : "rgba(255,255,255,0.018)",
                    border: `1px solid ${active ? "rgba(205,170,100,0.20)" : "rgba(255,255,255,0.055)"}`,
                    borderRadius: 13,
                    padding: "13px 14px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.18s, border-color 0.18s",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 400, color: active ? "rgba(228,205,160,0.88)" : "rgba(200,182,158,0.50)", marginBottom: 2, transition: "color 0.18s" }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(148,134,112,0.30)", fontWeight: 300, lineHeight: 1.3 }}>{p.description}</div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Speed */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.6 }}>
          <SectionLabel>Speed</SectionLabel>
          <div style={{ display: "flex", gap: 8 }}>
            {(Object.entries(SPEEDS) as [SpeedKey, { label: string; rate: number }][]).map(([key, { label }]) => {
              const active = key === speed;
              return (
                <button
                  key={key}
                  onClick={() => setSpeed(key)}
                  style={{
                    flex: 1,
                    background: active ? "rgba(205,170,100,0.065)" : "rgba(255,255,255,0.018)",
                    border: `1px solid ${active ? "rgba(205,170,100,0.18)" : "rgba(255,255,255,0.052)"}`,
                    borderRadius: 11,
                    padding: "11px 6px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: active ? 400 : 300,
                    color: active ? "rgba(225,200,155,0.82)" : "rgba(178,162,136,0.40)",
                    letterSpacing: "0.03em",
                    transition: "all 0.18s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Ambience layer */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.6 }}>
          <SectionLabel>Ambience layer</SectionLabel>
          <div style={{ display: "flex", gap: 8 }}>
            {AMBIENCE_LIST.map(a => {
              const active = a.key === ambience;
              return (
                <button
                  key={a.key}
                  onClick={() => setAmbience(a.key as AmbienceKey)}
                  style={{
                    flex: 1,
                    background: active ? "rgba(205,170,100,0.065)" : "rgba(255,255,255,0.018)",
                    border: `1px solid ${active ? "rgba(205,170,100,0.18)" : "rgba(255,255,255,0.052)"}`,
                    borderRadius: 11,
                    padding: "11px 6px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: active ? 400 : 300,
                    color: active ? "rgba(220,196,152,0.82)" : "rgba(178,162,136,0.38)",
                    letterSpacing: "0.04em",
                    transition: "all 0.18s",
                  }}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Player — play button + seek bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.30, duration: 0.6 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}
        >
          {/* Play / pause */}
          <button
            onClick={togglePlay}
            disabled={!hasBuffer && !isPlaying}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: hasBuffer || isPlaying ? "rgba(205,170,100,0.09)" : "rgba(255,255,255,0.022)",
              border: `1px solid ${hasBuffer || isPlaying ? "rgba(205,170,100,0.20)" : "rgba(255,255,255,0.06)"}`,
              cursor: hasBuffer || isPlaying ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.20s",
            }}
          >
            {isPlaying ? (
              <Pause size={18} strokeWidth={1.4} color="rgba(205,170,100,0.72)" />
            ) : (
              <Play size={18} strokeWidth={1.4} color={hasBuffer ? "rgba(205,170,100,0.72)" : "rgba(145,130,108,0.26)"} style={{ marginLeft: 2 }} />
            )}
          </button>

          {/* Seek bar — only when buffer loaded */}
          {hasBuffer && duration > 0 && (
            <div style={{ width: "100%" }}>
              <SeekBar currentTime={currentTime} duration={duration} onSeek={seek} />
            </div>
          )}

          {!hasBuffer && !loading && (
            <p style={{ fontSize: 11, color: "rgba(148,134,112,0.28)", letterSpacing: "0.06em", fontWeight: 300 }}>
              {fileName ? "Upload the track again to continue" : "Upload a track to begin"}
            </p>
          )}
        </motion.div>

        {/* Volume controls */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.6 }}
          style={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {/* Music volume */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(185,158,115,0.34)", fontWeight: 500 }}>
                Music
              </span>
              <span style={{ fontSize: 10, color: "rgba(155,138,112,0.28)", fontWeight: 300 }}>
                {Math.round(musicVolume * 100)}
              </span>
            </div>
            <VolumeSlider value={musicVolume} onChange={setMusicVolume} />
          </div>

          {/* Separator */}
          <div style={{ height: 6 }} />

          {/* Ambience volume */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(185,158,115,0.34)", fontWeight: 500 }}>
                Ambience
              </span>
              <span style={{ fontSize: 10, color: "rgba(155,138,112,0.28)", fontWeight: 300 }}>
                {Math.round(ambienceVolume * 100)}
              </span>
            </div>
            <VolumeSlider value={ambienceVolume} onChange={setAmbienceVolume} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(185,158,115,0.34)", fontWeight: 500, marginBottom: 10 }}>
      {children}
    </p>
  );
}
