import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

import {
  requestNestNotifications,
  writeNotificationPreferences,
} from "@/lib/notifications";
type Experience = "never" | "sometimes" | "regularly";
const rowStyle: React.CSSProperties = {
  width: "100%",
  background: "none",
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.044)",
  padding: "15px 18px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  textAlign: "left",
  marginTop: 14,
};

const valueStyle: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(205,170,100,0.52)",
};
const REASONS = [
  { emoji: "🧠", label: "My mind feels constantly busy" },
  { emoji: "🎯", label: "Work toward my goals" },
  { emoji: "📝", label: "Capture my thoughts" },
  { emoji: "😌", label: "Reduce stress" },
  { emoji: "❤️", label: "Support my mental well-being" },
];

const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

const STORAGE_KEY = "nest_onboarding_preferences";
const DONE_KEY = "nest_guide_completed";
const DEVICE_ID_KEY = "nest_device_id";

function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}
export function Onboarding() {
  
  const continueWithReminderPermission = async () => {
    savePartial({
      reminder_enabled: true,
      reminder_time: reminderTime,
      reminder_days: reminderDays,
      reminder_timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Zurich",
    });
  
    const granted = await requestNestNotifications();
  
    if (granted) {
      await writeNotificationPreferences({
        enabled: true,
        preset: "custom",
        reminder_time: reminderTime,
        reminder_timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Zurich",
        reminder_frequency: "selected_days",
        reminder_days: reminderDays,
        reminder_message: "A quiet moment, if you want one.",
      } as any);
    }
  
    next();
  };
  const [, navigate] = useLocation();

  const [index, setIndex] = useState(0);
  const [reasons, setReasons] = useState<string[]>([]);
  const [experience, setExperience] = useState<Experience | "">("");
  const [reminderTime, setReminderTime] = useState("21:00");
  const [reminderDays, setReminderDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  useEffect(() => {
    const completed = localStorage.getItem(DONE_KEY) === "true";
  
    if (completed) {
      navigate("/home");
    }
  }, [navigate]);
  const progress = useMemo(() => ((index + 1) / 5) * 100, [index]);

  const savePartial = (next?: Record<string, unknown>) => {
    const payload = {
      journal_reasons: reasons,
      journaling_experience: experience,
      reminder_enabled: true,
      reminder_time: reminderTime,
      reminder_days: reminderDays,
      reminder_timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Zurich",
      ...next,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const finishGuide = async () => {
    const deviceId = getOrCreateDeviceId();
  
    savePartial({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      device_id: deviceId,
    });
  
    localStorage.setItem(DONE_KEY, "true");
  
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
  
    navigate("/thoughts");
  };

  const next = () => {
    savePartial();

    if (index >= 4) {
      finishGuide().catch(console.error);
      return;
    }

    setIndex((current) => current + 1);
  };
  const descStyle: React.CSSProperties = {
    fontSize: 11,
    color: "rgba(155,140,118,0.36)",
    marginTop: 3,
    lineHeight: 1.45,
  };
  const toggleReason = (reason: string) => {
    setReasons((current) => {
      const nextReasons = current.includes(reason)
        ? current.filter((item) => item !== reason)
        : [...current, reason];

      savePartial({ journal_reasons: nextReasons });
      return nextReasons;
    });
  };

  const chooseExperience = (value: Experience) => {
    setExperience(value);
    savePartial({ journaling_experience: value });
  };

  const toggleDay = (day: number) => {
    setReminderDays((current) => {
      const nextDays = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];

      savePartial({ reminder_days: nextDays });
      return nextDays;
    });
  };

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#09080c",
        display: "flex",
        justifyContent: "center",
        padding: "22px 18px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 45% at 50% 52%, rgba(190, 125, 38, 0.09) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        animate={{ opacity: [0.35, 0.52, 0.35], scale: [1, 1.06, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 210,
          height: 210,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(200, 135, 42, 0.11) 0%, transparent 70%)",
          top: "48%",
          left: "50%",
          transform: "translate(-50%, -52%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 430,
          minHeight: "calc(100svh - 44px)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            height: 3,
            width: "100%",
            background: "rgba(255,255,255,0.07)",
            borderRadius: 999,
            overflow: "hidden",
            marginBottom: 44,
          }}
        >
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              height: "100%",
              background: "rgba(205,170,100,0.72)",
              borderRadius: 999,
            }}
          />
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: "100%",
                background: "rgba(18,15,12,0.72)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 26,
                padding: "30px 26px 24px",
                boxShadow: "0 24px 90px rgba(0,0,0,0.42)",
                backdropFilter: "blur(12px)",
              }}
            >
              {index === 0 && (
                <Step center>
                  <TinyLabel>Recovery space</TinyLabel>
                  <Title>The Nest</Title>
                  <Subtitle>
                    For when your brain won't slow down after the internet.
                  </Subtitle>

                  <PrimaryButton onClick={next}>Enter</PrimaryButton>
                </Step>
              )}

              {index === 1 && (
                <Step>
                  <TinyLabel>Step 1 / 4</TinyLabel>
                  <Title>Why are you here?</Title>
                  <Subtitle>Choose everything that feels right.</Subtitle>

                  <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
                    {REASONS.map((reason) => (
                      <OptionCard
                        key={reason.label}
                        active={reasons.includes(reason.label)}
                        onClick={() => toggleReason(reason.label)}
                      >
                        <span style={{ fontSize: 18 }}>{reason.emoji}</span>
                        <span>{reason.label}</span>
                      </OptionCard>
                    ))}
                  </div>

                  <PrimaryButton onClick={next} disabled={reasons.length === 0}>
                    Continue
                  </PrimaryButton>
                </Step>
              )}

              {index === 2 && (
                <Step>
                  <TinyLabel>Step 2 / 4</TinyLabel>
                  <Title>Have you journaled before?</Title>

                  <div style={{ display: "grid", gap: 12, marginTop: 26 }}>
                    <OptionCard
                      active={experience === "never"}
                      onClick={() => chooseExperience("never")}
                    >
                      Never
                    </OptionCard>

                    <OptionCard
                      active={experience === "sometimes"}
                      onClick={() => chooseExperience("sometimes")}
                    >
                      Sometimes
                    </OptionCard>

                    <OptionCard
                      active={experience === "regularly"}
                      onClick={() => chooseExperience("regularly")}
                    >
                      Regularly
                    </OptionCard>
                  </div>

                  <PrimaryButton onClick={next} disabled={!experience}>
                    Continue
                  </PrimaryButton>
                </Step>
              )}

