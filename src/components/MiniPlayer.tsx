import React from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Music2 } from "lucide-react";
import { useAtmosphere, PRESETS } from "@/hooks/use-atmosphere";

const HIDDEN_ON = ["/", "/onboarding"];

export function MiniPlayer() {
  const { fileName, selectedPreset, isPlaying, hasBuffer, togglePlay } = useAtmosphere();
  const [location] = useLocation();

  const visible = (hasBuffer || isPlaying) && !HIDDEN_ON.includes(location);
  const preset = PRESETS.find(p => p.key === selectedPreset) ?? PRESETS[0];

  const trackInfo = fileName
    ? `${preset.label}  ·  ${fileName}`
    : preset.label;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="mini-player"
          initial={{ y: 72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 72, opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "rgba(9, 7, 5, 0.94)",
              borderTop: "1px solid rgba(205, 170, 100, 0.08)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                height: 56,
                gap: 12,
              }}
            >
              {/* Info — taps to Atmosphere page */}
              <Link
                href="/atmosphere"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                  textDecoration: "none",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Music2
                    size={14}
                    strokeWidth={1.4}
                    color="rgba(205, 170, 100, 0.48)"
                  />
                  {isPlaying && (
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        position: "absolute",
                        top: -2,
                        right: -2,
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "rgba(205, 170, 100, 0.70)",
                      }}
                    />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: isPlaying
                        ? "rgba(225, 205, 175, 0.78)"
                        : "rgba(185, 168, 142, 0.45)",
                      letterSpacing: "0.01em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      transition: "color 0.3s",
                    }}
                  >
                    {trackInfo}
                  </div>
                  {!isPlaying && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(145, 130, 108, 0.32)",
                        fontWeight: 300,
                        letterSpacing: "0.08em",
                      }}
                    >
                      paused
                    </div>
                  )}
                </div>
              </Link>

              {/* Play / pause */}
              <button
                onClick={e => { e.stopPropagation(); togglePlay(); }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(205, 170, 100, 0.58)",
                  padding: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  borderRadius: 8,
                }}
              >
                {isPlaying ? (
                  <Pause size={18} strokeWidth={1.4} />
                ) : (
                  <Play size={18} strokeWidth={1.4} style={{ marginLeft: 1 }} />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
