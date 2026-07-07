import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { trackNestEvent, events } from "@/lib/analyticsEvents";

const DONE_KEY = "nest_guide_completed";
const DEVICE_ID_KEY = "nest_device_id";
const HOME_WELCOME_KEY = "nest_show_home_welcome";

const gold = "#ffc145";
const bg = "#07070a";
const softText = "rgba(238,220,190,0.62)";
const mainText = "rgba(248,230,202,0.94)";
const card = "rgba(255,255,255,0.045)";
const border = "1px solid rgba(255,193,69,0.13)";

type Step =
  | "one"
  | "understand"
  | "journey"
  | "safe"
  | "first"
  | "record"
  | "recording"
  | "saved"
  | "next"
  | "reminder"
  | "done";

function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

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

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
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

function Orb({ size = 108 }: { size?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0], scale: [1, 1.04, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
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

function Wave() {
  const bars = [12, 18, 26, 38, 30, 52, 70, 50, 34, 46, 28, 20, 14];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
      {bars.map((h, i) => (
        <motion.div
          key={i}
          animate={{ height: [h * 0.55, h, h * 0.65] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut",
          }}
          style={{
            width: 4,
            height: h,
            borderRadius: 999,
            background:
              i < 8
                ? "linear-gradient(#ffd36b,#f4a51f)"
                : "rgba(238,220,190,0.25)",
          }}
        />
      ))}
    </div>
  );
}

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 58,
        height: 32,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.08)",
        background: active ? "linear-gradient(135deg,#ffd36b,#f4a51f)" : "rgba(255,255,255,0.10)",
        padding: 3,
        cursor: "pointer",
      }}
    >
      <motion.div
        animate={{ x: active ? 25 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: active ? "#211404" : "rgba(255,255,255,0.75)",
        }}
      />
    </button>
  );
}