{index === 3 && (
  <Step>
    <TinyLabel>Step 3 / 4</TinyLabel>
    <Title>When should The Nest remind you?</Title>
    <Subtitle>
      Allow reminders now so The Nest can gently check in with you.
      You can change this later in Settings.
    </Subtitle>

    <div
      style={{
        background: "rgba(255,255,255,0.024)",
        border: "1px solid rgba(255,255,255,0.062)",
        borderRadius: 16,
        overflow: "hidden",
        marginTop: 18,
      }}
    >
      <div style={blockStyle}>
        <div style={labelStyle}>Reminder time</div>
        <input
          type="time"
          value={reminderTime}
          onChange={(e) => {
            setReminderTime(e.target.value);
            savePartial({ reminder_time: e.target.value });
          }}
          style={inputStyle}
        />
      </div>

      <div style={blockStyle}>
        <div style={labelStyle}>Reminder message</div>
        <div style={descStyle}>
          This is the message you’ll receive in your reminder.
        </div>

        <textarea
          value="A quiet moment, if you want one."
          readOnly
          style={{
            ...inputStyle,
            minHeight: 74,
            resize: "none",
            fontFamily: "inherit",
            opacity: 0.7,
          }}
        />
      </div>

      <div style={{ ...blockStyle, borderBottom: "none" }}>
        <div style={labelStyle}>Reminder days</div>

        <div style={pillWrapStyle}>
          {DAYS.map((day) => {
            const active = reminderDays.includes(day.value);

            return (
              <button
                key={day.value}
                onClick={() => toggleDay(day.value)}
                style={{
                  ...dayStyle,
                  border: active
                    ? "1px solid rgba(205,170,100,0.42)"
                    : dayStyle.border,
                  color: active
                    ? "rgba(230,200,145,0.92)"
                    : dayStyle.color,
                }}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>

    <button
  style={rowStyle}
  onClick={continueWithReminderPermission}
>
  <div>
    <div style={labelStyle}>Save reminder settings</div>
    <div style={descStyle}>
      Your reminder will follow this time, timezone, and selected days.
    </div>
  </div>
  <span style={valueStyle}>Save</span>
</button>


    <button
      onClick={next}
      style={{
        width: "100%",
        marginTop: 12,
        background: "none",
        border: "none",
        color: "rgba(185,162,128,0.42)",
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      Continue without reminders
    </button>
  </Step>
)}
              {index === 4 && (
                <Step center>
                  <motion.div
                    initial={{ scale: 0.82, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.45 }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 999,
                      background: "rgba(205,170,100,0.12)",
                      border: "1px solid rgba(205,170,100,0.24)",
                      color: "rgba(225,205,176,0.88)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 34,
                      margin: "0 auto 28px",
                    }}
                  >
                    ✓
                  </motion.div>

                  <TinyLabel>All set</TinyLabel>
                  <Title>You're all set.</Title>
                  <Subtitle>
                  Your Nest is ready whenever you are.
</Subtitle>

<PrimaryButton onClick={() => finishGuide().catch(console.error)}>
  Start journaling
</PrimaryButton>
                </Step>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {index > 0 && index < 4 && (
          <button
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            style={{
              marginTop: 18,
              background: "none",
              border: "none",
              color: "rgba(185,162,128,0.42)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}

function Step({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return <div style={{ textAlign: center ? "center" : "left" }}>{children}</div>;
}

function TinyLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: "rgba(205,170,100,0.45)",
        fontSize: 10,
        letterSpacing: "0.30em",
        textTransform: "uppercase",
        marginBottom: 16,
        fontWeight: 500,
      }}
    >
      {children}
    </p>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 34,
        fontWeight: 400,
        color: "rgba(235,218,192,0.92)",
        letterSpacing: "0.03em",
        lineHeight: 1.13,
        marginBottom: 16,
      }}
    >
      {children}
    </h1>
  );
}

function Subtitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        whiteSpace: "pre-line",
        color: "rgba(175,158,132,0.48)",
        fontSize: 14,
        fontWeight: 300,
        lineHeight: 1.65,
        maxWidth: 300,
        margin: "0 auto 26px",
        letterSpacing: "0.01em",
      }}
    >
      {children}
    </p>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ opacity: disabled ? 0.35 : 1 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={disabled ? undefined : onClick}
      style={{
        width: "100%",
        marginTop: 26,
        background: "rgba(205,170,100,0.09)",
        border: "1px solid rgba(205,170,100,0.18)",
        borderRadius: 15,
        padding: "15px 16px",
        color: "rgba(225,205,176,0.82)",
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {children}
    </motion.button>
  );
}

function OptionCard({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        width: "100%",
        background: active ? "rgba(205,170,100,0.09)" : "rgba(255,255,255,0.026)",
        border: active
          ? "1px solid rgba(205,170,100,0.38)"
          : "1px solid rgba(255,255,255,0.065)",
        borderRadius: 16,
        padding: "15px 16px",
        color: active ? "rgba(230,200,145,0.92)" : "rgba(225,210,188,0.72)",
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      {children}

      {active && (
        <span
          style={{
            marginLeft: "auto",
            color: "rgba(205,170,100,0.7)",
            fontSize: 13,
          }}
        >
          ✓
        </span>
      )}
    </motion.button>
  );
}

const blockStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.044)",
  padding: "15px 0",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(220,205,182,0.78)",
};

const inputStyle: React.CSSProperties = {
  marginTop: 10,
  width: "100%",
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "11px 12px",
  color: "rgba(240,232,218,0.88)",
  fontSize: 13,
};

const pillWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
};

const dayStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.026)",
  border: "1px solid rgba(255,255,255,0.065)",
  borderRadius: 999,
  padding: "8px 11px",
  color: "rgba(185,162,128,0.52)",
  fontSize: 12,
  cursor: "pointer",
  minWidth: 44,
};