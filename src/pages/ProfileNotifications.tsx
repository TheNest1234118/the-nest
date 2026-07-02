import React, { useState } from "react";
import OneSignal from "react-onesignal";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { ProfileShell, SectionLabel } from "@/pages/ProfileShell";
import { requestNestNotifications } from "@/lib/notifications";

export function ProfileNotifications() {
  const [message, setMessage] = useState<string | null>(null);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2200);
  };

  const reconnectNotifications = async () => {
    const granted = await requestNestNotifications();

    if (!granted) {
      flash("Notifications were not enabled");
      return;
    }

    try {
      const push = (OneSignal as any)?.User?.PushSubscription;
      await push?.optIn?.();
    } catch {}

    flash("Notifications enabled");
  };

  return (
    <ProfileShell
      title="Notifications"
      subtitle="Choose when The Nest should gently remind you."
    >
      <SectionLabel>Reminders</SectionLabel>

      <button
        onClick={reconnectNotifications}
        style={{
          width: "100%",
          marginBottom: 14,
          background: "rgba(205,170,100,0.08)",
          border: "1px solid rgba(205,170,100,0.14)",
          borderRadius: 14,
          padding: "14px 16px",
          color: "rgba(230,210,175,0.86)",
          fontSize: 12,
          letterSpacing: "0.08em",
          cursor: "pointer",
        }}
      >
        Allow notifications again
      </button>

      <NotificationPreferences flash={flash} />

      {message && (
        <div
          style={{
            marginTop: 14,
            color: "rgba(205,170,100,.62)",
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}
    </ProfileShell>
  );
}