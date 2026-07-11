import React, { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
import { useLocation } from "wouter";

const FORMSPREE_ENDPOINT =
  "https://formspree.io/f/xojgajbj";

const colors = {
  bg: "rgba(9, 9, 13, 0.94)",
  card: "rgba(255,255,255,0.027)",
  border: "rgba(255,255,255,0.065)",
  goldBorder: "rgba(205,170,100,0.20)",
  gold: "rgba(205,170,100,0.78)",
  goldSoft: "rgba(205,170,100,0.48)",
  text: "rgba(240,232,218,0.90)",
  textSoft: "rgba(198,178,150,0.58)",
  textFaint: "rgba(185,162,128,0.40)",
};

const serif: React.CSSProperties = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontWeight: 400,
};

export function FeedbackPage() {
  const [, navigate] = useLocation();

  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const trimmedMessage = message.trim();
  const canSubmit = trimmedMessage.length > 0 && !isSending;
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
  
    const trimmedMessage = message.trim();
  
    if (!trimmedMessage || isSending) {
      return;
    }
  
    setIsSending(true);
    setStatus("idle");
  
    const trimmedEmail = email.trim();
  
    const payload = {
      message: trimmedMessage,
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
      page: "profile-feedback",
      appName: "The Nest",
      createdAt: new Date().toISOString(),
    };
  
    try {
      const response = await fetch(
        "https://formspree.io/f/xojgajbj",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
  
      if (!response.ok) {
        throw new Error(`Formspree error: ${response.status}`);
      }
  
      setMessage("");
      setEmail("");
      setStatus("success");
    } catch (error) {
      console.error("Could not send feedback", error);
      setStatus("error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55 }}
      style={{
        minHeight: "100svh",
        background: colors.bg,
        color: colors.text,
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 85% 35% at 50% 0%, rgba(205,145,45,0.075) 0%, transparent 68%), linear-gradient(90deg, rgba(255,255,255,0.025), transparent 15%, transparent 85%, rgba(255,255,255,0.018))",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 480,
          minHeight: "100svh",
          margin: "0 auto",
          padding:
            "calc(env(safe-area-inset-top, 0px) + 24px) 20px calc(env(safe-area-inset-bottom, 0px) + 40px)",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1,
        }}
      >
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem("nest_open_profile", "true");
            navigate("/");
          }}
          aria-label="Go back to profile"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            border: `1px solid ${colors.border}`,
            background: colors.card,
            color: colors.goldSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            marginBottom: 28,
          }}
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>

        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          style={{ marginBottom: 26 }}
        >
          <p
            style={{
              margin: "0 0 7px",
              fontSize: 11,
              letterSpacing: "0.17em",
              textTransform: "uppercase",
              color: colors.goldSoft,
              fontWeight: 600,
            }}
          >
            Feedback
          </p>

          <h1
            style={{
              ...serif,
              margin: "0 0 12px",
              color: colors.text,
              fontSize: 30,
              lineHeight: 1.12,
            }}
          >
            Help improve The Nest.
          </h1>

          <p
            style={{
              margin: 0,
              color: colors.textSoft,
              fontSize: 13,
              lineHeight: 1.65,
              maxWidth: 390,
            }}
          >
            Tell me what felt good, what felt confusing, or what you
            wish existed.
          </p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.6 }}
          style={{
            padding: "20px 18px",
            borderRadius: 22,
            border: `1px solid ${colors.goldBorder}`,
            background:
              "linear-gradient(145deg, rgba(205,170,100,0.065), rgba(255,255,255,0.024))",
            boxShadow: "0 18px 70px rgba(0,0,0,0.18)",
          }}
        >
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 19 }}>
              <label
                htmlFor="feedback-message"
                style={{
                  display: "block",
                  color: colors.text,
                  fontSize: 14,
                  marginBottom: 9,
                }}
              >
                Your feedback
              </label>

              <textarea
                id="feedback-message"
                name="message"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);

                  if (status !== "idle") {
                    setStatus("idle");
                  }
                }}
                placeholder="Write your feedback here…"
                required
                rows={8}
                disabled={isSending}
                aria-required="true"
                aria-describedby="feedback-message-help feedback-status"
                style={{
                  width: "100%",
                  minHeight: 190,
                  boxSizing: "border-box",
                  resize: "vertical",
                  borderRadius: 18,
                  border: `1px solid ${colors.border}`,
                  background: "rgba(255,255,255,0.026)",
                  padding: "15px 16px",
                  color: colors.text,
                  fontFamily: "inherit",
                  fontSize: 16,
                  lineHeight: 1.6,
                  outline: "none",
                }}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor =
                    "rgba(205,170,100,0.36)";
                  event.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(205,170,100,0.08)";
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor =
                    colors.border;
                  event.currentTarget.style.boxShadow = "none";
                }}
              />

              <span id="feedback-message-help" hidden>
                Feedback is required before the form can be sent.
              </span>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label
                htmlFor="feedback-email"
                style={{
                  display: "block",
                  color: colors.text,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                Email address (optional)
              </label>

              <p
                id="feedback-email-help"
                style={{
                  margin: "0 0 10px",
                  color: colors.textSoft,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Only if you would like a reply.
              </p>

              <input
                id="feedback-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address (optional)"
                disabled={isSending}
                aria-describedby="feedback-email-help"
                style={{
                  width: "100%",
                  height: 54,
                  boxSizing: "border-box",
                  borderRadius: 16,
                  border: `1px solid ${colors.border}`,
                  background: "rgba(255,255,255,0.026)",
                  padding: "0 15px",
                  color: colors.text,
                  fontFamily: "inherit",
                  fontSize: 15,
                  outline: "none",
                }}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor =
                    "rgba(205,170,100,0.36)";
                  event.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(205,170,100,0.08)";
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor =
                    colors.border;
                  event.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
              style={{
                width: "100%",
                minHeight: 54,
                borderRadius: 999,
                border: "1px solid rgba(205,170,100,0.28)",
                background:
                  "linear-gradient(135deg, rgba(245,205,120,0.95), rgba(205,145,45,0.88))",
                color: "rgba(18,12,5,0.92)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 800,
                cursor: canSubmit ? "pointer" : "default",
                opacity: canSubmit ? 1 : 0.45,
                transition:
                  "opacity 180ms ease, transform 180ms ease",
              }}
            >
              <Send size={17} strokeWidth={1.8} />

              {isSending ? "Sending…" : "Send feedback"}
            </button>

            <div
              id="feedback-status"
              aria-live="polite"
              aria-atomic="true"
              style={{
                minHeight: status === "idle" ? 0 : 58,
                marginTop: status === "idle" ? 0 : 18,
              }}
            >
              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="status"
                >
                  <p
                    style={{
                      margin: "0 0 5px",
                      color: colors.gold,
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    Thank you. Your feedback was sent directly to Sarp.
                  </p>

                  <p
                    style={{
                      margin: 0,
                      color: colors.textSoft,
                      fontSize: 12,
                    }}
                  >
                    Every message is read.
                  </p>
                </motion.div>
              )}

              {status === "error" && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  style={{
                    margin: 0,
                    color: "rgba(225,165,145,0.86)",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  Something went wrong. Please try again.
                </motion.p>
              )}
            </div>
          </form>
        </motion.section>

        <p
          style={{
            margin: "18px 4px 0",
            color: colors.textFaint,
            fontSize: 11,
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          You can send feedback anonymously. No account, name or email
          is required.
        </p>
      </div>
    </motion.main>
  );
}