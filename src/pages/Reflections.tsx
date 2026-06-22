import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Sparkles } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/subscription";
import { UpgradeScreen } from "@/components/UpgradeScreen";
import type { User } from "@supabase/supabase-js";
import {
  generateReflection,
  getAiReflectionOptIn,
  loadReflections,
  setAiReflectionOptIn,
  type Reflection,
  type ReflectionType,
} from "@/lib/reflections";

type LockState = {
  nextAvailableAt: string;
  daysRemaining: number;
};

function labelType(type: ReflectionType) {
  return type === "weekly" ? "Weekly Reflection" : "Monthly Reflection";
}

function getLimitDays(type: ReflectionType) {
  return type === "weekly" ? 7 : 30;
}

function calculateLock(reflections: Reflection[], type: ReflectionType): LockState | null {
  const latest = reflections
    .filter((reflection) => reflection.type === type)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

  if (!latest) return null;

  const next = new Date(latest.created_at);
  next.setDate(next.getDate() + getLimitDays(type));

  const now = new Date();

  if (now >= next) return null;

  return {
    nextAvailableAt: next.toISOString(),
    daysRemaining: Math.max(
      1,
      Math.ceil((next.getTime() - now.getTime()) / 86400000)
    ),
  };
}

function TinyLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "rgba(205,170,100,0.42)",
        marginBottom: 8,
      }}
    >
      {children}
    </p>
  );
}

function BadgeList({ items }: { items: string[] }) {
  if (!items?.length) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
      {items.map((item, i) => (
        <span
          key={i}
          style={{
            fontSize: 11,
            lineHeight: 1.3,
            color: "rgba(225,210,188,0.72)",
            background: "rgba(205,170,100,0.075)",
            border: "1px solid rgba(205,170,100,0.12)",
            borderRadius: 999,
            padding: "6px 9px",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ShortList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;

  return (
    <div style={{ marginTop: 18 }}>
      <TinyLabel>{title}</TinyLabel>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map((item, i) => (
          <p
            key={i}
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "rgba(220,205,182,0.68)",
            }}
          >
            • {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function OpenThoughts({ items }: { items: string[] }) {
  if (!items?.length) return null;

  return (
    <div style={{ marginTop: 18 }}>
      <TinyLabel>One question</TinyLabel>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.024)",
              border: "1px solid rgba(255,255,255,0.055)",
              borderRadius: 13,
              padding: "11px 13px",
            }}
          >
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: "rgba(220,205,182,0.66)",
              }}
            >
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReflectionCard({ reflection }: { reflection: Reflection }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.026)",
        border: "1px solid rgba(255,255,255,0.065)",
        borderRadius: 18,
        padding: 18,
      }}
    >
      <TinyLabel>{labelType(reflection.type)}</TinyLabel>

      <p
        style={{
          fontSize: 11,
          color: "rgba(175,158,132,0.46)",
          marginBottom: 13,
        }}
      >
        {reflection.period_start} → {reflection.period_end}
      </p>

      {reflection.summary && (
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: "rgba(235,215,180,0.82)",
          }}
        >
          {reflection.summary}
        </p>
      )}

      <BadgeList items={reflection.themes || []} />

      <ShortList
  title={reflection.type === "weekly" ? "Patterns you returned to" : "Things you cared about"}
  items={reflection.cared_about || []}
/>

<ShortList
  title={reflection.type === "weekly" ? "What changed" : "Positive moments"}
  items={reflection.positive_moments || []}
/>

      <OpenThoughts items={reflection.open_thoughts || []} />

      {reflection.closing_sentence && (
        <p
          style={{
            marginTop: 18,
            fontSize: 13,
            lineHeight: 1.6,
            color: "rgba(205,170,100,0.62)",
            fontStyle: "italic",
          }}
        >
          {reflection.closing_sentence}
        </p>
      )}
    </div>
  );
}

function GenerateButton({
  type,
  allowAi,
  loading,
  lock,
  onGenerate,
}: {
  type: ReflectionType;
  allowAi: boolean;
  loading: ReflectionType | null;
  lock: LockState | null;
  onGenerate: (type: ReflectionType) => void;
}) {
  const disabled = !allowAi || loading !== null || Boolean(lock);

  return (
    <div>
      <button
        disabled={disabled}
        onClick={() => onGenerate(type)}
        style={{
          width: "100%",
          minHeight: 98,
          border: "1px solid rgba(255,255,255,0.065)",
          background: "rgba(255,255,255,0.026)",
          borderRadius: 16,
          padding: 15,
          color: "rgba(225,210,188,0.80)",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.45 : 1,
          textAlign: "left",
        }}
      >
        <Sparkles size={16} />

        <div style={{ marginTop: 9, fontSize: 13 }}>
          Generate {type} reflection
        </div>
      </button>

      {lock && (
        <p
          style={{
            marginTop: 8,
            fontSize: 11,
            lineHeight: 1.45,
            color: "rgba(175,158,132,0.48)",
          }}
        >
          Next {type} reflection available in {lock.daysRemaining} days.
        </p>
      )}
    </div>
  );
}

