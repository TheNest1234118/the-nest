import React, { useEffect } from "react";
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

  useEffect(() => {
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

    completeOnboarding().catch(console.error);
  }, [navigate]);

  return null;
}