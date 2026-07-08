import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OneSignal from "react-onesignal";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { Memos } from "@/pages/Memos";
import { trackNestEvent, events } from "@/lib/analyticsEvents";
import { requestNestNotifications } from "@/lib/notifications";

const DONE_KEY = "nest_guide_completed";
const DEVICE_ID_KEY = "nest_device_id";
const HOME_WELCOME_KEY = "nest_show_home_welcome";

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

type Step = "one" | "understand" | "journey" | "safe" | "firstVoice" | "reminders" | "done";

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

  const steps: Step[] = useMemo(
    () => ["one", "understand", "journey", "safe", "firstVoice", "reminders", "done"],
    []
  );

  const current = steps[step];
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
      navigate("/mood-log");
      return;
    }
  
    navigate(target);
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
      {current === "one" && (
  <ScreenShell key="one">
    <div style={{ textAlign: "center", paddingTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
        <Orb size={68} />
      </div>

      <h1
        style={{
          fontWeight: 850,
          fontSize: 30,
          lineHeight: 1.28,
          letterSpacing: "-0.04em",
          margin: "0 auto",
          maxWidth: 360,
        }}
      >
        Your thoughts.
        <br />
        Organized. Understood.{" "}
        <span style={{ color: gold }}>Growth.</span>
      </h1>

      <div
        style={{
          marginTop: 32,
          borderRadius: 22,
          border: "1px solid rgba(255,193,69,0.14)",
          background: "rgba(255,255,255,0.025)",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: 322,
          position: "relative",
        }}
      >
        <div
          style={{
            padding: "26px 16px",
            borderRight: "1px solid rgba(255,193,69,0.14)",
            position: "relative",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: mainText }}>
            <span style={{ color: "#ff4d4d", marginRight: 8 }}>✕</span>
            Without The Nest
          </div>

          <div style={{ marginTop: 46, position: "relative", height: 165 }}>
            {[
              ["Overthinking", 4, 0],
              ["Lost ideas", 124, 0],
              ["No clarity", 0, 100],
              ["No progress", 130, 132],
            ].map(([text, left, top]) => (
              <div
                key={String(text)}
                style={{
                  position: "absolute",
                  left: Number(left),
                  top: Number(top),
                  padding: "9px 10px",
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(248,230,202,0.7)",
                  fontSize: 10,
                }}
              >
                {text}
              </div>
            ))}

            <div
              style={{
                position: "absolute",
                left: 48,
                top: 42,
                width: 112,
                height: 112,
                borderRadius: "50%",
                opacity: 0.45,
                filter: "blur(.2px)",
                background:
                  "repeating-radial-gradient(circle, transparent 0 9px, rgba(255,255,255,0.28) 10px 11px)",
                transform: "rotate(18deg)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 82,
                top: 158,
                fontSize: 34,
                opacity: 0.5,
              }}
            >
              ☹️
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "26px 16px",
            background:
              "radial-gradient(circle at 50% 52%, rgba(255,193,69,0.22), transparent 38%)",
            position: "relative",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: mainText }}>
            <span style={{ color: "#48c763", marginRight: 8 }}>✓</span>
            With The Nest
          </div>

          <div style={{ position: "relative", height: 210, marginTop: 28 }}>
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 76,
                transform: "translateX(-50%)",
              }}
            >
              <Orb size={70} />
            </div>

            {[
              ["🧠", "Clear mind", 72, 0],
              ["🎙️", "Captured ideas", 20, 72],
              ["✨", "AI insights", 142, 72],
              ["📈", "Real growth", 84, 150],
            ].map(([icon, text, left, top]) => (
              <div
                key={String(text)}
                style={{
                  position: "absolute",
                  left: Number(left),
                  top: Number(top),
                  padding: "10px 11px",
                  borderRadius: 11,
                  background: "rgba(255,193,69,0.09)",
                  border: "1px solid rgba(255,193,69,0.12)",
                  color: "rgba(248,230,202,0.76)",
                  fontSize: 10,
                  display: "grid",
                  gap: 4,
                  placeItems: "center",
                  minWidth: 70,
                }}
              >
                <div style={{ fontSize: 18 }}>{icon}</div>
                <div>{text}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "45%",
            transform: "translate(-50%, -50%)",
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#0b0b0f",
            border: "1px solid rgba(255,193,69,0.13)",
            display: "grid",
            placeItems: "center",
            fontSize: 30,
            color: mainText,
          }}
        >
          →
        </div>
      </div>
    </div>

    <div>
      <PrimaryButton onClick={next}>ENTER THE NEST →</PrimaryButton>

      <button
        onClick={() => navigate("/auth")}
        style={{
          marginTop: 14,
          width: "100%",
          background: "transparent",
          border: "none",
          color: "rgba(248,230,202,0.38)",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        I already have an account
      </button>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          justifyContent: "space-between",
          color: "rgba(248,230,202,0.42)",
          fontSize: 11,
        }}
      >
        <span>🔒 Private & secure</span>
        <span>🛡️ Your data is yours</span>
        <span>⚡ Works in seconds</span>
      </div>
    </div>
  </ScreenShell>
)}

        {current === "journey" && (
          <ScreenShell key="journey">
            <div style={{ textAlign: "center", paddingTop: 24 }}>
              <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 37, lineHeight: 1.08 }}>
                From small talks to <span style={{ color: gold }}>big breakthroughs.</span>
              </h1>

              <div style={{ marginTop: 34, display: "grid", gap: 14 }}>
                {[
                  ["Mon", "😔", "I felt so stressed"],
                  ["Wed", "🙂", "But today was amazing"],
                  ["Sun", "🌟", "I’m finally proud"],
                ].map(([day, emoji, text]) => (
                  <div key={day} style={{ display: "grid", gridTemplateColumns: "42px 1fr", alignItems: "center", gap: 10 }}>
                    <div style={{ color: "rgba(238,220,190,0.38)", fontSize: 12 }}>{day}</div>
                    <div style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "13px 14px", textAlign: "left", color: "rgba(248,230,202,0.78)", fontSize: 14 }}>
                      {emoji} {text}
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ color: softText, fontSize: 15, lineHeight: 1.65, maxWidth: 290, margin: "32px auto 0" }}>
                Look back. Reflect. Understand yourself like never before.
              </p>
            </div>
            <PrimaryButton onClick={next}>Continue →</PrimaryButton>
          </ScreenShell>
        )}

        {current === "safe" && (
          <ScreenShell key="safe">
            <div style={{ textAlign: "center", paddingTop: 52 }}>
              <div style={{ fontSize: 70, marginBottom: 18 }}>🛡️</div>
              <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 42, lineHeight: 1.06 }}>
                This is your <span style={{ color: gold }}>safe space.</span>
              </h1>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "26px 0" }}>
                {["🔒 Private", "🛡️ Encrypted", "💛 Yours"].map((item) => (
                  <div key={item} style={{ padding: "9px 11px", borderRadius: 999, background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: "rgba(248,230,202,0.76)" }}>
                    {item}
                  </div>
                ))}
              </div>
              <p style={{ color: softText, fontSize: 15, lineHeight: 1.65, maxWidth: 280, margin: "0 auto" }}>
                No filters. No pressure. Just you, being real.
              </p>
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
            <Memos onboarding onFinished={next} />
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
            <div style={{ textAlign: "center", paddingTop: 62 }}>
              <div style={{ fontSize: 72, marginBottom: 24 }}>💛</div>
              <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 42, lineHeight: 1.06 }}>
                Welcome to <span style={{ color: gold }}>The Nest.</span>
              </h1>
              <p style={{ color: softText, fontSize: 15, lineHeight: 1.65, maxWidth: 300, margin: "18px auto 0" }}>
                Your journey starts now. Start with one honest voice note.
              </p>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
            <PrimaryButton onClick={() => completeOnboarding("/mood-log")}>
  Enter The Nest →
</PrimaryButton>
            </div>
          </ScreenShell>
        )}
      </AnimatePresence>
    </div>
  );
}