function LockedReflectionsScreen({
  authOpen,
  setAuthOpen,
}: {
  authOpen: boolean;
  setAuthOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
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
        padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 36px",
      }}
    >
      <header
        style={{
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Link href="/home">
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(185,162,128,0.32)",
              padding: 2,
            }}
          >
            <ChevronLeft strokeWidth={1.3} size={24} />
          </button>
        </Link>

        <div>
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 25,
              fontWeight: 400,
              color: "rgba(235,215,180,0.90)",
              letterSpacing: "0.03em",
              lineHeight: 1.15,
              marginBottom: 5,
            }}
          >
            Reflections
          </h2>

          <p
            style={{
              fontSize: 13,
              color: "rgba(185,162,128,0.48)",
              fontWeight: 300,
              lineHeight: 1.5,
            }}
          >
            Quiet summaries from your own thoughts over time.
          </p>
        </div>
      </header>

      <section
        style={{
          background: "rgba(255,255,255,0.026)",
          border: "1px solid rgba(255,255,255,0.065)",
          borderRadius: 22,
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(205,170,100,0.46)",
            marginBottom: 14,
          }}
        >
          Sign in required
        </p>

        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 27,
            fontWeight: 400,
            lineHeight: 1.2,
            color: "rgba(235,215,180,0.90)",
            marginBottom: 14,
          }}
        >
          Your reflections need an account.
        </h1>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: "rgba(198,178,150,0.62)",
            marginBottom: 24,
          }}
        >
          Weekly and monthly reflections are created from your saved thoughts,
          voice capsules and anchors. Sign in so The Nest can remember them safely.
        </p>

        <button
          onClick={() => setAuthOpen(true)}
          style={{
            width: "100%",
            border: "1px solid rgba(205,170,100,0.18)",
            background: "rgba(205,170,100,0.09)",
            color: "rgba(235,215,180,0.88)",
            borderRadius: 999,
            padding: "14px 18px",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Sign in to unlock
        </button>
      </section>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => setAuthOpen(false)}
      />
    </motion.div>
  );
}

