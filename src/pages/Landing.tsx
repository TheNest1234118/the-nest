import { useLocation } from "wouter";
import { motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import { trackNestEvent, events } from "@/lib/analyticsEvents";

const FOUNDER_MESSAGE_KEY = "nest_founder_onboarding_first_seen";

export function Landing() {
  const [, navigate] = useLocation();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showFounderVoice, setShowFounderVoice] = useState(() => {
    return localStorage.getItem(FOUNDER_MESSAGE_KEY) !== "true";
  });

  useEffect(() => {
    trackNestEvent(events.landing_view);

    const completed = localStorage.getItem("nest_guide_completed") === "true";

    if (completed) {
      navigate("/home");
    }
  }, [navigate]);

  useEffect(() => {
    // Die Nachricht wird beim ersten Anzeigen als gesehen markiert.
    // So erscheint sie bei einem späteren Besuch nicht erneut.
    if (showFounderVoice) {
      localStorage.setItem(FOUNDER_MESSAGE_KEY, "true");
    }
  }, [showFounderVoice]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const toggleFounderVoice = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audio.paused) {
        await audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Founder voice message could not be played:", error);
      setIsPlaying(false);
    }
  };

  const closeFounderVoice = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setShowFounderVoice(false);
  };

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#07070a",
        color: "rgba(245,226,196,0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflowX: "hidden",
        overflowY: "auto",
        padding: "22px 22px 18px",
        boxSizing: "border-box",
      }}
    >
    <audio
  ref={audioRef}
  src="https://res.cloudinary.com/db3kqfbko/video/upload/v1783753673/onboarding-first_2_pnwdq9.mp3"
  preload="metadata"
  onPlay={() => setIsPlaying(true)}
  onPause={() => setIsPlaying(false)}
  onEnded={() => setIsPlaying(false)}
  onError={(event) => {
    console.error(
      "Founder audio loading failed:",
      event.currentTarget.error
    );
    setIsPlaying(false);
  }}
/>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 14%, rgba(255,191,73,0.20), transparent 29%), radial-gradient(circle at 50% 55%, rgba(255,171,43,0.10), transparent 45%), linear-gradient(180deg,#09080c 0%,#050507 100%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.9,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          width: "100%",
          maxWidth: 420,
          zIndex: 2,
          textAlign: "center",
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        <div
          style={{
            height: 118,
            position: "relative",
            marginBottom: 18,
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 24,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: 104,
              height: 104,
              borderRadius: "50%",
              border: "1px solid rgba(255,190,74,0.25)",
              boxShadow: "0 0 72px rgba(255,178,48,0.22)",
            }}
          />

          <motion.div
            animate={{ y: [0, -7, 0] }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: 58,
              height: 58,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 28%, #ffe3a4 0%, #f5aa2f 42%, #5b340b 100%)",
              boxShadow:
                "0 0 46px rgba(255,186,66,0.38), inset 0 0 18px rgba(255,255,255,0.16)",
            }}
          />
        </div>

        <h1

style={{

  fontFamily: '"Georgia", "Times New Roman", serif',

  fontSize: "clamp(38px, 10vw, 56px)",

  lineHeight: 1.05,

  fontWeight: 700,

  margin: "0 auto 24px",

  letterSpacing: "-0.055em",

  textShadow: "0 2px 12px rgba(0,0,0,0.45)",

}}
>

Say it now.
<br />
<span style={{ color: "#ffc145" }}>

  Remember it later.
