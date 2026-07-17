import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import OneSignal from "react-onesignal";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { OnboardingVoice } from "@/pages/OnboardingVoice";
import { trackNestEvent, events } from "@/lib/analyticsEvents";
import { requestNestNotifications } from "@/lib/notifications";

const DONE_KEY = "nest_guide_completed";
const DEVICE_ID_KEY = "nest_device_id";
const HOME_WELCOME_KEY = "nest_show_home_welcome";
const FOUNDER_BEFORE_RECORDING_KEY =
  "nest_founder_before_recording_seen";

const FOUNDER_BEFORE_RECORDING_AUDIO =
  "https://res.cloudinary.com/db3kqfbko/video/upload/v1783777302/onboarding-before-recording_2_zpivje.mp3";
const gold = "#ffc145";
const bg = "#07070a";
const mainText = "rgba(248,230,202,0.94)";
const softText = "rgba(238,220,190,0.62)";

function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

type Step = "one" | "understand" | "journey" | "safe" | "award" | "firstVoice" | "reminders" | "done";

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 18,
        left: 24,
        right: 24,
        height: 4,
        borderRadius: 999,
        background: "rgba(255,255,255,0.10)",
        overflow: "hidden",
        zIndex: 20,
      }}
    >
      <motion.div
        animate={{ width: `${((current + 1) / total) * 100}%` }}
        transition={{ duration: 0.35 }}
        style={{
          height: "100%",
          borderRadius: 999,
          background: "linear-gradient(90deg,#ffd36b,#f4a51f)",
        }}
      />
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      style={{
        width: "100%",
        height: 58,
        border: "none",
        borderRadius: 999,
        background: "linear-gradient(135deg,#ffd36b,#f4a51f)",
        color: "#1a1205",
        fontSize: 16,
        fontWeight: 850,
        cursor: "pointer",
        boxShadow: "0 18px 50px rgba(255,184,55,0.22)",
      }}
    >
      {children}
    </motion.button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        height: 54,
        borderRadius: 999,
        border: "1px solid rgba(255,193,69,0.16)",
        background: "rgba(255,255,255,0.035)",
        color: "rgba(248,230,202,0.76)",
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Orb({ size = 108 }: { size?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0], scale: [1, 1.04, 1] }}
      transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 35% 28%, #ffe3a4 0%, #f5aa2f 40%, #5b340b 100%)",
        boxShadow:
          "0 0 55px rgba(255,185,57,0.38), inset 0 0 24px rgba(255,255,255,0.16)",
      }}
    />
  );
}

function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.985 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "relative",
        zIndex: 2,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        maxWidth: 420,
        margin: "0 auto",
        paddingTop: 34,
        paddingBottom: 8,
      }}
    >
      {children}
    </motion.div>
  );
}

function Toggle({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 58,
        height: 34,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: enabled ? "linear-gradient(135deg,#ffd36b,#f4a51f)" : "rgba(255,255,255,0.08)",
        padding: 3,
        display: "flex",
        justifyContent: enabled ? "flex-end" : "flex-start",
        cursor: "pointer",
      }}
    >
      <motion.div
        layout
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: enabled ? "#1a1205" : "rgba(248,230,202,0.75)",
        }}
      />
    </button>
  );
}

