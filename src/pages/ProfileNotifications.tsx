import React, { useState } from "react";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { ProfileShell, SectionLabel } from "@/pages/ProfileShell";

export function ProfileNotifications() {
  const [message, setMessage] = useState<string | null>(null);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2200);
  };

  return (
    <ProfileShell title="Notifications" subtitle="Choose when The Nest should gently remind you.">
      <SectionLabel>Reminders</SectionLabel>
      <NotificationPreferences flash={flash} />

      {message && (
        <div style={{ marginTop: 14, color: "rgba(205,170,100,.62)", fontSize: 12 }}>
          {message}
        </div>
      )}
    </ProfileShell>
  );
}