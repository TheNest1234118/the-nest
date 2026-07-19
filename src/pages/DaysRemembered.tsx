import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "wouter";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Award,
  CalendarCheck,
  ChevronLeft,
  Clock3,
  Crown,
  Flame,
  Lock,
  Mic,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";

import {
  loadDaysRememberedProgress,
  type DaysRememberedProgress,
} from "@/lib/daysRemembered";

import {
  startSupporterCheckout,
} from "@/lib/subscription";

const colors = {
  bg: "#08080b",

  card:
    "rgba(255,255,255,.028)",

  border:
    "rgba(255,255,255,.07)",

  gold:
    "rgba(224,181,94,.92)",

  goldSoft:
    "rgba(205,170,100,.58)",

  text:
    "rgba(244,233,214,.94)",

  textSoft:
    "rgba(207,190,164,.66)",

  textFaint:
    "rgba(185,162,128,.40)",

  green:
    "rgba(135,220,151,.90)",

  greenSoft:
    "rgba(135,220,151,.10)",

  greenBorder:
    "rgba(135,220,151,.22)",

  red:
    "rgba(245,140,120,.82)",
};

const serif: React.CSSProperties = {
  fontFamily:
    "Georgia, 'Times New Roman', serif",

  fontWeight: 400,
};

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Not started";
  }

  try {
    const [year, month, day] =
      value.split("-").map(Number);

    return new Date(
      year,
      month - 1,
      day
    ).toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  } catch {
    return value;
  }
}

function ProgressRing({
  value,
  maximum,
  label,
  sublabel,
  size = 184,
}: {
  value: number;
  maximum: number;
  label: string;
  sublabel: string;
  size?: number;
}) {
  const percentage =
    maximum > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (value / maximum) * 100
          )
        )
      : 0;

  const degrees =
    percentage * 3.6;

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.9,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        padding: 8,
        background: `conic-gradient(
          rgba(224,181,94,.95) 0deg,
          rgba(224,181,94,.95) ${degrees}deg,
          rgba(255,255,255,.06) ${degrees}deg,
          rgba(255,255,255,.06) 360deg
        )`,
        boxShadow:
          "0 0 45px rgba(205,170,100,.11)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(205,170,100,.08), #0a0a0e 67%)",

          border:
            "1px solid rgba(205,170,100,.12)",

          display: "flex",
          flexDirection: "column",

          alignItems: "center",
          justifyContent: "center",

          textAlign: "center",
        }}
      >
        <div
          style={{
            ...serif,

            color: colors.text,

            fontSize: 40,
            lineHeight: 1,

            marginBottom: 7,
          }}
        >
          {value}
        </div>

        <div
          style={{
            color: colors.gold,

            fontSize: 12,
            fontWeight: 700,

            letterSpacing: ".08em",
          }}
        >
          / {maximum}
        </div>

        <div
          style={{
            color: colors.textSoft,

            fontSize: 11,
            marginTop: 9,
          }}
        >
          {label}
        </div>

        <div
          style={{
            color: colors.textFaint,

            fontSize: 9,
            marginTop: 3,
          }}
        >
          {sublabel}
        </div>
      </div>
    </motion.div>
  );
}