export function Onboarding() {
  const [morningReminder, setMorningReminder] = useState(true);
  const [eveningReminder, setEveningReminder] = useState(true);
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const founderAudioRef = useRef<HTMLAudioElement | null>(null);

  const [founderPlaying, setFounderPlaying] = useState(false);
  
  const [showFounderBeforeRecording, setShowFounderBeforeRecording] =
    useState(() => {
      return (
        localStorage.getItem(FOUNDER_BEFORE_RECORDING_KEY) !== "true"
      );
    });
  const steps: Step[] = useMemo(
    () => ["one", "understand", "journey", "safe", "award", "firstVoice", "reminders", "done"],
    []
  );

  const current = steps[step];
  useEffect(() => {
    if (current === "done" && showFounderBeforeRecording) {
      localStorage.setItem(
        FOUNDER_BEFORE_RECORDING_KEY,
        "true"
      );
    }
  }, [current, showFounderBeforeRecording]);
  
  useEffect(() => {
    return () => {
      founderAudioRef.current?.pause();
    };
  }, []);
  
  const toggleFounderBeforeRecording = async () => {
    const audio = founderAudioRef.current;
  
    if (!audio) return;
  
    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.error(
        "Founder voice message could not be played:",
        error
      );
  
      setFounderPlaying(false);
    }
  };
  
  const closeFounderBeforeRecording = () => {
    founderAudioRef.current?.pause();
    setFounderPlaying(false);
    setShowFounderBeforeRecording(false);
  
    localStorage.setItem(
      FOUNDER_BEFORE_RECORDING_KEY,
      "true"
    );
  };
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const completeOnboarding = async (target: "/home" | "/mood-log" = "/home") => {
    trackNestEvent(events.completed_onboarding);
  
    const deviceId = getOrCreateDeviceId();
  
    localStorage.setItem(DONE_KEY, "true");
    localStorage.setItem(HOME_WELCOME_KEY, "true");
    localStorage.setItem("nest_morning_reminder_enabled", String(morningReminder));
    localStorage.setItem("nest_evening_reminder_enabled", String(eveningReminder));
  
    await supabase.from("onboarding_devices").upsert({
      device_id: deviceId,
      completed_at: new Date().toISOString(),
    });
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (user) {
      await supabase.from("profiles").upsert({
        user_id: user.id,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
  
      localStorage.setItem("nest_show_mood_after_first_memo", "true");
      localStorage.setItem("nest_start_dashboard_tour", "true");
      navigate("/home");
      return;
    }
  
    localStorage.setItem("nest_show_mood_after_first_memo", "true");
localStorage.setItem("nest_start_dashboard_tour", "true");
navigate("/home");
  };

  const enableNotifications = async () => {
    const granted = await requestNestNotifications();

    if (!granted) {
      setNotificationMessage("Notifications were not enabled. You can turn them on later.");
      setTimeout(() => setNotificationMessage(null), 2600);
      return;
    }

    try {
      const push = (OneSignal as any)?.User?.PushSubscription;
      await push?.optIn?.();
    } catch {}

    setNotificationMessage("Notifications enabled");
    setTimeout(() => setNotificationMessage(null), 2200);
  };

  const showOnboardingChrome = current !== "firstVoice";

  return (
    <div
      style={{
        minHeight: "100svh",
        background: bg,
        color: mainText,
        position: "relative",
        overflow: "hidden",
        padding: showOnboardingChrome ? "46px 24px 24px" : 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {showOnboardingChrome && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 12%, rgba(255,193,69,0.18), transparent 30%), radial-gradient(circle at 50% 55%, rgba(255,172,38,0.09), transparent 44%), linear-gradient(180deg,#09080c 0%,#050507 100%)",
            }}
          />

          <Progress current={step} total={steps.length} />

          {step > 0 && (
            <button
              onClick={back}
              style={{
                position: "absolute",
                top: 34,
                left: 22,
                zIndex: 30,
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(248,230,202,0.75)",
                fontSize: 22,
                cursor: "pointer",
              }}
            >
              ‹
            </button>
          )}
        </>
      )}

      <AnimatePresence mode="wait">
   {/* PAGE 1 — CAPTURE */}

{current === "one" && (
<ScreenShell key="one">
<div style={{ textAlign: "center", paddingTop: 42 }}>
<Orb size={118} />
<h1

        style={{

          fontFamily: "Georgia, serif",

          fontWeight: 400,

          fontSize: 42,

          lineHeight: 1.06,

          margin: "20px auto 18px",

        }}
>

        A moment.
<br />

        A thought.
<br />

        A story.
<br />
<span style={{ color: gold }}>Just say it.</span>
</h1>
<p

        style={{

          color: softText,

          fontSize: 15,

          lineHeight: 1.65,

          maxWidth: 300,

          margin: "0 auto",

        }}
>

        Talk about what happened, how you feel, or the journey you&apos;re on.
</p>
</div>
<PrimaryButton onClick={next}>

      Continue →
</PrimaryButton>
</ScreenShell>

)}
 

   {/* PAGE 2 — YOUR PAST BECOMES VALUABLE */}

{current === "understand" && (
<ScreenShell key="understand">
<div style={{ textAlign: "center", paddingTop: 32 }}>
<div

        style={{

          fontSize: 78,

          marginBottom: 18,

        }}
>

        🪺
</div>
<h1

        style={{

          fontFamily: "Georgia, serif",

          fontWeight: 400,

          fontSize: 38,

          lineHeight: 1.08,

          margin: "0 auto 18px",

        }}
>

        The more you share,
<br />

        the more your past
<br />
<span style={{ color: gold }}>comes alive.</span>
</h1>
<p

        style={{

          color: softText,

          fontSize: 15,

          lineHeight: 1.65,

          maxWidth: 310,

          margin: "0 auto",

        }}
>

        The Nest turns what you share into memories, stories, and discoveries

        you can return to.
</p>
</div>
<PrimaryButton onClick={next}>

      Continue →
</PrimaryButton>
</ScreenShell>

)}
 

       {/* PAGE 3 — YOUR STORY */}
{current === "journey" && (
<ScreenShell key="journey">
<div style={{ textAlign: "center", paddingTop: 24 }}>
<h1
       style={{
         fontFamily: "Georgia, serif",
         fontWeight: 400,
         fontSize: 37,
         lineHeight: 1.08,
         margin: "0 auto",
       }}
>
       Small moments become
<br />
<span style={{ color: gold }}>your story.</span>
</h1>
<div
       style={{
         marginTop: 34,
         display: "grid",
         gap: 14,
       }}
>
       {[
         ["Mon", "😔", "Today was exhausting"],
         ["Wed", "🚆", "I met someone on the train"],
         ["Sun", "🌱", "Day 18. I’m still going"],
       ].map(([day, emoji, text]) => (
<div
           key={day}
           style={{
             display: "grid",
             gridTemplateColumns: "42px 1fr",
             alignItems: "center",
             gap: 10,
           }}
>
<div
             style={{
               color: "rgba(238,220,190,0.5)",
               fontSize: 12,
               fontWeight: 600,
             }}
>
             {day}
</div>
<div
             style={{
               display: "flex",
               alignItems: "center",
               gap: 10,
               padding: "14px 16px",
               borderRadius: 15,
               background: "rgba(255,255,255,0.055)",
               border: "1px solid rgba(255,255,255,0.1)",
               textAlign: "left",
               fontSize: 14,
             }}
>
<span style={{ fontSize: 18 }}>{emoji}</span>
<span>{text}</span>
</div>
</div>
       ))}
</div>
<p
       style={{
         color: softText,
         fontSize: 14,
         lineHeight: 1.6,
         maxWidth: 310,
         margin: "28px auto 0",
       }}
>
       Look back on what happened, how you felt, and how life changed along
       the way.
</p>
</div>
<PrimaryButton onClick={next}>
     Continue →
</PrimaryButton>
</ScreenShell>
)}

    {/* PAGE 4 — PRIVACY */}

{current === "safe" && (
<ScreenShell key="safe">
<div style={{ textAlign: "center", paddingTop: 52 }}>
<div

        style={{

          fontSize: 70,

          marginBottom: 18,

        }}
>

        🛡️
</div>
<h1

        style={{

          fontFamily: "Georgia, serif",

          fontWeight: 400,

          fontSize: 42,

          lineHeight: 1.06,

          margin: "0 auto",

        }}
>

        This is your
<br />
<span style={{ color: gold }}>private space.</span>
</h1>
<div

        style={{

          display: "flex",

          justifyContent: "center",

          flexWrap: "wrap",

          gap: 8,

          margin: "26px 0",

        }}
>

        {["🔒 Private", "🛡️ Protected", "💛 Yours"].map((item) => (
<div

            key={item}

            style={{

              padding: "9px 11px",

              borderRadius: 999,

              background: "rgba(255,255,255,0.065)",

              border: "1px solid rgba(255,255,255,0.1)",

              fontSize: 12,

              fontWeight: 600,

            }}
>

            {item}
</div>

        ))}
</div>
<p

        style={{

          color: softText,

          fontSize: 15,

          lineHeight: 1.65,

          maxWidth: 280,

          margin: "0 auto",

        }}
>

        No filters. No pressure. Just you, being real.
</p>
</div>
<PrimaryButton onClick={next}>

      Continue →
</PrimaryButton>
</ScreenShell>

)}
 

        {current === "award" && (
          <ScreenShell key="award">
            <div
              style={{
                textAlign: "center",
                paddingTop: 22,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 34,
                  lineHeight: 1,
                  marginBottom: 12,
                  filter: "drop-shadow(0 0 18px rgba(255,193,69,0.35))",
                }}
              >
                🏆
              </div>

              <h1
                style={{
                  fontFamily: "Georgia, serif",
                  fontWeight: 400,
                  fontSize: 38,
                  lineHeight: 1.04,
                  margin: 0,
                  maxWidth: 350,
                }}
              >
                One year.
                <br />
                One frame.
                <br />
                <span style={{ color: gold }}>A lifetime remembered.</span>
              </h1>

              <p
                style={{
                  color: softText,
                  fontSize: 14,
                  lineHeight: 1.55,
                  maxWidth: 320,
                  margin: "16px auto 12px",
                }}
              >
                Stay consistent for 365 days and we’ll create your personalized
                <span style={{ color: "rgba(255,207,116,0.92)", fontWeight: 700 }}>
                  {" "}365 Days Remembered award
                </span>
                .
              </p>

              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  position: "relative",
                  marginTop: 2,
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    width: 250,
                    height: 250,
                    borderRadius: "50%",
                    top: "48%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    background:
                      "radial-gradient(circle, rgba(255,181,48,0.20) 0%, rgba(255,181,48,0.07) 42%, transparent 70%)",
                    filter: "blur(4px)",
                    pointerEvents: "none",
                  }}
                />

                <img
                  src="/365-days-remembered-award.jpg"
                  alt="365 Days Remembered award"
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: "min(100%, 330px)",
                    maxHeight: "38svh",
                    objectFit: "contain",
                    borderRadius: 24,
                    mixBlendMode: "screen",
                    filter:
                      "drop-shadow(0 24px 40px rgba(0,0,0,0.50)) drop-shadow(0 0 26px rgba(255,177,47,0.16))",
                  }}
                />
              </motion.div>
            </div>

            <PrimaryButton onClick={next}>Continue →</PrimaryButton>
          </ScreenShell>
        )}

        {current === "firstVoice" && (
          <motion.div
            key="firstVoice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ flex: 1, width: "100%" }}
          >
            <OnboardingVoice onFinished={next} />
          </motion.div>
        )}

