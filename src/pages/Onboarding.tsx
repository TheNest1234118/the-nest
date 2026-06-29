import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

type Experience = "never" | "sometimes" | "regularly";
type ReminderPeriod = "morning" | "afternoon" | "evening" | "custom";

const REASONS = [
  "Mein Kopf ist ständig voll",
  "Stress abbauen",
  "Meine Gedanken ordnen",
  "Meine Ziele verfolgen",
  "Erinnerungen festhalten",
  "Meine mentale Gesundheit verbessern",
  "Dankbarkeit üben",
  "Emotionen besser verstehen",
];

const REMINDERS: { key: ReminderPeriod; label: string; time: string }[] = [
  { key: "morning", label: "Morgens", time: "09:00" },
  { key: "afternoon", label: "Nachmittags", time: "14:00" },
  { key: "evening", label: "Abends", time: "21:00" },
];

const STORAGE_KEY = "nest_onboarding_preferences";
const DONE_KEY = "nest_guide_completed";

export function Onboarding() {
  const [, navigate] = useLocation();

  const [index, setIndex] = useState(0);
  const [reasons, setReasons] = useState<string[]>([]);
  const [experience, setExperience] = useState<Experience | "">("");
  const [reminderPeriod, setReminderPeriod] =
    useState<ReminderPeriod>("evening");
  const [reminderTime, setReminderTime] = useState("21:00");

  const progress = useMemo(() => ((index + 1) / 5) * 100, [index]);

  const savePartial = (next?: Record<string, unknown>) => {
    const payload = {
      journal_reasons: reasons,
      journaling_experience: experience,
      reminder_enabled: true,
      reminder_period: reminderPeriod,
      reminder_time: reminderTime,
      ...next,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const finishGuide = () => {
    savePartial({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    });

    localStorage.setItem(DONE_KEY, "true");

    navigate("/thoughts");
  };

  const next = () => {
    savePartial();

    if (index >= 4) {
      finishGuide();
      return;
    }

    setIndex((current) => current + 1);
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

  const chooseReminder = (period: ReminderPeriod, time: string) => {
    setReminderPeriod(period);
    setReminderTime(time);

    savePartial({
      reminder_enabled: true,
      reminder_period: period,
      reminder_time: time,
    });
  };

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#ffffff",
        color: "#0b0b0d",
        display: "flex",
        justifyContent: "center",
        padding: "22px 18px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          minHeight: "calc(100svh - 44px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            height: 5,
            width: "100%",
            background: "#eeeeee",
            borderRadius: 999,
            overflow: "hidden",
            marginBottom: 52,
          }}
        >
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
              height: "100%",
              background: "#0b0b0d",
              borderRadius: 999,
            }}
          />
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: "100%" }}
            >
              {index === 0 && (
                <Step>
                  <Title>Willkommen.</Title>
                  <Subtitle>Lass uns deinen Kopf ordnen.</Subtitle>

                  <PrimaryButton onClick={next}>Los geht’s</PrimaryButton>
                </Step>
              )}

              {index === 1 && (
                <Step>
                  <Title>Warum möchtest du journalen?</Title>
                  <Subtitle>Mehrfachauswahl möglich.</Subtitle>

                  <div style={{ display: "grid", gap: 10, marginTop: 26 }}>
                    {REASONS.map((reason) => {
                      const active = reasons.includes(reason);

                      return (
                        <OptionCard
                          key={reason}
                          active={active}
                          onClick={() => toggleReason(reason)}
                        >
                          {reason}
                        </OptionCard>
                      );
                    })}
                  </div>

                  <PrimaryButton
                    onClick={next}
                    disabled={reasons.length === 0}
                  >
                    Weiter
                  </PrimaryButton>
                </Step>
              )}

              {index === 2 && (
                <Step>
                  <Title>Hast du schon einmal gejournalt?</Title>

                  <div style={{ display: "grid", gap: 12, marginTop: 28 }}>
                    <OptionCard
                      active={experience === "never"}
                      onClick={() => chooseExperience("never")}
                    >
                      Noch nie
                    </OptionCard>

                    <OptionCard
                      active={experience === "sometimes"}
                      onClick={() => chooseExperience("sometimes")}
                    >
                      Manchmal
                    </OptionCard>

                    <OptionCard
                      active={experience === "regularly"}
                      onClick={() => chooseExperience("regularly")}
                    >
                      Regelmäßig
                    </OptionCard>
                  </div>

                  <PrimaryButton onClick={next} disabled={!experience}>
                    Weiter
                  </PrimaryButton>
                </Step>
              )}

              {index === 3 && (
                <Step>
                  <Title>Wann möchtest du erinnert werden?</Title>
                  <Subtitle>Du kannst die Zeit später ändern.</Subtitle>

                  <div style={{ display: "grid", gap: 12, marginTop: 28 }}>
                    {REMINDERS.map((item) => (
                      <OptionCard
                        key={item.key}
                        active={reminderPeriod === item.key}
                        onClick={() => chooseReminder(item.key, item.time)}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <span>{item.label}</span>
                          <span style={{ color: "#8a8a8f" }}>{item.time}</span>
                        </div>
                      </OptionCard>
                    ))}

                    <div
                      style={{
                        border:
                          reminderPeriod === "custom"
                            ? "1px solid #0b0b0d"
                            : "1px solid #e8e8e8",
                        borderRadius: 22,
                        padding: 16,
                        background:
                          reminderPeriod === "custom" ? "#f7f7f7" : "#fff",
                      }}
                    >
                      <button
                        onClick={() => chooseReminder("custom", reminderTime)}
                        style={{
                          width: "100%",
                          background: "none",
                          border: "none",
                          padding: 0,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 15,
                          color: "#111",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span>Eigene Zeit</span>
                        <input
                          type="time"
                          value={reminderTime}
                          onChange={(e) => {
                            setReminderTime(e.target.value);
                            setReminderPeriod("custom");
                            savePartial({
                              reminder_enabled: true,
                              reminder_period: "custom",
                              reminder_time: e.target.value,
                            });
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            fontSize: 15,
                            color: "#111",
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  <PrimaryButton onClick={next}>Weiter</PrimaryButton>
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
                      background: "#0b0b0d",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 34,
                      margin: "0 auto 28px",
                    }}
                  >
                    ✓
                  </motion.div>

                  <Title>Alles bereit.</Title>
                  <Subtitle>
                    Deine persönlichen Einstellungen wurden gespeichert.
                  </Subtitle>

                  <PrimaryButton onClick={finishGuide}>
                    Erstes Journal starten
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
              marginTop: 20,
              background: "none",
              border: "none",
              color: "#9a9a9f",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Zurück
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
  return (
    <div
      style={{
        textAlign: center ? "center" : "left",
      }}
    >
      {children}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontSize: 42,
        lineHeight: 1.05,
        letterSpacing: "-0.045em",
        fontWeight: 650,
        color: "#050505",
        marginBottom: 14,
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
        fontSize: 17,
        lineHeight: 1.55,
        color: "#77777d",
        maxWidth: 390,
        marginBottom: 26,
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
      whileTap={{ scale: disabled ? 1 : 0.985 }}
      onClick={disabled ? undefined : onClick}
      style={{
        width: "100%",
        marginTop: 30,
        border: "none",
        background: "#0b0b0d",
        color: "#fff",
        borderRadius: 20,
        padding: "17px 20px",
        fontSize: 15,
        fontWeight: 600,
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
        border: active ? "1px solid #0b0b0d" : "1px solid #e8e8e8",
        background: active ? "#f5f5f5" : "#ffffff",
        borderRadius: 22,
        padding: "17px 18px",
        color: "#111",
        fontSize: 15,
        textAlign: "left",
        cursor: "pointer",
        boxShadow: active
          ? "0 12px 32px rgba(0,0,0,0.06)"
          : "0 8px 24px rgba(0,0,0,0.03)",
      }}
    >
      {children}
    </motion.button>
  );
}