function RequirementCard({
  icon,
  title,
  value,
  goal,
  description,
  completed,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  goal: number;
  description: string;
  completed: boolean;
}) {
  const percent =
    goal > 0
      ? Math.min(
          100,
          (value / goal) * 100
        )
      : 0;

  return (
    <div
      style={{
        borderRadius: 19,

        border: completed
          ? `1px solid ${colors.greenBorder}`
          : `1px solid ${colors.border}`,

        background: completed
          ? colors.greenSoft
          : colors.card,

        padding: "16px 15px",
      }}
    >
      <div
        style={{
          display: "flex",

          alignItems: "flex-start",

          gap: 12,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,

            borderRadius: 14,

            flexShrink: 0,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            color: completed
              ? colors.green
              : colors.gold,

            border: completed
              ? `1px solid ${colors.greenBorder}`
              : "1px solid rgba(205,170,100,.15)",

            background: completed
              ? "rgba(135,220,151,.07)"
              : "rgba(205,170,100,.055)",
          }}
        >
          {icon}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",

              alignItems: "center",

              justifyContent:
                "space-between",

              gap: 10,

              marginBottom: 5,
            }}
          >
            <h3
              style={{
                color: colors.text,

                fontSize: 14,

                margin: 0,

                fontWeight: 600,
              }}
            >
              {title}
            </h3>

            <span
              style={{
                color: completed
                  ? colors.green
                  : colors.gold,

                fontSize: 11,

                flexShrink: 0,
              }}
            >
              {value} / {goal}
            </span>
          </div>

          <p
            style={{
              color: colors.textSoft,

              fontSize: 12,

              lineHeight: 1.5,

              margin: "0 0 11px",
            }}
          >
            {description}
          </p>

          <div
            style={{
              width: "100%",

              height: 5,

              borderRadius: 999,

              overflow: "hidden",

              background:
                "rgba(255,255,255,.055)",
            }}
          >
            <motion.div
              initial={{
                width: 0,
              }}
              animate={{
                width: `${percent}%`,
              }}
              transition={{
                duration: 0.85,

                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              }}
              style={{
                height: "100%",

                borderRadius: 999,

                background: completed
                  ? colors.green
                  : colors.gold,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        display: "flex",

        alignItems: "flex-start",

        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,

          borderRadius: 14,

          flexShrink: 0,

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          color: colors.gold,

          border:
            "1px solid rgba(205,170,100,.15)",

          background:
            "rgba(205,170,100,.055)",
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <h3
          style={{
            color: colors.text,

            fontSize: 14,

            margin: "1px 0 5px",

            fontWeight: 600,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            color: colors.textSoft,

            fontSize: 12,

            lineHeight: 1.58,

            margin: 0,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        minHeight: 420,

        display: "flex",
        flexDirection: "column",

        alignItems: "center",
        justifyContent: "center",

        textAlign: "center",
      }}
    >
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 1.2,

          repeat: Infinity,

          ease: "linear",
        }}
        style={{
          color: colors.gold,

          display: "flex",

          marginBottom: 14,
        }}
      >
        <Sparkles size={28} />
      </motion.div>

      <p
        style={{
          color: colors.textSoft,

          fontSize: 13,

          margin: 0,
        }}
      >
        Opening your journey…
      </p>
    </div>
  );
}