{current === "reminders" && (
  <ScreenShell key="reminders">
    <div style={{ textAlign: "center", paddingTop: 32 }}>
      <div style={{ fontSize: 64, marginBottom: 18 }}>🔔</div>

      <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 39, lineHeight: 1.08 }}>
        Choose your <span style={{ color: gold }}>gentle reminders.</span>
      </h1>

      <p style={{ color: softText, fontSize: 15, lineHeight: 1.65, maxWidth: 300, margin: "16px auto 26px" }}>
        Pick when The Nest should gently bring you back.
      </p>

      <button
        onClick={enableNotifications}
        style={{
          width: "100%",
          marginBottom: 14,
          border: "1px solid rgba(255,193,69,0.16)",
          background: "rgba(255,193,69,0.06)",
          borderRadius: 18,
          padding: "14px 16px",
          color: "rgba(248,230,202,0.82)",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Allow notifications
      </button>

      <NotificationPreferences flash={(msg) => {
        setNotificationMessage(msg);
        setTimeout(() => setNotificationMessage(null), 2200);
      }} />

      {notificationMessage && (
        <p style={{ color: "rgba(255,193,69,0.66)", fontSize: 12, marginTop: 12 }}>
          {notificationMessage}
        </p>
      )}
    </div>

    <PrimaryButton onClick={next}>Continue →</PrimaryButton>
  </ScreenShell>
)}

