import React from "react";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { trackNestEvent, events } from "@/lib/analyticsEvents";

const DONE_KEY = "nest_guide_completed";
const DEVICE_ID_KEY = "nest_device_id";
const HOME_WELCOME_KEY = "nest_show_home_welcome";

function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

export function Onboarding() {
  const [, navigate] = useLocation();

  const completeOnboarding = async () => {
    trackNestEvent(events.completed_onboarding);

    const deviceId = getOrCreateDeviceId();

    localStorage.setItem(DONE_KEY, "true");
    localStorage.setItem(HOME_WELCOME_KEY, "true");

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
        background: "#09080c",
        color: "rgba(235, 218, 192, 0.90)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div>
        <p style={{ color: "rgba(205,170,100,0.55)", fontSize: 11 }}>
          Welcome to The Nest
        </p>

        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 400,
            fontSize: 34,
          }}
        >
          A short guide.
        </h1>

        <p
          style={{
            color: "rgba(175,158,132,0.65)",
            fontSize: 14,
            lineHeight: 1.6,
            maxWidth: 280,
            margin: "0 auto 36px",
          }}
        >
          This is a quiet place to leave thoughts, voice notes and moments you
          may want to return to later.
        </p>

        <button
          onClick={completeOnboarding}
          style={{
            background: "none",
            border: "1px solid rgba(205,170,100,0.28)",
            borderRadius: 999,
            color: "rgba(205,170,100,0.75)",
            padding: "14px 22px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Begin
        </button>
      </div>
    </div>
  );
}