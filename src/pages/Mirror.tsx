import React, {
    useEffect,
    useState,
  } from "react";
  
  import { Link } from "wouter";
  
  import {
    motion,
  } from "framer-motion";
  
  import {
    ChevronLeft,
    Clock3,
    Crown,
    Lock,
    Quote,
    Sparkles,
  } from "lucide-react";
  
  import {
    loadMirrorPageData,
    markMirrorSeen,
  } from "@/lib/mirror";
  
  import type {
    MirrorGeneration,
    MirrorPageData,
  } from "@/lib/mirrorTypes";
  
  import {
    startSupporterCheckout,
  } from "@/lib/subscription";
  
  const colors = {
    bg: "#08080b",
    card: "rgba(255,255,255,.028)",
    border: "rgba(255,255,255,.07)",
    gold: "rgba(224,181,94,.92)",
    goldSoft: "rgba(205,170,100,.58)",
    text: "rgba(244,233,214,.94)",
    textSoft: "rgba(207,190,164,.66)",
    textFaint: "rgba(185,162,128,.40)",
    red: "rgba(245,140,120,.82)",
  };
  
  const serif: React.CSSProperties = {
    fontFamily:
      "Georgia, 'Times New Roman', serif",
    fontWeight: 400,
  };
  
  function formatDate(value: string) {
    if (!value) return "";
  
    try {
      return new Date(value).toLocaleDateString(
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
  
  function MirrorCard({
    generation,
    featured = false,
  }: {
    generation: MirrorGeneration;
    featured?: boolean;
  }) {
    const { result } = generation;
  
    return (
      <motion.article
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        style={{
          borderRadius: featured ? 26 : 21,
          border: featured
            ? "1px solid rgba(205,170,100,.22)"
            : `1px solid ${colors.border}`,
          background: featured
            ? "linear-gradient(145deg, rgba(205,170,100,.11), rgba(255,255,255,.025))"
            : colors.card,
          padding: featured
            ? "23px 19px"
            : "18px 16px",
          boxShadow: featured
            ? "0 24px 85px rgba(0,0,0,.25)"
            : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: colors.gold,
            }}
          >
            <Sparkles size={16} />
  
            <span
              style={{
                fontSize: 9,
                letterSpacing: ".17em",
                textTransform: "uppercase",
                fontWeight: 800,
              }}
            >
              Mirror
            </span>
          </div>
  
          <span
            style={{
              color: colors.textFaint,
              fontSize: 10,
            }}
          >
            {result.confidence_score}% confidence
          </span>
        </div>
  
        <h2
          style={{
            ...serif,
            color: colors.text,
            fontSize: featured ? 28 : 22,
            lineHeight: 1.2,
            margin: "0 0 21px",
          }}
        >
          {result.title}
        </h2>
  
        <div
          style={{
            display: "grid",
            gap: 11,
          }}
        >
          <div
            style={{
              borderRadius: 17,
              border: `1px solid ${colors.border}`,
              background: "rgba(0,0,0,.14)",
              padding: "15px 14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: colors.goldSoft,
                fontSize: 10,
                marginBottom: 9,
              }}
            >
              <Clock3 size={13} />
              Past · {formatDate(result.past_date)}
            </div>
  
            <p
              style={{
                ...serif,
                color: colors.text,
                fontSize: 17,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              “{result.past}”
            </p>
          </div>
  
          <div
            style={{
              borderRadius: 17,
              border:
                "1px solid rgba(205,170,100,.15)",
              background:
                "rgba(205,170,100,.055)",
              padding: "15px 14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: colors.gold,
                fontSize: 10,
                marginBottom: 9,
              }}
            >
              <Quote size={13} />
              Present · {formatDate(result.recent_date)}
            </div>
  
            <p
              style={{
                ...serif,
                color: colors.text,
                fontSize: 17,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              “{result.present}”
            </p>
          </div>
        </div>
  
        <p
          style={{
            color: colors.textSoft,
            fontSize: 13,
            lineHeight: 1.65,
            margin: "18px 2px 0",
          }}
        >
          {result.reflection}
        </p>
      </motion.article>
    );
  }
  
  export function Mirror() {
    const [data, setData] =
      useState<MirrorPageData | null>(null);
  
    const [loading, setLoading] =
      useState(true);
  
    const [error, setError] =
      useState("");
  
    const [checkoutLoading, setCheckoutLoading] =
      useState(false);
  
    useEffect(() => {
      let cancelled = false;
  
      async function load() {
        try {
          const result =
            await loadMirrorPageData();
  
          if (!cancelled) {
            setData(result);
  
            if (result.latest) {
              await markMirrorSeen();
            }
          }
        } catch (loadError: any) {
          if (!cancelled) {
            setError(
              loadError.message ||
                "Could not open Mirror."
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
      if (checkoutLoading) return;
  
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
  
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          minHeight: "100svh",
          maxWidth: 480,
          margin: "0 auto",
          background: colors.bg,
          color: colors.text,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 70% 12%, rgba(205,170,100,.13), transparent 28%)",
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
              marginBottom: 28,
            }}
          >
            <Link href="/home?tab=insights">
              <motion.button
                whileTap={{ scale: 0.94 }}
                aria-label="Back"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  border: `1px solid ${colors.border}`,
                  background:
                    "rgba(255,255,255,.035)",
                  color: colors.textSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft size={22} />
              </motion.button>
            </Link>
  
            <h1
              style={{
                textAlign: "center",
                fontSize: 19,
                margin: 0,
              }}
            >
              Mirror
            </h1>
  
            <div />
          </header>
  
          <section
            style={{
              textAlign: "center",
              marginBottom: 27,
            }}
          >
            <p
              style={{
                color: colors.gold,
                fontSize: 10,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                margin: "0 0 13px",
              }}
            >
              See what changed
            </p>
  
            <h2
              style={{
                ...serif,
                fontSize: 35,
                lineHeight: 1.14,
                margin: "0 0 13px",
              }}
            >
              Meet your past self.
            </h2>
  
            <p
              style={{
                color: colors.textSoft,
                fontSize: 13,
                lineHeight: 1.65,
                margin: "0 auto",
                maxWidth: 345,
              }}
            >
              Mirror compares what you say now with
              recordings from months ago and reveals one
              meaningful change.
            </p>
          </section>
  
          {loading && (
            <div
              style={{
                minHeight: 260,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.gold,
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <Sparkles size={28} />
              </motion.div>
            </div>
          )}
  
          {!loading && error && (
            <p
              style={{
                color: colors.red,
                textAlign: "center",
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              {error}
            </p>
          )}
  
          {!loading && data && !data.signedIn && (
            <section
              style={{
                borderRadius: 23,
                border:
                  "1px solid rgba(205,170,100,.18)",
                background:
                  "linear-gradient(145deg, rgba(205,170,100,.09), rgba(255,255,255,.024))",
                padding: "24px 20px",
                textAlign: "center",
              }}
            >
              <Lock
                size={26}
                color={colors.gold}
              />
  
              <h3
                style={{
                  ...serif,
                  fontSize: 25,
                  margin: "14px 0 9px",
                }}
              >
                Sign in to use Mirror.
              </h3>
            </section>
          )}
  
          {!loading &&
            data?.signedIn &&
            !data.isPremium && (
              <section
                style={{
                  borderRadius: 23,
                  border:
                    "1px solid rgba(205,170,100,.18)",
                  background:
                    "linear-gradient(145deg, rgba(205,170,100,.09), rgba(255,255,255,.024))",
                  padding: "24px 20px",
                  textAlign: "center",
                }}
              >
                <Crown
                  size={29}
                  color={colors.gold}
                />
  
                <h3
                  style={{
                    ...serif,
                    fontSize: 27,
                    margin: "15px 0 9px",
                  }}
                >
                  Mirror is Premium.
                </h3>
  
                <p
                  style={{
                    color: colors.textSoft,
                    fontSize: 13,
                    lineHeight: 1.65,
                    margin: "0 0 18px",
                  }}
                >
                  Premium lets The Nest compare your
                  recent recordings with your past voice.
                </p>
  
                <button
                  onClick={upgrade}
                  disabled={checkoutLoading}
                  style={{
                    width: "100%",
                    minHeight: 50,
                    borderRadius: 15,
                    border:
                      "1px solid rgba(205,170,100,.20)",
                    background:
                      "rgba(205,170,100,.09)",
                    color: colors.gold,
                    cursor: "pointer",
                    opacity:
                      checkoutLoading ? 0.55 : 1,
                  }}
                >
                  {checkoutLoading
                    ? "Opening Premium…"
                    : "Unlock Premium"}
                </button>
              </section>
            )}
  
          {!loading &&
            data?.isPremium &&
            !data.latest && (
              <section
                style={{
                  borderRadius: 23,
                  border: `1px solid ${colors.border}`,
                  background: colors.card,
                  padding: "26px 20px",
                  textAlign: "center",
                }}
              >
                <Sparkles
                  size={28}
                  color={colors.gold}
                />
  
                <h3
                  style={{
                    ...serif,
                    fontSize: 26,
                    margin: "15px 0 10px",
                  }}
                >
                  Your Mirror is still forming.
                </h3>
  
                <p
                  style={{
                    color: colors.textSoft,
                    fontSize: 13,
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  Mirror needs a recent Voice Capsule and
                  at least one meaningful recording from
                  30 or more days ago. It checks
                  automatically in the background.
                </p>
              </section>
            )}
  
          {!loading &&
            data?.isPremium &&
            data.latest && (
              <>
                <MirrorCard
                  generation={data.latest}
                  featured
                />
  
                {data.history.length > 1 && (
                  <section
                    style={{
                      marginTop: 25,
                    }}
                  >
                    <p
                      style={{
                        color: colors.goldSoft,
                        fontSize: 10,
                        letterSpacing: ".16em",
                        textTransform: "uppercase",
                        margin: "0 0 12px",
                      }}
                    >
                      Earlier Mirrors
                    </p>
  
                    <div
                      style={{
                        display: "grid",
                        gap: 11,
                      }}
                    >
                      {data.history
                        .slice(1)
                        .map((generation) => (
                          <MirrorCard
                            key={generation.id}
                            generation={generation}
                          />
                        ))}
                    </div>
                  </section>
                )}
              </>
            )}
  
          <p
            style={{
              color: colors.textFaint,
              fontSize: 10,
              lineHeight: 1.55,
              textAlign: "center",
              margin: "20px 18px 0",
            }}
          >
            Mirror only uses your own saved transcripts.
            It does not diagnose, judge or invent change.
          </p>
        </div>
      </motion.main>
    );
  }
  