{current === "done" && (
  <ScreenShell key="done">
    <audio
      ref={founderAudioRef}
      preload="metadata"
      onPlay={() => setFounderPlaying(true)}
      onPause={() => setFounderPlaying(false)}
      onEnded={() => {
        setFounderPlaying(false);

        if (founderAudioRef.current) {
          founderAudioRef.current.currentTime = 0;
        }
      }}
      onError={(event) => {
        console.error(
          "Founder audio loading failed:",
          event.currentTarget.error
        );

        setFounderPlaying(false);
      }}
    >
      <source
        src={FOUNDER_BEFORE_RECORDING_AUDIO}
        type="audio/mp4"
      />
    </audio>

    <div
      style={{
        textAlign: "center",
        paddingTop: 38,
      }}
    >
      <div
        style={{
          fontSize: 68,
          marginBottom: 18,
        }}
      >
        💛
      </div>

      <h1
        style={{
          fontFamily: "Georgia, serif",
          fontWeight: 400,
          fontSize: 42,
          lineHeight: 1.06,
          margin: 0,
        }}
      >
        Welcome to{" "}
        <span style={{ color: gold }}>
          The Nest.
        </span>
      </h1>

      <p
        style={{
          color: softText,
          fontSize: 15,
          lineHeight: 1.65,
          maxWidth: 300,
          margin: "18px auto 26px",
        }}
      >
        Your journey starts now. Start with one honest voice note.
      </p>

      {showFounderBeforeRecording && (
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
            scale: 0.98,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            width: "100%",
            maxWidth: 350,
            margin: "0 auto",
            position: "relative",
            overflow: "hidden",
            borderRadius: 22,
            padding: "14px 44px 14px 14px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            textAlign: "left",
            boxSizing: "border-box",
            background:
              "linear-gradient(145deg, rgba(255,193,69,0.10), rgba(255,255,255,0.032))",
            border:
              "1px solid rgba(255,193,69,0.17)",
            boxShadow:
              "0 18px 60px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.045)",
          }}
        >
          <motion.div
            aria-hidden
            animate={{
              opacity: founderPlaying
                ? [0.25, 0.62, 0.25]
                : [0.12, 0.25, 0.12],

              scale: founderPlaying
                ? [0.92, 1.12, 0.92]
                : [0.96, 1.04, 0.96],
            }}
            transition={{
              duration: founderPlaying ? 1.8 : 4,
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
            onClick={toggleFounderBeforeRecording}
            whileTap={{ scale: 0.92 }}
            aria-label={
              founderPlaying
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
              border:
                "1px solid rgba(255,213,126,0.38)",
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
            {founderPlaying ? (
              <Pause
                size={21}
                fill="currentColor"
                strokeWidth={1.8}
              />
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
            onClick={toggleFounderBeforeRecording}
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
                color:
                  "rgba(255,207,116,0.94)",
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
                color:
                  "rgba(248,230,202,0.92)",
                fontSize: 14,
                fontWeight: 650,
                lineHeight: 1.35,
              }}
            >
              Before you record your first thought
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
              {[5, 9, 7, 11, 6, 10, 8, 5].map(
                (height, index) => (
                  <motion.span
                    key={index}
                    animate={
                      founderPlaying
                        ? {
                            height: [
                              Math.max(
                                3,
                                height * 0.45
                              ),
                              height,
                              Math.max(
                                3,
                                height * 0.6
                              ),
                            ],
                          }
                        : {
                            height: Math.max(
                              3,
                              height * 0.45
                            ),
                          }
                    }
                    transition={{
                      duration:
                        0.65 +
                        (index % 3) * 0.12,
                      repeat: founderPlaying
                        ? Infinity
                        : 0,
                      ease: "easeInOut",
                      delay: index * 0.04,
                    }}
                    style={{
                      width: 2,
                      borderRadius: 999,
                      background: founderPlaying
                        ? "rgba(255,193,69,0.86)"
                        : "rgba(238,220,190,0.25)",
                    }}
                  />
                )
              )}

              <span
                style={{
                  marginLeft: 6,
                  color:
                    "rgba(238,220,190,0.46)",
                  fontSize: 11,
                }}
              >
                {founderPlaying
                  ? "Playing"
                  : "Tap to listen"}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={closeFounderBeforeRecording}
            aria-label="Close founder message"
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 28,
              height: 28,
              borderRadius: "50%",
              border:
                "1px solid rgba(255,255,255,0.07)",
              background:
                "rgba(255,255,255,0.025)",
              color:
                "rgba(238,220,190,0.38)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 2,
            }}
          >
            <X
              size={13}
              strokeWidth={1.6}
            />
          </button>
        </motion.div>
      )}
    </div>

    <div
      style={{
        display: "grid",
        gap: 12,
      }}
    >
      <PrimaryButton
        onClick={() => {
          founderAudioRef.current?.pause();
          setFounderPlaying(false);
          completeOnboarding("/home");
        }}
      >
        Enter The Nest →
      </PrimaryButton>
    </div>
  </ScreenShell>
)}
      </AnimatePresence>
    </div>
  );
}