</span>
</h1>


        {showFounderVoice && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.25,
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              width: "100%",
              maxWidth: 350,
              margin: "0 auto 26px",
              position: "relative",
              overflow: "hidden",
              borderRadius: 22,
              padding: "14px 44px 14px 14px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "left",
              background:
                "linear-gradient(145deg, rgba(255,193,69,0.10), rgba(255,255,255,0.032))",
              border: "1px solid rgba(255,193,69,0.17)",
              boxShadow:
                "0 18px 60px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.045)",
              boxSizing: "border-box",
            }}
          >
            <motion.div
              aria-hidden
              animate={{
                opacity: isPlaying
                  ? [0.25, 0.62, 0.25]
                  : [0.12, 0.25, 0.12],
                scale: isPlaying
                  ? [0.92, 1.12, 0.92]
                  : [0.96, 1.04, 0.96],
              }}
              transition={{
                duration: isPlaying ? 1.8 : 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                left: -30,
                top: "50%",
                transform: "translateY(-50%)",
                width: 130,
                height: 130,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,193,69,0.32), transparent 68%)",
                pointerEvents: "none",
              }}
            />

            <motion.button
              type="button"
              onClick={toggleFounderVoice}
              whileTap={{ scale: 0.92 }}
              aria-label={
                isPlaying
                  ? "Pause founder voice message"
                  : "Play founder voice message"
              }
              style={{
                position: "relative",
                zIndex: 1,
                width: 52,
                height: 52,
                flex: "0 0 auto",
                borderRadius: "50%",
                border: "1px solid rgba(255,213,126,0.38)",
                background:
                  "radial-gradient(circle at 35% 25%, #ffe3a4 0%, #f5aa2f 48%, #6d3f0e 100%)",
                color: "#1a1205",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow:
                  "0 0 28px rgba(255,185,57,0.30), inset 0 1px 0 rgba(255,255,255,0.24)",
              }}
            >
              {isPlaying ? (
                <Pause size={21} fill="currentColor" strokeWidth={1.8} />
              ) : (
                <Play
                  size={22}
                  fill="currentColor"
                  strokeWidth={1.8}
                  style={{ marginLeft: 2 }}
                />
              )}
            </motion.button>

            <button
              type="button"
              onClick={toggleFounderVoice}
              style={{
                position: "relative",
                zIndex: 1,
                minWidth: 0,
                flex: 1,
                padding: 0,
                border: "none",
                background: "transparent",
                color: "inherit",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  color: "rgba(255,207,116,0.94)",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  marginBottom: 5,
                }}
              >
                Voice from the founder
              </div>

              <div
                style={{
                  color: "rgba(248,230,202,0.92)",
                  fontSize: 14,
                  fontWeight: 650,
                  lineHeight: 1.35,
                }}
              >
                A personal welcome from Sarp
              </div>

              <div
                style={{
                  marginTop: 5,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  height: 12,
                }}
              >
                {[5, 9, 7, 11, 6, 10, 8, 5].map((height, index) => (
                  <motion.span
                    key={index}
                    animate={
                      isPlaying
                        ? {
                            height: [
                              Math.max(3, height * 0.45),
                              height,
                              Math.max(3, height * 0.6),
                            ],
                          }
                        : {
                            height: Math.max(3, height * 0.45),
                          }
                    }
                    transition={{
                      duration: 0.65 + (index % 3) * 0.12,
                      repeat: isPlaying ? Infinity : 0,
                      ease: "easeInOut",
                      delay: index * 0.04,
                    }}
                    style={{
                      width: 2,
                      borderRadius: 999,
                      background: isPlaying
                        ? "rgba(255,193,69,0.86)"
                        : "rgba(238,220,190,0.25)",
                    }}
                  />
                ))}

                <span
                  style={{
                    marginLeft: 6,
                    color: "rgba(238,220,190,0.46)",
                    fontSize: 11,
                  }}
                >
                  {isPlaying ? "Playing" : "Tap to listen"}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={closeFounderVoice}
              aria-label="Close founder message"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.025)",
                color: "rgba(238,220,190,0.38)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              <X size={13} strokeWidth={1.6} />
            </button>
          </motion.div>
        )}



        <img
          src="/landing-comparison.jpg"
          alt="Without The Nest and With The Nest comparison"
          style={{
            width: "100%",
            display: "block",
            borderRadius: 28,
            marginBottom: 34,
            boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
          }}
        />

        <motion.button
          onClick={() => {
            audioRef.current?.pause();
            setIsPlaying(false);

            trackNestEvent(events.landing_enter_clicked);
            navigate("/onboarding");
          }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: "100%",
            height: 64,
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg,#ffd36b,#f4a51f)",
            color: "#1a1205",
            fontSize: 18,
            fontWeight: 950,
            cursor: "pointer",
            boxShadow: "0 18px 55px rgba(255,184,55,0.30)",
          }}
        >
          ENTER THE NEST →
        </motion.button>

        <button
          onClick={() => {
            audioRef.current?.pause();
            setIsPlaying(false);
            navigate("/home");
          }}
          style={{
            marginTop: 18,
            background: "none",
            border: "none",
            color: "rgba(238,220,190,0.42)",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          I already have an account
        </button>

        <div
          style={{
            marginTop: 34,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            color: "rgba(238,220,190,0.52)",
            fontSize: 12,
          }}
        >
          <span>♙ Private &amp; secure</span>
          <span>♢ Your data is yours</span>
          <span>ϟ Works in seconds</span>
        </div>
      </motion.div>
    </div>
  );
}