function Title({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <h1
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: 400,
          fontSize: 42,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          margin: "0 auto 14px",
          maxWidth: 340,
          color: mainText,
        }}
      >
        {children}
      </h1>
      {sub && (
        <p
          style={{
            color: softText,
            fontSize: 15,
            lineHeight: 1.62,
            maxWidth: 310,
            margin: "0 auto",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [morningReminder, setMorningReminder] = useState(true);
  const [eveningReminder, setEveningReminder] = useState(true);

  const steps: Step[] = useMemo(
    () => [
      "one",
      "understand",
      "journey",
      "safe",
      "first",
      "record",
      "recording",
      "saved",
      "next",
      "reminder",
      "done",
    ],
    []
  );

  const current = steps[step];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const startFakeRecording = () => {
    trackNestEvent("onboarding_first_voice_started");
    setRecordingSeconds(0);
    setStep(6);

    const startedAt = Date.now();

    const interval = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setRecordingSeconds(seconds);

      if (seconds >= 5) {
        window.clearInterval(interval);
      }
    }, 250);
  };

  const completeOnboarding = async () => {
    trackNestEvent(events.completed_onboarding);

    const deviceId = getOrCreateDeviceId();

    localStorage.setItem(DONE_KEY, "true");
    localStorage.setItem(HOME_WELCOME_KEY, "true");
    localStorage.setItem("nest_first_voice_demo_completed", "true");
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
    }

    navigate("/home");
  };

  return (
    <div
      style={{
        minHeight: "100svh",
        background: bg,
        color: mainText,
        position: "relative",
        overflow: "hidden",
        padding: "46px 24px 24px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 12%, rgba(255,193,69,0.18), transparent 30%), radial-gradient(circle at 50% 55%, rgba(255,172,38,0.09), transparent 44%), linear-gradient(180deg,#09080c 0%,#050507 100%)",
          pointerEvents: "none",
        }}
      />

      <Progress current={step} total={steps.length} />

      {step > 0 && current !== "recording" && (
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

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
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
            maxWidth: 410,
            margin: "0 auto",
            paddingTop: 30,
          }}
        >
          {current === "one" && (
            <>
              <div style={{ textAlign: "center", paddingTop: 28 }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 34 }}>
                  <Orb size={112} />
                </div>
                <Title sub="Just you, your thoughts and 5 minutes.">
                  One voice note <span style={{ color: gold }}>a day.</span>
                  <br />
                  That’s all.
                </Title>
              </div>
              <PrimaryButton onClick={next}>Continue →</PrimaryButton>
            </>
          )}

          {current === "understand" && (
            <>
              <div style={{ textAlign: "center", paddingTop: 30 }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  style={{
                    width: 128,
                    height: 128,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,193,69,0.20)",
                    margin: "0 auto 42px",
                    boxShadow: "0 0 60px rgba(255,193,69,0.16)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 52,
                  }}
                >
                  ✨
                </motion.div>
                <Title
                  sub="It connects the dots, finds patterns and helps you grow."
                >
                  AI that truly <span style={{ color: gold }}>understands you.</span>
                </Title>
              </div>
              <PrimaryButton onClick={next}>Continue →</PrimaryButton>
            </>
          )}

          {current === "journey" && (
            <>
              <div style={{ paddingTop: 28 }}>
                <Title sub="Look back. Reflect. Understand yourself like never before.">
                  From small talks <br /> to <span style={{ color: gold }}>big breakthroughs.</span>
                </Title>

                <div
                  style={{
                    marginTop: 34,
                    display: "grid",
                    gap: 12,
                    maxWidth: 310,
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  {[
                    ["Mon", "😔", "I felt so stressed"],
                    ["Wed", "🙂", "But today was amazing"],
                    ["Sun", "🌟", "I'm finally proud"],
                  ].map(([day, emoji, text]) => (
                    <div
                      key={String(day)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "48px 1fr",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div style={{ color: "rgba(238,220,190,0.38)", fontSize: 13 }}>{day}</div>
                      <div
                        style={{
                          borderRadius: 16,
                          padding: "13px 14px",
                          background: card,
                          border,
                          color: "rgba(248,230,202,0.82)",
                          fontSize: 14,
                        }}
                      >
                        {emoji} {text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <PrimaryButton onClick={next}>Continue →</PrimaryButton>
            </>
          )}

          {current === "safe" && (
            <>
              <div style={{ textAlign: "center", paddingTop: 34 }}>
                <div
                  style={{
                    width: 118,
                    height: 118,
                    borderRadius: 36,
                    border: "1px solid rgba(255,193,69,0.22)",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 36px",
                    boxShadow: "0 0 55px rgba(255,193,69,0.14)",
                    fontSize: 54,
                  }}
                >
                  🛡️
                </div>
                <Title sub="No filters. No pressure. Just you, being real.">
                  This is your <span style={{ color: gold }}>safe space.</span>
                </Title>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 26,
                    flexWrap: "wrap",
                  }}
                >
                  {["🔒 Private", "🛡️ Encrypted", "💛 Yours"].map((pill) => (
                    <span
                      key={pill}
                      style={{
                        padding: "9px 12px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,193,69,0.10)",
                        color: "rgba(248,230,202,0.72)",
                        fontSize: 12,
                      }}
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
              <PrimaryButton onClick={next}>Continue →</PrimaryButton>
            </>
          )}

          {current === "first" && (
            <>
              <div style={{ textAlign: "center", paddingTop: 30 }}>
                <Title sub="Speak about anything. There is no right or wrong.">
                  Let’s create your first <span style={{ color: gold }}>voice capsule.</span>
                </Title>

                <motion.button
                  onClick={next}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    margin: "44px auto 0",
                    width: 132,
                    height: 132,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,193,69,0.25)",
                    background:
                      "radial-gradient(circle, rgba(255,193,69,0.26), rgba(255,193,69,0.08) 46%, transparent 72%)",
                    color: "#1a1205",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#ffd36b,#f4a51f)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 34,
                      boxShadow: "0 0 48px rgba(255,193,69,0.34)",
                    }}
                  >
                    🎙️
                  </div>
                </motion.button>
              </div>
              <PrimaryButton onClick={next}>I’m ready →</PrimaryButton>
            </>
          )}

          {current === "record" && (
            <>
              <div style={{ textAlign: "center", paddingTop: 40 }}>
                <Title sub="Say whatever is in your head. One sentence is enough.">
                  What’s on your mind <span style={{ color: gold }}>right now?</span>
                </Title>

                <div style={{ margin: "42px 0 36px" }}>
                  <Wave />
                </div>

                <motion.button
                  onClick={startFakeRecording}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    border: "none",
                    background: "linear-gradient(135deg,#ffd36b,#f4a51f)",
                    boxShadow: "0 0 54px rgba(255,193,69,0.35)",
                    cursor: "pointer",
                    fontSize: 36,
                  }}
                >
                  🎙️
                </motion.button>

                <p style={{ color: softText, fontSize: 13, marginTop: 14 }}>
                  Tap to start speaking
                </p>
              </div>
              <button
                onClick={next}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(238,220,190,0.34)",
                  cursor: "pointer",
                  padding: 14,
                  fontSize: 13,
                }}
              >
                Skip demo
              </button>
            </>
          )}

          {current === "recording" && (
            <>
              <div style={{ textAlign: "center", paddingTop: 54 }}>
                <p style={{ color: softText, fontSize: 15 }}>Recording...</p>
                <div
                  style={{
                    fontSize: 42,
                    color: gold,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    marginBottom: 50,
                  }}
                >
                  00:{String(recordingSeconds).padStart(2, "0")}
                </div>

                <motion.button
                  onClick={() => {
                    trackNestEvent("onboarding_first_voice_finished");
                    setStep(7);
                  }}
                  animate={{ boxShadow: ["0 0 20px rgba(255,193,69,0.16)", "0 0 70px rgba(255,193,69,0.34)", "0 0 20px rgba(255,193,69,0.16)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    width: 172,
                    height: 172,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,193,69,0.30)",
                    background:
                      "radial-gradient(circle, rgba(255,193,69,0.17), transparent 68%)",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 14,
                      background: "linear-gradient(135deg,#ffd36b,#f4a51f)",
                    }}
                  />
                </motion.button>

                <p style={{ color: softText, fontSize: 13, lineHeight: 1.6, marginTop: 30 }}>
                  Speak for at least 20 seconds <br /> for the best experience.
                </p>
              </div>
              <div />
            </>
          )}

          {current === "saved" && (
            <>
              <div style={{ textAlign: "center", paddingTop: 42 }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,193,69,0.30)",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 34px",
                    color: gold,
                    fontSize: 44,
                    boxShadow: "0 0 55px rgba(255,193,69,0.16)",
                  }}
                >
                  ✓
                </div>
                <Title sub="This is the beginning of something powerful.">
                  Nice! <br /> Your first capsule is <span style={{ color: gold }}>saved.</span>
                </Title>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <button
                  onClick={() => {}}
                  style={{
                    height: 52,
                    borderRadius: 16,
                    border,
                    background: "rgba(255,255,255,0.025)",
                    color: "rgba(255,193,69,0.88)",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ▶ Listen to my recording
                </button>
                <PrimaryButton onClick={next}>Continue →</PrimaryButton>
              </div>
            </>
          )}

          {current === "next" && (
            <>
              <div style={{ paddingTop: 34 }}>
                <Title>What happens <span style={{ color: gold }}>next?</span></Title>

                <div style={{ display: "grid", gap: 14, marginTop: 36 }}>
                  {[
                    ["🎙️", "Add more voice capsules", "Anytime, anywhere."],
                    ["✨", "AI finds your patterns", "The more you share, the smarter it gets."],
                    ["📊", "Get weekly reflections", "See your growth and breakthroughs."],
                  ].map(([icon, title, text]) => (
                    <div
                      key={title}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "44px 1fr",
                        gap: 14,
                        alignItems: "center",
                        padding: 15,
                        borderRadius: 18,
                        border,
                        background: card,
                      }}
                    >
                      <div style={{ fontSize: 24 }}>{icon}</div>
                      <div>
                        <div style={{ color: mainText, fontSize: 15, fontWeight: 750 }}>{title}</div>
                        <div style={{ color: softText, fontSize: 13, marginTop: 3 }}>{text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <PrimaryButton onClick={next}>Sounds good!</PrimaryButton>
            </>
          )}

          {current === "reminder" && (
            <>
              <div style={{ paddingTop: 34, textAlign: "center" }}>
                <Title sub="A small nudge helps you build a habit without pressure.">
                  We’ll remind you to <span style={{ color: gold }}>keep going.</span>
                </Title>

                <div style={{ display: "grid", gap: 14, marginTop: 38 }}>
                  <div
                    style={{
                      border,
                      background: card,
                      borderRadius: 20,
                      padding: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <div style={{ color: softText, fontSize: 12 }}>☀️ Morning reminder</div>
                      <div style={{ fontSize: 27, marginTop: 4 }}>08:00</div>
                    </div>
                    <Toggle active={morningReminder} onClick={() => setMorningReminder((v) => !v)} />
                  </div>

                  <div
                    style={{
                      border,
                      background: card,
                      borderRadius: 20,
                      padding: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <div style={{ color: softText, fontSize: 12 }}>🌙 Evening reminder</div>
                      <div style={{ fontSize: 27, marginTop: 4 }}>21:00</div>
                    </div>
                    <Toggle active={eveningReminder} onClick={() => setEveningReminder((v) => !v)} />
                  </div>
                </div>
              </div>
              <PrimaryButton onClick={next}>All set! Let’s go →</PrimaryButton>
            </>
          )}

          {current === "done" && (
            <>
              <div style={{ paddingTop: 24, textAlign: "center" }}>
                <Title sub="Your journey starts now.">
                  Welcome to <span style={{ color: gold }}>The Nest.</span>
                </Title>

                <div
                  style={{
                    marginTop: 32,
                    border,
                    background: "rgba(255,255,255,0.035)",
                    borderRadius: 26,
                    padding: 18,
                    textAlign: "left",
                    boxShadow: "0 20px 70px rgba(0,0,0,0.34)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <strong>Today</strong>
                    <span style={{ color: gold }}>🔥 1</span>
                  </div>

                  <div
                    style={{
                      borderRadius: 18,
                      background: "rgba(255,255,255,0.055)",
                      padding: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ color: mainText, fontSize: 16 }}>How are you feeling?</div>
                      <div style={{ color: softText, fontSize: 12, marginTop: 4 }}>Tap to record</div>
                    </div>
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "linear-gradient(135deg,#ffd36b,#f4a51f)",
                        fontSize: 24,
                      }}
                    >
                      🎙️
                    </div>
                  </div>

                  <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between" }}>
                    <span>This week</span>
                    <span style={{ color: softText }}>→</span>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <div
                        key={`${d}-${i}`}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          border: i === 2 ? "1px solid rgba(255,193,69,0.75)" : "1px solid rgba(255,255,255,0.10)",
                          display: "grid",
                          placeItems: "center",
                          color: i === 2 ? gold : softText,
                          fontSize: 11,
                        }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <PrimaryButton onClick={completeOnboarding}>Go to my Nest →</PrimaryButton>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
