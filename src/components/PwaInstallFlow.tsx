import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { track } from "@vercel/analytics";
import {
  canShowPwaPrompt,
  dismissPwaPrompt,
  isAndroid,
  isIOS,
  isStandalonePwa,
  markPwaInstalled,
  PWA_PROMPT_EVENT,
} from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallFlow() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showNotificationAsk, setShowNotificationAsk] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      markPwaInstalled();
      setShowPrompt(false);
      setShowGuide(false);
    };

    const onEngagement = () => {
      if (canShowPwaPrompt()) {
        setShowPrompt(true);
        track("PWA prompt shown");
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(PWA_PROMPT_EVENT, onEngagement);

    if (isStandalonePwa() && Notification.permission === "default") {
      setShowNotificationAsk(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(PWA_PROMPT_EVENT, onEngagement);
    };
  }, []);

  const handleShowHow = async () => {
    track("PWA show me how clicked");

    if (deferredPrompt && !isIOS()) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        markPwaInstalled();
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
      return;
    }

    setShowGuide(true);
  };

  const handleMaybeLater = () => {
    dismissPwaPrompt();
    setShowPrompt(false);
    setShowGuide(false);
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      track("Notifications enabled");
      setShowNotificationAsk(false);
    }
  };

  return (
    <>
      {showPrompt && (
        <NestModal>
          <p style={eyebrow}>Stay connected</p>
          <h2 style={title}>Stay connected with The Nest</h2>
          <p style={text}>
            Get gentle reminders to:
            <br />
            • clear your mind
            <br />
            • return to unfinished thoughts
            <br />
            • reflect when life feels busy
            <br />
            <br />
            To enable notifications on iPhone, add The Nest to your Home Screen.
          </p>

          <button style={buttonPrimary} onClick={handleShowHow}>
            Show me how
          </button>

          <button style={buttonQuiet} onClick={handleMaybeLater}>
            Maybe later
          </button>
        </NestModal>
      )}

      {showGuide && (
        <NestModal>
          <p style={eyebrow}>Home Screen</p>
          <h2 style={title}>Keep The Nest close.</h2>

          {isIOS() ? (
            <p style={text}>
              1. Tap the Share button in Safari.
              <br />
              2. Tap “Add to Home Screen”.
              <br />
              3. Open The Nest from your Home Screen.
            </p>
          ) : isAndroid() ? (
            <p style={text}>
              1. Tap the browser menu.
              <br />
              2. Tap “Install App” or “Add to Home Screen”.
              <br />
              3. Open The Nest from your Home Screen.
            </p>
          ) : (
            <p style={text}>
              Use your browser menu to add The Nest to your device or desktop.
            </p>
          )}

          <button style={buttonQuiet} onClick={() => setShowGuide(false)}>
            Done
          </button>
        </NestModal>
      )}

      {showNotificationAsk && (
        <NestModal>
          <p style={eyebrow}>Gentle reminders</p>
          <h2 style={title}>
            Would you like gentle reminders from The Nest?
          </h2>
          <p style={text}>
            You don’t have to do anything. The Nest can simply remind you when a
            quiet moment might help.
          </p>

          <button style={buttonPrimary} onClick={enableNotifications}>
            Enable notifications
          </button>

          <button
            style={buttonQuiet}
            onClick={() => setShowNotificationAsk(false)}
          >
            Not now
          </button>
        </NestModal>
      )}
    </>
  );
}

function NestModal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(7,6,9,0.82)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        style={{
          width: "100%",
          maxWidth: 370,
          background: "rgba(18,15,12,0.96)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

const eyebrow: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(205,170,100,0.42)",
  marginBottom: 10,
};

const title: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 24,
  fontWeight: 400,
  lineHeight: 1.25,
  color: "rgba(235,215,180,0.92)",
  marginBottom: 14,
};

const text: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.65,
  color: "rgba(198,178,150,0.66)",
  marginBottom: 18,
};

const buttonPrimary: React.CSSProperties = {
  width: "100%",
  background: "rgba(205,170,100,0.10)",
  border: "1px solid rgba(205,170,100,0.16)",
  borderRadius: 14,
  padding: "14px 16px",
  color: "rgba(230,210,175,0.88)",
  fontSize: 12,
  letterSpacing: "0.08em",
  cursor: "pointer",
  marginBottom: 8,
};

const buttonQuiet: React.CSSProperties = {
  width: "100%",
  background: "none",
  border: "none",
  padding: "13px 0",
  color: "rgba(175,158,132,0.50)",
  fontSize: 12,
  letterSpacing: "0.08em",
  cursor: "pointer",
};