export function Reflections() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [plan, setPlan] = useState<"free" | "supporter">("free");
  const [allowAi, setAllowAi] = useState(false);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState<ReflectionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverLocks, setServerLocks] = useState<
    Partial<Record<ReflectionType, LockState>>
  >({});

  async function refresh() {
    const [optIn, saved] = await Promise.all([
      getAiReflectionOptIn(),
      loadReflections(),
    ]);

    setAllowAi(optIn);
    setReflections(saved);
  }

  useEffect(() => {
    async function checkUser() {
      getProfile()
  .then((profile) => setPlan(profile?.plan || "free"))
  .catch(console.error);
      const { data } = await supabase.auth.getUser();

      setUser(data.user ?? null);
      setCheckingAuth(false);

      if (data.user) {
        refresh().catch((err) => setError(String(err.message || err)));
      }
    }

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          refresh().catch((err) => setError(String(err.message || err)));
        } else {
          setAllowAi(false);
          setReflections([]);
          setServerLocks({});
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const weeklyLock = useMemo(
    () => serverLocks.weekly ?? calculateLock(reflections, "weekly"),
    [reflections, serverLocks.weekly]
  );

  const monthlyLock = useMemo(
    () => serverLocks.monthly ?? calculateLock(reflections, "monthly"),
    [reflections, serverLocks.monthly]
  );

  async function handleToggle() {
    const next = !allowAi;

    setAllowAi(next);

    try {
      await setAiReflectionOptIn(next);
    } catch (err: any) {
      setAllowAi(!next);
      setError(String(err.message || err));
    }
  }

  async function handleGenerate(type: ReflectionType) {
    setError(null);
    setLoading(type);
    if (type === "monthly" && plan !== "supporter") {
      setLoading(null);
      setError("Monthly Reflections use AI processing and are included in the Supporter Plan.");
      return;
    }
    try {
      const result = await generateReflection(type);

      if (!result.ok) {
        if (result.nextAvailableAt && result.daysRemaining) {
          setServerLocks((prev) => ({
            ...prev,
            [type]: {
              nextAvailableAt: result.nextAvailableAt!,
              daysRemaining: result.daysRemaining!,
            },
          }));
        }

        setError(result.error || "Could not generate reflection.");
        return;
      }

      if (!result.reflection) {
        setError("Could not generate reflection.");
        return;
      }

      setServerLocks((prev) => {
        const next = { ...prev };
        delete next[type];
        return next;
      });

      setReflections((prev) => {
        const filtered = prev.filter((r) => r.id !== result.reflection!.id);
        return [result.reflection!, ...filtered];
      });
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setLoading(null);
    }
  }

  if (checkingAuth) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          minHeight: "100svh",
          background: "#09090d",
          maxWidth: 480,
          margin: "0 auto",
        }}
      />
    );
  }

  if (!user) {
    return <LockedReflectionsScreen authOpen={authOpen} setAuthOpen={setAuthOpen} />;
  }

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
        padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 36px",
      }}
    >
      <header
        style={{
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Link href="/home">
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(185,162,128,0.32)",
              padding: 2,
            }}
          >
            <ChevronLeft strokeWidth={1.3} size={24} />
          </button>
        </Link>

        <div>
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 25,
              fontWeight: 400,
              color: "rgba(235,215,180,0.90)",
              letterSpacing: "0.03em",
              lineHeight: 1.15,
              marginBottom: 5,
            }}
          >
            Reflections
          </h2>

          <p
            style={{
              fontSize: 13,
              color: "rgba(185,162,128,0.48)",
              fontWeight: 300,
              lineHeight: 1.5,
            }}
          >
            Quiet summaries from your own thoughts over time.
          </p>
        </div>
      </header>

      <section
        style={{
          background: "rgba(255,255,255,0.026)",
          border: "1px solid rgba(255,255,255,0.065)",
          borderRadius: 18,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.65,
            color: "rgba(220,205,182,0.68)",
            marginBottom: 14,
          }}
        >
          Your thoughts stay yours. Your voice notes are private and only used
          to create your personal reflections. You can delete your data anytime.
        </p>

        <p
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: "rgba(175,158,132,0.50)",
            marginBottom: 16,
          }}
        >
          If AI reflections are enabled, your written thoughts, voice memo
          transcripts and anchors may be sent to AI to create your private
          summaries.
        </p>

        <button
          onClick={handleToggle}
          style={{
            width: "100%",
            border: "1px solid rgba(205,170,100,0.16)",
            background: allowAi
              ? "rgba(205,170,100,0.11)"
              : "rgba(255,255,255,0.028)",
            borderRadius: 14,
            padding: "13px 14px",
            color: "rgba(235,215,180,0.82)",
            cursor: "pointer",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {allowAi ? "AI reflections allowed" : "Allow AI reflections"}
        </button>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <GenerateButton
          type="weekly"
          allowAi={allowAi}
          loading={loading}
          lock={weeklyLock}
          onGenerate={handleGenerate}
        />

{plan === "supporter" ? (
  <GenerateButton
    type="monthly"
    allowAi={allowAi}
    loading={loading}
    lock={monthlyLock}
    onGenerate={handleGenerate}
  />
) : (
  <div>
    <button
      onClick={() =>
        setError(
          "Monthly Reflections use AI processing and are included in the Supporter Plan."
        )
      }
      style={{
        width: "100%",
        minHeight: 98,
        border: "1px solid rgba(205,170,100,0.12)",
        background: "rgba(205,170,100,0.045)",
        borderRadius: 16,
        padding: 15,
        color: "rgba(225,210,188,0.72)",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <Sparkles size={16} />
      <div style={{ marginTop: 9, fontSize: 13 }}>
        Monthly Reflection
      </div>
      <div
        style={{
          marginTop: 5,
          fontSize: 11,
          color: "rgba(175,158,132,0.42)",
          lineHeight: 1.4,
        }}
      >
        Included in Supporter
      </div>
    </button>
  </div>
)}
      </div>

      {loading && (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      background: "rgba(255,255,255,0.026)",
      border: "1px solid rgba(205,170,100,0.10)",
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      textAlign: "center",
    }}
  >
    <p
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 18,
        color: "rgba(235,215,180,0.88)",
        marginBottom: 8,
      }}
    >
      Creating your {loading} reflection
    </p>

    <p
      style={{
        fontSize: 12,
        lineHeight: 1.6,
        color: "rgba(175,158,132,0.54)",
      }}
    >
      Looking back through your thoughts, moods and voice notes...
      <br />
      This can take a few moments.
    </p>
  </motion.div>
)}

      {error && (
        <p
          style={{
            fontSize: 12,
            color: "rgba(248,113,113,0.68)",
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          {error}
        </p>
      )}

      {reflections.length === 0 ? (
        <div
          style={{
            background: "rgba(255,255,255,0.024)",
            border: "1px solid rgba(255,255,255,0.055)",
            borderRadius: 18,
            padding: "22px 24px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "rgba(175,158,132,0.42)",
              fontWeight: 300,
              lineHeight: 1.6,
              fontStyle: "italic",
            }}
          >
            Add a few more thoughts or voice notes first. Your reflection will
            be more meaningful when there is more to look back on.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reflections.map((reflection) => (
            <ReflectionCard key={reflection.id} reflection={reflection} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