export function DaysRemembered() {
  const [
    progress,
    setProgress,
  ] =
    useState<DaysRememberedProgress | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    checkoutLoading,
    setCheckoutLoading,
  ] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result =
          await loadDaysRememberedProgress();

        if (!cancelled) {
          setProgress(result);
        }
      } catch (loadError: any) {
        console.error(
          "Could not load 365 Days Remembered:",
          loadError
        );

        if (!cancelled) {
          setError(
            loadError.message ||
              "Could not load your Award journey."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function upgrade() {
    if (checkoutLoading) {
      return;
    }

    setCheckoutLoading(true);
    setError("");

    try {
      await startSupporterCheckout();
    } catch (checkoutError: any) {
      setError(
        checkoutError.message ||
          "Could not open Premium checkout."
      );

      setCheckoutLoading(false);
    }
  }

  const statusText =
    useMemo(() => {
      if (!progress) {
        return "";
      }

      if (
        progress.awardUnlocked
      ) {
        return "Your Award is ready.";
      }

      if (!progress.isPremium) {
        return "Premium required";
      }

      if (
        progress.qualifiedToday
      ) {
        return "Today is remembered.";
      }

      if (
        progress.currentStreak === 0
      ) {
        return "Record your first qualifying reflection.";
      }

      return "Today is still waiting.";
    }, [progress]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",

        maxWidth: 480,

        margin: "0 auto",

        position: "relative",

        overflow: "hidden",

        background: colors.bg,

        color: colors.text,
      }}
    >
      <div
        style={{
          position: "absolute",

          inset: 0,

          pointerEvents: "none",

          background:
            "radial-gradient(circle at 72% 16%, rgba(220,155,45,.17), transparent 27%), radial-gradient(circle at 50% 60%, rgba(205,170,100,.05), transparent 46%)",
        }}
      />

      <motion.div
        animate={{
          opacity: [
            0.22,
            0.52,
            0.22,
          ],

          scale: [
            0.96,
            1.06,
            0.96,
          ],
        }}
        transition={{
          duration: 5,

          repeat: Infinity,

          ease: "easeInOut",
        }}
        style={{
          position: "absolute",

          top: 95,

          right: -55,

          width: 240,

          height: 240,

          borderRadius: 999,

          background:
            "radial-gradient(circle, rgba(224,181,94,.18), transparent 68%)",

          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",

          zIndex: 1,

          padding:
            "calc(env(safe-area-inset-top, 0px) + 24px) 20px 46px",
        }}
      >
        <header
          style={{
            display: "grid",

            gridTemplateColumns:
              "44px 1fr 44px",

            alignItems: "center",

            marginBottom: 20,
          }}
        >
          <Link href="/home">
            <motion.button
              whileTap={{
                scale: 0.94,
              }}
              aria-label="Back"
              style={{
                width: 42,

                height: 42,

                borderRadius: 999,

                border:
                  "1px solid rgba(255,255,255,.07)",

                background:
                  "rgba(255,255,255,.035)",

                color:
                  colors.textSoft,

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                cursor: "pointer",
              }}
            >
              <ChevronLeft
                size={22}
                strokeWidth={1.4}
              />
            </motion.button>
          </Link>

          <h1
            style={{
              textAlign: "center",

              color: colors.text,

              fontSize: 19,

              margin: 0,

              fontWeight: 600,
            }}
          >
            365 Days Remembered
          </h1>

          <div />
        </header>

        {loading && <LoadingState />}

        {!loading && error && (
          <p
            style={{
              color: colors.red,

              fontSize: 12,

              lineHeight: 1.55,

              margin: "0 0 15px",

              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        {!loading && progress && (
          <>
            <section
              style={{
                position: "relative",

                minHeight: 350,

                marginBottom: 10,
              }}
            >
              <div
                style={{
                  position: "relative",

                  zIndex: 2,

                  maxWidth: 190,

                  paddingRight: 8,

                  paddingTop: 28,
                }}
              >
                <p
                  style={{
                    color: colors.gold,

                    fontSize: 10,

                    letterSpacing:
                      ".19em",

                    textTransform:
                      "uppercase",

                    fontWeight: 700,

                    margin:
                      "0 0 14px",
                  }}
                >
                  Your story. Remembered.
                </p>

                <h2
                  style={{
                    ...serif,

                    color: colors.text,

                    fontSize: 35,

                    lineHeight: 1.14,

                    letterSpacing:
                      "-.025em",

                    margin:
                      "0 0 15px",
                  }}
                >
                  A year of your{" "}
                  <span
                    style={{
                      color:
                        colors.gold,
                    }}
                  >
                    voice.
                  </span>
                </h2>

                <p
                  style={{
                    color:
                      colors.textSoft,

                    fontSize: 13,

                    lineHeight: 1.65,

                    margin: 0,
                  }}
                >
                  Complete 365 qualifying
                  days and preserve a year
                  you can hold.
                </p>
              </div>

              <motion.img
                src="/365-days-remembered-award.jpg"
                alt="365 Days Remembered Award"
                initial={{
                  opacity: 0,

                  x: 28,

                  scale: 0.94,
                }}
                animate={{
                  opacity: 1,

                  x: 0,

                  scale: [
                    1,
                    1.012,
                    1,
                  ],

                  y: [
                    0,
                    -4,
                    0,
                  ],
                }}
                transition={{
                  opacity: {
                    duration: 0.8,
                  },

                  x: {
                    duration: 0.8,
                  },

                  scale: {
                    duration: 4.5,

                    repeat: Infinity,

                    ease: "easeInOut",
                  },

                  y: {
                    duration: 4.5,

                    repeat: Infinity,

                    ease: "easeInOut",
                  },
                }}
                style={{
                  position: "absolute",
                
                  // Award größer
                  width: 330,
                  maxWidth: "78vw",
                
                  right: -80,
                
                  // Award weiter nach oben
                  bottom: 70,
                
                  objectFit: "contain",
                
                  filter:
                    "drop-shadow(0 24px 55px rgba(0,0,0,.48)) drop-shadow(0 0 30px rgba(214,153,50,.16))",
                }}
              />
            </section>

            {!progress.signedIn && (
              <section
                style={{
                  borderRadius: 23,

                  border:
                    "1px solid rgba(205,170,100,.18)",

                  background:
                    "linear-gradient(145deg, rgba(205,170,100,.09), rgba(255,255,255,.024))",

                  padding:
                    "23px 20px",

                  textAlign: "center",

                  marginBottom: 14,
                }}
              >
                <Lock
                  size={25}
                  color={colors.gold}
                />

                <h2
                  style={{
                    ...serif,

                    color: colors.text,

                    fontSize: 25,

                    margin:
                      "14px 0 9px",
                  }}
                >
                  Sign in to begin.
                </h2>

                <p
                  style={{
                    color:
                      colors.textSoft,

                    fontSize: 13,

                    lineHeight: 1.6,

                    margin: 0,
                  }}
                >
                  Your journey must be
                  securely connected to
                  your account.
                </p>
              </section>
            )}

            {progress.signedIn && (
              <>
                <motion.section
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  style={{
                    borderRadius: 25,

                    border:
                      progress.qualifiedToday
                        ? `1px solid ${colors.greenBorder}`
                        : "1px solid rgba(205,170,100,.18)",

                    background:
                      progress.qualifiedToday
                        ? "linear-gradient(145deg, rgba(135,220,151,.10), rgba(255,255,255,.024))"
                        : "linear-gradient(145deg, rgba(205,170,100,.09), rgba(255,255,255,.024))",

                    padding:
                      "23px 18px",

                    marginBottom: 14,

                    textAlign:
                      "center",

                    boxShadow:
                      "0 22px 70px rgba(0,0,0,.24)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",

                      justifyContent:
                        "center",

                      marginBottom: 18,
                    }}
                  >
                    <ProgressRing
                      value={
                        progress.currentStreak
                      }
                      maximum={
                        progress.daysGoal
                      }
                      label="consecutive days"
                      sublabel={`${progress.streakProgressPercent.toFixed(
                        1
                      )}% complete`}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      gap: 8,

                      color:
                        progress.qualifiedToday
                          ? colors.green
                          : colors.gold,

                      marginBottom: 8,
                    }}
                  >
                    {progress.qualifiedToday ? (
                      <CalendarCheck
                        size={18}
                      />
                    ) : (
                      <Flame
                        size={18}
                      />
                    )}

                    <span
                      style={{
                        fontSize: 14,

                        fontWeight: 700,
                      }}
                    >
                      {statusText}
                    </span>
                  </div>

                  <p
                    style={{
                      color:
                        colors.textSoft,

                      fontSize: 12,

                      lineHeight: 1.6,

                      margin: 0,
                    }}
                  >
                    {progress.qualifiedToday
                      ? "At least one Voice Reflection qualified in your local calendar today."
                      : progress.isPremium
                      ? "Record one clear, personal and connected Voice Reflection before your local day ends."
                      : "Qualifying days only count while Premium is active."}
                  </p>

                  <p
                    style={{
                      color:
                        colors.textFaint,

                      fontSize: 10,

                      margin:
                        "10px 0 0",
                    }}
                  >
                    Timezone:{" "}
                    {progress.timezone}
                  </p>
                </motion.section>

                {!progress.isPremium && (
                  <motion.section
                    initial={{
                      opacity: 0,
                      y: 12,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    style={{
                      borderRadius: 23,

                      border:
                        "1px solid rgba(205,170,100,.18)",

                      background:
                        "linear-gradient(145deg, rgba(205,170,100,.09), rgba(255,255,255,.022))",

                      padding:
                        "20px 18px",

                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",

                        alignItems:
                          "flex-start",

                        gap: 13,
                      }}
                    >
                      <div
                        style={{
                          width: 48,

                          height: 48,

                          borderRadius: 15,

                          display: "flex",

                          alignItems:
                            "center",

                          justifyContent:
                            "center",

                          color:
                            colors.gold,

                          border:
                            "1px solid rgba(205,170,100,.16)",

                          background:
                            "rgba(205,170,100,.06)",

                          flexShrink: 0,
                        }}
                      >
                        <Crown
                          size={22}
                        />
                      </div>

                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        <h2
                          style={{
                            ...serif,

                            color:
                              colors.text,

                            fontSize: 23,

                            margin:
                              "0 0 7px",
                          }}
                        >
                          Premium required
                        </h2>

                        <p
                          style={{
                            color:
                              colors.textSoft,

                            fontSize: 12,

                            lineHeight: 1.6,

                            margin: 0,
                          }}
                        >
                          Existing progress
                          stays saved, but new
                          qualifying days only
                          count while Premium
                          is active.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={upgrade}
                      disabled={
                        checkoutLoading
                      }
                      style={{
                        width: "100%",

                        minHeight: 50,

                        marginTop: 17,

                        borderRadius: 15,

                        border:
                          "1px solid rgba(205,170,100,.20)",

                        background:
                          "rgba(205,170,100,.09)",

                        color:
                          colors.gold,

                        fontSize: 13,

                        cursor:
                          checkoutLoading
                            ? "default"
                            : "pointer",

                        opacity:
                          checkoutLoading
                            ? 0.5
                            : 1,
                      }}
                    >
                      {checkoutLoading
                        ? "Opening Premium…"
                        : "Unlock Premium"}
                    </button>
                  </motion.section>
                )}

                <section
                  style={{
                    display: "grid",

                    gap: 10,

                    marginBottom: 14,
                  }}
                >
                  <RequirementCard
                    icon={
                      <Mic
                        size={20}
                      />
                    }
                    title="365 qualifying days"
                    value={
                      progress.currentStreak
                    }
                    goal={
                      progress.daysGoal
                    }
                    description="One qualifying Voice Reflection is required on every consecutive local calendar day."
                    completed={
                      progress.currentStreak >=
                      progress.daysGoal
                    }
                  />

                  <RequirementCard
                    icon={
                      <Crown
                        size={20}
                      />
                    }
                    title="12 paid Premium months"
                    value={
                      progress.paidPremiumMonths
                    }
                    goal={
                      progress.premiumMonthsGoal
                    }
                    description="Only successfully paid Premium subscription invoices count."
                    completed={
                      progress.paidPremiumMonths >=
                      progress.premiumMonthsGoal
                    }
                  />
                </section>

                <section
                  style={{
                    display: "grid",

                    gridTemplateColumns:
                      "1fr 1fr",

                    gap: 10,

                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 18,

                      border:
                        `1px solid ${colors.border}`,

                      background:
                        colors.card,

                      padding:
                        "16px 14px",

                      textAlign:
                        "center",
                    }}
                  >
                    <Flame
                      size={20}
                      color={
                        colors.gold
                      }
                    />

                    <div
                      style={{
                        ...serif,

                        color:
                          colors.text,

                        fontSize: 26,

                        margin:
                          "9px 0 4px",
                      }}
                    >
                      {
                        progress.longestStreak
                      }
                    </div>

                    <div
                      style={{
                        color:
                          colors.textSoft,

                        fontSize: 11,
                      }}
                    >
                      Longest streak
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 18,

                      border:
                        `1px solid ${colors.border}`,

                      background:
                        colors.card,

                      padding:
                        "16px 14px",

                      textAlign:
                        "center",
                    }}
                  >
                    <CalendarCheck
                      size={20}
                      color={
                        colors.gold
                      }
                    />

                    <div
                      style={{
                        ...serif,

                        color:
                          colors.text,

                        fontSize: 26,

                        margin:
                          "9px 0 4px",
                      }}
                    >
                      {
                        progress.totalQualifiedDays
                      }
                    </div>

                    <div
                      style={{
                        color:
                          colors.textSoft,

                        fontSize: 11,
                      }}
                    >
                      Total remembered
                    </div>
                  </div>
                </section>

                <section
                  style={{
                    borderRadius: 23,

                    border:
                      `1px solid ${colors.border}`,

                    background:
                      colors.card,

                    padding:
                      "20px 17px",

                    display: "grid",

                    gap: 21,

                    marginBottom: 14,
                  }}
                >
                  <InfoRow
                    icon={
                      <Mic
                        size={20}
                      />
                    }
                    title="One day, one chance"
                    text="Several recordings on the same date still count as only one qualifying day."
                  />

                  <InfoRow
                    icon={
                      <ShieldCheck
                        size={20}
                      />
                    }
                    title="Evaluated server-side"
                    text="OpenAI checks whether the transcript contains clear, coherent and personal reflection. The browser cannot change the result."
                  />

                  <InfoRow
                    icon={
                      <Clock3
                        size={20}
                      />
                    }
                    title="No catch-up days"
                    text="A missed local calendar day resets the current streak. Two recordings tomorrow cannot replace yesterday."
                  />

                  <InfoRow
                    icon={
                      <Trophy
                        size={20}
                      />
                    }
                    title="Last qualifying day"
                    text={formatDate(
                      progress.lastQualifiedDate
                    )}
                  />
                </section>

                <AnimatePresence>
                  {progress.awardUnlocked && (
                    <motion.section
                      initial={{
                        opacity: 0,
                        y: 14,
                        scale: 0.98,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      style={{
                        borderRadius: 25,

                        border:
                          "1px solid rgba(224,181,94,.30)",

                        background:
                          "linear-gradient(145deg, rgba(224,181,94,.16), rgba(255,255,255,.03))",

                        padding:
                          "24px 20px",

                        textAlign:
                          "center",

                        boxShadow:
                          "0 22px 80px rgba(205,170,100,.12)",
                      }}
                    >
                      <motion.div
                        animate={{
                          rotate: [
                            -3,
                            3,
                            -3,
                          ],
                        }}
                        transition={{
                          duration: 3,

                          repeat:
                            Infinity,

                          ease:
                            "easeInOut",
                        }}
                        style={{
                          color:
                            colors.gold,

                          display:
                            "inline-flex",
                        }}
                      >
                        <Award
                          size={38}
                        />
                      </motion.div>

                      <h2
                        style={{
                          ...serif,

                          color:
                            colors.text,

                          fontSize: 29,

                          margin:
                            "14px 0 9px",
                        }}
                      >
                        Your Award is unlocked.
                      </h2>

                      <p
                        style={{
                          color:
                            colors.textSoft,

                          fontSize: 13,

                          lineHeight: 1.65,

                          margin:
                            "0 0 17px",
                        }}
                      >
                        You completed 365
                        consecutive
                        qualifying days and
                        twelve paid Premium
                        months.
                      </p>

                      <button
                        disabled
                        style={{
                          width: "100%",

                          minHeight: 50,

                          borderRadius: 15,

                          border:
                            "1px solid rgba(205,170,100,.20)",

                          background:
                            "rgba(205,170,100,.09)",

                          color:
                            colors.gold,

                          opacity: 0.62,
                        }}
                      >
                        Address confirmation
                        coming soon
                      </button>
                    </motion.section>
                  )}
                </AnimatePresence>

                {!progress.awardUnlocked && (
                  <p
                    style={{
                      color:
                        colors.textFaint,

                      textAlign:
                        "center",

                      fontSize: 10,

                      lineHeight: 1.55,

                      margin:
                        "18px 18px 0",
                    }}
                  >
                    The physical Award becomes
                    available only after both
                    requirements are complete.
                    Manufacturing, address
                    confirmation and shipping
                    terms will be shown before
                    ordering.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}