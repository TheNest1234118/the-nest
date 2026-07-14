import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Clock3,
  Crown,
  Mic,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const colors = {
  bg: "#08080b",
  card: "rgba(255,255,255,.028)",
  border: "rgba(255,255,255,.07)",
  gold: "rgba(224,181,94,.92)",
  goldSoft: "rgba(205,170,100,.58)",
  text: "rgba(244,233,214,.94)",
  textSoft: "rgba(207,190,164,.66)",
  textFaint: "rgba(185,162,128,.40)",
};

const serif: React.CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontWeight: 400,
};

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
          width: 46,
          height: 46,
          borderRadius: 15,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.gold,
          border: "1px solid rgba(205,170,100,.15)",
          background: "rgba(205,170,100,.055)",
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <h3
          style={{
            color: colors.text,
            fontSize: 15,
            margin: "1px 0 5px",
            fontWeight: 600,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            color: colors.textSoft,
            fontSize: 13,
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

export function DaysRemembered() {
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
            "radial-gradient(circle at 72% 20%, rgba(220,155,45,.18), transparent 28%), radial-gradient(circle at 50% 55%, rgba(205,170,100,.05), transparent 48%)",
        }}
      />

      <motion.div
        animate={{
          opacity: [0.25, 0.58, 0.25],
          scale: [0.96, 1.06, 0.96],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          top: 110,
          right: -65,
          width: 260,
          height: 260,
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
            gridTemplateColumns: "44px 1fr 44px",
            alignItems: "center",
            marginBottom: 26,
          }}
        >
          <Link href="/home">
            <motion.button
              whileTap={{ scale: 0.94 }}
              aria-label="Back"
              style={{
                width: 42,
                height: 42,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.07)",
                background: "rgba(255,255,255,.035)",
                color: colors.textSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ChevronLeft size={22} strokeWidth={1.4} />
            </motion.button>
          </Link>

          <h1
            style={{
              textAlign: "center",
              color: colors.text,
              fontSize: 20,
              margin: 0,
              fontWeight: 600,
            }}
          >
            365 Days Remembered
          </h1>

          <div />
        </header>

        <section
          style={{
            position: "relative",
            minHeight: 490,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              position: "relative",
              zIndex: 2,
              maxWidth: 235,
              paddingTop: 36,
            }}
          >
            <p
              style={{
                color: colors.gold,
                fontSize: 10,
                letterSpacing: ".19em",
                textTransform: "uppercase",
                fontWeight: 700,
                margin: "0 0 15px",
              }}
            >
              Your story. Remembered.
            </p>

            <h2
              style={{
                ...serif,
                color: colors.text,
                fontSize: 39,
                lineHeight: 1.14,
                letterSpacing: "-.025em",
                margin: "0 0 17px",
              }}
            >
              Your journey has just{" "}
              <span style={{ color: colors.gold }}>
                begun.
              </span>
            </h2>

            <p
              style={{
                color: colors.textSoft,
                fontSize: 15,
                lineHeight: 1.72,
                margin: 0,
              }}
            >
              One day, a full year of your voice will become
              something unforgettable.
            </p>
          </div>

          <motion.img
            src="/365-days-remembered-award.jpg"
            alt="365 Days Remembered Award"
            initial={{ opacity: 0, x: 34, scale: 0.94 }}
            animate={{
              opacity: 1,
              x: 0,
              scale: [1, 1.015, 1],
              y: [0, -5, 0],
            }}
            transition={{
              opacity: { duration: 0.8 },
              x: { duration: 0.8 },
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
              width: 330,
              maxWidth: "78vw",
              right: -82,
              bottom: -18,
              objectFit: "contain",
              filter:
                "drop-shadow(0 24px 55px rgba(0,0,0,.48)) drop-shadow(0 0 30px rgba(214,153,50,.16))",
            }}
          />
        </section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.65 }}
          style={{
            borderRadius: 25,
            border: "1px solid rgba(205,170,100,.18)",
            background:
              "linear-gradient(145deg, rgba(205,170,100,.09), rgba(255,255,255,.024))",
            padding: "23px 20px",
            marginBottom: 14,
            textAlign: "center",
            boxShadow: "0 22px 70px rgba(0,0,0,.24)",
          }}
        >
          <motion.div
            animate={{
              opacity: [0.55, 1, 0.55],
              scale: [0.97, 1.05, 0.97],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              width: 58,
              height: 58,
              borderRadius: 999,
              margin: "0 auto 15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.gold,
              border: "1px solid rgba(205,170,100,.18)",
              background: "rgba(205,170,100,.07)",
              boxShadow: "0 0 28px rgba(205,170,100,.14)",
            }}
          >
            <Sparkles size={25} strokeWidth={1.4} />
          </motion.div>

          <p
            style={{
              color: colors.gold,
              fontSize: 10,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              fontWeight: 800,
              margin: "0 0 9px",
            }}
          >
            Coming soon
          </p>

          <h2
            style={{
              ...serif,
              color: colors.text,
              fontSize: 27,
              lineHeight: 1.25,
              margin: "0 0 11px",
            }}
          >
            A year of you, preserved.
          </h2>

          <p
            style={{
              color: colors.textSoft,
              fontSize: 13,
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            The full journey, progress tracking and physical
            award are being prepared.
          </p>
        </motion.section>

        <section
          style={{
            borderRadius: 24,
            border: `1px solid ${colors.border}`,
            background: colors.card,
            padding: "21px 18px",
            display: "grid",
            gap: 22,
          }}
        >
          <InfoRow
            icon={<Mic size={21} strokeWidth={1.45} />}
            title="One qualifying voice day"
            text="A future qualifying day will require at least one real Voice Capsule while Premium is active."
          />

          <InfoRow
            icon={<Crown size={21} strokeWidth={1.45} />}
            title="A complete Premium year"
            text="The final award journey will require twelve paid Premium months."
          />

          <InfoRow
            icon={<Clock3 size={21} strokeWidth={1.45} />}
            title="Progress that pauses"
            text="When Premium is inactive, saved progress will remain but new days will not count."
          />

          <InfoRow
            icon={<ShieldCheck size={21} strokeWidth={1.45} />}
            title="Built carefully"
            text="Qualification, delivery confirmation and shipping terms will be added before launch."
          />
        </section>

        <p
          style={{
            color: colors.textFaint,
            textAlign: "center",
            fontSize: 11,
            lineHeight: 1.55,
            margin: "20px 20px 0",
          }}
        >
          365 Days Remembered is not active yet. Recording now
          does not currently count toward the future award.
        </p>
      </div>
    </motion.div>
  );
}